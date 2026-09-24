/**
 * GoogleSheetService.js
 * Reads wishes via public gviz API; writes via Google Apps Script Web App.
 * Env (tuỳ chọn): VITE_GOOGLE_SHEET_URL — đọc; VITE_APPS_SCRIPT_URL — ghi
 */

import {
  getClientDeviceInfo,
  getLikerDisplayName,
  getVisitorId,
  rememberAuthorName,
  resolvePublicIp
} from '../utils/visitor.js';

const STORAGE_KEY = 'midautumn_wishes_cache';
const LIKES_CACHE_KEY = 'midautumn_likes_cache';
const APPS_SCRIPT_URL_KEY = 'midautumn_apps_script_url';

const HEADER_LABELS = new Set([
  'thời gian',
  'người gửi',
  'lời ước',
  'timestamp',
  'author',
  'wish',
  'id',
  'id điều ước',
  'mã người tim',
  'tên người tim',
  'thiết bị',
  'ip'
]);

const SHEET_ID_FROM_URL = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/** Link sheet hoặc chỉ ID — dùng để đồng bộ đọc điều ước lúc mở trang */
function resolveSheetId() {
  const raw = import.meta.env.VITE_GOOGLE_SHEET_URL;
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }

  const value = raw.trim();
  const match = value.match(SHEET_ID_FROM_URL);
  if (match?.[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9-_]+$/.test(value)) {
    return value;
  }

  return '';
}

function buildGvizUrl(sheetId, sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  if (sheetName) {
    return `${base}&sheet=${encodeURIComponent(sheetName)}`;
  }
  return base;
}

