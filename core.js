/* Mocha Tech core: merges settings (live Firebase cache > config.js, then newer admin draft), maintenance gate, contact fill-in. */
(function () {
    var FB = (window.FIREBASE_CFG && FIREBASE_CFG.apiKey && FIREBASE_CFG.databaseURL) ? FIREBASE_CFG : null;
    var C = window.MOCHA_CONFIG || {}, live = null, draft = null;
    try { live = JSON.parse(localStorage.getItem('mocha_live_config') || 'null'); } catch (e) {}
    try { draft = JSON.parse(localStorage.getItem('mocha_config') || 'null'); } catch (e) {}
    if (FB && live) C = live;
    if (draft && (draft.updated || 0) > (C.updated || 0)) C = draft;
    var M = window.MOCHA = C;
    M.contact = M.contact || {}; M.prices = M.prices || {}; M.maintenance = M.maintenance || {};
    var rate = M.usdRate || 130;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    M.esc = esc;
    M.fmtUsd = function (kes) { var v = kes / rate; return v >= 20 ? String(Math.round(v / 5) * 5) : (Math.round(v * 2) / 2).toString(); };
    M.cur = function () { try { return localStorage.getItem('mocha_cur') === 'USD' ? 'USD' : 'KES'; } catch (e) { return 'KES'; } };
    M.money = function (kes, cur) { return cur === 'USD' ? '$' + M.fmtUsd(kes) : 'KES ' + Number(kes).toLocaleString('en-KE'); };
    M.wa = function (t) { return 'https://wa.me/' + (M.contact.whatsapp || '254740218750') + (t ? '?text=' + encodeURIComponent(t) : ''); };

    var root = document.documentElement;
    var preview = /[?&]preview_maintenance/.test(location.search);
    var isAdmin = /admin(\.html)?$/.test(location.pathname);
    var bypass = false;
    try { bypass = (+localStorage.getItem('mocha_admin_bypass') || 0) > Date.now(); } catch (e) {}
    var origTitle = document.title;

    /* first-time visitors wait (max 3s) for the live settings so a stale page never flashes */
    if (FB && !live && !isAdmin) {
        root.classList.add('mt-wait');
        setTimeout(function () { root.classList.remove('mt-wait'); }, 3000);
    }

    function isOff() { return !isAdmin && (preview || (!!(M.maintenance || {}).on && !bypass)); }
    root.classList.toggle('mt-offline', isOff());

    /* build or remove the gate / admin bar. Called on load and again whenever live settings change. */
    M.applyGate = function () {
        var off = isOff();
        root.classList.toggle('mt-offline', off);
        if (!document.body) return;
        var g = document.getElementById('mtGate'), bar = document.getElementById('mtAdminBar');
        if (g) g.remove(); if (bar) bar.remove();
        var m = M.maintenance || {}, email = M.contact.email;
        if (off) {
            g = document.createElement('div');
            g.id = 'mtGate'; g.className = 'mt-gate';
            g.innerHTML = '<div class="mt-gate-card"><div class="mt-gate-icon">🛠️</div><h1>' + esc(m.title || 'We’ll be right back') + '</h1><p>' + esc(m.message || 'Our website is briefly offline for maintenance.') + '</p>' +
                (m.eta ? '<div class="mt-gate-eta">Expected back: ' + esc(m.eta) + '</div>' : '') +
                '<div class="mt-gate-actions"><a href="' + esc(M.wa('Hello Mocha Tech, I saw your maintenance notice.')) + '" target="_blank" rel="noopener">WhatsApp us</a>' +
                (email ? '<a href="mailto:' + esc(email) + '">Email us</a>' : '') + '</div><small>© Mocha Tech Solutions · <a class="mt-gate-admin" href="admin.html">Admin</a></small></div>';
            document.body.appendChild(g);
            document.title = (m.title || 'Maintenance') + ' | Mocha Tech Solutions';
        } else {
            document.title = origTitle;
            if (m.on && bypass && !isAdmin) {
                bar = document.createElement('div');
                bar.id = 'mtAdminBar'; bar.className = 'mt-adminbar';
                bar.innerHTML = '🛠 Maintenance mode is ON. Visitors see a notice; you see the site because you are logged in as admin. <a href="?preview_maintenance=1">Preview notice</a> · <a href="admin.html">Admin</a>';
                document.body.appendChild(bar);
            }
        }
    };

    function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
    ready(function () {
        var email = M.contact.email, wa = M.contact.whatsapp;
        document.querySelectorAll('[data-email]').forEach(function (el) { if (email) el.textContent = email; });
        document.querySelectorAll('[data-mailto]').forEach(function (el) { if (email) el.href = 'mailto:' + email; });
        if (wa) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) { a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + wa); });
            document.querySelectorAll('[data-wa-text]').forEach(function (el) { el.textContent = wa.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, '+$1 $2 $3 $4'); });
        }
        document.querySelectorAll('form[data-formspree]').forEach(function (f) { if (M.contact.formEndpoint) f.action = M.contact.formEndpoint; });
        M.applyGate();
    });
})();
