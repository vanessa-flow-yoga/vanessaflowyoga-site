// Post-build rendering for editor-managed content in the existing HTML pages.
// Source pages retain readable fallback markup; only _site/ is rewritten.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '_site');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const londonDate = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const replaceRegion = (html, start, end, replacement, file) => {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < 0 || b <= a || html.indexOf(start, a + 1) >= 0 || html.indexOf(end, b + 1) >= 0) {
    throw new Error(`Missing or duplicate ${start} / ${end} in ${file}`);
  }
  return html.slice(0, a + start.length) + '\n' + replacement + '\n' + html.slice(b);
};

const timetable = read('content/timetable.json');
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const styles = new Set(['flow', 'sweat', 'calm', 'found']);
if (timetable.schema_version !== '1.0' || !Array.isArray(timetable.days) || timetable.days.length !== 7) {
  throw new Error('Timetable must contain Monday to Sunday');
}
timetable.days.forEach((day, index) => {
  if (day.day !== dayNames[index] || !Array.isArray(day.classes) || day.classes.length > 12) {
    throw new Error(`Invalid timetable day at position ${index + 1}`);
  }
  let previous = '';
  day.classes.forEach((item) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ||
      typeof item.name !== 'string' || !item.name.trim() || item.name.length > 32 ||
      !styles.has(item.style) || item.time < previous) {
      throw new Error(`Invalid or unsorted class on ${day.day}`);
    }
    previous = item.time;
  });
});
const timetableHtml = '<div class="tt-grid">\n' + timetable.days.map((day, index) => {
  const classes = day.classes.map((item) =>
    `          <li class="cls-${item.style}"><div class="meta"><span class="time">${item.time}</span><span class="name">${escape(item.name)}</span></div></li>`
  ).join('\n');
  return `      <div class="day${index >= 5 ? ' weekend' : ''}">\n` +
    `        <div class="day-head"><h3>${day.day}</h3><span class="count">${day.classes.length}</span></div>\n` +
    `        <ul class="day-classes">\n${classes}\n        </ul>\n      </div>`;
}).join('\n') + '\n    </div>';

const latest = read('content/latest.json');
const blog = JSON.parse(fs.readFileSync(path.join(out, 'content/latest-posts.json'), 'utf8'));
const colours = {
  mint: ['var(--mint-ink)', '#fff'],
  purple: ['var(--purple-deep)', '#fff'],
  coral: ['var(--coral)', '#fff'],
  yellow: ['var(--yellow)', 'var(--ink)'],
};
const validHref = (href) => /^\/[A-Za-z0-9_\-/.?=&%]+$/.test(href) || /^https:\/\//.test(href);
const validImage = (image) => /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(image);
if (latest.schema_version !== '1.0' || !Array.isArray(latest.tiles) || latest.tiles.length !== 5 ||
  latest.tiles.filter((tile) => tile.size === 'big').length !== 1 ||
  blog.schema_version !== '1.0' || !Array.isArray(blog.posts)) {
  throw new Error('Latest cards must contain five cards, exactly one big');
}
latest.tiles.forEach((tile) => {
  if (!/^[a-z0-9-]+$/.test(tile.id) || !['big', 'standard'].includes(tile.size) ||
    !['event', 'news', 'class', 'post', 'offer'].includes(tile.kind) || !colours[tile.colour] ||
    !validHref(tile.href) || !validImage(tile.image) ||
    ![tile.tag, tile.headline, tile.sub, tile.body, tile.cta].every((v) => typeof v === 'string' && v.trim()) ||
    tile.tag.length > 24 || tile.headline.length > 44 || tile.sub.length > 70 ||
    tile.body.length > 230 || tile.cta.length > 36 ||
    (tile.expires && !/^\d{4}-\d{2}-\d{2}$/.test(tile.expires))) {
    throw new Error(`Invalid latest card: ${tile.id}`);
  }
});
const today = londonDate();
const used = new Set(latest.tiles.filter((tile) => !tile.expires || tile.expires >= today).map((tile) => tile.href));
const shorten = (text, limit) => text.length <= limit ? text : text.slice(0, limit - 1).trimEnd() + '…';
const displayed = latest.tiles.map((tile) => {
  if (!tile.expires || tile.expires >= today) return tile;
  const post = blog.posts.find((item) => item.published <= today && !used.has(item.href) && validImage(item.image));
  if (!post) throw new Error(`No fallback blog post for ${tile.id}`);
  used.add(post.href);
  console.log(`Latest card ${tile.id} expired; showing ${post.href}`);
  return {
    size: tile.size, colour: tile.colour, tag: 'From the blog',
    headline: shorten(post.description, 44), sub: shorten(`From the blog · ${post.title}`, 70),
    body: shorten(post.description, 230), cta: 'Read the post', href: post.href, image: post.image,
  };
});
const latestHtml = '<div class="lx-grid">\n' + displayed.map((tile) => {
  const [bg, fg] = colours[tile.colour];
  const external = tile.href.startsWith('https://') ? ' target="_blank" rel="noopener"' : '';
  return `      <div class="lx-tile${tile.size === 'big' ? ' lx-big' : ''} lx-flip" tabindex="0">\n` +
    '        <div class="lx-flipper">\n' +
    '          <div class="lx-face lx-front">\n' +
    `            <span class="lx-bg" style="background-image:url('${tile.image}')"></span>\n` +
    `            <span class="lx-tag" style="background:${bg};color:${fg}">${escape(tile.tag)}</span>\n` +
    `            <span class="lx-bar" style="background:${bg};color:${fg}">${escape(tile.headline)}<span class="lx-sub">${escape(tile.sub)}</span></span>\n` +
    '          </div>\n' +
    `          <a class="lx-face lx-back" href="${escape(tile.href)}"${external} style="background:${bg};color:${fg}">\n` +
    `            <span class="lx-back-tag">${escape(tile.tag)} · ${escape(tile.headline)}</span>\n` +
    `            <p>${escape(tile.body)}</p>\n` +
    `            <span class="lx-back-cta">${escape(tile.cta)} →</span>\n` +
    '          </a>\n        </div>\n      </div>';
}).join('\n') + '\n    </div>';

