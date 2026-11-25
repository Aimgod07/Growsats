(function(root){'use strict';
class Renderer{
 constructor(canvas,createCanvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.createCanvas=createCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});this.noise=this.createCanvas(540,960);const n=this.noise.getContext('2d');let seed=27;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};for(let i=0;i<50000;i++){n.fillStyle=rand()>.48?'rgba(0,0,0,.19)':'rgba(204,170,255,.075)';n.fillRect(rand()*540,rand()*960,rand()*1.7+.2,rand()*1.7+.2);}this.effects=[];this.shake=0;this.tick=0;}
 path(points,fill,stroke,width=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}}
 line(points,color,w=1){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke();}
 rect(x,y,w,h,fill,r=0,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
 ellipse(x,y,rx,ry,fill){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
 glow(x,y,rx,ry,color){const c=this.ctx;c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(1,'transparent');this.ellipse(0,0,1,1,g);c.restore();}
 text(text,x,y,size,color,font='900 italic',align='left'){const c=this.ctx;c.textAlign=align;c.font=font+' '+size+'px Arial';c.fillStyle=color;c.fillText(text,x,y);}
 droplet(x,y,r,color){const c=this.ctx;c.beginPath();c.moveTo(x,y-r);c.bezierCurveTo(x+r*.2,y-r*.1,x+r*.8,y+r*.1,x+r*.6,y+r*.55);c.bezierCurveTo(x+r*.3,y+r*1.1,x-r*.65,y+r*.9,x-r*.65,y+r*.25);c.bezierCurveTo(x-r*.6,y-r*.15,x-r*.1,y-r*.6,x,y-r);c.fillStyle=color;c.fill();}
 car(x,y,type,angle=0,size=1){const c=this.ctx;const yellow=type==='yellow',green=type==='green';const base=yellow?'#c78704':green?'#0b542b':'#731433',accent=yellow?'#ffe533':green?'#49ff69':'#ff1a67',mid=yellow?'#f5b913':green?'#13964c':'#ba184b';c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
 this.glow(0,23,54,90,yellow?'#ddcc2866':green?'#17ed5855':'#ff005a55');this.ellipse(4,12,32,64,'#05020bc0');
 for(const s of [-1,1]){this.rect(s*24-5,-31,10,27,'#090810',3,'#453348');this.rect(s*24-5,20,10,29,'#090810',3,'#453348');this.line([[s*27,-26],[s*27,-10]],'#50414f',2);}
 const g=c.createLinearGradient(-27,0,27,0);g.addColorStop(0,'#21101f');g.addColorStop(.18,base);g.addColorStop(.44,mid);g.addColorStop(.72,base);g.addColorStop(1,'#1a0d25');
 const shell=[[-22,56],[-28,41],[-26,-26],[-20,-53],[-13,-59],[14,-59],[24,-48],[28,-20],[27,39],[21,55]];
 this.path(shell,g,'#090911',3);this.path([[-22,44],[-22,-24],[-16,-49],[16,-49],[22,-24],[21,44]],null,accent,1.3);
 // Sculpted hood, glazing, separate fenders and door creases.
 this.path([[-19,-42],[-13,-52],[13,-52],[20,-41],[15,-17],[-15,-17]],mid,'#171324',2);
 this.path([[-15,-45],[15,-45],[11,-20],[-11,-20]],'#273649','#0c1022',2);
 this.path([[-13,-43],[-3,-43],[-5,-23],[-11,-23]],'#7cabc0');this.path([[0,-43],[12,-43],[10,-23],[0,-23]],'#40556b');
 this.path([[-13,-13],[13,-13],[17,18],[12,27],[-12,27],[-17,18]],base,'#0c1022',2);
 const roof=c.createLinearGradient(0,-14,0,28);roof.addColorStop(0,mid);roof.addColorStop(1,base);this.path([[-10,-11],[10,-11],[13,18],[9,23],[-9,23],[-13,18]],roof);
 this.path([[-14,29],[14,29],[19,43],[-19,43]],'#1e2236','#080d1d',2);this.line([[-12,31],[12,31]],'#506375',2);
 for(const s of [-1,1]){this.path([[s*19,-11],[s*23,-7],[s*23,26],[s*18,19]],'#182331','#080d1d',1);this.line([[s*24,-3],[s*24,28]],accent,1);this.rect(s*24-3,-15,7,9,mid,2,'#17122b');this.rect(s*16-5,46,10,4,'#ff2957',1);this.rect(s*14-5,-52,10,3,'#eaffc6',1);}
 if(green){this.droplet(0,3,11,'#aaff56');for(let k of [-1,0,1])this.line([[k*8,33],[k*8,42]],'#77ff4c',2);}else if(!yellow){this.ellipse(0,4,6,5,accent);this.path([[-10,16],[0,7],[10,16],[4,14],[0,20],[-4,14]],accent);for(const s of [-1,1])this.line([[s*2,1],[s*9,-2],[s*11,-7]],accent,2);}else{this.line([[-6,9],[0,-5],[6,9]],'#ffed76',2);this.line([[-14,35],[14,35]],'#b68b12',2);}
 this.rect(-24,48,48,5,base,2,'#100b20');this.line([[-20,49],[20,49]],accent,1.5);c.restore();}
 boss(b,time,hurt){const c=this.ctx;c.save();c.translate(b.x,b.y);this.glow(0,70,190,160,'#ff005577');
 // Layered armored chassis: wheels, shoulder plates, cooling vents and central cannon.
 for(const s of [-1,1]){
 this.rect(s*116-21,-65,42,130,'#110b25',12,'#4d2855');this.rect(s*95-23,5,46,108,'#ff0962',13,'#3e132e');this.rect(s*139-16,-38,32,106,'#1a122d',5,'#080816');
 for(let k=0;k<5;k++)this.line([[s*139-12,-25+k*16],[s*139+12,-25+k*16]],'#382442',4);
 this.path([[s*42,-103],[s*111,-98],[s*139,-55],[s*130,44],[s*85,51],[s*66,15]],'#251331','#080714',4);
 this.path([[s*48,-93],[s*103,-87],[s*126,-49],[s*118,30],[s*91,32],[s*76,0]],'#573162','#2d183c',3);
 this.path([[s*56,-88],[s*94,-82],[s*110,-52],[s*92,-15],[s*77,-21]],'#b51958');
 this.path([[s*112,-28],[s*126,-43],[s*123,18],[s*103,18]],'#21172f','#130d20',2);
 this.rect(s*86-24,-65,48,31,'#120b22',2,'#e81669');this.line([[s*86-18,-55],[s*86+17,-55]],'#ff1b64',2);
 }
 const g=c.createLinearGradient(-60,-80,60,70);g.addColorStop(0,'#251939');g.addColorStop(.5,'#783465');g.addColorStop(1,'#1b122d');
 this.path([[-54,-120],[54,-120],[73,-84],[61,-22],[40,12],[-40,12],[-61,-22],[-73,-84]],g,'#100b20',4);
 this.path([[-42,-107],[42,-107],[51,-70],[34,-25],[-34,-25],[-51,-70]],'#c01056','#4e1342',4);
 this.ellipse(0,-69,26,26,'#3e1037');for(let a=0;a<6;a++){c.save();c.translate(0,-69);c.rotate(a*Math.PI/3+time*.3);this.path([[0,-5],[5,-23],[17,-17],[6,2]],'#e91b63');c.restore();}
 this.rect(-42,4,84,43,'#24162d',4,'#110b20');for(let i=0;i<6;i++)this.line([[-29,11+i*5],[29,11+i*5]],'#76415b',2);
 const cannon=c.createLinearGradient(-26,0,26,0);cannon.addColorStop(0,'#2c1739');cannon.addColorStop(.5,'#6f2868');cannon.addColorStop(1,'#2b122f');
 this.path([[-33,-18],[33,-18],[27,42],[20,60],[-20,60],[-27,42]],cannon,'#1d102c',3);this.ellipse(0,59,24,9,'#ff216c');this.ellipse(0,58,19,6,'#690e44');this.glow(0,61,40,23,'#ff0e6688');for(const s of [-1,1])this.path([[s*50,70],[s*62,73],[s*56,111],[s*46,100]],'#322038','#120b20',2);
 if(hurt){c.globalAlpha=.25;this.ellipse(0,0,120,100,'#ffeb9c');}c.restore();}
 road(r){const c=this.ctx,t=r.distance*4.4;const bg=c.createLinearGradient(0,0,540,960);bg.addColorStop(0,'#161338');bg.addColorStop(.4,'#292044');bg.addColorStop(1,'#250b29');this.rect(0,0,540,960,bg);
 for(let j=-1;j<7;j++){const y=((j*230+t)%1380)-230;this.path([[44,y],[170,y-30],[293,y+35],[494,y-15],[481,y+172],[346,y+210],[210,y+167],[55,y+193]],j%2?'#302445':'#22213d');this.path([[114,y+48],[185,y+61],[217,y+140],[180,y+170],[156,y+119]],'#19183166');this.line([[470,y+9],[437,y+70],[460,y+113],[432,y+163]],'#0a0b2244',2);}
 // Reflected signage and wet asphalt light bands.
 for(const [x,col] of [[31,'#fa0053'],[135,'#ed1166'],[220,'#af174b'],[320,'#8c2268'],[478,'#ad0c6c']]){c.save();c.globalAlpha=.15;this.rect(x,0,8,960,col);c.restore();this.glow(x,480,27,600,col+'33');}
 for(let lane=1;lane<4;lane++){const x=57+lane*105;for(let j=-1;j<10;j++){const y=(j*143+t)%1430-143;this.rect(x,y,5,74,lane===2?'#78712f55':'#65723d44');}}
 c.drawImage(this.noise,0,t%960-960);c.drawImage(this.noise,0,t%960);
 this.rect(0,0,25,960,'#0c091b');this.rect(515,0,25,960,'#0c091b');for(const x of [31,505]){this.glow(x,480,26,680,'#ff005455');this.rect(x,0,5,960,'#a50c4e');this.rect(x+1,0,1.5,960,'#ff225f');}
 // Roadside billboards drift past and cast pools of colored light.
 for(let i=0;i<4;i++){const y=((i*310+t*.74)%1240)-180,x=i%2?471:-22;this.glow(x+20,y+35,90,100,i%2?'#ff005533':'#400eff44');this.rect(x,y,88,72,'#09071c',0,'#301333');this.rect(x+4,y+5,80,62,i%2?'#aa0442':'#22169a');for(let k=0;k<8;k++)this.line([[x+5,y+8+k*6],[x+82,y+8+k*6]],'#160c47aa',2);this.text(i%2?'夜行':'電光',x+10,y+34,22,i%2?'#250a25':'#df2c84','900');this.text(i%2?'RACE // 09':'NIGHT CITY',x+7,y+56,9,i%2?'#180a22':'#ff1770','900');}
 }
 hud(r){const c=this.ctx;this.rect(48,8,478,19,'#090a25',0,'#342446');const bar=r.bossActive()?r.boss.hp/r.boss.max:r.mode==='trial'?1-r.distance/r.cfg.distance:r.health/100;const g=c.createLinearGradient(0,9,0,26);g.addColorStop(0,'#ff3982');g.addColorStop(1,'#e6064e');this.rect(48,12,Math.max(0,470*bar),11,g);this.path([[497,8],[535,8],[518,28],[497,28]],'#f7386c');
 this.glow(49,42,52,52,'#b8ff4f22');this.ellipse(48,43,42,42,'#060c16');this.ellipse(48,43,38,38,'#284630');const ring=c.createLinearGradient(20,5,70,80);ring.addColorStop(0,'#c4ff75');ring.addColorStop(1,'#61ce45');c.lineWidth=9;c.strokeStyle='#3a5435';c.beginPath();c.arc(48,43,33,0,Math.PI*2);c.stroke();if(r.fuel>99.9){this.ellipse(48,43,37,37,ring);this.ellipse(48,43,29,29,'#284630');}else{c.strokeStyle=ring;c.beginPath();c.arc(48,43,33,-Math.PI/2,-Math.PI/2+Math.PI*2*r.fuel/100);c.stroke();}for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.line([[48+Math.cos(a)*32,43+Math.sin(a)*32],[48+Math.cos(a)*40,43+Math.sin(a)*40]],'#1a2a24',2);}this.droplet(48,42,24,'#ebffd3');
 c.save();c.shadowColor='#000';c.shadowOffsetX=2;c.shadowOffsetY=2;c.shadowBlur=3;this.text(Math.round(r.speed)+' KM/H',92,46,23,'#ff265f');this.text(Math.floor(r.score).toString(),92,71,23,'#ffe640');this.ellipse(174+Math.max(0,String(Math.floor(r.score)).length-4)*12,62,8,8,'#f4cb27');this.ellipse(174+Math.max(0,String(Math.floor(r.score)).length-4)*12,62,5,5,'#4e3719');this.text('ϟ',171+Math.max(0,String(Math.floor(r.score)).length-4)*12,66,12,'#fce241');
 c.translate(397,65);c.transform(1,-.08,-.22,1,0,0);this.text('RAGE',-8,0,44,'#e5ef0a','900 italic');this.line([[-7,3],[124,-2]],'#c1ce15',3);this.path([[1,-30],[16,-43],[12,-31]],'#e4f01b');this.path([[101,-21],[123,-29],[112,-15]],'#e4f01b');c.restore();
 // Small armor marks keep the reference HUD uncluttered.
 for(let i=0;i<5;i++)this.path([[96+i*20,84],[111+i*20,84],[108+i*20,88],[93+i*20,88]],r.health>(i*20)?'#f43972':'#502641');
 }
 event(e){if(e.type==='hit')this.shake=.4;const colors={hit:'#ff355d',explosion:'#ff336b',fuel:'#8dff4b',repair:'#62ebff',near:'#fff04f',spark:'#ffb14d'};const count=e.type==='explosion'?75:e.type==='hit'?25:e.type==='spark'?3:12;for(let i=0;i<count;i++){this.effects.push({x:e.x,y:e.y,vx:(Math.random()-.5)*(e.type==='explosion'?650:220),vy:(Math.random()-.5)*300,life:.25+Math.random()*.65,color:colors[e.type]||'#fff658',size:2+Math.random()*3});}}
 render(r,dt=1/60){const c=this.ctx;this.tick+=dt;const ratio=this.canvas.width/540;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,540,960);c.save();if(this.shake>0){c.translate(Math.sin(this.tick*100)*this.shake*12,Math.cos(this.tick*80)*this.shake*8);this.shake=Math.max(0,this.shake-dt);}
 this.road(r);
 // Long colored trails echo the reference image.
 for(const car of r.traffic){const col=car.kind==='green'?'#45ff54':'#ff0058';this.glow(car.x,car.y+110,42,155,col+'33');for(let s of [-1,1])this.line([[car.x+s*16,car.y+42],[car.x+s*16,car.y+230]],col+'44',7);this.car(car.x,car.y,car.kind,Math.sin(r.time+car.phase)*.035);}
 for(const p of r.pickups){this.glow(p.x,p.y,42,45,p.type==='fuel'?'#83ff4c66':'#5de9ff66');c.save();c.translate(p.x,p.y);c.rotate(Math.sin(r.time*3)*.12);this.path([[0,-23],[19,-12],[19,12],[0,23],[-19,12],[-19,-12]],'#123e32',p.type==='fuel'?'#a8ff55':'#76f7ff',2);if(p.type==='fuel')this.droplet(0,0,13,'#b9ff64');else{this.rect(-4,-13,8,26,'#92f5ff');this.rect(-13,-4,26,8,'#92f5ff');}c.restore();}
 if(r.bossActive())this.boss(r.boss,r.time,false);
 for(const a of r.attacks){if(a.type==='beam'){
 if(a.age<.95){c.save();c.globalAlpha=.5+.3*Math.sin(a.age*25);this.line([[a.x,a.y],[a.x,960]],'#ff1b5a',2);this.path([[a.x,315],[a.x-36,376],[a.x+36,376]],'#5b1d22','#ffe178',6);this.text('!',a.x,366,41,'#ffe797','900','center');c.restore();}
 else {this.glow(76,344,65,65,'#ff5f2844');this.path([[76,310],[39,374],[113,374]],'#52202a','#ffe28c',6);this.text('!',76,364,40,'#ffe8a2','900','center');const fade=Math.min(1,(1.9-a.age)*4);c.save();c.globalAlpha=fade;this.glow(a.x,500,80,520,'#ff004b77');const beam=c.createLinearGradient(a.x-a.w,0,a.x+a.w,0);beam.addColorStop(0,'#ff245000');beam.addColorStop(.4,'#ff3757');beam.addColorStop(.5,'#fff6e8');beam.addColorStop(.6,'#ff4c73');beam.addColorStop(1,'#ff004b00');this.rect(a.x-a.w,a.y,a.w*2,960,beam);this.path([[a.x-a.w*.65,a.y+120],[a.x-13,a.y+280],[a.x,a.y+350],[a.x+18,a.y+286],[a.x+a.w*.65,a.y+120],[a.x+9,a.y+249],[a.x,a.y+277],[a.x-8,a.y+245]],'#fff5dc');c.restore();}}
 else{this.glow(a.x,a.y,45,75,'#ff2f6477');this.ellipse(a.x,a.y,12,22,'#ff3674');this.ellipse(a.x,a.y,5,14,'#fff0b9');}}
 for(const b of r.bullets){this.glow(b.x,b.y,8,24,'#ffe54066');this.rect(b.x-1,b.y-10,2,18,'#fff395',1);}
 if(r.trail.length>1){c.save();c.globalCompositeOperation='lighter';for(let s of [-1,1]){const points=r.trail.map(p=>[p.x+s*14,p.y]);this.line(points,'#baba1822',17);this.line(points,'#f8e03066',7);this.line(points,'#fff864aa',2);}c.restore();}
 if(r.boosting){this.glow(r.player.x,r.player.y+80,45,115,'#f0e92788');for(const s of [-1,1])this.path([[r.player.x+s*14-5,r.player.y+48],[r.player.x+s*14+5,r.player.y+48],[r.player.x+s*14,r.player.y+120+Math.sin(this.tick*60)*14]],'#fff796');}
 c.save();if(r.cooldown>0)c.globalAlpha=.65+.35*Math.cos(this.tick*30);this.car(r.player.x,r.player.y,'yellow',r.player.angle,1.05);c.restore();
 this.effects=this.effects.filter(p=>p.life>0);for(const p of this.effects){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*110;c.save();c.globalAlpha=Math.min(1,p.life*3);this.glow(p.x,p.y,p.size*3,p.size*3,p.color+'55');this.ellipse(p.x,p.y,p.size,p.size*.6,p.color);c.restore();}
 // Overhead cables create foreground depth; kept above the driving area.
 const cableY=(r.distance*.75)%1250-250;if(cableY<350){c.save();c.shadowColor='#020006';c.shadowBlur=8;this.line([[-20,cableY],[140,cableY+17],[340,cableY+29],[560,cableY+20]],'#020207ee',6);this.line([[-20,cableY-12],[220,cableY+9],[560,cableY+34]],'#04020aee',3);c.restore();}
 const vignette=c.createRadialGradient(270,470,160,270,470,650);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#080014b0');this.rect(0,0,540,960,vignette);c.restore();this.hud(r);
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=Renderer;else root.NeonRenderer=Renderer;
})(typeof window!=='undefined'?window:globalThis);
