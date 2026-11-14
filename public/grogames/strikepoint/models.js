/* Original modular weapons and articulated operators. All models are generated locally. */
(function(root){'use strict';const T=typeof module!=='undefined'&&module.exports?require('./assets/three.min.js'):THREE;const C=typeof module!=='undefined'&&module.exports?require('./catalog.js'):StrikeCatalog;
const v=(x,y,z)=>new T.Vector3(x,y,z),up=v(0,1,0),mat=(color,extra={})=>{const m=typeof GroMaterials!=='undefined'?GroMaterials.make(T,color,extra.metalness>.35?'metal':'fabric'):new T.MeshStandardMaterial({color,roughness:.65});m.setValues(extra);return m;};
function mesh(geo,m,p,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function oval(p,m,x,y,z,sx,sy,sz){const o=mesh(new T.SphereGeometry(1,28,20),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;}
function shapeBox(w,h,d,r=.025){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,bevelSize:.008,bevelThickness:.008,steps:1,curveSegments:4});g.translate(0,0,-d/2);return g;}
function panel(p,m,x,y,z,w,h,d,r){return mesh(shapeBox(w,h,d,r),m,p,x,y,z);}
function tube(p,m,a,b,r1,r2=r1){const dir=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r1,dir.length(),14),m,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,dir.normalize());return o;}
function bodySurface(p,m,rows){const N=28,pos=[],ind=[];for(const [y,rx,rz,cz=0]of rows)for(let i=0;i<=N;i++){let a=i/N*Math.PI*2;pos.push(Math.cos(a)*rx,y,cz+Math.sin(a)*rz);}for(let j=0;j<rows.length-1;j++)for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+N+1;ind.push(a,b,a+1,a+1,b,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();return mesh(g,m,p);}
function gun(type=0,skin=0){
 const cfg=C.guns[type],palette=C.skins[skin],p=new T.Group();p.name=cfg.name;const rigid=new T.Group();p.add(rigid);
 const metal=mat('#434a49',{metalness:.78,roughness:.38}),edge=mat('#68716b',{metalness:.8,roughness:.3}),polymer=mat('#272e2b',{metalness:.05,roughness:.86}),rubber=mat('#161e1b',{roughness:.96}),steel=mat('#93998f',{metalness:.86,roughness:.29}),accent=mat(skin===0?'#777b65':palette.body,{metalness:.45,roughness:.6}),recess=mat('#101714',{roughness:.7});
 const scopeGlass=mat('#244c43',{metalness:.35,roughness:.12,transparent:true,opacity:.22,depthWrite:false});
 function box(parent,m,x,y,z,w,h,d,r=.008){return panel(parent,m,x,y,z,w,h,d,Math.min(r,w/4,h/4));}
 function cyl(parent,m,x,y,z,length,r1,r2=r1){return tube(parent,m,v(x,y,z+length/2),v(x,y,z-length/2),r1,r2);}
 function screw(x,y,z){const q=mesh(new T.CylinderGeometry(.009,.009,.006,10),steel,rigid,x,y,z);q.rotation.z=Math.PI/2;box(rigid,recess,x+.004,y,z,.004,.003,.011,.001);}
 function profile(parent,m,points,width){const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:2,bevelSize:.005,bevelThickness:.005,steps:1});g.rotateY(-Math.PI/2);g.translate(width/2,0,0);return mesh(g,m,parent);}
 const barrelEnd=[-.79,-.55,-.83,-1.08][type],front=[-.43,-.30,-.48,-.63][type];
 // Machined upper/lower receiver with visible ejection port, selector and pins.
 profile(rigid,metal,[[-.25,.08],[.18,.08],[.23,.025],[.18,-.08],[-.14,-.10],[-.25,-.04]],.10);
 cyl(rigid,metal,0,.075,-.01,.45,.055);box(rigid,recess,.057,.055,-.015,.012,.044,.12);
 box(rigid,edge,.066,.024,-.01,.009,.017,.12);box(rigid,polymer,-.06,.035,.02,.012,.05,.085);
 for(const z of [-.15,.13])screw(.059,-.035,z);
 const selector=box(rigid,steel,-.065,-.04,.1,.012,.014,.04);selector.rotation.x=.45;
 // Buffer tube and adjustable shoulder stock, with rubber recoil pad.
 cyl(rigid,edge,0,.025,.31,.28,.027);for(let i=0;i<5;i++)cyl(rigid,polymer,0,.025,.24+i*.022,.012,.033);
 profile(rigid,type===3?accent:polymer,[[.25,.055],[.47,.055],[.51,.015],[.51,-.145],[.44,-.145],[.40,-.055],[.25,-.035]],.11);
 box(rigid,rubber,0,-.045,.52,.12,.205,.025);box(rigid,accent,0,.066,.38,.115,.025,.18);
 // Angled pistol grip and hollow trigger guard.
 const grip=box(rigid,polymer,0,-.17,.12,.085,.22,.11,.012);grip.rotation.x=-.30;
 for(let i=0;i<6;i++)box(grip,rubber,0,-.075+i*.027,.057,.087,.009,.009,.002);
 const guard=mesh(new T.TorusGeometry(.06,.007,6,20,Math.PI*1.5),edge,rigid,0,-.13,.015);guard.rotation.y=Math.PI/2;guard.rotation.z=.25;
 const trigger=box(rigid,steel,0,-.12,.035,.012,.05,.014);trigger.rotation.x=-.35;
 // Ventilated handguard, rails, exposed barrel and slotted muzzle device.
 box(rigid,metal,0,.028,(front-.23)/2,.13,.125,Math.abs(front+.23),.014);
 for(let z=front+.025;z<-.20;z+=.037){for(const sign of [-1,1])box(rigid,recess,sign*.067,.035,z,.006,.04,.022,.007);box(rigid,edge,0,.103,z,.14,.014,.02,.002);}
 for(let z=-.2;z<.20;z+=.028)box(rigid,edge,0,.131,z,.10,.012,.017,.002);
 cyl(rigid,metal,0,.037,(front+barrelEnd)/2,Math.abs(barrelEnd-front),type===2?.033:.021);
 cyl(rigid,edge,0,.037,barrelEnd+.018,.07,type===2?.038:.031);
 cyl(rigid,recess,0,.037,barrelEnd-.020,.006,type===2?.026:.018);
 for(let i=0;i<4;i++)box(rigid,recess,.031,.037,barrelEnd+.003+i*.014,.003,.026,.006,.001);
 // Separate animated magazine: curved STANAG-inspired profile on the carbine.
 const magazine=new T.Group();magazine.position.set(0,-.08,-.13);p.add(magazine);
 if(type!==2){const curve=type===0?.07:type===3?.018:0;profile(magazine,type===0?accent:metal,[[-.065,0],[.06,0],[.075,-.10],[.06+curve,-.30],[-.055+curve,-.31],[-.065,-.12]],.073);for(const side of [-1,1])for(let i=0;i<3;i++){const rib=box(magazine,edge,side*.040,-.17,-.04+i*.035,.005,.23,.009,.002);rib.rotation.x=-curve*2;}box(magazine,polymer,0,-.31,curve,.085,.018,.13);}
 // A shotgun has a tubular magazine and ribbed fore-end instead of a rifle magazine.
 const pump=new T.Group();pump.position.z=front+.08;p.add(pump);
 if(type===2){cyl(rigid,metal,0,-.055,-.44,.50,.025);box(pump,polymer,0,-.01,0,.15,.12,.22,.018);for(let i=0;i<9;i++)box(pump,accent,0,-.01,-.10+i*.025,.154,.125,.009,.002);for(let i=0;i<4;i++){cyl(rigid,accent,-.085,-.01,-.16+i*.04,.031,.012);cyl(rigid,steel,-.085,-.01,-.145+i*.04,.008,.013);}magazine.visible=false;}
 // Sight silhouettes differ by weapon: holographic carbine, reflex SMG, irons, scope.
 let sightHeight=.195;
 if(type===3){sightHeight=.216;box(rigid,polymer,0,.16,-.04,.085,.07,.24);cyl(rigid,polymer,0,.216,-.13,.42,.047);cyl(rigid,metal,0,.216,-.37,.10,.074,.049);cyl(rigid,metal,0,.216,.10,.09,.057);const lens=mesh(new T.CircleGeometry(.046,24),scopeGlass,rigid,0,.216,.147);const dot=mesh(new T.CircleGeometry(.003,8),mat('#e1aa74',{emissive:'#e1aa74',emissiveIntensity:.5}),rigid,0,.216,.149);for(const z of [-.23,.04]){const band=mesh(new T.TorusGeometry(.051,.008,8,24),edge,rigid,0,.216,z);}cyl(rigid,edge,0,.28,-.12,.045,.023);for(const side of [-1,1]){const leg=box(rigid,metal,side*.07,-.07,-.57,.025,.025,.24);leg.rotation.y=side*.16;}}
 else if(type!==2){const sy=type===0?.195:.184;sightHeight=sy;box(rigid,polymer,0,.147,.085,.12,.035,.115);box(rigid,metal,-.056,sy,.07,.013,.10,.05);box(rigid,metal,.056,sy,.07,.013,.10,.05);box(rigid,metal,0,sy+.051,.07,.123,.013,.05);box(rigid,edge,0,sy-.043,.07,.123,.014,.05);const dot=mesh(new T.CircleGeometry(.003,8),mat('#db4433',{emissive:'#ff3322',emissiveIntensity:2}),rigid,0,sy,.045);}
 else{sightHeight=.14;box(rigid,polymer,0,.12,.15,.09,.025,.03);box(rigid,steel,-.032,.14,.15,.014,.045,.025);box(rigid,steel,.032,.14,.15,.014,.045,.025);box(rigid,accent,0,.14,barrelEnd+.10,.012,.045,.016);}
 // Forward grip, sling mounts, small wear edges and screws.
 if(type===0||type===1){box(rigid,accent,0,-.055,front+.09,.11,.035,.12);const fore=box(rigid,polymer,0,-.14,front+.09,.065,.17,.075);fore.rotation.x=.16;}
 for(const z of [-.22,.12]){const sling=mesh(new T.TorusGeometry(.018,.004,6,12),steel,rigid,-.065,.00,z);sling.rotation.y=Math.PI/2;}
 for(const z of [-.19,-.07,.09,.17])screw(.061,.078,z);
 const bolt=box(p,steel,.061,.055,-.015,.009,.025,.065);const flash=new T.Group();flash.position.set(0,.037,barrelEnd-.04);p.add(flash);
 const fmat=new T.MeshBasicMaterial({color:'#ffe7b1',transparent:true,opacity:.85,depthWrite:false});
 for(let i=0;i<3;i++){const f=mesh(new T.ConeGeometry(.055,.22,5),fmat,flash,0,0,-.1);f.rotation.x=-Math.PI/2;f.rotation.z=i*2.1;}flash.visible=false;
 // Consolidate rigid details by material; animated parts stay independently addressable.
 rigid.updateMatrixWorld(true);const buckets=new Map();rigid.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);});const old=new Set();rigid.traverse(o=>{if(o.geometry)old.add(o.geometry);});rigid.clear();old.forEach(g=>g.dispose());
 for(const [m,parts]of buckets){const pos=[],nor=[],uv=[];for(const g of parts){pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);if(g.attributes.uv)uv.push(...g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)uv.push(0,0);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));mesh(g,m,rigid);}
 function animate(progress=-1,kick=0,elapsed=0){bolt.position.z=-.015+Math.min(1,kick)*.07;magazine.position.set(0,-.08,-.13);magazine.rotation.set(0,0,0);pump.position.z=front+.08;if(progress>=0){if(type===2){pump.position.z+=Math.sin(Math.PI*Math.max(0,(progress-.80)/.20))*.10;}else{const drop=Math.sin(Math.PI*Math.min(1,Math.max(0,(progress-.10)/.65)));magazine.position.y-=drop*.39;magazine.position.x-=drop*.10;magazine.rotation.x=-drop*.25;magazine.visible=progress<.37||progress>.55;bolt.position.z+=Math.sin(Math.PI*Math.max(0,(progress-.78)/.22))*.075;}}else{magazine.visible=type!==2;if(type===2)pump.position.z+=Math.sin(Math.PI*Math.min(1,Math.max(0,(elapsed-.10)/.32)))*.10;}}
 return{root:p,flash,muzzle:v(0,.037,barrelEnd-.12),sightHeight,magazine,pump,bolt,animate};
}
function hand(parent,skin,glove,position,rotation=0){const g=new T.Group();g.position.copy(position);g.rotation.x=rotation;parent.add(g);oval(g,glove,0,0,0,.055,.075,.03);for(let i=0;i<4;i++){const x=(i-1.5)*.025;tube(g,skin,v(x,-.02,-.015),v(x,-.075,-.032),.012,.009);oval(g,skin,x,-.078,-.032,.01,.016,.012);}oval(g,glove,.055,-.015,-.008,.025,.04,.026);return g;}
function operator(agent=0,skinIndex=0,gunType=0,enemy=false){
const cfg=C.agents[agent],p=new T.Group();p.name=(enemy?'Hostile ':'')+cfg.name;
const armor=mat(enemy?'#98515c':cfg.color,{metalness:.65,roughness:.31}),edge=mat('#17232e',{metalness:.7,roughness:.4}),steel=mat('#8b9eaa',{metalness:.85,roughness:.26}),light=mat(enemy?'#ff815e':cfg.accent,{emissive:enemy?'#f94829':cfg.accent,emissiveIntensity:1.1}),glass=mat('#101f2c',{metalness:.75,roughness:.17});
function bearing(parent,x,y,z,r,axis='x'){const hub=mesh(new T.CylinderGeometry(r,r,.065,24),edge,parent,x,y,z);if(axis==='x')hub.rotation.z=Math.PI/2;else if(axis==='z')hub.rotation.x=Math.PI/2;const ring=mesh(new T.TorusGeometry(r*.79,.008,8,28),steel,parent,x+(axis==='x'?.037:0),y,z+(axis==='z'?-.037:0));if(axis==='x')ring.rotation.y=Math.PI/2;return hub;}
function cable(parent,points,r=.012){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>v(...q))),20,r,8,false),edge,parent);}
const torso=new T.Group();p.add(torso);
// Tapered central chassis, floating curved breastplates, and a visible reactor.
bodySurface(torso,edge,[[.89,.16,.11],[1.03,.18,.13],[1.18,.17,.13],[1.35,.23,.145],[1.50,.25,.13],[1.57,.11,.075]]);
for(const side of [-1,1]){const plate=oval(torso,armor,side*.125,1.36,-.085,.145,.19,.13);plate.rotation.z=side*-.15;oval(torso,steel,side*.19,1.49,-.045,.092,.06,.09);cable(torso,[[side*.18,1.45,.08],[side*.23,1.25,.10],[side*.16,1.06,.08]]);for(let j=0;j<3;j++){const rib=oval(torso,armor,side*.085,1.08+j*.065,-.10,.09,.035,.065);rib.rotation.z=side*.11;}}
bearing(torso,0,1.35,-.207,.064,'z');oval(torso,light,0,1.35,-.251,.041,.041,.008);
for(let j=0;j<4;j++)tube(torso,steel,v(-.032,1.12+j*.037,.145),v(.032,1.12+j*.037,.145),.012);
oval(torso,edge,0,.94,0,.19,.12,.135);for(const side of [-1,1])oval(torso,armor,side*.12,.96,-.025,.106,.10,.13);
tube(torso,steel,v(0,1.53,0),v(0,1.66,0),.05);for(let j=0;j<3;j++){const ring=mesh(new T.TorusGeometry(.057,.009,8,24),edge,torso,0,1.58+j*.025,0);ring.rotation.x=Math.PI/2;}
const head=new T.Group();head.position.set(0,1.61,0);torso.add(head);
oval(head,edge,0,.165,0,.142,.181,.12);oval(head,armor,0,.23,.025,.146,.135,.123);
oval(head,glass,0,.185,-.083,.128,.062,.060);
for(const side of [-1,1]){const eye=oval(head,light,side*.051,.188,-.139,.035,.012,.008);eye.rotation.z=side*-.12;const cheek=oval(head,armor,side*.091,.105,-.072,.054,.082,.069);cheek.rotation.z=side*.22;bearing(head,side*.141,.17,.008,.049);oval(head,light,side*.179,.17,.008,.004,.021,.021);}
oval(head,steel,0,.061,-.076,.068,.045,.064);for(let j=0;j<4;j++)tube(head,edge,v(-.035,.07+j*.011,-.132),v(.035,.07+j*.011,-.132),.003);
if(agent===0){for(const side of [-1,1]){tube(head,steel,v(side*.11,.26,.03),v(side*.14,.39,.04),.013,.005);oval(head,light,side*.14,.39,.04,.009,.009,.009);}}else if(agent===1){oval(head,armor,0,.28,-.074,.11,.065,.066);oval(head,light,0,.295,-.132,.014,.014,.006);}else{tube(head,steel,v(.12,.23,.04),v(.18,.36,.04),.008);oval(head,light,.18,.36,.04,.012,.012,.012);}
const legs=[],arms=[];for(const side of [-1,1]){
const leg=new T.Group();leg.position.set(side*.14,.91,0);p.add(leg);bearing(leg,0,0,0,.078);tube(leg,steel,v(0,-.04,0),v(0,-.36,0),.049,.039);oval(leg,armor,0,-.19,-.012,.096,.185,.095);tube(leg,steel,v(side*.075,-.07,.035),v(side*.059,-.34,.035),.016,.011);
const shin=new T.Group();shin.position.y=-.41;leg.add(shin);bearing(shin,0,0,0,.079);oval(shin,armor,0,-.015,-.066,.067,.074,.046);tube(shin,steel,v(0,-.06,0),v(0,-.36,0),.041,.027);oval(shin,armor,0,-.20,-.014,.071,.16,.075);oval(shin,light,0,-.18,-.084,.014,.07,.007);bearing(shin,0,-.36,0,.047);oval(shin,edge,0,-.43,-.07,.095,.045,.17);oval(shin,armor,0,-.397,-.095,.091,.052,.145);for(const x of [-.043,0,.043])oval(shin,steel,x,-.412,-.20,.017,.025,.034);legs.push({hip:leg,knee:shin});
const arm=new T.Group();arm.position.set(side*.285,1.46,0);torso.add(arm);bearing(arm,0,0,0,.078);oval(arm,armor,side*.015,-.022,.008,.114,.105,.11);tube(arm,steel,v(0,-.075,0),v(0,-.29,0),.044,.034);oval(arm,armor,0,-.17,0,.068,.105,.068);
const elbow=new T.Group();elbow.position.y=-.32;arm.add(elbow);bearing(elbow,0,0,0,.059);tube(elbow,steel,v(0,-.02,0),v(0,-.27,0),.034,.025);oval(elbow,armor,0,-.15,0,.067,.13,.065);oval(elbow,light,0,-.13,-.065,.016,.059,.006);tube(elbow,steel,v(side*.047,-.04,.02),v(side*.039,-.25,.02),.009);hand(elbow,steel,edge,v(0,-.32,0));arms.push({side,shoulder:arm,elbow});}
const weapon=gun(gunType,enemy?3:skinIndex);weapon.root.position.set(.08,1.15,-.20);weapon.root.rotation.y=-.03;p.add(weapon.root);
oval(torso,edge,0,1.31,.15,.16,.20,.08);for(const side of [-1,1]){tube(torso,armor,v(side*.10,1.16,.205),v(side*.10,1.45,.205),.045);oval(torso,light,side*.10,1.46,.205,.025,.012,.025);}
function pose(t,moving=0,shoot=0){legs.forEach((l,i)=>{const a=Math.sin(t+i*Math.PI)*moving;l.hip.rotation.x=a*.55;l.knee.rotation.x=Math.max(0,-a)*.65;});for(const a of arms){const shoulder=v(a.side*.285,1.46,0),wrist=a.side<0?v(-.01,1.17,-.45):v(.08,.99,-.10);const delta=wrist.clone().sub(shoulder),dist=Math.min(.635,delta.length()),axis=delta.normalize();const pole=v(a.side*.7,-1,.15);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const elbow=shoulder.clone().addScaledVector(axis,dist/2).addScaledVector(pole,Math.sqrt(Math.max(0,.32*.32-dist*dist/4)));a.shoulder.quaternion.setFromUnitVectors(v(0,-1,0),elbow.clone().sub(shoulder).normalize());const foreQ=new T.Quaternion().setFromUnitVectors(v(0,-1,0),wrist.clone().sub(elbow).normalize());a.elbow.quaternion.copy(a.shoulder.quaternion).invert().multiply(foreQ);}weapon.root.position.z=-.20+shoot*.035;}
pose(0);return{root:p,pose,weapon,head};}

