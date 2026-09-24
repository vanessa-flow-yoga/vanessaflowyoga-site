import {runAudit} from './health-audit.mjs'
import {readSettings,writeReport,addManualChecks} from './health-store.mjs'

export function alertFailures(report,settings){return report.results.filter(item=>item.status==='fail'&&settings.alertCategories.includes(item.category))}

export default async function handler(){
  const settings=await readSettings()
  const report=addManualChecks(await runAudit(),settings)
  const failures=alertFailures(report,settings)
  const key=process.env.RESEND_API_KEY,from=process.env.HEALTH_ALERT_FROM
  report.notification={status:failures.length?'pending':'not-needed',count:failures.length}
  await writeReport(report)
  if(!failures.length)return
  if(!key||!from||!settings.recipients.length){report.notification.status='not-configured';await writeReport(report);return}
  const lines=[`Vanessa Flow Yoga health check found ${failures.length} selected issue(s).`,`Checked: ${report.checkedAt}`,'',...failures.slice(0,25).map(item=>`• ${item.name}: ${item.detail}${item.url?` (${item.url})`:''}`),'','Open your Vanessa Flow Yoga admin → Site health for all results.']
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:settings.recipients,subject:`Vanessa Flow Yoga: ${failures.length} website health alert${failures.length===1?'':'s'}`,text:lines.join('\n')}),signal:AbortSignal.timeout(15000)})
  report.notification.status=sent.ok?'sent':'failed'
  report.notification.at=new Date().toISOString()
  report.notification.detail=sent.ok?'':`Email provider returned HTTP ${sent.status}`
  await writeReport(report)
  if(!sent.ok)throw Error(report.notification.detail)
}
