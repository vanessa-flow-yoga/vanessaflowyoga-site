const SITE = 'https://vanessaflowyoga.co.uk'
const ADMIN = 'https://vanessa-flow-yoga-admin.netlify.app'
const FORMS = ['contact', 'membership', 'application', 'retreat-interest']
const CATEGORIES = ['availability', 'pages', 'links', 'security', 'seo', 'forms', 'media', 'speed', 'integrations', 'github']

const timeLimit = 4000
async function get(url, method = 'GET') {
  return fetch(url, {method, redirect:'follow', headers:{'user-agent':'VanessaFlowYoga-Health/2.0'}, signal:AbortSignal.timeout(timeLimit)})
}
async function probe(url) {
  try {
    let response = await get(url, 'HEAD')
    if (response.status === 405) {response.body?.cancel();response = await get(url)}
    const status = response.status
    response.body?.cancel()
    return {status, ok:status>=200&&status<400, warning:status===401||status===403||status===429}
  } catch (error) {return {status:0, ok:false, detail:error.message}}
}
async function parallel(items, limit, task) {
  let next = 0
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const index=next++;await task(items[index],index)}
  }))
}
function urls(html, base, expression) {
  return [...html.matchAll(expression)].map(match=>{
    try {return new URL(match[1].replaceAll('&amp;','&'),base).href} catch {return null}
  }).filter(Boolean)
}
function pagePath(url) {try{return new URL(url).pathname}catch{return ''}}
function result(category, name, status, detail = '', url = '') {return {category,name,status,detail,url}}

