/**
 * GoogleSheetService.js
 * Reads wishes via public gviz API; writes via Google Apps Script Web App.
 * Env (tuỳ chọn): VITE_GOOGLE_SHEET_URL — đọc; VITE_APPS_SCRIPT_URL — ghi
 */

import {
  getClientDeviceInfo,
  getLikeClientMeta,
  getLikerDisplayName,
  getVisitorId,
  rememberAuthorName,
  resolvePublicIp
} from '../utils/visitor.js';
import { computeRelativeWishRanks } from '../utils/wishRank.js';
import {
  acknowledgeLikeBatch,
  incrementLike,
  ledgerEntriesToServerRows,
  listPendingFlushEntries,
  loadLikeLedger,
  mergeGvizLikesIntoLedger,
  parseLikeQty,
  saveLikeLedger,
  totalHeartsForWish,
  hasVisitorLikedWish as ledgerVisitorLiked
} from './likeLedger.js';

const APPS_SCRIPT_URL_KEY = 'midautumn_apps_script_url';
const LIKE_SYNC_MAX_ATTEMPTS = 2;
const LIKE_SYNC_RETRY_MS = 800;
const LIKE_FLUSH_DEBOUNCE_MS = 350;
const LIKE_FLUSH_MAX_BATCH = 30;

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
  'ip',
  'số lượng',
  'cập nhật'
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

