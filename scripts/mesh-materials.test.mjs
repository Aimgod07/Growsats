import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/grogames/',import.meta.url);
const box={console,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillText(){}})})}};
box.window=box;vm.createContext(box);
for(const file of ['courtside/assets/three.min.js','visuals/materials.js','courtside/assets/player.js'])vm.runInContext(fs.readFileSync(new URL(file,root),'utf8'),box);
test('material maps are shared, with physically distinct skin, cloth and metal',()=>{
 const {THREE:T,GroMaterials:M}=box,skin=M.make(T,'#b9784d','skin'),cloth=M.make(T,'#4488aa','fabric'),metal=M.make(T,'#778899','metal');
 assert.equal(skin.isMeshPhysicalMaterial,true);assert.equal(skin.metalness,0);assert.ok(cloth.roughness>skin.roughness);assert.ok(metal.metalness>.8);
 assert.notEqual(skin.bumpMap,skin.roughnessMap);assert.equal(cloth.bumpMap,M.make(T,'#ffaa00','fabric').bumpMap);assert.equal(cloth.flatShading,false);
});
test('sculpted athlete surfaces have UVs for their material maps',()=>{
 const athlete=box.createCourtPlayer(box.THREE);let textured=0;
 athlete.root.traverse(node=>{if(!node.isMesh||!node.material.bumpMap)return;textured++;assert.ok(node.geometry.getAttribute('uv'),node.material.name+' needs UVs');const p=node.geometry.getAttribute('position');for(const value of p.array)assert.ok(Number.isFinite(value));});
 assert.ok(textured>20);
});
