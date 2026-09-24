/* Render the five editor-managed homepage cards. Expiry is checked in London
 * on every visit, so a dated promotion disappears even between site builds.
 */
(function () {
  'use strict';
  var grid = document.querySelector('#latest .lx-grid');
  if (!grid) return;
  var colours = {
    mint: ['var(--mint-ink)', '#fff'],
    purple: ['var(--purple-deep)', '#fff'],
    coral: ['var(--coral)', '#fff'],
    yellow: ['var(--yellow)', 'var(--ink)']
  };
  var today = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).filter(function (part) {
    return ['year', 'month', 'day'].indexOf(part.type) >= 0;
  }).map(function (part) { return [part.type, part.value]; }));
  var currentDate = today.year + '-' + today.month + '-' + today.day;

  function getJson(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('Content unavailable: ' + path);
      return response.json();
    });
  }

  function shorten(value, max) {
    var letters = Array.from(value);
    return letters.length <= max ? value : letters.slice(0, max - 1).join('').trimEnd() + '…';
  }
  function safeImage(image) {
    return /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(image);
  }

  function valid(tile) {
    return tile && colours[tile.colour] && ['big', 'standard'].indexOf(tile.size) >= 0 &&
      ['tag', 'headline', 'sub', 'body', 'cta', 'href', 'image'].every(function (field) {
        return typeof tile[field] === 'string' && tile[field].length > 0;
      }) &&
      (/^\/[A-Za-z0-9_\-/.?=&%]+$/.test(tile.href) || /^https:\/\//.test(tile.href)) &&
      safeImage(tile.image) &&
      (!tile.expires || /^\d{4}-\d{2}-\d{2}$/.test(tile.expires));
  }

  function span(className, text) {
    var el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  }

  function render(card, tile) {
    var palette = colours[tile.colour];
    card.classList.toggle('lx-big', tile.size === 'big');
    card.replaceChildren();
    var flipper = document.createElement('div');
    flipper.className = 'lx-flipper';
    var front = document.createElement('div');
    front.className = 'lx-face lx-front';
    var background = span('lx-bg', '');
    background.style.backgroundImage = 'url("' + tile.image + '")';
    var tag = span('lx-tag', tile.tag);
    tag.style.background = palette[0];
    tag.style.color = palette[1];
    var bar = span('lx-bar', tile.headline);
    bar.style.background = palette[0];
    bar.style.color = palette[1];
    bar.appendChild(span('lx-sub', tile.sub));
    front.append(background, tag, bar);
    var back = document.createElement('a');
    back.className = 'lx-face lx-back';
    back.href = tile.href;
    back.style.background = palette[0];
    back.style.color = palette[1];
    if (tile.href.startsWith('https://')) {
      back.target = '_blank';
      back.rel = 'noopener';
    }
    back.appendChild(span('lx-back-tag', tile.tag + ' · ' + tile.headline));
    var paragraph = document.createElement('p');
    paragraph.textContent = tile.body;
    back.appendChild(paragraph);
    back.appendChild(span('lx-back-cta', tile.cta + ' →'));
    flipper.append(front, back);
    card.appendChild(flipper);
  }

  Promise.all([getJson('/content/latest.json'), getJson('/content/latest-posts.json')])
    .then(function (results) {
      var content = results[0];
      var feed = results[1];
      var cards = grid.querySelectorAll('.lx-tile');
      if (content.schema_version !== '1.0' || feed.schema_version !== '1.0' ||
          !Array.isArray(content.tiles) || content.tiles.length !== 5 ||
          !Array.isArray(feed.posts) || cards.length !== 5 ||
          content.tiles.filter(function (tile) { return tile.size === 'big'; }).length !== 1 ||
          !content.tiles.every(valid)) throw new Error('Invalid latest cards');

      var used = new Set(content.tiles.filter(function (tile) {
        return !tile.expires || tile.expires >= currentDate;
      }).map(function (tile) { return tile.href; }));
      content.tiles.forEach(function (tile, index) {
        if (tile.expires && tile.expires < currentDate) {
          var post = feed.posts.find(function (entry) {
            return entry.published <= currentDate && !used.has(entry.href) &&
              safeImage(entry.image);
          });
          if (!post) throw new Error('No fallback blog post for expired card');
          used.add(post.href);
          tile = {
            size: tile.size, colour: tile.colour,
            tag: 'From the blog', headline: shorten(post.description, 44),
            sub: shorten('From the blog · ' + post.title, 70),
            body: shorten(post.description, 230), cta: 'Read the post',
            href: post.href, image: post.image
          };
        }
        render(cards[index], tile);
      });
    })
    .catch(function (error) {
      console.warn('Keeping the printed latest cards:', error);
    });
})();
