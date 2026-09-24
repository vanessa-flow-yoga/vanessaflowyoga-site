import {getUser} from '@netlify/identity'

export default async function handler() {
  const user = await getUser()
  if (!user) return Response.json({error:'Please sign in again.'},{status:401})
  if (!user.roles?.includes('admin')) return Response.json({error:'Admin access required.'},{status:403})
  try {
    const headers={Accept:'application/vnd.github+json','User-Agent':'VanessaFlowYoga-Admin'}
    if(process.env.VFY_GITHUB_CONTENT_TOKEN)headers.Authorization=`Bearer ${process.env.VFY_GITHUB_CONTENT_TOKEN}`
    const result=await fetch('https://api.github.com/repos/vanessa-flow-yoga/vanessaflowyoga-site/actions/workflows/site-health.yml/runs?per_page=1',
      {headers,signal:AbortSignal.timeout(10000)})
    if(!result.ok)return Response.json({status:'unavailable',message:'Health monitoring is not connected yet.'})
    const data=await result.json()
    const run=data.workflow_runs?.[0]
    if(!run)return Response.json({status:'pending',message:'No completed health check yet.'})
    const checkedAt=run.run_started_at||run.created_at
    const stale=Date.now()-Date.parse(checkedAt)>36*60*60*1000
    const status=stale?'stale':run.status!=='completed'?'running':run.conclusion==='success'?'healthy':'attention'
    return Response.json({status,checkedAt,url:run.html_url,
      message:status==='healthy'?'Last scheduled check passed.':status==='attention'?'The last check found a problem.':status==='stale'?'Health checks have not run recently.':'Check in progress.'})
  }catch{return Response.json({status:'unavailable',message:'Could not reach the health monitor.'})}
}
