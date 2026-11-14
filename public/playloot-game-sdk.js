/* Include in your own HTML game. Supply the exact app origin explicitly. */
(function(){
  let origin=null,lastInput=Date.now(),started=Date.now();
  function send(type,extra){if(origin&&parent!==window)parent.postMessage(Object.assign({type},extra),origin);}
  ['pointerdown','keydown','touchstart'].forEach(name=>addEventListener(name,()=>{lastInput=Date.now()},{passive:true}));
  window.PlaylootGame={
    init:function(appOrigin){const url=new URL(appOrigin);if(!['https:','http:'].includes(url.protocol))throw Error('Invalid app origin');origin=url.origin;send('playloot:activity');},
    submitScore:function(score){if(!Number.isSafeInteger(score)||score<0||score>1000000000)throw Error('Invalid score');send('playloot:score',{score});}
  };
  setInterval(function(){if(!document.hidden&&(Date.now()-started<120000||Date.now()-lastInput<15000))send('playloot:activity');},15000);
})();
