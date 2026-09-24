/**
 * Sổ tim ổn định (v2):
 * - Mỗi cặp (điều ước + người tim): serverQty (đã trên Sheet) + pending (local, chưa ack).
 * - Tổng tim đèn = Σ (serverQty + pending) mọi người.
 * - Chỉ giảm pending khi Sheet xác nhận quantity tăng; không reconcile “đoán”.
 */

export const LIKE_LEDGER_KEY = 'midautumn_like_ledger_v2';
const LEGACY_OUTBOX_KEY = 'midautumn_like_outbox';
const LEGACY_PENDING_KEY = 'midautumn_pending_likes';

export function likePairKey(wishId, likerId) {
  return `${String(wishId).trim()}\u0001${String(likerId).trim()}`;
}

export function parseLikeQty(raw) {
  const n = Number(String(raw ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeEntry(raw) {
  if (!raw?.wishId || !raw?.likerId) return null;
  return {
    wishId: String(raw.wishId).trim(),
    likerId: String(raw.likerId).trim(),
    serverQty: parseLikeQty(raw.serverQty ?? raw.confirmedRowQty),
    pending: parseLikeQty(raw.pending ?? raw.pendingCount),
    likerName: String(raw.likerName || ''),
    device: String(raw.device || ''),
    timestamp: String(raw.timestamp || '')
  };
}

function migrateLegacyInto(entries) {
  const byKey = new Map(entries.map((e) => [likePairKey(e.wishId, e.likerId), { ...e }]));

  try {
    const outboxRaw = localStorage.getItem(LEGACY_OUTBOX_KEY);
    if (outboxRaw) {
      const outbox = JSON.parse(outboxRaw);
      if (Array.isArray(outbox)) {
        outbox.forEach((row) => {
          const e = normalizeEntry({
            wishId: row.wishId,
            likerId: row.likerId,
            serverQty: row.confirmedRowQty,
            pending: row.pendingCount,
            likerName: row.likerName,
            device: row.device,
            timestamp: row.timestamp
          });
          if (!e) return;
          const key = likePairKey(e.wishId, e.likerId);
          const prev = byKey.get(key);
          if (prev) {
            prev.serverQty = Math.max(prev.serverQty, e.serverQty);
            prev.pending += e.pending;
          } else {
            byKey.set(key, e);
          }
        });
      }
      localStorage.removeItem(LEGACY_OUTBOX_KEY);
    }
  } catch {
    /* ignore */
  }

  try {
    const pendingRaw = localStorage.getItem(LEGACY_PENDING_KEY);
    if (pendingRaw) {
      const legacy = JSON.parse(pendingRaw);
      if (Array.isArray(legacy)) {
        legacy.forEach((row) => {
          if (!row?.wishId || !row?.likerId) return;
          const key = likePairKey(row.wishId, row.likerId);
          const prev = byKey.get(key) || normalizeEntry({ wishId: row.wishId, likerId: row.likerId });
          if (!prev) return;
          prev.pending += 1;
          byKey.set(key, prev);
        });
      }
      localStorage.removeItem(LEGACY_PENDING_KEY);
    }
  } catch {
    /* ignore */
  }

  return [...byKey.values()];
}

/** @returns {Map<string, object>} */
export function loadLikeLedger() {
  let entries = [];
  try {
    const raw = localStorage.getItem(LIKE_LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed.map(normalizeEntry).filter(Boolean);
      }
    }
  } catch {
    entries = [];
  }

  entries = migrateLegacyInto(entries);
  const map = new Map();
  entries.forEach((e) => map.set(likePairKey(e.wishId, e.likerId), e));
  return map;
}

export function saveLikeLedger(ledger) {
  try {
    const list = [...ledger.values()].filter(
      (e) => (e.serverQty || 0) > 0 || (e.pending || 0) > 0
    );
    if (!list.length) {
      localStorage.removeItem(LIKE_LEDGER_KEY);
      return;
    }
    localStorage.setItem(LIKE_LEDGER_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function getOrCreateEntry(ledger, wishId, likerId) {
  const key = likePairKey(wishId, likerId);
  let entry = ledger.get(key);
  if (!entry) {
    entry = {
      wishId: String(wishId).trim(),
      likerId: String(likerId).trim(),
      serverQty: 0,
      pending: 0,
      likerName: '',
      device: '',
      timestamp: ''
    };
    ledger.set(key, entry);
  }
  return entry;
}

/** Gộp gviz — nâng serverQty; trừ pending tương ứng (tránh cộng trùng Sheet + local). */
export function mergeGvizLikesIntoLedger(ledger, gvizRows) {
  gvizRows.forEach((row) => {
    if (!row?.wishId || !row?.likerId) return;
    const entry = getOrCreateEntry(ledger, row.wishId, row.likerId);
    const qty = parseLikeQty(row.quantity);
    if (qty <= entry.serverQty) return;
    const delta = qty - entry.serverQty;
    entry.serverQty = qty;
    entry.pending = Math.max(0, entry.pending - delta);
  });
}

export function incrementLike(ledger, wishId, likerId, meta) {
  const entry = getOrCreateEntry(ledger, wishId, likerId);
  entry.pending += 1;
  if (meta?.likerName) entry.likerName = meta.likerName;
  if (meta?.device) entry.device = meta.device;
  if (meta?.timestamp) entry.timestamp = meta.timestamp;
  return entry;
}

/** Tổng tim trên đèn (mọi người). */
export function totalHeartsForWish(ledger, wishId) {
  const wid = String(wishId || '').trim();
  if (!wid) return 0;
  let total = 0;
  ledger.forEach((entry) => {
    if (entry.wishId !== wid) return;
    total += parseLikeQty(entry.serverQty) + parseLikeQty(entry.pending);
  });
  return total;
}

export function hasVisitorLikedWish(ledger, visitorId, wishId) {
  const wid = String(wishId || '').trim();
  const vid = String(visitorId || '').trim();
  if (!wid || !vid) return false;
  for (const entry of ledger.values()) {
    if (entry.wishId !== wid || entry.likerId !== vid) continue;
    if (entry.serverQty > 0 || entry.pending > 0) return true;
  }
  return false;
}

/**
 * Sheet trả quantity (số lượng dòng liker sau khi ghi).
 * @returns {number} số tim vừa ack (0 nếu Sheet không tăng)
 */
export function acknowledgeServerQuantity(ledger, wishId, likerId, qtyAfter) {
  const entry = getOrCreateEntry(ledger, wishId, likerId);
  const after = Math.max(entry.serverQty, parseLikeQty(qtyAfter));
  const delta = after - entry.serverQty;
  if (delta < 1) return 0;
  entry.serverQty = after;
  entry.pending = Math.max(0, entry.pending - delta);
  return delta;
}

/** POST thành công — ack ít nhất `batch` tim (khi Apps Script trả quantity sai). */
export function acknowledgeLikeBatch(ledger, wishId, likerId, beforeServerQty, batch, serverQuantity) {
  const before = parseLikeQty(beforeServerQty);
  const b = parseLikeQty(batch);
  if (b < 1) return 0;
  const expected = before + b;
  const fromServer = parseLikeQty(serverQuantity);
  const after = Math.max(expected, fromServer);
  return acknowledgeServerQuantity(ledger, wishId, likerId, after);
}

export function listPendingFlushEntries(ledger) {
  return [...ledger.values()].filter((e) => e.pending > 0);
}

export function ledgerEntriesToServerRows(ledger) {
  return [...ledger.values()]
    .filter((e) => e.serverQty > 0)
    .map((e) => ({
      wishId: e.wishId,
      likerId: e.likerId,
      likerName: e.likerName,
      quantity: e.serverQty,
      timestamp: e.timestamp,
      device: e.device,
      ip: '',
      updatedAt: e.timestamp,
      syncedToSheet: true
    }));
}
