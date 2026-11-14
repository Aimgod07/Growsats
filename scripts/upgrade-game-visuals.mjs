import fs from 'node:fs';
const root=new URL('../public/grogames/',import.meta.url);
const games=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
let count=0;
for(const game of games){
 const file=new URL(game.path.split('?')[0].replace('/grogames/',''),root);
 let html=fs.readFileSync(file,'utf8');
 if(!html.includes('/grogames/visuals/studio.css'))html=html.replace('</head>','<link rel="stylesheet" href="/grogames/visuals/studio.css"></head>');
 if(!html.includes('/grogames/visuals/studio.js')){
  const script='<script src="/grogames/visuals/studio.js"></script>';
  if(html.includes('<script src="engine.js"></script>'))html=html.replace('<script src="engine.js"></script>','<script src="engine.js"></script>'+script);
  else if(html.includes('<script src="../collection-'))html=html.replace(/<script src="\.\.\/collection-/,script+'<script src="../collection-');
  else html=html.replace('</head>',script+'</head>');
 }
 fs.writeFileSync(file,html);count++;
}
// Collection artwork helpers are the only rendering entry points changed.
for(const [name,changes] of [
 ['collection-2/games.js',[
  [/const round=\(c,x,y,w,h,color,r=10\)=>\{[^\n]+/,"const round=(c,x,y,w,h,color,r=10)=>GroStudio.tile(c,x,y,w,h,color,r);"],
  [/const ball=\(c,x,y,r,color\)=>\{[^\n]+/,"const ball=(c,x,y,r,color)=>GroStudio.orb(c,x,y,r,color);"],
  [/const ship=\(c,x,y,color\)=>\{[^\n]+/,"const ship=(c,x,y,color)=>GroStudio.ship(c,x,y,color);"],
  ['ball(c,x,y,12,s.accent);','GroStudio.character(c,x,y,40,s.accent);'],
  ['round(c,96,y-14,27,28,s.secondary,8);','GroStudio.character(c,110,y,39,s.secondary);'],
  ["round(c,keeper-25,235,50,65,s.secondary);ball(c,keeper,222,15,s.secondary);","GroStudio.character(c,keeper,257,90,s.secondary);"],
 ]],
 ['collection-3/games.js',[
  [/function rect\(c,x,y,w,h,color,r=10\)\{[^\n]+/,"function rect(c,x,y,w,h,color,r=10){GroStudio.tile(c,x,y,w,h,color,r);}"],
  [/function dot\(c,x,y,r,color\)\{[^\n]+/,"function dot(c,x,y,r,color){GroStudio.orb(c,x,y,r,color);}"],
  ['dot(c,65+lane*70,505,13,s.accent);dot(c,265+(1-lane)*70,505,13,s.secondary);','GroStudio.character(c,65+lane*70,505,38,s.accent);GroStudio.character(c,265+(1-lane)*70,505,38,s.secondary);'],
 ]]
]){const file=new URL(name,root);let code=fs.readFileSync(file,'utf8');for(const [from,to] of changes)code=code.replace(from,to);fs.writeFileSync(file,code);}
const court=new URL('courtside/index.html',root);let html=fs.readFileSync(court,'utf8');html=html.replace('roughness:.88,flatShading:true','roughness:.68,flatShading:false').replace('SphereGeometry(.235,16,12)','SphereGeometry(.235,32,24)').replace('p=scene,n=8','p=scene,n=16');fs.writeFileSync(court,html);
for(const name of ['first-touch/models.js','first-touch/environment.js','first-touch/hero-face.js','fruit-frenzy/game.js','groove-grove/game.js','skyline-sprint/game.js','tidal-rush/game.js','strikepoint/models.js','strikepoint/game.js']){
 const file=new URL(name,root);let code=fs.readFileSync(file,'utf8');
 code=code.replace(/flatShading\s*:\s*true/g,'flatShading:false')
  .replace(/SphereGeometry\(1,18,12\)/g,'SphereGeometry(1,28,20)')
  .replace(/SphereGeometry\(1,20,14\)/g,'SphereGeometry(1,28,20)');
 fs.writeFileSync(file,code);
}
console.log(`Upgraded presentation for ${count} games; smooth cached characters enabled in compatible Canvas renderers.`);
