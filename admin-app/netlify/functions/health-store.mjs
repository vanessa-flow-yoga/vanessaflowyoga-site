import {getStore} from '@netlify/blobs'
import {CATEGORIES,FORMS} from './health-audit.mjs'

const store = () => getStore({name:'vfy-health',consistency:'strong'})
export const manualItems = [
  ...FORMS.map(name=>({id:`form:${name}`,label:`${name} form delivery`,url:name==='retreat-interest'?'/retreats':name==='application'?'/work-with-us':`/${name}`})),
  {id:'cookies',label:'Cookie consent and GDPR review',url:'/cookies'},
  {id:'speed',label:'Real-world page speed review',url:'/'},
  {id:'mobile',label:'Mobile layout review',url:'/'},
]

export function defaultSettings() {
  return {recipients:['hello@charlie-harris.com','vanessa@vanessaflowyoga.co.uk'],alertCategories:[...CATEGORIES,'cookies','mobile'],manual:{}}
}

export function validSettings(value) {
  if(!value || !Array.isArray(value.recipients) || value.recipients.length>5 ||
      value.recipients.some(email=>typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !Array.isArray(value.alertCategories) || value.alertCategories.some(category=>![...CATEGORIES,'cookies','speed','mobile'].includes(category)))return false
  return true
}

export async function readSettings() {return await store().get('settings',{type:'json'}) || defaultSettings()}
export async function writeSettings(value) {await store().setJSON('settings',value)}
export async function readReport() {return await store().get('latest-report',{type:'json'})}
export async function writeReport(value) {await store().setJSON('latest-report',value)}
export function addManualChecks(report,settings) {
  const results=[...report.results]
  for(const item of manualItems){const record=settings.manual?.[item.id];if(record?.status==='fail')results.push({category:item.id.startsWith('form:')?'forms':item.id,name:item.label,status:'fail',detail:`Manual check failed on ${record.checkedAt?.slice(0,10)||'an unknown date'}`,url:item.url})}
  return {...report,results,summary:{pass:results.filter(r=>r.status==='pass').length,fail:results.filter(r=>r.status==='fail').length,warn:results.filter(r=>r.status==='warn').length}}
}
