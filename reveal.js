/* Vanessa Flow Yoga - premium reveal-on-scroll
 * Fades/blurs/scales sections and their contents in as they enter the viewport,
 * with a gentle stagger. Every section stays lively: sections with recognised
 * cards cascade those cards; sections without cascade their own content blocks
 * (so nothing is a flat single fade). Dynamically-injected content (live reviews,
 * events) can be animated too via window.vfyReveal(container).
 *
 * Progressive enhancement: only runs when <html> has .has-reveal, which a tiny
 * head snippet sets ONLY when IntersectionObserver is supported and the visitor
 * hasn't asked for reduced motion. No JS / reduced motion => everything visible.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('has-reveal')) return;

  var ITEMS = [
    '.band-head', '.section-header', '.tt-head', '.tt-legend', '.tt-pills',
    '.cc', '.lx-tile', '.bpost', '.faq-card', '.day', '.step',
    '.split-text', '.split-media', '.welcome-text', '.welcome-photo',
    '.polaroid', '.price', '.plan', '.pass-card', '.price-card',
    '.value', '.benefit', '.tt-day', '.ev-card', '.heat-card', '.rv-card', '.belief-card'
  ].join(',');

  function vh() { return window.innerHeight || root.clientHeight; }

  function reveal(el) { el.classList.add('is-in'); }

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }) : null;

  function activate(el) {
    if (el._rvl) return;
    el._rvl = true;
    el.classList.add('rvl');
    if (el.classList.contains('split-media') || el.classList.contains('welcome-photo')) {
      el.classList.add('rvl-l');
    } else if (el.classList.contains('split-text') || el.classList.contains('welcome-text')) {
      el.classList.add('rvl-r');
    }
    var r = el.getBoundingClientRect();
    if (!io || r.top < vh() * 0.9) reveal(el);
    else io.observe(el);
  }

  // Build the list of elements to reveal within a scope.
  function collect(scope) {
    var out = [];
    [].push.apply(out, scope.querySelectorAll(ITEMS));
    // Sections with no recognised card cascade their own content blocks instead
    // of fading as one flat block (keeps every section lively).
    [].forEach.call(scope.querySelectorAll('section'), function (sec) {
      if (sec.classList.contains('reviews')) return; // handled by the bespoke quote cascade
      if (sec.classList.contains('trust-bar')) return; // self-scrolling slider; reveal clashes with it
      if (sec.matches(ITEMS) || sec.querySelector(ITEMS)) return;
      var host = sec.querySelector('.wrap') || sec;
      var kids = [].filter.call(host.children, function (n) {
        return n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true';
      });
      if (kids.length) { [].push.apply(out, kids); } else { out.push(sec); }
    });
    return out;
  }

  // Scan a scope, tag + stagger + observe any not-yet-activated elements.
  // Exposed as window.vfyReveal so JS-injected content (reviews, events) animates too.
  function scan(scope) {
    scope = scope || document;
    var list = collect(scope).filter(function (el) { return !el._rvl; });
    if (!list.length) return;
    list.forEach(function (el) { el._pend = true; });
    list.forEach(function (el) {
      var idx = 0, p = el.previousElementSibling;
      while (p) {
        if (p._pend || (p.classList && p.classList.contains('rvl'))) idx++;
        p = p.previousElementSibling;
      }
      if (idx > 0) el.style.setProperty('--rvl-d', Math.min(idx, 8) * 130 + 'ms');
    });
    list.forEach(function (el) { el._pend = false; activate(el); });
  }

  window.vfyReveal = scan;
  scan(document);

  // Bespoke "writes itself in" word cascade for the first static review quote.
  (function () {
    var bq = document.querySelector('section.reviews .review blockquote');
    if (!bq) return;
    var marks = bq.querySelectorAll('.mark');
    var om = marks[0] ? marks[0].outerHTML : '';
    var cm = marks[1] ? marks[1].outerHTML : '';
    var text = bq.textContent.replace(/[“”"]/g, '').trim();
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    bq.innerHTML = om + ' ' + words.map(function (w, i) {
      return '<span class="q-word" style="--qd:' + (i * 55) + 'ms">' + w + '</span>';
    }).join(' ') + ' ' + cm;
    bq.classList.add('q-ready');

    function show() { bq.classList.add('q-in'); }
    if (io) {
      var qo = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { show(); qo.disconnect(); } });
      }, { rootMargin: '0px 0px -12% 0px' });
      qo.observe(bq);
      if (bq.getBoundingClientRect().top < vh() * 0.9) { show(); qo.disconnect(); }
    } else {
      show();
    }
  })();
})();
