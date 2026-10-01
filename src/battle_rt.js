/* ================= ต่อสู้แบบเรียลไทม์ =================
   ทุกตัววิ่งเข้าหาศัตรูที่ใกล้ที่สุด ตีตามจังหวะความเร็วของตัวเอง ใช้ท่าพิเศษเมื่อคูลดาวน์ครบ
   โหมดบอส: ท่าไม้ตายของทีม (ท่าสุดท้าย) กดเองได้ หรือเปิดออโต้ */
let RT=null;
const RT_MOVE=3.4;
function rtInit(u){
  u.busy=false; u.moving=false; u.stunT=0; u.queued=null; u.dust=0;
  u.atkT=.2+Math.random()*.7; u.skT={};
  u.skills.forEach(s=>{if(s.cd)u.skT[s.id]=s.cd*1.6*(.5+Math.random()*.6);});
  return u;
}
const actSk=u=>u.skills.filter(s=>s.type!=='passive');
const ultOf=u=>{const a=actSk(u);return a[a.length-1];};
function nearestFoe(u){
  let best=null,bd=1e9;
  UNITS.forEach(o=>{if(!o.alive||o.side===u.side)return;const d=Math.hypot(o.w.position.x-u.w.position.x,o.w.position.z-u.w.position.z);if(d<bd){bd=d;best=o;}});
  return [best,bd];
}
function turnToward(u,x,z,dt){
  const want=Math.atan2(x-u.w.position.x,z-u.w.position.z);let d=want-u.w.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));
  if(u.dragon)u.rig.tg.bank=Math.max(-1,Math.min(1,-d*1.8));
  u.w.rotation.y+=d*Math.min(1,dt*10);
}
function stepToward(u,x,z,dist,dt,T){
  const p=u.w.position, dx=x-p.x, dz=z-p.z, L=Math.hypot(dx,dz)||1, st=Math.min(dist,RT_MOVE*(u.dragon?1.15:1)*dt);
  if(u.dragon){ // บินแบบมีแรงเฉื่อย: เร่ง/เลี้ยวค่อยเป็นค่อยไป
    u.vel=u.vel||new THREE.Vector3(); const sp=RT_MOVE*1.25*Math.min(1,dist/3+.3); const des=tmpV.set(dx/L*sp,0,dz/L*sp);
    u.vel.lerp(des,Math.min(1,dt*2.2)); p.x+=u.vel.x*dt; p.z+=u.vel.z*dt;
    const vl=u.vel.length(); if(vl>.2){const want=Math.atan2(u.vel.x,u.vel.z);let d=want-u.w.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));u.w.rotation.y+=d*Math.min(1,dt*3.5);u.rig.tg.bank=Math.max(-1,Math.min(1,-d*2.2));}
    u.rig.tg.pitch=Math.min(.5,vl*.08);
  } else { p.x+=dx/L*st; p.z+=dz/L*st; turnToward(u,x,z,dt); }
  const A=u.inner.userData, MC=hasClip(u,'run');
  if(u.spider)u.rig.tg.walk=1;
  if(!u.moving){if(u.dragon)dragonSet(u,{flapSpd:1.9,flapAmp:.8,lunge:.45,legF:-.3,spread:.3},.15);else if(MC)A.play('run',{loop:true,fade:.15,speed:1.15});}
  u.moving=true;
  p.y=u.dragon||u.spider?0:MC?0:Math.abs(Math.sin(T*13))*(u.evo?.1:.14);
  u.dust-=dt; if(u.dust<=0&&!u.dragon&&!LOW&&u.side==='P'){u.dust=.45;particles(tmpV.copy(p).setY(.08),0xb8a888,2,.6,.18,-.1,.35);}
}
const hasClip=(u,n)=>{const A=u.inner.userData;return !!(A.play&&A.clipInfo&&A.clipInfo(n));};
function stopMove(u,keep){if(!u.moving)return;u.moving=false;u.w.position.y=0;if(u.dragon){dragonSet(u,{flapSpd:1,flapAmp:.55,lunge:0,legF:0,spread:0,bank:0,pitch:0},.4);if(u.vel)u.vel.multiplyScalar(.3);}else if(u.spider){u.rig.tg.walk=0;}else if(!keep&&hasClip(u,'run'))u.inner.userData.play('idle',{loop:true,fade:.15});}
// เล่นท่าจาก Mixamo: multi=ตีหลายจังหวะตาม hits, ไม่งั้นตีครั้งเดียวที่จังหวะแรงสุด
async function clipStrike(u,nm,sp,onHit,multi){
  const A=u.inner.userData,inf=A.clipInfo(nm); A.play(nm,{speed:sp,fade:.1});
  if(multi){let last=0;for(const h of inf.hits){await wait((h-last)/sp*1000);last=h;onHit();}await wait(Math.max(120,(inf.dur-last)/sp*1000*.35));}
  else{await wait(inf.main/sp*1000);onHit();await wait(Math.max(120,(inf.dur-inf.main)/sp*1000*.4));}
}
/* เวทยิงไกลของตัวที่ใช้ท่า Mixamo (โคฮาคุ): เล่นท่าร่าย รวมลูกไฟที่ปลายคทา แล้วยิงโค้งใส่ศัตรูทีละลูก */
const castSrc=u=>{const A=u.inner.userData,sw=A.swords&&A.swords[0],v=new THREE.Vector3();if(sw&&sw.userData.tip&&sw.visible)sw.userData.tip.getWorldPosition(v);else v.copy(u.w.position).setY(1.7*u.w.scale.x);return v;};
async function rigCast(u,foes,clip,onHitOne,o){
  o=o||{};const A=u.inner.userData,sp=o.fast?1.8:1.4,inf=clip&&A.clipInfo?A.clipInfo(clip):null;
  if(inf)A.play(clip,{speed:sp,fade:.1});
  const src=()=>castSrc(u);
  await wait(inf?inf.main/sp*(o.fast?500:650):120);
  const c=elFx(u),g0=glow(scene,c,.35,src().toArray(),1);
  await tween(o.fast?.14:.28,k=>{g0.position.copy(src());g0.scale.setScalar(.25+k*(o.fast?.6:1.1));}); scene.remove(g0);g0.material.dispose();
  shake=Math.max(shake,o.fast?.02:.06);
  await Promise.all(foes.map((f,i)=>new Promise(res=>setTimeout(async()=>{
    const from=src(),g=glow(scene,c,.45,from.toArray(),1),to=f.w.position.clone().setY(.9),mid=from.clone().lerp(to,.5).add(new THREE.Vector3(0,1,0));
    await tween(.4,k=>{const a=from.clone().lerp(mid,k),b=mid.clone().lerp(to,k);g.position.copy(a.lerp(b,k));if(Math.random()<.5*FXK)particles(g.position,c,1,.3,.05,.2,.6);},t=>t);
    scene.remove(g);g.material.dispose();particles(to,c,Math.round(14*FXK)||4,2,.08,.3,.9);
    if(f.alive)onHitOne(f); res();},i*120/SPEED))));
  await wait(220);
}
/* ฝนเพลิง: ยืนร่ายที่เดิม ลูกไฟตกจากฟ้าลงศัตรูรอบเป้าหมายทีละลูก แล้วระเบิดเป็นวงที่จุดกลาง */
async function rigRain(u,t,foes,clip,onHitOne){
  const A=u.inner.userData,sp=1.3,inf=clip&&A.clipInfo?A.clipInfo(clip):null; if(inf)A.play(clip,{speed:sp,fade:.1});
  const c=elFx(u),src=castSrc(u),g0=glow(scene,c,.4,src.toArray(),1);
  await tween(.5,k=>{g0.position.copy(castSrc(u)).y+=k*1.2;g0.scale.setScalar(.3+k*1.4);}); scene.remove(g0);g0.material.dispose();
  const cen=t.w.position.clone().setY(0), list=foes.length?foes:[t];
  await Promise.all(list.map((f,i)=>new Promise(res=>setTimeout(async()=>{
    const to=f.w.position.clone().setY(.5),from=to.clone().add(new THREE.Vector3(-1.2,7,0)),g=glow(scene,c,.7,from.toArray(),1);
    await tween(.38,k=>{g.position.lerpVectors(from,to,k*k);if(Math.random()<.5*FXK)particles(g.position,c,1,.3,.05,.3,.5);});
    scene.remove(g);g.material.dispose();particles(to,c,Math.round(18*FXK)||5,2.2,.09,.4,.9);
    if(f.alive)onHitOne(f); res();},i*140/SPEED))));
  shockRing(cen,c); shake=Math.max(shake,.18); particles(tmpV.copy(cen).setY(.2),c,Math.round(22*FXK)||6,2.4,.08,.5,.9);
  await wait(250);
}
/* ฮีล: ยืนร่ายที่เดิม ดวงไฟเขียวจากปลายคทาลอยไปหาเพื่อนทีละดวง แล้วมีวงแสงที่เท้า */
async function rigHeal(u,s){
  const A=u.inner.userData,mates=UNITS.filter(o=>o.alive&&o.side===u.side&&!o.raid);
  const list=s.target==='all'?mates:[mates.reduce((a,b)=>hurtPct(b)<hurtPct(a)?b:a,mates[0])].filter(Boolean);
  const clip=ANIM[u.sp]&&ANIM[u.sp].heal, inf=clip&&A.clipInfo&&hasClip(u,clip)?A.clipInfo(clip):null, sp=1.4;
  if(inf)A.play(clip,{speed:sp,fade:.1});
  const c=0x8dffb0, g0=glow(scene,c,.4,castSrc(u).toArray(),1);
  await tween(.45,k=>{g0.position.copy(castSrc(u));g0.scale.setScalar(.3+k*1.3);}); scene.remove(g0);g0.material.dispose();
  shockRing(tmpV.copy(u.w.position).setY(.05),c);
  await Promise.all(list.map((f,i)=>new Promise(res=>setTimeout(async()=>{
    const from=castSrc(u),g=glow(scene,c,.35,from.toArray(),1),to=()=>f.w.position.clone().setY(1.1);
    await tween(.32,k=>{g.position.lerpVectors(from,to(),k);g.position.y+=Math.sin(k*Math.PI)*.8;});
    scene.remove(g);g.material.dispose();
    if(f.alive){healUnit(f,healAmt(u,f,s.mult));if(s.cleanse&&(f.stun||f.stunT>0)){f.stun=0;f.stunT=Math.min(f.stunT,.01);}
      shockRing(tmpV.copy(f.w.position).setY(.05),c);particles(tmpV.copy(f.w.position).setY(.2),c,Math.round(14*FXK)||4,1.2,.07,1.8,1);}
    res();},i*90/SPEED))));
  await wait(200);
}
// ใช้ฮีลไหม: เดี่ยว = มีเพื่อนเลือด <70% · ทั้งทีม = เพื่อนเลือด <85% ตั้งแต่ 2 ตัว หรือมีตัว <50%
const healWanted=(u,s)=>{const m=UNITS.filter(o=>o.alive&&o.side===u.side&&!o.raid);
  return s.target==='all'?m.filter(o=>hurtPct(o)<.85).length>=2||m.some(o=>hurtPct(o)<.5):m.some(o=>hurtPct(o)<.7);};
