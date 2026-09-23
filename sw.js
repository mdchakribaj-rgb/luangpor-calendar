// ปฏิทินหลวงพ่อ — Service Worker
const CACHE_NAME = 'luangpor-v1';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './admin.html',
  './invite.html',
  './logo.png',
  './manifest.json'
];

// ติดตั้ง — cache ไฟล์หลัก
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(err => {
        console.warn('Cache บางไฟล์ไม่สำเร็จ:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// เปิดใช้งาน — ลบ cache เก่า
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ดักจับ request
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ข้าม request ที่ไม่ใช่ GET
  if (event.request.method !== 'GET') return;

  // ข้าม Firebase / Google APIs — ต้องใช้ข้อมูลสดเสมอ
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('line.me')
  ) {
    return;
  }

  // Network First สำหรับ HTML (ให้ได้เวอร์ชันล่าสุดเสมอ)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache First สำหรับ assets (รูป, fonts, css)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
