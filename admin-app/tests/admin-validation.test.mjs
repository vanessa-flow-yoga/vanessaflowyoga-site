import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {validateContent} from '../netlify/functions/admin-validation.mjs'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readSite = (name) => fs.readFileSync(path.join(siteRoot, name), 'utf8')

const singletonPaths = [
  'content/page-copy/home.json','content/page-copy/classes.json',
  'content/page-copy/membership.json','content/latest.json',
  'content/timetable.json','content/prices.json','content/retreats-general.json',
]

test('all current editor content passes server-side validation', () => {
  for (const path of singletonPaths) assert.equal(validateContent(path,readSite(path)),null,path)
  assert.equal(validateContent('post/flow-to-freedom-with-us-on-retreat.md',
    readSite('post/flow-to-freedom-with-us-on-retreat.md')),null)
})

test('price mismatch is blocked before writing to GitHub', () => {
  const prices=JSON.parse(readSite('content/prices.json'))
  prices.plans[0].amount+=1
  assert.match(validateContent('content/prices.json',JSON.stringify(prices)),/Confirm every price/)
})
