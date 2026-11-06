/* Mocha Tech service worker: network-first (so admin changes show up), cache as offline fallback. */
const CACHE = 'mocha-v7';
const CORE = ['index.html', 'online_cyber.html', 'thanks.html', 'config.js', 'core.js', 'site.js', 'estimator.js', 'form.js', 'live.js', 'firebase-config.js', 'styles.css', 'icon.svg', 'manifest.json'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;
    e.respondWith(
        fetch(req)
            .then((res) => {
                if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
                return res;
            })
            .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
    );
});