for (const file of ['index.html', 'classes.html', 'intro-pass.html']) {
  const target = path.join(out, file);
  let html = fs.readFileSync(target, 'utf8');
  html = replaceRegion(html, '<!-- TIMETABLE_START -->', '<!-- TIMETABLE_END -->', timetableHtml, file);
  if (file === 'index.html') {
    html = replaceRegion(html, '<!-- LATEST_START -->', '<!-- LATEST_END -->', latestHtml, file);
  }
  fs.writeFileSync(target, html);
}

// Membership prices are referenced across navigation, landing pages, SEO copy,
// checkout links and the thank-you conversion map. Update the built pages from
// one editor record, after requiring an explicit matching Momence confirmation.
const priceContent = read('content/prices.json');
const originalPlans = [
  { id: 'intro', product: '907474', amount: 35, url: 'https://momence.com/Vanessa-Flow-Yoga/membership/3-Week-Intro-Pass%3A-21-Days-for-%C2%A335!/907474' },
  { id: 'limited', product: '443979', amount: 52, url: 'https://momence.com/Vanessa-Flow-Yoga/membership/LIMITED-V-Flow-Membership%3A-%C2%A352pm/443979' },
  { id: 'unlimited', product: '27005', amount: 72, url: 'https://momence.com/Vanessa-Flow-Yoga/membership/UNLIMITED-V-Flow-Membership%3A-%C2%A372pm/27005' },
  { id: 'annual', product: '36635', amount: 780, url: 'https://momence.com/Vanessa-Flow-Yoga/membership/Annual-V-Flow-Membership%3A-%C2%A3780/36635' },
  { id: 'ten-pack', product: '24050', amount: 150, url: 'https://momence.com/Vanessa-Flow-Yoga/membership/10-Class-Pass%3A-%C2%A3150/24050' },
];
if (priceContent.schema_version !== '1.0' || !Array.isArray(priceContent.plans) ||
  priceContent.plans.length !== originalPlans.length) throw new Error('Invalid membership plan list');
