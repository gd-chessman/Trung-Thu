/**
 * GoogleSheetService.js
 * Reads wishes via public gviz API; writes via Google Apps Script Web App.
 * Env (tuỳ chọn): VITE_GOOGLE_SHEET_URL — đọc; VITE_APPS_SCRIPT_URL — ghi
 */

const STORAGE_KEY = 'midautumn_wishes_cache';
const APPS_SCRIPT_URL_KEY = 'midautumn_apps_script_url';

const HEADER_LABELS = new Set(['thời gian', 'người gửi', 'lời ước', 'timestamp', 'author', 'wish']);

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

function buildGvizUrl(sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
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

export class GoogleSheetService {
  constructor() {
    this.sheetId = resolveSheetId();
    this.gvizUrl = this.sheetId ? buildGvizUrl(this.sheetId) : '';
    this.appsScriptUrl = resolveAppsScriptUrl();
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

  /**
   * POST wish to Apps Script (text/plain avoids CORS preflight issues).
   */
  async postWishToSheet(payload) {
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
        return { ok: true };
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

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        if (data && data.table && data.table.rows) {
          const rows = data.table.rows;
          rows.forEach((r, idx) => {
            if (!r || !r.c) return;
            const c = r.c;

            let dateStr = c[0] ? (c[0].f || c[0].v || '') : '';
            let author = c[1] ? (c[1].v || '') : '';
            let wish = c[2] ? (c[2].v || '') : '';

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
              const item = {
                id: `sheet-${idx}`,
                author: String(author || 'Người ước nguyện').trim(),
                wish: String(wish).trim(),
                timestamp: String(dateStr || new Date().toLocaleDateString('vi-VN')),
                fromSheet: true
              };

              const exists = wishes.some(w => w.wish === item.wish && w.author === item.author);
              if (!exists) {
                wishes.push(item);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching wishes from Google Sheet:', err);
    }

    return wishes;
  }

  /**
   * Save a newly released wish to Google Sheet and local cache
   */
  async saveWish(author, wish) {
    const timestamp = new Date().toLocaleString('vi-VN');
    const newWish = {
      id: `wish-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
      wish: newWish.wish
    });

    return {
      ...newWish,
      syncedToSheet: sheetResult.ok,
      sheetSyncReason: sheetResult.reason || null
    };
  }
}

export const googleSheetService = new GoogleSheetService();
