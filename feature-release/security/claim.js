import {randomId} from './util.js';
// The unique receipt token gates every write in one transaction. Historical
// receipts with NULL tokens stay claimed and cannot be credited again.
export async function atomicReward(env,{table,columns,values,userId,kind='coins',amount,source,refId=null}){
 if(!['daily_claims','mission_claims','spins'].includes(table)||!['coins','diamonds'].includes(kind)||!Number.isSafeInteger(amount)||amount<=0)throw new Error('Invalid reward');
 const rid=randomId('rwd');
 const exists=`EXISTS(SELECT 1 FROM ${table} WHERE reward_id=?)`;
 const result=await env.DB.batch([
  env.DB.prepare(`INSERT OR IGNORE INTO ${table}(${columns},reward_id) VALUES(${values.map(()=>'?').join(',')},?)`).bind(...values,rid),
  env.DB.prepare(`UPDATE wallets SET ${kind}=${kind}+?${kind==='coins'?',lifetime_coins=lifetime_coins+?':''},updated_at=datetime('now') WHERE user_id=? AND ${exists}`).bind(...(kind==='coins'?[amount,amount,userId,rid]:[amount,userId,rid])),
  env.DB.prepare(`INSERT INTO reward_ledger(id,user_id,source,kind,amount,ref_id) SELECT ?,?,?,?,?,? WHERE ${exists}`).bind(rid,userId,source,kind,amount,refId,rid),
 ]);
 return !!result[0].meta?.changes;
}
