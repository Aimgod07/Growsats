import {afterEach,describe,it,expect,vi} from 'vitest';
import {shareRead} from './inFlight';
import {readConfigCache,writeConfigCache} from './configCache';
afterEach(()=>{sessionStorage.clear();vi.useRealTimers();});
describe('in-flight read reuse',()=>{
 it('coalesces simultaneous reads and fetches fresh data after completion',async()=>{
  let resolve;const load=vi.fn(()=>new Promise(r=>{resolve=r}));
  const first=shareRead('session-a:/wallet',load),second=shareRead('session-a:/wallet',load);
  expect(first).toBe(second);expect(load).toHaveBeenCalledTimes(1);
  resolve({coins:10});await first;
  const fresh=vi.fn(async()=>({coins:20}));expect(await shareRead('session-a:/wallet',fresh)).toEqual({coins:20});expect(fresh).toHaveBeenCalledTimes(1);
 });
 it('keeps different sessions separate and permits retry after failures',async()=>{
  const a=shareRead('a:/profile',async()=>({name:'a'})),b=shareRead('b:/profile',async()=>({name:'b'}));
  expect(await a).toEqual({name:'a'});expect(await b).toEqual({name:'b'});
  await expect(shareRead('failed',async()=>{throw Error('offline')})).rejects.toThrow('offline');
  expect(await shareRead('failed',async()=>42)).toBe(42);
 });
});
describe('public configuration cache',()=>{
 it('reuses recent public settings and separates web from APK',()=>{
  const config={screens:{arcade:{groGames:{limit:10}}}};writeConfigCache('web',config);
  expect(readConfigCache('web')).toEqual(config);expect(readConfigCache('apk')).toBeNull();
 });
 it('ignores expired or malformed settings',()=>{
  vi.useFakeTimers();writeConfigCache('web',{version:1});vi.advanceTimersByTime(300001);expect(readConfigCache('web')).toBeNull();
  sessionStorage.setItem('playloot.public-config.v1:web','broken');expect(readConfigCache('web')).toBeNull();
 });
});
