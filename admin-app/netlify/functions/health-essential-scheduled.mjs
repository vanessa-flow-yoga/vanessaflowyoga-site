import {emailConfigured,sendHealthEmail} from '../../lib/health-email.mjs'
import {notifyHealth} from '../../lib/health-notifications.mjs'
import {runEssential,combineHealth} from '../../lib/health-essential.mjs'
import {readSettings,readReport,addManualChecks,readNotificationState,writeNotificationState,writeEssentialReport} from './health-store.mjs'
export default async function handler(){
 const settings=await readSettings(),essential=await runEssential()
 await writeEssentialReport(essential)
 const full=await readReport()
 const report=addManualChecks(combineHealth(full,essential),settings)
 const result=await notifyHealth({report,settings,state:await readNotificationState(),send:sendHealthEmail,configured:emailConfigured()})
 await writeNotificationState(result.state)
 if(result.outcomes.some(item=>item.status==='failed'))throw Error('Health alert could not be sent; see Site health delivery status.')
}
