/* Shared, cached smooth-surface artwork. Rendering only; no game state or input. */
(() => {
 'use strict';
 const cache=new Map(),TAU=Math.PI*2;
 // Rasterize an actual ellipsoid triangle mesh once into the character atlas.
 // Vertex-normal lighting gives the head and clothing a continuous surface.
 function meshVolume(c,x,y,rx,ry,rz,color){
  const vertices=[],faces=[],rows=24,cols=40;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const lat=j/rows*Math.PI,lon=i/cols*TAU,nx=Math.sin(lat)*Math.cos(lon),ny=Math.cos(lat),nz=Math.sin(lat)*Math.sin(lon);
   vertices.push({x:x+nx*rx,y:y-ny*ry,z:nz*rz,light:clampLight(nx*-.35+ny*.55+nz*.72)});
  }
  function clampLight(v){return Math.max(.2,Math.min(1,.35+v*.65));}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;for(const ids of [[a,b,a+1],[b,b+1,a+1]]){const p=ids.map(k=>vertices[k]);if(p.some(v=>v.z>0))faces.push(p);}}
  faces.sort((a,b)=>a.reduce((n,v)=>n+v.z,0)-b.reduce((n,v)=>n+v.z,0));
  const base=/^#[0-9a-f]{6}$/i.test(color)?color:'#7fc8dd',rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
  for(const p of faces){const light=p.reduce((n,v)=>n+v.light,0)/3;c.fillStyle=`rgb(${rgb.map(v=>Math.round(v*light+20*light)).join(',')})`;c.beginPath();c.moveTo(p[0].x,p[0].y);c.lineTo(p[1].x,p[1].y);c.lineTo(p[2].x,p[2].y);c.closePath();c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=.35;c.stroke();}
 }
 function ellipse(c,x,y,rx,ry,color){const g=c.createRadialGradient(x-rx*.32,y-ry*.4,1,x,y,Math.max(rx,ry));g.addColorStop(0,'#ffffff');g.addColorStop(.18,color);g.addColorStop(.65,color);g.addColorStop(1,'#101c32');c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
 function capsule(c,a,b,r,color){const dx=b[0]-a[0],dy=b[1]-a[1],angle=Math.atan2(dy,dx);c.save();c.translate(a[0],a[1]);c.rotate(angle);const g=c.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.2,color);g.addColorStop(.65,color);g.addColorStop(1,'#152139');c.fillStyle=g;c.beginPath();c.roundRect(-r,-r,Math.hypot(dx,dy)+r*2,r*2,r);c.fill();c.restore();}
 function sprite(type,color){const key=type+color;if(cache.has(key))return cache.get(key);const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const c=canvas.getContext('2d');c.scale(2,2);c.translate(48,48);
  if(type==='pilot'){
   // Sculpted shoulders, articulated limbs, jaw, nose, eyes and layered clothing.
   ellipse(c,0,38,22,4,'#111827');
   capsule(c,[-7,10],[-9,28],5,'#263a55');capsule(c,[7,10],[9,28],5,'#263a55');
   capsule(c,[-9,29],[-12,36],4,'#526985');capsule(c,[9,29],[13,36],4,'#526985');
   capsule(c,[-12,-12],[-19,0],4,color);capsule(c,[-19,0],[-17,13],3,'#bb805e');
   capsule(c,[12,-12],[19,0],4,color);capsule(c,[19,0],[17,13],3,'#bb805e');
   meshVolume(c,0,-4,13,19,8,color);capsule(c,[-8,9],[8,9],2,'#172b43');
   capsule(c,[0,-23],[0,-17],4,'#b97a56');meshVolume(c,0,-31,9,12,8,'#c38b67');
   ellipse(c,0,-39,9,5,'#273143');ellipse(c,-7,-32,2,4,'#b9815f');ellipse(c,7,-32,2,4,'#b9815f');
   c.fillStyle='#253047';c.fillRect(-5,-33,3,1.5);c.fillRect(2,-33,3,1.5);ellipse(c,0,-29,1.5,3,'#d7a582');
   c.strokeStyle='#7c4f43';c.lineWidth=.7;c.beginPath();c.moveTo(-3,-24);c.quadraticCurveTo(0,-23,3,-24);c.stroke();
   capsule(c,[-7,-12],[-7,3],1,'#ffffff77');ellipse(c,5,-10,2,2,'#d4fbff');
  }else if(type==='ship'){
   ellipse(c,0,12,27,29,'#15243a');
   for(const side of [-1,1]){capsule(c,[side*11,22],[side*20,-5],7,color);ellipse(c,side*14,29,5,9,'#70dbff');}
   ellipse(c,0,-3,11,33,color);ellipse(c,0,-9,7,15,'#47708e');ellipse(c,-2,-13,3,8,'#a7e6f5');capsule(c,[-3,14],[3,14],2,'#f7d68e');
  }else if(type==='car'){
   for(const side of [-1,1])for(const y of [-22,22])capsule(c,[side*21,y-5],[side*21,y+5],5,'#151e2a');
   ellipse(c,0,0,21,42,color);capsule(c,[-13,-30],[13,-30],3,'#eff4fa');
   ellipse(c,0,-2,15,25,'#182e45');ellipse(c,0,-12,13,12,'#7295ac');ellipse(c,0,17,12,8,'#405f79');
   capsule(c,[-15,-36],[-8,-36],2,'#fff2c8');capsule(c,[8,-36],[15,-36],2,'#fff2c8');
   capsule(c,[-14,35],[-7,35],2,'#ff889a');capsule(c,[7,35],[14,35],2,'#ff889a');
   c.strokeStyle='#ffffff44';c.lineWidth=1;c.beginPath();c.moveTo(-16,-22);c.quadraticCurveTo(-20,0,-15,25);c.stroke();
  }else if(type==='fox'){
   capsule(c,[-10,14],[-20,9],9,'#ce8251');ellipse(c,-25,6,10,6,'#f5dfbf');
   capsule(c,[-7,15],[-8,31],4,'#343244');capsule(c,[7,15],[9,31],4,'#343244');ellipse(c,0,7,12,20,'#d48b55');ellipse(c,0,7,7,14,'#efd6ad');
   ellipse(c,-10,-25,5,14,'#bc764f');ellipse(c,10,-25,5,14,'#bc764f');ellipse(c,0,-17,16,15,'#e8a66b');ellipse(c,0,-9,12,7,'#f2debf');ellipse(c,0,-10,3,2,'#252939');
   ellipse(c,-6,-20,2,3,'#252939');ellipse(c,6,-20,2,3,'#252939');
  }
  if(cache.size>=48)cache.delete(cache.keys().next().value);cache.set(key,canvas);return canvas;
 }
 const art={
  character(c,x,y,size=40,color='#83d8ed'){c.drawImage(sprite('pilot',color),x-size/2,y-size*.55,size,size);},
  ship(c,x,y,color='#83d8ed',angle=0,size=60){c.save();c.translate(x,y);c.rotate(angle);c.drawImage(sprite('ship',color),-size/2,-size/2,size,size);c.restore();},
  car(c,x,y,color,angle=0,scale=1){c.save();c.translate(x,y);c.rotate(angle);c.drawImage(sprite('car',color),-30*scale,-52*scale,60*scale,104*scale);c.restore();},
  fox(c,x,y,size=1,face=1){c.save();c.translate(x,y-29*size);c.scale(face,1);c.drawImage(sprite('fox','#d48b55'),-37*size,-37*size,74*size,74*size);c.restore();},
  orb(c,x,y,r,color){ellipse(c,x,y,r,r,color);},
  tile(c,x,y,w,h,color,r=10){if(w<=0||h<=0)return;c.save();const g=c.createLinearGradient(x,y,x+w*.3,y+h);g.addColorStop(0,color);g.addColorStop(1,'#17263a');c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));c.fill();c.strokeStyle='#ffffff18';c.lineWidth=1;c.stroke();if(w>25&&h>15){c.strokeStyle='#ffffff30';c.beginPath();c.moveTo(x+r,y+1);c.lineTo(x+w-r,y+1);c.stroke();}c.restore();}
 };
 globalThis.GroStudio=art;
 // The classic engines expose their artwork independently of game simulation.
 if(globalThis.Art){Art.car=art.car;Art.ship=art.ship;Art.fox=art.fox;}
})();
