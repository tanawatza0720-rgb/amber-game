/* ================= โยรุกุโมะ: จอมเวทแมงมุมราตรี (โครงกระดูกสร้างเอง ท่าทางคำนวณสด) =================
   ขา 8 ขา (ขาละ 3 ท่อน) เดินสลับแบบแมงมุมจริง · ช่วงบนเป็นร่างจอมเวท แขน 2 ข้างร่ายเวท
   โมเดล: spd/spider_rig.json (ชื่อกระดูก root, abdomen, spine…head, armR/foreR/handR, legL1..4/legR1..4 + b/c/t) */
let SPIDER=null;
const SPIDER_URL='spd/spider_rig.json', SPIDER_S=1;
function loadSpider(){
  return new Promise(res=>{
    if(!THREE.GLTFLoader||!THREE.SkeletonUtils){res(null);return;}
    new THREE.GLTFLoader().load(SPIDER_URL,g=>{SPIDER=g;res(g);},undefined,()=>res(null));
  });
}
function buildSpider(){
  const w=new THREE.Group(), m=new THREE.Group(); w.add(m);
  const root=THREE.SkeletonUtils.clone(SPIDER.scene); root.scale.setScalar(SPIDER_S); m.add(root);
  const B={}; root.traverse(o=>{if(o.isBone)B[o.name]=o;});
  const mats=[]; root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;o.material=o.material.clone();
    if(typeof ENV!=='undefined'&&ENV){o.material.envMap=ENV;o.material.envMapIntensity=.45;} o.material.emissive=new THREE.Color(0x9a4dff); o.material.emissiveIntensity=0; mats.push(o.material);}});
  m.userData.mats=mats; m.userData.spider=true;
  // ขา: หาทิศออกด้านนอกของแต่ละขา (ใช้หมุนยกขา/กวาดขา)
  const up=new THREE.Vector3(0,1,0), LEGS=[];
  ['L','R'].forEach(sd=>[1,2,3,4].forEach(i=>{const n='leg'+sd+i, a=B[n], b=B[n+'b'], c=B[n+'c']; if(!a||!b)return;
    const out=b.position.clone().setY(0).normalize(), ax=new THREE.Vector3().crossVectors(up,out).normalize();
    // กลุ่มเดินสลับ: L1 R2 L3 R4 | R1 L2 R3 L4
    const grp=((sd==='L')===(i%2===1))?0:1;
    LEGS.push({a,b,c,out,ax,grp,front:i===1,sd,i});}));
  const st={walk:0,rear:0,stab:0,cast:0,crouch:0,recoil:0,dead:0,look:0,lift:0,spin:0};
  const R={B,st,tg:Object.assign({},st),rate:{},head:B.head,legs:LEGS}; m.userData.rig=R;
  const PV={}; let lastT=null, ph=Math.random()*6, lookT=0, lookY=0, lookTY=0;
  const q=new THREE.Quaternion(), q2=new THREE.Quaternion();
  const rot=(b,x,y,z)=>{if(b)b.rotation.set(x,y,z);};
  m.userData.idle=T=>{
    const dt=lastT==null?0:Math.min(.1,T-lastT); lastT=T; const gdt=dt*(typeof SPEED!=='undefined'?SPEED*(typeof HS!=='undefined'?HS:1):1);
    for(const k in R.tg){const om=Math.min(50,(R.rate[k]||4)*3.2*1.9);let v=PV[k]||0;const n=Math.max(1,Math.ceil(gdt*120)),h=gdt/n;
      for(let i=0;i<n;i++){v+=(om*om*(R.tg[k]-st[k])-2*om*v)*h;st[k]+=v*h;}PV[k]=v;}
    ph+=gdt*(2.2+st.walk*7);
    lookT-=gdt; if(lookT<=0){lookT=1.5+Math.random()*2.5;lookTY=(Math.random()-.5)*.8;} lookY+=(lookTY-lookY)*Math.min(1,gdt*2);
    const calm=Math.max(0,1-st.stab-st.cast-st.rear-st.dead);
    // ลำตัว: หายใจ, ยกตัวตอนตั้งท่า, ย่อก่อนกระโดด, ตายแล้วทรุด
    const bob=Math.sin(ph*2)*.012*st.walk+Math.sin(T*1.6)*.01;
    m.position.y=bob*SPIDER_S-st.crouch*.12-st.dead*.18;
    rot(B.root,-st.rear*.35+st.stab*.12+st.crouch*.1-st.recoil*.12+st.dead*.1, Math.sin(ph)*.04*st.walk, Math.sin(ph*.5)*.03*st.walk);
    rot(B.abdomen,.06+Math.sin(T*1.3)*.05+st.rear*.25-st.recoil*.1+st.dead*.2, Math.sin(T*.7)*.06, 0);
    rot(B.spine,-st.rear*.1-st.cast*.15+st.stab*.25+Math.sin(T*1.1)*.03, lookY*.2*calm, 0);
    rot(B.spine1,-st.cast*.12+st.stab*.1+st.dead*.5, lookY*.15*calm, Math.sin(T*.9)*.03);
    rot(B.chest,-st.cast*.18+Math.sin(T*1.6)*.025, lookY*.15*calm+st.look*.3, 0);
    rot(B.neck,st.cast*.1+st.dead*.3, lookY*.25*calm, 0);
    rot(B.head,-st.cast*.2-st.rear*.15+st.recoil*.25+Math.sin(T*2.3)*.03, lookY*.35*calm, Math.sin(T*.8)*.05);
    // แขน: ว่างๆ ก็ขยับกรงเล็บช้าๆ · ร่ายเวท = ยกสูงชี้ไปหน้า · แทง = เหวี่ยงลง
    const sw=Math.sin(T*1.7), sw2=Math.sin(T*1.3+1);
    rot(B.armR,-st.cast*.9+st.stab*.6+sw*.08, st.cast*.4, -.1-st.cast*.5+st.stab*.4+st.dead*.6);
    rot(B.foreR,-st.cast*.6-st.stab*.3+sw2*.1, 0, st.cast*.3);
    rot(B.handR,sw*.15-st.cast*.3,0,0);
    rot(B.armL,-st.cast*.9+st.stab*.6-sw2*.08, -st.cast*.4, .1+st.cast*.5-st.stab*.4-st.dead*.6);
    rot(B.foreL,-st.cast*.6-st.stab*.3-sw*.1, 0, -st.cast*.3);
    rot(B.handL,-sw2*.15-st.cast*.3,0,0);
    // ขา: เดินสลับ 2 กลุ่ม (ยกขา+กวาดไปหน้า) · ขาหน้าใช้แทงได้ · ตายแล้วขาหงิกเข้าหาตัว
    LEGS.forEach(L=>{
      const p=ph+(L.grp?Math.PI:0), swing=Math.sin(p)*.28*st.walk, lift=Math.max(0,Math.cos(p))*.45*st.walk;
      let liftA=lift+Math.max(0,Math.sin(T*.8+L.i*1.7+(L.sd==='L'?0:2)))*.04*calm+st.crouch*-.25+st.rear*(L.i>2?-.1:.25)+st.dead*.9;
      let knee=lift*.6+st.crouch*.35+st.dead*1.2, yaw=swing;
      if(L.front){liftA+=st.stab*1.1+st.rear*.5; knee+=-st.stab*.9+st.rear*.3; yaw+=st.stab*.2*(L.sd==='L'?1:-1);}
      q.setFromAxisAngle(up,yaw); q2.setFromAxisAngle(L.ax,-liftA); L.a.quaternion.copy(q).multiply(q2);
      L.b.quaternion.setFromAxisAngle(L.ax,knee); if(L.c)L.c.quaternion.setFromAxisAngle(L.ax,-knee*.5+st.dead*.6);
    });
    mats.forEach(mt=>{mt.emissiveIntensity=st.cast*.55*(.8+.2*Math.sin(T*14))+Math.max(0,Math.sin(T*2.1))*.05;});
  };
  w.userData.k=1; w.userData.inner=m;
  return w;
}
function spiderSet(u,o,d){const R=u.rig;Object.keys(o).forEach(k=>{R.tg[k]=o[k];R.rate[k]=1/Math.max(.05,d||.25);});}
function spiderHand(u,sd){const b=u.rig.B['hand'+(sd||'R')]||u.rig.B.head;b.updateMatrixWorld(true);return b.getWorldPosition(new THREE.Vector3());}
/* ---------- เขี้ยวพิษ: ยืดตัว ยกขาหน้า แล้วแทงลงพร้อมกรงเล็บ ---------- */
async function spiderStrike(u,t,onHit){
  const dir=new THREE.Vector3(Math.sin(u.w.rotation.y),0,Math.cos(u.w.rotation.y)), home=u.w.position.clone(), K=u.w.scale.x;
  spiderSet(u,{rear:1,stab:0},.18); await wait(260);
  spiderSet(u,{rear:0,stab:1},.07);
  await tween(.12,k=>u.w.position.copy(home).addScaledVector(dir,.45*K*k),easeIn);
  const hp=t.w.position.clone().setY(.9); hitArc(hp,-.9,0xc58cff,1.2); particles(hp,0xb070ff,14,1.6,.07,.4,.9);
  onHit(); shake=Math.max(shake,.14); await wait(170);
  spiderSet(u,{stab:0},.25); await tween(.3,k=>u.w.position.copy(home).addScaledVector(dir,.45*K*(1-k)),easeOut);
}
/* ---------- ลูกแก้วมนตร์ม่วง: ยกแขนร่ายเวท ยิงลูกแก้วใส่ศัตรูทุกตัว ---------- */
async function spiderCast(u,foes,onHitOne){
  spiderSet(u,{cast:1,rear:.4},.25);
  const orbs=[]; const hR=spiderHand(u,'R'), hL=spiderHand(u,'L');
  [hR,hL].forEach(h=>{const g=glow(scene,0xb070ff,.35,[h.x,h.y,h.z],1);orbs.push(g);});
  await tween(.45,k=>{orbs.forEach((g,i)=>{const h=spiderHand(u,i?'L':'R');g.position.copy(h);g.scale.setScalar(.2+k*.9);});});
  orbs.forEach(g=>{scene.remove(g);g.material.dispose();});
  shake=Math.max(shake,.08);
  await Promise.all(foes.map((f,i)=>new Promise(res=>setTimeout(async()=>{
    const from=spiderHand(u,i%2?'L':'R'), g=glow(scene,0xc58cff,.5,[from.x,from.y,from.z],1), to=f.w.position.clone().setY(.9), mid=from.clone().lerp(to,.5).add(new THREE.Vector3(0,1.2,0));
    await tween(.42,k=>{const a=from.clone().lerp(mid,k),b=mid.clone().lerp(to,k);g.position.copy(a.lerp(b,k));if(Math.random()<.6)particles(g.position,0x9a4dff,1,.3,.05,.2,.6);},t=>t);
    scene.remove(g);g.material.dispose();particles(to,0xb070ff,16,2,.08,.3,.9);particles(to,0x2a0a3a,8,1.2,.12,-.2,.7);
    if(f.alive)onHitOne(f); res();},i*110/SPEED))));
  spiderSet(u,{cast:0,rear:0},.35); await wait(200);
}
/* ---------- กระโจนใยมรณะ: ย่อตัว กระโดดโค้งลงกลางกลุ่มศัตรู ---------- */
async function spiderLeap(u,c,foes,onHit){
  const from=u.w.position.clone(), K=u.w.scale.x; await faceTo(u,c,.12);
  const land=from.clone().lerp(c,.85);
  spiderSet(u,{crouch:1},.15); await wait(280);
  spiderSet(u,{crouch:0,rear:.3},.08); particles(tmpV.copy(from).setY(.1),0xb8a888,18,2,.3,-.2,.5);
  await tween(.55,k=>{u.w.position.lerpVectors(from,land,k);u.w.position.y=Math.sin(k*Math.PI)*1.8*K;},easeIO);
  u.w.position.y=0; spiderSet(u,{crouch:.8,rear:0},.06); shake=Math.max(shake,.24);
  shockRing(c,0xb070ff); if(typeof scorch==='function')scorch(c,1.4); particles(tmpV.copy(c).setY(.1),0xb8a888,26,2.4,.35,-.2,.55); particles(tmpV.copy(c).setY(.4),0x9a4dff,20,2,.08,.4,.9);
  onHit(); await wait(260); spiderSet(u,{crouch:0},.3);
  await tween(.5,k=>u.w.position.lerpVectors(land,from,k),easeIO);
}
function spiderReact(u){spiderSet(u,{recoil:1},.06);setTimeout(()=>spiderSet(u,{recoil:0},.3),170/SPEED);}
async function spiderDie(u){spiderSet(u,{rear:.8},.1);await wait(220);spiderSet(u,{rear:0,dead:1,cast:0,stab:0},.45);await wait(520);shake=Math.max(shake,.12);
  particles(tmpV.copy(u.w.position).setY(.3),0x9a4dff,22,1.6,.08,.3,.8);}
async function spiderVictory(u){if(!u.alive)return;u.busy=true;spiderSet(u,{rear:1,cast:1},.3);await wait(1200);spiderSet(u,{rear:0,cast:0},.4);u.busy=false;}
