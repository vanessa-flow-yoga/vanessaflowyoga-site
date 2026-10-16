import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import popup from '../../shared/popup.cjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'
import {allowedPath} from '../netlify/functions/admin-content.mjs'
const data=JSON.parse(fs.readFileSync(new URL('../../content/popup.json',import.meta.url),'utf8'))
test('popup settings reject unsafe links, invalid dates and partial buttons',()=>{
 assert.equal(allowedPath('content/popup.json'),true)
 assert.equal(validateContent('content/popup.json',JSON.stringify(data)),null)
 for(const change of [{button_url:'javascript:alert(1)'},{button_url:'//evil.example'},{button_url:'/\\evil.example'},{button_text:''},{start_date:'2026-02-30'},{schedule_enabled:true},{schedule_enabled:true,start_date:'2026-10-20',end_date:'2026-10-01'},{image:'/images/../secret'},{delay_seconds:61}])assert.ok(popup.validate({...data,...change}),JSON.stringify(change))
 assert.equal(popup.validate({...data,button_text:'',button_url:'',image:'',schedule_enabled:true,start_date:'2026-10-16',end_date:'2026-10-20'}),null)
})
const source=fs.readFileSync(new URL('../../site-popup.js',import.meta.url),'utf8')
async function schedules(settings,iso,path='/',seen=false){
 const timers=[];const win={};win.parent=win;
 class Clock extends Date {constructor(...args){super(...(args.length?args:[iso]))}}
 const context={window:win,location:{pathname:path},Intl,Date:Clock,Number,Math,addEventListener(){},fetch:async()=>({ok:true,json:async()=>settings}),sessionStorage:{getItem:()=>seen?'1':null},setTimeout(fn){timers.push(fn)},clearTimeout(){}};
 vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));return timers.length
}
test('automatic popup honours off, page targeting, session and London schedule without a build',async()=>{
 const enabled={...data,enabled:true,schedule_enabled:true,start_date:'2026-10-17',end_date:'2026-10-17'}
 assert.equal(await schedules({...data,enabled:false},'2026-10-17T12:00:00Z'),0)
 assert.equal(await schedules(enabled,'2026-10-16T22:59:00Z'),0)
 assert.equal(await schedules(enabled,'2026-10-16T23:01:00Z'),1)
 assert.equal(await schedules(enabled,'2026-10-17T23:01:00Z'),0)
 assert.equal(await schedules(enabled,'2026-10-17T12:00:00Z','/classes'),0)
 assert.equal(await schedules({...enabled,pages:'all'},'2026-10-17T12:00:00Z','/classes'),1)
 assert.equal(await schedules(enabled,'2026-10-17T12:00:00Z','/',true),0)
 assert.equal(await schedules({...enabled,pages:'all'},'2026-10-17T12:00:00Z','/thankyou.html'),0)
})

test('published status distinguishes disabled, scheduled, expired and live',()=>{
 const enabled={...data,enabled:true,schedule_enabled:true,start_date:'2026-10-17',end_date:'2026-10-17'};
 assert.equal(popup.status({...enabled,enabled:false}).label,'Not live');
 assert.match(popup.status(enabled,new Date('2026-10-16T12:00Z')).detail,/Scheduled/);
 assert.equal(popup.status(enabled,new Date('2026-10-16T23:01Z')).label,'Live');
 assert.match(popup.status(enabled,new Date('2026-10-18T12:00Z')).detail,/ended/);
});
test('hidden class dialogs do not block the popup; visible cookie dialogs do',async()=>{
 for (const visible of [false,true]) {
  const timers=[];const win={};win.parent=win;
  const context={window:win,location:{pathname:'/'},Intl,Date,Number,Math,addEventListener(){},fetch:async()=>({ok:true,json:async()=>({...data,enabled:true,schedule_enabled:false})}),sessionStorage:{getItem:()=>null},setTimeout(fn){timers.push(fn)},clearTimeout(){},document:{querySelectorAll:()=>[{getClientRects:()=>visible?[{}]:[]}],createElement(){throw Error('popup opened')}},getComputedStyle:()=>({visibility:'visible'})};
  vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  const open=timers.shift();assert.ok(open);
  if(visible){open();assert.equal(timers.length,1)}else assert.throws(open,/popup opened/);
 }
});
