/* Vanessa Flow Yoga - parallax image drift
 * Certain images drift slower than the page as you scroll (a parallax reveal).
 * Mobile-safe: uses a transform on the image, not background-attachment:fixed
 * (which breaks on iOS). Honours prefers-reduced-motion (image stays still).
 *
 * Opt in with data-parallax="<depth-px>" on a container that has overflow:hidden
 * and holds an oversized image (or a .px-media wrapper). Example: .wp-frame, .px-band.
 */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var bands = [].slice.call(document.querySelectorAll('[data-parallax]')).filter(function (b) {
    b._pxMedia = b.querySelector('.px-media') || b.querySelector('img');
    b._pxDepth = parseFloat(b.getAttribute('data-parallax')) || 60;
    // Optional baseline scale: oversizes the media so the drift never reveals a
    // gap at the top/bottom edge of the frame. 1 = no scale (legacy behaviour).
    b._pxScale = parseFloat(b.getAttribute('data-px-scale')) || 1;
    return !!b._pxMedia;
  });
  if (!bands.length) return;

  var ticking = false;

  function apply() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var r = b.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue; // skip off-screen bands
      // 0 when the band centre is at the viewport centre; ranges roughly -1..1
      var progress = ((r.top + r.height / 2) - vh / 2) / vh;
      if (progress < -1) progress = -1; else if (progress > 1) progress = 1;
      var tf = 'translate3d(0,' + (progress * b._pxDepth).toFixed(1) + 'px,0)';
      if (b._pxScale !== 1) tf += ' scale(' + b._pxScale + ')';
      b._pxMedia.style.transform = tf;
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  apply();
})();
