import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)
const {mediaPath} = require('../media-library.cjs')

test('media paths resolve only to this site and ignore query strings', () => {
  assert.equal(mediaPath('../images/team.webp?size=small', '/post/article.html'), '/images/team.webp')
  assert.equal(mediaPath('https://vanessaflowyoga.co.uk/videos/hot-yoga.mp4'), '/videos/hot-yoga.mp4')
  assert.equal(mediaPath('https://other.example/images/team.webp'), null)
  assert.equal(mediaPath('data:image/png;base64,AAAA'), null)
})