function firstPerson(agent,gunType,skinIndex){
 const group=new T.Group(),skin=mat(C.agents[agent].skin,{roughness:.86}),sleeve=mat('#6e7652',{roughness:.92}),camo=mat('#3f513b',{roughness:.95}),glove=mat('#68684e',{roughness:.92}),dark=mat('#323b2d',{roughness:.9});const weapon=gun(gunType,skinIndex);group.add(weapon.root);
 function arm(side){const g=new T.Group();group.add(g);const end=side>0?v(.035,-.19,.13):v(-.05,-.12,gunType===2?-.37:-.32),start=side>0?v(.22,-.40,.49):v(-.27,-.36,.34);tube(g,sleeve,start,end,.078,.052);for(let j=0;j<4;j++){const at=start.clone().lerp(end,(j+.5)/4);const patch=oval(g,camo,at.x+.02,at.y,at.z,.047,.019,.045);patch.rotation.x=.6;}const wrist=start.clone().lerp(end,.91);tube(g,dark,wrist,end,.057,.057);const h=hand(g,glove,glove,end,side>0?-.30:-1.12);for(let j=0;j<3;j++)oval(h,dark,(j-1)*.026,.025,.015,.013,.018,.008);return g;}
 const right=arm(1),left=arm(-1);
 function animate(progress,kick,elapsed){weapon.animate(progress,kick,elapsed);left.position.set(0,0,0);left.rotation.set(0,0,0);if(progress>=0){const a=Math.sin(Math.PI*Math.min(1,Math.max(0,progress/.85)));left.position.set(.04*a,-.20*a,.13*a);left.rotation.z=.18*a;}}
 return{root:group,weapon,animate};
}
function environment(mapIndex){const cfg=C.maps[mapIndex],scene=new T.Scene();scene.background=new T.Color(cfg.sky);scene.fog=new T.Fog(cfg.sky,28,cfg.fog);scene.add(new T.HemisphereLight(mapIndex===2?'#a3c4e8':'#e8f6ff',mapIndex===2?'#172136':'#8c7962',mapIndex===2?1.6:2.6));const sun=new T.DirectionalLight(mapIndex===2?'#8dcbe5':'#fff1d2',mapIndex===2?1.6:3.0);sun.position.set(-12,24,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:65});sun.shadow.normalBias=.025;scene.add(sun);
const ground=mat(cfg.ground),wall=mat(cfg.wall),trim=mat(mapIndex===2?'#8396b1':'#e4d7be'),accent=mat(cfg.accent),black=mat('#283f4e'),glow=mat(cfg.accent,{emissive:cfg.accent,emissiveIntensity:mapIndex===2?1.5:.1});mesh(new T.BoxGeometry(75,.2,75),ground,scene,0,-.11,0);
for(let i=-14;i<=14;i+=2){tube(scene,mat(mapIndex===2?'#486278':'#aa9d8b'),v(i,.005,-15),v(i,.005,15),.012);tube(scene,mat(mapIndex===2?'#486278':'#aa9d8b'),v(-15,.005,i),v(15,.005,i),.012);}
for(const [x,z,w,d,h]of cfg.obstacles){panel(scene,wall,x,h/2,z,w,h,d,.06);panel(scene,trim,x,h+.04,z,w+.10,.12,d+.10,.025);if(h>2){for(let y=.7;y<h;y+=.75){if(mapIndex===0){panel(scene,trim,x,y,z-d/2-.012,w,.045,.04,.008);}else{panel(scene,black,x,y,z-d/2-.02,w*.8,.025,.035,.008);}}for(let s of [-1,1]){panel(scene,accent,x+s*(w/2-.1),h/2,z-d/2-.025,.12,h*.8,.05,.01);}}else{for(let s of [-1,1])panel(scene,black,x+s*w*.32,h/2,z-d/2-.03,.09,h*.8,.05,.008);}}
for(const [x,z,w,d]of [[-15.25,0,.5,31],[15.25,0,.5,31],[0,-15.25,31,.5],[0,15.25,31,.5]]){panel(scene,wall,x,2.5,z,w,5,d,.05);panel(scene,trim,x,5,z,w+.2,.20,d+.2,.025);}
for(let i=-12;i<=12;i+=6)for(let s of [-1,1]){const x=i,z=s*15;panel(scene,accent,x,2.3,z-s*.27,2.3,3.4,.06,.2);panel(scene,black,x,2.35,z-s*.32,2.0,3.0,.04,.15);if(mapIndex===0){const arch=mesh(new T.TorusGeometry(1,.09,8,32,Math.PI),trim,scene,x,3.7,z-s*.38);panel(scene,trim,x-1,2.4,z-s*.37,.12,2.6,.1,.025);panel(scene,trim,x+1,2.4,z-s*.37,.12,2.6,.1,.025);panel(scene,accent,x,1.6,z-s*.4,1.7,2.3,.05,.1);}else{for(let a=-.7;a<=.7;a+=.7)panel(scene,glow,x+a,2.5,z-s*.38,.06,2.3,.06,.01);}}
// Non-colliding detail stays outside the arena boundary.
for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.cos(a)*24,z=Math.sin(a)*24,h=7+(i%4)*3;panel(scene,wall,x,h/2,z,5,h,5,.1);for(let y=2;y<h;y+=2)for(let w of [-1.4,0,1.4])panel(scene,mapIndex===2?glow:black,x+w,y,z-2.53,.8,1.1,.04,.03);panel(scene,trim,x,h,z,5.3,.2,5.3,.04);}
if(mapIndex===0){for(let s of [-1,1])for(let z of [-10,10]){const x=s*18;tube(scene,mat('#846f56'),v(x,0,z),v(x+1,7,z),.18,.1);for(let i=0;i<7;i++){const a=i/7*Math.PI*2,l=oval(scene,mat('#719b73'),x+1+Math.cos(a),7,z+Math.sin(a),.25,.14,2.1);l.rotation.y=-a; l.rotation.z=.12;}}}else if(mapIndex===1){for(let s of [-1,1]){tube(scene,accent,v(s*14,5,-14),v(s*14,5,14),.16);for(let z of [-10,0,10])tube(scene,black,v(s*14,5,z),v(s*14,6,z),.08);}}else{for(let s of [-1,1]){panel(scene,glow,s*14.9,.3,0,.05,.04,27,.01);const light=new T.PointLight(cfg.accent,16,15,2);light.position.set(s*9,3,-9);scene.add(light);}}
return scene;}
const api={operator,gun,firstPerson,environment,mat,mesh,oval,panel,tube};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StrikeModels=api;
})(typeof window!=='undefined'?window:globalThis);
