import {GLTFLoader} from '../strikepoint/assets/gltf-loader.js';
const T=window.THREE;
async function loadPlane(){
 const {scene:model}=await new GLTFLoader().loadAsync('airplane.glb');
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(384,288);renderer.setClearColor(0,0);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x728195,2));
 const sun=new T.DirectionalLight(0xfff2df,3);sun.position.set(2,4,5);scene.add(sun);
 // Show the nose to the right with both wings visible.
 model.rotation.y=Math.PI;
 const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
 model.position.sub(center);scene.add(model);
 const camera=new T.OrthographicCamera(-1,1,.75,-.75,.1,20);
 camera.position.set(0,.75,5);camera.lookAt(0,0,0);
 renderer.render(scene,camera);
 window.cloudPlane=renderer.domElement;
}
loadPlane().catch(console.error);


