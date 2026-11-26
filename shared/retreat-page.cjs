// Retreat landing page — schema, validation and rendering.
//
// SOURCE OF TRUTH for content/retreats/<slug>.json, schema_version "2.0".
// Used by the site build (scripts/render-editor-content.cjs), the admin editor
// and server-side save validation (admin-app/netlify/functions/admin-validation.mjs).
//
// Schema 2.0 (26 Nov 2026) replaces 1.0. Version 1.0 was never rendered by the
// site and no 1.0 retreat file was ever published, so there is no migration:
// the build skips any 1.0 file with a warning and the admin refuses to save one.
//
// Shape (every text field is plain text; *stars* around words colour them in
// headings marked "accent"; blank lines in long text make paragraphs):
// {
//   schema_version: "2.0",
//   title,                                   admin name, also the file slug
//   show_on_retreats_page, last_few_places, fully_booked     booleans
//   hero:       {eyebrow, heading (accent), intro, image, image_alt, video}
//   facts:      {dates, location, length, price_from}
//   invitation: {heading (accent), text, for_you_heading, for_you[], image, image_alt}
//   highlights: {heading, cards[4]: {heading, text}}
//   photos[]:   {image, alt}                                    up to 8
//   stories[3]: {label, heading, text, image, image_alt}         stay, yoga, food
//   band:       {image, image_alt, line (accent)}               full-width photo
//   day:        {heading, intro, timeline[]: {time, activity}, note}
//   included:   {yes[], no[]}
//   rooms:      {heading, intro, items[]: {name, price, description, image, image_alt, full, most_booked}, deposit, balance}
//   host:       {heading (accent), text, image, image_alt}
//   reviews[]:  {quote, name, retreat}
//   travel[3]:  {heading, text}
//   faqs[]:     {question, answer}
//   enquiry:    {heading, intro}
//   thank_you:  {heading (accent), message}
// }
//
// /retreats shows the retreat when show_on_retreats_page is true and
// fully_booked is false. Otherwise the general teaser stays in place.

const {validVideo} = require('./retreat-teaser.cjs');

const SCHEMA = '2.0';
const FORM_NAME = 'retreat-enquiry';
const THANK_YOU_PATH = '/retreat-thank-you';

