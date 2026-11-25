/* One immutable result per completed run, shared by the web and Android hosts. */
(()=>{
  const params=new URLSearchParams(location.search);
  let runId=null,finished=false;
  const start=()=>{runId=crypto.randomUUID();finished=false;};
  const finish=score=>{
    if(finished||!Number.isSafeInteger(score)||score<0||score>1000000000)return;
    if(!runId)start();
    finished=true;
    const data={type:'playloot:score',gameId:params.get('gameId'),runId,score};
    let origin;try{origin=new URL(params.get('parentOrigin')||location.origin).origin;}catch{return;}
    if(parent!==window)parent.postMessage(data,origin);
    console.log('PLAYLOOT_SCORE:'+JSON.stringify(data));
  };
  window.PlaylootScores={start,finish};
})();
