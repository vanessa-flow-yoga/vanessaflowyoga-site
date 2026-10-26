import test from 'node:test'
import assert from 'node:assert/strict'
import {credentialStatus,credentialChecks} from '../netlify/functions/credential-health.mjs'
import {alertFailures} from '../netlify/functions/health-scheduled.mjs'
const env={VFY_GITHUB_CONTENT_TOKEN:'test-only',VFY_GITHUB_TOKEN_EXPIRES_AT:'2026-11-25'}
test('expiry warning enters daily email failures before expiry',async()=>{
 const results=await credentialChecks({env,now:new Date('2026-11-18'),request:async()=>new Response('{}')})
 assert.equal(credentialStatus(new Date('2026-10-26'),env).status,'ok')
 assert.equal(alertFailures({results},{alertCategories:['github']})[0].name,'Admin token expiry')
})
test('authenticated failure is reported even when expiry is in future',async()=>{
 const results=await credentialChecks({env,now:new Date('2026-10-26'),request:async(url,options)=>{
 assert.match(url,/contents\/content\/page-copy\/home.json/)
 assert.equal(options.headers.Authorization,'Bearer test-only')
 return new Response('private response',{status:401})
 }})
 assert.equal(results[1].status,'fail')
 assert.doesNotMatch(JSON.stringify(results),/test-only|private response/)
})
test('missing expiry and token fail clearly without unauthenticated fallback',async()=>{
 assert.equal(credentialStatus(new Date(),{VFY_GITHUB_CONTENT_TOKEN:'test'}).status,'unknown')
 const results=await credentialChecks({env:{},request:()=>{throw Error('must not run')}})
 assert.equal(results[0].status,'fail')
 assert.equal(results.length,1)
})
