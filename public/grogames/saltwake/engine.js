/* Saltwake simulation: meters, seconds, seeded obstacle rows, no rendering dependencies. */
(function(root){'use strict';
class Voyage{
 constructor(seed=37){this.initialSeed=seed;this.reset();}
 reset(){this.seed=this.initialSeed;this.state='ready';this.time=0;this.distance=0;this.x=0;this.vx=0;this.speed=0;this.health=3;this.charge=100;this.score=0;this.salvage=0;this.invulnerable=0;this.nextRow=65;this.serial=0;this.objects=[];this.events=[];this.fill();}
 rand(){this.seed=(this.seed*16807)%2147483647;return(this.seed-1)/2147483646;}
 start(){this.reset();this.state='playing';}
 pause(){if(this.state==='playing')this.state='paused';}
 resume(){if(this.state==='paused')this.state='playing';}
 fill(){while(this.nextRow<this.distance+230){const row=this.nextRow;const safe=Math.floor(this.rand()*3),blocked=[0,1,2].filter(x=>x!==safe);const count=row>350&&this.rand()>.4?2:1;for(let i=0;i<count;i++){const lane=blocked[i];this.objects.push({id:++this.serial,kind:this.rand()>.5?'rock':'buoy',x:(lane-1)*6,z:row,r:1.7,hit:false});}if(this.rand()>.25)this.objects.push({id:++this.serial,kind:'salvage',x:(safe-1)*6,z:row+9,r:1.1,hit:false});this.nextRow+=31+this.rand()*9;}}
 step(dt,input={}){if(this.state!=='playing')return;dt=Math.max(0,Math.min(dt,.04));this.time+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);const boost=!!input.boost&&this.charge>2&&!input.brake;this.charge=Math.max(0,Math.min(100,this.charge+(boost?-24:9)*dt));const wanted=input.brake?8:(15+Math.min(8,this.time*.025))+(boost?10:0);this.speed+=(wanted-this.speed)*Math.min(1,dt*2.2);const steer=Number.isFinite(input.target)?Math.max(-1,Math.min(1,(input.target-this.x)*1.8)):Math.max(-1,Math.min(1,input.steer||0));this.vx+=(steer*(boost?9:7.5)-this.vx)*Math.min(1,dt*7);this.x=Math.max(-9.3,Math.min(9.3,this.x+this.vx*dt));this.distance+=this.speed*dt;
 for(const o of this.objects){if(o.hit||Math.abs(o.z-this.distance)>o.r+2.1||Math.abs(o.x-this.x)>o.r+1.05)continue;o.hit=true;if(o.kind==='salvage'){this.salvage++;this.events.push({type:'salvage',id:o.id});}else if(this.invulnerable<=0){this.health--;this.invulnerable=2;this.speed*=.55;this.events.push({type:'hit',id:o.id});if(!this.health){this.state='over';this.events.push({type:'over'});break;}}}
 this.score=Math.floor(this.distance*.35)+this.salvage*75;this.objects=this.objects.filter(o=>o.z>this.distance-24);this.fill();
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={Voyage};else root.Saltwake={Voyage};
})(typeof window!=='undefined'?window:globalThis);
