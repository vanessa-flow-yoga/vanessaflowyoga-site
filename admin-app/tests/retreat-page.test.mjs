import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import retreatPage from '../../shared/retreat-page.cjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'

const sample = JSON.parse(fs.readFileSync(new URL('./fixtures/retreats/somewhere-slower-mallorca.json', import.meta.url), 'utf8'))
const copy = () => structuredClone(sample)

test('a blank retreat is a valid hidden draft once it has a name', () => {
  const draft = retreatPage.blank()
  assert.match(retreatPage.validate(draft), /retreat name/)
  draft.title = 'Autumn escape'
  assert.equal(retreatPage.validate(draft), null)
  draft.show_on_retreats_page = true
  assert.match(retreatPage.validate(draft), /page title/)
})

test('the sample retreat validates and old 1.0 files are refused', () => {
  assert.equal(retreatPage.validate(sample), null)
  assert.match(retreatPage.validate({...copy(), schema_version: '1.0'}), /old format/)
})

test('limits, photos and prices are enforced', () => {
  let d = copy(); d.hero.heading = 'x'.repeat(61); assert.match(retreatPage.validate(d), /under 60/)
  d = copy(); d.hero.image = 'https://example.com/a.jpg'; assert.match(retreatPage.validate(d), /uploaded to this website/)
  d = copy(); d.rooms.items[0].price = 9.5; assert.match(retreatPage.validate(d), /whole-pound/)
  d = copy(); d.photos = Array(9).fill({image: '/images/a.jpg', alt: ''}); assert.match(retreatPage.validate(d), /no more than 8/)
  d = copy(); d.hero.video = 'javascript:alert(1)'; assert.match(retreatPage.validate(d), /MP4/)
})

test('only a shown, not fully booked retreat goes live, first by file name', () => {
  const a = copy(), b = copy()
  assert.equal(retreatPage.pickLive([{slug: 'b', data: b}, {slug: 'a', data: a}]).slug, 'a')
  a.fully_booked = true
  assert.equal(retreatPage.pickLive([{slug: 'b', data: b}, {slug: 'a', data: a}]).slug, 'b')
  b.show_on_retreats_page = false
  assert.equal(retreatPage.pickLive([{slug: 'b', data: b}, {slug: 'a', data: a}]), null)
})

test('render escapes text, colours starred words and builds the Netlify form', () => {
  const d = copy()
  d.hero.intro = '<script>alert(1)</script>'
  d.faqs[0].answer = 'Fish & chips "here"'
  const view = retreatPage.render(d)
  assert.ok(!view.main.includes('<script>'))
  assert.ok(view.main.includes('&lt;script&gt;'))
  assert.ok(view.main.includes('Fish &amp; chips &quot;here&quot;'))
  assert.ok(view.main.includes('Somewhere <span class="rt-accent">slower.</span>'))
  assert.match(view.main, /<form[^>]+name="retreat-enquiry"[^>]+data-netlify="true"[^>]+action="\/retreat-thank-you"/)
  assert.ok(view.main.includes('<input type="hidden" name="form-name" value="retreat-enquiry">'))
  assert.ok(view.main.includes('<option>Double for two</option>'))
  assert.ok(!view.main.includes('<option>Private room</option>'), 'full rooms are not offered')
  assert.ok(!view.main.includes('rt-urgency'))
  assert.equal(view.title, "Somewhere slower · Cala d'Or, Mallorca yoga retreat · Vanessa Flow Yoga")
})

test('empty sections are hidden and the banner follows its tick box', () => {
  const d = copy()
  d.reviews = []; d.photos = []; d.included.yes = []; d.rooms.items = []; d.rooms.deposit = ''
  d.last_few_places = true
  const view = retreatPage.render(d)
  for (const cls of ['rt-reviews', 'rt-gallery', 'rt-inc-sec', 'rt-rooms']) assert.ok(!view.main.includes(`class="${cls}`), cls)
  assert.ok(view.main.includes('rt-urgency'))
  assert.equal(view.bodyClass, ' rt-page rt-few')
  assert.ok(!view.main.includes('name="room"'), 'no room choice without rooms')
})

test('the thank-you page always carries the hidden form definition', () => {
  for (const data of [null, sample]) {
    const html = retreatPage.renderThankYou(data)
    assert.match(html, /<form name="retreat-enquiry" data-netlify="true"[^>]*hidden/)
    for (const name of ['retreat', 'first_name', 'last_name', 'email', 'phone', 'room', 'party', 'message', 'consent']) assert.ok(html.includes(`name="${name}"`), name)
  }
  assert.ok(retreatPage.renderThankYou(sample).includes('£300 deposit'))
})

test('timeline and list lines are trimmed and blank lines dropped', () => {
  assert.deepEqual(retreatPage.lines(' one \n\n two\n'), ['one', 'two'])
})

test('admin saves of retreat files use the shared validation', () => {
  assert.equal(validateContent('content/retreats/somewhere-slower-mallorca.json', JSON.stringify(sample)), null)
  assert.match(validateContent('content/retreats/x.json', JSON.stringify({...copy(), title: ''})), /retreat name/)
  assert.match(validateContent('content/retreats/x.json', JSON.stringify({schema_version: '1.0', title: 'Old'})), /old format/)
})
