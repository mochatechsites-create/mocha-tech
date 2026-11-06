/* Mocha Tech public renderer: banner, currency toggle, why-us, news, showcase and FAQ, all driven by config.js / admin panel. */
(function () {
    var M = window.MOCHA || {}, P = M.prices || {}, esc = M.esc || String;
    function $(id) { return document.getElementById(id); }
    function waLink(t) { return M.wa ? M.wa(t) : 'https://wa.me/254740218750?text=' + encodeURIComponent(t); }

    /* 1. Top banner */
    var b = M.banner || {};
    if (b.on !== false && b.text && $('topBanner')) {
        $('bannerText').textContent = b.text;
        var bl = $('bannerLink');
        if (b.link) { bl.href = b.link; bl.textContent = b.linkText || 'Learn More →'; bl.classList.remove('hidden'); }
        $('topBanner').classList.remove('hidden');
    }

    /* 2. Why choose us */
    var why = $('whyGrid');
    if (why && (M.why || []).length) {
        why.innerHTML = M.why.map(function (w) {
            return '<div class="mt-why"><div class="mt-why-icon"><i class="fas ' + esc(w.icon || 'fa-star') + '" aria-hidden="true"></i></div><h3>' + esc(w.title) + '</h3><p>' + esc(w.text) + '</p></div>';
        }).join('');
    }

    /* 3. News & offers */
    var posts = M.posts || [], pg = $('postsGrid');
    if (pg && posts.length) {
        ['postsSection', 'navPostsLink', 'mobilePostsLink'].forEach(function (id) { if ($(id)) $(id).classList.remove('hidden'); });
        pg.innerHTML = posts.map(function (p) {
            return '<div class="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 flex flex-col justify-between"><div>' +
                '<span class="text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-3 py-1 rounded-full uppercase tracking-wider">' + esc(p.badge) + '</span>' +
                '<h3 class="font-bold text-xl mt-4 mb-2">' + esc(p.title) + '</h3>' +
                '<p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">' + esc(p.desc) + '</p></div>' +
                '<a href="' + esc(waLink('Hi Mocha Tech, I want to claim offer: ' + p.title)) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline"><i class="fab fa-whatsapp"></i> Claim Offer Now →</a></div>';
        }).join('');
    }

    /* 4. Showcase */
    var sg = $('showcaseGrid');
    if (sg) {
        sg.innerHTML = (M.showcase || []).map(function (s, i) {
            var top = s.image
                ? '<img src="' + esc(s.image) + '" alt="' + esc(s.title) + '" loading="lazy">'
                : '<i class="fas ' + esc(s.icon || 'fa-rocket') + '" aria-hidden="true"></i>';
            return '<article class="mt-card"><div class="mt-card-top mt-g' + (i % 6) + (s.image ? ' has-img' : '') + '">' + top + '<span class="mt-chip">' + esc(s.category) + '</span></div>' +
                '<div class="mt-card-body"><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p>' +
                '<div class="mt-card-foot">' + (+s.kes ? '<div><span class="mt-from">From</span> <strong data-kes="' + (+s.kes) + '"></strong><span class="mt-unit">' + esc(s.unit || '') + '</span></div>' : '<div></div>') +
                '<a class="mt-wa" target="_blank" rel="noopener" href="' + esc(waLink('Hi Mocha Tech, I saw your "' + s.title + '" project type and want something similar.')) + '"><i class="fab fa-whatsapp"></i> Request</a></div></div></article>';
        }).join('');
    }

    /* 5. Currency toggle (KES / USD) */
    function renderMoney() {
        var cur = M.cur ? M.cur() : 'KES';
        document.querySelectorAll('[data-money],[data-kes]').forEach(function (el) {
            var k = el.hasAttribute('data-kes') ? +el.getAttribute('data-kes') : P[el.getAttribute('data-money')];
            if (k == null || isNaN(k)) return;
            el.textContent = M.money(k, cur) + (el.hasAttribute('data-plus') ? '+' : '');
        });
        document.querySelectorAll('.mt-cur-btn').forEach(function (btn) {
            var on = btn.getAttribute('data-cur') === cur;
            btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    document.querySelectorAll('.mt-cur-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            try { localStorage.setItem('mocha_cur', btn.getAttribute('data-cur')); } catch (e) {}
            renderMoney();
        });
    });
    renderMoney();

    /* 6. FAQ with search + single-open accordion */
    var fc = $('faqContainer'), faq = (M.faq || []).filter(function (f) { return f.q && f.a; });
    if (fc) {
        fc.innerHTML = faq.map(function (f, i) {
            return '<details class="faq mt-faq"><summary><span class="mt-faq-q"><span class="mt-faq-n">' + String(i + 1).padStart(2, '0') + '</span>' + esc(f.q) + '</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary><p>' + esc(f.a) + '</p></details>';
        }).join('');
        var items = fc.querySelectorAll('details'), empty = $('faqEmpty'), search = $('faqSearch');
        items.forEach(function (d) {
            d.addEventListener('toggle', function () { if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; }); });
        });
        if (search) search.addEventListener('input', function () {
            var q = search.value.trim().toLowerCase(), n = 0;
            items.forEach(function (d) { var hit = !q || d.textContent.toLowerCase().indexOf(q) > -1; d.hidden = !hit; if (hit) n++; });
            if (empty) empty.hidden = n > 0;
        });
        if (faq.length) {
            var ld = document.createElement('script');
            ld.type = 'application/ld+json';
            ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(function (f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; }) });
            document.head.appendChild(ld);
        }
    }
})();
