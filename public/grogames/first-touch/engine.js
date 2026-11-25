(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shots=[
 {id:'classic',name:'Classic',key:'1',tag:'Clean & balanced',speed:24,curve:0,arc:0,color:'#ffffff'},
 {id:'finesse',name:'Finesse',key:'2',tag:'Bend it inside',speed:21,curve:2.5,arc:.35,color:'#a6f5ba'},
 {id:'trivela',name:'Trivela',key:'3',tag:'Outside-foot curl',speed:23,curve:-2.9,arc:.2,color:'#a8dafa'},
 {id:'power',name:'Power',key:'4',tag:'Fast & ferocious',speed:33,curve:0,arc:0,color:'#ffc28d'},
 {id:'driven',name:'Driven',key:'5',tag:'Low & quick',speed:29,curve:.3,arc:-.2,color:'#f8b3d4'},
 {id:'chip',name:'Chip',key:'6',tag:'Lift it over',speed:15,curve:0,arc:2.4,color:'#d8c7ff'}
];
const difficulties={casual:{name:'Casual',reaction:.32,speed:2.9,error:.38},club:{name:'Club',reaction:.23,speed:4.1,error:.22},pro:{name:'Pro',reaction:.15,speed:5.4,error:.10}};
const contactTime=.64;
const players=[{name:'Luca',role:'THE PLAYMAKER',number:'24',skin:'#d99a72',hair:'#241f22',kit:'#f2f5f8',shorts:'#173451',accent:'#183452',boot:'#244b70'}, {name:'Amara',role:'THE FINISHER',number:'07',skin:'#774b37',hair:'#231c22',kit:'#20824b',shorts:'#2e4d56',accent:'#203f50',boot:'#f980b9'}, {name:'Kai',role:'THE ARTIST',number:'09',skin:'#d2a078',hair:'#1d2532',kit:'#f1cc32',shorts:'#283b61',accent:'#e8f7fc',boot:'#f5ad45'}];
class Session{
 constructor(config={},seed=123){this.config={difficulty:config.difficulty||'club',mode:config.mode||'roam'};this.diff=difficulties[this.config.difficulty]||difficulties.club;this.seed=seed;this.stats={attempts:0,goals:0,saves:0,streak:0,best:0,score:0,targets:0};this.time=0;this.events=[];this.shotIndex=0;this.aim={x:1.8,y:1.7};this.newAttempt();}
 random(){this.seed=(this.seed*16807)%2147483647;return(this.seed-1)/2147483646;}
 emit(type,data={}){this.events.push({type,...data});}
 newAttempt(){const n=this.stats.attempts,spots=[[0,13],[-3.8,16],[4.5,18],[-5.8,20],[2.8,22],[0,11]];const p=this.config.mode==='practice'?[0,11]:spots[Math.floor(n/3)%spots.length];this.origin={x:p[0],z:p[1]};this.ball={x:p[0],y:.11,z:p[1],vx:0,vy:0,vz:0};this.keeper={x:0,y:0,lean:0,dive:0,targetX:0,targetY:1,reacted:false};this.phase='ready';this.phaseTime=0;this.power=0;this.result=null;this.target={x:(n%2?-1:1)*2.6,y:n%3===0?1.9:.7,radius:.48};this.emit('ready');}
 setAim(x,y){if(this.phase==='ready'||this.phase==='charging'){this.aim.x=clamp(x,-4.35,4.35);this.aim.y=clamp(y,.14,3.5);}}
 setShot(index){if(this.phase==='ready')this.shotIndex=clamp(index|0,0,5);}
 startCharge(){if(this.phase!=='ready')return false;this.phase='charging';this.phaseTime=0;this.power=.15;return true;}
 release(){if(this.phase!=='charging')return false;this.phase='runup';this.phaseTime=0;this.stats.attempts++;this.launchAim={...this.aim};this.emit('runup');return true;}
 launch(){const s=shots[this.shotIndex],p=this.power;this.flightTime=0;this.phase='flight';this.phaseTime=0;const distance=Math.hypot(this.origin.x,this.origin.z),speed=s.speed*(.72+.48*p);this.duration=distance/speed;const error=p>.91?(p-.91)*5:0;this.end={x:this.launchAim.x+(this.random()-.5)*error,y:clamp(this.launchAim.y+(this.random()-.5)*error,.11,4)};if(s.id==='driven')this.end.y=Math.min(this.end.y,.7);this.arc=s.arc;this.curve=s.curve;this.gravity=9.81;const b=this.ball;b.vz=-this.origin.z/this.duration;b.vx=(this.end.x-this.origin.x)/this.duration;b.vy=(this.end.y-.11+4.905*this.duration*this.duration)/this.duration;this.emit('kick',{power:p});}
 flightPosition(t){const u=t/this.duration;return{x:this.origin.x+(this.end.x-this.origin.x)*u+this.curve*Math.sin(Math.PI*u),y:.11+this.ball.vy*t-4.905*t*t+this.arc*Math.sin(Math.PI*u),z:this.origin.z*(1-u)};}
 finish(outcome){if(this.result)return;this.result=outcome;this.phase='result';this.phaseTime=0;const st=this.stats;if(outcome==='goal'){st.goals++;st.streak++;st.best=Math.max(st.best,st.streak);const target=Math.hypot(this.end.x-this.target.x,this.end.y-this.target.y)<this.target.radius;const clean=this.power>=.58&&this.power<=.84;this.bonus=target?'TOP BINS':clean?'SWEET STRIKE':'NICE FINISH';st.score+=100+Math.min(st.streak-1,10)*15+(target?100:0);if(target)st.targets++;}else{st.streak=0;if(outcome==='save')st.saves++;this.bonus=outcome==='save'?'TRY THE CORNERS':outcome==='post'?'SO CLOSE':'ADJUST YOUR AIM';}this.emit('result',{outcome,bonus:this.bonus,stats:{...st}});}
 step(dt){dt=clamp(dt,0,.04);this.time+=dt;this.phaseTime+=dt;const b=this.ball,k=this.keeper;
 if(this.phase==='ready'||this.phase==='charging'){k.x=Math.sin(this.time*1.6)*.35;k.lean=Math.sin(this.time*1.6)*.06;if(this.phase==='charging')this.power=Math.min(1,.15+this.phaseTime*.6);return;}
 if(this.phase==='runup'){if(this.phaseTime>=contactTime)this.launch();return;}
 if(this.phase==='flight'){
 const old={...b};this.flightTime+=dt;const t=this.flightTime,at=this.flightPosition(t);b.x=at.x;b.y=at.y;b.z=at.z;
 if(t>this.diff.reaction){if(!k.reacted){k.reacted=true;k.targetX=clamp(this.end.x+(this.random()-.5)*this.diff.error*2,-3.35,3.35);k.targetY=this.end.y;}const delta=k.targetX-k.x;k.x+=clamp(delta,-this.diff.speed*dt,this.diff.speed*dt);const want=clamp(Math.abs(k.targetX)*.38,0,1);k.dive+=(want-k.dive)*Math.min(1,dt*7);k.lean=Math.sign(k.targetX)*k.dive*1.18;k.y=Math.max(0,k.targetY-1.35)*k.dive;}
 if(old.z>.8&&b.z<=.8){const f=(old.z-.8)/(old.z-b.z),x=old.x+(b.x-old.x)*f,y=old.y+(b.y-old.y)*f;const reach=.44+k.dive*.63;const vertical=k.dive>.35?(Math.abs(y-(.92+k.y))<.78):(y<1.95);if(Math.abs(x-k.x)<reach&&vertical&&y>=0){b.z=.8;b.vx=(x-k.x)*5;b.vz=5;b.vy=2.8;this.finish('save');return;}}
 if(old.z>0&&b.z<=0){const f=old.z/(old.z-b.z),x=old.x+(b.x-old.x)*f,y=old.y+(b.y-old.y)*f;const post=(Math.abs(Math.abs(x)-3.66)<.175&&y<2.55)||(Math.abs(y-2.44)<.175&&Math.abs(x)<3.83);b.vx=(this.end.x-this.origin.x)/this.duration;b.vz=-this.origin.z/this.duration;b.vy=b.vy-this.gravity*t;if(post){b.vz*=-.42;b.vx*=.35;b.vy*=.45;this.finish('post');}else if(Math.abs(x)<3.55&&y>.04&&y<2.33){this.end.x=x;this.end.y=y;b.vx*=.25;b.vz=-4;b.vy*=.25;this.finish('goal');}else this.finish('miss');return;}
 if(b.y<.08&&b.z>0||t>3){b.y=.11;b.vx=(this.end.x-this.origin.x)/this.duration;b.vz=-5;b.vy=2;this.finish('miss');}
 }else if(this.phase==='result'){b.vy-=9.81*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;if(b.y<.11){b.y=.11;b.vy=Math.abs(b.vy)*.35;b.vx*=.94;b.vz*=.94;}if(this.result==='goal'){if(b.z< -1.7){b.z=-1.7;b.vz=Math.abs(b.vz)*.25;}b.x=clamp(b.x,-3.45,3.45);}k.dive=Math.max(0,k.dive-dt*.45);k.lean*=1-dt*.5;k.y=Math.max(0,k.y-dt);if(this.phaseTime>2.7)this.newAttempt();}
 }
}
const api={Session,shots,players,difficulties,clamp,contactTime};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Football=api;
})(typeof window!=='undefined'?window:globalThis);
