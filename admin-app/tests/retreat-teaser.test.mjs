import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import teaser from '../../shared/retreat-teaser.cjs'
import {validateContent} from '../netlify/functions/admin-validation.mjs'
import {hasPrematureThirdParty} from '../netlify/functions/health-audit.mjs'
const content = JSON.parse(fs.readFileSync(new URL('../../content/retreats-general.json',import.meta.url),'utf8'))
const html = fs.readFileSync(new URL('../../retreats.html',import.meta.url),'utf8')
test('new Momence settings are rendered without executing pasted HTML or handlers',()=>{
 const code=content.momence_form_code.replace('274907','999999').replace('First name','Your first name').replace('async type=', 'onclick="alert(1)" async type=')+'<img src=x onerror="alert(2)">'
 const parsed=teaser.parseForm(code)
 assert.match(parsed.script,/source_id="999999"/)
 assert.match(parsed.script,/Your first name/)
 assert.doesNotMatch(parsed.script,/onclick|onerror|<img/)
 assert.throws(()=>teaser.parseForm(code.replace('https://momence.com/plugin/lead-form/lead-form.js','https://evil.example/script.js')))
 assert.throws(()=>teaser.parseForm(code.replace('host_id="13063"','host_id="1"')))
 assert.throws(()=>teaser.parseForm(code.replace('data_collect_consent="required"','data_collect_consent="optional"')))
 assert.throws(()=>teaser.parseForm(code.replace('</script>','alert(1)</script>')))
})
test('unsaved video, poster and form replacements render together behind consent',()=>{
 const draft={...content,hero_video:'/videos/retreats/new.mp4',hero_image:'/images/new-poster.webp',momence_form_code:content.momence_form_code.replace('274907','111111')}
 const output=teaser.renderTeaser(html,draft)
 assert.match(output,/data-src="\/videos\/retreats\/new.mp4"/)
 assert.match(output,/poster="\/images\/new-poster.webp"/)
 assert.match(output,/source_id="111111"/)
 assert.match(output,/vfyConsent.onReady\('functional'/)
 assert.equal(hasPrematureThirdParty(output),false)
 assert.equal(hasPrematureThirdParty(output+'<script src="https://momence.com/plugin/lead-form/lead-form.js"></script>'),true)
 assert.equal(validateContent('content/retreats-general.json',JSON.stringify(draft)),null)
 assert.ok(validateContent('content/retreats-general.json',JSON.stringify({...draft,hero_video:'javascript:alert(1)'})))
 assert.ok(validateContent('content/retreats-general.json',JSON.stringify({...draft,momence_form_code:'<script src="https://evil.example"></script>'})))
})
test('video URLs allow MP4 replacements and reject injection or traversal',()=>{
 for(const url of ['/videos/retreat-coast.mp4','/videos/retreats/new.mp4','https://media.example/clip.mp4?version=2'])assert.equal(teaser.validVideo(url),true)
 for(const url of ['/videos/../secret.mp4','http://media.example/clip.mp4','https://media.example/a.mp4" onerror="x','/images/a.jpg'])assert.equal(teaser.validVideo(url),false)
})
