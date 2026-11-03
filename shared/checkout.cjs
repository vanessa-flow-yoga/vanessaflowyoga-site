// Shared by the editor, API validation and website build.
function productId(value){
 try{const text=String(value).trim();if(/[<>\"'`\u0000-\u0020]/.test(text))return null;const url=new URL(text);if(url.protocol!=='https:'||!['momence.com','www.momence.com'].includes(url.hostname)||url.username||url.password||url.port)return null;return url.pathname.match(/\/(?:membership\/(?:[^/]+\/)?|m\/)(\d+)\/?$/)?.[1]||null}catch{return null}
}
function matches(value,id){return typeof id==='string'&&/^\d+$/.test(id)&&productId(value)===id}
module.exports={productId,matches}
