import test from 'node:test'
import assert from 'node:assert/strict'
import {changePrice, confirmPrice, preparePrices} from '../lib/price-editor.mjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'
import fs from 'node:fs'
const prices=()=>JSON.parse(fs.readFileSync(new URL('../../content/prices.json',import.meta.url)))
test('link-only edits accept supplied Momence URLs without a duplicate price edit',()=>{
 const data=prices()
 data.plans[1].booking_url='https://momence.com/m/973535'
 data.plans[3].booking_url='https://momence.com/m/973536'
 preparePrices(data.plans)
 assert.equal(data.plans[1].product_id,'973535')
 assert.equal(data.plans[3].product_id,'973536')
 assert.equal(validateContent('content/prices.json',JSON.stringify(data)),null)
})
test('changed price needs explicit confirmation and names the blocked plan',()=>{
 const data=prices(),annual=data.plans[3]
 changePrice(annual,840)
 assert.equal(annual.momence_confirmed_amount,null)
 assert.throws(()=>preparePrices(data.plans),/Annual membership: tick.*£840/)
 confirmPrice(annual,true)
 preparePrices(data.plans)
 assert.equal(validateContent('content/prices.json',JSON.stringify(data)),null)
 changePrice(annual,850)
 assert.equal(annual.momence_confirmed_amount,null)
 confirmPrice(annual,false)
 assert.throws(()=>preparePrices(data.plans),/£850/)
})
test('invalid unrelated plan gives a specific error and cannot partly normalise data',()=>{
 const data=prices()
 data.plans[0].booking_url='https://evil.test/m/123'
 data.plans[1].booking_url='https://momence.com/m/973535'
 const before=JSON.stringify(data)
 assert.throws(()=>preparePrices(data.plans),/21-day intro pass: paste/)
 assert.equal(JSON.stringify(data),before)
})
