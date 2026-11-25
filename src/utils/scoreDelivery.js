// Retry transport failures with the same key; the server saves each run once.
export async function deliverScore(send,sessionId,score,runId=crypto.randomUUID(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))) {
  for(let attempt=0;attempt<3;attempt++){
    try{return await send({sessionId,score,runId});}
    catch(error){
      if(attempt===2||(error.status&&error.status<500&&error.status!==429))throw error;
      await wait(500*3**attempt);
    }
  }
}
