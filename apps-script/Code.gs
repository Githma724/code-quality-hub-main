/**
 * Google Apps Script Web App for logging LLM-output decisions to a Sheet.
 *
 * SETUP:
 * 1. Create a Google Sheet. Add a header row to its first sheet, e.g.:
 *    timestamp | runId | chosenLabel | whyChosen | tradeoffs | confidence | notes
 * 2. Open Extensions > Apps Script in that Sheet, paste this file in as Code.gs.
 * 3. Deploy > New deployment > type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Copy the resulting web app URL — that's your GOOGLE_SHEETS_WEBHOOK_URL
 *    Supabase secret.
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const body = JSON.parse(e.postData.contents);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((h) => String(h));

  // Any header matching a key in the payload gets that value; unmatched
  // headers are left blank. This way you can freely add new question
  // columns to the Sheet without touching this script.
  const row = headers.map((h) => (h in body ? body[h] : ""));

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
