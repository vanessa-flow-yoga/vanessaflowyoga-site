/* Vanessa Flow Yoga - blog pagination
 * Splits the post grid into pages of PER, with numbered prev/next controls.
 * Card cover images are stored in data-bg and only applied for the visible
 * page, so a page load fetches ~PER images instead of all of them.
 * No-JS: all cards show (CSS fallback), images set from data-bg on first paint
 * is skipped, so a data-bg fallback is written inline too (see blog.html).
 */
(function () {
  'use strict';
  var PER = 12;
  var grid = document.querySelector('.blog-masonry');
  var pager = document.getElementById('blogPager');
  if (!grid) return;
  var cards = [].slice.call(grid.querySelectorAll('.bpost'));

  function setBg(list) {
    list.forEach(function (c) {
      var s = c.querySelector('.bimg-bg');
      if (s && s.getAttribute('data-bg') && !s.style.backgroundImage) {
        s.style.backgroundImage = "url('" + s.getAttribute('data-bg') + "')";
      }
    });
  }

  // Few enough posts to skip paging: just load every image and hide the pager.
  if (!pager || cards.length <= PER) {
    setBg(cards);
    if (pager) pager.hidden = true;
    return;
  }

  var pages = Math.ceil(cards.length / PER);
  var cur = 1;

  function slice(p) {
    return cards.filter(function (_c, i) { return i >= (p - 1) * PER && i < p * PER; });
  }

  function mkBtn(label, page, opts) {
    opts = opts || {};
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pg-btn' + (opts.active ? ' is-active' : '') + (opts.nav ? ' pg-nav' : '');
    b.innerHTML = label;
    if (opts.disabled) { b.disabled = true; }
    else { b.addEventListener('click', function () { show(page, true); }); }
    if (opts.active) b.setAttribute('aria-current', 'page');
    if (opts.label) b.setAttribute('aria-label', opts.label);
    return b;
  }

  function render() {
    pager.innerHTML = '';
    pager.appendChild(mkBtn('&#8249;', cur - 1, { disabled: cur === 1, nav: true, label: 'Previous page' }));
    for (var i = 1; i <= pages; i++) {
      pager.appendChild(mkBtn(String(i), i, { active: i === cur }));
    }
    pager.appendChild(mkBtn('&#8250;', cur + 1, { disabled: cur === pages, nav: true, label: 'Next page' }));
  }

  function show(p, doScroll) {
    cur = p;
    cards.forEach(function (c, i) {
      c.style.display = (i >= (p - 1) * PER && i < p * PER) ? '' : 'none';
    });
    setBg(slice(p));
    render();
    if (doScroll) {
      var top = grid.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  show(1, false);
})();
