/* ================= สนามรบ: ป่าไผ่ยามเย็น ================= */
let SPEED=1, HS=1, hsTimer=null;
const OCC=[];
const wait=ms=>sleep(ms/SPEED);
const SM=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
const BT={
  ground:srgb(canvasTex(1024,(x,s)=>{x.fillStyle='#4f7d3a';x.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){const cx=Math.random()*s,cy=Math.random()*s,r=30+Math.random()*120,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=Math.random()<.5?'110,150,60':'60,95,40';g.addColorStop(0,`rgba(${c},.35)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s*.26);g.addColorStop(0,'rgba(150,120,80,.95)');g.addColorStop(.75,'rgba(135,110,75,.8)');g.addColorStop(1,'rgba(120,100,70,0)');x.fillStyle=g;x.save();x.translate(s/2,s/2);x.scale(1.6,1);x.translate(-s/2,-s/2);x.fillRect(0,0,s,s);x.restore();
    x.lineWidth=1.3;for(let i=0;i<26000;i++){const px=Math.random()*s,py=Math.random()*s;const dx=(px-s/2)/1.6,dy=py-s/2;if(Math.hypot(dx,dy)<s*.2)continue;const h=80+Math.random()*35,l=24+Math.random()*26;x.strokeStyle=`hsla(${h},48%,${l}%,.6)`;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*3,py-3-Math.random()*6);x.stroke();}
    for(let i=0;i<4000;i++){const a=Math.random()*6.28,r=Math.random()*s*.22;x.fillStyle=`rgba(${80+Math.random()*60|0},${60+Math.random()*40|0},40,.35)`;x.fillRect(s/2+Math.cos(a)*r*1.6,s/2+Math.sin(a)*r,2,2);}})),
  sky:srgb(canvasTex(8,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#3b4f7a');g.addColorStop(.4,'#b77a6a');g.addColorStop(.6,'#f2a65e');g.addColorStop(1,'#f6d19a');x.fillStyle=g;x.fillRect(0,0,s,s);})),
  mist:TX.mist,
};
/*__MAP__*/
/* ================= ข้อมูลมอนสเตอร์และด่าน ================= */
const SPECIES={
  kazemaru:{name:'คาเซะมารุ',evo:0,base:{hp:64,atk:20,def:8,spd:26}},
  amateru:{name:'อามาเทรุ',evo:1,dragon:1,base:{hp:190,atk:74,def:26,spd:60}},
  kuroga:{name:'คุโรกะ',evo:1,rig:'kuroga',base:{hp:130,atk:48,def:16,spd:50}},
  hakuneko:{name:'ฮาคุเนโกะ',evo:1,rig:'hakuneko',base:{hp:120,atk:51,def:14,spd:56}},
  morihime:{name:'โมริฮิเมะ',evo:1,rig:'morihime',base:{hp:110,atk:32,def:17,spd:38}},
  yorugumo:{name:'โยรุกุโมะ',evo:1,spider:1,base:{hp:100,atk:34,def:14,spd:38}},
  kazekiri:{name:'คาเซะคิริ',evo:1,base:{hp:102,atk:34,def:13,spd:42}},
};
// สกิลและธาตุมาจาก gamedata.js (ใช้ร่วมกับคลังมอนสเตอร์)
Object.keys(SPECIES).forEach(k=>{SPECIES[k].skills=SKILLS[k];SPECIES[k].el=EL_OF[k];});
const TEAM=[{sp:'kuroga',lv:6},{sp:'amateru',lv:6},{sp:'kazekiri',lv:6},{sp:'kazemaru',lv:5},{sp:'kazemaru',lv:4},{sp:'kazemaru',lv:4}];
/* ด่านแบบ idle: ด่านที่ n ต้องการพลังทีม REQ(n) (ตรงกับเซิร์ฟเวอร์ _req) ด่านที่ 10,20,... เป็นบอส */
const POWB=sp=>{const b=SPECIES[sp].base;return b.hp+b.atk*4+b.def*3+b.spd*2;};
const REQ=n=>Math.round(1400*Math.pow(1.04,Math.max(1,n)-1));
const stLabel=n=>Math.ceil(n/10)+'-'+(((n-1)%10)+1);
const teamPow=()=>Math.round(TEAM.reduce((s,d)=>s+POWB(d.sp)*(1+.1*(d.lv-1)),0));
// จัดศัตรูให้พลังรวมประมาณ E
// ธาตุของศัตรู: เปลี่ยนไปตามด่านและคลื่น ให้การจัดทีมตามธาตุมีผล
const EN_ELS=['ลม','ดิน','น้ำ','ไฟ','มืด','แสง'];
const enemyEl=(n,i)=>EN_ELS[(n+i*2)%EN_ELS.length];
function makeWave(defs,E,el){
  const sum=defs.reduce((s,d)=>s+POWB(d.sp),0), f=Math.max(.35,E/sum);
  const lv=Math.max(1,Math.round(1+10*(f-1))), mul=f/(1+.1*(lv-1));
  return defs.map(d=>Object.assign({lv,mul},el?{el}:{},d));
}
function idleStage(n,E){
  const M='kazemaru',K='kazekiri', mk=(nm,nk)=>{const a=Array(nm).fill(M);for(let i=0;i<nk;i++)a.splice(Math.floor((i+.5)*a.length/(nk+.001)),0,K);return a;};
  const pool=n<4?[mk(6,0),mk(7,1),mk(8,1)]:n<10?[mk(8,1),mk(9,2),mk(10,2)]:[mk(9,2),mk(10,3),mk(11,3)];
  const cap=typeof LOW!=='undefined'&&LOW?7:99;
  return {id:stLabel(n),name:'หน้าประตูนครอัมพร',waves:pool.map((k,i)=>makeWave(k.slice(0,cap).map(sp=>({sp,show:n})),E,enemyEl(n,i)))};
}
function bossStage(n){
  const R=REQ(n);
  return {id:stLabel(n),name:'ประตูแดงของนินจาชาด',waves:[makeWave(['kazemaru','kazemaru','kazekiri','kazemaru','kazemaru','kazekiri','kazemaru','kazemaru'].map(sp=>({sp,show:n})),R*.55,enemyEl(n,0)),makeWave(['kazemaru','kazemaru','kazemaru',null,'kazemaru','kazemaru','kazemaru'].map(sp=>sp?{sp,show:n}:{sp:'kazekiri',boss:1,show:n}),R*.85,EN_ELS[(Math.ceil(n/10)+3)%EN_ELS.length])]};
}
const DRAGON_BATTLE_K=2; // มังกรในสนามรบใหญ่เป็น 2 เท่า (สัตว์ในตำนาน)
const P_SLOTS=[[-12,0],[-14,-2.6],[-14,2.6],[-16.5,-5],[-16.5,0],[-16.5,5]], E_SLOTS=[[12,0],[14,-2.6],[14,2.6]];
const FACE_P=Math.PI/2-.35, FACE_E=-Math.PI/2+.35;

/* ================= ยูนิต ================= */
let UNITS=[], PICKU=[];
function tintCrimson(w,boss){
  const red=new THREE.Color(boss?0x6a1010:0x5a1616);
  const cache=new Map(), tint=(m,f)=>{if(!cache.has(m)){const n=m.clone();f(n);cache.set(m,n);}return cache.get(m);};
  w.traverse(o=>{
    if(o.isMesh&&o.material&&!o.material.isMeshBasicMaterial&&o.material.color){o.material=tint(o.material,n=>{const c=n.color,l=(c.r+c.g+c.b)/3;if(l<.3&&!(n.metalness>.5))c.lerp(red,.6);});}
    else if(o.isMesh&&o.material&&o.material.isMeshBasicMaterial){o.material=tint(o.material,n=>{if(n.color.g>.8&&n.color.r<.95)n.color.set(0xff6a55);});}
    if(o.isSprite){o.material=o.material.clone();o.material.color.set(0xff5040);}
    if(o.isPointLight)o.color.set(0xff5040);
  });
}
// รวมชิ้นส่วนที่ขยับไปด้วยกัน (ลูกของข้อต่อเดียวกัน วัสดุเดียวกัน) เป็นชิ้นเดียว = วาดน้อยครั้งลง
function mergeRigid(root){
  const nodes=[];root.traverse(o=>{if(!o.isMesh&&o.children&&o.children.length>1)nodes.push(o);});
  nodes.forEach(node=>{
    const groups=new Map();
    node.children.forEach(c=>{if(!c.isMesh||c.isSkinnedMesh||c.children.length||!c.geometry||Array.isArray(c.material)||c.material.transparent||!c.visible)return;
      if(!groups.has(c.material))groups.set(c.material,[]);groups.get(c.material).push(c);});
    groups.forEach((list,mat)=>{if(list.length<2)return;let n=0;const gs=list.map(c=>{c.updateMatrix();const g=(c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone());g.applyMatrix4(c.matrix);n+=g.attributes.position.count;return g;});
      if(!gs.every(g=>g.attributes.normal&&g.attributes.uv))return;
      const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
      gs.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);o+=g.attributes.position.count;});
      const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('uv',new THREE.BufferAttribute(U,2));G.computeBoundingSphere();
      const m=new THREE.Mesh(G,mat);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;m.userData.outline=list[0].userData.outline;node.add(m);list.forEach(c=>node.remove(c));});
  });
}
function makeUnit(side,def,slot){
  const sp=SPECIES[def.sp], f=(1+.1*(def.lv-1))*(def.mul||1), bm=def.boss?1.6:1;
  const w=sp.dragon&&DRAGON?buildDragon():sp.spider&&SPIDER?buildSpider():buildMonster(sp.rig||sp.evo);
  const SPD=!!(sp.spider&&SPIDER);
  const inner=w.userData.inner, rig=inner.userData.rig;
  if(def.boss){w.userData.k*=1.3;w.scale.setScalar(w.userData.k);}
  if(side==='E')tintCrimson(w,def.boss);
  if(side==='E'&&(inner.userData.meshy||SPD))w.traverse(o=>{if(o.isSkinnedMesh){o.material.color.set(def.boss?0xe0705f:0xe89080);o.material.emissive.set(def.boss?0x140000:0x0a0000);}});
  if(sp.evo&&!sp.dragon&&!SPD){(inner.userData.swords||[]).forEach(s=>s.visible=true);
    if(side==='E'&&!inner.userData.meshy){const em=new THREE.MeshBasicMaterial({color:0xff4a3a});[-1,1].forEach(sx=>{P(rig.head,B1,em,[sx*.042,.03,.1],[.045,.009,.01],[0,sx*-.25,sx*.35]);glow(rig.head,0xff4030,.08,[sx*.042,.03,.11],.8);});}}
  if(!inner.userData.meshy&&!sp.dragon&&!SPD)mergeRigid(w);
  if(side==='P')addAura(w,def.sp,def.el);
  const [x,z]=(side==='P'?P_SLOTS:E_SLOTS)[slot];
  w.position.set(x+(def.boss?.6:0),0,z); w.rotation.y=side==='P'?FACE_P:FACE_E; scene.add(w);
  const u={id:UNITS.length,side,sp:def.sp,evo:sp.evo,boss:!!def.boss,lv:def.show||def.lv,
    name:side==='P'?sp.name:(def.boss?'หัวหน้านินจาชาด':sp.evo?'นินจาชาด':'นินจาชาดจิ๋ว'),
    maxHp:Math.round(sp.base.hp*f*bm), atk:Math.round(sp.base.atk*f*(def.boss?.85:1)), def:Math.round(sp.base.def*f), spd:sp.base.spd+def.lv,
    skills:skillsAt(def.sp,def.stars||0), stars:def.stars||0, cds:{}, gauge:Math.random()*30, stun:0, alive:true, w, inner, rig, home:new THREE.Vector3(x,0,z), face:w.rotation.y};
  u.hp=u.maxHp; u.el=def.el||sp.el; u.pas=(u.skills.find(s=>s.type==='passive')||{}).passive||null; u.revived=false;
  const DK=sp.dragon?DRAGON_BATTLE_K:1; if(sp.dragon){w.scale.setScalar(DK);const R=inner.userData.rig;if(R&&R.st){R.st.alt=R.tg.alt=2.6;}}
  u.rad=sp.dragon?1.55*DK:u.evo?(u.boss?.8:.5):.45; if(sp.dragon){u.barY=4.95*DK;u.camS=2.1*DK;} u.reach=sp.dragon?1.9*DK:inner.userData.meshy?1.25:u.evo?1.0:.72;
  u.mats=[];w.traverse(o=>{if(o.isMesh){o.userData.unit=u.id;PICKU.push(o);if(o.material&&o.material.emissive&&u.mats.indexOf(o.material)<0)u.mats.push(o.material);}});
  if(sp.dragon){u.dragon=true;u.stance=[];}
  else if(SPD){u.spider=true;u.stance=[];u.rad=.8;u.reach=1.2;u.barY=2.05;}
  else if(u.evo)u.stance=[[rig.hips.position,'y',.78],[rig.hips.rotation,'y',.32],[rig.torso.rotation,'x',.14],[rig.torso.rotation,'y',0],[rig.torso.rotation,'z',.05],[rig.head.rotation,'y',-.3],[rig.head.rotation,'x',-.05],
    [rig.legs[0].th.rotation,'z',-.45],[rig.legs[0].th.rotation,'x',-.4],[rig.legs[0].kn.rotation,'x',.75],[rig.legs[1].th.rotation,'z',.72],[rig.legs[1].th.rotation,'x',.25],[rig.legs[1].kn.rotation,'x',.15],
    [rig.R.sh.rotation,'z',-1.5],[rig.R.sh.rotation,'x',-.35],[rig.R.el.rotation,'z',-1.45],[rig.L.sh.rotation,'z',.95],[rig.L.sh.rotation,'x',-.75],[rig.L.el.rotation,'z',.2]];
  else u.stance=rig.base;
  applyPose(u.stance);
  u.bar=makeBar(u); addBlob(u);
  UNITS.push(u); return u;
}
const BLOBTEX=canvasTex(128,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.45,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,s,s);});
function addBlob(u){const r=u.evo?(u.boss?.95:.72):.62;const b=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),new THREE.MeshBasicMaterial({map:BLOBTEX,transparent:true,depthWrite:false,opacity:.6,fog:false}));b.rotation.x=-Math.PI/2;b.renderOrder=1;scene.add(b);u.blob=b;}
function blobUpdate(){UNITS.forEach(u=>{if(!u.blob)return;const w=u.w;u.blob.visible=w.visible;u.blob.position.set(w.position.x,.025,w.position.z);const h=Math.max(0,w.position.y);u.blob.material.opacity=.6*Math.max(0,1-h/2.2);u.blob.scale.setScalar(1-Math.min(.4,h*.12));});}
function removeUnit(u){scene.remove(u.w);u.bar.remove();if(u.row)u.row.remove();if(u.blob){scene.remove(u.blob);u.blob.geometry.dispose();u.blob.material.dispose();}}

/* ================= แอนิเมชันต่อสู้ ================= */
const tmpV=new THREE.Vector3();
function faceTo(u,p,dur){const want=Math.atan2(p.x-u.w.position.x,p.z-u.w.position.z);let from=u.w.rotation.y,d=want-from;d=Math.atan2(Math.sin(d),Math.cos(d));return tween(dur||.15,t=>u.w.rotation.y=from+d*t,easeOut);}
async function hop(u,to,dur,h){
  if(u.dragon)return dragonFly(u,to,dur*1.35,h*1.1+.4);
  const from=u.w.position.clone(); faceTo(u,to,.12);
  const A=u.inner.userData; if(A.clipW)A.clipW(0);
  if(u.evo){const r=u.rig;poseTo([[r.legs[0].kn.rotation,'x',1.5],[r.legs[1].kn.rotation,'x',1.5],[r.legs[0].th.rotation,'x',-.9],[r.legs[1].th.rotation,'x',-.6],[r.hips.position,'y',.62]],dur*.4);}
  else{u.inner.userData.acting=true;}
  await tween(dur,t=>{u.w.position.lerpVectors(from,to,t);u.w.position.y=Math.sin(t*Math.PI)*h;},easeIO);
  u.w.position.y=0; particles(tmpV.copy(to).setY(.05),0xb8a888,8,1,.22,-.2,.4);
  if(u.evo)poseTo(u.stance,.25);
  if(A.clipW){A.clipW(1);}
}
function frontOf(t,att){const dir=att.home.x<t.w.position.x?-1:1;return new THREE.Vector3(t.w.position.x+dir*(t.rad+att.reach),0,t.w.position.z+.1);}
// กันตัวละครซ้อนกัน: ดันตัวที่อยู่ห่างบ้านมากกว่าออกไป
function separate(){const L=UNITS.filter(u=>u.alive&&u.w.visible);for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(a.w.position.y>.3||b.w.position.y>.3)continue;const dx=b.w.position.x-a.w.position.x,dz=b.w.position.z-a.w.position.z,d=Math.hypot(dx,dz),min=a.rad+b.rad+.15;if(d>=min||d<1e-4)continue;const push=(min-d),ax=a.w.position.distanceTo(a.home),bx=b.w.position.distanceTo(b.home);const m=ax>bx?a:b,s=m===a?-1:1;m.w.position.x+=s*dx/d*push*.5;m.w.position.z+=s*dz/d*push*.5;}}
function hitArc(pos,rot,color,scale){
  const g=new THREE.Group();g.position.copy(pos);g.rotation.set(-.2,0,rot);scene.add(g);
  const mk=(tube,op)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,tube,6,48,Math.PI*1.1),new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));g.add(m);return m;};
  const a=mk(.02,1),b=mk(.07,.35);
  tween(.4,k=>{g.scale.setScalar((scale||1)*(.6+k*.9));a.material.opacity=1-k;b.material.opacity=.35*(1-k);g.rotation.z=rot-k*.6;},easeOut).then(()=>{scene.remove(g);[a,b].forEach(o=>{o.geometry.dispose();o.material.dispose();});});
}
async function strike(u,i,onHit){
  if(u.dragon)return dragonBite(u,null,onHit);
  if(u.spider)return spiderStrike(u,{w:{position:u.w.position.clone().add(new THREE.Vector3(Math.sin(u.w.rotation.y),0,Math.cos(u.w.rotation.y)).multiplyScalar(1.4))}},onHit);
  const r=u.rig, A=u.inner.userData;
  if(A.play){const nm=i%2?'slash2':'slash', sp=1.35, inf=A.clipInfo(nm);
    A.play(nm,{speed:sp,fade:.1}); await wait(inf.main/sp*1000); onHit(); hitStop(); await wait(Math.max(120,(inf.dur-inf.main)/sp*1000*.45)); return;}
  if(u.evo){
    const R=r.R,L=r.L;
    if(i%2===0){await poseTo([[r.torso.rotation,'y',-.5],[R.sh.rotation,'z',-2.5],[R.el.rotation,'z',-.6],[R.sh.rotation,'x',-.2]],.14);
      poseTo([[r.torso.rotation,'y',.5],[R.sh.rotation,'z',-.35],[R.sh.rotation,'x',-1.3],[R.el.rotation,'z',-.15]],.09);}
    else{await poseTo([[r.torso.rotation,'y',.4],[L.sh.rotation,'z',2.3],[L.sh.rotation,'x',-.3]],.12);
      poseTo([[r.torso.rotation,'y',-.4],[L.sh.rotation,'z',-.25],[L.sh.rotation,'x',-1.35]],.09);}
    await wait(70); onHit(); await wait(150);
  } else {
    u.inner.userData.acting=true;
    await poseTo([[r.R.a.rotation,'z',-2.9],[r.R.a.rotation,'x',.3]],.14);
    const w=u.w; tween(.15,t=>w.position.y=Math.sin(t*Math.PI)*.25);
    poseTo([[r.R.a.rotation,'z',-.4],[r.R.a.rotation,'x',-1.3]],.09);
    await wait(70); onHit(); await wait(160);
  }
}
async function strikeCombo(u,onHit){
  const A=u.inner.userData, inf=A.clipInfo('combo'), sp=1.2; let last=0;
  A.play('combo',{speed:sp,fade:.1});
  for(const h of inf.hits){await wait((h-last)/sp*1000); last=h; onHit(); hitStop();}
  await wait(Math.max(150,(inf.dur-last)/sp*1000*.4));
}
// หยุดภาพสั้น ๆ ตอนดาบโดน: ชะลอเฉพาะภาพ ไม่ยืดเวลารอของลำดับท่า
function hitStop(){if(RT){shake=Math.max(shake,.08);return;}HS=.08;clearTimeout(hsTimer);hsTimer=setTimeout(()=>{HS=1;},70);shake=Math.max(shake,.12);}
async function recoverStance(u){if(u.dragon||u.spider){u.inner.userData.acting=false;return;}await poseTo(u.stance,.3);u.inner.userData.acting=false;}
function flashUnit(u,hex){u.mats.forEach(m=>{if(m.userData.e0==null){m.userData.e0=m.emissive.getHex();m.userData.ei0=m.emissiveIntensity;}m.emissive.setHex(hex);m.emissiveIntensity=.9;});setTimeout(()=>u.mats.forEach(m=>{m.emissive.setHex(m.userData.e0);m.emissiveIntensity=m.userData.ei0;}),110/SPEED);}
async function react(u,fromX){
  if(RT){flashUnit(u,0xff2a2a);if(u.dragon)dragonReact(u);else if(u.spider)spiderReact(u);else if(!u.busy&&u.inner.userData.play)u.inner.userData.play('hit',{speed:1.4,fade:.06});
    else if(!u.busy&&!u.evo)tween(.12,t=>u.inner.rotation.x=-.35*t).then(()=>tween(.3,t=>u.inner.rotation.x=-.35*(1-t)));return;}
  const dir=u.w.position.x>fromX?1:-1, p0=u.w.position.x;
  flashUnit(u,0xff2a2a);
  tween(.1,t=>u.w.position.x=p0+dir*.3*t,easeOut).then(()=>tween(.3,t=>u.w.position.x=p0+dir*.3*(1-t),easeIO));
  if(u.dragon){dragonReact(u);}
  else if(u.spider){spiderReact(u);}
  else if(u.inner.userData.play){u.inner.userData.play('hit',{speed:1.4,fade:.06});}
  else if(u.evo){poseTo([[u.rig.torso.rotation,'x',-.4],[u.rig.head.rotation,'x',-.4]],.07);await wait(140);poseTo(u.stance,.3);}
  else{tween(.12,t=>u.inner.rotation.x=-.35*t).then(()=>tween(.3,t=>u.inner.rotation.x=-.35*(1-t)));}
}
async function die(u){
  u.alive=false; u.bar.hidden=true; rowGone(u); if(u.w.userData.aura)u.w.userData.aura.visible=false;
  const A=u.inner.userData;
  if(u.dragon){await dragonDie(u);}
  else if(u.spider){await spiderDie(u);}
  else if(A.play){const inf=A.clipInfo('death');A.play('death',{speed:1.25,hold:true,fade:.08});await wait(inf.dur/1.25*1000*.85);}
  else{
  if(u.evo)poseTo([[u.rig.torso.rotation,'x',.5],[u.rig.hips.position,'y',.55],[u.rig.legs[0].kn.rotation,'x',1.3],[u.rig.legs[1].kn.rotation,'x',1.2]],.25);
  await tween(.45,t=>{u.inner.rotation.x=-1.35*t;u.w.position.y=-.1*t;},easeIn);}
  shake=Math.max(shake,.06);
  particles(tmpV.copy(u.w.position).setY(.3),0xb8b0a0,16,1.2,.28,-.3,.45);
  await wait(350);
  const k=u.w.scale.x;
  particles(tmpV.copy(u.w.position).setY(.8),u.side==='E'?0xff7a5a:0x7fffe0,20,1.6,.06,-.8,.8);
  await tween(.35,t=>u.w.scale.setScalar(Math.max(.001,k*(1-t))),easeIn);
  u.w.visible=false;
}
function star3(){const m=new THREE.Mesh(STAR,starMat);m.rotation.x=Math.PI/2;scene.add(m);return m;}
async function throwAt(u,t){
  const from=new THREE.Vector3(); (u.evo?u.rig.R.hd:u.rig.R.hd).getWorldPosition(from);
  const to=t.w.position.clone().setY(t.evo?1.3:.8);
  if(ENV)starMat.envMap=ENV;
  const s=star3(); s.position.copy(from);
  const tr=setInterval(()=>particles(s.position.clone(),0xfff0c0,1,.1,.035,0,.6),25);
  await tween(.32,k=>{s.position.lerpVectors(from,to,k);s.position.y+=Math.sin(k*Math.PI)*.4;s.rotation.z+=.7;});
  clearInterval(tr); scene.remove(s);
}
function shockRing(pos,color){const m=new THREE.Mesh(new THREE.RingGeometry(.3,.45,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.copy(pos).setY(.04);scene.add(m);tween(.55,k=>{m.scale.setScalar(1+k*7);m.material.opacity=.9*(1-k);},easeOut).then(()=>{scene.remove(m);m.geometry.dispose();m.material.dispose();});}

/* ================= คำนวณดาเมจ ================= */
// ทีมได้บัฟโจมตีจากสกิลติดตัว (ไม่ซ้อนกัน ใช้ค่าสูงสุดของทีม)
let elTipT=0;
function teamAtkOf(side){let m=0;UNITS.forEach(o=>{if(o.alive&&o.side===side&&o.pas&&o.pas.teamAtk)m=Math.max(m,o.pas.teamAtk);});return m;}
function dealHit(att,t,skill){
  if(!t.alive)return;
  const ap=att.pas||{}, tp=t.pas||{}, em=elMul(att.el,t.el);
  const crit=Math.random()<.15+(ap.crit||0);
  let d=att.atk*skill.mult*(.9+Math.random()*.2)*(crit?1.5:1)*60/(60+t.def);
  d*=em*(1+teamAtkOf(att.side)+(typeof raceAtkBonus==='function'?raceAtkBonus(att.side):0));
  if(ap.dmgLow&&t.hp<t.maxHp*.5)d*=1+ap.dmgLow;
  if(tp.dr)d*=1-tp.dr;
  d=Math.max(1,Math.round(d));
  t.hp=Math.max(0,t.hp-d);
  popNum(t,d+(em>1?' ▲':em<1?' ▼':''),crit?'crit':em>1?'dmg adv':em<1?'dmg weak':'dmg');
  if(em>1&&performance.now()-elTipT>2500){elTipT=performance.now();setTimeout(()=>popNum(t,'แพ้ทางธาตุ!','info adv'),120/SPEED);}
  shake=Math.max(shake,crit?.14:.07);
  particles(tmpV.copy(t.w.position).setY(t.evo?1.3:.8),crit?0xffd27a:elFx(att),crit?16:9,2,.05,1.4);
  hitArc(tmpV.copy(t.w.position).setY(t.evo?1.35:.8).add(new THREE.Vector3(0,0,.3)),(Math.random()-.5)*1.6+(att.side==='P'?.4:-.4)+Math.PI*(Math.random()<.5?0:1),crit?0xffd27a:elFx(att),t.boss?1.4:1);
  if(t.hp<=0&&tp.revive&&!t.revived){ // สกิลติดตัว: รอดตาย 1 ครั้ง
    t.revived=true; t.hp=Math.round(t.maxHp*tp.revive);
    setTimeout(()=>popNum(t,'เก้าชีวิต! +'+t.hp,'heal'),200/SPEED);
    particles(tmpV.copy(t.w.position).setY(1),0xfff0a0,26,1.8,.06,1.2,.9); shockRing(tmpV.copy(t.w.position),0xffe08a);
  }
  if(skill.stun&&t.hp>0&&Math.random()<skill.stun){t.stun=1;setTimeout(()=>popNum(t,'มึน','info'),250/SPEED);}
  updateBar(t);
  if(t.hp<=0)die(t); else react(t,att.w.position.x);
}
// ท่าทางอิงความเร็วเกม (x1/x2)
function poseTo(list,d,z){const k=Math.pow(5.2/Math.max(d,.06),2);list.forEach(([o,p,v])=>{const c=channel(o,p);c.t=v;c.k=k;c.z=z==null?.78:z;});return wait(d*1000);}
