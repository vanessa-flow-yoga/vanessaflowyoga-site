/* Vanessa Flow Yoga - cookie consent
 * schema_version: 1.0
 * Blocks all non-essential cookies until the visitor chooses.
 * Categories: necessary (always on), functional, analytics, marketing.
 *
 * To wire up the Meta Pixel later: set META_PIXEL_ID below. Nothing loads
 * until a visitor accepts "marketing".
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vfy-cookie-consent';
  var SCHEMA_VERSION = '1.0';

  /* ----- third-party config (edit here) ----- */
  var META_PIXEL_ID = '656441771645242'; // Meta Pixel (marketing)
  var GA4_ID        = 'G-YW7F61L016';    // Google Analytics 4 (analytics)
  var GOOGLE_ADS_ID = 'AW-16566090144';  // Google Ads (marketing)

  // Momence webchat (functional). Loaded only after functional consent.
  var MOMENCE_WEBCHAT = {
    hostId: '13063',
    token: '3AXePpg8PE',
    position: 'bottom-right',
    src: 'https://momence.com/plugin/webchat/webchat.js'
  };
  /* ------------------------------------------- */

  var CATEGORIES = ['functional', 'analytics', 'marketing'];

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== SCHEMA_VERSION) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function saveConsent(choice) {
    var record = {
      v: SCHEMA_VERSION,
      necessary: true,
      functional: !!choice.functional,
      analytics: !!choice.analytics,
      marketing: !!choice.marketing
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    return record;
  }

  /* ----- loaders, run when a category is granted ----- */
  var loaded = { functional: false, analytics: false, marketing: false };

  /* ----- ready registry: pages register work to run once a category loads.
     Callbacks fire immediately if the category is already live, otherwise
     they queue and flush the moment consent is granted. Nothing runs for a
     category the visitor has not allowed. ----- */
  var ready = { functional: false, analytics: false, marketing: false };
  var readyQueue = { functional: [], analytics: [], marketing: [] };
  function markReady(cat) {
    ready[cat] = true;
    var q = readyQueue[cat]; readyQueue[cat] = [];
    q.forEach(function (cb) { try { cb(); } catch (e) {} });
  }
  window.vfyConsent = {
    has: function (cat) { return !!ready[cat]; },
    onReady: function (cat, cb) {
      if (typeof cb !== 'function') return;
      if (ready[cat]) { try { cb(); } catch (e) {} }
      else { (readyQueue[cat] || (readyQueue[cat] = [])).push(cb); }
    }
  };

  /* Load gtag.js once; both GA4 and Google Ads share it. */
  var gtagLoaded = false;
  function loadGtagBase() {
    if (gtagLoaded) return;
    gtagLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
  }

  /* Momence embeds (schedule / reviews). Functional, loaded only after
     functional consent. Mark a spot in the page like:
       <div data-momence="schedule" data-session-type="workshop"></div>
       <div data-momence="reviews" data-signature="..." data-layout="horizontal"></div>
     Put a .consent-placeholder inside for the pre-consent / fallback state. */
  var MOMENCE_HOST_ID = '13063';
  function loadMomenceEmbeds() {
    var slots = document.querySelectorAll('[data-momence]');
    slots.forEach(function (slot) {
      if (slot.getAttribute('data-momence-loaded')) return;
      slot.setAttribute('data-momence-loaded', '1');
      var kind = slot.getAttribute('data-momence');
      var ph = slot.querySelector('.consent-placeholder');
      if (ph) ph.remove();
      var script = document.createElement('script');
      script.async = true;
      script.type = 'module';
      script.setAttribute('host_id', MOMENCE_HOST_ID);

      if (kind === 'reviews') {
        var rDiv = document.createElement('div');
        rDiv.id = 'momence-plugin-reviews';
        slot.appendChild(rDiv);
        script.setAttribute('is_profile_picture_enabled', 'true');
        script.setAttribute('is_text_only_enabled', 'true');
        script.setAttribute('is_session_and_teacher_info_enabled', 'true');
        script.setAttribute('layout', slot.getAttribute('data-layout') || 'horizontal');
        script.setAttribute('signature', slot.getAttribute('data-signature') || '');
        script.src = 'https://momence.com/plugin/reviews/reviews.js';
      } else {
        // default: schedule (events = workshop, retreats = training, etc.)
        var sDiv = document.createElement('div');
        sDiv.id = 'ribbon-schedule';
        slot.appendChild(sDiv);
        script.setAttribute('teacher_ids', '[]');
        script.setAttribute('location_ids', '[]');
        script.setAttribute('tag_ids', '[]');
        script.setAttribute('session_type', slot.getAttribute('data-session-type') || 'workshop');
        script.setAttribute('default_filter', 'show-all');
        script.setAttribute('locale', 'en');
        script.setAttribute('lock_timezone', 'Europe/London');
        script.src = 'https://momence.com/plugin/host-schedule/host-schedule.js';
      }
      slot.appendChild(script);
    });
  }

  function applyConsent(c) {
    if (c.functional && !loaded.functional) {
      loaded.functional = true;
      // Google Maps and any other consent-gated iframes
      var frames = document.querySelectorAll('iframe[data-consent-src]');
      frames.forEach(function (f) {
        f.setAttribute('src', f.getAttribute('data-consent-src'));
        var ph = f.parentNode && f.parentNode.querySelector('.consent-placeholder');
        if (ph) ph.remove();
      });
      // Momence webchat
      if (MOMENCE_WEBCHAT.src && !document.getElementById('momence-webchat')) {
        var s = document.createElement('script');
        s.id = 'momence-webchat';
        s.async = true;
        s.type = 'module';
        s.setAttribute('host-id', MOMENCE_WEBCHAT.hostId);
        s.setAttribute('token', MOMENCE_WEBCHAT.token);
        s.setAttribute('position', MOMENCE_WEBCHAT.position);
        s.src = MOMENCE_WEBCHAT.src;
        document.body.appendChild(s);
      }
      // Momence schedule / reviews embeds
      loadMomenceEmbeds();
      markReady('functional');
    }

    if (c.analytics && !loaded.analytics) {
      loaded.analytics = true;
      // Google Analytics 4
      if (GA4_ID) {
        loadGtagBase();
        window.gtag('config', GA4_ID);
      }
      markReady('analytics');
    }

    if (c.marketing && !loaded.marketing) {
      loaded.marketing = true;
      // Meta Pixel
      if (META_PIXEL_ID) initMetaPixel(META_PIXEL_ID);
      // Google Ads (shares gtag.js with GA4)
      if (GOOGLE_ADS_ID) {
        loadGtagBase();
        window.gtag('config', GOOGLE_ADS_ID);
      }
      markReady('marketing');
    }
  }

  function initMetaPixel(id) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
    /* eslint-enable */
  }

  /* ----- UI ----- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildBanner() {
    var b = el('div', 'cookie-banner', ''
      + '<div class="cookie-banner-inner">'
      + '  <div class="cookie-banner-text">'
      + '    <strong>We use cookies</strong>'
      + '    <p>We use essential cookies to run the site, and, with your say-so, cookies for maps, chat, and measuring our ads. See our <a href="cookies.html">Cookie Policy</a>.</p>'
      + '  </div>'
      + '  <div class="cookie-banner-actions">'
      + '    <button type="button" class="btn btn-ghost" data-cc="prefs">Choose</button>'
      + '    <button type="button" class="btn btn-ghost" data-cc="reject">Reject non-essential</button>'
      + '    <button type="button" class="btn" data-cc="accept">Accept all</button>'
      + '  </div>'
      + '</div>');
    return b;
  }

  function buildModal(current) {
    var c = current || { functional: false, analytics: false, marketing: false };
    function row(key, title, desc, checked) {
      return ''
        + '<label class="cookie-row">'
        + '  <span class="cookie-row-text"><strong>' + title + '</strong><span>' + desc + '</span></span>'
        + '  <input type="checkbox" data-cat="' + key + '"' + (checked ? ' checked' : '') + '>'
        + '</label>';
    }
    var m = el('div', 'cookie-modal', ''
      + '<div class="cookie-modal-card" role="dialog" aria-modal="true" aria-label="Cookie settings">'
      + '  <h2>Cookie settings</h2>'
      + '  <p>Choose which cookies to allow. Essential cookies keep the site working and are always on.</p>'
      + '  <div class="cookie-rows">'
      + '    <label class="cookie-row cookie-row-locked">'
      + '      <span class="cookie-row-text"><strong>Essential</strong><span>Needed for the site to work and to remember this choice. Always on.</span></span>'
      + '      <input type="checkbox" checked disabled>'
      + '    </label>'
      +      row('functional', 'Functional', 'Maps and the webchat window.', c.functional)
      +      row('analytics', 'Analytics', 'Helps us understand how the site is used.', c.analytics)
      +      row('marketing', 'Marketing', 'Meta Pixel, to measure and target our ads.', c.marketing)
      + '  </div>'
      + '  <div class="cookie-modal-actions">'
      + '    <button type="button" class="btn btn-ghost" data-cc="reject">Reject non-essential</button>'
      + '    <button type="button" class="btn" data-cc="save">Save choices</button>'
      + '  </div>'
      + '</div>');
    return m;
  }

  var bannerEl = null;
  var modalEl = null;

  function removeBanner() { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }
  function removeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }

  function showBanner() {
    if (bannerEl) return;
    bannerEl = buildBanner();
    document.body.appendChild(bannerEl);
    bannerEl.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-cc');
      if (!act) return;
      if (act === 'accept') finish({ functional: true, analytics: true, marketing: true });
      else if (act === 'reject') finish({ functional: false, analytics: false, marketing: false });
      else if (act === 'prefs') openModal();
    });
  }

  function openModal() {
    removeModal();
    var current = readConsent() || {};
    modalEl = buildModal(current);
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-cc');
      if (e.target === modalEl) { removeModal(); return; } // click backdrop
      if (!act) return;
      if (act === 'save') {
        var choice = {};
        CATEGORIES.forEach(function (cat) {
          var box = modalEl.querySelector('input[data-cat="' + cat + '"]');
          choice[cat] = box && box.checked;
        });
        finish(choice);
      } else if (act === 'reject') {
        finish({ functional: false, analytics: false, marketing: false });
      }
    });
  }

  function finish(choice) {
    var record = saveConsent(choice);
    applyConsent(record);
    removeBanner();
    removeModal();
    showFab();
  }

  // Persistent floating button to reopen settings any time (like Cookiebot)
  var fabEl = null;
  function showFab() {
    if (fabEl) return;
    fabEl = el('button', 'cookie-fab', ''
      + '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 1 1 0 0 0-1-1 2.5 2.5 0 0 1-2.5-2.5 1 1 0 0 0-1-1A2.5 2.5 0 0 1 14 4a1 1 0 0 0-1-1 1 1 0 0 1-1-1zm-3.5 7A1.5 1.5 0 1 1 7 10.5 1.5 1.5 0 0 1 8.5 9zm6 3A1.5 1.5 0 1 1 13 13.5 1.5 1.5 0 0 1 14.5 12zm-5 3A1.25 1.25 0 1 1 8.25 16.25 1.25 1.25 0 0 1 9.5 15z"/></svg>');
    fabEl.setAttribute('type', 'button');
    fabEl.setAttribute('aria-label', 'Cookie settings');
    fabEl.setAttribute('title', 'Cookie settings');
    fabEl.addEventListener('click', function () { openModal(); });
    document.body.appendChild(fabEl);
  }

  // Public: reopen settings from footer / cookie policy
  window.vfyOpenCookieSettings = function () { openModal(); };

  /* ----- boot ----- */
  function init() {
    var existing = readConsent();
    if (existing) {
      applyConsent(existing); // honour prior choice, load what was allowed
      showFab();              // persistent way to change your mind
    } else {
      showBanner(); // nothing non-essential loads until a choice is made
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
