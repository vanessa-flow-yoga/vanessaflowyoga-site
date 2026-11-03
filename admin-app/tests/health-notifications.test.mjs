import test from 'node:test'
import assert from 'node:assert/strict'
import {notifyHealth,londonWeek} from '../lib/health-notifications.mjs'
import {combineHealth,runEssential} from '../lib/health-essential.mjs'
import {credentialChecks} from '../lib/credential-health.mjs'
const settings={recipients:['hello@charlie-harris.com','vanessa@vanessaflowyoga.co.uk'],alertCategories:['availability','github','integrations']}
const now=new Date('2026-11-03T12:00:00Z')
const failure={category:'availability',name:'Website live',status:'fail',detail:'HTTP 503'}
const report=(results,checkedAt=now.toISOString())=>({checkedAt,results,summary:{pass:results.filter(r=>r.status==='pass').length,fail:results.filter(r=>r.status==='fail').length,warn:results.filter(r=>r.status==='warn').length}})
test('new failure emails both recipients, unchanged issue stays quiet, recovery and recurrence alert',async()=>{
 const messages=[],send=async message=>messages.push(message)
 let result=await notifyHealth({report:report([failure]),settings,state:{},send,configured:true,now})
 assert.equal(messages.length,1);assert.deepEqual(messages[0].recipients,settings.recipients)
 result=await notifyHealth({report:report([{...failure,detail:'HTTP 502'}]),settings,state:result.state,send,configured:true,now})
 assert.equal(messages.length,1)
 result=await notifyHealth({report:report([]),settings,state:result.state,send,configured:true,now})
 assert.equal(messages.length,2);assert.match(messages[1].subject,/resolved/)
 await notifyHealth({report:report([failure]),settings,state:result.state,send,configured:true,now})
 assert.equal(messages.length,3)
})
test('weekly report sends once per London week including healthy results and retries failures',async()=>{
 const messages=[],send=async message=>messages.push(message)
 let result=await notifyHealth({report:report([{...failure,status:'pass',detail:'HTTP 200'}]),settings,state:{},send,configured:true,now,allowWeekly:true})
 assert.equal(messages.length,1);assert.match(messages[0].text,/All monitored checks passed/)
 result=await notifyHealth({report:report([]),settings,state:result.state,send,configured:true,now:new Date('2026-11-08T08:00Z'),allowWeekly:true})
 assert.equal(messages.length,1)
 result=await notifyHealth({report:report([]),settings,state:result.state,send,configured:true,now:new Date('2026-11-09T08:17Z'),allowWeekly:true})
 assert.equal(messages.length,2)
 const failed=await notifyHealth({report:report([failure]),settings,state:{},send:async()=>{throw Error('connection failed with private data')},configured:true,now,allowWeekly:true})
 assert.equal(failed.state.weeklyKey,undefined);assert.equal(failed.state.activeFailures,undefined)
 assert.doesNotMatch(JSON.stringify(failed),/private data/)
 const retried=await notifyHealth({report:report([failure]),settings,state:failed.state,send,configured:true,now,allowWeekly:true})
 assert.equal(retried.outcomes.length,2);assert.ok(retried.outcomes.every(item=>item.status==='accepted'))
})
test('London week handles summer offset and clock-change dates',()=>{
 assert.equal(londonWeek(new Date('2026-07-05T23:30Z')),'2026-07-06')
 assert.equal(londonWeek(new Date('2026-10-25T23:30Z')),'2026-10-19')
 assert.equal(londonWeek(new Date('2026-10-26T00:30Z')),'2026-10-26')
})
test('unconfigured sending remains honest and ready to retry after setup',async()=>{
 const result=await notifyHealth({report:report([failure]),settings,state:{},send:()=>{throw Error('must not send')},configured:false,now,allowWeekly:true})
 assert.ok(result.outcomes.every(item=>item.status==='not-configured'))
 assert.equal(result.state.activeFailures,undefined);assert.equal(result.state.weeklyKey,undefined)
})
test('essential checks preserve unrelated daily issues and flag a stopped full audit',()=>{
 const full=report([{category:'integrations',name:'Instagram feed',status:'fail',detail:'Paused'},failure])
 const essential=report([{...failure,status:'pass',detail:'HTTP 200'}])
 const combined=combineHealth(full,essential,now)
 assert.equal(combined.results.filter(item=>item.name==='Website live').length,1)
 assert.equal(combined.results.find(item=>item.name==='Website live').status,'pass')
 assert.equal(combined.summary.fail,1)
 assert.ok(combineHealth(full,essential,new Date('2026-11-06T12:00Z')).results.some(item=>item.name==='Daily full audit overdue'&&item.status==='fail'))
})
test('essential monitoring checks availability and actual token access without customer data',async()=>{
 const urls=[]
 const result=await runEssential({now,env:{VFY_GITHUB_CONTENT_TOKEN:'test-only',VFY_GITHUB_TOKEN_EXPIRES_AT:'2026-11-25'},request:async url=>{urls.push(url);return new Response('{}')}})
 assert.equal(urls.length,4);assert.ok(urls.some(url=>url.includes('/contents/content/page-copy/home.json')))
 assert.ok(result.results.every(item=>item.status==='pass'))
 assert.doesNotMatch(JSON.stringify(result),/test-only/)
})
test('expiry escalates at two weeks, one week, one day and expired without daily spam',async()=>{
 const env={VFY_GITHUB_CONTENT_TOKEN:'test-only',VFY_GITHUB_TOKEN_EXPIRES_AT:'2026-11-25'},messages=[]
 let state={}
 for(const day of [11,12,18,19,24,25]){
  const date=new Date(`2026-11-${day}T00:00Z`),results=await credentialChecks({env,now:date,request:async()=>new Response('{}')})
  const result=await notifyHealth({report:report(results),settings,state,send:async message=>messages.push(message),configured:true,now:date});state=result.state
 }
 assert.equal(messages.length,4)
})