const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const accent = (value) => escape(value).replace(/\*([^*]+)\*/g, '<span class="rt-accent">$1</span>');
const plain = (value) => String(value ?? '').replace(/\*/g, '');
const paragraphs = (value) => String(value ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('');
const has = (value) => typeof value === 'string' && value.trim() !== '';
const image = (value) => /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(value || '');
const lines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

function blank() {
  return {
    schema_version: SCHEMA,
    title: '',
    show_on_retreats_page: false,
    last_few_places: false,
    fully_booked: false,
    hero: {eyebrow: '', heading: '', intro: '', image: '', image_alt: '', video: ''},
    facts: {dates: '', location: '', length: '', price_from: ''},
    invitation: {heading: '', text: '', for_you_heading: 'This retreat is for you if', for_you: [], image: '', image_alt: ''},
    highlights: {heading: "What we can't wait for.", cards: [1, 2, 3, 4].map(() => ({heading: '', text: ''}))},
    photos: [],
    stories: ['Where you\'ll stay', 'The yoga', 'The food'].map((label) => ({label, heading: '', text: '', image: '', image_alt: ''})),
    band: {image: '', image_alt: '', line: ''},
    day: {heading: 'Enough shape. Plenty of freedom.', intro: "A typical day. Join what you like, skip what you don't.", timeline: [], note: ''},
    included: {yes: [], no: []},
    rooms: {heading: 'Choose your room.', intro: 'Every price is per person and covers everything in the included list.', items: [], deposit: '', balance: ''},
    host: {heading: 'Hosted by *Vanessa.*', text: '', image: '/images/staff/vanessa.jpg', image_alt: 'Vanessa, founder of Vanessa Flow Yoga'},
    reviews: [],
    travel: [1, 2, 3].map(() => ({heading: '', text: ''})),
    faqs: [{question: 'How do I book?', answer: 'Fill in the Save my spot form at the bottom of this page. Vanessa will get in touch personally to answer your questions, confirm your room and arrange your deposit.'}],
    enquiry: {heading: 'Save your spot.', intro: "Send your details and Vanessa will be in touch personally. She'll talk you through the rooms, answer your questions and hold your place while you decide."},
    thank_you: {heading: "Your spot is saved. *That's with Vanessa.*", message: 'Thank you for saying yes. Vanessa reads every one of these herself and will be in touch personally by email or phone.'},
  };
}

// Character limits. Keep in step with the admin editor (it reads these).
const LIMITS = {
  title: 58,
  hero: {eyebrow: 60, heading: 60, intro: 220, image_alt: 130},
  facts: {dates: 40, location: 50, length: 30, price_from: 30},
  invitation: {heading: 90, text: 700, for_you_heading: 50, for_you: 90, image_alt: 130},
  highlights: {heading: 60, card_heading: 35, card_text: 90},
  photo_alt: 130,
  story: {label: 30, heading: 70, text: 420, image_alt: 130},
  band: {line: 70, image_alt: 130},
  day: {heading: 60, intro: 140, time: 8, activity: 60, note: 140},
  included: 70,
  rooms: {heading: 50, intro: 160, name: 35, description: 140, image_alt: 130, deposit: 30, balance: 60},
  host: {heading: 50, text: 600, image_alt: 130},
  review: {quote: 300, name: 30, retreat: 40},
  travel: {heading: 35, text: 200},
  faq: {question: 100, answer: 600},
  enquiry: {heading: 50, intro: 240},
  thank_you: {heading: 60, message: 240},
};
const COUNTS = {for_you: 6, photos: 8, timeline: 8, yes: 12, no: 8, rooms: 6, reviews: 6, faqs: 12};

function validate(data) {
  const fail = (text) => text;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('The retreat could not be read.');
  if (data.schema_version !== SCHEMA) return fail('This retreat uses an old format. Start a new retreat instead.');
  const text = (value, max, label, required = false) => {
    if (value === undefined || value === null || value === '') return required ? `Add the ${label}.` : null;
    if (typeof value !== 'string') return `Check the ${label}.`;
    if (required && !value.trim()) return `Add the ${label}.`;
    if (Array.from(value).length > max) return `Keep the ${label} under ${max} characters.`;
    return null;
  };
  const photo = (value, label, required = false) => {
    if (!value) return required ? `Add the ${label}.` : null;
    return image(value) ? null : `Choose a ${label} uploaded to this website.`;
  };
  const object = (value, label) => (value && typeof value === 'object' && !Array.isArray(value)) ? null : `The ${label} section is missing.`;
  const list = (value, max, label) => Array.isArray(value) ? (value.length > max ? `Use no more than ${max} ${label}.` : null) : `The ${label} list is missing.`;
  const live = data.show_on_retreats_page === true;
  const L = LIMITS;
  const checks = [];
  const add = (...results) => checks.push(...results);

  add(text(data.title, L.title, 'retreat name', true));
  for (const key of ['show_on_retreats_page', 'last_few_places', 'fully_booked']) {
    if (typeof data[key] !== 'boolean') add(`Check the ${key.replaceAll('_', ' ')} tick box.`);
  }
  for (const key of ['hero', 'facts', 'invitation', 'highlights', 'band', 'day', 'included', 'rooms', 'host', 'enquiry', 'thank_you']) add(object(data[key], key.replace('_', '-')));
  if (checks.some(Boolean)) return checks.find(Boolean);

  const h = data.hero;
  add(text(h.eyebrow, L.hero.eyebrow, 'small label above the title'), text(h.heading, L.hero.heading, 'page title', live),
    text(h.intro, L.hero.intro, 'introduction', live), photo(h.image, 'top photo', live), text(h.image_alt, L.hero.image_alt, 'top photo description'));
  if (h.video && !validVideo(h.video)) add('Choose an MP4 video from the website or an HTTPS MP4 link.');
  const f = data.facts;
  add(text(f.dates, L.facts.dates, 'dates', live), text(f.location, L.facts.location, 'location', live),
    text(f.length, L.facts.length, 'length'), text(f.price_from, L.facts.price_from, 'starting price', live));
  const inv = data.invitation;
  add(text(inv.heading, L.invitation.heading, 'invitation heading'), text(inv.text, L.invitation.text, 'invitation text'),
    text(inv.for_you_heading, L.invitation.for_you_heading, '"for you if" heading'), list(inv.for_you, COUNTS.for_you, '"for you if" points'),
    photo(inv.image, 'invitation photo'), text(inv.image_alt, L.invitation.image_alt, 'invitation photo description'));
  if (Array.isArray(inv.for_you)) inv.for_you.forEach((item) => add(text(item, L.invitation.for_you, '"for you if" point')));
  const hl = data.highlights;
  add(text(hl.heading, L.highlights.heading, 'highlights heading'));
  if (!Array.isArray(hl.cards) || hl.cards.length !== 4) add('Keep four highlight cards.');
  else hl.cards.forEach((card, i) => add(text(card?.heading, L.highlights.card_heading, `highlight ${i + 1} heading`), text(card?.text, L.highlights.card_text, `highlight ${i + 1} text`)));
  add(list(data.photos, COUNTS.photos, 'photos'));
  if (Array.isArray(data.photos)) data.photos.forEach((p, i) => add(photo(p?.image, `gallery photo ${i + 1}`, true), text(p?.alt, L.photo_alt, `gallery photo ${i + 1} description`)));
  if (!Array.isArray(data.stories) || data.stories.length !== 3) add('Keep the three blocks for where you stay, the yoga and the food.');
  else data.stories.forEach((s, i) => add(text(s?.label, L.story.label, `block ${i + 1} label`), text(s?.heading, L.story.heading, `block ${i + 1} heading`),
    text(s?.text, L.story.text, `block ${i + 1} text`), photo(s?.image, `block ${i + 1} photo`), text(s?.image_alt, L.story.image_alt, `block ${i + 1} photo description`)));
  add(photo(data.band.image, 'full-width photo'), text(data.band.line, L.band.line, 'line over the full-width photo'), text(data.band.image_alt, L.band.image_alt, 'full-width photo description'));
  const d = data.day;
  add(text(d.heading, L.day.heading, 'day heading'), text(d.intro, L.day.intro, 'day introduction'), text(d.note, L.day.note, 'day note'), list(d.timeline, COUNTS.timeline, 'timeline moments'));
  if (Array.isArray(d.timeline)) d.timeline.forEach((t, i) => add(text(t?.time, L.day.time, `time on timeline line ${i + 1}`, true), text(t?.activity, L.day.activity, `activity on timeline line ${i + 1}`, true)));
  add(list(data.included.yes, COUNTS.yes, 'included items'), list(data.included.no, COUNTS.no, 'not included items'));
  for (const key of ['yes', 'no']) if (Array.isArray(data.included[key])) data.included[key].forEach((item) => add(text(item, L.included, key === 'yes' ? 'included item' : 'not included item')));
  const r = data.rooms;
  add(text(r.heading, L.rooms.heading, 'rooms heading'), text(r.intro, L.rooms.intro, 'rooms introduction'), list(r.items, COUNTS.rooms, 'room types'),
    text(r.deposit, L.rooms.deposit, 'deposit wording'), text(r.balance, L.rooms.balance, 'balance wording'));
  if (Array.isArray(r.items)) r.items.forEach((room, i) => {
    add(text(room?.name, L.rooms.name, `room ${i + 1} name`, true), text(room?.description, L.rooms.description, `room ${i + 1} description`),
      photo(room?.image, `room ${i + 1} photo`), text(room?.image_alt, L.rooms.image_alt, `room ${i + 1} photo description`));
    if (!Number.isInteger(room?.price) || room.price < 1 || room.price > 20000) add(`Enter a whole-pound price for room ${i + 1}.`);
    if (typeof room?.full !== 'boolean' || typeof room?.most_booked !== 'boolean') add(`Check the tick boxes for room ${i + 1}.`);
  });
  add(text(data.host.heading, L.host.heading, 'host heading'), text(data.host.text, L.host.text, 'host text'), photo(data.host.image, 'host photo'), text(data.host.image_alt, L.host.image_alt, 'host photo description'));
  add(list(data.reviews, COUNTS.reviews, 'reviews'));
  if (Array.isArray(data.reviews)) data.reviews.forEach((rv, i) => add(text(rv?.quote, L.review.quote, `review ${i + 1} quote`, true), text(rv?.name, L.review.name, `review ${i + 1} name`, true), text(rv?.retreat, L.review.retreat, `review ${i + 1} retreat`)));
  if (!Array.isArray(data.travel) || data.travel.length !== 3) add('Keep three getting-there cards.');
  else data.travel.forEach((t, i) => add(text(t?.heading, L.travel.heading, `getting-there card ${i + 1} heading`), text(t?.text, L.travel.text, `getting-there card ${i + 1} text`)));
  add(list(data.faqs, COUNTS.faqs, 'questions'));
  if (Array.isArray(data.faqs)) data.faqs.forEach((q, i) => add(text(q?.question, L.faq.question, `question ${i + 1}`, true), text(q?.answer, L.faq.answer, `answer ${i + 1}`, true)));
  add(text(data.enquiry.heading, L.enquiry.heading, 'form heading', true), text(data.enquiry.intro, L.enquiry.intro, 'form introduction'));
  add(text(data.thank_you.heading, L.thank_you.heading, 'thank-you heading', true), text(data.thank_you.message, L.thank_you.message, 'thank-you message'));
  return checks.find(Boolean) || null;
}

const isLive = (data) => data?.schema_version === SCHEMA && data.show_on_retreats_page === true && data.fully_booked !== true;

// Several retreats ticked at once: the first by file name wins, so the result
// never depends on file system order.
function pickLive(entries) {
  return [...entries].sort((a, b) => a.slug.localeCompare(b.slug)).find((entry) => isLive(entry.data)) || null;
}

const price = (amount) => '£' + Number(amount).toLocaleString('en-GB');
const img = (src, alt, cls = '', extra = '') => `<img${cls ? ` class="${cls}"` : ''} src="${escape(src)}" alt="${escape(alt || '')}" loading="lazy" decoding="async"${extra}>`;
const tick = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3 3 7-7"/></svg>';

function render(data) {
  const out = [];
  const h = data.hero, f = data.facts;
  const cta = (cls = '') => `<a class="rt-btn${cls}" href="#book">Save my spot <span aria-hidden="true">→</span></a>`;
  const facts = [['Dates', f.dates], ['Where', f.location], ['Length', f.length], ['From', f.price_from]].filter(([, v]) => has(v));

  if (data.last_few_places) out.push(`<div class="rt-urgency" role="status"><span class="rt-dot" aria-hidden="true"></span><b>Last few places left.</b> <a href="#book">Save my spot →</a></div>`);

  const media = has(h.video)
    ? `<video class="rt-poster" muted loop playsinline preload="none" poster="${escape(h.image)}" aria-hidden="true" data-rt-video><source data-src="${escape(h.video)}" type="video/mp4"></video>`
    : img(h.image, h.image_alt, 'rt-poster', ' fetchpriority="high"').replace(' loading="lazy"', '');
  out.push(`<section class="rt-hero">${media}<div class="rt-wrap rt-hero-inner"><div>${has(h.eyebrow) ? `<span class="rt-eyebrow">${escape(h.eyebrow)}</span>` : ''}<h1>${accent(h.heading)}</h1></div><div class="rt-hero-side"><p>${escape(h.intro)}</p><div class="rt-hero-ctas">${cta(' rt-yellow')}${data.included.yes.length ? '<a class="rt-btn rt-ghost" href="#included">What\'s included</a>' : ''}</div></div></div></section>`);
  out.push(`<div class="rt-facts"><div class="rt-wrap">${facts.map(([k, v]) => `<div class="rt-fact"><small>${k}</small><b>${escape(v)}</b></div>`).join('')}${cta()}</div></div>`);

  const inv = data.invitation;
  if (has(inv.heading) || has(inv.text) || inv.for_you.length) {
    out.push(`<section class="rt-intro"><div class="rt-wrap rt-intro-grid${inv.image ? '' : ' rt-no-img'}"><div><span class="rt-eyebrow">The invitation</span>${has(inv.heading) ? `<h2>${accent(inv.heading)}</h2>` : ''}${paragraphs(inv.text)}${inv.for_you.length ? `<div class="rt-for-you">${has(inv.for_you_heading) ? `<h3>${escape(inv.for_you_heading)}</h3>` : ''}<ul>${inv.for_you.map((x) => `<li>${escape(x)}</li>`).join('')}</ul></div>` : ''}</div>${inv.image ? img(inv.image, inv.image_alt, 'rt-arch') : ''}</div></section>`);
  }

  const cards = data.highlights.cards.filter((c) => has(c.heading));
  if (cards.length) out.push(`<section class="rt-highlights"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">The highlights</span>${has(data.highlights.heading) ? `<h2>${accent(data.highlights.heading)}</h2>` : ''}</div><div class="rt-hl-grid rt-n${cards.length}">${cards.map((c, i) => `<div class="rt-hl"><span>0${i + 1}</span><h3>${escape(c.heading)}</h3>${has(c.text) ? `<p>${escape(c.text)}</p>` : ''}</div>`).join('')}</div></div></section>`);

  if (data.photos.length) out.push(`<section class="rt-gallery"><div class="rt-gal rt-n${Math.min(data.photos.length, 5)}">${data.photos.slice(0, 5).map((p) => img(p.image, p.alt)).join('')}</div>${data.photos.length > 5 ? `<div class="rt-gal rt-gal-more">${data.photos.slice(5).map((p) => img(p.image, p.alt)).join('')}</div>` : ''}</section>`);

  const stories = data.stories.filter((s) => has(s.heading) || has(s.text));
  if (stories.length) out.push(`<section class="rt-stories"><div class="rt-wrap">${stories.map((s, i) => `<div class="rt-story${i % 2 ? ' rt-flip' : ''}${s.image ? '' : ' rt-no-img'}">${s.image ? `<div class="rt-story-img">${img(s.image, s.image_alt)}</div>` : ''}<div>${has(s.label) ? `<span class="rt-eyebrow">${escape(s.label)}</span>` : ''}${has(s.heading) ? `<h3>${escape(s.heading)}</h3>` : ''}${paragraphs(s.text)}</div></div>`).join('')}</div></section>`);

  if (data.band.image) out.push(`<section class="rt-band">${img(data.band.image, data.band.image_alt)}${has(data.band.line) ? `<div class="rt-wrap"><p>${accent(data.band.line)}</p></div>` : ''}</section>`);

  const d = data.day;
  if (d.timeline.length) out.push(`<section class="rt-day"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">A day on retreat</span>${has(d.heading) ? `<h2>${accent(d.heading)}</h2>` : ''}${has(d.intro) ? `<p>${escape(d.intro)}</p>` : ''}</div><div class="rt-timeline" style="--rt-cols:${d.timeline.length}">${d.timeline.map((t) => `<div class="rt-tl"><b>${escape(t.time)}</b><span>${escape(t.activity)}</span></div>`).join('')}</div>${has(d.note) ? `<p class="rt-day-note">${escape(d.note)}</p>` : ''}</div></section>`);

  const inc = data.included;
  if (inc.yes.length) out.push(`<section class="rt-inc-sec" id="included"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">What's included</span><h2>One price. <span class="rt-accent">No surprises.</span></h2></div><div class="rt-inc-grid${inc.no.length ? '' : ' rt-single'}"><div class="rt-inc rt-yes"><h3>Included</h3><ul>${inc.yes.map((x) => `<li>${escape(x)}</li>`).join('')}</ul></div>${inc.no.length ? `<div class="rt-inc rt-no"><h3>Not included</h3><ul>${inc.no.map((x) => `<li>${escape(x)}</li>`).join('')}</ul></div>` : ''}</div></div></section>`);

  const r = data.rooms;
  if (r.items.length || has(r.deposit)) {
    const rooms = r.items.map((room) => `<div class="rt-room${room.most_booked && !room.full ? ' rt-pop' : ''}${room.full ? ' rt-gone' : ''}">${room.image ? img(room.image, room.image_alt) : ''}<div class="rt-room-body"><h3>${escape(room.name)}</h3>${has(room.description) ? `<p class="rt-desc">${escape(room.description)}</p>` : ''}<div class="rt-price">${price(room.price)}<small>per person</small></div>${room.full ? '<span class="rt-btn rt-btn-off">Fully booked</span>' : `<a class="rt-btn" href="#book" data-room="${escape(room.name)}">Save my spot</a>`}</div></div>`).join('');
    const steps = has(r.deposit) ? `<div class="rt-pay-plan"><div><small>Step 1</small><b>Save your spot</b><span>Fill in the form. No payment yet.</span></div><div><small>Step 2</small><b>Vanessa gets in touch</b><span>She'll answer questions and hold your room.</span></div><div><small>Step 3</small><b>${escape(r.deposit)}</b><span>${has(r.balance) ? escape(r.balance) : 'Secures your place.'}</span></div></div>` : '';
    out.push(`<section class="rt-rooms" id="rooms"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">Rooms and prices</span>${has(r.heading) ? `<h2>${accent(r.heading)}</h2>` : ''}${has(r.intro) ? `<p>${escape(r.intro)}</p>` : ''}</div>${rooms ? `<div class="rt-room-grid rt-n${Math.min(r.items.length, 3)}">${rooms}</div>` : ''}${steps}</div></section>`);
  }

  const host = data.host;
  if (has(host.text)) out.push(`<section class="rt-host"><div class="rt-wrap rt-host-grid${host.image ? '' : ' rt-no-img'}">${host.image ? img(host.image, host.image_alt) : ''}<div><span class="rt-eyebrow">Your host</span>${has(host.heading) ? `<h2>${accent(host.heading)}</h2>` : ''}${paragraphs(host.text)}</div></div></section>`);

  if (data.reviews.length) out.push(`<section class="rt-reviews"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">From past retreats</span><h2>What guests say.</h2></div><div class="rt-rev-grid rt-n${Math.min(data.reviews.length, 3)}">${data.reviews.map((rv, i) => `<figure class="rt-rev${i === 0 ? ' rt-big' : ''}"><div class="rt-stars" aria-label="Five stars">★★★★★</div><blockquote>${escape(rv.quote)}</blockquote><figcaption><i aria-hidden="true">${escape(Array.from(rv.name.trim())[0] || '')}</i><span>${escape(rv.name)}${has(rv.retreat) ? `<small>${escape(rv.retreat)}</small>` : ''}</span></figcaption></figure>`).join('')}</div></div></section>`);

  const travel = data.travel.filter((t) => has(t.heading));
  if (travel.length) out.push(`<section class="rt-travel-sec"><div class="rt-wrap"><div class="rt-sec-head"><span class="rt-eyebrow">Getting there</span><h2>How to get there.</h2></div><div class="rt-travel-grid rt-n${travel.length}">${travel.map((t) => `<div class="rt-travel"><h3>${escape(t.heading)}</h3>${has(t.text) ? `<p>${escape(t.text)}</p>` : ''}</div>`).join('')}</div></div></section>`);

  if (data.faqs.length) out.push(`<section class="rt-faq"><div class="rt-wrap rt-faq-grid"><div class="rt-sec-head"><span class="rt-eyebrow">Questions</span><h2>Things people ask, <span class="rt-accent">answered.</span></h2><p>Anything else, <a href="/contact">message Vanessa directly</a>.</p></div><div>${data.faqs.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${escape(q.question)}</summary>${paragraphs(q.answer)}</details>`).join('')}</div></div></section>`);

  const open = r.items.filter((room) => !room.full).map((room) => room.name);
  const roomSelect = open.length ? `<label>Room you'd like<select name="room" id="rt-room"><option>Not sure yet</option>${open.map((n) => `<option>${escape(n)}</option>`).join('')}</select></label>` : '';
  const factsShort = [['Dates', f.dates], ['From', f.price_from]].filter(([, v]) => has(v));
  out.push(`<section class="rt-book" id="book"><div class="rt-wrap"><div class="rt-final"><div><span class="rt-eyebrow">Places now open</span><h2>${accent(data.enquiry.heading)}</h2>${has(data.enquiry.intro) ? `<p>${escape(data.enquiry.intro)}</p>` : ''}${factsShort.length ? `<div class="rt-final-facts">${factsShort.map(([k, v]) => `<div><small>${k}</small><b>${escape(v)}</b></div>`).join('')}</div>` : ''}</div>
<form class="rt-final-card rt-enquiry" name="${FORM_NAME}" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="${THANK_YOU_PATH}" aria-label="Save my spot form">
<input type="hidden" name="form-name" value="${FORM_NAME}"><input type="hidden" name="retreat" value="${escape(data.title)}">
<p class="hp-field" hidden aria-hidden="true"><label>Leave this empty: <input name="bot-field"></label></p>
<div class="rt-two"><label>First name<input name="first_name" autocomplete="given-name" required></label><label>Last name<input name="last_name" autocomplete="family-name" required></label></div>
<label>Email<input name="email" type="email" autocomplete="email" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel"></label>
<div class="rt-two">${roomSelect}<label>Who's coming<select name="party"><option>Just me</option><option>Me and one other</option><option>A small group</option></select></label></div>
<label>Anything you'd like to ask? <span>(optional)</span><textarea name="message" rows="3"></textarea></label>
<label class="rt-check"><input type="checkbox" name="consent" value="yes" required><span>I'm happy for Vanessa to contact me about this retreat. See our <a href="/privacy">privacy policy</a>.</span></label>
<button class="rt-btn" type="submit">It's a yes from me <span aria-hidden="true">→</span></button>
<p class="rt-small">No payment now. This saves your spot while Vanessa gets in touch.</p>
</form></div></div></section>`);

  out.push(`<div class="rt-m-sticky"><div>${has(f.dates) ? `<small>${escape(f.dates)}</small>` : ''}${has(f.price_from) ? `<b>From ${escape(f.price_from)}</b>` : ''}</div>${cta()}</div>`);

  return {
    main: `<main id="main" class="rt">\n${out.join('\n')}\n</main>`,
    title: `${escape(plain(h.heading).trim().replace(/[.!,]+$/, ""))} · ${f.location ? escape(f.location) + ' yoga retreat' : 'Yoga retreat'} · Vanessa Flow Yoga`,
    description: escape(h.intro),
    image: h.image,
    bodyClass: ' rt-page' + (data.last_few_places ? ' rt-few' : ''),
  };
}

