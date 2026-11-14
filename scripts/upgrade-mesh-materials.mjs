import fs from 'node:fs';
const root=new URL('../public/grogames/',import.meta.url);
const files=['courtside/assets/player.js','first-touch/models.js','skyline-sprint/game.js','strikepoint/models.js'];
function edit(name,changes){const file=new URL(name,root);let code=fs.readFileSync(file,'utf8');for(const [a,b] of changes)code=code.replace(a,b);fs.writeFileSync(file,code);}
edit(files[0],[
 ["const M=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness});","const M=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness});\nconst P=(color,kind)=>GroMaterials.make(THREE,color,kind);"],
 ["skin=M('#b9784d',.62),skinShade=M('#9b5c39'),fabric=M('#e87624',.94)","skin=P('#b9784d','skin'),skinShade=P('#9b5c39','skin'),fabric=P('#e87624','fabric')"],
 ["hair=M('#24251f',.98),sole=M('#f0e8d6'),shoe=M('#e48a3c'),sock=M('#e4ddd0')","hair=P('#24251f','hair'),sole=P('#f0e8d6','rubber'),shoe=P('#e48a3c','leather'),sock=P('#e4ddd0','fabric')"],
 ['const vertices=[],indices=[],segments=32;','const vertices=[],indices=[],uvs=[],segments=32;'],
 ['vertices.push(Math.cos(a)*rx*f,y,cz+Math.sin(a)*rz*f);','vertices.push(Math.cos(a)*rx*f,y,cz+Math.sin(a)*rz*f);uvs.push(i/segments,j/(rows.length-1));'],
 ["g.setIndex(indices);g.computeVertexNormals();","g.setIndex(indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();"]
]);
edit(files[1],[
 ['const mat=(c,r=.85)=>new T.MeshStandardMaterial({color:c,roughness:r});',"const mat=(c,r=.85)=>new T.MeshStandardMaterial({color:c,roughness:r});\nconst P=(color,kind)=>typeof GroMaterials!=='undefined'?GroMaterials.make(T,color,kind):mat(color);"],
 ['skin=mat(d.skin,.65)','skin=P(d.skin,\'skin\')'],['shirt=mat(d.kit),short=mat(d.shorts)','shirt=P(d.kit,\'fabric\'),short=P(d.shorts,\'fabric\')'],['hair=mat(d.hair)','hair=P(d.hair,\'hair\')'],["boot=mat(d.boot,.48),sole=mat('#243c42')","boot=P(d.boot,'leather'),sole=P('#243c42','rubber')"],
 ['const v=[],ix=[];rows.forEach(([y,rx,rz,cz=0])=>','const v=[],ix=[],uvs=[];rows.forEach(([y,rx,rz,cz=0],row)=>'],
 ['v.push(Math.cos(a)*rx,y,Math.sin(a)*rz+cz);','v.push(Math.cos(a)*rx,y,Math.sin(a)*rz+cz);uvs.push(i/n,row/(rows.length-1));'],
 ["g.setIndex(ix);g.computeVertexNormals();","g.setIndex(ix);g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();"]
]);
edit(files[3],[
 ["mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.65,...extra});","mat=(color,extra={})=>{const m=typeof GroMaterials!=='undefined'?GroMaterials.make(T,color,extra.metalness>.35?'metal':'fabric'):new T.MeshStandardMaterial({color,roughness:.65});m.setValues(extra);return m;};"]
]);
for(const folder of ['courtside','first-touch','strikepoint','skyline-sprint','groove-grove','fruit-frenzy','tidal-rush']){
 const name=folder+'/index.html',file=new URL(name,root);let html=fs.readFileSync(file,'utf8');
 if(!html.includes('/visuals/materials.js'))html=html.replace('</head>','<script src="/grogames/visuals/materials.js"></script></head>');fs.writeFileSync(file,html);
}
console.log('PBR skin, woven fabric, leather, rubber and brushed metal installed; character surface UVs added.');
