/* Deterministic, renderer-independent tap-flight simulation. */
(function(root){'use strict';
class Flight{
 constructor({height=800,seed=Date.now()}={}){this.h=Math.max(620,height);this.w=480;this.seed=Math.abs(seed)%2147483646+1;this.reset();}
 random(){this.seed=this.seed*16807%2147483647;return(this.seed-1)/2147483646;}
 reset(){this.state='ready';this.time=0;this.score=0;this.y=this.h*.43;this.vy=0;this.x=114;this.radius=16;this.pipes=[];this.next=1.4;this.events=[];this.distance=0;this.center=this.h*.45;}
 start(){this.reset();this.state='playing';this.flap();}
 flap(){if(this.state!=='playing')return false;this.vy=-305;this.events.push('flap');return true;}
 pause(){if(this.state==='playing')this.state='paused';}
 resume(){if(this.state==='paused')this.state='playing';}
 finish(){if(this.state!=='playing')return;this.state='over';this.events.push('crash');}
 resize(h){const old=this.h;this.h=Math.max(620,h);const ratio=(this.h-100)/(old-100);this.y=Math.max(35,Math.min(this.h-75,this.y*ratio));for(const p of this.pipes)p.center=Math.max(110+p.gap/2,Math.min(this.h-100-p.gap/2,p.center*ratio));this.center=this.h*.45;}
 spawn(){const gap=Math.max(177,218-this.score*1.15);const min=100+gap/2,max=this.h-95-gap/2;this.center=Math.max(min,Math.min(max,this.center+(this.random()-.5)*160));this.pipes.push({x:520,width:72,gap,center:this.center,passed:false});}
 step(dt){if(this.state!=='playing')return;dt=Math.min(.025,Math.max(0,dt));this.time+=dt;const speed=Math.min(212,145+this.score*1.5);this.distance+=speed*dt;this.vy=Math.min(475,this.vy+840*dt);this.y+=this.vy*dt;
 if(this.y-this.radius<12||this.y+this.radius>this.h-52){this.finish();return;}
 this.next-=dt;if(this.next<=0){this.spawn();this.next=1.65;}
 for(const p of this.pipes){p.x-=speed*dt;const left=p.x-6,right=p.x+p.width+6;const closestX=Math.max(left,Math.min(right,this.x));const dx=this.x-closestX;const top=p.center-p.gap/2,bottom=p.center+p.gap/2;
 const upperY=Math.max(0,Math.min(top,this.y)),lowerY=Math.max(bottom,Math.min(this.h,this.y));
 if(dx*dx+(this.y-upperY)**2<this.radius**2||dx*dx+(this.y-lowerY)**2<this.radius**2){this.finish();return;}
 if(!p.passed&&right<this.x-this.radius){p.passed=true;this.score++;this.events.push('score');}}
 this.pipes=this.pipes.filter(p=>p.x+p.width>-20);
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={Flight};else root.CloudSkipper={Flight};
})(typeof window!=='undefined'?window:globalThis);
