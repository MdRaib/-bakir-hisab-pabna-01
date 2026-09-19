/**
 * Central license/subscription API for all client PWA instances.
 *
 * Google Sheet layout:
 *   Column A = SITE_ID
 *   Column B = Status      (Active / Paused)
 *   Column C = Expiry_Date (YYYY-MM-DD)
 *
 * Example:
 *   client_pabna_01 | Active | 2026-12-31
 *   client_demo_02  | Paused | 2026-10-15
 *
 * Deploy as:
 *   Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Then place the /exec URL in config.js as ADMIN_API_URL.
 */

const SHEET_NAME = ''; // Optional. Leave blank to use the first sheet/tab.

/**
 * Handles GET /exec?site_id=client_pabna_01
 */
function doGet(e) {
  const siteId = String((e && e.parameter && e.parameter.site_id) || '').trim();

  const result = findSubscription(siteId);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function findSubscription(siteId) {
  if (!siteId) {
    return {
      status: 'Paused',
      expiry_date: '',
      error: 'Missing site_id'
    };
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = SHEET_NAME
    ? spreadsheet.getSheetByName(SHEET_NAME)
    : spreadsheet.getSheets()[0];

  if (!sheet) {
    return {
      status: 'Paused',
      expiry_date: '',
      error: 'Sheet not found'
    };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return {
      status: 'Paused',
      expiry_date: '',
      error: 'No subscription records'
    };
  }

  // Read A:C: Site ID, Status, Expiry Date.
  const rows = sheet.getRange(1, 1, lastRow, 3).getDisplayValues();

  // Allow a header row. Matching is case-insensitive and trimmed.
  const target = siteId.toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const rowSiteId = String(rows[i][0] || '').trim().toLowerCase();

    if (!rowSiteId || rowSiteId === 'site_id') continue;

    if (rowSiteId === target) {
      const status = normalizeStatus(rows[i][1]);
      const expiry = normalizeDate(rows[i][2]);

      return {
        status: status,
        expiry_date: expiry
      };
    }
  }

  // Unknown SITE_ID is fail-closed.
  return {
    status: 'Paused',
    expiry_date: '',
    error: 'SITE_ID not found'
  };
}

function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === 'active' ? 'Active' : 'Paused';
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // If the cell is already displayed as YYYY-MM-DD, keep it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Convert common sheet display formats to YYYY-MM-DD.
  const date = new Date(raw);
  if (isNaN(date.getTime())) return '';

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || 'Asia/Dhaka',
    'yyyy-MM-dd'
  );
}
