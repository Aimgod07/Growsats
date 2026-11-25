import {ground,wheels} from './race.js';
const TAU=Math.PI*2;
function shape(c,points,fill,stroke){
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=.075;c.stroke();}
}
function oval(c,x,y,rx,ry,color){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();
}
function line(c,x,y,u,v,width,color){
  c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function driver(c,x,y){
  line(c,x-.12,y+.54,x,y,.36,'#253e3b');line(c,x,y+.12,x+.42,y+.31,.13,'#b97d58');
  oval(c,x,y-.14,.21,.24,'#d89d72');oval(c,x-.035,y-.25,.247,.19,'#fff2c9');
  line(c,x-.04,y-.20,x+.23,y-.20,.095,'#2d4a47');
}
function vehicle(c,s){
  const color=s.car.paint;
  for(const w of wheels(s)){
    c.save();c.translate(w.dx,-w.dy);c.rotate(s.roll);const r=s.car.radius;
    oval(c,0,0,r,r,'#232e31');oval(c,0,0,r*.73,r*.73,'#47534e');oval(c,0,0,r*.47,r*.47,'#e6ddba');
    for(let i=0;i<10;i++){c.rotate(TAU/10);line(c,r*.84,-.056,r*.97,.015,.075,'#68716a');}
    for(let i=0;i<5;i++){c.rotate(TAU/5);oval(c,r*.29,0,.058,.058,'#53605a');}
    oval(c,0,0,.09,.09,'#303e39');c.restore();
  }
  c.rotate(-s.angle);
  if(s.car.name==='Dirt Bike'){
    line(c,-1.08,.44,0,-.05,.13,'#c2c5af');line(c,.7,-.53,1.06,.47,.12,'#e0d7bd');
    shape(c,[[-1.25,-.4],[-.48,-.32],[.2,-.48],[.67,-.42],[.36,.09],[-.27,.28],[-.52,-.18]],color,'#263b37');
    line(c,-.88,-.42,-.28,-.42,.15,'#273431');driver(c,-.4,-.91);
    line(c,-.45,-.45,.03,-.2,.18,'#41443e');line(c,.03,-.2,-.24,.21,.15,'#323832');
  }else{
    const a=s.car.axle;
    shape(c,[[-a-.32,-.43],[-.83,-.48],[-.66,-.15],[.44,-.15],[.62,-.5],[a+.33,-.38],[a+.4,.07],[a+.12,.24],[-a-.2,.24]],color,'#343d32');
    driver(c,-.32,-.89);line(c,.33,-.18,.61,-.51,.1,'#303a35');
    if(s.car.name==='Ridge Buggy'){
      line(c,-1.42,-.35,-.92,-1.42,.13,'#293b36');line(c,-.92,-1.42,.16,-1.45,.13,'#293b36');line(c,.16,-1.45,.9,-.38,.13,'#293b36');
    }else{line(c,.57,-.52,.45,-1.13,.1,'#35463f');line(c,.48,-1.1,.59,-.6,.11,'#aed6cf');}
    line(c,-a-.18,-.29,-.94,-.31,.09,'#ffdda3');line(c,.8,-.35,a+.18,-.29,.09,'#ffdda3');
    oval(c,a+.23,-.19,.1,.12,'#ffda80');shape(c,[[-.7,-.09],[.17,-.09],[.11,.15],[-.7,.15]],'#fff0c6');
    c.fillStyle='#253c35';c.font='bold .25px sans-serif';c.fillText('07',-.5,.11);
  }
}
function pine(c,x,y,h,col){
  c.fillStyle='#655d42';c.fillRect(x-h*.035,y-h*.28,h*.07,h*.3);
  for(let j=0;j<3;j++){const b=y-h*(.14+j*.22),w=h*(.28-j*.055);shape(c,[[x-w,b],[x,b-h*.45],[x+w,b]],col);}
}
export function render(c,width,height,s,view,garage){
  c.save();const unit=Math.min(75,Math.max(24,Math.min(width/(garage?25:32),height/10.8)));
  const left=view.x-width*(garage?.24:.32)/unit;
  const X=x=>(x-left)*unit,Y=y=>height*(garage?.59:.6)-(y-view.y)*unit;
  const sky=c.createLinearGradient(0,0,0,height*.85);sky.addColorStop(0,'#70acb8');sky.addColorStop(.69,'#e6e6bd');sky.addColorStop(1,'#f6d89e');c.fillStyle=sky;c.fillRect(0,0,width,height);
  oval(c,width*.72,height*.19,height*.078,height*.078,'#fff1ba');
  for(let j=0;j<3;j++){
    const ridge=[[0,height]];for(let x=-16;x<=width+16;x+=12){
      const t=(x+left*unit*(.05+j*.09))/height;
      ridge.push([x,height*(.43+j*.085-.085*Math.abs(Math.sin(6*t+j)+.44*Math.sin(14*t+.8*j)))]);}
    ridge.push([width+16,height]);shape(c,ridge,['#a0bab1','#829c87','#587d66'][j]);
  }
  for(let i=Math.floor(left/7)-2;i<(left+width/unit)/7+2;i++){
    const x=i*7+2.2*Math.sin(i*32),h=unit*(1.6+.6*Math.cos(i*3));
    const tx=X(x),ty=Y(ground(x,s.route))+.15*unit;
    if(i%4===0){
      const crown=h*1.65;
      line(c,tx,ty,tx+.06*crown,ty-.75*crown,.085*crown,'#785a39');
      line(c,tx+.025*crown,ty-.35*crown,tx-.22*crown,ty-.65*crown,.045*crown,'#785a39');
      oval(c,tx-.2*crown,ty-.69*crown,.28*crown,.19*crown,'#456c46');
      oval(c,tx+.17*crown,ty-.8*crown,.34*crown,.24*crown,'#577c49');
      oval(c,tx+.025*crown,ty-.91*crown,.26*crown,.19*crown,'#739452');
    }else pine(c,tx,ty,h,'#345d48');
    if(i%3===0)pine(c,X(x+1.1),Y(ground(x+1.1,s.route)),h*.67,'#497258');
  }
  const ridge=[];for(let x=-10;x<=width+10;x+=5)ridge.push([x,Y(ground(left+x/unit,s.route))]);
  shape(c,[[0,height],...ridge,[width+10,height]],'#bd7b43');
  for(const [offset,color,amp] of [[.35,'#e4ab60',.08],[.13,'#e9c47e',.045],[.065,'#799344',.015]]){
    shape(c,[...ridge,...ridge.map(([x,y])=>[x,y+unit*(offset+amp*Math.sin((x/unit+left)*2.5))]).reverse()],color);
  }
  for(let i=Math.floor(left*2);i<(left+width/unit)*2;i++){
    const x=i*.5,y=ground(x,s.route)-.65-2.5*Math.abs(Math.sin(i*56.4));
    oval(c,X(x),Y(y),unit*(.045+.05*Math.abs(Math.sin(i))),unit*.043,'#a36a41');
  }
  const fx=X(s.route.length),fy=Y(ground(s.route.length,s.route));
  line(c,fx,fy,fx,fy-unit*3.5,unit*.085,'#423e34');
  for(let j=0;j<3;j++)for(let i=0;i<5;i++){c.fillStyle=(i+j)%2?'#343d38':'#fff3d1';c.fillRect(fx+i*unit*.24,fy-unit*3.5+j*unit*.24,unit*.245,unit*.245);}
  for(const t of s.tokens){if(t.taken||X(t.x)<-20||X(t.x)>width+20)continue;
    const x=X(t.x),y=Y(t.y),r=unit*.25;oval(c,x,y,r,r,'#a76a1b');oval(c,x,y-r*.12,r*.85,r*.89,'#ffd159');oval(c,x,y-r*.1,r*.59,r*.65,'#eda929');line(c,x,y-r*.45,x,y+r*.24,r*.18,'#fff2aa');}
  c.translate(X(s.x),Y(s.y));c.scale(unit,unit);c.lineCap='round';vehicle(c,s);c.restore();
}
