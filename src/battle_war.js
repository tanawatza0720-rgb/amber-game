/* ================= สงครามแห่งการช่วงชิง: ฉากต่อสู้ (battle.html?war=1&slot=0|1|2) =================
   server/migrate_arena.sql: arena_attack(slot) ตัดสินผลก่อน (โอกาสชนะจากพลัง) → หน้านี้เล่นฉากให้ "ตรงกับผล"
   ทีมเราวิ่งเข้ายึด "ศิลาอัมพร" กลางลาน · ทีมเพื่อน 2 ทีมทยอยมาสมทบ (ฉากเปิดตัวตามเผ่า) · ผู้ป้องกันได้พลังศิลา (เลือด/โจมตีเพิ่ม)
   สกิลดินแดนของเผ่าเจ้าบ้าน · คืนชีพที่ศิลาได้ตัวละ 1 ครั้ง · ตัวเก่งสุด = หัวหน้าผู้พิทักษ์ (บอส) · ยึดศิลาให้ได้ใน 90 วินาที
   ผู้กำกับฉาก (warScale ใน dealHit) ปรับดาเมจให้ฝั่งที่เซิร์ฟเวอร์ตัดสินว่าชนะได้เปรียบ · ทดสอบ: ?war=1&dbg=1&warfake=win|lose */