const ANIM={kazekiri:{s1:['slash','slash2'],s2:'combo',s3:'leap'},kuroga:{s1:['slash','power','slash2'],s2:'spin',s3:'jumpatk'},hakuneko:{s1:['slash','slash2','power'],s2:'combo',s3:'jumpatk'},morihime:{s1:['power','slash'],s2:'spin',s3:'leap'},seiro:{s1:['slash','slash2'],s2:'combo',s3:'leap'},kohaku:{bolt:'slash',cast:'battlecry',rain:'powerup'},anubis:{bolt:'slash',cast:'battlecry',rain:'powerup'},phraiwan:{bolt:'slash',heal:'powerup'},mortha:{bolt:'slash',heal:'battlecry'},sarael:{s1:['slash','power','slash2'],s2:'combo',s3:'jumpatk'},garok:{s1:['power','slash','slash2'],s2:'spin',s3:'jumpatk'}};
function rtTick(dt,T){
  if(!RT)return;
  raceTick(dt);
  // ติดตัว regen (ไพรวัลย์): ทุก 3 วินาที ทั้งทีมฟื้นเลือด % ของเลือดสูงสุด
  UNITS.forEach(u=>{if(!u.alive||!u.pas||!u.pas.regen)return;u.regT=(u.regT||0)+dt;if(u.regT<3)return;u.regT=0;
    UNITS.forEach(o=>{if(o.alive&&o.side===u.side&&!o.raid)healUnit(o,o.maxHp*u.pas.regen,true);});
    particles(tmpV.copy(u.w.position).setY(.3),0x8dffb0,Math.round(6*FXK)||2,1.4,.05,1.2,.8);});
  UNITS.forEach(u=>{
    if(!u.alive||u.raid)return;
    if(u.stun&&u.dragon){u.stun=0;u.stunT=1.6;u.dizzy=1;stopMove(u,1);dragonSet(u,{droop:1,flapAmp:.25},.25);}
    if(u.stun&&u.spider){u.stun=0;u.stunT=1.6;u.dizzy=1;stopMove(u,1);spiderSet(u,{crouch:.55,recoil:.4},.2);}
    if(u.stun){u.stun=0;u.stunT=1.6;if(!u.busy&&hasClip(u,'dizzy')){stopMove(u,1);u.inner.userData.play('dizzy',{loop:true,fade:.15});u.dizzy=1;}}
    if(u.stunT>0){u.stunT-=dt;stopMove(u,1);if(u.stunT<=0&&u.dizzy){u.dizzy=0;if(u.dragon)dragonSet(u,{droop:0,flapAmp:.55},.3);else if(u.spider)spiderSet(u,{crouch:0,recoil:0},.3);else u.inner.userData.play('idle',{loop:true,fade:.2});}return;}
    if(u.holdT>0){u.holdT-=dt;return;}
    for(const k in u.skT)if(u.skT[k]>0)u.skT[k]-=dt;
    if(u.atkT>0)u.atkT-=dt;
    if(u.busy)return;
    const [t,d]=nearestFoe(u);
    { // สายฮีล: ฮีลได้ทุกระยะ แม้ยังไม่มีศัตรูใกล้
      if(u.queued&&u.queued.type==='heal'){const s=u.queued;u.queued=null;stopMove(u);rtUse(u,s,t);return;} // กดไม้ตายฮีลเอง
      const man=RT.manual&&u.side==='P'&&!AUTO, hs=u.skills.filter(s=>s.type==='heal'&&u.skT[s.id]<=0&&!(man&&s===ultOf(u))&&healWanted(u,s));
      if(hs.length){stopMove(u);rtUse(u,hs[hs.length-1],t);return;}}
    if(u.patrol&&t){u.patrol=0;stopMove(u);}
    if(!t&&u.dragon){ // มังกร: บินวนลาดตระเวนเหนือจุดตั้งหลักระหว่างรอศัตรูระลอกใหม่
      const K=u.w.scale.x, a=T*.42+(u.slot||0), tx=u.home.x+Math.cos(a)*1.7*K, tz=u.home.z+Math.sin(a)*1.1*K;
      stepToward(u,tx,tz,Math.max(.8,Math.hypot(tx-u.w.position.x,tz-u.w.position.z)),dt,T);
      if(!u.patrol){u.patrol=1;dragonSet(u,{flapSpd:1.15,flapAmp:.6,lunge:.12,legF:0,spread:.15},.6);}
      return;
    }
    if(!t){ // ไม่มีศัตรู: เดินกลับตำแหน่งตั้งหลัก
      const hd=Math.hypot(u.home.x-u.w.position.x,u.home.z-u.w.position.z);
      if(hd>.15)stepToward(u,u.home.x,u.home.z,hd,dt,T); else{stopMove(u);turnToward(u,u.home.x+(u.side==='P'?5:-5),u.home.z,dt);}
      return;
    }
    if(!u.dodged&&u.hp<u.maxHp*.35&&d<3&&hasClip(u,'dodge')){u.dodged=1;stopMove(u,1);rtDodge(u,t);return;}
    const manual=RT.manual&&u.side==='P'&&!AUTO;
    if(u.queued&&u.queued.type!=='heal'&&d<(u.ranged?9:8)){const s=u.queued;u.queued=null;stopMove(u);rtUse(u,s,t);return;}
    const ready=u.skills.filter(s=>s.cd&&u.skT[s.id]<=0&&!(manual&&s===ultOf(u))&&(s.type!=='heal'||healWanted(u,s)));
    if(ready.length&&d<(u.ranged?8.6:6.5)){stopMove(u);rtUse(u,ready[ready.length-1],t);return;}
    const range=t.rad+u.reach+.15;
    if(d>range){stepToward(u,t.w.position.x,t.w.position.z,d-range,dt,T);return;}
    stopMove(u); turnToward(u,t.w.position.x,t.w.position.z,dt);
    if(u.atkT<=0)rtUse(u,u.skills[0],t);
  });
}
async function rtUse(u,s,t){
  u.busy=true;
  const near=(c,r)=>UNITS.filter(o=>o.alive&&o.side!==u.side&&Math.hypot(o.w.position.x-c.x,o.w.position.z-c.z)<r);
  const hitAll=list=>()=>list.forEach(f=>{if(f.alive)dealHit(u,f,s);});
  try{
    if(s.id!=='s1'){
      popNum(u,s.name,'info');
      if(u.side==='P'&&s===ultOf(u)){const k=$('#skname');k.textContent=s.name;k.className='p';k.hidden=false;setTimeout(()=>{if(k.textContent===s.name)k.hidden=true;},900);}
    }
    if(u.dragon&&s.type!=='melee'){}else if(t)await faceTo(u,t.w.position,.08);
    const AN=ANIM[u.sp]&&u.inner.userData.play?ANIM[u.sp]:null;
    if(AN&&u.side==='P'&&s===ultOf(u)&&hasClip(u,'powerup')){u.inner.userData.play('powerup',{speed:1.8,fade:.1});particles(tmpV.copy(u.w.position).setY(1),0x9fe8ff,24,1.4,.06,1.2,.9);await wait(650);}
    if(u.dragon&&u.side==='P'&&s===ultOf(u))await dragonRoar(u,450);
    if(s.type==='heal'){await rigHeal(u,s);}
    else if(u.spider){
      if(s.type==='ranged')await spiderCast(u,near(t.w.position,4.5),f=>dealHit(u,f,s));
      else if(s.type==='leap'){const fs=near(t.w.position,3.2),c=t.w.position.clone().setY(0);await spiderLeap(u,c,fs,hitAll(fs));}
      else{const n=s.type==='melee3'?3:1;for(let i=0;i<n&&t.alive;i++)await spiderStrike(u,t,()=>{if(t.alive)dealHit(u,t,s);});}
    } else if(s.type==='melee'&&u.dragon){
      const r=Math.random(), f=()=>{if(t.alive)dealHit(u,t,s);};
      const gf=near(t.w.position,3.2);
      if(r<.26)await dragonSwoop(u,t,f); else if(r<.46)await strike(u,0,f); else if(r<.64&&gf.length>1)await dragonGust(u,gf,o=>{if(o.alive)dealHit(u,o,{...s,mult:s.mult*.7});}); else if(r<.84)await dragonClaw(u,t,()=>{if(t.alive)dealHit(u,t,{...s,mult:s.mult*.55});}); else await dragonTail(u,t,()=>near(t.w.position,2.6).forEach(o=>dealHit(u,o,{...s,mult:s.mult*.8})));
    } else if(s.type==='melee'&&AN){
      const ls=AN.s1; await clipStrike(u,ls[Math.floor(Math.random()*ls.length)],1.35,()=>{if(t.alive){dealHit(u,t,s);hitStop();}});
    } else if(s.type==='melee'){
      await strike(u,Math.random()<.5?0:1,()=>{if(t.alive)dealHit(u,t,s);});
    } else if(s.type==='melee3'){
      if(AN)await clipStrike(u,AN.s2,1.25,()=>{if(t.alive)dealHit(u,t,s);},true);
      else if(u.inner.userData.play)await strikeCombo(u,()=>{if(t.alive)dealHit(u,t,s);});
      else for(let i=0;i<3&&t.alive;i++)await strike(u,i,()=>dealHit(u,t,s));
    } else if(s.type==='ranged'&&u.dragon){
      const fs=near(t.w.position,4.5); await faceTo(u,t.w.position,.2);
      if(Math.random()<.5)await dragonBreath(u,fs,hitAll(fs)); else await dragonStrafe(u,fs,o=>{if(o.alive)dealHit(u,o,s);});
    } else if(s.type==='bolt'){
      await rigCast(u,[t],AN&&hasClip(u,AN.bolt)?AN.bolt:null,f=>dealHit(u,f,s),{fast:1});
    } else if(s.type==='rain'){
      await rigRain(u,t,near(t.w.position,3.2),AN&&hasClip(u,AN.rain)?AN.rain:null,f=>dealHit(u,f,s));
    } else if(s.type==='ranged'&&AN&&AN.cast&&hasClip(u,AN.cast)){
      await rigCast(u,near(t.w.position,4.5).slice(0,4),AN.cast,f=>dealHit(u,f,s));
    } else if(s.type==='ranged'){
      const fs=near(u.w.position,9).slice(0,4); u.inner.userData.acting=true; const r=u.rig;
      for(const f of fs){faceTo(u,f.w.position,.08);poseTo([[r.R.a.rotation,'z',-1.2],[r.R.a.rotation,'x',-1.4]],.08);
        throwAt(u,f).then(()=>{if(f.alive)dealHit(u,f,s);}); await wait(170); poseTo([[r.R.a.rotation,'z',-2.3],[r.R.a.rotation,'x',-.2]],.1);}
      await wait(300);
    } else if(s.type==='leap'){
      const fs=near(t.w.position,3.2), c=t.w.position.clone().setY(0);
      if(u.dragon){await dragonDive(u,c,fs,hitAll(fs));}
      else{
        const dir=u.side==='P'?1:-1, land=c.clone(); land.x-=dir*(t.rad+u.reach*.6);
        const A=u.inner.userData;
        if(A.play){const nm=AN&&hasClip(u,AN.s3)?AN.s3:'leap',inf=A.clipInfo(nm),sp=1.15,from=u.w.position.clone();A.play(nm,{speed:sp,fade:.08});
          await tween(inf.main/sp,k=>{u.w.position.lerpVectors(from,land,k);u.w.position.y=Math.sin(k*Math.PI)*.6;},easeIO); u.w.position.y=0;}
        else await hop(u,land,.5,2.2);
        shockRing(c,elFx(u)); shake=Math.max(shake,.2); particles(tmpV.copy(c).setY(.1),0xb8a888,20,1.8,.3,-.2,.5); particles(tmpV.copy(c).setY(.6),elFx(u),16,1.6,.07,.4,.8);
        hitArc(tmpV.copy(c).setY(1),Math.PI/2,elFx(u),1.5);
        hitAll(fs)(); await wait(380);
      }
    }
    if(!u.dragon&&u.alive)await recoverStance(u);
  }catch(e){console.warn('rt',e);}
  finally{
    u.busy=false; u.w.position.y=Math.max(0,Math.min(u.w.position.y,0));
    u.atkT=s.id==='s1'?42/u.spd:.5;
    if(s.cd)u.skT[s.id]=s.cd*2.3;
  }
}
// เลือดเหลือน้อย: ตีลังกาถอยหลังตั้งหลักครั้งเดียว
async function rtDodge(u,t){
  u.busy=true; const A=u.inner.userData, from=u.w.position.clone(), away=from.clone().sub(t.w.position).setY(0).normalize().multiplyScalar(2).add(from);
  popNum(u,'ถอยตั้งหลัก','info'); await faceTo(u,t.w.position,.06); A.play('dodge',{speed:1.6,fade:.08});
  await wait(.35/1.6*1000); await tween(.55,k=>{u.w.position.lerpVectors(from,away,k);},easeOut); await wait(250);
  A.play('idle',{loop:true,fade:.2}); u.busy=false;
}
function rtSpawn(wv){
  // ศัตรูมาเป็นแถวทัพ เดินออกจากค่ายทางขวา
  const n=wv.length, cols=Math.min(5,Math.ceil(Math.sqrt(n*1.6)));
  wv.forEach((d,i)=>{
    const r=Math.floor(i/cols), c=i%cols, cn=Math.min(cols,n-r*cols);
    const z=(c-(cn-1)/2)*2.4+(Math.random()-.5)*.6, x0=21+r*2.6+Math.random()*.8+(d.boss?1.5:0), rx=typeof realmSpawnX==='function'?realmSpawnX(r,Math.random()*.6+(d.boss?1:0)):null, x=rx==null?x0:rx;
    const u=rtInit(makeUnit('E',d,0)); u.w.position.set(x,0,z); u.home.set(x-9,0,z); u.w.rotation.y=-Math.PI/2;
    smoke(tmpV.set(x,.5,z));
  });
}
async function rtBattle(st,opts){
  stage=st; OPTS=opts||{}; running=true; RT={manual:!!OPTS.manual}; raceReset(); if(typeof storyStart==='function')storyStart(st);
  UNITS.forEach(removeUnit); UNITS=[]; PICKU=[]; RIGS=[]; clearTrails();
  TEAM.forEach((d,i)=>{const u=rtInit(makeUnit('P',d,i));if(hasClip(u,'battlecry')&&(OPTS.banner||OPTS.manual)){u.holdT=1.3;setTimeout(()=>u.alive&&u.inner.userData.play('battlecry',{speed:1.7,fade:.15}),150);}else if(u.dragon&&(OPTS.banner||OPTS.manual)){u.holdT=1.4;setTimeout(()=>u.alive&&dragonRoar(u,700),150);}});
  document.body.classList.add('rt'); camMode={type:'wide'}; camK=1.6; actRing.visible=tgtRing.visible=false;
  if(RT.manual)ultButtons(true);
  let won=null;
  for(waveIdx=0;waveIdx<st.waves.length&&running;waveIdx++){
    if(waveIdx>0)alive('P').forEach(u=>{const h=Math.round(u.maxHp*.25);u.hp=Math.min(u.maxHp,u.hp+h);updateBar(u);popNum(u,'+'+h,'heal');});
    $('#wave').textContent=(OPTS.label?OPTS.label+' · ':'')+'คลื่น '+(waveIdx+1)+'/'+st.waves.length;
    const wv=st.waves[waveIdx], boss=wv.some(d=>d.boss);
    {const e=wv.find(d=>d.el);if(e&&ELEM[e.el])$('#wave').textContent+=' · ศัตรูธาตุ'+e.el+' '+ELEM[e.el].i;}
    rtSpawn(wv);
    if(boss){shake=.25;banner('บอสปรากฏตัว!','boss');}
    else if(waveIdx===0&&OPTS.banner)banner(OPTS.banner,'');
    while(running&&alive('E').length&&alive('P').length)await sleep(120);
    if(!running)break;
    if(!alive('P').length){won=false;break;}
    await wait(500);
  }
  if(won===null&&running)won=true;
  ultButtons(false);
  if(won===null){RT=null;document.body.classList.remove('rt');return;} // ออกกลางคัน
  RT=null; document.body.classList.remove('rt');
  return finish(won);
}
/* ปุ่มท่าไม้ตาย (โหมดบอส) */
let ultTimer=0;
function ultButtons(on){
  const box=$('#skills'); clearInterval(ultTimer);
  if(!on){box.hidden=true;box.innerHTML='';$('#skdesc').textContent='';return;}
  box.innerHTML=''; box.hidden=false; $('#skdesc').textContent='กดท่าไม้ตายเองได้เมื่อพร้อม หรือเปิด "ออโต้"';
  const heroes=UNITS.filter(u=>u.side==='P');
  heroes.forEach(u=>{const s=ultOf(u),b=document.createElement('button');b.className='sk sp';
    b.innerHTML='<b></b><small></small><i class="cd" hidden></i>';b.querySelector('b').textContent=s.name;b.querySelector('small').textContent=u.name;
    b.onclick=()=>{if(u.alive&&!(u.skT[s.id]>0)){u.queued=s;u.skT[s.id]=s.cd*2.3;}};box.appendChild(b);u.ultBtn=b;});
  ultTimer=setInterval(()=>heroes.forEach(u=>{const s=ultOf(u),b=u.ultBtn,cd=u.skT[s.id]||0,i=b.querySelector('.cd');
    b.disabled=!u.alive||cd>0||!!u.queued; i.hidden=!(cd>0&&u.alive); if(cd>0)i.textContent=Math.ceil(cd/SPEED);}),200);
}
