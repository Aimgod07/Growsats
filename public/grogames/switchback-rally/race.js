export const cars = [
  {name:'Trail Jeep', paint:'#d74a32', axle:1.55, radius:.57, acceleration:10, speed:20, lean:3.4},
  {name:'Dirt Bike', paint:'#31839f', axle:1.06, radius:.57, acceleration:13, speed:23, lean:5.2},
  {name:'Ridge Buggy', paint:'#97b943', axle:1.7, radius:.66, acceleration:11, speed:21, lean:4}
];
export const routes = [
  {name:'Fern Pass', length:420, phase:0, rough:.76},
  {name:'Copper Ridge', length:530, phase:1.9, rough:1.08},
  {name:'Alpine Run', length:650, phase:4, rough:1.25}
];
export function ground(x,r) {
  const p=r.phase;
  return r.rough*(3.4*Math.sin(x*.094+p)+1.65*Math.sin(x*.182+p*.7)+.55*Math.cos(x*.31-p))+2.6*Math.sin(x*.041+p);
}
export function makeRace(car,route){
  const angle=Math.atan2(ground(2+car.axle,route)-ground(2-car.axle,route),2*car.axle);
  return {car,route,x:2,y:ground(2,route)+car.radius+.55,angle,vx:0,vy:0,spin:0,roll:0,elapsed:0,coins:0,air:0,inverted:0,status:'racing',
    tokens:Array.from({length:Math.floor((route.length-12)/8)},(_,i)=>{const x=12+i*8;return {x,y:ground(x,route)+1.6+.42*Math.sin(i*1.7),taken:false};})};
}
export function wheels(s){
  return [-s.car.axle,s.car.axle].map(offset=>{
    const dx=offset*Math.cos(s.angle)+.48*Math.sin(s.angle);
    const dy=offset*Math.sin(s.angle)-.48*Math.cos(s.angle);
    return {x:s.x+dx,y:s.y+dy,dx,dy};
  });
}
export function advance(s,input,dt){
  if(s.status!=='racing')return;
  let ax=0,ay=-19,turn=0,contacts=0;
  for(const w of wheels(s)){
    const slope=(ground(w.x+.04,s.route)-ground(w.x-.04,s.route))/.08;
    const normal=Math.hypot(1,slope), nx=-slope/normal, ny=1/normal;
    const depth=(ground(w.x,s.route)-w.y)*ny+s.car.radius;
    if(depth<=0)continue;
    contacts++;
    const normalSpeed=(s.vx-s.spin*w.dy)*nx+(s.vy+s.spin*w.dx)*ny;
    const force=Math.min(240,Math.max(0,depth*180-normalSpeed*11));
    ax+=nx*force;ay+=ny*force;turn+=(w.dx*ny-w.dy*nx)*force/(s.car.axle*s.car.axle+.5);
    const drive=input.brake?-Math.sign(s.vx)*Math.min(16,Math.abs(s.vx)*12):input.gas?s.car.acceleration:0;
    ax+=drive*ny*.5;ay-=drive*nx*.5;
  }
  s.air=contacts?0:s.air+dt;
  turn+=(Number(input.left)-Number(input.right))*s.car.lean*(contacts?.55:1.8);
  s.spin=(s.spin+turn*dt)*Math.exp(-dt*(contacts?1.3:.52));
  s.angle+=s.spin*dt;
  s.vx=Math.max(-7,Math.min(s.car.speed,(s.vx+ax*dt)*Math.exp(-dt*(input.gas?.035:.24))));
  s.vy+=ay*dt;s.x=Math.max(0,s.x+s.vx*dt);if(s.x===0)s.vx=Math.max(0,s.vx);
  s.y+=s.vy*dt;s.roll+=s.vx*dt/s.car.radius;s.elapsed+=dt;
  for(const token of s.tokens)if(!token.taken&&Math.abs(token.x-s.x)<1.55&&Math.abs(token.y-s.y)<2.1){token.taken=true;s.coins++;}
  const roofY=s.y+1.25*Math.cos(s.angle);
  s.inverted=Math.cos(s.angle)<-.16&&roofY<ground(s.x,s.route)+.32?s.inverted+dt:0;
  if(s.inverted>.12||s.y<ground(s.x,s.route)-2.2)s.status='crashed';
  else if(s.x>=s.route.length)s.status='finished';
}
