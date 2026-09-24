/* Vanessa's retreat page: general story by default; one published retreat can
 * take over the page between its go-live and end dates without another build.
 */
(function () {
  'use strict';
  var main = document.getElementById('retreatMain');
  var interest = document.getElementById('retreat-interest');
  if (!main || !interest) return;

  function getJson(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('Retreat content unavailable');
      return response.json();
    });
  }
  function element(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function add(parent) {
    Array.prototype.slice.call(arguments, 1).forEach(function (child) { parent.appendChild(child); });
    return parent;
  }
  function dateToday() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }
  function safeImage(path) { return /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(path); }
  function validRetreat(item) {
    return item.schema_version === '1.0' && typeof item.title === 'string' && item.title.length <= 58 &&
      ['go_live', 'end_date'].every(function (key) { return /^\d{4}-\d{2}-\d{2}$/.test(item[key]); }) &&
      (!item.hide_after || /^\d{4}-\d{2}-\d{2}$/.test(item.hide_after)) &&
      item.go_live <= item.end_date && safeImage(item.hero_image) &&
      /^https:\/\//.test(item.booking_url) && Array.isArray(item.experiences) &&
      Array.isArray(item.inclusions) && item.experiences.length >= 3 && item.inclusions.length >= 3;
  }
  function bookingButton(item) {
    var button = element('a', 'btn', item.booking_cta + ' →');
    button.href = item.booking_url;
    button.target = '_blank';
    button.rel = 'noopener';
    return button;
  }
  function livePage(item, general) {
    var fragment = document.createDocumentFragment();
    var hero = element('header', 'r-hero');
    var heroGrid = element('div', 'r-wrap r-hero-grid');
    var heroText = element('div');
    add(heroText,
      element('span', 'r-eyebrow', item.eyebrow),
      element('h1', '', item.title),
      element('p', '', item.subtitle),
      bookingButton(item));
    var photo = element('img', 'r-photo');
    photo.src = item.hero_image;
    photo.alt = item.hero_alt;
    add(heroGrid, heroText, photo);
    var details = element('div', 'r-wrap r-live-details');
    [['Where', item.location], ['When', item.date_label], ['Investment', item.price_label]].forEach(function (pair) {
      add(details, add(element('div'), element('strong', '', pair[0]), element('span', '', pair[1])));
    });
    add(hero, heroGrid, details);
    fragment.appendChild(hero);

    var story = element('section', 'r-section');
    var storyGrid = element('div', 'r-wrap r-story-grid');
    var storyText = element('div');
    add(storyText, element('span', 'eyebrow', 'The experience'),
      element('h2', '', item.overview_heading), element('p', '', item.overview));
    var orb = element('div', 'r-orb', 'Your time. Your pace. Your retreat.');
    add(storyGrid, storyText, orb);
    story.appendChild(storyGrid);
    fragment.appendChild(story);

    var experience = element('section', 'r-section r-past');
    var experienceWrap = element('div', 'r-wrap');
    add(experienceWrap, element('span', 'eyebrow', 'What awaits'), element('h2', '', "Make every day your own."));
    var experienceList = element('ul', 'r-live-list');
    item.experiences.forEach(function (text) { experienceList.appendChild(element('li', '', text)); });
    experienceWrap.appendChild(experienceList);
    experience.appendChild(experienceWrap);
    fragment.appendChild(experience);

    var included = element('section', 'r-section');
    var includedWrap = element('div', 'r-wrap');
    add(includedWrap, element('span', 'eyebrow', 'The details'), element('h2', '', "What's included"));
    var includedList = element('ul', 'r-live-list');
    item.inclusions.forEach(function (text) { includedList.appendChild(element('li', '', text)); });
    add(includedWrap, includedList, bookingButton(item));
    included.appendChild(includedWrap);
    fragment.appendChild(included);

    var quoteSection = element('section', 'r-section r-past');
    var quoteWrap = element('div', 'r-wrap');
    var quote = element('blockquote', 'r-quote', '“' + general.quote.replace(/^[“\"]|[”\"]$/g, '') + '”');
    quote.appendChild(element('cite', '', 'Past retreat guest'));
    quoteWrap.appendChild(quote);
    quoteSection.appendChild(quoteWrap);
    fragment.appendChild(quoteSection);
    return fragment;
  }

  Promise.all([getJson('/content/retreats-general.json'), getJson('/content/retreat-list.json')])
    .then(function (results) {
      var general = results[0];
      var list = results[1];
      if (general.schema_version !== '1.0' || list.schema_version !== '1.0' || !Array.isArray(list.retreats)) {
        throw new Error('Unknown retreat content format');
      }
      document.querySelectorAll('[data-retreat-copy]').forEach(function (node) {
        var value = general[node.dataset.retreatCopy];
        if (typeof value === 'string') node.textContent = value;
      });
      var image = document.querySelector('[data-retreat-image]');
      if (image && safeImage(general.hero_image)) {
        image.src = general.hero_image;
        image.alt = general.hero_alt;
      }
      var today = dateToday();
      var active = list.retreats.filter(function (item) {
        return item.published === true && item.sold_out !== true && validRetreat(item) &&
          item.go_live <= today && today <= item.end_date && (!item.hide_after || today <= item.hide_after);
      });
      if (active.length > 1) throw new Error('More than one retreat is live');
      if (active.length === 1) {
        main.replaceChildren(livePage(active[0], general));
        interest.hidden = true;
        document.title = active[0].title + ' · Vanessa Flow Yoga retreat';
        var description = document.querySelector('meta[name="description"]');
        if (description) description.content = active[0].subtitle;
      }
    })
    .catch(function (error) { console.warn('Keeping the general retreats page:', error); });
})();
