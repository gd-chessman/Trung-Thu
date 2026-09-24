/**
 * Deploy: Extensions → Apps Script (paste this file) → Deploy → New deployment → Web app
 * Execute as: Me | Who has access: Anyone
 * SPREADSHEET_ID: gán ID sheet (trùng sheet trong VITE_GOOGLE_SHEET_URL) trước khi deploy
 *
 * Tab 1 (mặc định): Thời gian | Người gửi | Lời ước | ID | Thiết bị | IP
 * Tab "Likes": Thời gian | ID điều ước | Mã người tim | Tên người tim | Thiết bị | IP | Số lượng | Cập nhật
 */

const SPREADSHEET_ID = '';
const LIKES_SHEET_NAME = 'Likes';

function getSpreadsheet_() {
  if (!SPREADSHEET_ID) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID trong Code.gs');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureWishHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Người gửi', 'Lời ước', 'ID', 'Thiết bị', 'IP']);
    return;
  }
  if (!sheet.getRange(1, 5).getValue()) {
    sheet.getRange(1, 5).setValue('Thiết bị');
  }
  if (!sheet.getRange(1, 6).getValue()) {
    sheet.getRange(1, 6).setValue('IP');
  }
}

function appendWishRow(payload) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheets()[0];

  ensureWishHeader_(sheet);

  sheet.appendRow([
    payload.timestamp || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
    payload.author || 'Người ước nguyện',
    payload.wish || '',
    payload.wishId || payload.id || '',
    payload.device || '',
    payload.ip || ''
  ]);
}

var LIKES_HEADER = [
  'Thời gian',
  'ID điều ước',
  'Mã người tim',
  'Tên người tim',
  'Thiết bị',
  'IP',
  'Số lượng',
  'Cập nhật'
];

function ensureLikesHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(LIKES_HEADER);
    return;
  }
  if (!sheet.getRange(1, 5).getValue()) {
    sheet.getRange(1, 5).setValue('Thiết bị');
  }
  if (!sheet.getRange(1, 6).getValue()) {
    sheet.getRange(1, 6).setValue('IP');
  }
  if (!sheet.getRange(1, 7).getValue()) {
    sheet.getRange(1, 7).setValue('Số lượng');
  }
  if (!sheet.getRange(1, 8).getValue()) {
    sheet.getRange(1, 8).setValue('Cập nhật');
  }
}

function getLikesSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(LIKES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LIKES_SHEET_NAME);
    sheet.appendRow(LIKES_HEADER);
  } else {
    ensureLikesHeader_(sheet);
  }
  return sheet;
}

function countLikesForWish_(sheet, wishId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 1, lastRow, 7).getValues();
  let total = 0;
  const target = String(wishId).trim();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim() !== target) continue;
    let qty = Number(values[i][6]);
    if (!qty || qty < 1) qty = 1;
    total += qty;
  }
  return total;
}

function findLikeRowIndex_(sheet, wishId, likerId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const values = sheet.getRange(2, 1, lastRow, 3).getValues();
  const targetWish = String(wishId).trim();
  const targetLiker = String(likerId).trim();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim() === targetWish && String(values[i][2]).trim() === targetLiker) {
      return i + 2;
    }
  }
  return -1;
}

function appendLikeRow(payload) {
  const wishId = payload.wishId;
  const likerId = payload.likerId;
  if (!wishId || !likerId) {
    throw new Error('Thiếu wishId hoặc likerId');
  }

  var addCount = Math.max(1, Math.floor(Number(payload.addCount) || 1));

  const now =
    payload.timestamp ||
    Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  const sheet = getLikesSheet_();
  const rowIdx = findLikeRowIndex_(sheet, wishId, likerId);

  if (rowIdx > 0) {
    const qtyCell = sheet.getRange(rowIdx, 7);
    let qty = Number(qtyCell.getValue());
    if (!qty || qty < 1) qty = 1;
    qtyCell.setValue(qty + addCount);
    sheet.getRange(rowIdx, 8).setValue(now);
    if (payload.likerName) sheet.getRange(rowIdx, 4).setValue(payload.likerName);
    if (payload.device) sheet.getRange(rowIdx, 5).setValue(payload.device);
    if (payload.ip) sheet.getRange(rowIdx, 6).setValue(payload.ip);
  } else {
    sheet.appendRow([
      now,
      wishId,
      likerId,
      payload.likerName || '',
      payload.device || '',
      payload.ip || '',
      addCount,
      now
    ]);
  }

  const rowQty =
    rowIdx > 0 ? Number(sheet.getRange(rowIdx, 7).getValue()) || 1 : 1;

  return {
    ok: true,
    count: countLikesForWish_(sheet, wishId),
    quantity: rowQty
  };
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.action === 'like') {
      const result = appendLikeRow(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    appendWishRow(data);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.wish) {
    try {
      appendWishRow({
        timestamp: e.parameter.timestamp,
        author: e.parameter.author,
        wish: e.parameter.wish,
        wishId: e.parameter.wishId
      });
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'trung-thu-wishes' }))
    .setMimeType(ContentService.MimeType.JSON);
}
