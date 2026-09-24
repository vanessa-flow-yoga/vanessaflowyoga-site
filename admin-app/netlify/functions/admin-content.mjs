import {getUser, verifyRequestOrigin} from '@netlify/identity'
import {validateContent} from './admin-validation.mjs'

const REPO = 'vanessa-flow-yoga/vanessaflowyoga-site'
// Read the review content until it is deliberately released to main.
// A review deploy must never silently write to main.
const BRANCH = process.env.VFY_ADMIN_WRITE_BRANCH || 'codex/vanessa-content-editor'
const singletons = new Set([
  'content/timetable.json', 'content/latest.json', 'content/prices.json',
  'content/retreats-general.json', 'content/page-copy/home.json',
  'content/page-copy/classes.json', 'content/page-copy/membership.json',
])

export function allowedPath(path) {
  return singletons.has(path) ||
    /^post\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(path) ||
    /^content\/retreats\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(path)
}

function response(data, status = 200) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store'}})
}

async function github(path, options = {}) {
  const token = process.env.VFY_GITHUB_CONTENT_TOKEN
  if (!token) throw new Error('GitHub content connection is not configured')
  const url = `https://api.github.com/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${BRANCH}`
  const result = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'VanessaFlowYoga-Admin',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  })
  return result
}

export default async function handler(req) {
  try {
    const user = await getUser()
    if (!user) return response({error: 'Please sign in again.'}, 401)
    if (!user.roles?.includes('admin')) return response({error: 'Your account needs admin access.'}, 403)
    if (!process.env.VFY_GITHUB_CONTENT_TOKEN) return response({error: 'The GitHub content connection is not set up yet. Ask Charlie to finish the admin project setup.'}, 503)

    const url = new URL(req.url)
    const collection = url.searchParams.get('collection')
    const path = url.searchParams.get('path')
    if (req.method === 'POST' && url.searchParams.get('upload') === '1') {
      verifyRequestOrigin(req)
      if (!process.env.VFY_ADMIN_WRITE_BRANCH) return response({error: 'Saving is not enabled on this preview.'}, 503)
      const body = await req.json()
      const folder = body.folder
      const filename = body.filename
      if (!['images', 'images/blog', 'images/retreats'].includes(folder) ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/.test(filename || '') ||
          typeof body.base64 !== 'string' || body.base64.length > 3000000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64)) {
        return response({error: 'Choose a JPG, PNG or WebP photo under 2 MB.'}, 400)
      }
      const bytes = Buffer.from(body.base64, 'base64')
      if (bytes.length > 2000000 || bytes.length < 100 ||
          !(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
            bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
            (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP'))) {
        return response({error: 'That photo format is not supported, or the file is over 2 MB.'}, 400)
      }
      const imagePath = `${folder}/${filename}`
      const existing = await github(imagePath)
      if (existing.ok) return response({error: 'A photo with that name already exists. Try again.'}, 409)
      if (existing.status !== 404) return response({error: 'Could not check the photo name.'}, 502)
      const saved = await github(imagePath, {method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: `Upload photo ${filename} from website admin`, content: body.base64, branch: BRANCH})})
      if (!saved.ok) return response({error: 'Could not upload this photo.'}, 502)
      return response({path: `/${imagePath}`})
    }
    if (req.method === 'GET' && collection) {
      const folder = collection === 'posts' ? 'post' : collection === 'retreats' ? 'content/retreats' : null
      if (!folder) return response({error: 'Unknown section.'}, 400)
      const result = await github(folder)
      if (!result.ok) return response({error: 'Could not load entries.'}, 502)
      const entries = await result.json()
      return response({entries: entries.filter((entry) => entry.type === 'file' && allowedPath(entry.path))
        .map(({name, path}) => ({name, path}))})
    }
    if (!path || !allowedPath(path)) return response({error: 'That content area is not available.'}, 400)

    if (req.method === 'GET') {
      const result = await github(path)
      if (result.status === 404) return response({error: 'Entry not found.'}, 404)
      if (!result.ok) return response({error: 'Could not load content.'}, 502)
      const entry = await result.json()
      if (entry.type !== 'file' || entry.size > 150000) return response({error: 'Invalid content file.'}, 400)
      return response({path, sha: entry.sha, content: Buffer.from(entry.content, 'base64').toString('utf8')})
    }

    if (req.method !== 'PUT') return response({error: 'Method not allowed.'}, 405)
    verifyRequestOrigin(req)
    if (!process.env.VFY_ADMIN_WRITE_BRANCH) return response({error: 'Saving is not enabled on this preview.'}, 503)
    const body = await req.json()
    if (body.path !== path || typeof body.content !== 'string' || body.content.length > 150000 ||
        (body.sha !== null && !/^[a-f0-9]{40}$/.test(body.sha || ''))) {
      return response({error: 'Invalid content update.'}, 400)
    }
    const validationError = validateContent(path, body.content)
    if (validationError) return response({error: validationError}, 400)
    const current = await github(path)
    if (current.status === 404 && body.sha !== null) return response({error: 'This entry was removed. Reload before saving.'}, 409)
    if (current.ok) {
      const entry = await current.json()
      if (body.sha !== entry.sha) return response({error: 'Someone changed this entry. Reload before saving.'}, 409)
    } else if (current.status !== 404) return response({error: 'Could not verify the latest version.'}, 502)
    const commit = await github(path, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        message: `Update ${path} from website admin`,
        content: Buffer.from(body.content, 'utf8').toString('base64'),
        ...(body.sha ? {sha: body.sha} : {}),
        branch: BRANCH,
      }),
    })
    if (!commit.ok) return response({error: commit.status === 409 ? 'This entry changed. Reload before saving.' : 'GitHub could not save this change.'}, commit.status === 409 ? 409 : 502)
    const saved = await commit.json()
    return response({path, sha: saved.content?.sha, message: 'Saved. Netlify will now update the website.'})
  } catch (error) {
    if (error?.status === 403) return response({error: 'Request was blocked for security.'}, 403)
    return response({error: 'The admin could not complete that request.'}, 500)
  }
}
