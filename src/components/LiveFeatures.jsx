import {createPortal} from 'react-dom';
import {createContext,useContext,useEffect,useState,useRef,useLayoutEffect} from 'react';
import {backend} from '../utils/api';
const Context=createContext({events:[],ads:[]});
export function LiveFeaturesProvider({children}) {
 const [data,setData]=useState({events:[],ads:[]});
 useEffect(()=>{let alive=true;const load=()=>backend.live().then(d=>{if(alive)setData(d)}).catch(()=>{});load();const t=setInterval(load,60000);return()=>{alive=false;clearInterval(t)}},[]);
 return <Context.Provider value={data}>{children}</Context.Provider>;
}
export const useLiveFeatures=()=>useContext(Context);
export function normaliseAdSource(source,width=300,height=250){
 try{
  const url=new URL(String(source||''));
  if(url.protocol!=='https:')return '';
  if(url.hostname==='api.groadz.com'){
   const replacement=new URL('https://groadz.com/advertisement-api/api/ads/render');
   replacement.searchParams.set('domain',url.searchParams.get('domain')||'grosats.com');
   replacement.searchParams.set('width',String(width));
   replacement.searchParams.set('height',String(height));
   return replacement.href;
  }
  return url.href;
 }catch{return '';}
}
export function AdPlacement({slot}) {
 const {ads}=useLiveFeatures();const ad=ads.find(a=>a.id===slot && a.enabled !== false && a.enabled !== 0);
 const anchor=useRef(null), [host,setHost]=useState(null);
 const position=ad?.position || 'top';
 useLayoutEffect(()=>{
   const marker=anchor.current;
   if(!ad || !marker || position==='top'){setHost(null);return;}
   const main=marker.closest('main');
   const container=main?.querySelector('.hub__body') || main?.querySelector('main > div:not([data-ad-slot])') || main;
   if(!container)return;
   const target=marker.ownerDocument.createElement('div');
   target.dataset.adPosition=position;
   const place=()=>{
     const contentChildren = node => Array.from(node.children).filter(el =>
       el !== target && !el.contains(marker) && !el.hidden &&
       !['HEADER','SCRIPT','STYLE','LINK'].includes(el.tagName) &&
       !el.hasAttribute('data-ad-position'));
     let parent = container;
     let before = null;
     if (position === 'middle') {
       let items = contentChildren(parent);
       // A page often wraps all its sections in one element. Count the
       // sections inside that wrapper instead of treating it as one card.
       while (items.length === 1 && contentChildren(items[0]).length) {
         parent = items[0];
         items = contentChildren(parent);
       }
       before = items[Math.min(Math.ceil(items.length / 2), items.length - 1)] || null;
     }
     if(target.parentNode!==parent || target.nextElementSibling!==before)parent.insertBefore(target,before);

   };
   place();setHost(target);
   const observer=new MutationObserver(place);observer.observe(container,{childList:true,subtree:true});
   return()=>{observer.disconnect();target.remove();};
 },[slot,position,!!ad]);
 if(!ad)return <span ref={anchor} hidden/>;
 const source=normaliseAdSource(ad.src,ad.width,ad.height);
 if(!source)return <span ref={anchor} hidden/>;
 const legacy=/^https:\/\/(?:api\.)?groadz\.com\//i.test(source);
 const replacement=['ranks','profile'].includes(slot)?'banner-two':'banner-one';
 const frameSource=legacy?`https://playloot.pages.dev/ads/${replacement}.html`:source;
 const managed=/^https:\/\/playloot\.pages\.dev\/ads\/banner-(one|two)\.html$/.test(frameSource);
 const creative=<iframe src={frameSource} title={ad.title || 'Advertisement'} width={managed?300:ad.width} height={managed?250:ad.height} loading="eager" scrolling="no" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{display:'block',border:0,maxWidth:'100%'}}/>;
 const content=
 <aside className="live-ad" aria-label="Advertisement" style={{margin:'18px auto',padding:12,width:'100%',maxWidth:440,boxSizing:'border-box'}}><small style={{display:'block',color:'#929bb0',textAlign:'center',marginBottom:6}}>Advertisement</small><div style={{width:ad.width,maxWidth:'100%',margin:'auto',overflow:'hidden',borderRadius:ad.radius,background:ad.background}}>{creative}</div></aside>;
 return <><span ref={anchor} hidden/>{position==='top'?content:host?createPortal(content,host):null}</>;
}


