var CACHE_NAME = 'irfan-admin-v10';
var ASSETS = [
    'assets/style.css',
    'assets/app.js?v=10',
    'assets/admin.js?v=10',
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
    }).then(function () { return self.clients.claim(); }));
});

/* Network-first: JS/HTML hamesha server se, offline par cache */
self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    var url = e.request.url;
    var isSameOrigin = url.indexOf(self.location.origin) === 0;
    var isCritical = isSameOrigin && (
        url.indexOf('.js') !== -1 ||
        url.indexOf('.html') !== -1 ||
        url.indexOf('/admin/') !== -1 ||
        url.indexOf('sw.js') !== -1
    );

    if (isCritical) {
        e.respondWith(
            fetch(e.request).then(function (res) {
                if (res && res.ok) {
                    var copy = res.clone();
                    caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); }).catch(function () { });
                }
                return res;
            }).catch(function () {
                return caches.match(e.request).then(function (m) {
                    return m || Response.error();
                });
            })
        );
        return;
    }

    e.respondWith(
        fetch(e.request).then(function (res) {
            if (res && res.ok && isSameOrigin) {
                var copy = res.clone();
                caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); }).catch(function () { });
            }
            return res;
        }).catch(function () {
            return caches.match(e.request);
        })
    );
});
