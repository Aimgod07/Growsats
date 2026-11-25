const MAX_AGE=5*60*1000;
const key=platform=>'playloot.public-config.v1:'+platform;
export function readConfigCache(platform){
 try{const saved=JSON.parse(sessionStorage.getItem(key(platform))||'null');return saved&&Date.now()-saved.at<MAX_AGE&&saved.at<=Date.now()?saved.config:null;}catch{return null;}
}
export function writeConfigCache(platform,config){
 try{sessionStorage.setItem(key(platform),JSON.stringify({at:Date.now(),config}));}catch{/* Storage is optional. */}
}
