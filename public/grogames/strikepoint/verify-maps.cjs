// Run: node verify-maps.cjs. No dependencies, browser, network, or account needed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const cache=new Map();function load(name){if(cache.has(name))return cache.get(name);const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,name),'utf8'),{module,exports:module.exports,require:n=>load(n.replace('./','')),console,globalThis:{}});cache.set(name,module.exports);return module.exports;}
const C=load('catalog.js'),{Arena}=load('engine.js');
for(let i=0;i<3;i++){
 const a=new Arena({map:i},55),m=C.maps[i];assert.equal(a.blocks.length,m.obstacles.length);assert(!a.blocked(a.player.x,a.player.z,.4,a.player.y),'start free');
 const queue=[0],seen=new Set(queue);for(let k=0;k<queue.length;k++)for(const n of a.nav[queue[k]].links)if(!seen.has(n)){seen.add(n);queue.push(n);}
 // Roofs are not nodes. Every navigable ground and terrace tile must join the same graph.
 assert.equal(seen.size,a.nav.length,m.name+' has disconnected walkable areas');
 for(const [x,z] of m.spawns){assert(!a.blocked(x,z,.5,a.surface(x,z)));assert(a.path({x,z},a.player).length>0);}
 for(const r of m.ramps){const length=r.axis==='x'?r.w:r.d;const p={x:r.x-(r.axis==='x'?r.dir*(length/2+.5):0),z:r.z-(r.axis==='z'?r.dir*(length/2+.5):0),y:0,vy:0};p.y=a.surface(p.x,p.z);for(let n=0;n<(length+1)*20;n++)a.move(p,r.axis==='x'?r.dir*.05:0,r.axis==='z'?r.dir*.05:0);assert(Math.abs(p.y-r.h)<.1,m.name+' stair ascent');for(let n=0;n<(length+1)*20;n++)a.move(p,r.axis==='x'?-r.dir*.05:0,r.axis==='z'?-r.dir*.05:0);assert(p.y<.1,m.name+' stair descent');}
 assert(a.blocked(m.bounds+1,0));a.player.health=1e6;for(let j=0;j<3600;j++)a.step(1/60,{});assert(a.enemies.length>0);for(const e of a.enemies){assert(Number.isFinite(e.y));assert(!a.blocked(e.x,e.z,.39,e.y));}
 const b=a.blocks[0],o={x:b.x,y:b.base+1,z:b.z+b.d/2+2};assert(Math.abs(a.wallDistance(o,{x:0,y:0,z:-1})-2)<.05,'cover blocks gunfire');
 console.log(m.name+': connected '+a.nav.length+' navigation nodes; spawns, ramps, collision, combat simulation passed.');
}
// Build the actual Three.js geometry to catch invalid meshes and measure the static budgets.
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
const scope={console,Math,Float32Array,Uint16Array,Uint32Array,ArrayBuffer,TextDecoder,document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})},navigator:{hardwareConcurrency:8},matchMedia:()=>({matches:false})};scope.window=scope;scope.globalThis=scope;vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/three.min.js'),'utf8'),scope);scope.StrikeCatalog=C;scope.StrikeModels={};vm.runInContext(fs.readFileSync(path.join(__dirname,'environments.js'),'utf8'),scope);
for(let i=0;i<3;i++){const scene=scope.StrikeModels.environment(i);let meshes=0,triangles=0;scene.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;for(const v of p.array)assert(Number.isFinite(v),'finite geometry');triangles+=(o.geometry.index?.count||p.count)/3;});assert(meshes<55,'static draw call budget');assert(triangles<150000,'triangle budget');console.log(C.maps[i].name+': '+meshes+' static meshes, '+Math.round(triangles)+' triangles; geometry valid.');}
console.log('All Strikepoint map checks passed. Device frame rate and shader rendering require browser/device checks.');
