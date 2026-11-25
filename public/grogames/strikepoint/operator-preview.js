import { GLTFLoader } from './assets/gltf-loader.js';

const T = globalThis.THREE;
const loader = new GLTFLoader();

function aimBone(bone,child,target){
 const start=bone.getWorldPosition(new T.Vector3());
 const current=child.getWorldPosition(new T.Vector3()).sub(start).normalize();
 rotateBone(bone,current,target.clone().sub(start).normalize());
}

function rotateBone(bone,current,desired){
 const rotation=new T.Quaternion().setFromUnitVectors(current,desired);
 const world=bone.getWorldQuaternion(new T.Quaternion());
 const parentInverse=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
 bone.quaternion.copy(parentInverse.multiply(rotation).multiply(world));
 bone.updateWorldMatrix(false,true);
}

function handAxis(model,hand){
 const center=new T.Vector3(),vertex=new T.Vector3();
 const points=[];
 let count=0;
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const index=mesh.skeleton.bones.indexOf(hand);
  if(index===-1)return;
  const {skinIndex,skinWeight}=mesh.geometry.attributes;
  for(let i=0;i<skinIndex.count;i++){
   for(let j=0;j<4;j++){
    if(skinIndex.getComponent(i,j)!==index||skinWeight.getComponent(i,j)<.55)continue;
    const point=mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld).clone();
    center.add(point);
    points.push(hand.worldToLocal(point));
    count++;
    break;
   }
  }
 });
 const direction=count?hand.worldToLocal(center.divideScalar(count)).normalize():new T.Vector3(0,1,0);
 const mean=new T.Vector3();
 points.forEach(point=>mean.add(point));
 mean.divideScalar(Math.max(1,count));
 const covariance=new T.Matrix3().set(0,0,0,0,0,0,0,0,0);
 for(const point of points){
  const values=point.clone().sub(mean).toArray();
  for(let row=0;row<3;row++)for(let column=0;column<3;column++){
   covariance.elements[column*3+row]+=values[row]*values[column];
  }
 }
 // The shortest principal axis is perpendicular to the palm's broad surface.
 const inverse=covariance.invert();
 const normal=new T.Vector3(.37,.61,.71);
 for(let i=0;i<16;i++)normal.applyMatrix3(inverse).normalize();
 // Resolve the principal axis's sign in the original A pose: the palm
 // faces rearward in these Meshy rigs. Keep that anatomical side when posing;
 // choosing whichever sign is nearest to up can put the knuckles on top.
 const palmFacing=new T.Vector3(0,0,-1).applyQuaternion(model.getWorldQuaternion(new T.Quaternion()));
 if(normal.clone().applyQuaternion(hand.getWorldQuaternion(new T.Quaternion())).dot(palmFacing)<0)normal.negate();
 return {direction,normal};
}

function handTop(model,hand,weapon){
 // Refresh SkinnedMesh.bindMatrixInverse as well as the bones before sampling.
 model.updateMatrixWorld(true);
 let top=-Infinity;
 const vertex=new T.Vector3();
 const visual=weapon.children.find(child=>child.name.startsWith('meshy-'));
 const ray=new T.Raycaster();
 const up=new T.Vector3(0,1,0).transformDirection(weapon.matrixWorld);
 let contact=-Infinity,sample=0;
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const index=mesh.skeleton.bones.indexOf(hand);
  if(index===-1)return;
  const {skinIndex,skinWeight}=mesh.geometry.attributes;
  for(let i=0;i<skinIndex.count;i++)for(let j=0;j<4;j++){
   if(skinIndex.getComponent(i,j)!==index||skinWeight.getComponent(i,j)<.55)continue;
   mesh.getVertexPosition(i,vertex);
   weapon.worldToLocal(mesh.localToWorld(vertex));
   top=Math.max(top,vertex.y);
   // Use the actual surface above the glove, not a single fore-end height.
   // This also handles tapered barrels and palm points beside the gun.
   if(visual&&sample++%8===0){
    ray.set(weapon.localToWorld(new T.Vector3(vertex.x,-2,vertex.z)),up);
    const hit=ray.intersectObject(visual,true)[0];
    if(hit){
     const surface=weapon.worldToLocal(hit.point).y;
     contact=Math.max(contact,weapon.userData.grips[1].y+vertex.y-surface);
    }
   }
   break;
  }
 });
 return Number.isFinite(contact)?contact:top;
}

