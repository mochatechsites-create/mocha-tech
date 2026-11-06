/* Mocha Tech Admin Panel. Edits are saved as a draft on this device; "Download config.js" + upload publishes them for all visitors. */
(function () {
    'use strict';
    var BASE = window.MOCHA_CONFIG || {};
    var DEF_PRICES = { estBase: 12000, pkgBasic: 15000, pkgBusiness: 35000, pkgMaint: 5000, cv: 500, cover: 300, linkedin: 800, ecitizen: 200, kraPin: 300, kraReturns: 500, kuccps: 300, pdf: 100, typing: 50, academic: 40 };
    var PRICE_FIELDS = [['estBase', 'Estimator Base Price (KES)'], ['pkgBasic', 'Basic Package (KES)'], ['pkgBusiness', 'Business Package (KES)'], ['pkgMaint', 'Maintenance Retainer (/mo)'], ['cv', 'CV Writing & Editing'], ['cover', 'Cover Letter'], ['linkedin', 'LinkedIn Optimization'], ['ecitizen', 'eCitizen Service Fee'], ['kraPin', 'KRA PIN Registration'], ['kraReturns', 'KRA Tax Returns'], ['kuccps', 'KUCCPS / University App'], ['pdf', 'PDF Editing'], ['typing', 'Typing (per page)'], ['academic', 'Academic Formatting (/page)']];
    var ICONS = ['fa-rocket', 'fa-cart-shopping', 'fa-calendar-check', 'fa-chart-line', 'fa-pen-nib', 'fa-shield-halved', 'fa-mobile-screen', 'fa-store', 'fa-graduation-cap', 'fa-gears', 'fa-globe', 'fa-code', 'fa-bolt', 'fa-heart', 'fa-sack-dollar', 'fa-clock', 'fa-file-invoice-dollar', 'fa-language', 'fa-key', 'fa-headset', 'fa-star'];

    /* ---------- Firebase (Realtime Database over REST, Firebase Auth email+password) ---------- */
    var FB = (window.FIREBASE_CFG && FIREBASE_CFG.apiKey && FIREBASE_CFG.databaseURL) ? FIREBASE_CFG : null;
    var AUTHK = 'mocha_fb_auth', DBURL = FB ? FB.databaseURL.replace(/\/$/, '') + '/siteConfig.json' : '';
    var pushT, pushState = '';
    function fbAuth() { try { return JSON.parse(localStorage.getItem(AUTHK) || 'null'); } catch (e) { return null; } }
    function fbSignIn(email, pw) {
        return fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FB.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pw, returnSecureToken: true }) })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j.error) throw new Error(j.error.message || 'Sign-in failed');
                var a = { idToken: j.idToken, refreshToken: j.refreshToken, exp: Date.now() + (+j.expiresIn - 60) * 1000, email: j.email };
                localStorage.setItem(AUTHK, JSON.stringify(a)); return a;
            });
    }
    function fbToken() {
        var a = fbAuth(); if (!a) return Promise.reject(new Error('signed-out'));
        if (Date.now() < a.exp) return Promise.resolve(a.idToken);
        return fetch('https://securetoken.googleapis.com/v1/token?key=' + FB.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(a.refreshToken) })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j.error) { localStorage.removeItem(AUTHK); throw new Error('signed-out'); }
                a.idToken = j.id_token; a.refreshToken = j.refresh_token; a.exp = Date.now() + (+j.expires_in - 60) * 1000;
                localStorage.setItem(AUTHK, JSON.stringify(a)); return a.idToken;
            });
    }
    function fbGet() { return fetch(DBURL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
    function fbPut() {
        var body = clone(cfg); delete body.pinHash;
        return fbToken().then(function (t) { return fetch(DBURL + '?auth=' + encodeURIComponent(t), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); })
            .then(function (r) { if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'permission denied. Check your database rules and that you are signed in' : 'HTTP ' + r.status); });
    }
    function schedulePush(now) { if (!FB) return; pushState = 'pending'; refreshStatus(); clearTimeout(pushT); pushT = setTimeout(doPush, now ? 0 : 1200); }
    function doPush() {
        var u = cfg.updated; pushState = 'busy'; refreshStatus();
        fbPut().then(function () {
            if (cfg.updated > u) { schedulePush(); return; }
            pushState = 'ok'; refreshStatus(); toast('Published live to all visitors ✓');
        }).catch(function (e) { pushState = 'err'; refreshStatus(); toast('Could not publish: ' + (e.message === 'signed-out' ? 'please log in again' : e.message), 'bad'); });
    }
    function friendly(m) {
        if (/INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(m)) return 'Incorrect email or password.';
        if (/TOO_MANY/.test(m)) return 'Too many attempts. Try again later.';
        if (/API key/i.test(m)) return 'Firebase API key is not valid. Check firebase-config.js.';
        return m;
    }

    function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
    var cfg = clone(window.MOCHA || BASE);
    function fix() {
        cfg.contact = Object.assign({ email: '', whatsapp: '', formEndpoint: '' }, cfg.contact);
        cfg.maintenance = Object.assign({ on: false, title: '', message: '', eta: '' }, cfg.maintenance);
        cfg.banner = Object.assign({ on: false, text: '', link: '', linkText: 'Learn More →' }, cfg.banner);
        cfg.prices = Object.assign({}, DEF_PRICES, cfg.prices);
        cfg.usdRate = +cfg.usdRate || 130;
        ['features', 'why', 'showcase', 'posts', 'faq'].forEach(function (k) { if (!Array.isArray(cfg[k])) cfg[k] = []; });
    }
    fix();

    function $(id) { return document.getElementById(id); }
    function h(tag, props, kids) {
        var e = document.createElement(tag);
        for (var k in (props || {})) {
            var v = props[k];
            if (k === 'class') e.className = v;
            else if (k === 'text') e.textContent = v;
            else if (k === 'value') e.value = v;
            else if (k === 'checked') e.checked = !!v;
            else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
            else if (v !== false && v != null) e.setAttribute(k, v);
        }
        (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    var toastT;
    function toast(msg, type) {
        var t = $('toast'); t.textContent = msg; t.className = 'ad-toast show' + (type ? ' ' + type : '');
        clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'ad-toast'; }, 2600);
    }

    /* ---------- saving + publish status ---------- */
    var lastWarn = 0;
    function save(quiet) {
        cfg.updated = Date.now();
        try { localStorage.setItem('mocha_config', JSON.stringify(cfg)); }
        catch (e) { toast('Could not save: browser storage is full. Use smaller images.', 'bad'); return; }
        refreshStatus(); if (FB) schedulePush(false);
        if (!quiet && !FB && Date.now() - lastWarn > 4000) { lastWarn = Date.now(); toast('Saved on this device ✓'); }
    }
    function dirty() { return FB ? pushState !== 'ok' : (cfg.updated || 0) > (BASE.updated || 0); }
    function refreshStatus() {
        var p = $('statusPill'); if (!p) return;
        p.className = 'ad-pill ' + (dirty() ? 'dirty' : 'sync');
        var msg = FB ? ({ ok: '✓ Live for all visitors', pending: '⏳ Publishing…', busy: '⏳ Publishing…', err: '⚠ Not published' }[pushState] || '…') : (dirty() ? '● Unpublished changes' : '✓ Live site is up to date');
        p.textContent = msg;
        var ps = $('pubStatus');
        if (ps) { ps.className = 'ad-status ' + (dirty() ? 'off' : 'live'); ps.textContent = FB ? (pushState === 'ok' ? 'Connected to Firebase. Everything you set here is live on visitors’ phones.' : pushState === 'err' ? 'Last publish failed. Check your connection, then press “Publish now”.' : 'Publishing your changes…') : (dirty() ? 'You have changes that visitors cannot see yet. Download config.js and upload it to your host.' : 'Everything you set here is already live for visitors.'); }
    }
    function exportText() { return '/* Mocha Tech site settings. Edited from the Admin Panel; upload this file to your host to publish changes. */\nwindow.MOCHA_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n'; }

    /* ---------- auth ---------- */
    function sha(s) {
        if (window.crypto && crypto.subtle && window.TextEncoder) {
            return crypto.subtle.digest('SHA-256', new TextEncoder().encode('mocha|' + s)).then(function (b) {
                return 's2:' + Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
            });
        }
        var n = 5381; for (var i = 0; i < s.length; i++) n = ((n << 5) + n + s.charCodeAt(i)) | 0;
        return Promise.resolve('d1:' + n);
    }
    function storedHash() { return cfg.pinHash || localStorage.getItem('mocha_pin_hash') || ''; }
    function legacyPin() { return localStorage.getItem('mocha_admin_pin') || ''; }
    var setupMode = !FB && !storedHash() && !legacyPin();
    var fails = 0, lockUntil = 0;
    if (FB) {
        $('loginHint').textContent = 'Sign in with your Firebase admin email and password.';
        $('adminEmail').hidden = false; $('adminEmail').required = true;
        $('adminPin').placeholder = 'Password'; $('loginBtn').textContent = 'Sign In';
    }
    if (setupMode) {
        $('loginHint').textContent = 'First time here: create your admin PIN (at least 4 characters).';
        $('adminPin').placeholder = 'Create PIN'; $('adminPin2').hidden = false; $('adminPin2').required = true;
        $('loginBtn').textContent = 'Create PIN & Unlock';
    }
    function loginErr(m) { var e = $('loginError'); e.textContent = m; e.hidden = false; }
    function setPin(pin) { return sha(pin).then(function (hh) { cfg.pinHash = hh; localStorage.setItem('mocha_pin_hash', hh); localStorage.removeItem('mocha_admin_pin'); save(true); }); }

    $('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var pin = $('adminPin').value;
        if (FB) {
            $('loginBtn').disabled = true;
            fbSignIn($('adminEmail').value.trim(), pin).then(enter).catch(function (er) { loginErr(friendly(er.message)); }).then(function () { $('loginBtn').disabled = false; });
            return;
        }
        if (Date.now() < lockUntil) { loginErr('Too many attempts. Wait ' + Math.ceil((lockUntil - Date.now()) / 1000) + 's.'); return; }
        if (setupMode) {
            if (pin.length < 4) return loginErr('PIN must be at least 4 characters.');
            if (pin !== $('adminPin2').value) return loginErr('The two PINs do not match.');
            setPin(pin).then(enter); return;
        }
        var stored = storedHash();
        if (!stored && legacyPin()) {
            if (pin === legacyPin()) { setPin(pin).then(enter); } else fail();
            return;
        }
        sha(pin).then(function (hh) { hh === stored ? enter() : fail(); });
    });
    function fail() {
        fails++; loginErr('Incorrect Security PIN!');
        if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
    }
    function enter() {
        try { sessionStorage.setItem('mocha_admin', 'true'); localStorage.setItem('mocha_admin_bypass', String(Date.now() + 12 * 3600 * 1000)); } catch (e) {}
        $('loginCard').hidden = true; $('dashboard').hidden = false;
        if (!FB) { build(); return; }
        fbGet().then(function (d) {
            if (!d) { cfg.updated = Date.now(); try { localStorage.setItem('mocha_config', JSON.stringify(cfg)); } catch (e) {} build(); schedulePush(true); return; }
            if ((d.updated || 0) > (cfg.updated || 0)) { cfg = d; fix(); try { localStorage.setItem('mocha_config', JSON.stringify(cfg)); } catch (e) {} pushState = 'ok'; build(); }
            else if ((d.updated || 0) < (cfg.updated || 0)) { build(); schedulePush(true); }
            else { pushState = 'ok'; build(); }
        }).catch(function () { pushState = 'err'; build(); toast('Could not reach Firebase. Check firebase-config.js.', 'bad'); });
    }
    $('logoutBtn').addEventListener('click', function () {
        try { sessionStorage.removeItem('mocha_admin'); localStorage.removeItem('mocha_admin_bypass'); localStorage.removeItem(AUTHK); } catch (e) {}
        location.reload();
    });
    if (FB) { if (fbAuth()) fbToken().then(enter).catch(function () {}); }
    else if (sessionStorage.getItem('mocha_admin') === 'true' && !setupMode) enter();

    /* ---------- form helpers ---------- */
    function field(label, input, hint) { return h('div', { class: 'ad-field' }, [h('label', { text: label }), input, hint ? h('p', { class: 'ad-hint', text: hint }) : null]); }
    function textInput(get, set, opts) {
        opts = opts || {};
        var hint = h('p', { class: 'ad-hint bad', hidden: true });
        var i = h(opts.area ? 'textarea' : 'input', { class: opts.area ? 'ad-area' : 'ad-input', value: get(), type: opts.area ? null : (opts.type || 'text'), placeholder: opts.ph || '' });
        i.addEventListener('input', function () {
            var v = opts.number ? (parseFloat(i.value) || 0) : i.value;
            var bad = opts.validate ? opts.validate(v) : '';
            hint.hidden = !bad; hint.textContent = bad || '';
            if (!bad) { set(v); save(); }
        });
        var w = h('div', {}, [i, hint]); w.input = i; return w;
    }
    function card(title, desc, kids) { return h('section', { class: 'ad-card' }, [h('h2', { text: title }), desc ? h('p', { class: 'ad-desc', text: desc }) : null].concat(kids || [])); }

    function readImage(file, cb) {
        var r = new FileReader();
        r.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                var w = Math.min(800, img.width), hgt = Math.round(img.height * w / img.width);
                var c = document.createElement('canvas'); c.width = w; c.height = hgt;
                c.getContext('2d').drawImage(img, 0, 0, w, hgt);
                cb(c.toDataURL('image/jpeg', 0.72));
            };
            img.onerror = function () { toast('That file is not a valid image.', 'bad'); };
            img.src = ev.target.result;
        };
        r.readAsDataURL(file);
    }

    /* generic editable list: fields = [{k,label,type:'text'|'area'|'number'|'icon'|'image', wide}] */
    function listEditor(get, fields, make, addLabel) {
        var host = h('div');
        function render() {
            host.innerHTML = '';
            var arr = get();
            if (!arr.length) host.appendChild(h('p', { class: 'ad-empty', text: 'Nothing here yet.' }));
            arr.forEach(function (item, i) {
                var grid = h('div', { class: 'ad-grid' });
                fields.forEach(function (f) {
                    var ctl;
                    if (f.type === 'icon') {
                        ctl = h('select', { class: 'ad-select', onchange: function () { item[f.k] = this.value; save(); } }, ICONS.map(function (ic) { var o = h('option', { value: ic, text: ic.replace('fa-', '') }); if (item[f.k] === ic) o.selected = true; return o; }));
                    } else if (f.type === 'image') {
                        var thumb = h('img', { class: 'ad-thumb', alt: '', hidden: !item[f.k] }); if (item[f.k]) thumb.src = item[f.k];
                        var file = h('input', { type: 'file', accept: 'image/*', class: 'ad-input' });
                        file.addEventListener('change', function () { if (file.files[0]) readImage(file.files[0], function (d) { item[f.k] = d; thumb.src = d; thumb.hidden = false; save(); }); });
                        var rm = h('button', { type: 'button', class: 'ad-btn ad-btn-sm', text: 'Remove image', onclick: function () { item[f.k] = ''; thumb.hidden = true; save(); } });
                        ctl = h('div', {}, [file, h('div', { class: 'ad-row' }, [thumb, rm])]);
                    } else {
                        var t = textInput(function () { return item[f.k] == null ? '' : item[f.k]; }, function (v) { item[f.k] = v; }, { area: f.type === 'area', number: f.type === 'number', type: f.type === 'number' ? 'number' : 'text' });
                        ctl = t;
                    }
                    var fe = field(f.label, ctl); if (f.wide) fe.style.gridColumn = '1/-1'; grid.appendChild(fe);
                });
                var tools = h('div', { class: 'ad-item-tools' }, [
                    h('button', { type: 'button', class: 'ad-btn ad-btn-sm', title: 'Move up', text: '▲', onclick: function () { if (i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); save(); render(); } } }),
                    h('button', { type: 'button', class: 'ad-btn ad-btn-sm', title: 'Move down', text: '▼', onclick: function () { if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); save(); render(); } } }),
                    h('button', { type: 'button', class: 'ad-btn ad-btn-sm ad-btn-danger', title: 'Delete', text: 'Delete', onclick: function () { if (confirm('Delete this item?')) { arr.splice(i, 1); save(); render(); } } })
                ]);
                host.appendChild(h('div', { class: 'ad-item' }, [h('div', { class: 'ad-item-head' }, [h('span', { text: '#' + (i + 1) }), tools]), grid]));
            });
            host.appendChild(h('div', { class: 'ad-row' }, [h('button', { type: 'button', class: 'ad-btn ad-btn-ok', text: '+ ' + addLabel, onclick: function () { get().push(make()); save(); render(); } })]));
        }
        host.render = render; render(); return host;
    }

    /* ---------- panels ---------- */
    var panels = {}, order = [];
    function addPanel(id, label, icon, nodes) { panels[id] = h('div', { id: 'panel_' + id, hidden: true }, nodes); order.push([id, label, icon]); }
    var built = false;
    function build() {
        if (built) return; built = true; fix();
        var tabs = $('tabs'), main = $('panels');

        /* Publish */
        var fileIn = h('input', { type: 'file', accept: '.js,.json,.txt', hidden: true });
        fileIn.addEventListener('change', function () {
            var f = fileIn.files[0]; if (!f) return;
            var r = new FileReader();
            r.onload = function () {
                try {
                    var m = String(r.result).match(/=\s*(\{[\s\S]*\})\s*;?\s*$/) || String(r.result).match(/^\s*(\{[\s\S]*\})\s*$/);
                    cfg = JSON.parse(m[1]); fix(); save(true); toast('Settings imported ✓'); location.reload();
                } catch (e) { toast('That file is not a valid config.js', 'bad'); }
            };
            r.readAsText(f);
        });
        addPanel('publish', 'Publish', 'fa-cloud-arrow-up', [card(FB ? 'Live publishing (Firebase)' : 'Publish your changes to the live site', FB ? 'Every change is published automatically to Firebase and appears on visitors’ phones within seconds. No uploading needed.' : 'Changes you make are saved on this device instantly. Because this is a static site, visitors only see them after you upload the updated settings file.', [
            h('p', { id: 'pubStatus', class: 'ad-status' }),
            FB ? h('p', { class: 'ad-desc', text: 'Tip: “Download config.js” is only a backup copy of your settings.' }) : h('ol', { class: 'ad-steps' }, [h('li', { text: 'Make your changes in any tab.' }), h('li', { text: 'Click “Download config.js” below.' }), h('li', { text: 'Upload it to your host (e.g. Netlify: drag the file into your site’s Deploys page, or replace config.js in your project) so it overwrites the old config.js.' }), h('li', { text: 'Done. Everyone sees the new settings, including the maintenance switch.' })]),
            h('div', { class: 'ad-row' }, [
                FB ? h('button', { class: 'ad-btn ad-btn-ok', onclick: function () { schedulePush(true); } }, [h('i', { class: 'fas fa-cloud-arrow-up' }), ' Publish now']) : null,
                h('button', { class: 'ad-btn ad-btn-primary', html: null, onclick: function () { var a = h('a', { href: URL.createObjectURL(new Blob([exportText()], { type: 'text/javascript' })), download: 'config.js' }); document.body.appendChild(a); a.click(); a.remove(); toast(FB ? 'Backup downloaded.' : 'config.js downloaded. Upload it to your host.'); } }, [h('i', { class: 'fas fa-download' }), ' Download config.js']),
                h('button', { class: 'ad-btn', onclick: function () { if (navigator.clipboard) navigator.clipboard.writeText(exportText()).then(function () { toast('Copied settings to clipboard'); }); } }, [h('i', { class: 'fas fa-copy' }), ' Copy']),
                h('button', { class: 'ad-btn', onclick: function () { fileIn.click(); } }, [h('i', { class: 'fas fa-file-import' }), ' Import config.js']),
                h('button', { class: 'ad-btn ad-btn-danger', onclick: function () { if (confirm('Discard all unpublished changes on this device and go back to the live settings?')) { localStorage.removeItem('mocha_config'); location.reload(); } } }, [h('i', { class: 'fas fa-rotate-left' }), ' Discard draft']),
                fileIn
            ])
        ])]);

        /* Maintenance */
        var mStatus = h('div', { class: 'ad-status' });
        function mUi() { mStatus.className = 'ad-status ' + (cfg.maintenance.on ? 'off' : 'live'); mStatus.textContent = cfg.maintenance.on ? (FB ? 'Status: Site is OFFLINE. Visitors see the maintenance notice right now.' : 'Status: Site is set to OFFLINE. Visitors will see the maintenance notice once you publish.') : (FB ? 'Status: Site is LIVE and online for everyone.' : 'Status: Site is set to LIVE and online.'); }
        var mSwitch = h('label', { class: 'ad-switch' }, [h('input', { type: 'checkbox', checked: cfg.maintenance.on, 'aria-label': 'Site offline mode', onchange: function () { cfg.maintenance.on = this.checked; save(true); mUi(); if (FB) { schedulePush(true); } else toast(this.checked ? 'Offline mode ON. Now publish config.js to apply it for visitors.' : 'Site set to LIVE. Publish config.js to apply it.', 'warn'); } }), h('span')]);
        mUi();
        addPanel('maint', 'Site On/Off', 'fa-power-off', [card('Site Maintenance & Offline Mode', 'Put the site offline while you work. Visitors see a friendly notice with WhatsApp and email buttons. You stay able to browse the site while logged in as admin.', [
            h('div', { class: 'ad-toggle' }, [h('strong', { text: 'Take the website offline' }), mSwitch]), mStatus,
            h('div', { class: 'ad-grid', style: 'margin-top:1rem' }, [
                field('Notice title', textInput(function () { return cfg.maintenance.title; }, function (v) { cfg.maintenance.title = v; })),
                field('Expected back (optional)', textInput(function () { return cfg.maintenance.eta; }, function (v) { cfg.maintenance.eta = v; }, { ph: 'e.g. Today 6 PM EAT' })),
                (function () { var f = field('Message to visitors', textInput(function () { return cfg.maintenance.message; }, function (v) { cfg.maintenance.message = v; }, { area: true })); f.style.gridColumn = '1/-1'; return f; })()
            ]),
            h('div', { class: 'ad-row' }, [h('a', { class: 'ad-btn', href: 'index.html?preview_maintenance=1', target: '_blank' }, [h('i', { class: 'fas fa-eye' }), ' Preview visitor notice']), h('button', { class: 'ad-btn ad-btn-primary', onclick: function () { show('publish'); } }, ['Go to Publish →'])]),
            h('p', { class: 'ad-hint', text: FB ? 'The switch applies to all visitors within a second or two, and you can turn it back on from here at any time.' : 'Important: the switch takes effect for visitors only after you upload the new config.js (see the Publish tab).' })
        ])]);

        /* Contact */
        addPanel('contact', 'Contact & Form', 'fa-envelope', [card('Contact details & enquiry form', 'These appear across the website and in the contact forms.', [h('div', { class: 'ad-grid' }, [
            field('Public email address', textInput(function () { return cfg.contact.email; }, function (v) { cfg.contact.email = v.trim(); }, { type: 'email', validate: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'; } })),
            field('WhatsApp number (digits only, with country code)', textInput(function () { return cfg.contact.whatsapp; }, function (v) { cfg.contact.whatsapp = v.trim(); }, { validate: function (v) { return /^\d{9,15}$/.test(v.trim()) ? '' : 'Digits only, 9 to 15 numbers, e.g. 254740218750'; } })),
            (function () { var f = field('Formspree form URL', textInput(function () { return cfg.contact.formEndpoint; }, function (v) { cfg.contact.formEndpoint = v.trim(); }, { validate: function (v) { return /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(v.trim()) ? '' : 'Must look like https://formspree.io/f/xxxxxxxx'; } }), 'Enquiry forms on the site send to this Formspree form. Formspree emails the address linked to that form in your Formspree account.'); f.style.gridColumn = '1/-1'; return f; })()
        ])])]);

        /* Prices */
        var pg = h('div', { class: 'ad-grid' });
        PRICE_FIELDS.forEach(function (p) { pg.appendChild(field(p[1], textInput(function () { return cfg.prices[p[0]]; }, function (v) { cfg.prices[p[0]] = v; }, { number: true, type: 'number', validate: function (v) { return v >= 0 ? '' : 'Must be 0 or more.'; } }))); });
        addPanel('prices', 'Prices', 'fa-tags', [
            card('Global Price Control Center (KES)', 'Updates package prices, Cyber Desk prices and the estimator. USD amounts are calculated from the exchange rate below.', [
                pg,
                h('div', { class: 'ad-grid', style: 'margin-top:1rem' }, [field('USD exchange rate (KES per 1 USD)', textInput(function () { return cfg.usdRate; }, function (v) { cfg.usdRate = v; }, { number: true, type: 'number', validate: function (v) { return v > 0 ? '' : 'Must be more than 0.'; } }))]),
                h('div', { class: 'ad-row' }, [h('button', { class: 'ad-btn', onclick: function () { if (confirm('Reset all prices to defaults?')) { cfg.prices = clone(DEF_PRICES); save(); location.reload(); } } }, ['Reset to Default Prices'])])
            ]),
            card('Estimator add-on features', 'The tick-boxes visitors see in “Build Your Project Estimate”.', [listEditor(function () { return cfg.features; }, [{ k: 'label', label: 'Feature name' }, { k: 'price', label: 'Price (KES)', type: 'number' }], function () { return { id: 'f' + Date.now(), label: 'New feature', price: 1000 }; }, 'Add feature')])
        ]);

        /* Banner */
        addPanel('banner', 'Banner', 'fa-bullhorn', [card('Top Announcement Banner', 'A coloured bar shown at the top of the homepage.', [
            h('div', { class: 'ad-toggle' }, [h('strong', { text: 'Show banner' }), h('label', { class: 'ad-switch green' }, [h('input', { type: 'checkbox', checked: cfg.banner.on, 'aria-label': 'Show banner', onchange: function () { cfg.banner.on = this.checked; save(); } }), h('span')])]),
            h('div', { class: 'ad-grid', style: 'margin-top:1rem' }, [
                field('Banner text', textInput(function () { return cfg.banner.text; }, function (v) { cfg.banner.text = v; })),
                field('Link (URL or #contact)', textInput(function () { return cfg.banner.link; }, function (v) { cfg.banner.link = v; })),
                field('Link label', textInput(function () { return cfg.banner.linkText; }, function (v) { cfg.banner.linkText = v; }))
            ])
        ])]);

        /* Showcase */
        addPanel('showcase', 'What We Build', 'fa-camera', [card('“What We Build” project cards', 'Each card has an icon (or your own screenshot), a starting price in KES (shown in KES or USD to visitors) and a request button. Set the price to 0 to hide it.', [listEditor(function () { return cfg.showcase; }, [{ k: 'title', label: 'Project name' }, { k: 'category', label: 'Category' }, { k: 'kes', label: 'From price (KES)', type: 'number' }, { k: 'unit', label: 'Price unit (e.g. /mo)' }, { k: 'icon', label: 'Icon', type: 'icon' }, { k: 'image', label: 'Screenshot (optional, replaces icon)', type: 'image' }, { k: 'desc', label: 'Description', type: 'area', wide: true }], function () { return { id: Date.now(), title: 'New project', category: 'Category', icon: 'fa-rocket', kes: 10000, unit: '', image: '', desc: 'Describe this project type.' }; }, 'Add project card')])]);

        /* Posts */
        addPanel('posts', 'News & Offers', 'fa-newspaper', [card('News & Special Offers', 'Shown in a section under the welcome area. Delete all to hide the section.', [listEditor(function () { return cfg.posts; }, [{ k: 'badge', label: 'Badge (e.g. PROMO)' }, { k: 'title', label: 'Title' }, { k: 'desc', label: 'Description', type: 'area', wide: true }], function () { return { id: Date.now(), badge: 'NEW', title: 'New offer', desc: 'Describe the offer.' }; }, 'Add offer')])]);

        /* Why us */
        addPanel('why', 'Why Us', 'fa-thumbs-up', [card('“Why choose us” cards', 'Selling points shown above How It Works.', [listEditor(function () { return cfg.why; }, [{ k: 'title', label: 'Title' }, { k: 'icon', label: 'Icon', type: 'icon' }, { k: 'text', label: 'Text', type: 'area', wide: true }], function () { return { icon: 'fa-star', title: 'New benefit', text: 'Explain this benefit.' }; }, 'Add card')])]);

        /* FAQ */
        addPanel('faq', 'FAQ', 'fa-circle-question', [card('Frequently Asked Questions', 'Edit, reorder, add or delete questions. They appear on the homepage with search.', [listEditor(function () { return cfg.faq; }, [{ k: 'q', label: 'Question', wide: true }, { k: 'a', label: 'Answer', type: 'area', wide: true }], function () { return { q: 'New question?', a: 'Answer goes here.' }; }, 'Add question')])]);

        /* Security */
        var msg = h('p', { class: 'ad-hint' });
        var cur = h('input', { class: 'ad-input', type: 'password', placeholder: 'Current PIN', autocomplete: 'off' });
        var np = h('input', { class: 'ad-input', type: 'password', placeholder: 'New PIN (min 4 chars)', autocomplete: 'off' });
        var np2 = h('input', { class: 'ad-input', type: 'password', placeholder: 'Repeat new PIN', autocomplete: 'off' });
        addPanel('security', 'Security', 'fa-key', FB ? [card('Security & Password Management', 'You sign in with Firebase Authentication' + (fbAuth() ? ' as ' + fbAuth().email : '') + '. Change the password or add more admins in Firebase console > Authentication > Users. Only signed-in admins can change the live site (set by your database rules).', [])] : [card('Security & Password Management', 'Your PIN is stored as a one-way hash. Publish config.js to use the new PIN on other devices.', [
            h('form', { class: 'ad-grid', autocomplete: 'off', onsubmit: function (e) {
                e.preventDefault(); msg.className = 'ad-hint bad';
                if (np.value.length < 4) { msg.textContent = 'New PIN must be at least 4 characters.'; return; }
                if (np.value !== np2.value) { msg.textContent = 'The new PINs do not match.'; return; }
                sha(cur.value).then(function (hh) {
                    if (hh !== storedHash()) { msg.textContent = 'Current PIN is incorrect!'; return; }
                    setPin(np.value).then(function () { msg.className = 'ad-hint ad-ok'; msg.textContent = 'Admin PIN updated successfully!'; cur.value = np.value = np2.value = ''; });
                });
            } }, [cur, np, np2, h('button', { class: 'ad-btn ad-btn-primary', type: 'submit', text: 'Update PIN' })]), msg,
            h('p', { class: 'ad-hint', text: 'Note: this PIN protects the admin screen only. Real control of the live site is whoever can upload files to your hosting, so keep your Netlify login safe.' })
        ])]);

        order.forEach(function (o) {
            tabs.appendChild(h('button', { class: 'ad-tab', id: 'tab_' + o[0], onclick: function () { show(o[0]); } }, [h('i', { class: 'fas ' + o[2] }), ' ' + o[1]]));
            main.appendChild(panels[o[0]]);
        });
        show('publish'); refreshStatus();
    }
    function show(id) {
        order.forEach(function (o) { panels[o[0]].hidden = o[0] !== id; $('tab_' + o[0]).classList.toggle('active', o[0] === id); });
        refreshStatus(); window.scrollTo(0, 0);
    }
})();
