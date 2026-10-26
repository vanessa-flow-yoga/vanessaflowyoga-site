import {emailConfigured,sendHealthEmail} from '../../lib/health-email.mjs'
import {runAudit} from './health-audit.mjs'
import {readSettings,writeReport,addManualChecks} from './health-store.mjs'

export function alertFailures(report,settings){return report.results.filter(item=>item.status==='fail'&&settings.alertCategories.includes(item.category))}

export default async function handler(){
  const settings=await readSettings()
  const report=addManualChecks(await runAudit(),settings)
  const failures=alertFailures(report,settings)
  report.notification={status:failures.length?'pending':'not-needed',count:failures.length}
  await writeReport(report)
  if(!failures.length)return
  if(!emailConfigured()||!settings.recipients.length){report.notification.status='not-configured';await writeReport(report);return}
  const lines=[`Vanessa Flow Yoga health check found ${failures.length} selected issue(s).`,`Checked: ${report.checkedAt}`,'',...failures.slice(0,25).map(item=>`• ${item.name}: ${item.detail}${item.url?` (${item.url})`:''}`),'','Open your Vanessa Flow Yoga admin → Site health for all results.']
  try{
    await sendHealthEmail({recipients:settings.recipients,subject:`Vanessa Flow Yoga: ${failures.length} website health alert${failures.length===1?'':'s'}`,text:lines.join('\n')})
    report.notification.status='sent'
    report.notification.detail='Accepted by email provider; inbox delivery must be confirmed separately.'
  }catch(error){
    report.notification.status='failed'
    report.notification.detail=error.message.startsWith('Email provider returned HTTP')?error.message:'Email request failed; check sender setup and provider availability.'
  }
  report.notification.at=new Date().toISOString()
  await writeReport(report)
  if(report.notification.status==='failed')throw Error(report.notification.detail)
}
