var CACHE_NAME = 'irfan-admin-v9';
var ASSETS = [
    'assets/style.css',
    'assets/app.js',
    'assets/admin.js',
    'assets/logo.jpg',
    'assets/user-icons/user-default.png',
    'ticket.html',
    'manifest.json'
];

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(ASSETS); }));
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }));
    self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).then(function (res) {
            if (e.request.url.indexOf('admin-') === -1 && e.request.url.indexOf('contact.html') === -1) {
                var copy = res.clone();
                caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
            }
            return res;
        }).catch(function () {
            return caches.match(e.request);
        })
    );
});
