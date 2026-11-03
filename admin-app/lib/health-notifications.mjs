const ADMIN='https://admin.vanessaflowyoga.co.uk/admin/'
export function londonWeek(now=new Date()){
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  const date=new Date(day+'T12:00:00Z')
  date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7)
  return date.toISOString().slice(0,10)
}
export function failureKey(item){return item.notificationKey||`${item.category}:${item.name}`}
const line=item=>`• ${item.name}: ${item.detail||item.status}`
export function weeklyMessage(report,now=new Date()){
  const issues=report.results.filter(item=>item.status!=='pass')
  return {subject:`Vanessa Flow Yoga: weekly website status — ${report.summary.fail?'action needed':report.summary.warn?'review needed':'checks passed'}`,text:[
    'Your weekly Vanessa Flow Yoga website status',
    `Report: ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'full',timeStyle:'short'}).format(now)}`,
    `Latest full audit: ${report.checkedAt}`,
    `${report.summary.pass} passed · ${report.summary.fail} failed · ${report.summary.warn} need review`,
    '',...issues.map(line),
    ...(issues.length?[]:['All monitored checks passed.']),
    '', 'Token and publishing connection:',...report.results.filter(item=>item.category==='github').map(line),
    '', 'Full results: '+ADMIN,
    'Monitoring checks responses, configuration and integrations. It does not prove form inbox delivery, complete a purchase or certify every visual layout.'
  ].join('\n')}
}
export async function notifyHealth({report,settings,state={},send,configured,now=new Date(),allowWeekly=false}){
  const next={schema_version:'1.0',...state},outcomes=[]
  const failures=report.results.filter(item=>item.status==='fail'&&settings.alertCategories.includes(item.category))
  const keys=failures.map(failureKey).sort(),previous=state.activeFailures||[]
  const added=keys.filter(key=>!previous.includes(key)),resolved=previous.filter(key=>!keys.includes(key))
  const recipients=[...settings.recipients].sort().join(',')
  const week=londonWeek(now)
  const weeklyDue=allowWeekly&&state.weeklyKey!==week
  const alertDue=added.length||resolved.length||(keys.length&&state.recipientKey!==recipients)
  const deliver=async(type,message)=>{
    const outcome={type,status:!configured?'not-configured':!settings.recipients.length?'no-recipients':'pending',at:now.toISOString()}
    if(outcome.status==='pending'){
      try{await send({recipients:settings.recipients,...message});outcome.status='accepted';outcome.detail='Email provider accepted the message; inbox delivery is separate.'}
      catch(error){outcome.status='failed';outcome.detail=error.message.startsWith('Email provider returned HTTP')?error.message:'Email request failed. Check sender setup and provider availability.'}
    }
    next.lastDelivery=outcome;outcomes.push(outcome)
    return outcome.status==='accepted'
  }
  if(alertDue){
    const newFailures=failures.filter(item=>added.includes(failureKey(item)))
    const message={subject:`Vanessa Flow Yoga: ${failures.length?'website alert':'monitored issue resolved'}`,text:[
      failures.length?`${failures.length} monitored issue(s) need attention.`:'Previously alerted checks no longer report a selected failure.',
      `Checked: ${report.checkedAt}`, '',
      ...(newFailures.length?['New or escalated issues:',...newFailures.map(line),'']:[]),
      ...(failures.length?['Current issues:',...failures.map(line),'']:[]),
      ...(resolved.length?[`${resolved.length} previously alerted issue(s) cleared or changed severity.`,'']:[]),
      'Full results: '+ADMIN
    ].join('\n')}
    if(await deliver('alert',message)){next.activeFailures=keys;next.recipientKey=recipients;next.lastAlertSentAt=now.toISOString()}
  }
  if(weeklyDue&&await deliver('weekly',weeklyMessage(report,now))){next.weeklyKey=week;next.lastWeeklySentAt=now.toISOString()}
  return {state:next,outcomes}
}
