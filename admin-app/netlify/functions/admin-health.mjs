import {getUser,verifyRequestOrigin} from '@netlify/identity'
import {runAudit,CATEGORIES} from './health-audit.mjs'
import {manualItems,validSettings,readSettings,writeSettings,readReport,writeReport,addManualChecks} from './health-store.mjs'

const tokenExpiry=process.env.VFY_GITHUB_TOKEN_EXPIRES_AT||'2026-10-24'
export function credentialStatus(now=new Date()){
  const daysLeft=Math.ceil((new Date(`${tokenExpiry}T00:00:00Z`).getTime()-now.getTime())/86400000)
  return {expiresAt:tokenExpiry,daysLeft,status:!process.env.VFY_GITHUB_CONTENT_TOKEN?'missing':daysLeft<=0?'expired':daysLeft<=14?'expiring':'ok'}
}
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}})

export default async function handler(req){
  const user=await getUser()
  if(!user)return response({error:'Please sign in again.'},401)
  if(!user.roles?.includes('admin'))return response({error:'Admin access required.'},403)
  try{
    const url=new URL(req.url)
    if(req.method==='GET'){
      const [settings,rawReport]=await Promise.all([readSettings(),readReport()])
      const report=rawReport?addManualChecks(rawReport,settings):null
      const stale=report&&Date.now()-Date.parse(report.checkedAt)>36*60*60*1000
      return response({report,status:!report?'not-run':stale?'stale':report.summary.fail?'attention':report.summary.warn?'warning':'healthy',settings,manualItems,categories:CATEGORIES,credential:credentialStatus(),alertsConfigured:!!(process.env.RESEND_API_KEY&&process.env.HEALTH_ALERT_FROM)})
    }
    verifyRequestOrigin(req)
    if(req.method==='PUT'){
      const value=await req.json()
      if(!validSettings(value))return response({error:'Check the email addresses and alert choices.'},400)
      const current=await readSettings()
      const settings={...current,recipients:[...new Set(value.recipients.map(email=>email.trim().toLowerCase()))],alertCategories:[...new Set(value.alertCategories)]}
      await writeSettings(settings)
      return response({settings,message:'Email alert choices saved.'})
    }
    if(req.method==='POST'&&url.searchParams.get('manual')){
      const id=url.searchParams.get('manual'),value=await req.json()
      if(!manualItems.some(item=>item.id===id)||!['pass','fail'].includes(value.status))return response({error:'Unknown check result.'},400)
      const settings=await readSettings()
      settings.manual={...settings.manual,[id]:{status:value.status,checkedAt:new Date().toISOString(),by:user.email||'admin'}}
      await writeSettings(settings)
      return response({settings,message:'Manual test result recorded.'})
    }
    if(req.method==='POST'&&url.searchParams.get('run')==='1'){
      const report=await runAudit()
      await writeReport(report)
      return response({report:addManualChecks(report,await readSettings()),message:'Checks finished.'})
    }
    return response({error:'Method not allowed.'},405)
  }catch(error){return response({error:'Health check is unavailable. '+(error?.message||'Please try again.')},500)}
}
