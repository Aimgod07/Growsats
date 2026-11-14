/* Original procedural PBR maps, generated locally and shared per renderer. */
(() => {
 const libraries=new WeakMap();
 globalThis.GroMaterials={
  prepare(T,root){root.traverse(mesh=>{
   const g=mesh.geometry;if(!mesh.isMesh||!g||!mesh.material?.bumpMap||g.getAttribute('uv'))return;
   const p=g.getAttribute('position'),uv=[];g.computeBoundingBox();const lo=g.boundingBox.min,hi=g.boundingBox.max;
   for(let i=0;i<p.count;i++)uv.push(.5+Math.atan2(p.getZ(i),p.getX(i))/ (Math.PI*2),(p.getY(i)-lo.y)/Math.max(.001,hi.y-lo.y));
   g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  });},
  make(T,color,kind='fabric') {
   let library=libraries.get(T);if(!library){library=new Map();libraries.set(T,library);}
   const presets={skin:{roughness:.54,metalness:0,bumpScale:.0008,clearcoat:.06,clearcoatRoughness:.6},fabric:{roughness:.9,metalness:0,bumpScale:.0018,sheen:.35,sheenRoughness:.85},metal:{roughness:.3,metalness:.85,bumpScale:.0005,clearcoat:.18,clearcoatRoughness:.24},rubber:{roughness:.82,metalness:0,bumpScale:.001},leather:{roughness:.57,metalness:0,bumpScale:.0012,clearcoat:.12,clearcoatRoughness:.5},hair:{roughness:.8,metalness:0,bumpScale:.0006}};
   if(!presets[kind])kind='fabric';
   if(!library.has(kind)){
    const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const c=canvas.getContext('2d'),pixels=c.createImageData(size,size);let seed=197;
    const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
     const noise=random()-.5;
     const weave=Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2);
     const value=Math.round(kind==='fabric'?128+weave*28+noise*8:kind==='metal'?150+Math.sin(y*3)*7+noise*4:kind==='hair'?125+Math.sin(x*2)*22+noise*5:kind==='skin'?160+noise*22:145+noise*35);
     const i=(y*size+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
    }
    c.putImageData(pixels,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(kind==='skin'?3:5,kind==='skin'?3:5);texture.anisotropy=2;
    const roughCanvas=document.createElement('canvas');roughCanvas.width=roughCanvas.height=size;const rc=roughCanvas.getContext('2d');
    for(let i=0;i<pixels.data.length;i+=4){const value=235+Math.round((pixels.data[i]-128)*.12);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;}
    rc.putImageData(pixels,0,0);const roughness=new T.CanvasTexture(roughCanvas);roughness.wrapS=roughness.wrapT=T.RepeatWrapping;roughness.repeat.copy(texture.repeat);roughness.anisotropy=2;
    library.set(kind,{bump:texture,roughness});
   }
   const Material=T.MeshPhysicalMaterial||T.MeshStandardMaterial;
   const material=new Material({color,...presets[kind],bumpMap:library.get(kind).bump,roughnessMap:library.get(kind).roughness,flatShading:false});
   material.name='Gro '+kind;return material;
  }
 };
})();
