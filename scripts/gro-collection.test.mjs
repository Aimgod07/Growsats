import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/grogames/',import.meta.url),box={};
vm.createContext(box);
const renderContext=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'||key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
box.document={createElement:()=>({getContext:()=>renderContext})};
vm.runInContext(fs.readFileSync(new URL('visuals/studio.js',root),'utf8'),box);

vm.runInContext(fs.readFileSync(new URL('collection-2/catalog.js',root),'utf8'),box);
vm.runInContext(fs.readFileSync(new URL('collection-2/games.js',root),'utf8'),box);
function session(){let seed=43;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;return {time:0,score:0,ended:false,accent:'#4defff',secondary:'#b78aff',rand:(a,b)=>a+random()*(b-a),int:(a,b)=>Math.floor(a+random()*(b-a+1)),add(n){assert.ok(Number.isSafeInteger(n)&&n>=0);this.score+=n;},end(win){this.ended=true;this.win=win;},hint(){}};}
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get(_,name){if(name==='createRadialGradient'||name==='createLinearGradient')return()=>gradient;return(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),`Non-finite ${name}`);};},set(){return true;}});
test('33 unique games have entries, covers, launch pages and portrait metadata',()=>{
 assert.equal(box.GroCollection.length,33);assert.equal(new Set(box.GroCollection.map(g=>g.id)).size,33);
 const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
 for(const g of box.GroCollection){assert.equal(g.orientation,'portrait');assert.equal(typeof box.GroFactories[g.mode],'function');assert.ok(manifest.some(m=>m.id===g.id));assert.ok(fs.existsSync(new URL('../'+g.path.replace(/^\//,''),root)));assert.ok(fs.existsSync(new URL('../'+g.cover.replace(/^\//,''),root)));}
});
for(const meta of box.GroCollection)test(`${meta.title}: rendering, input, progression and restart`,()=>{
 for(let run=0;run<2;run++){const s=session(),g=box.GroFactories[meta.mode](s);g.draw(ctx);
  for(let i=0;i<3600&&!s.ended;i++){s.time+=1/60;g.update?.(1/60);if(i%31===0){const x=s.rand(10,390),y=s.rand(80,580);g.down?.(x,y);g.move?.(x+3,y+3);g.up?.(x+20,y+20);g.key?.(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'][i%4]);}if(i%60===0)g.draw(ctx);}
  assert.ok(s.score>=0);g.draw(ctx);
 }
});
test('memory pairs award points and complete only after all eight pairs',()=>{
 const s=session(),g=box.GroFactories.memory(s),values=[];
 const capture=new Proxy(ctx,{get(t,k){if(k==='fillText')return(text,x,y)=>{if(y>=120&&y<440&&text!=='?')values[Math.floor((y-120)/80)*4+Math.floor((x-40)/80)]=text;};return t[k];}});
 for(let i=0;i<16;i++){g.down(80+i%4*80,160+Math.floor(i/4)*80);g.draw(capture);g.update(1);}
 const pairs=new Map();values.forEach((v,i)=>{if(!pairs.has(v))pairs.set(v,[]);pairs.get(v).push(i);});
 assert.equal(pairs.size,8);for(const pair of pairs.values())for(const i of pair)g.down(80+i%4*80,160+Math.floor(i/4)*80);
 assert.equal(s.score,800);assert.equal(s.win,true);
});
test('goal rush ends after ten shots with bounded score',()=>{const s=session(),g=box.GroFactories.goal(s);for(let i=0;i<10;i++)g.down(60,180);assert.equal(s.score,1000);assert.equal(s.ended,true);});
test('first minesweeper reveal is safe across board',()=>{for(let i=0;i<36;i++){const s=session(),g=box.GroFactories.mines(s);g.down(60+i%6*56,148+Math.floor(i/6)*56);assert.notEqual(s.win,false);assert.ok(s.score>0);}});
test('misaligned tower placement loses without granting extra score',()=>{const s=session(),g=box.GroFactories.stack(s);g.down();assert.equal(s.score,50);g.down();assert.equal(s.score,50);assert.equal(s.win,false);});
