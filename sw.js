/**
 * sw.js
 * Service Worker for offline execution and asset caching in catalog_pdf_pwa.
 */

const CACHE_NAME = 'catalog-pdf-pwa-v1';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/catalog.css',
  './css/admin.css',
  './css/print.css',
  './js/app.js',
  './js/db.js',
  './js/rules.js',
  './js/image-helper.js',
  './js/theme.js',
  './js/backup.js',
  './js/drag-drop.js',
  './assets/default.svg',
  './assets/icons/S_app_icon.jpg',
  './assets/icons/B_app_icon.jpg'
];

/**
 * Install Event: Pre-caches all core static assets.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

/**
 * Activate Event: Removes outdated caches when CACHE_NAME version increments.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldCache) => caches.delete(oldCache))
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch Event: Cache-First strategy with network fallback for offline support.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});