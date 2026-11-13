// Photo uploads from the admin: every photo is resized and re-encoded in the
// browser before it is saved, so the website never serves camera-sized files,
// and the saved filename describes the photo instead of carrying a timestamp.

export const MAX_EDGE = 2000          // longest side in pixels after resizing
export const MAX_ORIGINAL = 25000000  // largest photo accepted for resizing
export const MAX_SAVED = 2000000      // upload limit enforced by the server

// Camera, screenshot and export noise that says nothing about the photo.
const NOISE = /^(?:img|dsc[a-z]?|pxl|mvimg|photo|image|screenshot|screen-shot|untitled|copy|final|edit(?:ed)?|export|whatsapp|x|px|\d+(?:px)?|\d+x\d+)$/

export function photoBaseName(originalName, description = '') {
  const words = (value) => String(value || '').normalize('NFKD').toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, '').replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean)
  const keep = (list) => list.filter((word) => !NOISE.test(word))
  const fromDescription = keep(words(description))
  const fromFile = keep(words(originalName))
  const chosen = fromDescription.length >= 2 ? fromDescription : fromFile
  return chosen.slice(0, 8).join('-').slice(0, 60).replace(/-+$/, '') || 'vanessa-flow-yoga-photo'
}

// Short suffix so two photos with the same description never collide.
export function uniqueSuffix(now = Date.now()) {
  return now.toString(36).slice(-5)
}

export function photoFilename(originalName, description, type, now) {
  const ext = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg'
  return `${photoBaseName(originalName, description)}-${uniqueSuffix(now)}.${ext}`
}

export function targetSize(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))}
}
