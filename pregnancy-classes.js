/* Vanessa Flow Yoga - upcoming pregnancy yoga classes
 * Pulls Katie's upcoming pregnancy sessions from the Momence host-schedule API
 * and renders our own brand-styled rows.
 *
 * Why not the Momence host-schedule embed? It was tried first (host_id 13063,
 * teacher_ids [9368], lite_mode). It loads, calls the API and mounts its React
 * layout, then renders nothing at all - verified in isolation with Momence's own
 * snippet at parse time, so it is the widget, not our consent loader. This does
 * the same job from the same data.
 *
 * Read-only data fetch (no cookies set), so it runs without cookie consent -
 * the dates show even for visitors who decline. Same approach as events-grid.js.
 * All host-entered text is rendered with textContent (never innerHTML); link
 * URLs are scheme-checked against Momence before use.
 */
(function () {
  'use strict';
  var el = document.getElementById('pregnancyClasses');
  if (!el) return;

  var host = el.getAttribute('data-host') || '13063';
  var teacher = el.getAttribute('data-teacher') || '9368';
  var count = parseInt(el.getAttribute('data-count') || '12', 10);
  var bookAll = el.getAttribute('data-book-all') || 'https://momence.com/u/vanessa-flow-yoga';

  var from = new Date().toISOString();
  var url = 'https://api.momence.com/host-plugins/host/' + host +
    '/host-schedule/sessions?teacherIds[]=' + encodeURIComponent(teacher) +
    '&startsAfter=' + encodeURIComponent(from) + '&pageSize=50';

  function safeUrl(u, prefix) {
    return (typeof u === 'string' && u.indexOf(prefix) === 0) ? u : '';
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long'
    });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true
    }).replace(/\s/g, '').toLowerCase();
  }

  // Momence session names carry decorative emoji ("PREGNANCY YOGA<diamond>").
  // Strip anything that is not a letter, number, space or basic punctuation, then
  // title-case it so it sits properly in our own type.
  function tidyName(s) {
    var t = String(s || 'Pregnancy Yoga').replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    return t.replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function priceLabel(x) {
    if (x.freeEvent || x.fixedTicketPrice === 0) return 'Free';
    if (typeof x.fixedTicketPrice === 'number') return '£' + x.fixedTicketPrice;
    if (typeof x.dynamicTicketPriceMin === 'number') return 'From £' + x.dynamicTicketPriceMin;
    return '';
  }

  function spotsLeft(x) {
    var r = x.remainingSpots;
    return (r && typeof r.remaining === 'number') ? r.remaining : null;
  }

  function row(x) {
    var d = new Date(x.startsAt);
    var link = safeUrl(x.link, 'https://momence.com/');
    var left = spotsLeft(x);
    var full = left !== null && left <= 0;

    var a = document.createElement(link ? 'a' : 'div');
    a.className = 'pc-row';
    if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; }

    var when = document.createElement('div');
    when.className = 'pc-when';
    var dd = document.createElement('span');
    dd.className = 'pc-date';
    dd.textContent = fmtDate(d);
    var tt = document.createElement('span');
    tt.className = 'pc-time';
    var bits = [fmtTime(d)];
    if (x.durationMinutes) bits.push(x.durationMinutes + ' min');
    if (x.teacher) bits.push(String(x.teacher));
    tt.textContent = bits.join('  ·  ');
    when.appendChild(dd);
    when.appendChild(tt);
    a.appendChild(when);

    var right = document.createElement('div');
    right.className = 'pc-right';

    var price = priceLabel(x);
    if (price) {
      var p = document.createElement('span');
      p.className = 'pc-price';
      p.textContent = price;
      right.appendChild(p);
    }

    if (left !== null && left > 0 && left <= 4) {
      var s = document.createElement('span');
      s.className = 'pc-spots';
      s.textContent = left === 1 ? '1 place left' : left + ' places left';
      right.appendChild(s);
    }

    var cta = document.createElement('span');
    cta.className = 'pc-cta';
    cta.textContent = full ? (x.allowWaitlist ? 'Join waitlist' : 'Fully booked') : 'Book';
    if (full) cta.classList.add('is-full');
    right.appendChild(cta);

    a.appendChild(right);
    return a;
  }

  function fallback(msg) {
    el.className = 'pc-list pc-empty';
    el.textContent = '';
    var p = document.createElement('p');
    p.textContent = msg;
    el.appendChild(p);
    var b = document.createElement('a');
    b.className = 'btn';
    b.href = bookAll;
    b.target = '_blank';
    b.rel = 'noopener';
    b.textContent = 'See the full timetable';
    el.appendChild(b);
  }

  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var list = (data && data.payload) || [];
      var sessions = list
        .filter(function (x) { return x && !x.isCancelled; })
        .sort(function (a, b) { return new Date(a.startsAt) - new Date(b.startsAt); })
        .slice(0, count);

      if (!sessions.length) {
        fallback('The next block of pregnancy classes is not on the calendar yet. Check the full timetable or get in touch and we will let you know as soon as dates are up.');
        return;
      }

      el.textContent = '';
      var name = tidyName(sessions[0].sessionName);
      var head = document.createElement('p');
      head.className = 'pc-head';
      head.textContent = name + '  ·  ' + (sessions[0].location || 'Clitheroe studio');
      el.appendChild(head);

      sessions.forEach(function (x) { el.appendChild(row(x)); });

      // No "see all dates" link here on purpose: it landed on the general
      // Momence page, which the owner found confusing (7 Sep). Each row books
      // its own session directly.

      if (window.vfyReveal) window.vfyReveal(el);
    })
    .catch(function () {
      fallback('Our booking calendar is loading elsewhere right now.');
    });
})();
