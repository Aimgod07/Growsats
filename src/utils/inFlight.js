const pending=new Map();
// Share only active reads. Never cache balances or reuse data across sessions.
export function shareRead(key,load){
  if(pending.has(key))return pending.get(key);
  const promise=(async()=>load())().finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
  pending.set(key,promise);
  return promise;
}
