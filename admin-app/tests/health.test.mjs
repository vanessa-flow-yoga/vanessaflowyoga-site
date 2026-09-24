import test from 'node:test'
import assert from 'node:assert/strict'
import {defaultSettings,validSettings,addManualChecks} from '../netlify/functions/health-store.mjs'
import {alertFailures} from '../netlify/functions/health-scheduled.mjs'
import {hasPrematureThirdParty} from '../netlify/functions/health-audit.mjs'

test('health alert settings accept chosen categories and reject invalid recipients',()=>{
  const settings=defaultSettings()
  assert.equal(validSettings(settings),true)
  assert.equal(validSettings({...settings,recipients:['not an email']}),false)
  assert.equal(validSettings({...settings,alertCategories:['unknown']}),false)
})

test('only selected red checks are emailed; manual failures remain visible',()=>{
  const settings={...defaultSettings(),alertCategories:['forms'],manual:{'form:retreat-interest':{status:'fail',checkedAt:'2026-09-24T10:00:00Z'}}}
  const report=addManualChecks({results:[{category:'media',name:'Missing image',status:'fail'},{category:'forms',name:'Contact form',status:'pass'}]},settings)
  assert.equal(report.summary.fail,2)
  assert.deepEqual(alertFailures(report,settings).map(item=>item.name),['retreat-interest form delivery'])
})

test('cookie audit distinguishes a gated iframe from an active third-party iframe',()=>{
  assert.equal(hasPrematureThirdParty('<iframe data-consent-src="https://maps.google.com/maps"></iframe>'),false)
  assert.equal(hasPrematureThirdParty('<iframe src="https://maps.google.com/maps"></iframe>'),true)
  assert.equal(hasPrematureThirdParty('<script src="https://www.googletagmanager.com/gtag/js"></script>'),true)
})

test('saved Instagram reports link to the Behold account, not the raw feed',()=>{
  const report=addManualChecks({results:[{category:'integrations',name:'Instagram feed',status:'fail',detail:'HTTP 402',url:'https://feeds.behold.so/old-feed'}]},defaultSettings())
  assert.equal(report.results[0].url,'https://app.behold.so/sign-in')
  assert.match(report.results[0].detail,/Behold returned HTTP 402/)
})
