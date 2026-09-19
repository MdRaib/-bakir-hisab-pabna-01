/* =========================================================
   Multi-client application configuration
   Copy this same file to each client instance and change SITE_ID
   (and client-specific shop/support details) per deployment.
   ========================================================= */

var APP_CONFIG = Object.freeze({
  // ONE centralized Google Cloud OAuth 2.0 Web Client ID.
  // Use the same Client ID in every client deployment.
  CLIENT_ID: "822363790054-s0n5f46cfj134jgpcog4114jo9qf8fb9.apps.googleusercontent.com",

  // Deployed Google Apps Script Web App URL for the central license sheet.
  ADMIN_API_URL: "https://script.google.com/macros/s/AKfycbwiO_rmFYXaEqqvUxY81HTg2w5n1Mp7jTAqWHRyEyici1cmGF6-jyvBWuz4wo_dDsJv/exec",

  // MUST be unique for every deployed client instance.
  SITE_ID: "client_pabna_01",

  // OAuth scopes requested from each client's personal Google account.
  SCOPES: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file",

  // Subscription/support information shown on the lock screen.
  BKASH_NUMBER: "01XXXXXXXXX",
  NAGAD_NUMBER: "01XXXXXXXXX",
  WHATSAPP_NUMBER: "8801XXXXXXXXX",

  // Existing app/shop settings.
  SHOP: {
    name: "আপনার দোকানের নাম",
    owner: "পার্থ",
    address: "দোকানের ঠিকানা",
    phone: "01XXXXXXXXX"
  }
});

// Backward-compatible names used by the existing app code.
var GOOGLE_CLIENT_ID = APP_CONFIG.CLIENT_ID;
var ADMIN_API_URL = APP_CONFIG.ADMIN_API_URL;
var SITE_ID = APP_CONFIG.SITE_ID;
var SCOPES = APP_CONFIG.SCOPES;

var SHOP_CONFIG = APP_CONFIG.SHOP;
