/**
 * Deploy: Extensions → Apps Script (paste this file) → Deploy → New deployment → Web app
 * Execute as: Me | Who has access: Anyone
 * SPREADSHEET_ID: gán ID sheet (trùng sheet trong VITE_GOOGLE_SHEET_URL) trước khi deploy
 */

const SPREADSHEET_ID = '';

function appendWishRow(payload) {
  if (!SPREADSHEET_ID) {
    throw new Error('Chưa cấu hình SPREADSHEET_ID trong Code.gs');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Người gửi', 'Lời ước']);
  }

  sheet.appendRow([
    payload.timestamp || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
    payload.author || 'Người ước nguyện',
    payload.wish || ''
  ]);
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
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
        wish: e.parameter.wish
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
