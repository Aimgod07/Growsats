import {GLTFLoader} from '../strikepoint/assets/gltf-loader.js';

const THREE=window.THREE;
export async function loadRunnerAssets(){
  const names=['superhero-cat','pine','hurdle','coupe','pickup','van'];
  const loader=new GLTFLoader();
  const assets=new Map(await Promise.all(names.map(async name=>[
    name,await loader.loadAsync(new URL('./assets/'+name+'.glb',import.meta.url).href)
  ])));
  function fit(name, target, rotation=0){
    const root=new THREE.Group(),model=assets.get(name).scene;
    root.add(model);model.rotation.y=rotation;
    root.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(root,true),size=bounds.getSize(new THREE.Vector3());
    const scale=Math.min(target[0]/size.x,target[1]/size.y,target[2]/size.z);
    const center=bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    model.scale.multiplyScalar(scale);
    model.traverse(obj=>{if(obj.isMesh){obj.castShadow=obj.receiveShadow=true;if(obj.isSkinnedMesh)obj.frustumCulled=false;}});
    return root;
  }
  const props=new Map([
    ['pine',fit('pine',[2.5,4.65,2.5])],['hurdle',fit('hurdle',[2.45,1.12,1.4])],
    ...['coupe','pickup','van'].map(name=>[name,fit(name,[2.05,2.55,4.7],Math.PI/2)])
  ]);

  const cat=fit('superhero-cat',[2,2.15,2],Math.PI);
  const mixer=new THREE.AnimationMixer(cat);
  const actions=new Map();
  for(const clip of assets.get('superhero-cat').animations){
    // The game controller owns lane and forward movement. Keep vertical hip motion from the clip.
    const hips=clip.tracks.find(track=>track.name.endsWith('Hips.position'));
    if(hips){for(let i=3;i<hips.values.length;i+=3){hips.values[i]=hips.values[0];hips.values[i+2]=hips.values[2];}}
    actions.set(clip.name,mixer.clipAction(clip));
  }
  const jump=actions.get('Jump_Run');
  jump.setLoop(THREE.LoopOnce,1);jump.clampWhenFinished=true;
  let current=null;
  function pose(state,dt,speed){
    const next=actions.get(state==='jump'?'Jump_Run':state==='crouch'?'Cautious_Crouch_Walk_Forward':'Running');
    if(next!==current){
      next.reset().setEffectiveWeight(1).play();
      if(current)current.crossFadeTo(next,.085,false);
      current=next;
    }
    current.timeScale=state==='jump'?jump.getClip().duration/(2*8.5/22):state==='run'?Math.min(1.35,speed/15):state==='ready'?0:1.3;
    mixer.update(dt);
    // The large head and ears must fit beneath the overhead bar throughout the crouch.
    cat.scale.y=THREE.MathUtils.damp(cat.scale.y,state==='crouch'?.65:1,24,dt);
  }
  function resetPose(){mixer.stopAllAction();current=null;cat.scale.y=1;pose('ready',0,15);}
  resetPose();
  return {cat,pose,resetPose,prop:name=>props.get(name).clone()};
}
