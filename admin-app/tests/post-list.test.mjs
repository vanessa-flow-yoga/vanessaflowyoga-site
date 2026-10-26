import test from 'node:test'
import assert from 'node:assert/strict'
import {listPosts} from '../lib/post-list.mjs'
const entry=(name,sha=name)=>({name:name+'.md',path:'post/'+name+'.md',type:'file',sha})
test('admin blog list uses publication dates, not filename or modification order',async()=>{
 const dates={'post/a-old.md':'2020-01-01','post/z-new.md':'2026-10-26','post/m-middle.md':'2023-02-28'}
 const posts=await listPosts([entry('a-old'),entry('z-new'),entry('m-middle')],async path=>`---\ntitle: "Title ${path}"\npublished: ${dates[path]}\n---\nBody`)
 assert.deepEqual(posts.map(post=>post.published),['2026-10-26','2023-02-28','2020-01-01'])
 assert.match(posts[0].title,/z-new/)
})
test('changed blob SHA updates its publication date while unchanged posts reuse metadata',async()=>{
 const first=entry('changed','old-sha')
 await listPosts([first],async()=> '---\ntitle: Before\npublished: "2020-01-01"\n---\n')
 const updated=await listPosts([{...first,sha:'new-sha'}],async()=> '---\ntitle: After\npublished: "2026-10-26"\n---\n')
 assert.equal(updated[0].title,'After')
 const cached=await listPosts([{...first,sha:'new-sha'}],async()=>{throw Error('should use unchanged blob')})
 assert.equal(cached[0].published,'2026-10-26')
})
test('undated posts come last with stable title order; a failed read does not silently omit articles',async()=>{
 const posts=await listPosts([entry('undated'),entry('same-b'),entry('same-a')],async path=>`---\ntitle: ${path}\n${path.includes('undated')?'':'published: 2026-01-01'}\n---\n`)
 assert.deepEqual(posts.map(post=>post.path),['post/same-a.md','post/same-b.md','post/undated.md'])
 await assert.rejects(listPosts([entry('unreadable')],async()=>{throw Error('read failed')}),/read failed/)
})
