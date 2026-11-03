import {credentialChecks} from './credential-health.mjs'
export async function runEssential({request=fetch,now=new Date(),env=process.env}={}){
  const checks=[['Website live','https://vanessaflowyoga.co.uk/'],['Admin sign-in page','https://admin.vanessaflowyoga.co.uk/admin/'],['Admin login service','https://admin.vanessaflowyoga.co.uk/.netlify/identity/settings']]
  const results=await Promise.all(checks.map(async([name,url])=>{
    let status='fail',detail='Could not reach the service'
    try{const response=await request(url,{redirect:'follow',signal:AbortSignal.timeout(4000)});status=response.ok?'pass':'fail';detail=`HTTP ${response.status}`;response.body?.cancel()}catch{}
    return {category:name==='Admin login service'?'security':'availability',name,status,detail,url}
  }))
  results.push(...await credentialChecks({request,now,env}))
  return {schema_version:'1.0',checkedAt:now.toISOString(),results}
}
export function combineHealth(full,essential,now=new Date()){
  if(!essential)return full
  const names=new Set(essential.results.map(item=>item.name))
  const results=[...(full?.results||[]).filter(item=>!names.has(item.name)),...essential.results]
  if(!full||now.getTime()-Date.parse(full.checkedAt)>36*3600000)results.push({category:'availability',name:'Daily full audit overdue',status:'fail',detail:full?'The full website audit is more than 36 hours old. Check the daily monitor.':'No full website audit has been recorded yet.'})
  return {schema_version:'1.0',checkedAt:full?.checkedAt||essential.checkedAt,essentialCheckedAt:essential.checkedAt,results,summary:{pass:results.filter(item=>item.status==='pass').length,fail:results.filter(item=>item.status==='fail').length,warn:results.filter(item=>item.status==='warn').length}}
}
