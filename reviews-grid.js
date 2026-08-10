/* Vanessa Flow Yoga - live reviews grid
 * Pulls reviews from the Momence API and renders our own brand-styled cards.
 * Read-only data fetch (no cookies set), so it runs without cookie consent.
 * Review text is user-generated: rendered with textContent only (never
 * innerHTML) to prevent any HTML/script injection.
 */
(function () {
  'use strict';
  var el = document.getElementById('reviewsGrid');
  if (!el) return;

  var host = el.getAttribute('data-host') || '13063';
  var sig = el.getAttribute('data-signature') || '';
  var count = parseInt(el.getAttribute('data-count') || '9', 10);
  var page = parseInt(el.getAttribute('data-page') || '0', 10);  // offset for variety per page
  if (!sig) return;

  // Over-fetch so we can drop blank/low-rated ones and still fill the strip.
  var pageSize = Math.min(Math.max(count * 3, 15), 60);
  var url = 'https://api.momence.com/host-plugins/host/' + host +
    '/reviews?pageSize=' + pageSize + '&page=' + page + '&isFullLastNameVisible=false' +
    '&isTextOnlyEnabled=true&isSessionAndTeacherInfoEnabled=true&s=' + encodeURIComponent(sig);

  function wireArrows() {
    var wrap = el.parentNode; if (!wrap) return;
    var prev = wrap.querySelector('.rv-prev'), next = wrap.querySelector('.rv-next');
    function step(dir) {
      var card = el.querySelector('.rv-card');
      var w = card ? card.offsetWidth + 18 : Math.round(el.clientWidth * 0.8);
      el.scrollBy({ left: dir * w, behavior: 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  }

  function stars(grade) {
    var g = Math.max(0, Math.min(5, grade | 0));
    return '★★★★★'.slice(0, g) + '☆☆☆☆☆'.slice(0, 5 - g);
  }

  function render(items) {
    el.textContent = '';
    items.forEach(function (rv) {
      var card = document.createElement('article');
      card.className = 'rv-card';

      var st = document.createElement('div');
      st.className = 'rv-stars';
      st.textContent = stars(rv.grade);
      st.setAttribute('aria-label', (rv.grade | 0) + ' out of 5');
      card.appendChild(st);

      var q = document.createElement('p');
      q.className = 'rv-quote';
      q.textContent = rv.comment;
      card.appendChild(q);

      var who = document.createElement('div');
      who.className = 'rv-who';
      var name = document.createElement('strong');
      name.textContent = rv.reviewerName || 'Member';
      who.appendChild(name);
      if (rv.sessionName) {
        var sess = document.createElement('span');
        sess.className = 'rv-sess';
        sess.textContent = rv.sessionName;
        who.appendChild(sess);
      }
      card.appendChild(who);
      el.appendChild(card);
    });
  }

  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var list = (data && data.payload) || [];
      var items = list.filter(function (x) {
        return x && x.comment && x.comment.trim().length > 8 && (x.grade | 0) >= 4;
      }).slice(0, count);
      if (!items.length) { el.parentNode.removeChild(el); return; }
      render(items);
      if (window.vfyReveal) window.vfyReveal(el);  // animate the just-injected cards
      wireArrows();
    })
    .catch(function () {
      // On any failure, remove the grid so the Google-reviews button stands alone.
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
})();
