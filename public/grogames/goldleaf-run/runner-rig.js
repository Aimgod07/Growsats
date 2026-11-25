// The Meshy runner faces local +Z. A positive knee rotation folds the shin towards -Z.
export function rigRunner(mesh) {
  const T = window.THREE;
  const geometry = mesh.geometry.clone();
  const rider = new T.SkinnedMesh(geometry, mesh.material);
  rider.castShadow = rider.receiveShadow = true;
  const bones = [], branches = [];
  function joint(parent, x, y, z) {
    const bone = new T.Bone();
    bone.position.set(x, y, z);
    parent.add(bone);
    bones.push(bone);
    return bone;
  }
  const root = joint(rider, 0, 0, 0);
  const spine = joint(root, 0, .015, 0);
  const head = joint(spine, 0, .65, 0);
  for (const side of [-1, 1]) {
    const thigh = joint(root, side * .127, -.035, -.015);
    const shin = joint(thigh, 0, -.408, .013);
    const foot = joint(shin, 0, -.368, -.052);
    const arm = joint(spine, side * .23, .36, 0);
    const forearm = joint(arm, side * .118, -.239, -.014);
    branches.push({thigh, shin, foot, arm, forearm});
  }
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const point = new T.Vector3(), normal = new T.Vector3();
  const forward = new T.Vector3(0,0,1), up = new T.Vector3(0,1,0);
  const hipPivot = new T.Vector3(), anklePivot = new T.Vector3();
  const ids = [], weights = [];
  const smooth = T.MathUtils.smoothstep;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    const limb = branches[Number(x >= 0)];
    const armEdge = .32 - .105 * smooth(y, -.08, .42);
    const arm = smooth(Math.abs(x), armEdge - .018, armEdge + .026)
      * smooth(y, -.21, -.145) * (1 - smooth(y, .38, .5));
    const leg = (1 - arm) * (1 - smooth(y, -.145, .055));
    // Bring the sculpt's wide stance and outward-facing shoes onto parallel tracks
    // before skinning. Rotating only the knee leaves the original sideways offset.
    const side = x < 0 ? -1 : 1;
    const roll = -side * .114 * leg;
    const toeYaw = -side * .28 * leg * (1-smooth(y,-.86,-.72));
    hipPivot.set(side*.127,-.035,-.015);
    anklePivot.set(side*.215,-.805,-.054);
    point.fromBufferAttribute(positions,i).sub(anklePivot).applyAxisAngle(up,toeYaw)
      .add(anklePivot).sub(hipPivot).applyAxisAngle(forward,roll).add(hipPivot);
    const shoeScale=1-.14*(1-smooth(y,-.88,-.77));
    point.x=side*.127+(point.x-side*.127)*shoeScale;
    point.z=-.054+(point.z+.054)*shoeScale;
    positions.setXYZ(i,point.x,point.y,point.z);
    normal.fromBufferAttribute(normals,i).applyAxisAngle(up,toeYaw).applyAxisAngle(forward,roll);
    normals.setXYZ(i,normal.x,normal.y,normal.z);
    const knee = 1 - smooth(y, -.51, -.365);
    const ankle = 1 - smooth(y, -.855, -.755);
    const elbow = 1 - smooth(y, .07, .19);
    const torso = 1 - arm - leg;
    const upper = smooth(y, .005, .20);
    const headWeight=smooth(y,.63,.71);
    const influences = [[root,torso*(1-upper)],[spine,torso*upper*(1-headWeight)],[head,torso*upper*headWeight],
      [limb.arm,arm*(1-elbow)],[limb.forearm,arm*elbow],
      [limb.thigh,leg*(1-knee)],[limb.shin,leg*knee*(1-ankle)],[limb.foot,leg*knee*ankle]]
      .sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total = influences.reduce((sum,part)=>sum+part[1],0);
    for(const [bone,weight] of influences){ids.push(bones.indexOf(bone));weights.push(weight/total);}
  }
  rider.geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));
  rider.geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  rider.bind(new T.Skeleton(bones));
  rider.frustumCulled=false;

  // Contact, loading, toe-off, heel recovery, knee drive, extension.
  // Each row specifies hip, relative knee flexion, and shoe pitch in world space (degrees).
  const keys=[[-34,18,-8],[-15,34,0],[5,29,0],[27,32,21],[32,70,45],
    [18,105,60],[-10,104,40],[-39,80,17],[-49,47,-4],[-43,24,-12]];
  const rad=T.MathUtils.degToRad;
  const sole=new T.Vector3();
  function strideAngle(phase,column){
    const t=phase*keys.length, i=Math.floor(t), f=t-i, n=keys.length;
    const a=keys[(i+n-1)%n][column],b=keys[i%n][column],c=keys[(i+1)%n][column],d=keys[(i+2)%n][column];
    return rad(.5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f));
  }
  function animate(cycle, air, effort, skating=false){
    const phase=cycle-Math.floor(cycle);
    branches.forEach((limb,i)=>{limb.thigh.position.x=(i?1:-1)*(skating?.22:.127);});
    let lowest=Infinity;
    for(const [i,limb] of branches.entries()){
      const t=(phase+i*.5)%1;
      const hip=T.MathUtils.lerp(strideAngle(t,0),rad(-33+20*i),air)*effort;
      const knee=T.MathUtils.lerp(strideAngle(t,1),rad(67+15*i),air)*effort;
      limb.thigh.rotation.x=hip;
      limb.shin.rotation.x=knee;
      limb.foot.rotation.x=(strideAngle(t,2)*effort-hip-knee)*(.80-.35*air);
      // The opposite arm leads. Let the elbow follow the shoulder slightly later.
      const swing=Math.cos(2*Math.PI*(t+.04));
      const elbowBeat=Math.cos(2*Math.PI*(t-.025));
      const armDrive=effort*(1-.55*air);
      limb.arm.rotation.order='YXZ';
      limb.arm.rotation.x=rad(-4+31*swing)*armDrive;
      limb.arm.rotation.z=(i===0?1:-1)*.20*effort;
      limb.forearm.rotation.x=rad(-48+17*elbowBeat)*effort;
    }
    spine.rotation.set(.105*effort,.045*Math.sin(phase*2*Math.PI)*effort,0);
    head.rotation.set(0,0,0);
    if(skating){
      for(const [i,limb] of branches.entries()){
        limb.thigh.rotation.set(rad(-12-48*air),0,0);
        limb.shin.rotation.set(rad(24+65*air),0,0);
        limb.foot.rotation.x=-limb.thigh.rotation.x-limb.shin.rotation.x;
        limb.arm.rotation.set(rad(-12-12*air),0,(i? -1:1)*.23);
        limb.forearm.rotation.x=rad(-24);
      }
      spine.rotation.set(.18+.22*air,0,0);
      head.rotation.set(-.18-.22*air,Math.PI/2,0,'YXZ');
    }
    // Anchor the lowest heel or toe, allowing the pelvis to rise naturally over the stance leg.
    for(const {foot} of branches){
      foot.updateWorldMatrix(true,false);
      for(const z of [-.085,.225]){
        sole.set(0,-.14,z);foot.localToWorld(sole);rider.worldToLocal(sole);lowest=Math.min(lowest,sole.y);
      }
    }
    return -lowest;
  }
  return {rider,animate};
}

