/* Live updates from Firebase Realtime Database (no SDK needed). Visitors get admin changes instantly. */
(function () {
    var FB = (window.FIREBASE_CFG && FIREBASE_CFG.apiKey && FIREBASE_CFG.databaseURL) ? FIREBASE_CFG : null;
    var M = window.MOCHA;
    if (!FB || !M || /admin(\.html)?$/.test(location.pathname)) return;
    var url = FB.databaseURL.replace(/\/$/, '') + '/siteConfig.json';
    var root = document.documentElement, touched = false, timer;
    document.addEventListener('input', function () { touched = true; }, true);

    function reveal() { root.classList.remove('mt-wait'); }
    function strip(o) { var c = JSON.parse(JSON.stringify(o || {})); delete c.updated; delete c.maintenance; delete c.pinHash; return JSON.stringify(c); }
    function pill() {
        if (document.getElementById('mtRefresh')) return;
        var b = document.createElement('button');
        b.id = 'mtRefresh'; b.className = 'mt-refresh'; b.textContent = 'Site updated · tap to refresh';
        b.onclick = function () { location.reload(); };
        document.body.appendChild(b);
    }
    function handle(d, first) {
        if (!d || typeof d !== 'object' || !((d.updated || 0) > (M.updated || 0))) return;
        try { localStorage.setItem('mocha_live_config', JSON.stringify(d)); } catch (e) {}
        var same = strip(d) === strip(M);
        M.maintenance = d.maintenance || {}; M.updated = d.updated;
        if (same) { if (M.applyGate) M.applyGate(); return; }   /* only the on/off switch changed: apply instantly */
        if (first || !touched) location.reload(); else pill();
    }
    function fetchLive(first) {
        fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (d) { handle(d, first); reveal(); })
            .catch(reveal);
    }
    function soon() { clearTimeout(timer); timer = setTimeout(function () { fetchLive(false); }, 300); }

    fetchLive(true);
    try {
        if (window.EventSource) {
            var es = new EventSource(url);
            es.addEventListener('put', soon); es.addEventListener('patch', soon);
        }
    } catch (e) {}
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchLive(false); });
})();
