// ปฏิทินหลวงพ่อ — Service Worker (v2)
const CACHE_NAME = 'luangpor-v2';
// cache เฉพาะ asset ที่ไม่เกี่ยวกับ auth
const ASSETS = ['./logo.png', './manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(e => console.warn('cache:', e)))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // ไม่แตะ HTML เลย — ให้โหลดสดทุกครั้ง (สำคัญมากสำหรับ Firebase Auth)
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname.endsWith('/')) {
    return;
  }

  // ไม่แตะ Firebase / Google / API ใดๆ
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('line.me') ||
      url.hostname.includes('cloudfunctions')) {
    return;
  }

  // cache เฉพาะรูปและ font
  if (/\.(png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return res;
        }).catch(() => cached)
      )
    );
  }
});
