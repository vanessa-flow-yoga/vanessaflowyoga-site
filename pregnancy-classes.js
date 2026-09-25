/* Vanessa Flow Yoga - pregnancy course blocks and drop-ins
 * Uses the same public Momence host-schedule data as the supplied semester/class
 * widgets, but renders it ourselves because the widget previously mounted blank.
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
  var blocksEl = document.getElementById('pregnancyBlocks');
  var dropinsEl = document.getElementById('pregnancyClasses');
  var pillsEl = document.getElementById('pregnancyDatePills');
  if (!blocksEl || !dropinsEl) return;

  var host = blocksEl.getAttribute('data-host') || '13063';
  var teacher = blocksEl.getAttribute('data-teacher') || '9368';
  var count = parseInt(blocksEl.getAttribute('data-count') || '12', 10);
  var bookAll = blocksEl.getAttribute('data-book-all') || 'https://momence.com/u/vanessa-flow-yoga';

  // Keep a course visible after its first class if Momence still offers places.
  var now = new Date();
  var from = new Date(now.getTime() - 31 * 86400000).toISOString();
  var url = 'https://api.momence.com/host-plugins/host/' + host +
    '/host-schedule/sessions?teacherIds[]=' + encodeURIComponent(teacher) +
    '&startsAfter=' + encodeURIComponent(from) + '&pageSize=100';

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

  function fmtShort(d) {
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  function blockStart(x) {
    return new Date((x.semester && x.semester.firstSessionStartsAt) || x.startsAt);
  }

  function blockEnd(x) {
    return new Date((x.semester && x.semester.lastSessionEndsAt) || x.endsAt);
  }

  function blockRange(x) {
    return fmtShort(blockStart(x)) + ' – ' + fmtShort(blockEnd(x));
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

  function row(x, isBlock) {
    var d = isBlock ? blockStart(x) : new Date(x.startsAt);
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
    dd.textContent = isBlock ? blockRange(x) : fmtDate(d);
    var tt = document.createElement('span');
    tt.className = 'pc-time';
    var bits = isBlock ? ['Full course', 'Sundays ' + fmtTime(d)] : [fmtTime(d)];
    if (!isBlock && x.durationMinutes) bits.push(x.durationMinutes + ' min');
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
    cta.textContent = full ? (x.allowWaitlist ? 'Join waitlist' : 'Fully booked') : isBlock ? 'Book block' : 'Book';
    if (full) cta.classList.add('is-full');
    right.appendChild(cta);

    a.appendChild(right);
    return a;
  }

  /* The hero promotes whole-course bookings, never an individual date. */
  var HERO_PILLS = 3;
  function renderPills(blocks) {
    if (!pillsEl || !blocks.length) return;
    pillsEl.textContent = '';

    var label = document.createElement('span');
    label.className = 'hd-label';
    label.textContent = 'Next full blocks';
    pillsEl.appendChild(label);

    blocks.slice(0, HERO_PILLS).forEach(function (x) {
      var link = safeUrl(x.link, 'https://momence.com/');
      var left = spotsLeft(x);
      var full = left !== null && left <= 0;

      var a = document.createElement(link ? 'a' : 'span');
      a.className = 'hd-pill' + (full ? ' is-full' : '');
      if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; }
      var when = document.createElement('span');
      when.className = 'hd-when';
      when.textContent = blockRange(x);
      a.appendChild(when);

      // The pills are the hero's only call to action now, so each carries its
      // own visible book affordance rather than relying on the pill being a link.
      var act = document.createElement('span');
      act.className = 'hd-act' + (full ? ' is-full' : '');
      act.textContent = full ? (x.allowWaitlist ? 'Waitlist' : 'Full') : 'Book block';
      a.appendChild(act);

      pillsEl.appendChild(a);
    });

    if (blocks.length > HERO_PILLS) {
      var more = document.createElement('a');
      more.className = 'hd-more';
      more.href = '#dates';
      more.textContent = '+' + (blocks.length - HERO_PILLS) + ' more blocks';
      pillsEl.appendChild(more);
    }

    pillsEl.hidden = false;
  }

  function fallback(el, msg) {
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

  function renderList(el, sessions, isBlock) {
    el.textContent = '';
    if (!sessions.length) {
      fallback(el, isBlock ? 'The next pregnancy yoga block is not on the calendar yet. Please check back soon.' : 'There are no individual drop-in dates available just now. Please check back soon.');
      return;
    }
    var head = document.createElement('p');
    head.className = 'pc-head';
    head.textContent = isBlock ? 'Reserve the full course · Clitheroe studio' : 'Choose one Sunday · Clitheroe studio';
    el.appendChild(head);
    sessions.slice(0, isBlock ? count : 4).forEach(function (x) { el.appendChild(row(x, isBlock)); });
    if (window.vfyReveal) window.vfyReveal(el);
  }

  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var list = (data && data.payload) || [];
      var sessions = list
        .filter(function (x) { return x && !x.isCancelled && x.teacherId === Number(teacher) && x.locationId === 9097; })
        .sort(function (a, b) { return new Date(a.startsAt) - new Date(b.startsAt); })
      var blocks = sessions.filter(function (x) { return x.type === 'semester' && blockEnd(x) >= now; });
      var dropins = sessions.filter(function (x) { return x.type === 'fitness' && new Date(x.startsAt) >= now; });
      renderList(blocksEl, blocks, true);
      renderList(dropinsEl, dropins, false);
      renderPills(blocks);
    })
    .catch(function () {
      fallback(blocksEl, 'Our course calendar is loading elsewhere right now.');
      fallback(dropinsEl, 'Our drop-in calendar is loading elsewhere right now.');
    });
})();