function resolveAppsScriptUrl() {
  const fromEnv = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim();
  }
  try {
    return localStorage.getItem(APPS_SCRIPT_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function stableWishId(author, wish, timestamp) {
  const key = `${String(author).trim()}|${String(wish).trim()}|${String(timestamp).trim()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return `wish-stable-${(h >>> 0).toString(36)}`;
}

function parseGvizRows(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return [];
  }
  const jsonStr = text.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(jsonStr);
  if (!data?.table?.rows) {
    return [];
  }
  return data.table.rows;
}

function cellValue(cell) {
  if (!cell) return '';
  return cell.f != null && cell.f !== '' ? String(cell.f) : String(cell.v ?? '');
}

export class GoogleSheetService {
  constructor() {
    this.sheetId = resolveSheetId();
    this.gvizUrl = this.sheetId ? buildGvizUrl(this.sheetId) : '';
    this.likesGvizUrl = this.sheetId ? buildGvizUrl(this.sheetId, 'Likes') : '';
    this.appsScriptUrl = resolveAppsScriptUrl();
    this.heartCounts = new Map();
    this.likedByVisitor = new Set();
    this._likesLoaded = false;
    this._localLikesBootstrapped = false;
  }

  getSheetId() {
    return this.sheetId;
  }

  setAppsScriptUrl(url) {
    this.appsScriptUrl = url.trim();
    localStorage.setItem(APPS_SCRIPT_URL_KEY, this.appsScriptUrl);
  }

  getAppsScriptUrl() {
    return this.appsScriptUrl || resolveAppsScriptUrl();
  }

  isSheetWriteConfigured() {
    return Boolean(this.getAppsScriptUrl());
  }

  createWishId() {
    return `wish-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  resolveWishIdFromLantern(lanternData) {
    if (lanternData?.wishId) {
      return lanternData.wishId;
    }
    return stableWishId(
      lanternData?.author || '',
      lanternData?.wishText || '',
      lanternData?.timestamp || ''
    );
  }

  getHeartCount(wishId) {
    if (!wishId) return 0;
    return this.heartCounts.get(wishId) || 0;
  }

  hasVisitorLiked(wishId) {
    return this.likedByVisitor.has(wishId);
  }

  _bootstrapLikesFromLocal() {
    if (this._localLikesBootstrapped || this._likesLoaded) {
      this._localLikesBootstrapped = true;
      return;
    }
    this._localLikesBootstrapped = true;
    const merged = this._mergeLikeRecords([], this._readLocalLikeCache());
    this._applyLikeRecords(merged);
  }

  _hasLocalLike(wishId, likerId) {
    return this._readLocalLikeCache().some(
      (r) => String(r.wishId).trim() === String(wishId).trim() && String(r.likerId).trim() === likerId
    );
  }

  _applyLikeRecords(records) {
    this.heartCounts.clear();
    this.likedByVisitor.clear();
    const visitorId = getVisitorId();

    records.forEach((row) => {
      const wishId = String(row.wishId || '').trim();
      const likerId = String(row.likerId || '').trim();
      if (!wishId) return;

      this.heartCounts.set(wishId, (this.heartCounts.get(wishId) || 0) + 1);
      if (likerId && likerId === visitorId) {
        this.likedByVisitor.add(wishId);
      }
    });
  }

  _readLocalLikeCache() {
    try {
      const raw = localStorage.getItem(LIKES_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _writeLocalLikeCache(records) {
    try {
      localStorage.setItem(LIKES_CACHE_KEY, JSON.stringify(records.slice(-500)));
    } catch {
      /* ignore */
    }
  }

  _mergeLikeRecords(serverRows, localRows) {
    const seen = new Set();
    const merged = [];

    const push = (row) => {
      const wishId = String(row.wishId || '').trim();
      const likerId = String(row.likerId || '').trim();
      if (!wishId || !likerId) return;
      const key = `${wishId}|${likerId}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        wishId,
        likerId,
        likerName: row.likerName || '',
        timestamp: row.timestamp || ''
      });
    };

    serverRows.forEach(push);
    localRows.forEach(push);
    return merged;
  }

  /**
   * Đọc tab Likes (gviz) + cache local — gọi khi mở trang.
   */
  async loadLikes() {
    let serverRows = [];

    if (this.likesGvizUrl) {
      try {
        const res = await fetch(this.likesGvizUrl, { cache: 'no-cache' });
        const text = await res.text();
        const rows = parseGvizRows(text);

        rows.forEach((r) => {
          if (!r?.c) return;
          const c = r.c;
          const first = String(cellValue(c[0]) || cellValue(c[1]) || '')
            .trim()
            .toLowerCase();
          if (HEADER_LABELS.has(first)) return;

          serverRows.push({
            timestamp: cellValue(c[0]),
            wishId: cellValue(c[1]),
            likerId: cellValue(c[2]),
            likerName: cellValue(c[3])
          });
        });
      } catch (err) {
        console.warn('Error fetching likes from Google Sheet:', err);
      }
    }

    const merged = this._mergeLikeRecords(serverRows, this._readLocalLikeCache());
    this._applyLikeRecords(merged);
    this._likesLoaded = true;
    this._localLikesBootstrapped = true;
  }

  /** Gọi sớm để lấy IP không chặn lúc bấm tim. */
  warmLikeNetwork() {
    void resolvePublicIp();
  }

  async ensureLikesLoaded() {
    if (!this._likesLoaded) {
      await this.loadLikes();
    }
  }

  /**
   * POST JSON to Apps Script (text/plain avoids CORS preflight issues).
   */
  async postToAppsScript(payload) {
    const url = this.getAppsScriptUrl();
    if (!url) {
      return { ok: false, reason: 'missing_apps_script_url' };
    }

    const body = JSON.stringify(payload);

    try {
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.ok === false) {
          return { ok: false, reason: data.error || 'apps_script_error' };
        }
        return { ok: true, data };
      }
    } catch (err) {
      console.warn('CORS POST failed, retrying no-cors:', err);
    }

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      return { ok: true, opaque: true };
    } catch (err) {
      console.warn('Error posting to Google Apps Script:', err);
      return { ok: false, reason: String(err) };
    }
  }

  async postWishToSheet(payload) {
    return this.postToAppsScript(payload);
  }

  /**
   * Thả tim — cập nhật ngay trên máy; ghi Sheet chạy ngầm.
   * @returns {{ accepted: boolean, alreadyLiked: boolean, count: number }}
   */
  likeWishNow(wishId) {
    if (!wishId) {
      return { accepted: false, alreadyLiked: false, count: 0 };
    }

    this._bootstrapLikesFromLocal();
    const likerId = getVisitorId();

    if (this.hasVisitorLiked(wishId) || this._hasLocalLike(wishId, likerId)) {
      this.likedByVisitor.add(wishId);
      return {
        accepted: false,
        alreadyLiked: true,
        count: this.getHeartCount(wishId)
      };
    }

    const likerName = getLikerDisplayName();
    const timestamp = new Date().toLocaleString('vi-VN');
    const device = getClientDeviceInfo();

    const localRecord = { wishId, likerId, likerName, timestamp, device, ip: '' };
    const localCache = this._readLocalLikeCache();
    localCache.push(localRecord);
    this._writeLocalLikeCache(localCache);

    this.likedByVisitor.add(wishId);
    const count = this.getHeartCount(wishId) + 1;
    this.heartCounts.set(wishId, count);

    void this._syncLikeInBackground(localRecord);

    return { accepted: true, alreadyLiked: false, count };
  }

  async _syncLikeInBackground(record) {
    const { wishId, likerId, likerName, timestamp, device } = record;
    try {
      const ip = await resolvePublicIp();
      record.ip = ip;

      const cache = this._readLocalLikeCache();
      const idx = cache.findIndex(
        (r) =>
          String(r.wishId).trim() === String(wishId).trim() &&
          String(r.likerId).trim() === likerId &&
          r.timestamp === timestamp
      );
      if (idx !== -1) {
        cache[idx] = { ...cache[idx], ip };
        this._writeLocalLikeCache(cache);
      }

      const sheetResult = await this.postToAppsScript({
        action: 'like',
        wishId,
        likerId,
        likerName,
        timestamp,
        device,
        ip
      });

      if (sheetResult.ok && sheetResult.data && typeof sheetResult.data.count === 'number') {
        this.heartCounts.set(wishId, sheetResult.data.count);
      }
    } catch (err) {
      console.warn('Background like sync failed:', err);
    }
  }

  /**
   * Fetch wishes from Google Sheet via gviz API + merge with local cache
   */
  async fetchWishes() {
    const wishes = [];

    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((w) => {
            if (w && !w.id && w.wish) {
              w.id = stableWishId(w.author, w.wish, w.timestamp);
            }
          });
          wishes.push(...parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read cached wishes', e);
    }

    if (!this.gvizUrl) {
      return wishes;
    }

    try {
      const res = await fetch(this.gvizUrl, { cache: 'no-cache' });
      const text = await res.text();
      const rows = parseGvizRows(text);

      rows.forEach((r, idx) => {
        if (!r?.c) return;
        const c = r.c;

        let dateStr = cellValue(c[0]);
        let author = cellValue(c[1]);
        let wish = cellValue(c[2]);
        let wishId = cellValue(c[3]);

        const firstCell = String(dateStr || author || '').trim().toLowerCase();
        if (HEADER_LABELS.has(firstCell)) {
          return;
        }

        if (!wish && author) {
          wish = author;
          author = dateStr || 'Người ước nguyện';
          dateStr = new Date().toLocaleDateString('vi-VN');
        }

        if (wish) {
          const trimmedAuthor = String(author || 'Người ước nguyện').trim();
          const trimmedWish = String(wish).trim();
          const trimmedTime = String(dateStr || new Date().toLocaleDateString('vi-VN'));
          const id = wishId.trim() || stableWishId(trimmedAuthor, trimmedWish, trimmedTime);

          const item = {
            id,
            author: trimmedAuthor,
            wish: trimmedWish,
            timestamp: trimmedTime,
            fromSheet: true
          };

          const exists = wishes.some(
            (w) => w.id === item.id || (w.wish === item.wish && w.author === item.author)
          );
          if (!exists) {
            wishes.push(item);
          }
        }
      });
    } catch (err) {
      console.warn('Error fetching wishes from Google Sheet:', err);
    }

    return wishes;
  }

  /**
   * Save a newly released wish to Google Sheet and local cache
   */
  async saveWish(author, wish, wishId) {
    const timestamp = new Date().toLocaleString('vi-VN');
    const id = wishId || this.createWishId();
    rememberAuthorName(author);

    const newWish = {
      id,
      author: author.trim() || 'Người ước nguyện',
      wish: wish.trim(),
      timestamp
    };

    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      cached.unshift(newWish);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save wish to local storage', e);
    }

    const sheetResult = await this.postWishToSheet({
      timestamp,
      author: newWish.author,
      wish: newWish.wish,
      wishId: id
    });

    return {
      ...newWish,
      syncedToSheet: sheetResult.ok,
      sheetSyncReason: sheetResult.reason || null
    };
  }
}

export const googleSheetService = new GoogleSheetService();
