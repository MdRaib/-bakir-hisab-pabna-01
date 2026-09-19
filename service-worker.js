/* =========================================================
   PWA Service Worker
   - Caches only same-origin application assets.
   - NEVER caches Google OAuth/Drive or the central Admin API.
   ========================================================= */
const CACHE = 'shudhu-baki-hisab-multiclient-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

let ADMIN_ORIGIN = '';
try {
  // config.js uses `var APP_CONFIG`, which is exposed to classic workers.
  importScripts('./config.js');
  ADMIN_ORIGIN = APP_CONFIG?.ADMIN_API_URL ? new URL(APP_CONFIG.ADMIN_API_URL).origin : '';
} catch (e) {
  // The worker can still serve the local shell if config cannot be read.
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isExternalApi(requestUrl) {
  const u = new URL(requestUrl);
  if (u.hostname === 'accounts.google.com') return true;
  if (u.hostname === 'googleapis.com' || u.hostname.endsWith('.googleapis.com')) return true;
  if (ADMIN_ORIGIN && u.origin === ADMIN_ORIGIN) return true;
  return false;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = event.request.url;

  // Critical: never cache authentication, Drive API, or license API calls.
  if (isExternalApi(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  const u = new URL(requestUrl);

  // Only apply app-shell caching to this PWA's own origin.
  if (u.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', {status: 503, statusText: 'Offline'});
      });
    })
  );
});
