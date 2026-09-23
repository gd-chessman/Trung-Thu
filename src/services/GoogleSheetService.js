/**
 * GoogleSheetService.js
 * Handles reading and writing wishes to/from Google Sheets:
 * URL: https://docs.google.com/spreadsheets/d/1dVQllCJrgff76jB7-T88wD44s9QrIghOIvNZF2hJHM0/edit
 */

const SHEET_ID = '1dVQllCJrgff76jB7-T88wD44s9QrIghOIvNZF2hJHM0';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/1dVQllCJrgff76jB7-T88wD44s9QrIghOIvNZF2hJHM0/gviz/tq?tqx=out:json`;
const STORAGE_KEY = 'midautumn_wishes_cache';
const APPS_SCRIPT_URL_KEY = 'midautumn_apps_script_url';

export class GoogleSheetService {
  constructor() {
    this.sheetId = SHEET_ID;
    this.appsScriptUrl = localStorage.getItem(APPS_SCRIPT_URL_KEY) || '';
  }

  setAppsScriptUrl(url) {
    this.appsScriptUrl = url.trim();
    localStorage.setItem(APPS_SCRIPT_URL_KEY, this.appsScriptUrl);
  }

  getAppsScriptUrl() {
    return this.appsScriptUrl;
  }

  /**
   * Fetch wishes from Google Sheet via gviz API + merge with local cache
   */
  async fetchWishes() {
    const wishes = [];

    // 1. Load from local cache first
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

    // 2. Fetch live rows from public Google Sheet
    try {
      const res = await fetch(GVIZ_URL, { cache: 'no-cache' });
      const text = await res.text();

      // Response format: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
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

            // Sheet columns structure: Col 0: Timestamp/Date, Col 1: Author, Col 2: Wish
            // Or if single row without headers:
            let dateStr = c[0] ? (c[0].f || c[0].v || '') : '';
            let author = c[1] ? (c[1].v || '') : '';
            let wish = c[2] ? (c[2].v || '') : '';

            // Handle case where column 0 is author and column 1 is wish
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

              // Avoid duplicates with local cache
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

    // 1. Immediately save to LocalStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      cached.unshift(newWish);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save wish to local storage', e);
    }

    // 2. If Google Apps Script Web App URL is set, send to Sheet
    if (this.appsScriptUrl) {
      try {
        await fetch(this.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script redirects require no-cors in browser
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp,
            author: newWish.author,
            wish: newWish.wish
          })
        });
      } catch (err) {
        console.warn('Error posting to Google Apps Script:', err);
      }
    }

    return newWish;
  }
}

export const googleSheetService = new GoogleSheetService();
