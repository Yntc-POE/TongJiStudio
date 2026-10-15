/* 桐记工坊 · Service Worker（PWA 离线缓存） */
const CACHE_NAME = 'tongji-v4.1.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* 安装：预缓存核心文件 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] 部分资源缓存失败（可忽略）:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

/* 请求拦截：网络优先，失败时回退缓存（保证能拿到最新版） */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 只处理同源 GET 请求
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // 成功则更新缓存
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => {
        // 网络失败 → 用缓存
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // 页面请求回退到 index.html
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('离线状态，资源不可用', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});

/* 接收主线程消息（用于跳过等待） */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
