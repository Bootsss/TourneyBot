// 1. Open your Google Sheet.
// 2. Extensions -> Apps Script.
// 3. Delete any starter code and paste this in.
// 4. Replace SECRET below with the SAME value you put in SHEETS_SECRET in your bot's .env
// 5. Deploy -> New deployment -> Type: Web app
//      - Execute as: Me
//      - Who has access: Anyone
//    Copy the resulting URL into SHEETS_WEBHOOK_URL in your bot's .env

const SECRET = 'choose_a_long_random_string_here'; // must match SHEETS_SECRET exactly
const SHEET_NAME = 'Signups';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.secret !== SECRET) {
      return ContentService.createTextOutput('Unauthorized').setMimeType(ContentService.MimeType.TEXT);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Discord Username', 'Discord ID', 'Steam Profile URL', 'Region',
        'Teammate 1 Discord', 'Teammate 1 Steam', 'Teammate 1 DM Sent',
        'Teammate 2 Discord', 'Teammate 2 Steam', 'Teammate 2 DM Sent',
      ]);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.discordUsername || '',
      data.discordId || '',
      data.steamUrl || '',
      data.region || '',
      data.teammate1Discord || '',
      data.teammate1Steam || '',
      data.teammate1DmSent || '',
      data.teammate2Discord || '',
      data.teammate2Steam || '',
      data.teammate2DmSent || '',
    ]);

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
