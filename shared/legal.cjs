/* Legal document schema 1.0. Safe text, paragraphs, bullet lists and links. */
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function validLink(value) {
  if (/\s|[<>"'\\]/.test(value)) return false;
  return /^(?:mailto:[A-Za-z0-9.!#$%&*+\-/=?^_`{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|tel:\+?[0-9-]+|https:\/\/[^\s]+|\/(?!\/)[A-Za-z0-9_/#.?=&%+-]*|[a-z0-9-]+\.html(?:#[a-z0-9-]+)?)$/.test(value);
}
function inline(text) {
  const parts=String(text).split(/(\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*)/g);
  return parts.map(part=>{
    const link=/^\[([^\]\n]+)\]\(([^\s)]+)\)$/.exec(part);
    if(link && validLink(link[2]))return '<a href="'+esc(link[2])+'">'+esc(link[1])+'</a>';
    if(/^\*\*[^*\n]+\*\*$/.test(part))return '<strong>'+esc(part.slice(2,-2))+'</strong>';
    return esc(part);
  }).join('');
}
function validate(data) {
  if(data?.schema_version!=='1.0')return 'The document version is missing.';
  if(typeof data.updated!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.updated)||Number.isNaN(Date.parse(data.updated))||new Date(data.updated).toISOString().slice(0,10)!==data.updated)return 'Choose a valid updated date.';
  if(!Array.isArray(data.sections)||!data.sections.length||data.sections.length>40)return 'Add at least one document section (40 maximum).';
  const seen=new Set();
  for(const section of data.sections){
    if(!section || typeof section.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id)||seen.has(section.id))return 'Each section needs a unique reference using lowercase letters and hyphens.';
    seen.add(section.id);
    if(typeof section.heading!=='string'||!section.heading.trim()||section.heading.length>160||typeof section.body!=='string'||!section.body.trim()||section.body.length>20000)return 'Complete each section heading and text.';
    for(const link of section.body.matchAll(/\[[^\]\n]+\]\(([^\s)]+)\)/g))if(!validLink(link[1]))return 'Use a website path, HTTPS, email or phone link.';
  }
  return null;
}
function render(data) {
  const error=validate(data);if(error)throw Error(error);
  const date=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(data.updated+'T12:00:00Z'));
  return '<p class="legal-updated">Last updated: '+date+'</p>\n'+data.sections.map(section=>'<h2 id="'+esc(section.id)+'">'+esc(section.heading)+'</h2>\n'+section.body.split(/\n\s*\n/).filter(Boolean).map(block=>block.split('\n').every(line=>line.startsWith('- '))?'<ul>'+block.split('\n').map(line=>'<li>'+inline(line.slice(2))+'</li>').join('')+'</ul>':'<p>'+inline(block).replaceAll('\n','<br>')+'</p>').join('\n')).join('\n');
}
module.exports={validate,render,inline};
