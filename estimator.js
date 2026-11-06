/* Project estimator. Prices, add-ons and USD rate come from the admin panel (config.js). */
(function () {
    var M = window.MOCHA || {}, P = M.prices || {};
    var BASE = P.estBase || 12000, USD_RATE = M.usdRate || 130;
    var PAGE_STEP = { 5: 0, 8: 2500, 12: 5000, 20: 10000 };
    var FEATURES = (M.features || []).map(function (f, i) { return { id: f.id || 'f' + i, label: f.label, price: +f.price || 0 }; });

    var pages = document.getElementById('estPages'), box = document.getElementById('estFeatures');
    var total = document.getElementById('estTotal'), usd = document.getElementById('estUsd'), wa = document.getElementById('estWhatsapp');
    if (!pages || !box) return;

    FEATURES.forEach(function (f) {
        var label = document.createElement('label');
        label.className = 'flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-violet-500';
        var input = document.createElement('input');
        input.type = 'checkbox'; input.id = 'est_' + f.id; input.className = 'mt-0.5 w-4 h-4 accent-violet-600';
        var span = document.createElement('span');
        span.textContent = f.label;
        label.appendChild(input); label.appendChild(span); box.appendChild(label);
        input.addEventListener('change', update);
    });
    pages.addEventListener('change', update);

    function fmt(n) { return n.toLocaleString('en-KE'); }
    function update() {
        var sum = BASE + (PAGE_STEP[pages.value] || 0), chosen = [];
        FEATURES.forEach(function (f) {
            if (document.getElementById('est_' + f.id).checked) { sum += f.price; chosen.push(f.label); }
        });
        total.textContent = 'KES ' + fmt(sum) + '+';
        usd.textContent = 'about USD $' + fmt(Math.round(sum / USD_RATE));
        var msg = 'Hi Mocha Tech, I used your estimator. Pages: ' + pages.options[pages.selectedIndex].text +
            '. Features: ' + (chosen.length ? chosen.join(', ') : 'none selected') +
            '. Estimate: KES ' + fmt(sum) + '+ (about USD $' + fmt(Math.round(sum / USD_RATE)) + '). Can we discuss?';
        wa.href = M.wa ? M.wa(msg) : 'https://wa.me/254740218750?text=' + encodeURIComponent(msg);
    }
    update();
})();
