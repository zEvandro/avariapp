const APP_CACHE = 'avariapp-v4';
const CDN_CACHE = 'avariapp-cdn-v1';
const URL_BASE  = '/avariapp/';

const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then(c => c.add(URL_BASE)),
      caches.open(CDN_CACHE).then(c =>
        Promise.allSettled(CDN_URLS.map(url => fetch(url).then(res => c.put(url, res))))
      ),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== APP_CACHE && k !== CDN_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});