export async function runAudit({site=SITE,admin=ADMIN}={}) {
  const checkedAt=new Date().toISOString(), results=[]
  const add=(category,name,status,detail='',url='')=>results.push(result(category,name,status,detail,url))
  let home, sitemap,library
  const homeStart=Date.now()
  try {home=await get(site+'/');add('availability','Website live',home.ok?'pass':'fail',`HTTP ${home.status}`,site+'/')
    add('speed','Homepage server response',Date.now()-homeStart<3000?'pass':'warn',`${Date.now()-homeStart} ms from this monitor; not a visitor speed score`)}
  catch(error){add('availability','Website live','fail',error.message,site+'/')}
  try {sitemap=await get(site+'/sitemap.xml');add('seo','Sitemap available',sitemap.ok?'pass':'fail',`HTTP ${sitemap.status}`,site+'/sitemap.xml')}
  catch(error){add('seo','Sitemap available','fail',error.message,site+'/sitemap.xml')}
  if(home?.ok){
    const headers=home.headers
    add('security','HTTPS and certificate',home.url.startsWith('https:')?'pass':'fail',home.url)
    for(const [name,header] of [['Content Security Policy','content-security-policy'],['Strict Transport Security','strict-transport-security'],['No MIME sniffing','x-content-type-options'],['Referrer Policy','referrer-policy']])add('security',name,headers.has(header)?'pass':'fail',headers.has(header)?'Present':'Missing')
    home.body?.cancel()
  }
  const adminProbe=await probe(admin+'/admin/')
  add('availability','Admin sign-in page',adminProbe.ok?'pass':'fail',adminProbe.detail||`HTTP ${adminProbe.status}`,admin+'/admin/')
  const identity=await probe(admin+'/.netlify/identity/settings')
  add('security','Admin login service',identity.ok?'pass':'fail',identity.detail||`HTTP ${identity.status}`,admin+'/.netlify/identity/settings')
  const github=await probe('https://api.github.com/repos/vanessa-flow-yoga/vanessaflowyoga-site')
  add('github','GitHub repository responding',github.ok?'pass':'fail',github.detail||`HTTP ${github.status}`)
  let pagePaths=[]
  if(sitemap?.ok){const xml=await sitemap.text();pagePaths=[...new Set([...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match=>pagePath(match[1])).filter(Boolean))]}
  try {const response=await get(admin+'/admin/media-library.json');if(response.ok){library=await response.json();pagePaths=[...new Set([...pagePaths,...(library.pages||[])])]}else add('media','Media inventory','warn',`HTTP ${response.status}`)}catch(error){add('media','Media inventory','warn',error.message)}
  add('seo','Pages listed in sitemap',pagePaths.length?'pass':'fail',`${pagePaths.length} pages`)
  const pageData=[]
  await parallel(pagePaths,20,async pathname=>{
    const url=new URL(pathname,site).href
    try {const response=await get(url);if(!response.ok){add('pages',pathname,'fail',`HTTP ${response.status}`,url);response.body?.cancel();return}
      const html=await response.text();add('pages',pathname,/<html\b/i.test(html)?'pass':'fail',`HTTP ${response.status}`,url);pageData.push({url,pathname,html})
      const description=/<meta\s+name=["']description["'][^>]*content=["'][^"']+/i.test(html)
      const canonical=/<link\s+rel=["']canonical["'][^>]*href=["']https:\/\//i.test(html)
      if(!description||!canonical){const auxiliary=['/thanks.html','/thankyou.html','/404.html'].includes(pathname);add('seo',`Metadata ${pathname}`,auxiliary?'warn':'fail',`${description?'':'Description missing. '}${canonical?'':'Canonical missing.'}`,url)}
      if(pathname.startsWith('/post/')){const social=/<meta\s+property=["']og:image["'][^>]*content=["']https:\/\//i.test(html);const schema=html.includes('"@type":"BlogPosting"')||html.includes('"@type": "BlogPosting"');if(!social||!schema)add('seo',`Blog SEO ${pathname}`,'fail',`${social?'':'Social image missing. '}${schema?'':'Article schema missing.'}`,url)}
    }catch(error){add('pages',pathname,'fail',error.message,url)}
  })
  if(pagePaths.length&&pageData.length===pagePaths.length)add('seo','Page metadata',results.some(r=>r.category==='seo'&&r.name.startsWith('Metadata ')&&r.status==='fail')?'fail':'pass',`${pageData.length} pages checked`)
  const internal=new Set(),external=new Set(),images=new Set(),forms=new Map()
  for(const {url,pathname,html} of pageData){
    for(const link of urls(html,url,/\bhref\s*=\s*["']([^"']+)["']/gi)){
      if(/^(?:mailto:|tel:|javascript:|data:)/i.test(link))continue
      const parsed=new URL(link)
      if(parsed.origin===new URL(site).origin)internal.add(parsed.origin+parsed.pathname+parsed.search)
      else if(parsed.protocol==='https:'||parsed.protocol==='http:')external.add(parsed.href)
    }
    for(const image of urls(html,url,/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi))if(image.startsWith(site+'/'))images.add(image)
    for(const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)){
      const name=/\bname=["']([^"']+)["']/i.exec(match[1])?.[1]
      if(name&&/\bmethod=["']POST["']/i.test(match[1]))forms.set(name,{pathname,markup:match[0]})
    }
  }
  const robots=await probe(site+'/robots.txt')
  add('seo','Robots file',robots.ok?'pass':'fail',robots.detail||`HTTP ${robots.status}`,site+'/robots.txt')
  await parallel([...internal],25,async url=>{const check=await probe(url);add('links',`Internal ${new URL(url).pathname}`,(check.ok?'pass':'fail'),check.detail||`HTTP ${check.status}`,url)})
  await parallel([...external],30,async url=>{const check=await probe(url);add('links',`External ${new URL(url).hostname}`,check.ok?'pass':check.warning||!check.status?'warn':'fail',check.detail||`HTTP ${check.status}`,url)})
  for(const name of FORMS){const entry=forms.get(name);const found=!!entry&&new RegExp(`name=["']form-name["'][^>]*value=["']${name}["']`,'i').test(entry.markup);add('forms',`${name} form recognised`,found?'pass':'fail',entry?.pathname||'Not found')}
  for(const asset of library?.assets||[])images.add(site+asset.path)
  await parallel([...images],30,async url=>{const check=await probe(url);add('media',pagePath(url),check.ok?'pass':'fail',check.detail||`HTTP ${check.status}`,url)})
  const behold=pageData.map(page=>/data-behold-url=["'](https:\/\/feeds\.behold\.so\/[^"']+)["']/i.exec(page.html)?.[1]).find(Boolean)
  if(behold){const check=await probe(behold);add('integrations','Instagram feed',check.ok?'pass':check.warning?'warn':'fail',check.detail||`HTTP ${check.status}`,behold)}
  else add('integrations','Instagram feed','warn','Feed address was not found in page links')
  const momence=[...external].find(url=>new URL(url).hostname.endsWith('momence.com'))
  if(momence){const check=await probe(momence);add('integrations','Momence booking link',check.ok?'pass':check.warning?'warn':'fail',check.detail||`HTTP ${check.status}`,momence)}
  else add('integrations','Momence booking link','fail','No booking link found')
  const reviewsPage=pageData.find(page=>page.html.includes('id="reviewsGrid"')||page.html.includes("id='reviewsGrid'"))
  if(reviewsPage){const host=/id=["']reviewsGrid["'][^>]*data-host=["'](\d+)["']/i.exec(reviewsPage.html)?.[1];const signature=/id=["']reviewsGrid["'][^>]*data-signature=["']([a-f0-9]+)["']/i.exec(reviewsPage.html)?.[1]
    if(host&&signature){const url=`https://api.momence.com/host-plugins/host/${host}/reviews?pageSize=27&page=0&isFullLastNameVisible=false&isTextOnlyEnabled=true&s=${signature}`;const check=await probe(url);add('integrations','Momence reviews feed',check.ok?'pass':check.warning?'warn':'fail',check.detail||`HTTP ${check.status}`,url)}
    else add('integrations','Momence reviews feed','warn','Reviews embed settings not found')}
  return {checkedAt,site,results,summary:{pass:results.filter(r=>r.status==='pass').length,fail:results.filter(r=>r.status==='fail').length,warn:results.filter(r=>r.status==='warn').length},categories:CATEGORIES}
}

export {CATEGORIES,FORMS}
