MULTI-CLIENT PWA — Google Drive Backup + Central License Control

This ZIP is an updated version of the supplied “no login system” app.

What changed:
1. Multi-client configuration via config.js and a unique SITE_ID.
2. One centralized Google OAuth Web Client ID can be reused across all client deployments.
3. Each client authenticates with their own Google account; Drive files remain in that user's Drive.
4. OAuth scopes use:
   https://www.googleapis.com/auth/drive.appdata
   https://www.googleapis.com/auth/drive.file
5. Central subscription check uses Google Apps Script + Google Sheet.
6. Paused/expired/unknown/unverifiable subscriptions show a non-closable full-screen lock.
7. The lock system never deletes, edits, or removes Google Drive backup files.
8. Service Worker never caches Google OAuth, Google Drive API, or Admin API responses.
9. PWA manifest + 192/512 icons included for mobile installation.

CONFIGURATION
-------------
Edit config.js:
- CLIENT_ID: the ONE centralized Google Cloud OAuth 2.0 Web Client ID.
- ADMIN_API_URL: deployed Apps Script /exec URL.
- SITE_ID: unique ID for this client, e.g. client_pabna_01.
- BKASH_NUMBER / NAGAD_NUMBER / WHATSAPP_NUMBER: client support details.

GOOGLE CLOUD
------------
Add every deployed GitHub Pages / Netlify origin to the OAuth Web Client's
Authorized JavaScript origins.

GOOGLE SHEET
------------
Column A: SITE_ID
Column B: Status (Active or Paused)
Column C: Expiry_Date (YYYY-MM-DD)

Example:
client_pabna_01 | Active | 2026-12-31
client_demo_02  | Paused | 2026-10-15

APPS SCRIPT
-----------
Paste Code.gs into the Sheet's Apps Script editor and deploy it as a Web app:
- Execute as: Me
- Who has access: Anyone
Then copy the /exec URL to config.js.

DRIVE BACKUP SAFETY
-------------------
Pausing or expiring a license only prevents the app from using its features.
No Drive file deletion is performed by the license code.

PWA
---
Host over HTTPS (GitHub Pages / Netlify). Android Chrome can install it from
the browser's install/add-to-home-screen UI. iOS Safari can use Share >
Add to Home Screen.

IMPORTANT
---------
Replace all PASTE_* placeholders before deployment. Do not put a service-account
private key, client secret, or Google Cloud private credential in this frontend.
