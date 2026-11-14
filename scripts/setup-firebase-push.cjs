// User-approved FCM sender provisioning. Never print or save private keys.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const toolsRoot='C:/Users/choud/AppData/Roaming/npm/node_modules/firebase-tools';
const {getGlobalDefaultAccount,getAccessToken}=require(toolsRoot+'/lib/auth.js');
const {GoogleAuth}=require(toolsRoot+'/node_modules/google-auth-library');
const project='playloot-push-20261024',number='780956025568';
const email=`playloot-push@${project}.iam.gserviceaccount.com`;
const backend='C:/Users/choud/Desktop/playloot-backend';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const account=getGlobalDefaultAccount();if(!account)throw Error('Firebase login required');
 const auth=await getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 async function api(url,method='GET',body){
  const r=await fetch(url,{method,headers:{authorization:'Bearer '+auth.access_token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(`Google API ${r.status}: ${d.error?.message||'request failed'}`);e.status=r.status;throw e;}return d;
 }
 console.log('Enabling FCM and IAM services.');
 let op=await api(`https://serviceusage.googleapis.com/v1/projects/${number}/services:batchEnable`,'POST',{serviceIds:['fcm.googleapis.com','iam.googleapis.com']});
 const opName=op.name;for(let n=0;!op.done&&n<20;n++){await wait(2000);op=await api('https://serviceusage.googleapis.com/v1/'+opName);}if(!op.done||op.error)throw Error('Service activation incomplete');
 const service=`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/${email}`;
 try{await api(service);}catch(e){if(e.status!==404)throw e;await api(`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`,'POST',{accountId:'playloot-push',serviceAccount:{displayName:'Playloot push sender',description:'FCM messages from the Playloot Cloudflare Worker'}});}
 const resource=`https://cloudresourcemanager.googleapis.com/v1/projects/${project}`;
 const policy=await api(resource+':getIamPolicy','POST',{options:{requestedPolicyVersion:3}});policy.bindings||=[];
 let binding=policy.bindings.find(b=>b.role==='roles/firebasecloudmessaging.admin'&&!b.condition);
 if(!binding){binding={role:'roles/firebasecloudmessaging.admin',members:[]};policy.bindings.push(binding);}
 if(!binding.members.includes('serviceAccount:'+email))binding.members.push('serviceAccount:'+email);
 await api(resource+':setIamPolicy','POST',{policy});
 console.log('Dedicated FCM sender permission configured.');
 const key=await api(service+'/keys','POST',{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE',keyAlgorithm:'KEY_ALG_RSA_2048'});let uploadAttempted=false;
 try{
  const credentials=JSON.parse(Buffer.from(key.privateKeyData,'base64').toString('utf8'));
  const google=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/firebase.messaging']});let validated=false;
  for(let n=0;n<6;n++){
   let token;
   try{token=await google.getAccessToken();}catch(e){
    // A newly created IAM key can take a few seconds to reach Google's token servers.
    if(n===5)throw e;
    console.log('Waiting for Google to activate the new sender key.');await wait(5000);continue;
   }
   const r=await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({validate_only:true,message:{topic:'playloot-setup-validation',notification:{title:'Setup validation',body:'Validation only; not delivered.'}}}),signal:AbortSignal.timeout(20000)});
   if(r.ok){await r.body?.cancel();validated=true;break;}
   const d=await r.json().catch(()=>({}));if(n===5||![403,404,429,500,503].includes(r.status))throw Error('FCM validation: '+(d.error?.message||r.status));await wait(5000);
  }
  if(!validated)throw Error('FCM validation incomplete');console.log('FCM dry-run passed. No message sent.');uploadAttempted=true;
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[backend+'/node_modules/wrangler/bin/wrangler.js','secret','put','FCM_SERVICE_ACCOUNT'],{cwd:backend,stdio:['pipe','pipe','pipe'],env:{...process.env,NODE_USE_SYSTEM_CA:'1'}});
   child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Secret upload failed; check status before retry.')));child.stdin.end(JSON.stringify(credentials));
  });
  fs.writeFileSync('docs/firebase-project.json',JSON.stringify({projectId:project,projectNumber:number,androidPackage:'com.grosats.Growgames',sender:email,credentialLocation:'Cloudflare Worker secret FCM_SERVICE_ACCOUNT',validated:true},null,2)+'\n');
  console.log('Firebase connected to the Cloudflare Worker.');
 }catch(e){if(!uploadAttempted){await api('https://iam.googleapis.com/v1/'+key.name,'DELETE').catch(()=>{});console.log('Unused key revoked after setup failure.');}throw e;}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
