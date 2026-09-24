import test from 'node:test'
import assert from 'node:assert/strict'
import {allowedPath} from '../netlify/functions/admin-content.mjs'

test('admin content API restricts GitHub writes to editable site content', () => {
  assert.equal(allowedPath('content/page-copy/home.json'), true)
  assert.equal(allowedPath('content/latest.json'), true)
  assert.equal(allowedPath('content/retreats/autumn-escape.json'), true)
  assert.equal(allowedPath('post/a-new-article.md'), true)
  assert.equal(allowedPath('netlify.toml'), false)
  assert.equal(allowedPath('content/../netlify.toml'), false)
  assert.equal(allowedPath('post/../../_headers'), false)
  assert.equal(allowedPath('post/not-a-post.html'), false)
})
