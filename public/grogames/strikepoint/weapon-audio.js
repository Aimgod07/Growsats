/* Local sampled gun audio. All voices share the existing game mute/master bus. */
(function(root){'use strict';const names=['rifle','smg','shotgun','marksman'];
class StrikeAudio{
 constructor(context,master){this.context=context;this.master=master;this.buffers=new Map();this.voices=new Set();this.reloadVoice=null;this.serial=0;this.ready=this.load();}
 async load(){await Promise.all(names.flatMap((name,i)=>['fire','reload'].map(async kind=>{try{const r=await fetch('assets/audio/'+name+'-'+kind+'.wav');if(!r.ok)throw Error('audio unavailable');const data=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(i+':'+kind,data);}catch{/* Short synthesized transient remains available while offline/loading. */}})));}
 play(buffer,volume=1,offset=0,rate=1){if(this.context.state!=='running'||!buffer||offset>=buffer.duration)return null;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain).connect(this.master);this.voices.add(source);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);if(this.reloadVoice===source)this.reloadVoice=null;};source.start(0,Math.max(0,offset));return source;}
 fallback(type,kind){const key=type+':fallback:'+kind;if(this.buffers.has(key))return this.buffers.get(key);const len=kind==='fire'?.18:.09,b=this.context.createBuffer(1,Math.ceil(len*this.context.sampleRate),this.context.sampleRate),out=b.getChannelData(0);let low=0;for(let i=0;i<out.length;i++){const t=i/this.context.sampleRate,n=Math.random()*2-1;low+=.1*(n-low);out[i]=((n-low)*Math.exp(-t*130)+low*2*Math.exp(-t*30))*.52;}this.buffers.set(key,b);return b;}
 shot(type,enemy=false){const buffer=this.buffers.get(type+':fire')||this.fallback(type,'fire');if(this.voices.size>16){const voice=[...this.voices].find(v=>v!==this.reloadVoice);try{voice?.stop();}catch{}}return this.play(buffer,enemy?.14:.64,0,.985+Math.random()*.03);}
 reload(type,remaining,total){this.stopReload();const serial=++this.serial;const start=()=>{if(serial!==this.serial||remaining<=0)return;const buffer=this.buffers.get(type+':reload');if(buffer){this.reloadVoice=this.play(buffer,.85,Math.max(0,total-remaining));}else this.reloadVoice=this.play(this.fallback(type,'reload'),.4);};start();}
 stopReload(){this.serial++;if(this.reloadVoice){try{this.reloadVoice.stop();}catch{}this.reloadVoice=null;}}
 stopAll(){this.stopReload();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
}
root.StrikeAudio=StrikeAudio;
})(typeof window!=='undefined'?window:globalThis);
