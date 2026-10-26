import YAML from 'yaml'

// Cache metadata only by GitHub blob SHA, so a date edit is visible immediately.
const metadataCache = new Map()
export async function listPosts(entries, readFile) {
  const posts = entries.filter(entry=>entry.type==='file' && /^post\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.path))
  const output = new Array(posts.length)
  let next=0
  await Promise.all(Array.from({length:Math.min(6,posts.length)},async()=>{
    while(next<posts.length){
      const index=next++, entry=posts[index]
      let metadata=entry.sha && metadataCache.get(entry.sha)
      if(!metadata){
        const content=await readFile(entry.path)
        const front=content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
        const data=front?YAML.parse(front[1]):{}
        const published=data?.published instanceof Date?data.published.toISOString().slice(0,10):String(data?.published||'').slice(0,10)
        metadata={title:typeof data?.title==='string'?data.title:entry.name.replace(/\.md$/,'').replaceAll('-',' '),published:/^\d{4}-\d{2}-\d{2}$/.test(published)?published:''}
        if(entry.sha){if(metadataCache.size>=500)metadataCache.clear();metadataCache.set(entry.sha,metadata)}
      }
      output[index]={name:entry.name,path:entry.path,...metadata}
    }
  }))
  return output.sort((a,b)=>b.published.localeCompare(a.published)||a.title.localeCompare(b.title,'en')||a.path.localeCompare(b.path))
}