/** Cột Số lượng trên Sheet (gviz) — ô trống coi như 1 dòng tim. */
function parseGvizLikeQuantity(raw) {
  const n = parseLikeQty(raw);
  return n > 0 ? n : 1;
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
    this._sessionLikesBootstrapped = false;
    /** Điều ước thả trong phiên tab */
    this.sessionWishes = [];
    this._rankByWishId = new Map();
    this._activeWishIds = [];
    this._lastServerLikeRows = [];
    this._likeLedger = loadLikeLedger();
    this._likeSyncQueue = Promise.resolve();
    this._loadLikesPromise = null;
    this._likeFlushTimer = null;
    this._flushRunning = false;
    this._flushAgain = false;
    this._syncCountsFromLedger();
  }

  setActiveWishIds(ids) {
    this._activeWishIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  }

  collectWishIds(extraIds = []) {
    const ids = new Set();
    this.heartCounts.forEach((_, wishId) => ids.add(wishId));
    this.sessionWishes.forEach((w) => {
      if (w?.id) ids.add(w.id);
    });
    this._activeWishIds.forEach((id) => ids.add(id));
    extraIds.forEach((id) => {
      if (id) ids.add(id);
    });
    return [...ids];
  }

  /** Xếp hạng lại: Hạng I = nhiều tim nhất trong danh sách đèn. */
  recomputeWishRanks(extraIds = []) {
    const ids = this.collectWishIds(extraIds);
    this._rankByWishId = computeRelativeWishRanks(ids, (id) => this.getHeartCount(id));
  }

  getWishRank(wishId) {
    if (!wishId) return 3;
    return this._rankByWishId.get(String(wishId).trim()) ?? 3;
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
    return totalHeartsForWish(this._likeLedger, wishId);
  }

  hasVisitorLiked(wishId) {
    return ledgerVisitorLiked(this._likeLedger, getVisitorId(), wishId);
  }

  _persistLikeLedger() {
    saveLikeLedger(this._likeLedger);
  }

  /** Cập nhật heartCounts + hạng từ sổ tim (nguồn tính duy nhất). */
  _syncCountsFromLedger() {
    this.heartCounts.clear();
    this.likedByVisitor.clear();
    const visitorId = getVisitorId();
    const wishIds = new Set();

    this._likeLedger.forEach((entry) => {
      wishIds.add(entry.wishId);
      if (entry.likerId === visitorId && (entry.pending > 0 || entry.serverQty > 0)) {
        this.likedByVisitor.add(entry.wishId);
      }
    });

    wishIds.forEach((wishId) => {
      const total = totalHeartsForWish(this._likeLedger, wishId);
      if (total > 0) this.heartCounts.set(wishId, total);
    });

    this._lastServerLikeRows = ledgerEntriesToServerRows(this._likeLedger);
    this.recomputeWishRanks();
  }

  _scheduleLikeFlush() {
    if (!this.getAppsScriptUrl()) return;
    if (this._likeFlushTimer) clearTimeout(this._likeFlushTimer);
    this._likeFlushTimer = setTimeout(() => {
      this._likeFlushTimer = null;
      this._likeSyncQueue = this._likeSyncQueue
        .then(() => this._flushLikeLedger())
        .catch((err) => console.warn('Like flush error:', err));
    }, LIKE_FLUSH_DEBOUNCE_MS);
  }

  async _postLikeBatch_(entry, ip, addCount) {
    const payload = {
      action: 'like',
      wishId: entry.wishId,
      likerId: entry.likerId,
      likerName: entry.likerName,
      timestamp: entry.timestamp,
      device: entry.device,
      ip,
      addCount
    };

    let sheetResult = { ok: false, reason: 'not_attempted' };
    for (let attempt = 1; attempt <= LIKE_SYNC_MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, LIKE_SYNC_RETRY_MS * attempt));
      }
      sheetResult = await this.postToAppsScript(payload, { requireJsonResponse: true });
      if (sheetResult.ok) break;
      if (sheetResult.reason === 'missing_apps_script_url') break;
    }
    return sheetResult;
  }

  async _flushLikeLedger() {
    if (!this.getAppsScriptUrl()) return;
    if (this._flushRunning) {
      this._flushAgain = true;
      return;
    }

    this._flushRunning = true;
    try {
      const pendingEntries = listPendingFlushEntries(this._likeLedger);
      if (!pendingEntries.length) return;

      const ip = await resolvePublicIp();

      for (const entry of pendingEntries) {
        let remaining = parseLikeQty(entry.pending);
        let guard = 0;

        while (remaining > 0 && guard < 50) {
          guard += 1;
          const batch = Math.min(remaining, LIKE_FLUSH_MAX_BATCH);
          const beforeQty = parseLikeQty(entry.serverQty);

          let sheetResult = await this._postLikeBatch_(entry, ip, batch);
          if (!sheetResult.ok) {
            console.warn('Tim chưa lên Sheet (giữ trong localStorage):', entry.wishId, sheetResult.reason);
            break;
          }

          const serverQty =
            sheetResult.data && typeof sheetResult.data.quantity === 'number'
              ? sheetResult.data.quantity
              : undefined;
          const ack = acknowledgeLikeBatch(
            this._likeLedger,
            entry.wishId,
            entry.likerId,
            beforeQty,
            batch,
            serverQty
          );

          if (ack < 1) {
            console.warn('Tim POST ok nhưng không ack được — kiểm tra Code.gs:', entry.wishId);
            break;
          }

          this._persistLikeLedger();
          remaining = parseLikeQty(entry.pending);
        }
      }

      this._syncCountsFromLedger();
    } finally {
      this._flushRunning = false;
      if (this._flushAgain || listPendingFlushEntries(this._likeLedger).length > 0) {
        this._flushAgain = false;
        this._likeSyncQueue = this._likeSyncQueue
          .then(() => this._flushLikeLedger())
          .catch((err) => console.warn('Like flush error:', err));
      }
    }
  }

  _bootstrapSessionLikes() {
    if (this._sessionLikesBootstrapped || this._likesLoaded) {
      this._sessionLikesBootstrapped = true;
      return;
    }
    this._sessionLikesBootstrapped = true;
    this._syncCountsFromLedger();
  }

  /**
   * Đọc tab Likes (gviz) + tim trong phiên — gọi khi mở trang.
   */
  async loadLikes() {
    if (this._loadLikesPromise) {
      return this._loadLikesPromise;
    }

    this._loadLikesPromise = this._loadLikesFromSheet().finally(() => {
      this._loadLikesPromise = null;
    });
    return this._loadLikesPromise;
  }

  async _loadLikesFromSheet() {
    const gvizRows = [];

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

          gvizRows.push({
            wishId: cellValue(c[1]),
            likerId: cellValue(c[2]),
            quantity: parseGvizLikeQuantity(cellValue(c[6]))
          });
        });
      } catch (err) {
        console.warn('Error fetching likes from Google Sheet:', err);
      }
    }

    mergeGvizLikesIntoLedger(this._likeLedger, gvizRows);
    this._persistLikeLedger();
    this._syncCountsFromLedger();
    this._likesLoaded = true;
    this._sessionLikesBootstrapped = true;

    this._likeSyncQueue = this._likeSyncQueue
      .then(() => this._flushLikeLedger())
      .then(() => this._syncCountsFromLedger())
      .catch((err) => console.warn('Like flush error:', err));
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
   * @param {{ requireJsonResponse?: boolean }} options — tim: bắt buộc JSON để tránh báo thành công giả (no-cors).
   */
  async postToAppsScript(payload, options = {}) {
    const requireJson = Boolean(options.requireJsonResponse);
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

      if (requireJson) {
        return { ok: false, reason: `http_${res.status}` };
      }
    } catch (err) {
      if (requireJson) {
        return { ok: false, reason: String(err) };
      }
      console.warn('CORS POST failed, retrying no-cors:', err);
    }

    if (requireJson) {
      return { ok: false, reason: 'like_requires_json_response' };
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
   * Thả tim — mỗi lần bấm +1 (cùng người được tim nhiều lần).
   * @returns {{ accepted: boolean, count: number, rank: number }}
   */
  likeWishNow(wishId) {
    if (!wishId) {
      return { accepted: false, count: 0, rank: 3 };
    }

    this._bootstrapSessionLikes();
    incrementLike(this._likeLedger, wishId, getVisitorId(), {
      likerName: getLikerDisplayName(),
      device: getClientDeviceInfo(),
      timestamp: new Date().toLocaleString('vi-VN')
    });
    this._persistLikeLedger();
    this._syncCountsFromLedger();
    this._scheduleLikeFlush();

    return {
      accepted: true,
      count: this.getHeartCount(wishId),
      rank: this.getWishRank(wishId)
    };
  }

  /**
   * Fetch wishes from Google Sheet (gviz) + điều ước thả trong phiên này
   */
  async fetchWishes() {
    const wishes = this.sessionWishes.map((w) => ({ ...w }));

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

  /** Danh sách xếp hạng theo số tim (Sheet + phiên hiện tại). */
  async getLeaderboard(limit = 80) {
    await this.ensureLikesLoaded();
    const wishes = await this.fetchWishes();
    const ids = wishes.map((w) => w.id).filter(Boolean);
    this.recomputeWishRanks(ids);

    const entries = wishes.map((w) => ({
      id: w.id,
      author: w.author || 'Người ước nguyện',
      wish: w.wish || '',
      timestamp: w.timestamp || '',
      hearts: this.getHeartCount(w.id),
      tier: this.getWishRank(w.id)
    }));

    entries.sort((a, b) => {
      if (b.hearts !== a.hearts) return b.hearts - a.hearts;
      return String(a.author).localeCompare(String(b.author), 'vi');
    });

    return entries.slice(0, limit);
  }

  /**
   * Ghi điều ước lên Sheet; giữ bản trong RAM đến khi đóng tab
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

    this.sessionWishes.unshift(newWish);
    if (this.sessionWishes.length > 100) {
      this.sessionWishes.length = 100;
    }

    const { device, ip } = await getLikeClientMeta();

    const sheetResult = await this.postWishToSheet({
      timestamp,
      author: newWish.author,
      wish: newWish.wish,
      wishId: id,
      device,
      ip
    });

    return {
      ...newWish,
      syncedToSheet: sheetResult.ok,
      sheetSyncReason: sheetResult.reason || null
    };
  }
}

export const googleSheetService = new GoogleSheetService();
