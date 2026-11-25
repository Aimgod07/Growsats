import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {backend,isSignedIn} from '../utils/api';

const EMPTY={coins:0,diamonds:0,cash:0};
const WalletContext=createContext({data:EMPTY,error:null,loading:false,refreshing:false,reload:()=>{},mutate:()=>{}});

export function WalletProvider({children}){
  const [data,setData]=useState(EMPTY);
  const [error,setError]=useState(null);
  const [loading,setLoading]=useState(false);
  const active=useRef(true), requestId=useRef(0);
  const reload=useCallback(async()=>{
    if(!isSignedIn()){setData(EMPTY);setError(null);return;}
    const id=++requestId.current;setLoading(true);
    try{const next=await backend.wallet();if(active.current&&id===requestId.current){setData(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);setError(null);}}
    catch(nextError){if(active.current&&id===requestId.current)setError(nextError);}
    finally{if(active.current&&id===requestId.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    active.current=true;
    const visible=()=>{if(document.visibilityState==='visible')reload();};
    const timer=setInterval(visible,15000);
    window.addEventListener('playloot:wallet-changed',reload);
    window.addEventListener('playloot:session-changed',reload);
    window.addEventListener('focus',visible);
    document.addEventListener('visibilitychange',visible);
    reload();
    return()=>{active.current=false;clearInterval(timer);window.removeEventListener('playloot:wallet-changed',reload);window.removeEventListener('playloot:session-changed',reload);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
  },[reload]);
  const mutate=useCallback(updater=>setData(previous=>typeof updater==='function'?updater(previous):updater),[]);
  const value=useMemo(()=>({data,error,loading,refreshing:loading,reload,mutate}),[data,error,loading,reload,mutate]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(){return useContext(WalletContext);}
