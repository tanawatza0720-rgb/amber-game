/* ================= โมเดลคาเซะคิริจาก Meshy (มีโครงกระดูก Mixamo) ================= */
let MESHY=null, USE_MESHY=true, MXA=null;
const MESHY_URL='kzr/kazekiri_rig.json', MXA_URL='kzr/kazekiri_anims.json';
function loadMeshy(onProgress){
  const anims=fetch(MXA_URL).then(r=>r.ok?r.json():null).then(j=>{MXA=j;}).catch(()=>{});
  return new Promise(res=>{
    if(!THREE.GLTFLoader||!THREE.SkeletonUtils){res(null);return;}
    new THREE.GLTFLoader().load(MESHY_URL,g=>{MESHY=g;anims.then(()=>res(g));},x=>{if(onProgress&&x.total)onProgress(x.loaded/x.total);},()=>res(null));
  });
}
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_m1=new THREE.Matrix4();
function buildMeshyEvo(m){
  const root=THREE.SkeletonUtils.clone(MESHY.scene);
  m.add(root);
  const bone=n=>{let f=null;root.traverse(o=>{if(!f&&o.isBone&&o.name.replace(/[^A-Za-z0-9]/g,'').endsWith(n))f=o;});return f;};
  const B={hips:bone('Hips'),spine:bone('Spine'),spine1:bone('Spine1'),spine2:bone('Spine2'),neck:bone('Neck'),head:bone('Head'),
    rArm:bone('RightArm'),rFore:bone('RightForeArm'),rHand:bone('RightHand'),lArm:bone('LeftArm'),lFore:bone('LeftForeArm'),lHand:bone('LeftHand'),
    rUp:bone('RightUpLeg'),rLeg:bone('RightLeg'),rFoot:bone('RightFoot'),lUp:bone('LeftUpLeg'),lLeg:bone('LeftLeg'),lFoot:bone('LeftFoot')};
  // ปรับขนาดให้สะโพกสูง .9 เท่ากับแบบเดิม
  root.updateMatrixWorld(true);
  const mInv=new THREE.Matrix4().copy(m.matrixWorld).invert();
  const posM=b=>b.getWorldPosition(new THREE.Vector3()).applyMatrix4(mInv);
  const k=.9/posM(B.hips).y; root.scale.multiplyScalar(k); root.updateMatrixWorld(true);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
    o.material=o.material.clone();if(ENV){o.material.envMap=ENV;o.material.envMapIntensity=.55;}
    if(o.material.emissive)o.material.emissive.set(0x000000);}});
  // ค่าท่ายืนเริ่มต้น (m-space)
  const mQ=m.getWorldQuaternion(new THREE.Quaternion()), mQi=mQ.clone().invert();
  const wq=b=>mQi.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  const all=[];root.traverse(o=>{if(o.isBone)all.push(o);});
  all.forEach(b=>{b.userData.rq=b.quaternion.clone();b.userData.rp=b.position.clone();b.userData.W=wq(b);});
  // ระบบท่าจาก Mixamo (retarget แบบจับทิศกระดูก)
  let CS=null;
  if(MXA){
    const OCH={Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head',Head:'HeadTopEnd',RightShoulder:'RightArm',RightArm:'RightForeArm',RightForeArm:'RightHand',RightHand:'RightHandMiddle4',LeftShoulder:'LeftArm',LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',LeftHand:'LeftHandMiddle4',RightUpLeg:'RightLeg',RightLeg:'RightFoot',RightFoot:'RightToeBase',RightToeBase:'RightToeEnd',LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',LeftFoot:'LeftToeBase',LeftToeBase:'LeftToeEnd'};
    const CB=MXA.bones.map(n=>bone(n));
    const Qal=MXA.bones.map((n,i)=>{const b=CB[i],c=bone(OCH[n]);if(!b||!c)return new THREE.Quaternion();const d=posM(c).sub(posM(b)).normalize();const a=new THREE.Vector3(...MXA.restDir[n]).normalize();return new THREE.Quaternion().setFromUnitVectors(d,a);});
    const idx=new Map();CB.forEach((b,i)=>{if(b)idx.set(b,i);});
    CS={CB,Qal,idx,cur:null,prev:null,fade:1,fadeDur:.12,w:0,wT:0,hipsRest:posM(B.hips),hs:.9/MXA.hipsY,lastT:null};
  }
  // ตัวแก้แขนให้ท่าตั้งต้นเป็นแขนห้อยตรง
  const straight=(a,f)=>{const d=posM(f).sub(posM(a)).normalize();return new THREE.Quaternion().setFromUnitVectors(d,new THREE.Vector3(0,-1,0));};
  const qcR=straight(B.rArm,B.rFore), qcL=straight(B.lArm,B.lFore);
  const qcRL=straight(B.rUp,B.rLeg), qcLL=straight(B.lUp,B.lLeg);
  // โครงเสมือนตามตำแหน่งกระดูกจริง
  const hipsP=posM(B.hips);
  const hips=J(m,hipsP.x,hipsP.y,hipsP.z);
  const rel=(p,parentPos)=>p.clone().sub(parentPos);
  const sp1=posM(B.spine1), torso=J(hips,...rel(sp1,hipsP).toArray());
  const hdP=posM(B.head), head=J(torso,...rel(hdP,sp1).toArray());
  const mkArm=(a,f,h,qc)=>{const ap=posM(a),fp=posM(f),hp=posM(h);
    const sh=J(torso,...rel(ap,sp1).toArray());
    const fo=fp.clone().sub(ap).applyQuaternion(qc), ho=hp.clone().sub(fp).applyQuaternion(qc);
    const el=J(sh,fo.x,fo.y,fo.z), hd=J(el,ho.x,ho.y,ho.z); return {sh,el,hd,cord:new THREE.Object3D()};};
  const R=mkArm(B.rArm,B.rFore,B.rHand,qcR), L=mkArm(B.lArm,B.lFore,B.lHand,qcL);
  const mkLeg=(u,l,f,qc)=>{const up=posM(u),lp=posM(l),fp=posM(f);
    const th=J(hips,...rel(up,hipsP).toArray());
    const ko=lp.clone().sub(up).applyQuaternion(qc), fo=fp.clone().sub(lp).applyQuaternion(qc);
    const kn=J(th,ko.x,ko.y,ko.z), ft=J(kn,fo.x,fo.y,fo.z); return {th,kn,ft};};
  const legs=[mkLeg(B.rUp,B.rLeg,B.rFoot,qcRL),mkLeg(B.lUp,B.lLeg,B.lFoot,qcLL)];
  const arms=[R,L];
  // ความสูงข้อเท้าตอนยืนปกติ ใช้ล็อกเท้าให้ติดพื้น
  const _fp=new THREE.Vector3(), mInvNow=new THREE.Matrix4();
  const ankleY=()=>{hips.updateMatrixWorld(true);mInvNow.copy(m.matrixWorld).invert();let y=1e9;legs.forEach(l=>{_fp.setFromMatrixPosition(l.ft.matrixWorld).applyMatrix4(mInvNow);y=Math.min(y,_fp.y);});return y;};
  const restAnkle=ankleY();
  // จับคู่กระดูก → โครงเสมือน (acc = ตัวแก้ท่าตั้งต้น)
  const MAP=new Map([[B.hips,[hips]],[B.spine1,[torso]],[B.head,[head]],
    [B.rArm,[R.sh,qcR]],[B.rFore,[R.el,qcR]],[B.rHand,[R.hd,qcR]],[B.lArm,[L.sh,qcL]],[B.lFore,[L.el,qcL]],[B.lHand,[L.hd,qcL]],
    [B.rUp,[legs[0].th,qcRL]],[B.rLeg,[legs[0].kn,qcRL]],[B.rFoot,[legs[0].ft,qcRL]],[B.lUp,[legs[1].th,qcLL]],[B.lLeg,[legs[1].kn,qcLL]],[B.lFoot,[legs[1].ft,qcLL]]]);
  // ตำแหน่งสะโพก: แปลง m-space → local ของพ่อกระดูกสะโพก
  const hipParentInv=new THREE.Matrix4().copy(mInv).multiply(B.hips.parent.matrixWorld).invert();
  const hipsParentWQ=wq(B.hips.parent);
  const pq=new THREE.Quaternion();
  let breath=0;
  const proxyWQ=(p,out)=>{out.identity();let o=p;const chain=[];while(o&&o!==m){chain.push(o);o=o.parent;}for(let i=chain.length-1;i>=0;i--)out.multiply(chain[i].quaternion);return out;};
  const worldOf=new Map();
  function retarget(){
    // ตำแหน่งสะโพก
    const cw=CS?CS.w:0;
    const w=m.parent, grounded=(!w||w.position.y<.05)&&Math.abs(m.rotation.x)<.01&&cw<.5;
    let off=0;
    if(grounded){
      hips.updateMatrixWorld(true); mInvNow.copy(m.matrixWorld).invert();
      const ays=legs.map(l=>_fp.setFromMatrixPosition(l.ft.matrixWorld).applyMatrix4(mInvNow).y);
      off=restAnkle-Math.max(...ays); const tgt=restAnkle-off;
      // IK ง่าย ๆ: งอเข่าขาที่จมให้เท้าวางบนพื้นพอดี
      legs.forEach((l,li)=>{const ay=()=>{l.th.updateMatrixWorld(true);return _fp.setFromMatrixPosition(l.ft.matrixWorld).applyMatrix4(mInvNow).y;};
        if(Math.abs(ays[li]-tgt)<.006)return; let lo=Math.max(0,-l.th.rotation.x),hi=2.6;
        for(let i=0;i<12;i++){const mid=(lo+hi)/2;l.kn.rotation.x=mid;if(ay()>tgt)hi=mid;else lo=mid;}
        l.kn.rotation.x=(lo+hi)/2; l.ft.rotation.x=-(l.th.rotation.x+l.kn.rotation.x);});
    }
    _v1.copy(hips.position); _v1.y+=off;
    if(cw>0){const c=CS.cur,hp=MXA.clips[c.name].hp,n=MXA.clips[c.name].n;const f=Math.min(n-1,c.t*30),i0=Math.floor(f),i1=Math.min(n-1,i0+1),fr=f-i0;
      const hx=hp[i0*3]+(hp[i1*3]-hp[i0*3])*fr, hy=hp[i0*3+1]+(hp[i1*3+1]-hp[i0*3+1])*fr, hz=hp[i0*3+2]+(hp[i1*3+2]-hp[i0*3+2])*fr;
      const zk=c.name==='death'?1:0;
      _v2.set(CS.hipsRest.x+hx*CS.hs*(c.name==='death'?1:0),CS.hipsRest.y+hy*CS.hs,CS.hipsRest.z+hz*CS.hs*zk); _v1.lerp(_v2,cw);}
    _v1.applyMatrix4(hipParentInv); B.hips.position.copy(_v1);
    worldOf.clear();
    const visit=(b,parentW)=>{
      const mp=MAP.get(b); let W;
      if(mp){proxyWQ(mp[0],pq); W=pq.clone(); if(mp[1])W.multiply(mp[1]); W.multiply(b.userData.W);}
      else{W=parentW.clone().multiply(b.userData.rq); if(b===B.spine2&&breath)W.multiply(_q2.setFromAxisAngle(_v2.set(1,0,0),breath));}
      if(cw>0&&CS.idx.has(b)){const Wc=clipW(CS.idx.get(b),b);W.slerp(Wc,cw);}
      b.quaternion.copy(_q1.copy(parentW).invert().multiply(W));
      b.children.forEach(c=>{if(c.isBone)visit(c,W);});
    };
    visit(B.hips,hipsParentWQ);
  }
  const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion();
  const sampleD=(c,bi,out)=>{const cl=MXA.clips[c.name],q=cl.q,nb=MXA.bones.length,n=cl.n;const f=Math.min(n-1,Math.max(0,c.t*30)),i0=Math.floor(f),i1=Math.min(n-1,i0+1),fr=f-i0;
    const a=(i0*nb+bi)*4,b=(i1*nb+bi)*4; _qa.set(q[a],q[a+1],q[a+2],q[a+3]); out.set(q[b],q[b+1],q[b+2],q[b+3]); return out.copy(_qa.slerp(out,fr));};
  function clipW(bi,b){const D=sampleD(CS.cur,bi,new THREE.Quaternion());
    if(CS.prev&&CS.fade<1){const Dp=sampleD(CS.prev,bi,_qb);D.copy(Dp.slerp(D,CS.fade));}
    return D.multiply(CS.Qal[bi]).multiply(b.userData.W);}
  function play(name,o){o=o||{};if(!CS||!MXA.clips[name])return Promise.resolve();
    if(CS.cur&&CS.cur.done)CS.cur.done();
    CS.prev=CS.cur; CS.fade=CS.prev?0:1; CS.fadeDur=o.fade==null?.12:o.fade;
    return new Promise(res=>{CS.cur={name,t:o.from||0,loop:!!o.loop,hold:!!o.hold,speed:o.speed||1,done:res};CS.wT=1;});}
  function tickClip(dt){if(!CS||!CS.cur)return;const c=CS.cur,dur=(MXA.clips[c.name].n-1)/30;
    c.t+=dt*c.speed; if(CS.prev){CS.prev.t=Math.min(CS.prev.t+dt*CS.prev.speed,(MXA.clips[CS.prev.name].n-1)/30);CS.fade=Math.min(1,CS.fade+dt/Math.max(.01,CS.fadeDur));if(CS.fade>=1)CS.prev=null;}
    if(c.t>=dur){if(c.loop)c.t%=dur;else{c.t=dur;const d=c.done;c.done=null;if(c.hold){}else{play('idle',{loop:true,fade:.2});}if(d)d();}}
    CS.w+=(CS.wT-CS.w)*Math.min(1,dt*10); if(Math.abs(CS.wT-CS.w)<.002)CS.w=CS.wT;}
  if(CS){
    m.userData.play=play;
    m.userData.clipW=v=>{CS.wT=v;};
    m.userData.clipInfo=n=>MXA.clips[n]?{dur:(MXA.clips[n].n-1)/30,main:MXA.clips[n].main,hits:MXA.clips[n].hits}:null;
    m.userData.hold=v=>{if(CS.cur)CS.cur.hold=v;};
  }
  // ดาบในมือ (โผล่ตอนสู้)
  const mt=mats();
  const swR=katana(R.hd,mt); swR.position.set(0,-.04,0); swR.rotation.set(-.35,0,1.95);
  const swL=katana(L.hd,mt); swL.position.set(0,-.04,0); swL.rotation.set(-.1,0,Math.PI+.1);
  m.userData.swords=[swR,swL]; swR.visible=swL.visible=false; swR.userData.trailK=swL.userData.trailK=.32;
  const base=[
    [hips.position,'y',.88],[hips.rotation,'y',.12],[hips.rotation,'x',0],
    [torso.rotation,'x',.05],[torso.rotation,'y',-.04],[torso.rotation,'z',0],
    [head.rotation,'y',-.08],[head.rotation,'x',.06],
    [legs[0].th.rotation,'z',-.09],[legs[0].th.rotation,'x',-.06],[legs[0].kn.rotation,'x',.1],
    [legs[1].th.rotation,'z',.12],[legs[1].th.rotation,'x',.06],[legs[1].kn.rotation,'x',.06],
    [R.sh.rotation,'z',-.2],[R.sh.rotation,'x',.06],[R.el.rotation,'z',.16],
    [L.sh.rotation,'z',.22],[L.sh.rotation,'x',.02],[L.el.rotation,'z',-.18],
  ];
  applyPose(base);
  m.userData.rig={hips,torso,head,legs,arms,R,L,base};
  m.userData.meshy=true;
  const feet=()=>legs.forEach(l=>{l.ft.rotation.x=-(l.th.rotation.x+l.kn.rotation.x);l.ft.rotation.z=-l.th.rotation.z;});
  feet(); retarget();
  // ย้ายดาบไปติดกระดูกมือจริง (ตามท่า Mixamo ได้)
  m.updateMatrixWorld(true); B.rHand.attach(swR); B.lHand.attach(swL);
  if(CS){play('idle',{loop:true,from:Math.random()*2});CS.w=CS.wT=1;}
  m.userData.idle=T=>{
    if(CS){const dt=CS.lastT==null?0:Math.min(.1,T-CS.lastT);CS.lastT=T;tickClip(dt*(typeof SPEED!=='undefined'?SPEED*HS:1));}
    breath=Math.sin(T*2)*.025;
    m.position.y+=Math.sin(T*2)*.008; m.position.x+=Math.sin(T*.9)*.012;
    head.rotation.z=Math.sin(T*.7)*.03;
    feet(); retarget();
  };
}