// Every deploy carries a hidden copy of the form so Netlify registers it
// (and its email notification) even while the teaser is showing.
const formDefinition = `<form name="${FORM_NAME}" data-netlify="true" netlify-honeypot="bot-field" hidden aria-hidden="true"><input name="retreat"><input name="first_name"><input name="last_name"><input name="email"><input name="phone"><input name="room"><input name="party"><textarea name="message"></textarea><input name="consent"><input name="bot-field"></form>`;

function renderThankYou(data) {
  const t = data ? data.thank_you : {heading: "Thank you. *That's with Vanessa.*", message: 'Vanessa reads every enquiry herself and will be in touch personally by email or phone.'};
  const photo = data?.hero.image || '/images/retreat-coast.jpg';
  const label = data ? [data.title, data.facts.dates].filter(has).map(escape).join(' · ') : 'Retreats';
  const deposit = data && has(data.rooms.deposit) ? `<div class="rt-ty-step"><small>03</small><h3>${escape(data.rooms.deposit)}</h3><p>${has(data.rooms.balance) ? escape(data.rooms.balance) : 'Pay the deposit to secure your place.'}</p></div>` : '';
  return `<main id="main" class="rt rt-ty">
<section class="rt-hero rt-ty-hero">${img(photo, '', 'rt-poster').replace(' loading="lazy"', '')}<div class="rt-wrap"><div class="rt-ty-tick" aria-hidden="true">✓</div><span class="rt-eyebrow">${label}</span><h1>${accent(t.heading)}</h1>${has(t.message) ? `<p>${escape(t.message)}</p>` : ''}</div></section>
<section class="rt-ty-next"><div class="rt-wrap"><h2>What happens next.</h2><div class="rt-ty-steps${deposit ? '' : ' rt-n2'}"><div class="rt-ty-step rt-done"><small>Done</small><h3>You've saved your spot</h3><p>Your details are with Vanessa. No payment has been taken.</p></div><div class="rt-ty-step"><small>02</small><h3>Vanessa gets in touch</h3><p>By email or phone. She'll answer your questions and confirm your room.</p></div>${deposit}</div><p class="rt-ty-help">Nothing in your inbox after a couple of days? Check your junk folder, or <a href="/contact">get in touch</a>.</p></div></section>
<section class="rt-ty-mean"><div class="rt-wrap"><div class="rt-final"><div><span class="rt-eyebrow">In the meantime</span><h2>Practise with us before you go.</h2><p>Join a class at the Clitheroe studio and meet some of the people you'll be on retreat with.</p><div class="rt-ty-btns"><a class="rt-btn" href="/classes">See the timetable <span aria-hidden="true">→</span></a><a class="rt-btn rt-light" href="/retreats">Back to the retreat</a></div></div>${img('/images/staff/vanessa.jpg', 'Vanessa, founder of Vanessa Flow Yoga', 'rt-ty-host')}</div></div></section>
${formDefinition}
</main>`;
}

module.exports = {SCHEMA, FORM_NAME, THANK_YOU_PATH, LIMITS, COUNTS, blank, validate, isLive, pickLive, render, renderThankYou, lines, escape};
