import {fail,sha256} from './util.js';
export async function limitRequest(env,key,max=60,seconds=60){
 const window=Math.floor(Date.now()/1000/seconds),hashed=await sha256(key);
 const row=await env.DB.prepare(`INSERT INTO request_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count`).bind(hashed,window).first();
 return row?.count>max?fail('Too many requests. Please wait before retrying.',429,'rate_limited'):null;
}
export async function boundedRequest(request){
 if(!request.body)return {request};
 const max=new URL(request.url).pathname==='/api/avatar'?2*1024*1024:128*1024;
 if(Number(request.headers.get('content-length'))>max)return {error:fail('Request too large',413)};
 const reader=request.body.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return {error:fail('Request too large',413)};}chunks.push(value);}
 const body=new Uint8Array(size);let at=0;for(const c of chunks){body.set(c,at);at+=c.byteLength;}
 const headers=new Headers(request.headers);headers.delete('content-length');
 if(max===128*1024 && new URL(request.url).pathname!=='/api/payments/webhook' && size){
  if(!headers.get('content-type')?.includes('application/json'))return {error:fail('Expected application/json',415,'unsupported_media_type')};
  try{const data=JSON.parse(new TextDecoder().decode(body));if(!data||typeof data!=='object'||Array.isArray(data))return {error:fail('Expected a JSON object',400,'invalid_json')};}catch{return {error:fail('Malformed JSON body',400,'invalid_json')};}
 }
 return {request:new Request(request.url,{method:request.method,headers,body})};
}
