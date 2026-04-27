// ── AvariApp Service Worker ──
// v4: cache atualizado de app + bibliotecas CDN

const APP_CACHE = 'avariapp-v4';
const CDN_CACHE = 'avariapp-cdn-v2';
const URL_BASE  = '/avariapp/';

// Bibliotecas externas necessarias para PDF, QR Code e Excel
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
];

// ── INSTALL: cacheia app + CDN ──
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then(c => c.add(URL_BASE)),
      caches.open(CDN_CACHE).then(c =>
        Promise.allSettled(
          CDN_URLS.map(url =>
            fetch(url, { cache: 'no-cache' })
              .then(res => { if (res.ok) return c.put(url, res); })
              .catch(err => console.warn('[SW] CDN nao cacheado:', url, err))
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// ── ACTIVATE: remove caches antigos ──
self.addEventListener('activate', e => {
  const VALID = new Set([APP_CACHE, CDN_CACHE]);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !VALID.has(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first para CDN, stale-while-revalidate para app ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // CDN: cache-first (URLs versionadas, nunca mudam)
  if (CDN_URLS.some(u => url.startsWith(u.split('?')[0]))) {
    e.respondWith(
      caches.open(CDN_CACHE).then(c =>
        c.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res && res.ok) c.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // App: network-first com fallback para cache
  e.respondWith(
    caches.open(APP_CACHE).then(c =>
      c.match(e.request).then(cached =>
        fetch(e.request)
          .then(res => {
            if (res && res.status === 200) c.put(e.request, res.clone());
            return res;
          })
          .catch(() => cached || caches.match(URL_BASE))
      )
    )
  );
});
