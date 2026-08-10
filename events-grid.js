/* Vanessa Flow Yoga - live events grid
 * Pulls upcoming special events/workshops from the Momence host-schedule API and
 * renders our own brand-styled cards (the weekly class timetable lives elsewhere).
 * Read-only data fetch (no cookies set), so it runs without cookie consent.
 * All host-entered text is rendered with textContent (never innerHTML); image and
 * link URLs are scheme-checked against Momence before use.
 */
(function () {
  'use strict';
  var el = document.getElementById('eventsGrid');
  if (!el) return;

  var host = el.getAttribute('data-host') || '13063';
  var count = parseInt(el.getAttribute('data-count') || '9', 10);

  // Upcoming window: from now, generous page size (we filter + sort client-side).
  var from = new Date().toISOString();
  var url = 'https://api.momence.com/host-plugins/host/' + host +
    '/host-schedule/sessions?startsAfter=' + encodeURIComponent(from) + '&pageSize=200';

  function safeUrl(u, prefix) {
    return (typeof u === 'string' && u.indexOf(prefix) === 0) ? u : '';
  }

  function fmtDay(d) {
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short'
    });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true
    }).replace(/\s/g, '').toLowerCase();
  }

  function monthKey(d) {
    var p = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit'
    }).formatToParts(d);
    var y = '', m = '';
    p.forEach(function (x) { if (x.type === 'year') y = x.value; if (x.type === 'month') m = x.value; });
    return y + '-' + m;
  }
  function monthLabel(d) {
    return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', month: 'long' });
  }

  // Month filter pills, built from the months actually present (chronological).
  function buildFilter(events) {
    var seen = {}, months = [];
    events.forEach(function (x) {
      var d = new Date(x.startsAt), k = monthKey(d);
      if (!seen[k]) { seen[k] = true; months.push({ key: k, label: monthLabel(d) }); }
    });
    if (months.length < 2) return; // single month: a filter adds nothing

    var bar = document.createElement('div');
    bar.className = 'ev-filter';

    function pill(label, key, active) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ev-pill' + (active ? ' is-active' : '');
      b.textContent = label;
      b.setAttribute('data-month', key);
      b.addEventListener('click', function () {
        var pills = bar.querySelectorAll('.ev-pill');
        for (var i = 0; i < pills.length; i++) pills[i].classList.remove('is-active');
        b.classList.add('is-active');
        var cards = el.querySelectorAll('.ev-card');
        for (var j = 0; j < cards.length; j++) {
          cards[j].style.display = (key === 'all' || cards[j].getAttribute('data-month') === key) ? '' : 'none';
        }
      });
      return b;
    }

    bar.appendChild(pill('All', 'all', true));
    months.forEach(function (m) { bar.appendChild(pill(m.label, m.key, false)); });
    el.parentNode.insertBefore(bar, el);
  }

  function priceLabel(x) {
    if (x.freeEvent || x.fixedTicketPrice === 0) return 'Free';
    if (typeof x.fixedTicketPrice === 'number') return '£' + x.fixedTicketPrice;
    if (typeof x.dynamicTicketPriceMin === 'number') return 'From £' + x.dynamicTicketPriceMin;
    return '';
  }

  function soldOut(x) {
    return x.remainingSpots && typeof x.remainingSpots.remaining === 'number' &&
      x.remainingSpots.remaining <= 0;
  }

  function card(x) {
    var d = new Date(x.startsAt);
    var link = safeUrl(x.link, 'https://momence.com/');
    var img = safeUrl(x.image, 'https://images.momence.com/');
    var out = soldOut(x);

    var a = document.createElement(link ? 'a' : 'div');
    a.className = 'ev-card';
    a.setAttribute('data-month', monthKey(d));
    if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; }

    // media
    var media = document.createElement('div');
    media.className = 'ev-media';
    if (img) {
      var im = document.createElement('img');
      im.src = img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      media.appendChild(im);
    }
    var price = priceLabel(x);
    if (price) {
      var pp = document.createElement('span');
      pp.className = 'ev-price' + (price === 'Free' ? ' is-free' : '');
      pp.textContent = price;
      media.appendChild(pp);
    }
    if (out) {
      var so = document.createElement('span');
      so.className = 'ev-soldout';
      so.textContent = 'Fully booked';
      media.appendChild(so);
    }
    a.appendChild(media);

    // body
    var body = document.createElement('div');
    body.className = 'ev-body';

    var date = document.createElement('div');
    date.className = 'ev-date';
    var day = document.createElement('span'); day.className = 'ev-day'; day.textContent = fmtDay(d);
    var time = document.createElement('span'); time.className = 'ev-time'; time.textContent = fmtTime(d);
    date.appendChild(day); date.appendChild(time);
    body.appendChild(date);

    var h = document.createElement('h3');
    h.className = 'ev-name';
    h.textContent = (x.sessionName || 'Event').trim();
    body.appendChild(h);

    var meta = document.createElement('div');
    meta.className = 'ev-meta';
    var bits = [];
    if (x.teacher) bits.push(x.teacher);
    if (x.durationMinutes) bits.push(x.durationMinutes + ' min');
    if (x.location && x.inPerson) bits.push(x.location);
    meta.textContent = bits.join('  ·  ');
    body.appendChild(meta);

    if (x.requireMembershipBooking) {
      var tag = document.createElement('span');
      tag.className = 'ev-tag';
      tag.textContent = 'Members only';
      body.appendChild(tag);
    }

    var cta = document.createElement('span');
    cta.className = 'ev-cta';
    cta.textContent = out ? 'Join waitlist' : 'Book now';
    body.appendChild(cta);

    a.appendChild(body);
    return a;
  }

  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var list = (data && data.payload) || [];
      var events = list
        .filter(function (x) { return x && x.type === 'special-event-new' && !x.isCancelled; })
        .sort(function (a, b) { return new Date(a.startsAt) - new Date(b.startsAt); })
        .slice(0, count);
      if (!events.length) {
        el.className = 'ev-grid ev-empty';
        el.textContent = 'No events on the calendar right now. Check back soon, or follow us on Instagram for the latest.';
        return;
      }
      el.textContent = '';
      events.forEach(function (x) { el.appendChild(card(x)); });
      buildFilter(events);
      if (window.vfyReveal) window.vfyReveal(el);  // animate the just-injected cards
    })
    .catch(function () {
      el.className = 'ev-grid ev-empty';
      el.textContent = 'Our events calendar is loading elsewhere. See everything on Momence.';
    });
})();
