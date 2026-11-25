import { GLTFLoader } from './assets/gltf-loader.js';

const T = globalThis.THREE;
const loader = new GLTFLoader();
// Grip centers on each prop's side silhouette, measured from the front and top.
const profiles={
 rifle:{asset:'scoped',length:1.18,rear:[.73,.64],front:[.30,.46]},
 smg:{asset:'carbine',rollX:Math.PI/2,length:1.12,rear:[.65,.70],front:[.32,.55]},
 marksman:{asset:'marksman-new',rollX:-Math.PI/2,length:1.44,rear:[.77,.70],front:[.41,.53]},
 shotgun:{asset:'revolver',rollZ:1.105,length:.45,rear:[.87,.77],front:[.81,.83],compact:true},
 pistol:{asset:'pistol',length:.48,rear:[.88,.74],front:[.83,.81],compact:true},
};

export async function loadWeaponVisual(id, skin, flash, signal) {
 const profile=profiles[id];
 const url = new URL(`./assets/weapons/${profile.asset}.glb`, import.meta.url);
 const response = await fetch(url, { signal });
 if (!response.ok) throw new Error(`Weapon model request failed (${response.status})`);
 const { scene } = await loader.parseAsync(await response.arrayBuffer(), url.href);

 const root = new T.Group();
 root.name = `meshy-${id}`;
 const model = new T.Group();
 model.rotation.y = -Math.PI / 2;
 scene.rotation.x=profile.rollX||0;scene.rotation.z=profile.rollZ||0;
 model.add(scene);
 root.add(model);
 root.updateMatrixWorld(true);

 const bounds = new T.Box3().setFromObject(model, true);
 const length = bounds.max.z - bounds.min.z;
 if (!Number.isFinite(length) || length <= 0) throw new Error('Invalid weapon model bounds');
 const muzzle = new T.Box3();
 const vertex = new T.Vector3();
 const colored = new Set();
 model.traverse(object => {
  if (!object.isMesh) return;
  const positions = object.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
   vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
   if (vertex.z < bounds.min.z + length * .045) muzzle.expandByPoint(vertex);
  }
  for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
   if (!material.color || colored.has(material)) continue;
   colored.add(material);
   if (skin) material.color.lerp(new T.Color(skin.body), .48);
  }
 });
 const nose = muzzle.getCenter(new T.Vector3());
 const scale=profile.length/length;
 const tip=.14-profile.rear[0]*profile.length;
 model.scale.setScalar(scale);
 model.position.set(-nose.x*scale,.037-nose.y*scale,tip-bounds.min.z*scale);
 root.userData.flashZ=tip-.016;
 root.userData.sightHeight=model.position.y+bounds.max.y*scale+.012;
 root.userData.compact=!!profile.compact;
 root.userData.grips=[profile.rear,profile.front].map(([along,down],index)=>new T.Vector3(
   index===0?.038:profile.compact?-.042:-.012,
   model.position.y+(bounds.max.y-(bounds.max.y-bounds.min.y)*down)*scale,
   tip+profile.length*along));
 if(profile.compact){
  const primary=root.userData.grips[0];
  root.userData.grips[1].set(-.038,primary.y-.012,primary.z+.018);
 }
 root.userData.supportUnderbarrel=!profile.compact;
 if(root.userData.supportUnderbarrel){
  // Find the underside at the support palm, rather than using the overall
  // silhouette height (which includes the magazine and optic).
  root.updateMatrixWorld(true);
  const grip=root.userData.grips[1];
  const ray=new T.Raycaster();
  const underside=[];
  for(const x of [-.04,0,.04])for(const z of [-.04,0,.04]){
   ray.set(new T.Vector3(grip.x+x,-2,grip.z+z),new T.Vector3(0,1,0));
   const hit=ray.intersectObject(model,true)[0];
   if(hit)underside.push(hit.point.y);
  }
  if(underside.length)grip.y=Math.min(...underside);
 }
 return root;
}