function placeHand(model,side,target,fingerDirection,axis){
 const upper=model.getObjectByName(side+'Arm');
 const forearm=model.getObjectByName(side+'ForeArm');
 const hand=model.getObjectByName(side+'Hand');
 if(!upper||!forearm||!hand)return;
 const shoulder=upper.getWorldPosition(new T.Vector3());
 const elbow=forearm.getWorldPosition(new T.Vector3());
 const upperLength=shoulder.distanceTo(elbow);
 const forearmLength=elbow.distanceTo(hand.getWorldPosition(new T.Vector3()));
 const direction=target.clone().sub(shoulder);
 const distance=T.MathUtils.clamp(direction.length(),Math.abs(upperLength-forearmLength)+.001,upperLength+forearmLength-.001);
 direction.normalize();
 const pole=new T.Vector3(side==='Left'?-.65:.65,-1,.15);
 pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const middle=(upperLength**2-forearmLength**2+distance**2)/(2*distance);
 elbow.copy(shoulder).addScaledVector(direction,middle).addScaledVector(pole,Math.sqrt(Math.max(0,upperLength**2-middle**2)));
 aimBone(upper,forearm,elbow);
 aimBone(forearm,hand,shoulder.addScaledVector(direction,distance));
 rotateBone(hand,axis.clone().applyQuaternion(hand.getWorldQuaternion(new T.Quaternion())),fingerDirection);
}

export async function loadOperatorPreview(id, signal) {
 const url = new URL(`./assets/operators/${id}.glb`, import.meta.url);
 const response = await fetch(url, { signal });
 if (!response.ok) throw new Error(`Operator model request failed (${response.status})`);
 const { scene } = await loader.parseAsync(await response.arrayBuffer(), url.href);

 const root = new T.Group();
 root.name = id;
 scene.updateMatrixWorld(true);
 const bounds = new T.Box3().setFromObject(scene, true);
 const center = bounds.getCenter(new T.Vector3());
 const height = bounds.max.y - bounds.min.y;
 if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid operator model bounds');
 const model = new T.Group();
 // glTF characters face +Z. Strikepoint actors face -Z.
 model.rotation.y = Math.PI;
 model.scale.setScalar(1.95 / height);
 scene.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
 model.add(scene);
 root.add(model);
 root.updateMatrixWorld(true);
 const sides=['Right','Left'];
 const axes=sides.map(side=>{
  const hand=model.getObjectByName(side+'Hand');
  return hand?handAxis(model,hand):null;
 });

 function equip(weapon){
  root.add(weapon);
  const offsets={nova:[.09,1.28],atlas:[.13,1.31],ember:[.10,1.27],onyx:[.14,1.32]};
  const [x,y]=offsets[id];
  const compact=weapon.userData.compact;
  weapon.position.set(compact?x*.6:x,y,compact?-.37:-.25);
  weapon.rotation.set(-.06,compact?.32:.66,compact?.015:.045);
  weapon.scale.setScalar(.73);
  root.updateMatrixWorld(true);
  const grips=weapon.userData.grips || [new T.Vector3(.045,-.16,.17),new T.Vector3(-.045,-.065,-.35)];
  for(const [index,side] of sides.entries()){
   if(!axes[index])continue;
   const palm=weapon.localToWorld(grips[index].clone());
   const underbarrel=index===1&&weapon.userData.supportUnderbarrel;
   const fingerDirection=new T.Vector3(index===0?-1:1,index===0?.12:underbarrel?.04:.26,underbarrel?.08:-.18)
    .applyQuaternion(weapon.getWorldQuaternion(new T.Quaternion())).normalize();
   const wrist=palm.clone().addScaledVector(fingerDirection,-.047);
   const pose=()=>{
   placeHand(model,side,wrist,fingerDirection,axes[index].direction);
   if(underbarrel){
    const hand=model.getObjectByName(side+'Hand');
    const world=hand.getWorldQuaternion(new T.Quaternion());
    const normal=axes[index].normal.clone().applyQuaternion(world);
    normal.addScaledVector(fingerDirection,-normal.dot(fingerDirection)).normalize();
    const up=new T.Vector3(0,1,0).applyQuaternion(weapon.getWorldQuaternion(new T.Quaternion()));
    up.addScaledVector(fingerDirection,-up.dot(fingerDirection)).normalize();
    const angle=Math.atan2(fingerDirection.dot(normal.clone().cross(up)),normal.dot(up));
    const roll=new T.Quaternion().setFromAxisAngle(fingerDirection,angle);
    const parentInverse=hand.parent.getWorldQuaternion(new T.Quaternion()).invert();
    hand.quaternion.copy(parentInverse.multiply(roll).multiply(world));
    hand.updateWorldMatrix(false,true);
   }
   };
   pose();
   if(underbarrel){
    // Seat the TOP of the hand below the sampled gun surface. A palm-center
    // target alone embeds half the glove in the fore-end, especially on the
    // thicker armored operators.
    const hand=model.getObjectByName(side+'Hand');
    for(let pass=0;pass<32;pass++){
     const top=handTop(model,hand,weapon);
     const correction=top-grips[index].y+.0005;
     if(!Number.isFinite(correction)||Math.abs(correction)<.0002)break;
     const shift=weapon.localToWorld(new T.Vector3(0,-correction,0))
      .sub(weapon.localToWorld(new T.Vector3()));
     wrist.add(shift);
     pose();
    }
   }
  }
 }
 return { root,equip };
}



