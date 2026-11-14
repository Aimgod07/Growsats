/* Sculpted, reference-inspired hero head. All geometry is local and genuinely 3D. */
(function(root){'use strict';
const T=typeof module!=='undefined'&&module.exports?require('./assets/three.min.js'):root.THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z),gauss=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
function build(head,data){
 const amara=data.name==='Amara',kai=data.name==='Kai';
 head.name=data.name+' sculpted head';
 const skinColor=new T.Color(data.skin),skin=new T.MeshPhysicalMaterial({color:skinColor,roughness:.64,clearcoat:.06,clearcoatRoughness:.65});
 const faceMat=skin.clone();faceMat.color.set('#ffffff');faceMat.vertexColors=true;
 const hair=new T.MeshStandardMaterial({color:amara?'#231c22':kai?'#1d2532':'#302623',roughness:.43}),hairLight=new T.MeshStandardMaterial({color:amara?'#352832':kai?'#303a48':'#3b2e29',roughness:.45});
 const rim=new T.MeshStandardMaterial({color:amara?'#442820':kai?'#84553e':'#7d4937',roughness:.75}),lip=new T.MeshStandardMaterial({color:amara?'#885343':kai?'#bb8568':'#bc795f',roughness:.72});
 const white=new T.MeshPhysicalMaterial({color:'#f6eddf',roughness:.28,clearcoat:.25}),pupil=new T.MeshPhysicalMaterial({color:'#100d0c',roughness:.13,clearcoat:1});
 const add=(geometry,material,name)=>{const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;head.add(m);return m;};
 const ell=(mat,x,y,z,sx,sy,sz,name)=>{const m=add(new T.SphereGeometry(1,32,24),mat,name);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;};
 const line=(pts,r,mat,name)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>V(...p))),pts.length===2?1:Math.max(16,Math.min(40,pts.length*4)),r,10,false),mat,name);
 function geom(pos,idx,colors){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
 // A densely sampled continuous head: cheekbones, eye sockets, bridge, nostrils,
 // muzzle and chin are sculpted into this surface, rather than stacked spheres.
 const profile=new T.CatmullRomCurve3([V(.001,-.008,.001),V(.047,.005,.05),V(.075,.027,.071),V(.098,.062,.087),V(.116,.105,.099),V(.123,.154,.106),V(.123,.205,.108),V(.113,.258,.101),V(.084,.303,.08),V(.001,.332,.001)],false,'catmullrom',.35);
 const pos=[],ix=[],colors=[],N=96,R=80;
 function sculpt(x,y,front){
  let d=.009*gauss(Math.abs(x),.072,.033)*gauss(y,.113,.032);
  d-=.008*gauss(Math.abs(x),.052,.032)*gauss(y,.174,.024);
  d+=.017*gauss(x,0,.014)*gauss(y,.157,.045);
  d+=.033*gauss(x,0,.020)*gauss(y,.129,.015);
  d+=.010*gauss(Math.abs(x),.018,.009)*gauss(y,.124,.010);
  d+=.005*gauss(x,0,.042)*gauss(y,.076,.026);
  d+=.006*gauss(x,0,.036)*gauss(y,.029,.019);
  return d*front;
 }
 for(let j=0;j<=R;j++){const p=profile.getPoint(j/R);for(let k=0;k<=N;k++){const a=k/N*Math.PI*2,x=Math.cos(a)*p.x,y=p.y,front=Math.max(0,-Math.sin(a)),z=Math.sign(Math.sin(a))*p.z*Math.pow(Math.abs(Math.sin(a)),.62)-sculpt(x,y,front**8);pos.push(x,y,z);const blush=gauss(Math.abs(x),.083,.028)*gauss(y,.112,.028)*front;const col=skinColor.clone().lerp(new T.Color(amara?'#935442':kai?'#c28c70':'#c47d66'),blush*.19);colors.push(col.r,col.g,col.b);if(j<R&&k<N){const n=j*(N+1)+k;ix.push(n,n+N+1,n+1,n+1,n+N+1,n+N+2);}}}
 const face=add(geom(pos,ix,colors),faceMat,'Continuous face sculpt');
 // Weld the circular shading seam without changing topology.
 const normals=face.geometry.attributes.normal;for(let j=0;j<=R;j++){const a=j*(N+1),b=a+N,n=V(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
 const earInner=new T.MeshStandardMaterial({color:amara?'#633d30':kai?'#b98569':'#b9785e',roughness:.77});
 for(const s of [-1,1]){
  const ear=ell(skin,s*.124,.153,.001,.024,.039,.022,'Ear');ear.rotation.z=-s*.13;
  ell(earInner,s*.135,.154,-.016,.012,.025,.007,'Ear concha');
  line([[s*.137,.173,-.019],[s*.130,.178,-.023],[s*.128,.162,-.024],[s*.136,.148,-.022]],.0035,skin,'Ear antihelix');
  // Almond-shaped sclera with upper and lower lids seated in the socket.
  const eyePos=[],eyeIx=[],W=40,H=16;
  const eyePoint=(u,v)=>{const arc=Math.sqrt(Math.max(0,1-u*u)),x=s*(.054+u*.034),y=.169+u*.003+arc*(.015*(1-v)-.021*v),z=-.103+.015*(u+1)/2-.013*arc*Math.sin(Math.PI*v);return [x,y,z];};
  for(let j=0;j<=H;j++)for(let i=0;i<=W;i++){eyePos.push(...eyePoint(i/W*2-1,j/H));if(j<H&&i<W){const n=j*(W+1)+i;if(s>0)eyeIx.push(n,n+1,n+W+1,n+1,n+W+2,n+W+1);else eyeIx.push(n,n+W+1,n+1,n+1,n+W+1,n+W+2);}}
  add(geom(eyePos,eyeIx),white,'Almond eye white');
  const top=[],bottom=[],crease=[];for(let i=0;i<=24;i++){const u=i/24*2-1,a=eyePoint(u,0),b=eyePoint(u,1);a[2]-=.019*Math.sqrt(Math.max(0,1-u*u));b[2]-=.004*Math.sqrt(Math.max(0,1-u*u));top.push(a);bottom.push(b);crease.push([a[0],a[1]+.006,a[2]+.003]);}
  const lp=[],li=[];for(let j=0;j<top.length;j++){const a=top[j],u=j/(top.length-1)*2-1,w=Math.sqrt(Math.max(0,1-u*u));lp.push(...a,a[0],a[1]+.011*w,a[2]+.022*w);if(j<top.length-1){const n=j*2;li.push(n,n+1,n+2,n+1,n+3,n+2);}}const lidMat=skin.clone();lidMat.side=T.DoubleSide;add(geom(lp,li),lidMat,'Upper lid skin');line(top,.0028,skin,'Upper eyelid');line(bottom,.0023,skin,'Lower eyelid');
  line(top.map(p=>[p[0],p[1]-.0014,p[2]-.0015]),.0015,hair,'Upper lash rim');
  const irisMat=new T.MeshPhysicalMaterial({color:amara?'#4b2f21':kai?'#776040':'#714222',roughness:.23,clearcoat:.6});
  const iris=ell(irisMat,s*.052,.167,-.1112,.0178,.0200,.0056,'Brown iris');
  // Fine radial iris fibers give depth without any external texture asset.
  const fibers=new T.MeshStandardMaterial({color:amara?'#67412c':kai?'#8d7550':'#80512f',roughness:.5});
  for(let j=0;j<28;j++){const a=j/28*Math.PI*2,r0=.0105,r1=.0165;line([[s*.052+Math.cos(a)*r0,.167+Math.sin(a)*r0*1.18,-.1166],[s*.052+Math.cos(a+.025)*r1,.167+Math.sin(a+.025)*r1*1.18,-.1141]],.00028,fibers,'Iris fiber');}
  ell(pupil,s*.052,.167,-.1166,.0094,.0134,.0025,'Pupil');
  const glint=new T.MeshBasicMaterial({color:'#fff8e7'});ell(glint,s*.052-.005,.175,-.119,.0034,.0044,.001,'Eye catchlight');ell(glint,s*.052+.004,.161,-.119,.0012,.0015,.0006,'Eye secondary glint');
  // Tapered brow ribbons with lowered inner ends: a focused, relaxed expression.
  const bp=[],bi=[];for(let j=0;j<=32;j++){const t=j/32,x=s*(.021+t*.070),y=(amara?.205:.200)+(amara?.009:.012)*Math.sin(t*Math.PI*.85)+t*.001,z=-.123+t*.027,th=(amara?.0048:kai?.006:.0068)*Math.sin(Math.PI*(.11+t*.85));bp.push(x,y-th,z,x,y+th,z+.001);if(j<32){const n=j*2;bi.push(n,n+1,n+2,n+1,n+3,n+2);}}const browMat=hair.clone();browMat.side=T.DoubleSide;add(geom(bp,bi),browMat,'Sculpted eyebrow');
 }
 // Small nostril shadows sit on the underside of the integrated nose.
 for(const s of [-1,1]){const n=ell(rim,s*.012,.119,-.132,.0048,.0023,.0023,'Nostril');n.rotation.z=s*.2;}
 // Sculpted lip planes follow the mouth line; no floating muzzle pieces.
 const mouth=[];for(let i=0;i<=24;i++){const u=i/24*2-1;mouth.push([u*.032,.069+.002*u+.0015*u*u,-.097-.006*(1-u*u)]);}
 line(mouth,.00125,rim,'Mouth line');
 for(const upper of [true,false]){const pp=[],ii=[];for(let j=0;j<=40;j++){const u=j/40*2-1,w=Math.max(0,1-u*u),x=u*.032,y=.069+.002*u+.0015*u*u,z=-.097-.006*w;const h=upper?.0027*w*(1-.36*gauss(u,0,.22)):-.0045*w;pp.push(x,y,z+.0008,x,y+h,z-.0018*w);if(j<40){const n=j*2;ii.push(n,n+2,n+1,n+1,n+2,n+3);}}const lm=lip.clone();lm.side=T.DoubleSide;add(geom(pp,ii),lm,upper?'Upper lip':'Lower lip');}
 // A fitted scalp with an uneven temple hairline, covered by layered tapered locks.
 const hp=[],hi=[],HN=80,HR=26;
 function scalpAt(y){let lo=0,hi=1;for(let i=0;i<16;i++){const t=(lo+hi)/2;if(profile.getPoint(t).y<Math.min(y,.331))lo=t;else hi=t;}return profile.getPoint((lo+hi)/2);}
 for(let j=0;j<=HR;j++)for(let k=0;k<=HN;k++){const a=k/HN*Math.PI*2,front=Math.max(0,-Math.sin(a)),hairline=T.MathUtils.lerp(.075+.075*Math.cos(a)**2,amara?.258:.255,front**.4)+.003*Math.cos(a*3),t=j/HR,y=hairline+(.344-hairline)*t,sp=scalpAt(y),tip=y>.328?Math.max(.001,(.344-y)/.016):1;hp.push(Math.cos(a)*(sp.x+.005)*tip,y,Math.sign(Math.sin(a))*(sp.z+.005)*Math.pow(Math.abs(Math.sin(a)),.62)*tip);if(j<HR&&k<HN){const n=j*(HN+1)+k;hi.push(n,n+HN+1,n+1,n+1,n+HN+1,n+HN+2);}}
 add(geom(hp,hi),hair,'Fitted hair cap');
 function lock(points,width,depth,material,name){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),frames=curve.computeFrenetFrames(32,false),p=[],idx=[];for(let j=0;j<=32;j++){const t=j/32,center=curve.getPointAt(t),r=Math.max(.003,Math.sin(Math.PI*t)**.65);for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,v=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*width*r).addScaledVector(frames.binormals[j],Math.sin(a)*depth*r*(1+.045*Math.cos(a*6)));p.push(...v.toArray());if(j<32&&k<12){const n=j*13+k;idx.push(n,n+1,n+13,n+1,n+14,n+13);}}}return add(geom(p,idx),material,name);}
 if(amara){
 // Swept-back sculpted sections lead to a tied bun; the kit-colored band hugs the scalp.
 for(let i=0;i<11;i++){const x=-.11+i*.022;lock([[x,.245,-.069],[x*.91,.306,-.045],[x*.70,.342,.020],[x*.37,.303,.106],[x*.2,.275,.144]],.013,.009,i%3===0?hairLight:hair,'Amara swept section');}
 ell(hair,0,.275,.116,.080,.072,.061,'Amara bun base');
 for(let i=0;i<7;i++){const angle=i/7*Math.PI*2;lock([[Math.cos(angle)*.050,.275+Math.sin(angle)*.049,.135],[Math.cos(angle+.7)*.063,.275+Math.sin(angle+.7)*.060,.164],[Math.cos(angle+1.5)*.054,.275+Math.sin(angle+1.5)*.052,.177],[Math.cos(angle+2.3)*.034,.275+Math.sin(angle+2.3)*.036,.159]],.014,.010,i%2?hair:hairLight,'Amara bun braid');}
 const band=new T.MeshStandardMaterial({color:data.kit,roughness:.8});
 line([[-.120,.209,-.013],[-.112,.266,-.040],[-.071,.313,-.064],[0,.330,-.071],[.071,.313,-.064],[.112,.266,-.040],[.120,.209,-.013]],.0055,band,'Amara headband');
 for(const sign of [-1,1])lock([[sign*.113,.265,-.008],[sign*.127,.232,-.012],[sign*.119,.195,-.015]],.011,.008,hair,'Amara temple curl');
 }else if(kai){
 // A compact swept quiff and fitted side sections keep Kai distinct from Luca.
 for(let i=0;i<9;i++){const x=-.104+i*.025,h=.010*Math.sin(i*.8);lock([[x,.254,-.060],[x-.022,.291+h,-.091],[x-.018,.331+h,-.062],[x+.012,.351+h,-.015],[x+.033,.329+h,.027]],.016,.010,i%3===0?hairLight:hair,'Kai quiff lock');}
 for(const sign of [-1,1])for(let i=0;i<6;i++){const z=.055-i*.022;lock([[sign*.120,.197,z],[sign*.127,.236,z-.006],[sign*.111,.280,z-.006],[sign*.087,.303,z+.006]],.011,.007,i%2?hair:hairLight,'Kai side section');}
 lock([[-.09,.29,-.075],[-.035,.277,-.107],[.043,.257,-.111],[.109,.270,-.074]],.016,.010,hairLight,'Kai fringe');
 }else{
 // Back-to-front rows follow the skull; individual tips break the silhouette.
 for(let i=0;i<8;i++){const z=.075-i*.023,h=Math.sin(i/7*Math.PI)*.017;lock([[-.106,.243,z],[-.087,.301+h,z-.015],[-.031,.344+h,z-.012],[.054,.324+h,z-.022],[.112,.263+h,z-.018]],.024,.014,i%3===0?hairLight:hair,'Swept hair lock');}
 for(let i=0;i<5;i++){const z=.065-i*.034;lock([[.113,.205,z],[.128,.252,z-.008],[.109,.284,z-.014],[.077,.310,z-.025]],.016,.010,hair,'Temple lock');lock([[-.115,.205,z],[-.129,.251,z],[-.117,.285,z-.01],[-.139,.307,z+.013]],.020,.011,i%2?hair:hairLight,'Side swept lock');}
 lock([[-.102,.313,-.069],[-.049,.293,-.111],[.027,.263,-.123],[.104,.263,-.09]],.021,.011,hairLight,'Front fringe');
 lock([[-.102,.326,-.049],[-.047,.312,-.108],[.032,.281,-.124],[.112,.275,-.08]],.020,.012,hair,'Layered fringe');
 lock([[-.095,.337,-.031],[-.042,.330,-.092],[.040,.305,-.113],[.109,.289,-.083]],.019,.010,hairLight,'Upper fringe');
 lock([[-.078,.315,.014],[-.067,.354,.013],[-.089,.382,.035],[-.109,.389,.047]],.021,.013,hairLight,'Crown tuft');

 }
 // Batch the tiny iris fibers to keep the face inexpensive to draw on phones.
 const fiberMeshes=head.children.filter(m=>m.name==='Iris fiber');
 if(fiberMeshes.length){const p=[],n=[];for(const m of fiberMeshes){const g=m.geometry.toNonIndexed();p.push(...g.attributes.position.array);n.push(...g.attributes.normal.array);g.dispose();head.remove(m);m.geometry.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));add(g,fiberMeshes[0].material,'Iris fibers');for(const mat of new Set(fiberMeshes.map(m=>m.material)))if(mat!==fiberMeshes[0].material)mat.dispose();}
 return head;
}
if(typeof module!=='undefined'&&module.exports)module.exports=build;else root.buildFootballHeroHead=build;
})(typeof window!=='undefined'?window:globalThis);

