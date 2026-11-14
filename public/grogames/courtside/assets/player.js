/* Original articulated basketball athlete. No external model or texture downloads. */
(function(global){
'use strict';
global.createCourtPlayer=function(THREE){
const root=new THREE.Group();root.name='Courtside athlete';
const M=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness});
const P=(color,kind)=>GroMaterials.make(THREE,color,kind);
const skin=P('#b9784d','skin'),skinShade=P('#9b5c39','skin'),fabric=P('#e87624','fabric'),trim=M('#ffe7b1'),seam=M('#c35a1e'),hair=P('#24251f','hair'),sole=P('#f0e8d6','rubber'),shoe=P('#e48a3c','leather'),sock=P('#e4ddd0','fabric');
const vec=(x,y,z)=>new THREE.Vector3(x,y,z),up=vec(0,1,0);
function add(geo,material,parent=root){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function oval(x,y,z,sx,sy,sz,material,parent=root){const m=add(new THREE.SphereGeometry(1,24,16),material,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
// Elliptical cross-sections form continuous sculpted silhouettes, with subtle cloth folds.
function surface(rows,material,parent=root,fold=0){
 const vertices=[],indices=[],uvs=[],segments=32;
 rows.forEach(([y,rx,rz,cz=0],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const f=1+fold*Math.sin(a*7+j*.8)*Math.sin(j/(rows.length-1)*Math.PI);vertices.push(Math.cos(a)*rx*f,y,cz+Math.sin(a)*rz*f);uvs.push(i/segments,j/(rows.length-1));}});
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return add(g,material,parent);
}
function tube(points,r,material,parent=root){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>vec(...p))),Math.max(12,points.length*5),r,7,false),material,parent);}
function ellipse(y,rx,rz,material,parent=root,cz=0,r=.012){let pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;pts.push([Math.cos(a)*rx,y,cz+Math.sin(a)*rz]);}return tube(pts,r,material,parent);}
const upper=new THREE.Group();root.add(upper);
const torso=surface([[1.28,.245,.145],[1.34,.26,.155],[1.48,.25,.153],[1.64,.275,.172],[1.82,.32,.185],[1.98,.35,.165],[2.055,.30,.13],[2.09,.14,.105],[2.10,.11,.095]],fabric,upper,.018);
// Narrow collar, tailored shoulder straps, side seams and ribbed waistband.
surface([[2.04,.106,.093],[2.13,.103,.09],[2.18,.09,.085]],skin,upper);
ellipse(2.097,.127,.108,trim,upper,0,.016);ellipse(1.32,.252,.15,seam,upper,0,.02);
for(let side of [-1,1]){tube([[side*.25,1.35,.02],[side*.27,1.64,.025],[side*.32,1.86,.015]],.013,trim,upper);tube([[side*.29,2.05,.105],[side*.34,2.01,.08],[side*.35,1.94,0],[side*.33,1.91,-.10]],.017,trim,upper);}
const head=new THREE.Group();head.position.set(0,2.145,0);upper.add(head);
surface([[0,.071,.068],[.035,.105,.085,-.015],[.09,.133,.109],[.17,.148,.125],[.25,.149,.126],[.32,.13,.107],[.37,.078,.065],[.385,.003,.003]],skin,head);
oval(0,.135,-.112,.095,.07,.034,skin,head); // cheek and jaw plane
oval(0,.18,-.14,.029,.047,.034,skin,head); // nose
for(let side of [-1,1]){oval(side*.146,.17,0,.027,.048,.023,skin,head);oval(side*.157,.172,-.012,.011,.026,.01,skinShade,head);oval(side*.062,.218,-.118,.033,.014,.008,sole,head);oval(side*.062,.217,-.125,.013,.013,.006,hair,head);tube([[side*.035,.244,-.121],[side*.063,.25,-.123],[side*.091,.24,-.112]],.009,hair,head);}
tube([[-.043,.10,-.137],[0,.095,-.145],[.043,.10,-.137]],.005,skinShade,head);
// Close-cropped shaped hair cap with small curls, not a separate polygonal helmet.
surface([[.235,.145,.123],[.28,.151,.128],[.34,.129,.11],[.388,.077,.064],[.404,.002,.002]],hair,head);
for(let i=0;i<46;i++){let a=i*2.39996,y=.27+(i%7)*.017,r=Math.sqrt(Math.max(0,1-((y-.265)/.145)**2));oval(Math.cos(a)*.142*r,y,Math.sin(a)*.122*r,.021,.017,.02,hair,head);}
// Shoulder and limb volumes are tapered anatomical meshes rather than cylinders or boxes.
function limb(profile,material){return surface(profile.map(([y,r,depth])=>[y,r,depth??r]),material);}
function place(m,a,b){m.position.copy(a);const delta=b.clone().sub(a);m.quaternion.setFromUnitVectors(up,delta.clone().normalize());m.scale.y=delta.length();}
const legs=[],arms=[];
for(let side of [-1,1]){
 // Shorts are one continuous mesh, built below; legs emerge from its hems.
 const calf=limb([[0,.093,.085],[.15,.105,.095],[.4,.102,.098],[.7,.07,.07],[1,.055,.06]],skin);
 const knee=oval(0,0,0,.095,.10,.09,skin);
 const ankle=surface([[.13,.06,.065],[.22,.063,.068],[.38,.069,.07],[.40,.068,.07]],sock);ankle.position.x=side*.23;
 for(let y of [.35,.375])ellipse(y,.07,.071,seam,ankle); // local stripe follows sock center
 const foot=new THREE.Group();foot.position.set(side*.23,0,-.07);foot.rotation.y=side*-.12;root.add(foot);
 oval(0,.07,-.07,.112,.054,.235,sole,foot);oval(0,.115,-.08,.108,.068,.216,shoe,foot);oval(0,.17,.045,.09,.09,.10,shoe,foot);oval(0,.155,-.065,.063,.035,.13,trim,foot);
 for(let k=0;k<5;k++){let z=-.15+k*.038;tube([[-.057,.17,z],[0,.19,z-.01],[.057,.17,z]],.007,sole,foot);}
 tube([[-.105,.115,.03],[-.11,.12,-.05],[-.085,.11,-.17]],.01,seam,foot);
 legs.push({side,calf,knee});
 const shoulder=oval(0,0,0,.115,.127,.115,skin);
 const bicep=limb([[0,.102],[.16,.116],[.38,.112],[.67,.087],[1,.069]],skin);
 const elbow=oval(0,0,0,.072,.075,.072,skin);
 const forearm=limb([[0,.071],[.24,.088],[.48,.077],[.78,.055],[1,.047]],skin);
 const hand=new THREE.Group();root.add(hand);
 // Rounded wrist-to-palm transition and a compact, cupped palm.
 oval(0,.008,0,.043,.045,.027,skin,hand);
 oval(0,.064,-.002,.054,.065,.027,skin,hand);
 oval(-side*.033,.046,.009,.027,.039,.025,skin,hand);
 for(let finger=0;finger<4;finger++){
  const x=(finger-1.5)*.026,len=[.067,.084,.077,.057][finger];
  // Flexed knuckles wrap toward the ball rather than sticking straight up.
  tube([[x,.103,0],[x*1.07,.126,.006],[x*1.1,.136+len*.38,.021],[x*1.08,.132+len*.55,.045]],.0115,skin,hand);
  oval(x*1.08,.132+len*.55,.045,.0115,.013,.0115,skin,hand);
 }
 tube([[-side*.039,.044,.008],[-side*.066,.065,.022],[-side*.071,.086,.043],[-side*.058,.098,.057]],.016,skin,hand);
 arms.push({side,shoulder,bicep,elbow,forearm,hand});
}
// Tailored shorts: one shared waist/seat splits into two leg openings.
// The two crotch edges share vertices, eliminating the old disconnected hip gap.
(function buildShorts(){
 const verts=[],indices=[],N=48;
 const pushRing=points=>{const start=verts.length/3;points.forEach(p=>verts.push(...p));return start;};
 const join=(lower,higher)=>{for(let i=0;i<N;i++){let j=(i+1)%N;indices.push(lower+i,higher+i,lower+j,lower+j,higher+i,higher+j);}};
 const ring=(y,rx,rz)=>Array.from({length:N},(_,i)=>{let a=-Math.PI/2+i/N*Math.PI*2;return [Math.cos(a)*rx,y,Math.sin(a)*rz];});
 const split=pushRing(ring(1.10,.335,.185));
 let prev=split;
 for(const [y,rx,rz] of [[1.17,.326,.18],[1.25,.29,.169],[1.32,.26,.158],[1.36,.252,.154]]){let r=pushRing(ring(y,rx,rz));join(prev,r);prev=r;}
 for(let side of [1,-1]){
  const top=[];
  // One half of the outer seat, followed by the shared front-to-back crotch seam.
  for(let i=0;i<N;i++){
   if(i<=N/2){let a=-Math.PI/2+i/(N/2)*Math.PI+(side===-1?Math.PI:0);top.push([Math.cos(a)*.335,1.10,Math.sin(a)*.185]);}
   else{let t=(i-N/2)/(N/2);top.push([0,1.10,side*.185*(1-2*t)]);}
  }
  let previous=pushRing(top);
  for(const [y,blend,rx,rz] of [[1.065,.55,.165,.17],[1.0,1,.166,.166],[.90,1,.164,.157],[.80,1,.151,.148]]){
   const points=top.map((p,i)=>{let a=-Math.PI/2+i/N*Math.PI*2+(side===-1?Math.PI:0);return [THREE.MathUtils.lerp(p[0],side*.178+Math.cos(a)*rx,blend),y,THREE.MathUtils.lerp(p[2],-.018+Math.sin(a)*rz,blend)];});
   let current=pushRing(points);join(current,previous);previous=current;
  }
 }
 // Weld coincident branch boundaries so lighting stays continuous across the seat.
 const unique=[],map=[],lookup=new Map();
 for(let i=0;i<verts.length;i+=3){const key=verts.slice(i,i+3).map(v=>Math.round(v*1e5)).join(',');if(!lookup.has(key)){lookup.set(key,unique.length/3);unique.push(...verts.slice(i,i+3));}map.push(lookup.get(key));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(unique,3));g.setIndex(indices.map(i=>map[i]));g.computeVertexNormals();add(g,fabric,upper).name='Continuous tailored shorts';
 ellipse(1.335,.258,.158,seam,upper,0,.009);
 for(let side of [-1,1]){tube([[side*.26,1.32,0],[side*.331,1.12,0],[side*.342,.95,-.015],[side*.329,.81,-.018]],.009,trim,upper);}
})();
const cv=document.createElement('canvas');cv.width=256;cv.height=256;const cx=cv.getContext('2d');cx.fillStyle='#fff0c7';cx.textAlign='center';cx.font='bold 27px Arial';cx.fillText('COURTSIDE',128,57);cx.font='bold 123px Arial';cx.fillText('23',128,180);
const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const number=add(new THREE.PlaneGeometry(.38,.38),new THREE.MeshStandardMaterial({map:tex,transparent:true,roughness:1,depthWrite:false}),upper);number.position.set(0,1.79,.188);
let lift=0;
const anchor=vec(0,2.07,-.47);
function update(load,follow,time,dt){
 const target=follow>0?1:load;lift=THREE.MathUtils.damp(lift,target,13,dt);
 const crouch=follow>0?0:load*.055;upper.position.y=-crouch;
 const breathe=Math.sin(time*2.3)*.004;torso.scale.z=1+breathe;
 anchor.set(0,2.07+lift*.52-crouch,-.47+lift*.09);
 for(const l of legs){let knee=vec(l.side*.225,.79,-.035-crouch),ankle=vec(l.side*.23,.29,0);place(l.calf,knee,ankle);l.knee.position.copy(knee);}
 for(const a of arms){
  const s=a.side,shoulder=vec(s*.34,1.99-crouch,0);
  // Orient each palm inward against the sphere, then derive its wrist position.
  const outward=vec(s*.205,-.10,.095).normalize();
  const palm=anchor.clone().addScaledVector(outward,.256);
  const inward=outward.clone().negate();
  const tangent=vec(0,1,0).addScaledVector(inward,-inward.y).normalize();
  const across=tangent.clone().cross(inward).normalize();
  const basis=new THREE.Matrix4().makeBasis(across,tangent,inward);
  a.hand.quaternion.setFromRotationMatrix(basis);
  const wrist=palm.clone().addScaledVector(tangent,-.064);
  if(follow>0){wrist.y+=s===1?.10:.035;wrist.z-=.07;}

  // Two-bone inverse kinematics keeps both hands attached to the held ball.
  const axis=wrist.clone().sub(shoulder),distance=Math.min(axis.length(),.805);axis.normalize();
  const pole=vec(s*.5,-.7,-.3);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(.42*.42-.40*.40+distance*distance)/(2*distance);
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,.42*.42-along*along)));
  a.shoulder.position.copy(shoulder);a.elbow.position.copy(elbow);place(a.bicep,shoulder,elbow);place(a.forearm,elbow,wrist);a.hand.position.copy(wrist);
  if(follow>0)a.hand.rotateX(-.55*Math.min(1,follow/.25));
 }
}
update(0,0,0,1);
GroMaterials.prepare(THREE,root);
return {root,update,ballAnchor:anchor};
};
})(typeof window!=='undefined'?window:globalThis);


