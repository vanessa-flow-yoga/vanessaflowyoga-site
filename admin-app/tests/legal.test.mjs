import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import legal from '../../shared/legal.cjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'
import {allowedPath} from '../netlify/functions/admin-content.mjs'
const read=page=>JSON.parse(fs.readFileSync(new URL('../../content/legal/'+page+'.json',import.meta.url),'utf8'))
test('both legal documents retain all sections, anchors and requested email links',()=>{
 for(const [page,count] of [['cancellation',6],['terms',14]]){
  const data=read(page);assert.equal(data.sections.length,count);assert.equal(allowedPath('content/legal/'+page+'.json'),true);
  assert.equal(validateContent('content/legal/'+page+'.json',JSON.stringify(data)),null);
  const output=legal.render(data);
  assert.match(output,/href="mailto:cancel@vanessaflowyoga.co.uk"/);assert.match(output,/href="mailto:freeze@vanessaflowyoga.co.uk"/);
  assert.match(output,/href="mailto:contact@vanessaflowyoga.co.uk"/);assert.match(output,/id="memberships"/);
  assert.match(output,/Last updated: 16 October 2026/);
 }
 const data=read('cancellation');const member=data.sections.find(s=>s.id==='memberships');assert.doesNotMatch(member.body,/contact@/);
 assert.match(member.body,/90 days/);assert.match(member.body,/7 consecutive days/);
})
test('legal text is escaped and unsafe links and duplicate references are rejected',()=>{
 const data=read('cancellation');data.sections[0].body='<script>alert(1)</script>\n\n- **Bold**\n- [Email](mailto:freeze@vanessaflowyoga.co.uk)';
 const output=legal.render(data);assert.doesNotMatch(output,/<script>/);assert.match(output,/&lt;script&gt;/);assert.match(output,/<ul><li><strong>Bold<\/strong>/);
 data.sections[0].body='[Click](javascript:alert)';assert.ok(legal.validate(data));
 data.sections[0].body='Safe';data.sections[1].id=data.sections[0].id;assert.ok(legal.validate(data));
})
test('publish succeeds without a previous preview',async()=>{
 const source=fs.readFileSync(new URL('../src/admin-app.js',import.meta.url),'utf8');
 const save=source.slice(source.indexOf('async function saveEntry('),source.indexOf('async function listEntries('));
 let request,feedback;
 const context={state:{data:read('terms'),path:'content/legal/terms.json',sha:'a'.repeat(40),reviewed:null},legal,JSON,api:async(q,options)=>{request=JSON.parse(options.body);return {sha:'b'.repeat(40),message:'Published.'}},setMessage:(text,error)=>{feedback={text,error}}};
 vm.runInNewContext(save,context);await context.saveEntry({id:'terms',legal:true},false);
 assert.equal(request.path,'content/legal/terms.json');assert.equal(feedback.error,undefined);assert.equal(feedback.text,'Published.');
})
