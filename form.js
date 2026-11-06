/* Sends enquiry forms to Formspree without leaving the page, then opens thanks.html. */
(function () {
    document.querySelectorAll('form[data-formspree]').forEach(function (f) {
        var msg = document.createElement('p');
        msg.setAttribute('role', 'alert'); msg.className = 'mt-form-msg'; msg.hidden = true;
        f.appendChild(msg);
        f.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!f.reportValidity()) return;
            var btn = f.querySelector('[type=submit]'), label = btn.textContent;
            btn.disabled = true; btn.textContent = 'Sending…'; msg.hidden = true;
            fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
                .then(function (r) { if (!r.ok) throw new Error('bad'); location.href = 'thanks.html'; })
                .catch(function () {
                    btn.disabled = false; btn.textContent = label;
                    var wa = (window.MOCHA && MOCHA.wa) ? MOCHA.wa('Hi, my website form did not send.') : 'https://wa.me/254740218750';
                    msg.innerHTML = 'Sorry, that did not send. Please try again or <a href="' + wa + '" target="_blank" rel="noopener">message us on WhatsApp</a>.';
                    msg.hidden = false;
                });
        });
    });
})();
