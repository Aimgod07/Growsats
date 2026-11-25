import {GLTFLoader} from './assets/gltf-loader.js';
const T=window.THREE;
const assets=new Map();
export async function prepareScenery(){
 const loader=new GLTFLoader();
 await Promise.all(['crate','pine'].map(async name=>{
  const {scene}=await loader.loadAsync(new URL('./assets/props/'+name+'.glb',import.meta.url).href);
  scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(scene,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const unit=new T.Matrix4().makeScale(1/size.x,1/size.y,1/size.z)
   .multiply(new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  const parts=[];
  scene.traverse(o=>{if(o.isMesh)parts.push({geometry:o.geometry,material:o.material,matrix:unit.clone().multiply(o.matrixWorld)});});
  assets.set(name,parts);
 }));
}
export function addScenery(scene,placements){
 for(const [name,transforms] of Object.entries(placements)){
  if(!transforms.length)continue;
  for(const part of assets.get(name)){
   const batch=new T.InstancedMesh(part.geometry,part.material,transforms.length);
   batch.name='imported-'+name;batch.userData.sharedArenaProp=true;
   transforms.forEach(([x,y,z,w,h,d],i)=>{
    const matrix=new T.Matrix4().makeScale(w,h,d);matrix.setPosition(x,y,z);
    batch.setMatrixAt(i,matrix.multiply(part.matrix));
   });
   batch.castShadow=batch.receiveShadow=true;scene.add(batch);
  }
 }
}
