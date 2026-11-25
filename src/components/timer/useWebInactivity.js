import {useEffect,useRef,useState} from 'react';
export function useWebInactivity({enabled,sessionId,frameRef,origin,onClose}){
 const [remaining,setRemaining]=useState(null);
 const close=useRef(onClose);useEffect(()=>{close.current=onClose;},[onClose]);
 useEffect(()=>{
  setRemaining(null);if(!enabled||!sessionId)return;
  const graceEnds=Date.now()+120000;
  let deadline=graceEnds+15000,closed=false;
  const documents=new Set(),frames=new Set();
  const inputEvents=['pointerdown','touchstart','click','keydown'];
  const reset=()=>{if(closed||Date.now()<graceEnds)return;deadline=Date.now()+15000;setRemaining(null)};
  const input=e=>{if(e.isTrusted)reset()};
  // Inputs do not bubble out of frames. Bind each accessible game document,
  // including nested frames and documents replaced during game loading.
  const bindFrame=frame=>{
   if(!frame)return;
   if(!frames.has(frame)){frames.add(frame);frame.addEventListener('load',scan)}
   try{
    const doc=frame.contentDocument;if(!doc)return;
    if(!documents.has(doc)){documents.add(doc);inputEvents.forEach(type=>doc.addEventListener(type,input,{capture:true,passive:true}))}
    doc.querySelectorAll('iframe').forEach(bindFrame);
   }catch{/* Third-party games must send their own activity message. */}
  };
  function scan(){bindFrame(frameRef.current)}
  const message=e=>{if(frameRef.current?.contentWindow&&e.source===frameRef.current.contentWindow&&e.origin===origin&&e.data?.type==='playloot:activity')reset()};
  const tick=()=>{if(closed)return;const left=deadline-Date.now();if(left<=0){closed=true;setRemaining(null);close.current();return}setRemaining(left<=5000?Math.ceil(left/1000):null)};
  inputEvents.forEach(type=>window.addEventListener(type,input,{capture:true,passive:true}));window.addEventListener('message',message);document.addEventListener('visibilitychange',tick);
  scan();const timer=setInterval(tick,250),scanner=setInterval(scan,1000);
  return()=>{clearInterval(timer);clearInterval(scanner);documents.forEach(doc=>inputEvents.forEach(type=>doc.removeEventListener(type,input,true)));frames.forEach(frame=>frame.removeEventListener('load',scan));inputEvents.forEach(type=>window.removeEventListener(type,input,true));window.removeEventListener('message',message);document.removeEventListener('visibilitychange',tick)};
 },[enabled,sessionId,origin,frameRef]);
 return remaining;
}

