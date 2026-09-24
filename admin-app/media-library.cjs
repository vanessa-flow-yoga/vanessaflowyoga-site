const fs = require('node:fs')
const path = require('node:path')

const mediaTypes = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.mp4', '.png', '.svg', '.webm', '.webp'])
const imageTypes = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

function filesIn(folder) {
  if (!fs.existsSync(folder)) return []
  return fs.readdirSync(folder, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(folder, entry.name)
    return entry.isDirectory() ? filesIn(full) : [full]
  })
}

function attribute(tag, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag)
  return match ? match[2].replaceAll('&amp;', '&').replaceAll('&quot;', '"') : null
}

function mediaPath(value, pagePath = '/') {
  if (!value || /^(?:data:|blob:)/i.test(value)) return null
  try {
    const url = new URL(value, `https://vanessaflowyoga.co.uk${pagePath}`)
    if (url.hostname !== 'vanessaflowyoga.co.uk') return null
    const pathname = decodeURIComponent(url.pathname)
    return pathname.startsWith('/images/') || pathname.startsWith('/videos/') || pathname === '/favicon.svg'
      ? pathname : null
  } catch { return null }
}

function titleFrom(html) {
  return /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1].replace(/\s+/g, ' ').trim() || 'Website page'
}

function buildMediaLibrary(siteOutput) {
  const assets = filesIn(path.join(siteOutput, 'images'))
    .concat(filesIn(path.join(siteOutput, 'videos')))
    .concat(fs.existsSync(path.join(siteOutput, 'favicon.svg')) ? [path.join(siteOutput, 'favicon.svg')] : [])
    .filter(file => mediaTypes.has(path.extname(file).toLowerCase()))
    .map(file => {
      const relative = path.relative(siteOutput, file).split(path.sep).join('/')
      return {path: `/${relative}`, filename: path.basename(file), type: imageTypes.has(path.extname(file).toLowerCase()) ? 'image' : 'video',
        format: path.extname(file).slice(1).toUpperCase(), bytes: fs.statSync(file).size, uses: []}
    })
  const byPath = new Map(assets.map(asset => [asset.path, asset]))
  const seen = new Set()
  function add(value, pagePath, pageTitle, kind, alt = null, title = null) {
    const asset = byPath.get(mediaPath(value, pagePath))
    if (!asset) return
    const use = {page: pagePath, pageTitle, kind, alt, title}
    const key = JSON.stringify([asset.path, use])
    if (seen.has(key)) return
    seen.add(key)
    asset.uses.push(use)
  }

  for (const file of filesIn(siteOutput).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}admin${path.sep}`))) {
    const relative = path.relative(siteOutput, file).split(path.sep).join('/')
    const page = `/${relative}`
    const html = fs.readFileSync(file, 'utf8')
    const pageTitle = titleFrom(html)
    for (const tag of html.match(/<(?:img|video|source)\b[^>]*>/gi) || []) {
      const alt = attribute(tag, 'alt')
      const title = attribute(tag, 'title')
      const kind = /^<img\b/i.test(tag) ? 'Image' : 'Video'
      for (const name of ['src', 'data-src', 'poster']) add(attribute(tag, name), page, pageTitle, kind, alt, title)
      const srcset = attribute(tag, 'srcset') || ''
      for (const item of srcset.split(',')) add(item.trim().split(/\s+/)[0], page, pageTitle, kind, alt, title)
    }
    for (const tag of html.match(/<(?:meta|link)\b[^>]*>/gi) || []) {
      const content = attribute(tag, 'content') || attribute(tag, 'href')
      if (content) add(content, page, pageTitle, 'Social image or icon')
    }
    for (const tag of html.match(/<[^>]+\brole=["']img["'][^>]*>/gi) || []) {
      for (const match of tag.matchAll(/url\(\s*["']?([^'"\)]+)["']?\s*\)/gi)) {
        add(match[1], page, pageTitle, 'Background image', attribute(tag, 'aria-label'), attribute(tag, 'title'))
      }
    }
  }

  for (const file of filesIn(siteOutput).filter(file => /\.(?:css|js)$/i.test(file) && !file.includes(`${path.sep}admin${path.sep}`))) {
    const source = `/${path.relative(siteOutput, file).split(path.sep).join('/')}`
    const body = fs.readFileSync(file, 'utf8')
    for (const asset of assets) {
      if (body.includes(asset.path) || body.includes(asset.path.slice(1))) {
        add(asset.path, source, source.replace(/^\//, ''), 'Stylesheet or script reference')
      }
    }
  }

  const contentRoot = path.join(siteOutput, 'content')
  for (const file of filesIn(contentRoot).filter(file => file.endsWith('.json'))) {
    let data
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { continue }
    const relative = path.relative(siteOutput, file).split(path.sep).join('/')
    const source = relative === 'content/latest.json' ? '/'
      : relative === 'content/retreats-general.json' || relative.startsWith('content/retreats/') ? '/retreats'
      : relative === 'content/page-copy/home.json' ? '/'
      : relative === 'content/page-copy/classes.json' ? '/classes'
      : relative === 'content/page-copy/membership.json' ? '/membership'
      : `/${relative}`
    function visit(value, context = {}) {
      if (Array.isArray(value)) { value.forEach(item => visit(item, context)); return }
      if (!value || typeof value !== 'object') return
      const label = value.title || value.headline || value.name || context.label || relative.replace(/^content\//, '')
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'string' && /^(?:image|hero_image|hero|thumbnail|cover)$/i.test(key)) {
          add(entry, source, label, 'Content image', value.hero_alt || value.alt || null, value.image_title || null)
        } else if (entry && typeof entry === 'object') visit(entry, {label})
      }
    }
    visit(data)
  }
  const pages = filesIn(siteOutput).filter(file => file.endsWith('.html') && path.basename(file) !== '404.html' && !file.includes(`${path.sep}admin${path.sep}`))
    .map(file => `/${path.relative(siteOutput, file).split(path.sep).join('/')}`)
  return {generatedAt: new Date().toISOString(), pages, assets: assets.sort((a, b) => a.path.localeCompare(b.path))}
}

module.exports = {buildMediaLibrary, mediaPath}
