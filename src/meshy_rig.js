/* ================= โมเดลคาเซะคิริจาก Meshy (มีโครงกระดูก Mixamo) ================= */
let MESHY=null, USE_MESHY=true, MXA=null;
const MXA_URL='kzr/kazekiri_anims.json';
// โมเดลตัวละครจาก Meshy ที่ใช้โครงกระดูก Mixamo (ใช้ท่าชุดเดียวกันได้)
const RIG_URLS={kazekiri:'kzr/kazekiri_rig.json',kuroga:'krg/kuroga_rig.json',hakuneko:'hkn/hakuneko_rig.json?v=2',morihime:'mrh/morihime_rig.json?v=2',seiro:'szr/seiro_rig.json',kohaku:'khk/kohaku_rig.json',garok:'grk/garok_rig.json',sarael:'srl/sarael_rig.json?v=2',anubis:'anb/anubis_rig.json',phraiwan:'prw/phraiwan_rig.json',mortha:'mrt/mortha_rig.json'}, RIGDB={};
function loadRig(key,onProgress){
  if(RIGDB[key])return Promise.resolve(RIGDB[key]);
  return new Promise(res=>{
    if(!THREE.GLTFLoader||!THREE.SkeletonUtils||!RIG_URLS[key]){res(null);return;}
    new THREE.GLTFLoader().load(RIG_URLS[key],g=>{RIGDB[key]=g;res(g);},x=>{if(onProgress&&x.total)onProgress(x.loaded/x.total);},()=>res(null));
  });
}
function loadMeshy(onProgress){
  const anims=fetch(MXA_URL).then(r=>r.ok?r.json():null).then(j=>{MXA=j;}).catch(()=>{});
  return Promise.all([loadRig('kazekiri',onProgress),loadRig('kuroga'),loadRig('hakuneko'),loadRig('morihime'),loadRig('seiro'),loadRig('kohaku'),loadRig('garok'),loadRig('sarael'),loadRig('anubis'),loadRig('phraiwan'),loadRig('mortha'),anims]).then(([g])=>{MESHY=g;return g;});
}
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_m1=new THREE.Matrix4();
/* กำมือ: โมเดลจาก Meshy ไม่มีกระดูกนิ้ว มือจึงแบแข็ง -> ดัดนิ้วของเมชให้งอรอบด้ามดาบ (ทำครั้งเดียวต่อโมเดล)
   ในพื้นที่ของกระดูกมือ: แกน Y = ทิศนิ้ว, n = ด้านฝ่ามือ (ทิศคมดาบ), a = แนวด้ามดาบ */
