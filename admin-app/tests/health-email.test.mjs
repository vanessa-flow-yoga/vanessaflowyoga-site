import test from 'node:test'
import assert from 'node:assert/strict'
import {sendHealthEmail} from '../netlify/functions/health-email.mjs'
const env={RESEND_API_KEY:'test-only',HEALTH_ALERT_FROM:'Website <health@example.com>'}
const message={recipients:['owner@example.com'],subject:'Test',text:'Test message',env}
test('health email uses saved recipients and server-only credentials',async()=>{
 const result=await sendHealthEmail({...message,request:async(url,options)=>{
 assert.equal(url,'https://api.resend.com/emails')
 assert.equal(options.headers.Authorization,'Bearer test-only')
 assert.deepEqual(JSON.parse(options.body).to,['owner@example.com'])
 return new Response('{"id":"example"}')
 }})
 assert.equal(result.status,'accepted')
 assert.doesNotMatch(JSON.stringify(result),/test-only/)
})
test('unconfigured sender, no recipients, and rejected provider are reported honestly',async()=>{
 await assert.rejects(sendHealthEmail({...message,env:{}}),/not configured/)
 await assert.rejects(sendHealthEmail({...message,recipients:[]}),/at least one/)
 await assert.rejects(sendHealthEmail({...message,request:async()=>new Response('secret provider detail',{status:403})}),/HTTP 403/)
})