const plans = originalPlans.map((original, index) => {
  const plan = priceContent.plans[index];
  if (plan.id !== original.id || !Number.isInteger(plan.amount) || plan.amount < 1 || plan.amount > 5000 ||
    plan.momence_confirmed_amount !== plan.amount || !/^\d+$/.test(plan.product_id) ||
    !plan.booking_url.startsWith('https://momence.com/') ||
    !plan.booking_url.endsWith('/' + plan.product_id)) {
    throw new Error(`Check the ${original.id} site price, Momence price confirmation and booking link`);
  }
  return { ...plan, baseAmount: original.amount, baseProduct: original.product, baseUrl: original.url };
});
function replaceVisiblePrices(value) {
  const amounts = new Map(plans.map((plan) => [String(plan.baseAmount), plan.amount]));
  return value.replace(/(£|&pound;)(35|52|72|780|150)(?!\d)/g,
    (_match, pound, amount) => pound + amounts.get(amount));
}
function replaceBookingLinks(value) {
  for (const plan of plans) value = value.replaceAll(plan.baseUrl, plan.booking_url);
  return value;
}
for (const file of fs.readdirSync(out).filter((name) => name.endsWith('.html'))) {
  const target = path.join(out, file);
  let html = fs.readFileSync(target, 'utf8');
  html = replaceVisiblePrices(html);
  html = replaceBookingLinks(html);
  if (file === 'index.html' || file === 'membership.html') {
    const perClass = (plans[1].amount / 4).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    html = html.replace('Just £13 per class', `Just £${perClass} per class`);
  }
  if (file === 'intro-pass.html') {
    html = html.replace(/("price"\s*:\s*")35\.00("\s*,?)/, `$1${plans[0].amount.toFixed(2)}$2`);
  }
  if (file === 'thankyou.html') {
    for (const plan of plans) {
      const expression = new RegExp(`'${plan.baseProduct}'\\s*:\\s*${plan.baseAmount}(?!\\d)`);
      if (!expression.test(html)) throw new Error(`Missing conversion mapping for ${plan.id}`);
      html = html.replace(expression, `'${plan.product_id}': ${plan.amount}`);
    }
  }
  fs.writeFileSync(target, html);
}
for (const file of fs.readdirSync(path.join(out, 'post')).filter((name) => name.endsWith('.html'))) {
  const target = path.join(out, 'post', file);
  let html = fs.readFileSync(target, 'utf8');
  html = html.replace(/(<a class="nav-cta"[^>]*>Intro Pass · )£35/, `$1£${plans[0].amount}`)
    .replace(/(<span class="cta-stamp"[^>]*>)&pound;35/, `$1&pound;${plans[0].amount}`);
  fs.writeFileSync(target, html);
}
const latestTarget = path.join(out, 'content', 'latest.json');
const latestOutput = fs.readFileSync(latestTarget, 'utf8');
fs.writeFileSync(latestTarget, replaceVisiblePrices(latestOutput));

// The blog editor already creates post pages. Rebuild the blog index and
// sitemap too, so a new post appears in the site without hand-editing HTML.
const categories = read('_data/blogCategories.json');
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const blogCards = blog.posts.map((post, index) => {
  const colour = categories[post.category];
  if (!colour || !validImage(post.image) || !/^\/post\/[a-z0-9-]+$/.test(post.href) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(post.published) ||
    !post.title || !post.description || !post.readTime) {
    throw new Error(`Invalid blog card: ${post.href}`);
  }
  const month = monthNames[Number(post.published.slice(5, 7)) - 1];
  if (!month) throw new Error(`Invalid blog date: ${post.href}`);
  const categorySlug = post.category.toLowerCase().replaceAll(' ', '-');
  const imageAttribute = index < 12
    ? `style="background-image:url('${post.image}')"`
    : `data-bg="${post.image}"`;
  return `      <a class="bpost" href="${post.href}" data-category="${categorySlug}">\n` +
    `        <div class="bimg" style="height:${[210, 250, 190, 230, 220, 240][index % 6]}px">` +
    `<span class="bimg-bg" ${imageAttribute}></span>` +
    `<span class="btag" style="background:${colour.bg};color:${colour.fg}">${escape(post.category)}</span></div>\n` +
    `        <div class="bbody"><div class="bmeta">${month} ${post.published.slice(0, 4)} &middot; ${escape(post.readTime)}</div>` +
    `<h3>${escape(post.title)}</h3><p class="bexc">${escape(post.description)}</p></div>\n      </a>`;
});
const blogTarget = path.join(out, 'blog.html');
let blogHtml = fs.readFileSync(blogTarget, 'utf8');
blogHtml = replaceRegion(blogHtml, '<!-- BLOG_GRID_START -->', '<!-- BLOG_GRID_END -->',
  '<div class="blog-masonry">\n' + blogCards.join('\n') + '\n    </div>', 'blog.html');
