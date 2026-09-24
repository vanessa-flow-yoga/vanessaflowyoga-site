import YAML from 'yaml'

const pageLimits = {
  'content/page-copy/home.json': {hero_line:24,hero_accent:16,hero_lead:130,timetable_intro:130,welcome_one:230,welcome_two:230,principles_intro:140,principle_welcoming:130,principle_dedicated:130,principle_passion:130,principle_integrity:130,ways_intro:150},
  'content/page-copy/classes.json': {timetable_intro:130,categories_intro:150,reviews_intro:150,heat_one:330,heat_two:170,heat_three:340,pregnancy_one:220,pregnancy_two:260,pregnancy_three:200},
  'content/page-copy/membership.json': {hero_intro:160,newcomer_intro:170,benefits_intro:130,benefit_mood:150,benefit_temperature:150,benefit_welcome:160,benefit_community:170,benefit_teachers:140,benefit_home:160,help_intro:170},
}
const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
const image = (value) => /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(value || '')
const url = (value) => /^https:\/\//.test(value || '')

export function validateContent(path, text) {
  if (path.endsWith('.md')) {
    const match = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/.exec(text)
    if (!match) return 'The blog post needs its title and details.'
    let meta
    try { meta = YAML.parse(match[1]) } catch { return 'The blog post details could not be read.' }
    if (typeof meta?.title !== 'string' || !meta.title.trim() || meta.title.length > 100 ||
        typeof meta?.description !== 'string' || !meta.description.trim() || meta.description.length > 220 ||
        !['Beginners','Breathwork','Hot yoga','Poses','Wellbeing','Yoga 101'].includes(meta.category) ||
        !date(meta.published) || !match[2].trim()) return 'Complete the title, summary, category, date and article text.'
    if (meta.image && !image(meta.image)) return 'Choose a photo uploaded to this website.'
    if (meta.seo_title && (typeof meta.seo_title !== 'string' || meta.seo_title.length > 65)) return 'Keep the search result title under 65 characters.'
    if (meta.seo_description && (typeof meta.seo_description !== 'string' || meta.seo_description.length > 160)) return 'Keep the search result description under 160 characters.'
    if (meta.hero_alt && (typeof meta.hero_alt !== 'string' || meta.hero_alt.length > 130)) return 'Keep the cover image alt text under 130 characters.'
    if (meta.social_image && !image(meta.social_image)) return 'Choose a social image uploaded to this website.'
    return null
  }
  let value
  try { value = JSON.parse(text) } catch { return 'The content could not be read.' }
  if (value?.schema_version !== '1.0') return 'The content version is missing.'
  if (pageLimits[path]) {
    for (const [key, max] of Object.entries(pageLimits[path])) {
      if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > max) return `Check ${key.replaceAll('_',' ')} (${max} characters maximum).`
    }
  }
  if (path === 'content/prices.json') {
    if (!Array.isArray(value.plans) || value.plans.length !== 5 || value.plans.some((p) =>
      !Number.isInteger(p.amount) || p.amount < 1 || p.amount > 5000 || p.momence_confirmed_amount !== p.amount ||
      !/^\d+$/.test(p.product_id || '') || !p.booking_url?.startsWith('https://momence.com/') ||
      !p.booking_url.endsWith('/'+p.product_id))) return 'Confirm every price and matching Momence checkout link before saving.'
  }
  if (path === 'content/timetable.json') {
    const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    if (!Array.isArray(value.days) || value.days.length !== 7 || value.days.some((day,i)=>
      day.day!==days[i] || !Array.isArray(day.classes) || day.classes.length>12 || day.classes.some((c,j)=>
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time||'') || !c.name?.trim() || c.name.length>32 ||
        !['flow','sweat','calm','found'].includes(c.style) || (j>0 && c.time<day.classes[j-1].time)))) return 'Check the seven days and keep classes in time order.'
  }
  if (path === 'content/latest.json') {
    if (!Array.isArray(value.tiles) || value.tiles.length!==5 || value.tiles.filter(t=>t.size==='big').length!==1 ||
        value.tiles.some(t=>!t.headline?.trim() || t.headline.length>44 || !image(t.image) ||
          !(/^\/[A-Za-z0-9_\-/.?=&%]+$/.test(t.href||'') || url(t.href)) || (t.expires && !date(t.expires)))) return 'Check the five cards, their photos and links, and choose one big card.'
  }
  if (path === 'content/retreats-general.json') {
    if (!value.headline?.trim() || value.headline.length>55 || !image(value.hero_image) ||
        !value.intro?.trim() || value.intro.length>270) return 'Complete the retreat headline, introduction and photo.'
  }
  if (path.startsWith('content/retreats/')) {
    if (!value.title?.trim() || value.title.length>58 || !date(value.go_live) || !date(value.end_date) ||
        value.go_live>value.end_date || (value.hide_after && !date(value.hide_after)) || !image(value.hero_image) ||
        !url(value.booking_url) || !Array.isArray(value.experiences) || value.experiences.length<3 ||
        !Array.isArray(value.inclusions) || value.inclusions.length<3) return 'Complete the retreat details, dates, photo, booking link and at least three experiences and inclusions.'
  }
  return null
}
