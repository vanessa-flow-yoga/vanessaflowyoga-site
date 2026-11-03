export async function resolveEditorMode(readMode){
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await readMode();if(!['live','review','readonly'].includes(result?.mode))throw Error('Invalid publishing status');return {mode:result.mode,error:''}}catch{}
 }
 return {mode:'readonly',error:'Could not check publishing access. Retry the connection below; your edits are kept.'}
}
