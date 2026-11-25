/* Deterministic fixed-step arcade simulation; no rendering or DOM dependencies. */
(function(root){'use strict';
const LEVELS=[
{name:'Neon Underpass',boss:180,traffic:1.65,distance:2300,time:70,tint:'#472345'},
{name:'Crimson Market',boss:240,traffic:1.4,distance:2600,time:73,tint:'#52233d'},
{name:'Voltage Avenue',boss:300,traffic:1.25,distance:2900,time:76,tint:'#272f58'},
{name:'Blackout District',boss:360,traffic:1.1,distance:3200,time:80,tint:'#292342'},
{name:'Reactor Row',boss:440,traffic:.95,distance:3500,time:83,tint:'#3e2c42'},
{name:'The Last Machine',boss:520,traffic:.85,distance:3800,time:88,tint:'#492042'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Race{
 constructor(mode='hunt',level=0,seed=42){this.mode=mode;this.level=clamp(level,0,5);this.cfg=LEVELS[this.level];this.seed=seed;this.time=0;this.distance=0;this.score=0;this.fuel=100;this.health=100;this.speed=0;this.state='running';this.player={x:292,y:735,angle:0};this.boss={x:270,y:106,hp:this.cfg.boss,max:this.cfg.boss};this.traffic=[];this.pickups=[];this.bullets=[];this.attacks=[];this.events=[];this.trail=[];this.cooldown=0;this.shotTimer=0;this.spawnTimer=1.3;this.fuelTimer=4;this.attackTimer=4;this.boosting=false;this.combo=0;this.nearMisses=0;this.kills=0;this.sequence=0;this.survivalBoss=-1;}
 random(){this.seed=(this.seed*16807)%2147483647;return(this.seed-1)/2147483646;}
 emit(type,x=this.player.x,y=this.player.y,value=0){this.events.push({type,x,y,value});}
 bossActive(){return this.mode==='hunt'||this.mode==='survival'&&this.time%45>25&&this.survivalBoss!==Math.floor(this.time/45);}
 damage(n){if(this.cooldown>0||this.state!=='running')return;this.health=Math.max(0,this.health-n);this.cooldown=1.25;this.speed*=.68;this.combo=0;this.emit('hit');if(this.health===0)this.end(false,'WRECKED');}
 end(win,reason){if(this.state!=='running')return;this.state=win?'won':'lost';this.reason=reason;if(win)this.score+=Math.round(this.health*10+this.fuel*5);this.emit(win?'win':'lose');}
 step(dt,input={}){
 if(this.state!=='running')return;dt=Math.min(dt,.04);this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
 this.boosting=!!input.boost&&this.fuel>1;const target=input.brake?95:this.boosting?238:160+this.level*6;this.speed+=(target-this.speed)*Math.min(1,dt*1.5);this.distance+=this.speed/3.6*dt;
 this.fuel=clamp(this.fuel-dt*(this.boosting?13:.45),0,100);if(this.fuel===0)this.speed=Math.min(this.speed,100);
 let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);let desiredX=input.x==null?this.player.x+dx*280*dt:input.x;let desiredY=input.y==null?this.player.y+dy*240*dt:input.y;
 const prev=this.player.x;this.player.x=clamp(this.player.x+clamp(desiredX-this.player.x,-360*dt,360*dt),60,480);this.player.y=clamp(this.player.y+clamp(desiredY-this.player.y,-280*dt,280*dt),480,850);this.player.angle+=(clamp((this.player.x-prev)/dt*.001,-.28,.28)-this.player.angle)*Math.min(1,dt*9);
 this.trail.push({x:this.player.x,y:this.player.y+39,life:1});this.trail.forEach(p=>{p.y+=this.speed*dt*.55;p.life-=dt*1.6;});this.trail=this.trail.filter(p=>p.life>0).slice(-70);
 this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=this.cfg.traffic+this.random()*.65;const x=[115,220,325,430][Math.floor(this.random()*4)];this.traffic.push({x,y:-120,speed:95+this.random()*70,kind:this.random()>.5?'red':'green',angle:0,passed:false,phase:this.random()*6});}
 this.fuelTimer-=dt;if(this.fuelTimer<=0){this.fuelTimer=4+this.random()*2;this.pickups.push({x:70+this.random()*400,y:-70,type:this.sequence++%4===3?'repair':'fuel'});}
 for(const car of this.traffic){car.y+=(car.speed+this.speed*.40)*dt;car.x=clamp(car.x+Math.sin(this.time+car.phase)*dt*13,55,485);if(Math.abs(car.x-this.player.x)<42&&Math.abs(car.y-this.player.y)<78){this.damage(23);car.y+=32;}
 if(!car.passed&&car.y>this.player.y+80){car.passed=true;const gap=Math.abs(car.x-this.player.x);if(gap<85&&gap>42&&this.cooldown===0){this.nearMisses++;this.score+=150;this.emit('near',car.x,car.y,150);}else this.score+=30;}}
 this.traffic=this.traffic.filter(c=>c.y<1100);
 for(const p of this.pickups){p.y+=(120+this.speed*.4)*dt;if(Math.hypot(p.x-this.player.x,(p.y-this.player.y)*.7)<45){p.dead=true;if(p.type==='fuel')this.fuel=clamp(this.fuel+28,0,100);else this.health=clamp(this.health+22,0,100);this.score+=75;this.emit(p.type,p.x,p.y,75);}}this.pickups=this.pickups.filter(p=>!p.dead&&p.y<1030);
 if(this.bossActive()){
 this.boss.x=270+Math.sin(this.time*.36)*90;this.boss.y=100+Math.sin(this.time*.7)*9;
 this.shotTimer-=dt;if(this.shotTimer<=0){this.shotTimer=.16;this.bullets.push({x:this.player.x,y:this.player.y-45,damage:this.boosting?4:3});}
 for(const b of this.bullets){const oldY=b.y;b.y-=760*dt;if(oldY>=this.boss.y+40&&b.y<=this.boss.y+110&&Math.abs(b.x-this.boss.x)<125){b.dead=true;this.boss.hp=Math.max(0,this.boss.hp-b.damage);this.score+=8;this.emit('spark',b.x,b.y);}}
 this.attackTimer-=dt;if(this.attackTimer<=0){this.attackTimer=Math.max(2,3.5-this.level*.18);this.attacks.push({type:'beam',x:this.player.x,y:this.boss.y+95,age:0,w:28+this.level*2,hit:false});if(this.level>=2)this.attacks.push({type:'orb',x:this.boss.x,y:this.boss.y+120,age:0,vx:(this.player.x-this.boss.x)*.35});}
 if(this.boss.hp<=0){this.kills++;this.emit('explosion',this.boss.x,this.boss.y,1500);this.score+=1500;if(this.mode==='hunt')this.end(true,'MACHINE DOWN');else {this.boss.hp=this.boss.max;this.attacks=[];this.survivalBoss=Math.floor(this.time/45);}}
 }
 this.bullets=this.bullets.filter(b=>!b.dead&&b.y>-40);
 for(const a of this.attacks){a.age+=dt;if(a.type==='beam'){if(a.age>.95&&a.age<1.7&&!a.hit&&Math.abs(a.x-this.player.x)<a.w+18){this.damage(32);a.hit=true;}}else{a.y+=330*dt;a.x+=a.vx*dt;if(Math.hypot(a.x-this.player.x,a.y-this.player.y)<44){this.damage(25);a.dead=true;}}}
 this.attacks=this.attacks.filter(a=>!a.dead&&(a.type==='beam'?a.age<1.9:a.y<1050));
 if(this.mode==='trial'){if(this.distance>=this.cfg.distance)this.end(true,'FINISH LINE');else if(this.time>=this.cfg.time)this.end(false,'TIME UP');}
 if(this.mode==='hunt'&&this.time>95)this.end(false,'BOSS ESCAPED');
 this.score+=dt*(this.boosting?8:3);
 }
}
const api={Race,LEVELS,clamp};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NeonRace=api;
})(typeof window!=='undefined'?window:globalThis);
