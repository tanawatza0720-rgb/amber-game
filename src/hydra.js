/* ================= ราชันไฮดรา (บอสโลก) =================
   โมเดล Tripo ลดเหลือ 24k สามเหลี่ยม (boss/hydra.glb) + โครงกระดูก 74 ชิ้น (boss/hydra_rig.json)
   กระดูก/น้ำหนักผิวคำนวณจากรูปทรงโมเดล: ลำตัว 3 · หาง 2 เส้น · คอ 5 เส้น (เส้นละ 4 ข้อ + หัว) · ปีก 2 ข้าง (แขนปีก + แผ่นปีก) · ขา 4
   ท่าทางทั้งหมดคำนวณสด: ทุกข้อมีสปริง ข้อที่อยู่ปลายตามช้ากว่า (คอ/หาง/ปีกเหวี่ยงตามแรงเฉื่อย)
   ใช้: const H=await loadHydra(); scene.add(H.root); ทุกเฟรม H.tick(dt); ท่า H.play('roar'|'breath'|'slam'|'gust'|'sweep'|'hit'|'die'|'revive')
   แกนโมเดล: หน้า +x, ขึ้น +y, ปีกซ้าย +z */
const HYDRA_BASE_=(typeof HYDRA_BASE!=='undefined'?HYDRA_BASE:'boss/'), HYDRA_URL=HYDRA_BASE_+'hydra.glb', HYDRA_RIG=HYDRA_BASE_+'hydra_rig.json';
const HY_HEADS=['black','gold','red','white','blue'];
const HY_EL={black:0x8a4dff,gold:0xffe27a,red:0xff5a1f,white:0xbff3ff,blue:0x3fb6ff}; // มืด แสง ไฟ ลม น้ำ
function loadHydra(scale){
  scale=scale||10;
  const gl=new Promise((res,rej)=>new THREE.GLTFLoader().load(HYDRA_URL,res,undefined,rej));
  const rj=fetch(HYDRA_RIG).then(r=>r.json());
  return Promise.all([gl,rj]).then(([g,rig])=>{
    let mesh=null; g.scene.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});
    const geo=mesh.geometry, n=geo.attributes.position.count;
    const raw=Uint8Array.from(atob(rig.skin),c=>c.charCodeAt(0));
    const SI=new Uint16Array(n*4), SW=new Float32Array(n*4);
    for(let i=0;i<n;i++)for(let k=0;k<4;k++){SI[i*4+k]=raw[i*8+k];SW[i*4+k]=raw[i*8+4+k]/255;}
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4)); geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
    // กระดูก (ท่าพักไม่มีการหมุน ตำแหน่ง = ตำแหน่งโลก − ตำแหน่งแม่)
    const B={}, list=[];
    rig.bones.forEach(d=>{const b=new THREE.Bone();b.name=d.n;const p=d.p?rig.bones.find(x=>x.n===d.p).x:[0,0,0];b.position.set(d.x[0]-p[0],d.x[1]-p[1],d.x[2]-p[2]);b.userData.w=new THREE.Vector3(...d.x);B[d.n]=b;list.push(b);if(d.p)B[d.p].add(b);});
    const mat=mesh.material.clone(); mat.skinning=true; mat.side=THREE.FrontSide; mat.roughness=.72; mat.metalness=.05;
    const sm=new THREE.SkinnedMesh(geo,mat); sm.add(B.root); sm.bind(new THREE.Skeleton(list)); sm.castShadow=true; sm.receiveShadow=false; sm.frustumCulled=false;
    // โครงนอก: pivot (ยืนสองขาหลัง หมุนรอบเท้าหลัง) -> body
    const root=new THREE.Group(), pivot=new THREE.Group(), body=new THREE.Group();
    root.add(pivot); pivot.add(body); body.add(sm);
    const FOOT_X=-.16, GROUND=.463;
    pivot.position.set(FOOT_X*scale,0,0); body.position.set(-FOOT_X*scale,GROUND*scale,0); body.scale.setScalar(scale);
    return makeHydra(root,pivot,body,sm,B,scale);
  });
}
function makeHydra(root,pivot,body,sm,B,S){
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z), UP=V3(0,1,0);
  // แกนก้ม/เงย ของแต่ละข้อ = ทิศของข้อ × แกนขึ้น
  const dirOf=b=>{const c=b.children.find(x=>x.isBone);return c?c.userData.w.clone().sub(b.userData.w).normalize():null;};
  const axes={}; Object.values(B).forEach(b=>{let d=dirOf(b);if(!d){const p=b.parent;d=p&&p.isBone?b.userData.w.clone().sub(p.userData.w).normalize():V3(1,0,0);}
    const pa=d.clone().cross(UP); if(pa.lengthSq()<1e-4)pa.set(0,0,1); pa.normalize(); axes[b.name]={d,pitch:pa};});
  // พารามิเตอร์ท่า (ค่าเป้าหมาย t, ค่าจริง v, สปริง k)
  const P={}; const par=(n,k)=>P[n]={t:0,v:0,vel:0,k:k||6};
  ['rear','crouch','yaw','shake','breath','tailSw','tailUp','wingL','wingR','foldL','foldR','armL','armR','dead'].forEach(n=>par(n));
  HY_HEADS.forEach(h=>{par(h+'P');par(h+'Y');par(h+'X',9);par(h+'M',12);});
  P.rear.k=3.5;P.dead.k=1.6;P.wingL.k=P.wingR.k=9; // ปีก: + = ยกขึ้น/หุบเหนือหลัง, − = กางลงออกข้าง
  const set=(o)=>{for(const k in o)P[k].t=o[k];};
  const quat=new THREE.Quaternion(), q2=new THREE.Quaternion(), tq={};
  const target=(b,ax1,a1,ax2,a2)=>{const q=tq[b]||(tq[b]=new THREE.Quaternion());q.setFromAxisAngle(ax1,a1);if(ax2){q2.setFromAxisAngle(ax2,a2);q.premultiply(q2);}return q;};
  const lag={}; Object.keys(B).forEach(n=>{const m=n.match(/(\d)$/);lag[n]=m?Math.max(3.5,13-+m[1]*2.2):12;});
  // เอฟเฟกต์: อนุภาคพลังจากปาก (สไปรต์แบบบวกแสง) + วงกระแทกพื้น
  const fx=new THREE.Group(); root.add(fx);
  const dot=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);return t;})();
  const POOL=[]; for(let i=0;i<220;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.visible=false;s.userData={life:0};fx.add(s);POOL.push(s);}
  const emit=(p,v,col,size,life)=>{const s=POOL.find(x=>!x.visible);if(!s)return;s.visible=true;s.position.copy(p);s.userData={v,life,max:life,size};s.material.color.setHex(col);s.scale.setScalar(size);};
  const rings=[]; const ring=(p,col,R)=>{const m=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.copy(p);m.position.y=.15;fx.add(m);rings.push({m,t:0,R});};
  const tipOf=h=>{const b=B['n_'+h+'4'];const p=new THREE.Vector3();b.getWorldPosition(p);const q=new THREE.Quaternion();b.getWorldQuaternion(q);const d=axes[b.name].d.clone().applyQuaternion(q);p.addScaledVector(d,.06*S);fx.worldToLocal(p);return {p,d};};
  const breathing={}; // หัวที่กำลังพ่นพลัง -> เวลาที่เหลือ
  // ลำดับท่า (async) ทีละท่า ท่าใหม่ยกเลิกท่าเก่า
  let seq=0, T=0, alive=true;
  const wait=s=>new Promise(r=>setTimeout(r,s*1000));
  const heads=(o)=>{HY_HEADS.forEach((h,i)=>{for(const k in o)P[h+k].t=typeof o[k]==='function'?o[k](h,i):o[k];});};
  const reset=()=>{for(const k in P)if(k!=='dead')P[k].t=0;};
  const API={root,body,bones:B,P,shakeCam:0,onSlam:null,
    async play(name){const my=++seq;const live=()=>my===seq;reset();
      if(name==='roar'){set({rear:.12,crouch:-.02});heads({P:(h,i)=>.55+i*.04,Y:(h,i)=>(i-2)*.12,M:1});set({wingL:.25,wingR:.25});await wait(.55);if(!live())return;
        heads({P:-.25,X:.6});set({rear:-.05,shake:1});API.shakeCam=.5;ring(V3(1.8*S*.1,0,0),0xffc070,S*.9);await wait(1.2);if(!live())return;heads({X:0,M:0});set({shake:0});await wait(.5);}
      if(name==='breath'){for(let i=0;i<HY_HEADS.length&&live();i++){const h=HY_HEADS[i];P[h+'P'].t=.45;P[h+'X'].t=-.3;await wait(.35);if(!live())return;P[h+'P'].t=-.12;P[h+'X'].t=.55;P[h+'M'].t=1;breathing[h]=.9;await wait(.45);P[h+'X'].t=0;P[h+'P'].t=0;P[h+'M'].t=0;}
        await wait(.8);}
      if(name==='slam'){set({rear:.62,armL:1,armR:1,wingL:.5,wingR:.5,tailUp:-.2});heads({P:.3,X:-.1});await wait(.9);if(!live())return;
        P.rear.k=14;set({rear:-.08,armL:-.25,armR:-.25,crouch:-.05,wingL:-.2,wingR:-.2});heads({P:-.35,X:.4,M:1});await wait(.28);
        ring(V3(.55*S,0,0),0xffd08a,S*1.1);ring(V3(.55*S,0,0),0xff8a3a,S*.7);API.shakeCam=1;if(API.onSlam)API.onSlam();
        for(let k=0;k<40;k++){const a=Math.random()*6.28;emit(V3(.5*S+Math.cos(a)*.1*S,.05*S,Math.sin(a)*.2*S),V3(Math.cos(a)*S*.35,S*(.2+Math.random()*.4),Math.sin(a)*S*.35),0xffc890,S*.035,.7);}
        await wait(.7);P.rear.k=3.5;if(!live())return;set({crouch:0,armL:0,armR:0});heads({X:0,M:0,P:0});await wait(.4);}
      if(name==='gust'){for(let k=0;k<3&&live();k++){set({wingL:.45,wingR:.45,crouch:.03,rear:.06});await wait(.32);set({wingL:-.6,wingR:-.6,crouch:-.03,rear:.1});
          for(let j=0;j<18;j++)emit(V3(S*(.2+Math.random()*.2),S*(.1+Math.random()*.3),(Math.random()-.5)*S*.8),V3(S*(1.2+Math.random()),-S*.1,(Math.random()-.5)*S*.4),0xe8fbff,S*.05,.6);
          API.shakeCam=.25;await wait(.42);}
        set({wingL:0,wingR:0,crouch:0,rear:0});await wait(.4);}
      if(name==='sweep'){set({yaw:.35,tailSw:-1.2,crouch:-.02});heads({Y:.3});await wait(.5);if(!live())return;
        P.yaw.k=10;P.tailSw.k=12;set({yaw:-.4,tailSw:1.4});heads({Y:-.35});API.shakeCam=.35;ring(V3(-.4*S,0,0),0xffb070,S*.9);await wait(.6);
        P.yaw.k=6;P.tailSw.k=6;set({yaw:0,tailSw:0,crouch:0});heads({Y:0});await wait(.5);}
      if(name==='hit'){set({rear:-.08,shake:1,crouch:-.02});heads({P:.2,X:-.35,Y:(h,i)=>(Math.random()-.5)*.5});await wait(.25);set({shake:0,rear:0,crouch:0});heads({P:0,X:0,Y:0});}
      if(name==='die'){alive=false;set({wingL:-.35,wingR:-.3,foldL:.25,foldR:.25,tailUp:-.2});for(let i=0;i<HY_HEADS.length&&live();i++){const h=HY_HEADS[i];P[h+'P'].t=.5;P[h+'M'].t=1;await wait(.25);P[h+'P'].t=-.4;P[h+'M'].t=0;P[h+'Y'].t=(i-2)*.12;await wait(.3);}
        P.dead.t=1;set({crouch:-.05});API.shakeCam=.6;}
      if(name==='revive'){alive=true;P.dead.t=0;set({});}
      if(live())reset();},
    tick(dt){T+=dt;dt=Math.min(dt,.05);
      for(const k in P){const p=P[k],a=p.k*p.k*(p.t-p.v)-2*p.k*.8*p.vel;p.vel+=a*dt;p.v+=p.vel*dt;}
      const idle=alive?1:0, br=Math.sin(T*1.6);
      // ยืนสองขาหลัง / ย่อ / หมุนตัว
      pivot.rotation.z=P.rear.v+P.dead.v*-.05; pivot.rotation.x=P.dead.v*.22; body.position.y=(P.crouch.v-P.dead.v*.06+br*.004*idle)*S+.463*S; root.rotation.y=P.yaw.v*.6;
      body.position.x=.16*S+(P.shake.v>.02?Math.sin(T*60)*.006*S*P.shake.v:0);
      // ลำตัวหายใจ
      B.chest.quaternion.slerp(target('chest',axes.chest.pitch,br*.02*idle+P.rear.v*.15),1-Math.exp(-dt*6));
      B.hips.quaternion.slerp(target('hips',axes.hips.pitch,-P.rear.v*.35),1-Math.exp(-dt*6));
      // คอ 5 เส้น: ก้มเงย/ส่าย/ยืดพุ่ง + ส่ายเองช่วงยืนเฉย ๆ (ไม่พร้อมกัน)
      HY_HEADS.forEach((h,hi)=>{const ph=hi*1.7, pp=P[h+'P'].v+Math.sin(T*.9+ph)*.07*idle, yy=P[h+'Y'].v+Math.sin(T*.55+ph*1.3)*.12*idle, xx=P[h+'X'].v;
        const W=[.14,.2,.24,.24,.18];
        for(let i=0;i<5;i++){const n='n_'+h+i,b=B[n];if(!b)continue;const ax=axes[n];
          const am=h==='black'?.55:1, pitch=am*(pp*W[i]*1.6+(i<2?-xx*.22:xx*.18)-(P.dead.v*(i<2?0:.14)));
          b.quaternion.slerp(target(n,ax.pitch,pitch,UP,am*yy*W[i]*1.5),1-Math.exp(-dt*lag[n]));}
        // พ่นพลัง
        if(breathing[h]>0){breathing[h]-=dt;const {p,d}=tipOf(h);const fw=V3(1,0,0).applyAxisAngle(UP,root.rotation.y);d.multiplyScalar(.6).add(fw).normalize();for(let k=0;k<3;k++){const v=d.clone().multiplyScalar(S*(1.6+Math.random()*.6)).add(V3((Math.random()-.5)*S*.25,(Math.random()-.5)*S*.2,(Math.random()-.5)*S*.25));emit(p,v,HY_EL[h],S*(.05+Math.random()*.06),.55);}}});
      // ปีก: กระพือรอบแกนหน้า-หลัง (x) + หุบรอบแกนตั้ง
      const flap=Math.sin(T*1.1)*.05*idle;
      [['L',1],['R',-1]].forEach(([sd,sg])=>{const f=P['wing'+sd].v+flap, fo=P['fold'+sd].v;
        for(let i=0;i<3;i++){const n='w'+sd+i;if(!B[n])continue;B[n].quaternion.slerp(target(n,V3(1,0,0),-sg*f*(i?.45:1)*(1+i*.2),UP,sg*fo*(i?.3:.8)),1-Math.exp(-dt*lag[n]));}
        for(let i=0;i<3;i++){const n='m'+sd+i;if(!B[n])continue;B[n].quaternion.slerp(target(n,V3(1,0,0),-sg*f*.25),1-Math.exp(-dt*lag[n]));}
        // แขนหน้า (ท่าตบ)
        const a=P['arm'+sd].v;[0,1,2].forEach(i=>{const n='a'+sd+i;if(B[n])B[n].quaternion.slerp(target(n,V3(0,0,1),[.9,-.5,-.6][i]*a),1-Math.exp(-dt*10));});
        // ขาหลังชดเชยตอนยืนสองขา ให้เท้าอยู่ที่พื้น
        const r=P.rear.v; [0,1].forEach(i=>{const n='l'+sd+i;if(B[n])B[n].quaternion.slerp(target(n,V3(0,0,1),[-r*.5,r*.1][i]),1-Math.exp(-dt*8));});});
      // หาง 2 เส้น: คลื่นวิ่งจากโคนไปปลาย
      ['tail','tailB'].forEach((tn,ti)=>{for(let i=0;i<8;i++){const n=tn+i;if(!B[n])continue;const ax=axes[n];
        const sw=(Math.sin(T*1.3-i*.55+ti*2)*.06*idle+P.tailSw.v*.12)*(1+i*.12)*(ti?-1:1), up=P.tailUp.v*.1+Math.sin(T*.8-i*.4+ti)*.02*idle;
        B[n].quaternion.slerp(target(n,UP,sw,ax.pitch,up),1-Math.exp(-dt*lag[n]));}});
      // อนุภาค + วงกระแทก
      POOL.forEach(s=>{if(!s.visible)return;const u=s.userData;u.life-=dt;if(u.life<=0){s.visible=false;return;}s.position.addScaledVector(u.v,dt);u.v.multiplyScalar(1-dt*1.2);const k=u.life/u.max;s.material.opacity=k;s.scale.setScalar(u.size*(1.8-k));});
      for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=r.t/.7;r.m.scale.setScalar(r.R*(.2+k));r.m.material.opacity=.8*(1-k);if(k>=1){fx.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();rings.splice(i,1);}}
      API.shakeCam=Math.max(0,API.shakeCam-dt*1.6);
    }};
  return API;
}
