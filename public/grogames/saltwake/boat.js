/* Saltwake's authored tugboat mesh and original, generated PBR surface maps. */
(function(){'use strict';const T=THREE;
function materials(){let seed=9167;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};const maps={};
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const a=c.getContext('2d');a.fillStyle={wood:'#af8052',red:'#934b37',cream:'#d4d3c2',metal:'#777e79',rock:'#6a7a77',rubber:'#282d2d',rope:'#aa9670'}[kind];a.fillRect(0,0,512,512);
 for(let i=0;i<14000;i++){const shade=Math.floor(rand()*210);a.fillStyle=`rgba(${shade},${shade},${shade},${rand()*.15})`;a.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*3);}
 for(let i=0;i<45;i++){const x=rand()*512,y=rand()*512,r=12+rand()*60,g=a.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#182f2714');g.addColorStop(1,'#182f2700');a.fillStyle=g;a.fillRect(x-r,y-r,r*2,r*2);}
 if(kind==='wood'||kind==='red'){for(let x=0;x<512;x+=64){a.fillStyle='#1e241d90';a.fillRect(x,0,2,512);a.fillStyle='#ffe5aa55';a.fillRect(x+3,0,1,512);for(let j=0;j<33;j++){const dx=x+4+rand()*56;a.strokeStyle=j%3?'#452f1938':'#f4ce9250';a.lineWidth=.5+rand();a.beginPath();a.moveTo(dx,0);a.bezierCurveTo(dx+9,100,dx-8,370,dx,512);a.stroke();}for(let y=12;y<512;y+=244){a.fillStyle='#36382b';a.beginPath();a.arc(x+10,y,2,0,7);a.fill();a.beginPath();a.arc(x+53,y,2,0,7);a.fill();}}for(let i=0;i<25;i++){a.strokeStyle='#d3b18350';a.lineWidth=rand()*3;a.beginPath();const x=rand()*512,y=rand()*512;a.moveTo(x,y);a.lineTo(x+rand()*4,y+15+rand()*60);a.stroke();}}
 if(kind==='cream'||kind==='metal'){for(let i=0;i<90;i++){a.fillStyle=kind==='cream'?'#695c3b30':'#b4784a5f';const x=rand()*512,y=rand()*512;a.fillRect(x,y,1+rand()*5,8+rand()*32);}}
 if(kind==='rubber'){a.strokeStyle='#82918a30';for(let y=0;y<512;y+=18){a.beginPath();a.moveTo(0,y);a.lineTo(512,y+32);a.stroke();}}
 if(kind==='rope'){a.strokeStyle='#4a3f2a77';a.lineWidth=3;for(let y=-512;y<512;y+=18){a.beginPath();a.moveTo(0,y);a.lineTo(512,y+512);a.stroke();}}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
 const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=512;const b=bumpCanvas.getContext('2d');b.drawImage(c,0,0);const pixels=b.getImageData(0,0,512,512);for(let i=0;i<pixels.data.length;i+=4){const gray=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray;}b.putImageData(pixels,0,0);const bump=new T.CanvasTexture(bumpCanvas);bump.wrapS=bump.wrapT=T.RepeatWrapping;maps[kind]={map,bump};return maps[kind];}
 const mat=(kind,color,rough=.7,metal=0)=>{const t=maps[kind]||texture(kind);return new T.MeshStandardMaterial({color,map:t.map,bumpMap:t.bump,bumpScale:kind==='wood'||kind==='red'?.055:.025,roughnessMap:t.bump,roughness:rough,metalness:metal,envMapIntensity:.75})};
 return {wood:mat('wood','#efce9b',.9),red:mat('red','#de9b84',.74),cream:mat('cream','#ffffff',.77),rock:mat('rock','#e3e7dc',.97),metal:mat('metal','#8c9690',.53,.7),rust:mat('metal','#ac663c',.8,.3),rope:mat('rope','#e4d6b7',.95),rubber:mat('rubber','#68716b',1),brass:new T.MeshStandardMaterial({color:'#aa8856',metalness:.76,roughness:.37,envMapIntensity:.8}),glass:new T.MeshPhysicalMaterial({color:'#174653',metalness:.48,roughness:.10,transparent:true,side:T.DoubleSide,opacity:.94,clearcoat:1,envMapIntensity:.8}),black:new T.MeshStandardMaterial({color:'#182c31',roughness:.7}),white:new T.MeshStandardMaterial({color:'#eeead5',roughness:.6}),orange:new T.MeshStandardMaterial({color:'#db773f',roughness:.65})};
}
function boat(m){const group=new T.Group();group.name='Saltwake hand-built coastal tug';
 function mesh(geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 function box(mat,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z)}
 function rounded(mat,x,y,z,w,h,d,r=.08){const sh=new T.Shape();sh.moveTo(-w/2+r,-h/2);sh.lineTo(w/2-r,-h/2);sh.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);sh.lineTo(w/2,h/2-r);sh.quadraticCurveTo(w/2,h/2,w/2-r,h/2);sh.lineTo(-w/2+r,h/2);sh.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);sh.lineTo(-w/2,-h/2+r);sh.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:5});geo.translate(0,0,-d/2);return mesh(geo,mat,x,y,z);}
 function beam(mat,a,b,r=.035){const start=new T.Vector3(...a),end=new T.Vector3(...b),o=mesh(new T.CylinderGeometry(r,r,start.distanceTo(end),8),mat);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return o;}
 function tube(mat,points,r=.035,closed=false){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),points.length*6,r,6,closed),mat);}
 const stations=36,slices=24,pos=[],uv=[],idx=[],edge=[];function width(t){return(.12+1.59*Math.sqrt(Math.sin(Math.min(1,t*1.5)*Math.PI/2)))*(1-.12*t*t)}
 for(let i=0;i<=stations;i++){const t=i/stations,z=-3.7+t*6.9,w=width(t),top=1.02+.35*(1-t)**4+.12*t**4;edge.push([w,top,z]);for(let j=0;j<=slices;j++){const a=j/slices*Math.PI;pos.push(Math.cos(a)*w,top-(top+.5)*Math.sin(a)**.74,z);uv.push(j/slices*2,t*2.6);if(i<stations&&j<slices){const a=i*(slices+1)+j,b=a+slices+1;idx.push(a,b,a+1,b,b+1,a+1);}}}
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(pos,3));hull.setAttribute('uv',new T.Float32BufferAttribute(uv,2));hull.setIndex(idx);hull.computeVertexNormals();mesh(hull,m.red);
 const deckShape=new T.Shape();edge.forEach((p,i)=>i?deckShape.lineTo(p[0],-p[2]):deckShape.moveTo(p[0],-p[2]));for(let i=edge.length-1;i>=0;i--)deckShape.lineTo(-edge[i][0],-edge[i][2]);deckShape.closePath();const deck=mesh(new T.ExtrudeGeometry(deckShape,{depth:.12,bevelEnabled:false}),m.wood,0,1.01,0);deck.rotation.x=-Math.PI/2;
 const stern=rounded(m.red,0,.52,3.2,2.91,1.15,.15);stern.rotation.x=-.05;
 for(const side of [-1,1]){tube(m.wood,edge.map(p=>[p[0]*side,p[1]+.05,p[2]]),.105);tube(m.black,edge.map(p=>[p[0]*side*.99,p[1]-.13,p[2]]),.045);}
 // Fine lapstrake edges follow the hull curvature instead of flattening it into a box.
 const seamMat=new T.MeshStandardMaterial({color:'#483b29',roughness:.92});
 for(const side of [-1,1]){for(const angle of [.19,.34,.49,.63]){tube(seamMat,edge.map(p=>[side*p[0]*Math.cos(angle)*1.006,p[1]-(p[1]+.5)*Math.sin(angle)**.74,p[2]]),.012);}
 for(const z of [-2.55,-2,-1.4,-.8,-.2,.4,1,1.6,2.2,2.8]){const w=width((z+3.7)/6.9);mesh(new T.SphereGeometry(.025,6,4),m.brass,side*w*1.003,1.02,z);}}
 // Caulked deck planks, with end joints and recessed fasteners on the exposed aft deck.
 for(let x=-1.3;x<=1.31;x+=.205){box(seamMat,x,1.137,1.98,.012,.006,2.28);box(seamMat,x+.1,1.14,1.52+(Math.round((x+1.3)*10)%2)*.65,.19,.006,.012);for(const z of [1.08,2.96]){(mesh(new T.CylinderGeometry(.017,.017,.008,6),m.metal,x+.038,1.145,z));}}
 for(const side of [-1,1]){(box(m.wood,side*1.018,1.43,-.65,.06,.08,2.55));(box(m.wood,side*1.034,2.79,-.65,.045,.075,2.65));}
 // Rounded cabin, window surrounds and a planked, gently curved roof.
 rounded(m.cream,0,1.95,-.65,2.05,1.83,2.62,.16);box(m.wood,0,1.12,-.63,2.18,.19,2.82);
 rounded(m.wood,0,1.83,.693,.79,1.4,.12,.03);rounded(m.black,0,2.12,.77,.55,.51,.025,.04);rounded(m.glass,0,2.12,.792,.47,.43,.018,.04);beam(m.brass,[.28,1.6,.79],[.28,1.8,.79],.028);
 for(const side of [-1,1]){for(const z of [-1.42,-.42]){const frame=rounded(m.wood,side*1.06,2.22,z,.78,.75,.08,.10);frame.rotation.y=side*Math.PI/2;const g=rounded(m.glass,side*1.11,2.23,z,.64,.60,.024,.07);g.rotation.y=side*Math.PI/2;beam(m.brass,[side*1.14,1.86,z-.4],[side*1.14,1.86,z+.4],.025);}
 for(const z of [-1.5,-.4,.7]){const tire=mesh(new T.TorusGeometry(.29,.105,10,24),m.rubber,side*1.69,.65,z+1.1);tire.rotation.y=Math.PI/2;beam(m.rope,[side*1.61,1.22,z+1.1],[side*1.73,.84,z+1.1],.022);}
 for(const z of [1.1,1.9,2.8,-2.5])beam(m.brass,[side*width((z+3.7)/6.9)*.92,1.08,z],[side*width((z+3.7)/6.9)*.92,1.65,z],.032);
 tube(m.brass,[[side*1.43,1.65,.9],[side*1.52,1.65,2],[side*1.40,1.65,2.95],[side*.85,1.65,3.18]],.04);
 }
 for(const x of [-.51,.51]){rounded(m.wood,x,2.25,-2.005,.88,.73,.08,.08);rounded(m.glass,x,2.27,-2.057,.72,.57,.025,.05);beam(m.black,[x-.2,1.98,-2.08],[x+.08,2.23,-2.08],.012);}
 // Bow hatch, cleats, capstans, teak roof and navigation lamps.
 const roof=new T.Group();group.add(roof);for(let i=0;i<13;i++){const z=-2.12+i*.25,shape=box(m.red,0,2.98+Math.cos((i-6)/6*Math.PI/2)*.07,z,2.43,.17,.247);shape.rotation.z=0;}
 tube(m.wood,[[-1.24,2.99,-2.22],[-1.24,3.02,-.62],[-1.24,2.99,1.08]],.055);tube(m.wood,[[1.24,2.99,-2.22],[1.24,3.02,-.62],[1.24,2.99,1.08]],.055);
 const hatch=rounded(m.wood,0,1.18,-2.75,.8,.67,.10,.03);hatch.rotation.x=-Math.PI/2;
 for(const side of [-1,1]){const x=side*.85;beam(m.brass,[x,1.13,2.7],[x,1.31,2.7],.07);beam(m.brass,[x-.18,1.28,2.7],[x+.18,1.28,2.7],.045);mesh(new T.SphereGeometry(.09,10,8),new T.MeshStandardMaterial({color:side<0?'#d14831':'#56af83',emissive:side<0?'#9c3219':'#2b7962',emissiveIntensity:.35}),side*1.16,3.12,-1.55);}
 (mesh(new T.CylinderGeometry(.20,.24,.85,20),m.black,.53,3.48,-.3));(mesh(new T.CylinderGeometry(.25,.25,.09,20),m.rust,.53,3.9,-.3));mesh(new T.CylinderGeometry(.16,.16,.02,16),m.black,.53,3.95,-.3);
 // The wheel is visible through the front glazing; the life ring is mounted on the stern cabin wall.
 const wheel=mesh(new T.TorusGeometry(.20,.024,8,24),m.brass,-.47,2.01,-1.73);wheel.rotation.x=.3;for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(m.brass,[-.47,2.01,-1.72],[-.47+Math.cos(a)*.2,2.01+Math.sin(a)*.2,-1.72],.012);}
 (mesh(new T.TorusGeometry(.27,.075,10,28),m.orange,-.64,2.16,.79));for(let i=0;i<4;i++){const a=i*Math.PI/2;const band=mesh(new T.TorusGeometry(.27,.077,6,6,.25),m.white,-.64,2.16,.792);band.rotation.z=a;}
 box(m.wood,.68,1.27,1.79,.72,.45,.66);box(m.black,.68,1.505,1.79,.75,.025,.69);for(let k=0;k<4;k++){const co=mesh(new T.TorusGeometry(.22+k*.048,.024,6,32),m.rope,-.65,1.16+k*.009,2.13);co.rotation.x=Math.PI/2;}
 for(const side of [-1,1]){const pts=[];for(let i=0;i<=52;i++){const a=i/52*Math.PI*6;pts.push([side*.85+Math.cos(a)*.11,1.19+i/52*.06,2.7+Math.sin(a)*.065]);}tube(m.rope,pts,.014);}
 beam(m.wood,[-.85,3.12,-1.67],[-.85,4.35,-1.67],.035);const flagGeo=new T.PlaneGeometry(.5,.3,5,2);const flag=mesh(flagGeo,m.orange,-.59,4.19,-1.67);flag.material=m.orange.clone();flag.material.side=T.DoubleSide;
 (rounded(m.cream,0,.78,3.295,1.07,.25,.025,.02));const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#eee6c9';ctx.fillRect(0,0,256,64);ctx.fillStyle='#163e42';ctx.font='bold 27px sans-serif';ctx.textAlign='center';ctx.fillText('SALTWAKE',128,43);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;mesh(new T.PlaneGeometry(.99,.23),new T.MeshStandardMaterial({map:tx,roughness:.7}),0,.78,3.354);
 Saltwake.mergeStatic(group,new Set([flag]));group.userData.flag=flag;group.userData.flagBase=flag.geometry.attributes.position.array.slice();group.userData.stack=new T.Vector3(.53,3.98,-.3);return group;
}
Saltwake.mergeStatic=function(group,keep=new Set()){
 const batches=new Map();group.updateMatrixWorld(true);const source=[];group.traverse(o=>{if(o.isMesh&&!keep.has(o))source.push(o)});
 for(const mesh of source){let g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);const a=batches.get(mesh.material)||{p:[],n:[],uv:[]};a.p.push(...g.attributes.position.array);a.n.push(...g.attributes.normal.array);if(g.attributes.uv)a.uv.push(...g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)a.uv.push(0,0);batches.set(mesh.material,a);g.dispose();mesh.geometry.dispose();mesh.removeFromParent();}
 for(const [m,a] of batches){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;group.add(o);}
};
Saltwake.createMaterials=materials;Saltwake.createBoat=boat;
})();
