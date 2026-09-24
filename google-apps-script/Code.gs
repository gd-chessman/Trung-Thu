/**
 * Deploy: Extensions → Apps Script (paste this file) → Deploy → New deployment → Web app
 * Execute as: Me | Who has access: Anyone
 * SPREADSHEET_ID: gán ID sheet (trùng sheet trong VITE_GOOGLE_SHEET_URL) trước khi deploy
 *
 * Tab 1 (mặc định): Thời gian | Người gửi | Lời ước | ID
 * Tab "Likes": Thời gian | ID điều ước | Mã người tim | Tên người tim | Thiết bị | IP
 */

const SPREADSHEET_ID = '';
const LIKES_SHEET_NAME = 'Likes';

function getSpreadsheet_() {
  if (!SPREADSHEET_ID) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID trong Code.gs');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function appendWishRow(payload) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Người gửi', 'Lời ước', 'ID']);
  }

  sheet.appendRow([
    payload.timestamp || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
    payload.author || 'Người ước nguyện',
    payload.wish || '',
    payload.wishId || payload.id || ''
  ]);
}

var LIKES_HEADER = ['Thời gian', 'ID điều ước', 'Mã người tim', 'Tên người tim', 'Thiết bị', 'IP'];

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
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim() === String(wishId).trim()) {
      count++;
    }
  }
  return count;
}

function hasLike_(sheet, wishId, likerId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const targetWish = String(wishId).trim();
  const targetLiker = String(likerId).trim();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim() === targetWish && String(values[i][2]).trim() === targetLiker) {
      return true;
    }
  }
  return false;
}

function appendLikeRow(payload) {
  const wishId = payload.wishId;
  const likerId = payload.likerId;
  if (!wishId || !likerId) {
    throw new Error('Thiếu wishId hoặc likerId');
  }

  const sheet = getLikesSheet_();
  if (hasLike_(sheet, wishId, likerId)) {
    return {
      ok: true,
      alreadyLiked: true,
      count: countLikesForWish_(sheet, wishId)
    };
  }

  sheet.appendRow([
    payload.timestamp || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
    wishId,
    likerId,
    payload.likerName || '',
    payload.device || '',
    payload.ip || ''
  ]);

  return {
    ok: true,
    alreadyLiked: false,
    count: countLikesForWish_(sheet, wishId)
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
