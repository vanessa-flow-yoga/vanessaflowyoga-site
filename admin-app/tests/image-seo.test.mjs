import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createRequire} from 'node:module'
import {photoBaseName, photoFilename, targetSize} from '../lib/image-upload.mjs'

const require = createRequire(import.meta.url)
const imageMeta = require('../../shared/image-meta.cjs')
const root = path.resolve(import.meta.dirname, '../..')

test('upload names describe the photo, not the camera', () => {
  assert.equal(photoBaseName('IMG_2424.JPG', 'Warm yin class in the studio'), 'warm-yin-class-in-the-studio')
  assert.equal(photoBaseName('harry-potter-yin-yoga-1920-x-1080-px-1-copy.png', ''), 'harry-potter-yin-yoga')
  assert.equal(photoBaseName('DSC_2424.jpeg', ''), 'vanessa-flow-yoga-photo')
  assert.equal(photoBaseName('hot-pilates.png', 'x'), 'hot-pilates')
  const name = photoFilename('IMG_1.HEIC', 'Pregnancy yoga with Katie', 'image/webp', 1790000000000)
  assert.match(name, /^pregnancy-yoga-with-katie-[a-z0-9]{5}\.webp$/)
  // Must satisfy the server's filename rule.
  assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/)
  assert.match(photoFilename('a.png', '', 'image/jpeg', 1), /\.jpg$/)
})

test('large photos shrink to 2000px on the longest side, small ones stay', () => {
  assert.deepEqual(targetSize(5250, 7875), {width: 1333, height: 2000})
  assert.deepEqual(targetSize(1080, 1080), {width: 1080, height: 1080})
})

test('reads dimensions of the site image formats', () => {
  assert.deepEqual(imageMeta.dimensions(path.join(root, 'images/logo.png')) !== null, true)
  for (const file of fs.readdirSync(path.join(root, 'images'))) {
    if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue
    const size = imageMeta.dimensions(path.join(root, 'images', file))
    assert.ok(size && size.width > 0 && size.height > 0, `no size for ${file}`)
  }
})

test('adds dimensions only where missing and lists photos for the sitemap', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfy-img-'))
  fs.mkdirSync(path.join(dir, 'images'))
  fs.copyFileSync(path.join(root, 'images/logo.png'), path.join(dir, 'images/logo.png'))
  const page = path.join(dir, 'page.html')
  const html = '<img src="/images/logo.png" alt="Logo"><img src="images/logo.png" width="10" height="10" alt=""><img src="https://x.test/a.jpg" alt="Remote">'
  const {html: out, images} = imageMeta.processHtml(dir, page, html)
  const {width, height} = imageMeta.dimensions(path.join(dir, 'images/logo.png'))
  assert.ok(out.startsWith(`<img width="${width}" height="${height}" data-dims src="/images/logo.png"`))
  assert.equal(imageMeta.processHtml(dir, page, `<head></head>${html}`).html.includes(":where(img[data-dims])"), true)
  assert.ok(out.includes('<img src="images/logo.png" width="10" height="10" alt="">'))
  assert.ok(out.includes('https://x.test/a.jpg" alt="Remote">'))
  assert.equal(images.length, 2)
  const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://a.test/p</loc></url><url><loc>https://a.test/q</loc></url></urlset>'
  const withImages = imageMeta.addSitemapImages(xml, new Map([['https://a.test/p', ['https://a.test/images/a&b.webp']]]))
  assert.ok(withImages.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'))
  assert.ok(withImages.includes('<url><loc>https://a.test/p</loc><image:image><image:loc>https://a.test/images/a&amp;b.webp</image:loc></image:image></url>'))
  assert.ok(withImages.includes('<url><loc>https://a.test/q</loc></url>'))
})
