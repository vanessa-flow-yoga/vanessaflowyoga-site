// Server-only credential checks; never include tokens or response bodies in reports.
export function credentialStatus(now=new Date(),env=process.env){
  const expiresAt=env.VFY_GITHUB_TOKEN_EXPIRES_AT||''
  const timestamp=/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)?Date.parse(`${expiresAt}T00:00:00Z`):NaN
  const validDate=Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===expiresAt
  const daysLeft=validDate?Math.ceil((timestamp-now.getTime())/86400000):null
  const status=!env.VFY_GITHUB_CONTENT_TOKEN?'missing':daysLeft===null?'unknown':daysLeft<=0?'expired':daysLeft<=14?'expiring':'ok'
  return {expiresAt,daysLeft,status}
}
export async function credentialChecks({env=process.env,now=new Date(),request=fetch}={}){
  const credential=credentialStatus(now,env)
  const results=[{category:'github',name:'Admin token expiry',status:credential.status==='ok'?'pass':'fail',detail:credential.status==='missing'?'Admin content token is missing':credential.status==='unknown'?'Set VFY_GITHUB_TOKEN_EXPIRES_AT to the actual token expiry date':`Renew admin content token before ${credential.expiresAt} (${credential.daysLeft} days remaining)`}]
  if(!env.VFY_GITHUB_CONTENT_TOKEN)return results
  try{
    const response=await request('https://api.github.com/repos/vanessa-flow-yoga/vanessaflowyoga-site/contents/content/page-copy/home.json?ref='+encodeURIComponent(env.VFY_ADMIN_WRITE_BRANCH||'codex/vanessa-content-editor'),{headers:{Authorization:`Bearer ${env.VFY_GITHUB_CONTENT_TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'VanessaFlowYoga-Health'},redirect:'error',signal:AbortSignal.timeout(4000)})
    response.body?.cancel()
    results.push({category:'github',name:'Admin content connection',status:response.ok?'pass':'fail',detail:response.ok?'Authenticated content read succeeded':`Authenticated content read failed (HTTP ${response.status}); check token expiry, repository access and branch`})
  }catch{results.push({category:'github',name:'Admin content connection',status:'fail',detail:'Authenticated content read unavailable; retry and check the admin connection'})}
  return results
}
