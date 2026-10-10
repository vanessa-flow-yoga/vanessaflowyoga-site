// Only known Momence settings are extracted; pasted HTML is never executed.
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function parseForm(code) {
  if (typeof code !== 'string' || code.length > 12000) throw Error('Paste the Momence lead form embed code (under 12,000 characters).');
  const scripts = [...code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if (scripts.length !== 1 || scripts[0][2].trim()) throw Error('Use one Momence lead form script with no custom JavaScript.');
  const attrs = {};
  for (const match of scripts[0][1].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    if (Object.hasOwn(attrs,match[1])) throw Error('Duplicate form setting.');
    attrs[match[1]] = (match[2] ?? match[3]).replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
  }
  if (attrs.src !== 'https://momence.com/plugin/lead-form/lead-form.js' || attrs.host_id !== '13063' || !/^\d+$/.test(attrs.source_id || '') || !/^[A-Za-z0-9]+$/.test(attrs.token || '') || attrs.data_collect_consent !== 'required') throw Error('Use the Vanessa Flow Yoga Momence lead form with required consent.');
  const allowed = ['firstName','lastName','email','phoneNumber'];
  const fields = (attrs.fields || '').split(',');
  if (!fields.includes('email') || fields.some(key => !allowed.includes(key)) || new Set(fields).size !== fields.length) throw Error('Use first name, last name, email and/or phone fields.');
  if (!/^[a-z]{2}$/.test(attrs.country_code || '')) throw Error('Check the form country code.');
  let definitions;
  try { definitions = JSON.parse(attrs['data-field-def']); } catch { throw Error('Check the Momence field definitions.'); }
  if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) throw Error('Check the Momence field definitions.');
  const clean = {};
  for (const key of fields) {
    const spec = definitions[key];
    const type = key === 'email' ? 'email' : key === 'phoneNumber' ? 'phone-number' : 'text';
    if (!spec || spec.type !== type || typeof spec.label !== 'string' || spec.label.length > 80 || typeof spec.required !== 'boolean') throw Error('Check each form field label, type and required setting.');
    clean[key] = {type, label:spec.label, required:spec.required};
  }
  attrs['data-field-def'] = JSON.stringify(clean);
  if (typeof attrs['data-on-success-msg'] !== 'string' || attrs['data-on-success-msg'].length > 500) throw Error('Keep the success message under 500 characters.');
  const keys = ['host_id','fields','token','country_code','source_id','data_collect_consent','data-field-def','data-on-success-msg','src'];
  const script = '<script async type="module" id="momence-plugin-lead-form-src" ' + keys.map(key => `${key}="${escape(attrs[key])}"`).join(' ') + '></script>';
  const colours = { '--momenceColorBackground':'#FBFBFB', '--momenceColorPrimary':'230,229,193', '--momenceColorBlack':'3,1,13' };
  for (const key of Object.keys(colours)) {
    const match = new RegExp(key+'\\s*:\\s*([^;}]+)').exec(code);
    if (match) {
      const value = match[1].trim();
      if (!(key.endsWith('Background') ? /^#[a-fA-F0-9]{6}$/.test(value) : /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value) && value.split(',').every(n => Number(n)<=255))) throw Error('Check the Momence colour settings.');
      colours[key] = value;
    }
  }
  return {script, style:Object.entries(colours).map(([key,value])=>`${key}:${value}`).join(';')};
}
function validVideo(value) {
  return typeof value === 'string' && (/^\/videos\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.mp4$/.test(value) || /^https:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]*)?$/.test(value));
}
function renderTeaser(html, data) {
  if (data.hero_video !== undefined) {
    if (!validVideo(data.hero_video)) throw Error('Choose an MP4 video from the website or an HTTPS MP4 link.');
    html = html.replace(/(<source data-src=")[^"]+(" type="video\/mp4">)/, (_,a,b)=>a+escape(data.hero_video)+b);
  }
  if (data.hero_image) html = html.replace(/(id="retreat-video"[^>]*poster=")[^"]+"/, (_,a)=>a+escape(data.hero_image)+'"');
  if (data.momence_form_code !== undefined) {
    const form = parseForm(data.momence_form_code);
    html = html.replace(/(<div class="r-form" style=")[^"]+"/,(_,a)=>a+escape(form.style)+'"');
    html = html.replace(/(<template id="retreat-lead-script">)[\s\S]*?(<\/template>)/,(_,a,b)=>a+form.script+b);
  }
  return html;
}
module.exports = {parseForm, validVideo, renderTeaser};
