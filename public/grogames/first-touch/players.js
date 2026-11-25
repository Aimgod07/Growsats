import {GLTFLoader} from '../strikepoint/assets/gltf-loader.js';

const T=window.THREE;
const smooth=T.MathUtils.smoothstep;
const mix=T.MathUtils.lerp;
const v=(x,y,z)=>new T.Vector3(x,y,z);
const rad=T.MathUtils.degToRad;

// Shoulder and elbow pivots are fitted to each straight-arm mesh.
const armGuides={
 white:[ [[-.19,.39,-.10],[-.27,.06,-.14]], [[.22,.39,-.04],[.29,.06,0]] ],
 green:[ [[-.19,.40,-.11],[-.27,.065,-.16]], [[.20,.40,-.05],[.27,.065,-.01]] ],
 brazil:[ [[-.18,.19,-.13],[-.25,-.11,-.17]], [[.19,.19,-.07],[.25,-.11,-.028]] ]
};

function rig(mesh,kit){
 const geo=mesh.geometry,positions=geo.attributes.position;
 const body=new T.SkinnedMesh(geo,mesh.material);
 body.castShadow=body.receiveShadow=true;body.frustumCulled=false;
 const bones=[];
 function joint(parent,point,origin){
  const bone=new T.Bone();bone.position.fromArray(point);
  if(origin)bone.position.sub(origin);
  parent.add(bone);bones.push(bone);return bone;
 }
 const pelvis=joint(body,[0,0,0]),chest=joint(pelvis,[0,-.09,0]);
 const legs=[],arms=[];
 const armWeights=geo.getAttribute('_arm_weight');
 for(const [i,side] of [-1,1].entries()){
  const hipAt=v(side*.116,-.18,-.014),kneeAt=v(side*.132,-.514,.006),ankleAt=v(side*.15,-.833,-.039);
  const hip=joint(pelvis,hipAt.toArray()),knee=joint(hip,kneeAt.toArray(),hipAt),ankle=joint(knee,ankleAt.toArray(),kneeAt);
  legs.push({hip,knee,ankle,ankleAt});
  const [a,b]=armGuides[kit][i].map(p=>v(...p));
  const shoulder=joint(chest,a.toArray(),chest.position),elbow=joint(shoulder,b.toArray(),a);
  arms.push({shoulder,elbow,elbowHeight:b.y});
 }
 const index=[],weights=[],probe=v(),near=v(),bootTip=v(),sole=[Infinity,Infinity];let toeZ=-Infinity;
 for(let i=0;i<positions.count;i++){
  probe.fromBufferAttribute(positions,i);
  const {x,y,z}=probe,side=Number(x>=0),leg=legs[side];
  if(y<-.79){sole[side]=Math.min(sole[side],y);if(!side&&z>toeZ){toeZ=z;bootTip.copy(probe);}}
  const influence=[];
  function add(b,w){if(w>0)influence.push([bones.indexOf(b),w]);}
  // Mesh connectivity separates the sleeves from the shirt and keeps each hand rigid.
  const arm=arms[side];
  // Keep the free arm rigid below the sleeve. Residual torso influence
  // stretches the forearm when the shoulder rises above the head.
  const authoredWeight=armWeights.getX(i);
  const armWeight=smooth(authoredWeight,.08,.72);
  const bend=1-smooth(y,arm.elbowHeight-.055,arm.elbowHeight+.055);
  add(arm.shoulder,armWeight*(1-bend));add(arm.elbow,armWeight*bend);
  const legWeight=(1-armWeight)*(1-smooth(y,-.265,-.12));
  const shin=1-smooth(y,-.575,-.45),shoe=1-smooth(y,-.864,-.795);
  add(leg.hip,legWeight*(1-shin));add(leg.knee,legWeight*shin*(1-shoe));add(leg.ankle,legWeight*shin*shoe);
  const trunk=1-armWeight-legWeight,spine=smooth(y,-.17,.10);
  add(pelvis,trunk*(1-spine));add(chest,trunk*spine);
  influence.sort((a,b)=>b[1]-a[1]);influence.length=Math.min(4,influence.length);
  const total=influence.reduce((sum,p)=>sum+p[1],0);
  for(let n=0;n<4;n++){index.push(influence[n]?.[0]??0);weights.push((influence[n]?.[1]??0)/total);}
 }
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(index,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 body.bind(new T.Skeleton(bones));
 // This small rig fits in vertex uniforms, including on mobile WebGL renderers.
 body.skeleton.computeBoneTexture();
 function useJointUniforms(shader){
  shader.uniforms.jointTransforms={value:body.skeleton.boneMatrices.subarray(0,bones.length*16)};
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_pars_vertex>',`
   uniform mat4 bindMatrix;
   uniform mat4 bindMatrixInverse;
   uniform mat4 jointTransforms[${bones.length}];
   mat4 getBoneMatrix(float i){return jointTransforms[int(i)];}
  `);
 }
 body.material.onBeforeCompile=useJointUniforms;
 body.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
 body.customDepthMaterial.onBeforeCompile=useJointUniforms;
 const root=new T.Group();root.name='football-'+kit;root.add(body);body.rotation.y=Math.PI;
 const floor=-Math.min(...sole);
 const [swing,plant]=legs;
 const boot=bootTip.clone().sub(swing.ankleAt);
 function legPose(leg,h,k,f){leg.hip.rotation.x=rad(h);leg.knee.rotation.x=rad(k);leg.ankle.rotation.x=rad(f-h-k);}
 function armPose(a,b,spread,bendA=0,bendB=bendA){
  arms.forEach(({shoulder,elbow},i)=>{shoulder.rotation.set(rad(i?b:a),0,rad((i?1:-1)*spread));elbow.rotation.x=-rad(i?bendB:bendA);});
 }
 function base(){
  body.position.set(0,floor,0);body.rotation.set(0,Math.PI,0);chest.rotation.set(0,0,0);
  for(const l of legs)legPose(l,0,0,0);armPose(0,0,0);
 }
 // Seconds from release. The simulation launches the ball at contactTime.
 const contactTime=window.Football.contactTime;
 const frames=[
  [0,0,0,0,0,0,0],[.13,-25,30,-6,24,38,8],[.28,18,48,19,-27,31,-8],
  [.42,29,79,46,-9,16,0],[.52,34,99,58,-9,16,0],
  [contactTime,-27,15,17,-9,16,0],[contactTime+.14,-59,12,-8,-9,16,0],
  [contactTime+.32,-35,42,4,-9,16,0],[contactTime+.58,0,0,0,0,0,0]
 ];
 function anglesAt(t){
  let k=0;while(k<frames.length-2&&t>frames[k+1][0])k++;
  const a=frames[k],b=frames[k+1],u=T.MathUtils.clamp((t-a[0])/(b[0]-a[0]),0,1);
  // Hermite interpolation preserves velocity across the instant of contact.
  return a.slice(1).map((value,j)=>{
   j++;const prev=frames[Math.max(0,k-1)],next=frames[Math.min(frames.length-1,k+2)];
   const slope=(l,c,r)=>{const d1=c[j]-l[j],d2=r[j]-c[j];return d1*d2>0?(r[j]-l[j])/(r[0]-l[0]):0;};
   const d=b[0]-a[0];return mix(value,b[j],u*u*(3-2*u))+d*u*(1-u)*((1-u)*slope(prev,a,b)-u*slope(a,b,next));
  });
 }
 function kick(t){
  base();const [h,k,f,ph,pk,pf]=anglesAt(t);legPose(swing,h,k,f);legPose(plant,ph,pk,pf);
  const wind=smooth(t,.25,.49),strike=smooth(t,.50,.76),settle=1-smooth(t,.84,1.22);
  chest.rotation.set(.095*wind*settle,(.23*wind-.44*strike)*settle,-.09*wind*settle);
  // Shoulders counter the thighs on the approach, then open for balance at contact.
  const running=1-smooth(t,.30,.48);
  const drive=(ph-h)*.58*running;
  const right=drive+(20*wind-38*strike)*settle;
  const left=-drive+(-18*wind+35*strike)*settle;
  const flex=20*smooth(t,0,.10)*settle;
  armPose(right,left,3+18*wind*settle,flex+Math.max(0,-right)*.36,flex+Math.max(0,-left)*.36);
  // Pin the standing ankle to its bind-pose location through the striking phase.
  const a=plant.ankle;body.updateMatrixWorld(true);
  const anchor=body.worldToLocal(a.getWorldPosition(near));
  const amount=smooth(t,.28,.42)*(1-smooth(t,.96,1.22));
  body.position.y+=(plant.ankleAt.y-anchor.y)*amount;
  body.position.z+=(anchor.z-plant.ankleAt.z)*amount;
 }
 kick(contactTime);body.updateMatrixWorld(true);
 const contact=swing.ankle.localToWorld(boot.clone());
 // Ball surface nearest the arriving boot, accounting for the boot's actual height.
 const radius=.11,back=Math.sqrt(Math.max(0,radius*radius-(contact.y-radius)**2));
 const placement=v(-contact.x,0,back-contact.z);
 function pose(state,t,amount=0){
  if(state==='kick'){kick(t);return;}
  base();
  if(state==='keeper'||state==='dive'){
   const dive=state==='dive'?amount:0;
   legPose(swing,-14,31,3);legPose(plant,-14,31,3);armPose(-18,-18,18+Math.abs(dive)*48,18);
   body.rotation.z=-dive*1.10;body.position.y-=.026;chest.rotation.x=.12;
  }else if(state==='celebrate'){armPose(-4,-4,132,18);}
  else if(state==='goal-keeper'){armPose(0,0,3);}
  else chest.rotation.x=.012*Math.sin(t*2);
 }
 pose('idle',0);
 return {root,pose,placement};
}
export async function loadAthletes(){
 const loader=new GLTFLoader();
 return Promise.all(['white','green','brazil'].map(async kit=>{
  const {scene}=await loader.loadAsync(new URL('./assets/'+kit+'.glb?v=straight-arms',import.meta.url).href);
  const mesh=scene.getObjectByProperty('isMesh',true);
  return rig(mesh,kit);
 }));
}