function makeFist(root,hands){
  let sm=null; root.traverse(o=>{if(!sm&&o.isSkinnedMesh)sm=o;}); if(!sm)return;
  const g=sm.geometry, bones=sm.skeleton.bones, U=g.userData.fist||(g.userData.fist={});
  hands.forEach(([hand,sw,sd])=>{
    if(!hand||!sw||sw.parent!==hand)return;
    if(!U[sd]){
      const hi=bones.indexOf(hand); if(hi<0){U[sd]={shift:[0,0,0]};return;}
      const M=new THREE.Matrix4().multiplyMatrices(sm.skeleton.boneInverses[hi],sm.bindMatrix), Mi=M.clone().invert();
      const N3=new THREE.Matrix3().getNormalMatrix(M), N3i=new THREE.Matrix3().getNormalMatrix(Mi);
      const Y=new THREE.Vector3(0,1,0), a=new THREE.Vector3(0,1,0).applyQuaternion(sw.quaternion); a.addScaledVector(Y,-a.dot(Y)).normalize();
      const e=new THREE.Vector3(0,0,1).applyQuaternion(sw.quaternion); e.addScaledVector(Y,-e.dot(Y)).addScaledVector(a,-e.dot(a)).normalize();
      const n=e, ax=new THREE.Vector3().crossVectors(Y,n).normalize();
      const P=g.attributes.position, NA=g.attributes.normal, SI=g.attributes.skinIndex, SW=g.attributes.skinWeight;
      const kids=new Set(); hand.traverse(o=>{if(o.isBone&&o!==hand){const k=bones.indexOf(o);if(k>=0)kids.add(k);}});
      const idx=[], L=[], v=new THREE.Vector3(), nv=new THREE.Vector3(), q=new THREE.Quaternion();
      for(let i=0;i<P.count;i++){const si=[SI.getX(i),SI.getY(i),SI.getZ(i),SI.getW(i)],wi=[SW.getX(i),SW.getY(i),SW.getZ(i),SW.getW(i)];
        let w=0;for(let j=0;j<4;j++)if(si[j]===hi||kids.has(si[j]))w+=wi[j]; if(w>.05){idx.push([i,w]);}}
      const u0=sw.position.y, uk=u0+.02;
      // ความกว้างฝ่ามือด้านข้าง (ใช้ตัดนิ้วโป้งที่กางออก)
      idx.forEach(([i])=>{v.fromBufferAttribute(P,i).applyMatrix4(M);if(v.y>0&&v.y<uk)L.push(Math.abs(v.dot(a)-sw.position.dot(a)));});
      L.sort((x,y)=>x-y); const Wl=L.length?L[Math.floor(L.length*.85)]:.04;
      const rh=.021*sw.scale.x, Rb=rh+.016, c0=sw.position.dot(n);
      idx.forEach(([i,w])=>{
        v.fromBufferAttribute(P,i).applyMatrix4(M);
        let uu=v.y, vv=v.dot(n)-c0, ll=v.dot(a)-sw.position.dot(a), th=0;
        // นิ้วโป้งที่กางออกข้าง: พับเข้าหาด้ามดาบ
        const ex=Math.abs(ll)-Wl; if(ex>0&&uu>-.01){ll=Math.sign(ll)*(Wl+ex*.35);vv+=ex*.55;uu-=ex*.15;}
        if(uu>uk){const s2=uu-uk, rho=Rb-vv; th=Math.min(3.5,s2/Rb); uu=uk+rho*Math.sin(th); vv=Rb-rho*Math.cos(th);}
        const out=new THREE.Vector3().addScaledVector(Y,uu).addScaledVector(n,vv+c0).addScaledVector(a,ll+sw.position.dot(a));
        v.lerp(out,Math.min(1,w*1.15)).applyMatrix4(Mi); P.setXYZ(i,v.x,v.y,v.z);
        if(NA&&th>0){nv.fromBufferAttribute(NA,i).applyMatrix3(N3).normalize().applyQuaternion(q.setFromAxisAngle(ax,th*Math.min(1,w))).applyMatrix3(N3i).normalize();NA.setXYZ(i,nv.x,nv.y,nv.z);}
      });
      P.needsUpdate=true; if(NA)NA.needsUpdate=true;
      // เลื่อนด้ามดาบไปอยู่ในอุ้งมือ (ศูนย์กลางของนิ้วที่งอ)
      const sh=new THREE.Vector3().addScaledVector(Y,uk-u0).addScaledVector(n,Rb);
      U[sd]={shift:sh.toArray()};
    }
    sw.position.add(new THREE.Vector3(...U[sd].shift));
  });
}
const POLE={morihime:1,kohaku:1,garok:1,anubis:1,phraiwan:1,mortha:1};
const NOWPN={sarael:1}; // สู้มือเปล่า (กรงเล็บ) ไม่ถือดาบ // ตัวที่ถืออาวุธด้ามยาวจากโมเดล
function buildMeshyEvo(m,key){
  key=(typeof key==='string'&&RIGDB[key])?key:'kazekiri';
  const root=THREE.SkeletonUtils.clone((RIGDB[key]||MESHY).scene);
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
  // อาวุธเดิมของโมเดล: ติดกับมือขวา และปรับมุมหอกของโมริฮิเมะรอบจุดจับ
  let prop=null; root.traverse(o=>{if(!prop&&o.name==='weapon_prop')prop=o;});
  if(prop&&B.rHand){B.rHand.attach(prop);
    const P=prop.geometry.attributes.position, hp=B.rHand.getWorldPosition(new THREE.Vector3()), inv=new THREE.Matrix4().copy(prop.matrixWorld).invert(), hl=hp.applyMatrix4(inv), v=new THREE.Vector3(), tip=new THREE.Vector3(); let best=-1;
    for(let i=0;i<P.count;i+=3){v.fromBufferAttribute(P,i);const d=v.distanceTo(hl);if(d>best){best=d;tip.copy(v);}}
    const mk=q=>{const o=new THREE.Object3D();o.position.copy(q);prop.add(o);return o;};
    prop.userData.base=mk(hl.clone().lerp(tip,.28)); prop.userData.tip=mk(tip); prop.userData.trailK=.32; prop.castShadow=true;}
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
      if(cw>0&&CS.idx.has(b)){const Wc=clipW(CS.idx.get(b),b,W);W.slerp(Wc,cw);}
      b.quaternion.copy(_q1.copy(parentW).invert().multiply(W));
      b.children.forEach(c=>{if(c.isBone)visit(c,W);});
    };
    visit(B.hips,hipsParentWQ);
  }
  const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion();
  const sampleD=(c,bi,out)=>{const cl=MXA.clips[c.name],q=cl.q,nb=MXA.bones.length,n=cl.n;const f=Math.min(n-1,Math.max(0,c.t*30)),i0=Math.floor(f),i1=Math.min(n-1,i0+1),fr=f-i0;
    const a=(i0*nb+bi)*4,b=(i1*nb+bi)*4; _qa.set(q[a],q[a+1],q[a+2],q[a+3]); out.set(q[b],q[b+1],q[b+2],q[b+3]); return out.copy(_qa.slerp(out,fr));};
  function clipW(bi,b,baseW){const D=sampleD(CS.cur,bi,new THREE.Quaternion());
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
  const swR=prop?null:katana(R.hd,mt); if(swR){swR.position.set(0,-.04,0); swR.rotation.set(-.35,0,1.95);}
  const swL=prop?null:katana(L.hd,mt); if(swL){swL.position.set(0,-.04,0); swL.rotation.set(-.1,0,Math.PI+.1);}
  if(prop){m.userData.swords=[prop];prop.visible=key==='hakuneko'||!!POLE[key];}
  else{m.userData.swords=[swR,swL]; swR.visible=swL.visible=false; swR.userData.trailK=swL.userData.trailK=.32;}
  if(key==='kuroga'||key==='seiro'){swR.scale.setScalar(1.22);m.userData.swords=[swR];} // คุโรกะ/เซย์โร: ดาบยาวเล่มเดียว
  if(NOWPN[key])m.userData.swords=[]; // ดาบยังใช้กำมือ แต่ไม่โชว์
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
  m.userData.meshy=true; m.userData.rigKey=key;
  const feet=()=>legs.forEach(l=>{l.ft.rotation.x=-(l.th.rotation.x+l.kn.rotation.x);l.ft.rotation.z=-l.th.rotation.z;});
  feet(); retarget();
  // ย้ายดาบไปติดกระดูกมือจริง (ตามท่า Mixamo ได้)
  m.updateMatrixWorld(true);
  // ฮาคุเนโกะ: ดาบพาดหลังตอนพัก และเลื่อนด้ามเข้ามือก่อนออกท่าฟัน
  let swordPose=null;
  if(key==='hakuneko'&&prop&&CS&&MXA.grip&&MXA.grip.R){
    const P=prop.geometry.attributes.position,lo=new THREE.Vector3(),hi=new THREE.Vector3(),v=new THREE.Vector3();
    let min=Infinity,max=-Infinity;
    for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);if(v.x<min){min=v.x;lo.copy(v);}if(v.x>max){max=v.x;hi.copy(v);}}
    const handPos=B.rHand.getWorldPosition(new THREE.Vector3());
    const hilt=lo.clone().applyMatrix4(prop.matrixWorld).distanceTo(handPos)<hi.clone().applyMatrix4(prop.matrixWorld).distanceTo(handPos)?lo:hi;
    const blade=hi.clone().sub(lo);if(hilt===hi)blade.negate();blade.normalize();
    const bi=MXA.bones.indexOf('RightHand'),Fi=CS.Qal[bi].clone().multiply(B.rHand.userData.W).invert();
    const G=MXA.grip.R,bladeDir=new THREE.Vector3(...G.blade),edge=new THREE.Vector3(...G.edge);
    const x=new THREE.Vector3().crossVectors(bladeDir,edge),Qs=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,bladeDir,edge));
    const drawQ=Fi.clone().multiply(Qs).multiply(new THREE.Quaternion().setFromUnitVectors(blade,new THREE.Vector3(0,1,0)));
    // offset ของ Mixamo อยู่ในพื้นที่โมเดล ต้องแปลงกลับเป็นพื้นที่กระดูกมือก่อน
    const handQ=wq(B.rHand),toNow=handQ.clone().multiply(Fi);
    const offM=new THREE.Vector3(...G.off).multiplyScalar(CS.hs*.72).applyQuaternion(toNow);
    const drawP=B.rHand.worldToLocal(m.localToWorld(posM(B.rHand).add(offM)));
    drawP.sub(hilt.clone().multiply(prop.scale).applyQuaternion(drawQ));
    swordPose={restP:prop.position.clone(),restQ:prop.quaternion.clone(),drawP,drawQ,blend:0};
  }
  // อาวุธด้ามยาว (หอกโมริฮิเมะ · คทาโคฮาคุ · ขวานกาโรค): จับตามแกนการจับของท่า Mixamo (ปลายที่กว้างกว่าออกทางเดียวกับใบดาบ)
  if(POLE[key]&&prop&&CS&&MXA.grip&&MXA.grip.R){
    const P=prop.geometry.attributes.position,n=P.count,v=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<n;i++)c.add(v.fromBufferAttribute(P,i));c.multiplyScalar(1/n);
    const a=new THREE.Vector3(),b=new THREE.Vector3();let d0=-1;
    for(let i=0;i<n;i++){v.fromBufferAttribute(P,i);const d=v.distanceToSquared(c);if(d>d0){d0=d;a.copy(v);}}
    d0=-1;for(let i=0;i<n;i++){v.fromBufferAttribute(P,i);const d=v.distanceToSquared(a);if(d>d0){d0=d;b.copy(v);}}
    const ax=b.clone().sub(a).normalize(),L=a.distanceTo(b);
    // ปลายที่กว้างกว่าคือหัวหอก
    const sp=[0,0],cn=[0,0],w=new THREE.Vector3();
    for(let i=0;i<n;i++){v.fromBufferAttribute(P,i);const t=v.clone().sub(a).dot(ax)/L;const e=t<.15?0:t>.85?1:-1;if(e<0)continue;
      w.copy(v).sub(a).addScaledVector(ax,-t*L);sp[e]+=w.length();cn[e]++;}
    const tipAtB=sp[1]/Math.max(1,cn[1])>sp[0]/Math.max(1,cn[0]);
    const tipL=tipAtB?b:a, dir=tipAtB?ax.clone():ax.clone().negate();
    m.updateMatrixWorld(true);
    const hl=prop.worldToLocal(B.rHand.getWorldPosition(new THREE.Vector3()));
    const tg=THREE.MathUtils.clamp(hl.clone().sub(a).dot(ax)/L,.2,.8), gripL=a.clone().addScaledVector(ax,tg*L);
    const bi=MXA.bones.indexOf('RightHand'),Fi=CS.Qal[bi].clone().multiply(B.rHand.userData.W).invert();
    const G=MXA.grip.R,bladeDir=new THREE.Vector3(...G.blade),edge=new THREE.Vector3(...G.edge);
    const x=new THREE.Vector3().crossVectors(bladeDir,edge),Qs=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,bladeDir,edge));
    const q=Fi.clone().multiply(Qs).multiply(new THREE.Quaternion().setFromUnitVectors(dir,new THREE.Vector3(0,1,0)));
    const toNow=wq(B.rHand).multiply(Fi);
    const offM=new THREE.Vector3(...G.off).multiplyScalar(CS.hs*.72).applyQuaternion(toNow);
    const p=B.rHand.worldToLocal(m.localToWorld(posM(B.rHand).add(offM)));
    prop.quaternion.copy(q); prop.position.copy(p).sub(gripL.clone().multiply(prop.scale).applyQuaternion(q));
    prop.userData.base.position.copy(gripL.clone().lerp(tipL,.3)); prop.userData.tip.position.copy(tipL);
  }
  // จัดดาบให้อยู่ในกำมือตามแกนการจับของท่า Mixamo (ใบดาบออกฝั่งนิ้วโป้ง คมหันไปทางนิ้ว)
  const gripFix=(hand,sd,sw)=>{
    if(!CS||!MXA.grip||!MXA.grip[sd])return false;
    const bi=MXA.bones.indexOf(sd==='R'?'RightHand':'LeftHand'); if(bi<0)return false;
    const G=MXA.grip[sd], F=CS.Qal[bi].clone().multiply(hand.userData.W), Fi=F.clone().invert();
    const blade=new THREE.Vector3(...G.blade), edge=new THREE.Vector3(...G.edge), x=new THREE.Vector3().crossVectors(blade,edge);
    const Qs=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,blade,edge));
    const Hq=wq(hand), toNow=Hq.clone().multiply(Fi);
    const off=new THREE.Vector3(...G.off).multiplyScalar(CS.hs*.72).applyQuaternion(toNow);
    const sc=sw.scale.x; sw.parent.remove(sw); m.add(sw);
    sw.position.copy(posM(hand)).add(off); sw.quaternion.copy(toNow.multiply(Qs)); sw.scale.setScalar(sc);
    m.updateMatrixWorld(true); hand.attach(sw); return true;};
  if(!prop){
  if(!gripFix(B.rHand,'R',swR))B.rHand.attach(swR);
  if(!gripFix(B.lHand,'L',swL))B.lHand.attach(swL);
  makeFist(root,[[B.rHand,swR,'R'],[B.lHand,swL,'L']]);}
  if(CS){play('idle',{loop:true,from:Math.random()*2});CS.w=CS.wT=1;}
  m.userData.idle=T=>{
    let dt=0; if(CS){dt=CS.lastT==null?0:Math.min(.1,T-CS.lastT);CS.lastT=T;tickClip(dt*(typeof SPEED!=='undefined'?SPEED*HS:1));}
    breath=Math.sin(T*2)*.025;
    m.position.y+=Math.sin(T*2)*.008; m.position.x+=Math.sin(T*.9)*.012;
    head.rotation.z=Math.sin(T*.7)*.03;
    feet(); retarget();
    if(swordPose){const attacking=CS.cur&&/^(slash|slash2|power|combo|jumpatk|leap|spin|powerup)$/.test(CS.cur.name);
      swordPose.blend+=(Number(attacking)-swordPose.blend)*Math.min(1,dt*11);
      prop.position.copy(swordPose.restP).lerp(swordPose.drawP,swordPose.blend);
      prop.quaternion.copy(swordPose.restQ).slerp(swordPose.drawQ,swordPose.blend);}
  };
}