fs.writeFileSync(blogTarget, blogHtml);

const sitemapTarget = path.join(out, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapTarget, 'utf8');
sitemap = sitemap.replace(/  <url><loc>https:\/\/vanessaflowyoga\.co\.uk\/post\/[^<]+<\/loc>[^\n]*<\/url>\n/g, '');
const postUrls = blog.posts.map((post) =>
  `  <url><loc>https://vanessaflowyoga.co.uk${post.href}</loc><lastmod>${post.published}</lastmod><priority>0.5</priority></url>`
).join('\n');
sitemap = sitemap.replace('</urlset>', postUrls + '\n</urlset>');
fs.writeFileSync(sitemapTarget, sitemap);

// Leaf text fields keep the current page design intact. The CMS imposes the
// same limits, while this build check also catches edits made outside the CMS.
const copyLimits = {
  home: { hero_line: 24, hero_accent: 16, hero_lead: 130, timetable_intro: 130,
    welcome_one: 230, welcome_two: 230, principles_intro: 140,
    principle_welcoming: 130, principle_dedicated: 130, principle_passion: 130,
    principle_integrity: 130, ways_intro: 150 },
  classes: { timetable_intro: 130, categories_intro: 150, reviews_intro: 150,
    heat_one: 330, heat_two: 170, heat_three: 340,
    pregnancy_one: 220, pregnancy_two: 260, pregnancy_three: 200 },
  membership: { hero_intro: 160, newcomer_intro: 170, benefits_intro: 130,
    benefit_mood: 150, benefit_temperature: 150, benefit_welcome: 160,
    benefit_community: 170, benefit_teachers: 140, benefit_home: 160, help_intro: 170 },
  retreats: { eyebrow: 45, headline: 55, intro: 270, hero_alt: 130,
    story_heading: 65, story: 320, past_heading: 65, past_place: 65,
    past_description: 280, quote: 280, interest_heading: 65, interest_description: 240 },
};
for (const [page, limits] of Object.entries(copyLimits)) {
  const data = read(page === 'retreats' ? 'content/retreats-general.json' : `content/page-copy/${page}.json`);
  if (data.schema_version !== '1.0') throw new Error(`Unknown ${page} wording format`);
  const file = page === 'home' ? 'index.html' : `${page}.html`;
  const target = path.join(out, file);
  let html = fs.readFileSync(target, 'utf8');
  const seen = new Set();
  const marker = /<([a-z][a-z0-9]*)\b([^>]*\bdata-(?:retreat-)?copy(?:-key)?="([a-z_]+)"[^>]*)>([^<]*)<\/\1>/g;
  html = html.replace(marker, (whole, tag, attributes, key) => {
    if (!(key in limits) || seen.has(key)) throw new Error(`Unexpected or repeated ${page} wording field: ${key}`);
    seen.add(key);
    const value = data[key];
    if (typeof value !== 'string' || !value.trim() || Array.from(value).length > limits[key]) {
      throw new Error(`${page}.${key} exceeds its ${limits[key]} character limit`);
    }
    const text = key === 'quote' ? `“${escape(value)}”` : escape(value);
    return `<${tag}${attributes}>${text}</${tag}>`;
  });
  const missing = Object.keys(limits).filter((key) => key !== 'hero_alt' && !seen.has(key));
  if (missing.length) throw new Error(`Missing ${page} wording fields: ${missing.join(', ')}`);
  if (page === 'retreats') {
    if (!validImage(data.hero_image)) throw new Error('Invalid retreat hero image');
    html = html.replace(/(<img class="r-photo" src=")[^"]+(" alt=")[^"]+(" data-retreat-image>)/,
      `$1${escape(data.hero_image)}$2${escape(data.hero_alt)}$3`);
  }
  fs.writeFileSync(target, html);
}
console.log('Rendered timetable, latest cards, blog index, sitemap, prices and page wording');
