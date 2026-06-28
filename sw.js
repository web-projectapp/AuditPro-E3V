// ==========================================
// File: sw.js
// Fungsi: Service Worker PWA AuditPro
// Status: Aktif & Mendukung Offline Cache-First
// ==========================================

const CACHE_NAME = 'auditpro-v1.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// Tahap Install: Melakukan caching aset statis dasar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Tahap Aktivasi: Membersihkan cache versi lama jika ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Tahap Fetch: Mengambil data dari cache terlebih dahulu, jika gagal ambil dari jaringan
self.addEventListener('fetch', (event) => {
  // Biarkan request API eksternal atau google.script.run langsung lewat tanpa masuk cache
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('googleusercontent') || 
    event.request.url.includes('exec')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ambil versi terbaru di latar belakang untuk memperbarui cache (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Abaikan jika offline */});
        
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Jika offline total dan file html utama tidak terjangkau, kembalikan offline page dari cache
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Tambahan listener untuk force-skip waiting dari client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
