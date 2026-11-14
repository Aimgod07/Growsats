import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/grogames/',import.meta.url),box={};vm.createContext(box);
const renderContext=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'||key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
box.document={createElement:()=>({getContext:()=>renderContext})};
vm.runInContext(fs.readFileSync(new URL('visuals/studio.js',root),'utf8'),box);

for(const file of ['catalog.js','games.js'])vm.runInContext(fs.readFileSync(new URL('collection-3/'+file,root),'utf8'),box);
function session(){let seed=128;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;return{time:0,score:0,ended:false,accent:'#4defff',secondary:'#b78aff',rand:(a,b)=>a+rand()*(b-a),int:(a,b)=>Math.floor(a+rand()*(b-a+1)),add(n){assert.ok(Number.isSafeInteger(n)&&n>=0);this.score+=n;},end(win){this.ended=true;this.win=win;},hint(){}};}
const ctx=new Proxy({},{get:(_,name)=> name==='createRadialGradient'||name==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name);},set:()=>true});
test('30 new unique portrait games, all installed with covers',()=>{assert.equal(box.GroCollection.length,30);const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));assert.equal(new Set(manifest.map(g=>g.id)).size,manifest.length);assert.equal(manifest.length,100);for(const g of box.GroCollection){assert.equal(g.orientation,'portrait');assert.ok(fs.existsSync(new URL('../'+g.path.slice(1),root)));assert.ok(fs.existsSync(new URL('../'+g.cover.slice(1),root)));assert.equal(typeof box.GroFactories[g.mode],'function');}});
for(const meta of box.GroCollection)test(meta.title+' renders, accepts input, advances and restarts',()=>{for(let run=0;run<3;run++){const s=session(),g=box.GroFactories[meta.mode](s);g.draw(ctx);for(let i=0;i<4200&&!s.ended;i++){s.time+=1/60;g.update?.(1/60);if(i%37===0&&!s.ended){const x=s.rand(10,390),y=s.rand(80,580);g.down?.(x,y);if(!s.ended)g.move?.(x+10,y+10);if(!s.ended)g.up?.(x+20,y+20);}if(i%60===0)g.draw(ctx);}g.draw(ctx);assert.ok(s.score>=0);}});
test('river crossing supports the valid seven-crossing solution',()=>{const s=session(),g=box.GroFactories.river(s);const cross=()=>g.down(200,524),pick=i=>g.down(80,210+i*80);pick(1);cross();cross();pick(0);cross();pick(1);cross();pick(2);cross();cross();pick(1);cross();assert.equal(s.win,true);assert.equal(s.score,700);});
test('leaving goat with cabbage loses',()=>{const s=session(),g=box.GroFactories.river(s);g.down(80,210);g.down(200,524);assert.equal(s.win,false);assert.equal(s.score,0);});
test('Hanoi can be completed in optimal 15 moves',()=>{const s=session(),g=box.GroFactories.hanoi(s);function move(n,a,b,spare){if(!n)return;move(n-1,a,spare,b);g.down(67+a*133,300);g.down(67+b*133,300);move(n-1,spare,b,a);}move(4,0,2,1);assert.equal(s.win,true);assert.equal(s.score,1200);});
test('five nonattacking queens complete the puzzle',()=>{const s=session(),g=box.GroFactories.queens(s);[0,2,4,1,3].forEach((col,row)=>g.down(70+col*65,162+row*65));assert.equal(s.win,true);});
test('reaction game penalizes early taps and ends after five rounds',()=>{const s=session(),g=box.GroFactories.reaction(s);for(let i=0;i<5;i++)g.down();assert.equal(s.ended,true);assert.equal(s.score,0);});
test('letter games complete using the displayed letters and clues',()=>{for(const mode of ['word','anagram']){const s=session(),g=box.GroFactories[mode](s);for(const word of ['MOON','STAR','WAVE','FROG','FIRE','GOLD','WIND','LEAF']){for(const letter of word){const drawn=[];const c=new Proxy(ctx,{get(t,k){return k==='fillText'?(text,x,y)=>{if(y>=280&&y<440)drawn.push({text,x,y});}:t[k];}});g.draw(c);const p=drawn.find(v=>v.text===letter);assert.ok(p);g.down(p.x,p.y);}}assert.equal(s.win,true);assert.equal(s.score,800);}});
