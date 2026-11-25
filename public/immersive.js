(()=>{
const style=document.createElement('style');style.textContent='html,body{margin:0!important;background:#0e1017!important;min-height:100dvh;overscroll-behavior:none}body{width:100%;max-width:none!important}#root{min-height:100dvh}';document.head.append(style);
const bind=doc=>{if(doc.documentElement.dataset.immersiveBound)return;doc.documentElement.dataset.immersiveBound='true';if(doc!==document){const css=doc.createElement('style');css.textContent='html,body{margin:0!important;background:#0e1017!important;width:100%;max-width:none!important;min-height:100dvh}@media(max-width:767px){.pl-trust-benefits>span{display:none!important}}';doc.head?.append(css);}doc.addEventListener('pointerup',e=>{if(!matchMedia('(pointer:coarse)').matches||document.fullscreenElement||!document.querySelector('iframe[title]')||e.target.closest?.('input,select,textarea'))return;document.documentElement.requestFullscreen?.({navigationUI:'hide'}).catch(()=>{});});};
bind(document);new MutationObserver(()=>{document.querySelectorAll('iframe').forEach(f=>{if(!f.dataset.immersiveListener){f.dataset.immersiveListener='true';f.addEventListener('load',()=>{try{if(f.contentDocument)bind(f.contentDocument);}catch{}});}try{if(f.contentDocument)bind(f.contentDocument);}catch{}});}).observe(document.documentElement,{childList:true,subtree:true});
})();


