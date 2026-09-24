import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'

const singletonPaths = [
  'content/page-copy/home.json','content/page-copy/classes.json',
  'content/page-copy/membership.json','content/latest.json',
  'content/timetable.json','content/prices.json','content/retreats-general.json',
]

test('all current editor content passes server-side validation', () => {
  for (const path of singletonPaths) assert.equal(validateContent(path,fs.readFileSync(path,'utf8')),null,path)
  assert.equal(validateContent('post/flow-to-freedom-with-us-on-retreat.md',
    fs.readFileSync('post/flow-to-freedom-with-us-on-retreat.md','utf8')),null)
})

test('price mismatch is blocked before writing to GitHub', () => {
  const prices=JSON.parse(fs.readFileSync('content/prices.json','utf8'))
  prices.plans[0].amount+=1
  assert.match(validateContent('content/prices.json',JSON.stringify(prices)),/Confirm every price/)
})
