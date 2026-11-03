import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import checkout from '../../shared/checkout.cjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'
import {resolveEditorMode} from '../lib/editor-mode.mjs'
const url='https://momence.com/Vanessa-Flow-Yoga/membership/10-Class-Pass%3A-%C2%A3150/24050'
test('checkout parser accepts tracking parameters, anchors and trailing slash without losing product id',()=>{
 for(const link of [url,url+'/?source=website#checkout',url+'?a=1&b=2','https://momence.com/m/24050'])assert.equal(checkout.productId(link),'24050')
 const prices=JSON.parse(fs.readFileSync(new URL('../../content/prices.json',import.meta.url)))
 prices.plans[4].booking_url=url+'/?source=website#checkout'
 assert.equal(validateContent('content/prices.json',JSON.stringify(prices)),null)
 prices.plans[4].product_id='999'
 assert.notEqual(validateContent('content/prices.json',JSON.stringify(prices)),null)
})
test('checkout parser rejects unsafe hosts, non-checkout links and raw HTML',()=>{
 for(const link of ['https://momence.com.evil.test/m/24050','https://evil.test/m/24050','http://momence.com/m/24050','https://user:password@momence.com/m/24050','https://momence.com/u/24050',url+'?x="<script>','javascript:alert(1)'])assert.equal(checkout.productId(link),null,link)
})
test('transient publishing-status failure retries successfully and genuine readonly stays readonly',async()=>{
 let attempts=0
 const recovered=await resolveEditorMode(async()=>{if(++attempts===1)throw Error('temporary failure');return {mode:'live'}})
 assert.equal(recovered.mode,'live');assert.equal(attempts,2)
 assert.equal((await resolveEditorMode(async()=>({mode:'readonly'}))).mode,'readonly')
 const failed=await resolveEditorMode(async()=>{throw Error('unavailable')})
 assert.equal(failed.mode,'readonly');assert.match(failed.error,/Retry/)
})
