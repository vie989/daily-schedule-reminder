/**
 * Service Worker
 * 提供离线支持和后台通知
 */

const CACHE_NAME = 'tomorrow-reminder-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/storage.js',
    '/js/notifications.js',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
    console.log('Service Worker 安装中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('缓存资源中...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('资源缓存完成');
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活中...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker 已激活');
                return self.clients.claim();
            })
    );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((response) => {
                        // 检查是否是有效响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应用于缓存
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // 离线时返回缓存的首页
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
    console.log('通知被点击:', event.notification.tag);

    event.notification.close();

    // 打开或聚焦应用窗口
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 如果已有窗口打开，聚焦它
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 否则打开新窗口
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// 推送事件（用于后台通知，需要服务器支持）
self.addEventListener('push', (event) => {
    console.log('收到推送:', event);

    if (event.data) {
        const data = event.data.json();

        event.waitUntil(
            self.registration.showNotification(data.title || '⏰ 任务提醒', {
                body: data.body || '您有一个任务需要处理',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: data.tag || 'push-notification',
                requireInteraction: true,
                vibrate: [200, 100, 200]
            })
        );
    }
});
