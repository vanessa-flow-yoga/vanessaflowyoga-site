import {emailConfigured,sendHealthEmail} from '../../lib/health-email.mjs'
import {notifyHealth} from '../../lib/health-notifications.mjs'
import {runAudit} from './health-audit.mjs'
import {readSettings,writeReport,addManualChecks,readNotificationState,writeNotificationState} from './health-store.mjs'
export function alertFailures(report,settings){return report.results.filter(item=>item.status==='fail'&&settings.alertCategories.includes(item.category))}
export default async function handler(){
 const settings=await readSettings()
 const raw=await runAudit()
 await writeReport(raw)
 const report=addManualChecks(raw,settings)
 const result=await notifyHealth({report,settings,state:await readNotificationState(),send:sendHealthEmail,configured:emailConfigured(),allowWeekly:true})
 await writeNotificationState(result.state)
 if(result.outcomes.some(item=>item.status==='failed'))throw Error('Health email could not be sent; see Site health delivery status.')
}
