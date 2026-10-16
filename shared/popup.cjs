/* Popup content contract, schema 1.0. Text is always rendered as text. */
function validLink(value) {
  if (typeof value !== 'string' || /[\\\s<>"']/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return !value.includes('..');
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function validate(data) {
  if (!data || data.schema_version !== '1.0' || typeof data.enabled !== 'boolean') return 'Check the popup on/off setting.';
  for (const [key,max] of Object.entries({eyebrow:45,headline:70,message:320,button_text:35,image_alt:130})) {
    if (typeof data[key] !== 'string' || data[key].length > max || (['headline','message'].includes(key) && !data[key].trim())) return 'Check the popup '+key.replaceAll('_',' ')+'.';
  }
  if (typeof data.button_url !== 'string' || (!!data.button_text.trim() !== !!data.button_url.trim()) || (data.button_url && !validLink(data.button_url))) return 'Add both button wording and a website path or HTTPS link, or leave both blank.';
  if (typeof data.image !== 'string' || (data.image && !/^\/images\/[A-Za-z0-9_\-/%.]+$/.test(data.image)) || data.image.includes('..')) return 'Choose a website photo.';
  if (!Number.isInteger(data.delay_seconds) || data.delay_seconds < 0 || data.delay_seconds > 60) return 'Choose a delay from 0 to 60 seconds.';
  if (!['homepage','all'].includes(data.pages)) return 'Choose homepage or all pages.';
  if (typeof data.schedule_enabled !== 'boolean') return 'Check the schedule toggle.';
  const date = value => value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
  if (!date(data.start_date) || !date(data.end_date) || (data.start_date && data.end_date && data.start_date > data.end_date)) return 'Choose valid start and end dates in order.';
  if (data.schedule_enabled && !data.start_date && !data.end_date) return 'Choose a start or end date for the schedule.';
  return null;
}
module.exports = {validate,validLink};
