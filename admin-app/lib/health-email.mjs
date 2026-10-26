export function emailConfigured(env=process.env){return !!(env.RESEND_API_KEY&&env.HEALTH_ALERT_FROM)}
export async function sendHealthEmail({recipients,subject,text,env=process.env,request=fetch}){
  if(!emailConfigured(env))throw Error('Email sending is not configured on this admin project.')
  if(!recipients.length)throw Error('Save at least one alert recipient first.')
  const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.HEALTH_ALERT_FROM,to:recipients,subject,text}),signal:AbortSignal.timeout(10000)})
  if(!response.ok)throw Error(`Email provider returned HTTP ${response.status}. Check the sender is verified and the API key can send email.`)
  return {status:'accepted',at:new Date().toISOString()}
}