var WAR_MODE=/[?&]war=1/.test(location.search);
var WB=null;
const WAR_T=90, WAR_CRY=new THREE.Vector3(9,0,0), WAR_FAKE=/[?&]dbg=1/.test(location.search)&&(location.search.match(/[?&]warfake=(\w+)/)||[])[1];
const WAR_REALM={god:'god',human:'human',beast:'beast',undead:'undead'};
const warLow=()=>typeof LOW!=='undefined'&&LOW;
function warTeam(list,n){
  let L=(list||[]).filter(d=>SPECIES[d.sp]).map(d=>({sp:d.sp==='amateru'&&NO_DRAGON?'kuroga':d.sp,lv:d.lv||1,stars:d.stars||0,el:d.el||undefined,pow:d.pow||0}));
  if(n&&L.length>n)L=[...L].sort((a,b)=>b.pow-a.pow).slice(0,n);
  return L;
}
// ผู้กำกับฉาก: ให้ภาพออกมาตรงกับผลจากเซิร์ฟเวอร์
function warScale(att,t,d){
  if(!WB||!WB.live)return d;
  if(WB.win){if(t.side==='P')d*=.5;else d*=1.15;}
  else{if(t.side==='E')d*=.45;else d*=1.1;}
  // ก่อนเพื่อนมาครบ อย่าให้ทีมเราล้มหมด
  if(t.side==='P'&&WB.t<WB.arr[1]+4&&t.hp-d<t.maxHp*.2)d=Math.max(1,Math.min(d,t.hp-t.maxHp*.2));
  return d;
}
/* ---------- ศิลาอัมพร ---------- */
function warCrystal(){
  const g=new THREE.Group(); g.position.copy(WAR_CRY);
  const cm=new THREE.MeshStandardMaterial({color:0xff8a1a,emissive:0xff5a00,emissiveIntensity:1.1,roughness:.25,metalness:0,transparent:true,opacity:.9});
  const c=new THREE.Mesh(new THREE.OctahedronGeometry(1.2,0),cm); c.scale.set(1,2.1,1); c.position.y=3.2; g.add(c);
  [[.9,.4,.6],[-.8,.3,-.5],[.2,.35,-1]].forEach(([x,s,z])=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.6,0),cm);m.scale.set(s*1.4,s*3,s*1.4);m.position.set(x,s*1.5,z);m.rotation.z=x*.3;g.add(m);});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,.6,10),new THREE.MeshStandardMaterial({color:0x5a4a3a,roughness:.9})); base.position.y=.3; g.add(base);
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.6,6,64),new THREE.MeshBasicMaterial({color:0xffc070,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.08; g.add(ring);
  glow(g,0xffa040,6,[0,3.2,0],.55);
  scene.add(g); return {g,c,ring,cm};
}
/* ---------- ฉากเปิดตัวทีมสมทบตามเผ่า ---------- */
const WAR_GLB={};
function warModel(name){
  if(WAR_GLB[name])return WAR_GLB[name];
  WAR_GLB[name]=new Promise(res=>{try{new THREE.GLTFLoader().load('war/'+name+'.glb',g=>res(g.scene),undefined,()=>res(null));}catch(e){res(null);}});
  return WAR_GLB[name];
}
function fitModel(obj,size,axis){const b=new THREE.Box3().setFromObject(obj),s=new THREE.Vector3();b.getSize(s);const k=size/Math.max(.001,axis==='y'?s.y:Math.max(s.x,s.z));obj.scale.multiplyScalar(k);
  const b2=new THREE.Box3().setFromObject(obj);obj.position.y-=b2.min.y;return obj;}
async function warEnter(race,pos,face){
  if(race==='god'){ // ลำแสงทองฟาดลงจากฟ้า
    if(typeof rlBeam==='function')rlBeam(pos,0xffd86a,70); shake=Math.max(shake,.3);
    particles(pos.clone().setY(.5),0xfff0b0,30,4,.12,1);
    await wait(500); return {pos};
  }
  if(race==='undead'){ // พื้นแตก หลุมศพ หมอกพวยพุ่ง
    const U={t:{value:0},R:{value:3},ps:{value:600}},disc=new THREE.Mesh(new THREE.CircleGeometry(3.4,40),ABYSS_FX.discMat(U));
    disc.rotation.x=-Math.PI/2;disc.position.copy(pos).setY(.07);scene.add(disc);
    const t0=performance.now();const iv=setInterval(()=>{U.t.value=(performance.now()-t0)/1000;particles(pos.clone().add(new THREE.Vector3((Math.random()-.5)*4,.3,(Math.random()-.5)*4)),Math.random()<.5?0x8aff9a:0xb070ff,3,1.2,.18,-1.2,.6);},90);
    shake=Math.max(shake,.2); await wait(700);
    setTimeout(()=>{clearInterval(iv);tween(.6,k=>disc.scale.setScalar(1-k)).then(()=>{scene.remove(disc);disc.geometry.dispose();});},2600);
    return {pos,rise:true};
  }
  if(race==='human'){ // ประตูวาร์ปเทคโนโลยี
    let gate=await warModel('gate');
    const g=new THREE.Group();g.position.copy(pos);g.rotation.y=face;scene.add(g);
    if(gate){gate=gate.clone(true);fitModel(gate,7,'y');g.add(gate);}
    else{const m=new THREE.Mesh(new THREE.TorusGeometry(2.6,.35,10,40),new THREE.MeshStandardMaterial({color:0x2a3440,emissive:0x2ad8ff,emissiveIntensity:.8}));m.position.y=3;g.add(m);}
    const portal=new THREE.Mesh(new THREE.CircleGeometry(2.3,40),new THREE.MeshBasicMaterial({color:0x7fe8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    portal.position.y=3.2;portal.rotation.y=Math.PI/2;g.add(portal);
    g.scale.setScalar(.01); await tween(.45,k=>g.scale.setScalar(Math.max(.01,k)),t=>1-(1-t)*(1-t));
    shockRing(pos.clone().setY(.06),0x56dfff); await tween(.35,k=>portal.material.opacity=.75*k);
    setTimeout(()=>{tween(.5,k=>{portal.material.opacity=.75*(1-k);g.scale.setScalar(Math.max(.01,1-k));}).then(()=>scene.remove(g));},3200);
    return {pos,walk:true};
  }
  // กึ่งมนุษย์: เรือบอลลูนไวกิ้งลงจอด แล้วทีมเดินลงมา
  let ship=await warModel('airship');
  const g=new THREE.Group();g.position.copy(pos);g.rotation.y=face+Math.PI/2;scene.add(g);
  if(ship){ship=ship.clone(true);fitModel(ship,12,'xz');g.add(ship);}
  else{const h=new THREE.Mesh(new THREE.BoxGeometry(8,1.5,2.4),new THREE.MeshStandardMaterial({color:0x7a4a2a}));h.position.y=1;g.add(h);
    const b=new THREE.Mesh(new THREE.SphereGeometry(3,16,12),new THREE.MeshStandardMaterial({color:0xd04a3a}));b.position.y=6.5;g.add(b);}
  const y0=34; g.position.y=y0;
  await tween(2.2,k=>{g.position.y=y0*(1-k);g.rotation.z=Math.sin(k*9)*.03*(1-k);},t=>1-Math.pow(1-t,3));
  shake=Math.max(shake,.25); particles(pos.clone().setY(.3),0xc8b090,26,3,.25,-.2,.6);
  setTimeout(()=>{tween(2.4,k=>{g.position.y=k*k*40;}).then(()=>scene.remove(g));},3400);
  return {pos,walk:true};
}
async function warArrive(i){
  const A=WB.allies[i]; if(!A)return;
  const pos=new THREE.Vector3(-17,0,i?9:-9), face=Math.PI/2;
  banner(A.name+' · '+(RACES[A.race]?RACES[A.race].icon+' '+RACES[A.race].n:'')+' มาสมทบ!','');
  const E=await warEnter(A.race,pos,face);
  if(!WB||!WB.live)return;
  warTeam(A.team,warLow()?3:6).forEach((d,k)=>{
    const u=rtInit(makeUnit('P',d,0)); u.ally=1; if(u.row)u.row.classList.add('ally');
    const a=k/6*6.283, r=1.2+(k%2)*1.1, x=pos.x+Math.cos(a)*r, z=pos.z+Math.sin(a)*r;
    u.w.position.set(x,0,z); u.home.set(x+4,0,z); u.w.rotation.y=face;
    if(E.rise){u.w.position.y=-1.8;u.holdT=1.2;tween(.9+k*.1,t=>u.w.position.y=-1.8*(1-t));}
    else if(E.walk){u.holdT=.3+k*.15;}
    else{u.holdT=.5;smoke(u.w.position.clone().setY(.4));}
  });
  ultFix();
}
// แถวเลือดของทีมสมทบ: ซ่อนบนมือถือไม่ให้รก
function ultFix(){document.body.classList.toggle('warAllies',true);}
/* ---------- คืนชีพที่ศิลา (ผู้ป้องกัน ตัวละ 1 ครั้ง) ---------- */
function warRevive(){
  UNITS.filter(u=>u.side==='E'&&!u.alive&&u.wdef&&!u.wrev).forEach(u=>{u.wrev=1;
    setTimeout(()=>{if(!WB||!WB.live)return;
      const d=Object.assign({},u.wdef,{boss:u.boss?1:0}),n=rtInit(makeUnit('E',d,0)); n.wdef=u.wdef; n.wrev=1;
      const a=Math.random()*6.283; n.w.position.set(WAR_CRY.x+Math.cos(a)*2.4,0,WAR_CRY.z+Math.sin(a)*2.4); n.home.copy(n.w.position); n.w.rotation.y=-Math.PI/2;
      n.hp=Math.round(n.maxHp*.6); updateBar(n); n.holdT=.6;
      particles(n.w.position.clone().setY(1),0xffb347,20,2,.1,-.6); shockRing(n.w.position.clone().setY(.06),0xffb347);
      popNum(n,'ฟื้นคืนชีพที่ศิลา!','info');},3000/SPEED);});
}
/* ---------- ลูปของโหมดสงคราม ---------- */
function warTick(dt){
  if(!WB||MODE!=='war')return;
  if(WB.cry){WB.cry.c.rotation.y+=dt*.8;WB.cry.c.position.y=3.2+Math.sin(performance.now()/600)*.15;WB.cry.ring.material.opacity=.25+.2*Math.sin(performance.now()/300);}
  if(!WB.live)return;
  WB.t+=dt;
  // ผู้ป้องกันเฝ้าศิลา จนกว่าฝั่งบุกจะเข้าใกล้
  if(!WB.engaged){const near=alive('P').some(p=>p.w.position.distanceTo(WAR_CRY)<14);if(near||WB.t>8){WB.engaged=true;alive('E').forEach(u=>u.holdT=0);}else alive('E').forEach(u=>u.holdT=1);}
  WB.arr.forEach((at,i)=>{if(!WB.came[i]&&WB.t>=at){WB.came[i]=1;warArrive(i);}});
  warRevive();
  // ยึดศิลา: ฝั่งบุกอยู่ในวง และไม่มีผู้ป้องกันในวง
  const inP=alive('P').filter(p=>p.w.position.distanceTo(WAR_CRY)<6.5).length, inE=alive('E').filter(e=>e.w.position.distanceTo(WAR_CRY)<6.5).length;
  let rate=0;
  if(inP&&!inE)rate=100/(WB.win?11:16);
  else if(inP&&inE)rate=100/(WB.win?40:70);
  if(WB.win&&WB.t>WAR_T-25)rate=Math.max(rate,(100-WB.cap)/Math.max(2,WAR_T-8-WB.t));   // ให้ทันก่อนหมดเวลา
  WB.cap=Math.min(WB.win?100:82,WB.cap+rate*dt);
  const left=Math.max(0,Math.ceil(WAR_T-WB.t));
  $('#wave').textContent='⏱ '+left+' วินาที · ยึดศิลา '+Math.floor(WB.cap)+'%';
  $('#warCapI').style.width=WB.cap+'%';
  if(WB.win&&WB.cap>=100)return warEnd('cap');
  if(!alive('P').length)return warEnd('wipe');
  if(WB.t>=WAR_T)return warEnd('time');
}
async function warStart(){
  MODE='war'; if(typeof STORY!=='undefined')STORY.mod=null; setBossUI(true); $('#hud').hidden=false; $('#bExit').textContent='ข้าม';
  $('#stTitle').textContent='สงครามแห่งการช่วงชิง'; $('#wave').textContent='กำลังจัดทัพ…'; $('#farmLink').hidden=true;
  const slot=Number((location.search.match(/[?&]slot=(\d)/)||[])[1]||1);
  let res;
  try{
    if(WAR_FAKE)res=warFakeRes(WAR_FAKE==='win');
    else{if(!BN.online)throw Object.assign(new Error('session'),{code:'session'});res=await brpc('arena_attack',{slot});}
  }catch(e){warFail(e);return;}
  if(res.state)bnApply(res.state);
  const D=res.defender||{}, me=res.me||{};
  WB={res,win:!!res.won,t:0,cap:0,live:false,engaged:false,allies:res.allies||[],arr:[7,17],came:[0,0]};
  const myTeam=warTeam(me.team); if(myTeam.length)TEAM.splice(0,TEAM.length,...myTeam.map(({sp,lv,stars,el})=>({sp,lv,stars,el})));
  await useRealm(WAR_REALM[D.race]||null); realmSkillOn(true,'E');
  const B=typeof abyssBless==='function'?abyssBless(me.bless):null; STORY.mod=B?{icon:B.i,name:B.n,desc:B.d,p:B.p}:null;
  $('#stTitle').textContent='ช่วงชิงศิลา · ปราการของ '+(D.name||'?')+(D.race&&RACES[D.race]?' '+RACES[D.race].icon:'');
  document.body.classList.add('warOn');
  // ฉาก
  UNITS.forEach(removeUnit); UNITS=[]; PICKU=[]; RIGS=[]; clearTrails();
  WB.cry=warCrystal();
  running=true; RT={manual:true}; raceReset();
  TEAM.forEach((d,i)=>{const u=rtInit(makeUnit('P',d,i));u.w.position.x-=6;u.home.x=WAR_CRY.x-3;u.holdT=1.2;
    if(hasClip(u,'battlecry'))setTimeout(()=>u.alive&&u.inner.userData.play('battlecry',{speed:1.7,fade:.15}),150);else if(u.dragon)setTimeout(()=>u.alive&&dragonRoar(u,700),150);});
  // ผู้ป้องกัน: พลังศิลา (เลือด ×2.4 โจมตี ×1.25) · ตัวพลังสูงสุด = หัวหน้าผู้พิทักษ์
  const dt=warTeam(D.team), cap=dt.reduce((b,d,i)=>d.pow>(dt[b]?dt[b].pow:-1)?i:b,0);
  dt.forEach((d,i)=>{const def=Object.assign({},d,{mod:{hp:2.4,atk:1.25},name:(SPECIES[d.sp]?SPECIES[d.sp].name:d.sp)+(i===cap?' (หัวหน้า)':'')},i===cap?{boss:1}:{});
    const u=rtInit(makeUnit('E',def,0)); u.wdef=def;
    const a=i/dt.length*6.283+.3; u.w.position.set(WAR_CRY.x+Math.cos(a)*3.2,0,WAR_CRY.z+Math.sin(a)*3.2); u.home.copy(u.w.position); u.w.rotation.y=-Math.PI/2; u.holdT=99;});
  document.body.classList.add('rt'); camMode={type:'wide'}; camK=1.6; RTS.tgt.set(-2,0,0);
  ultButtons(true); $('#warCap').hidden=false;
  if(STORY.mod)setTimeout(()=>{const t=alive('P')[0];if(t)popNum(t,STORY.mod.icon+' '+STORY.mod.name+': '+STORY.mod.desc,'info');},900);
  await banner('บุกยึดศิลาอัมพร!','boss');
  WB.live=true;
}
async function warEnd(why){
  if(!WB||!WB.live)return; WB.live=false;
  if(why==='cap'){banner('ยึดศิลาสำเร็จ!','');shake=.3;particles(WAR_CRY.clone().setY(3),0xffd27a,40,4,.12,1);alive('E').forEach((u,i)=>setTimeout(()=>{if(u.alive){u.hp=0;updateBar(u);die(u);}},i*120));}
  else if(why==='time')banner(WB.win?'ยึดศิลาสำเร็จ!':'หมดเวลา · ผู้ป้องกันรักษาศิลาไว้ได้','boss');
  else banner(WB.win?'ยึดศิลาสำเร็จ!':'ทัพบุกถูกตีแตก','boss');
  if(WB.win&&why!=='cap'){alive('E').forEach(u=>{u.hp=0;updateBar(u);die(u);});}
  realmSkillOn(false); await wait(1400);
  running=false; RT=null; document.body.classList.remove('rt'); ultButtons(false);
  const win=WB.win;
  alive(win?'P':'E').forEach((u,i)=>setTimeout(()=>{if(u.dragon)dragonVictory(u);else if(u.spider)spiderVictory(u);else if(u.inner.userData.play)u.inner.userData.play('victory',{loop:true,fade:.25});},i*80));
  await wait(900); warResult();
}
function warResult(){
  $('#warCap').hidden=true;
  const res=WB.res,A=res.arena||{},r=$('#result');r.hidden=false;r.className=res.won?'win':'lose';
  $('#rTitle').textContent=res.won?'ช่วงชิงศิลาสำเร็จ!':'บุกไม่สำเร็จ';
  const rw=$('#rRew');rw.innerHTML='';
  const row=(a,b)=>{const d=document.createElement('div');d.className='rr';const x=document.createElement('span');x.textContent=a;const y=document.createElement('b');y.textContent=b;d.append(x,y);rw.appendChild(d);};
  row('แต้มประลอง',(res.pts>0?'+':'')+res.pts+(A.pts!=null?' (รวม '+fmtN(A.pts)+')':''));
  row('เหรียญ','+'+fmtN(res.coins)); if(res.amber)row('อัมพร','+'+res.amber);
  row('โอกาสชนะก่อนบุก',Math.round((res.chance||0)*100)+'%');
  if(A.rank)row('อันดับสัปดาห์นี้',String(A.rank));
  $('#rStarsNote').textContent=res.won?'':'แพ้ไม่เสียตัว ไม่เสียเหรียญ · ลองจัดธาตุให้ชนะทางผู้ป้องกัน หรือเลือกเป้าที่ง่ายกว่า';
  const back=$('#rBack'),nxt=$('#rNext');
  back.disabled=false;back.textContent='กลับฟาร์ม';back.onclick=()=>location.replace('./index.html?back=1');
  if(A.left>0){nxt.hidden=false;nxt.disabled=false;nxt.textContent='⚔ เลือกเป้าต่อ ('+A.left+')';nxt.onclick=()=>location.replace('./index.html?back=1&war=1');}
  else nxt.hidden=true;
}
function warFail(e){
  const code=e&&e.code||'network';
  const msg={arena_limit:'วันนี้บุกครบ 5 ครั้งแล้ว พรุ่งนี้มาใหม่นะ',arena_offer:'เป้าหมายหมดอายุแล้ว กลับไปเลือกเป้าใหม่',no_race:'ต้องเลือกเผ่าก่อน',bad_team:'ต้องจัดทีมก่อน',session:'ต้องเข้าสู่ระบบที่หน้าฟาร์มก่อน'}[code]||BERR[code]||BERR.network;
  const r=$('#result');r.hidden=false;r.className='lose';$('#rTitle').textContent='บุกไม่ได้';$('#rRew').innerHTML='';$('#rStarsNote').textContent=msg;
  $('#rNext').hidden=true;$('#rBack').disabled=false;$('#rBack').textContent='กลับฟาร์ม';$('#rBack').onclick=()=>location.replace('./index.html?back=1&war=1');
}
// ผลปลอมสำหรับทดสอบ (?dbg=1&warfake=win|lose&races=god,beast&dr=human)
function warFakeRes(win){
  const q=k=>(location.search.match(new RegExp('[?&]'+k+'=([\\w,]+)'))||[])[1];
  const rs=(q('races')||'god,beast').split(','), T=sp=>({sp,lv:12,stars:1,el:EL_OF[sp],pow:900});
  return {won:win,chance:.58,diff:'close',pts:win?20:-6,coins:win?300:100,amber:win?5:0,
    me:{name:'เรา',race:'human',bless:'atk',team:TEAM.map(d=>Object.assign({pow:800},d))},
    defender:{name:'ทดสอบป้องกัน',race:q('dr')||'undead',team:['kuroga','hakuneko','garok','seiro','kohaku','yorugumo'].map(T)},
    allies:rs.map((r,i)=>({name:'เพื่อน'+(i+1),race:r,team:['kazekiri','morihime','seiro','garok','kohaku','kuroga'].map(T)})),
    arena:{pts:win?1020:994,left:4,rank:3}};
}
