/* ================= แถบพลังชีวิตและตัวเลข ================= */
const ov=$('#ov');
function makeBar(u){
  const b=document.createElement('div'); b.className='ubar '+(u.side==='P'?'p':'e')+(u.boss?' boss':'');
  b.innerHTML='<div class="un"><span class="lv"></span><span class="nm"></span><span class="st" hidden>มึน</span></div><div class="hp"><i></i><em></em></div><div class="atb"><i></i></div>';
  b.querySelector('.lv').textContent=u.lv; b.querySelector('.nm').textContent=u.name; ov.appendChild(b); u.barEl=b; setTimeout(()=>updateBar(u),0); return b;
}
function updateBar(u){const b=u.barEl;if(!b)return;b.querySelector('.hp i').style.width=(u.hp/u.maxHp*100)+'%';b.querySelector('.hp em').textContent=u.hp+'/'+u.maxHp;b.querySelector('.st').hidden=!u.stun;}
function popNum(u,text,cls){
  const v=tmpV.copy(u.w.position).setY(u.evo?(u.boss?3.4:2.7):1.7).project(camera);
  const e=document.createElement('div');e.className='num '+cls;e.textContent=text;
  e.style.left=((v.x*.5+.5)*view.clientWidth+(Math.random()-.5)*30)+'px';e.style.top=((-v.y*.5+.5)*view.clientHeight)+'px';
  ov.appendChild(e);setTimeout(()=>e.remove(),1100);
}
function banner(text,cls){const b=$('#banner');b.textContent=text;b.className=cls||'';b.hidden=false;void b.offsetWidth;b.classList.add('show');return wait(1300).then(()=>{b.hidden=true;b.classList.remove('show');});}

/* ================= ลำดับเทิร์น ================= */
const alive=side=>UNITS.filter(u=>u.alive&&u.side===side);
function nextActor(){
  const live=UNITS.filter(u=>u.alive);let best=null,bt=1e9;
  live.forEach(u=>{const t=(100-u.gauge)/u.spd;if(t<bt){bt=t;best=u;}});
  live.forEach(u=>u.gauge+=u.spd*Math.max(0,bt));best.gauge=0;return best;
}
function previewOrder(n){
  const live=UNITS.filter(u=>u.alive).map(u=>({u,g:u.gauge}));const out=[];
  for(let i=0;i<n&&live.length;i++){let best=null,bt=1e9;live.forEach(o=>{const t=(100-o.g)/o.u.spd;if(t<bt){bt=t;best=o;}});live.forEach(o=>o.g+=o.u.spd*Math.max(0,bt));best.g=0;out.push(best.u);}
  return out;
}
function renderOrder(cur){
  const o=$('#order');o.innerHTML='';
  [cur,...previewOrder(5)].forEach((u,i)=>{const c=document.createElement('div');c.className='oc '+(u.side==='P'?'p':'e')+(i===0?' now':'')+(u.boss?' boss':'');c.textContent=u.side==='E'?(u.boss?'บอส':'ชาด'):({kazekiri:'คิริ',kazemaru:'มารุ',amateru:'มังกร',kuroga:'คุโร'}[u.sp]||'');o.appendChild(c);});
}

/* ================= วงแหวนบอกตัวที่ถึงตาและเป้าหมาย ================= */
const actRing=new THREE.Mesh(new THREE.RingGeometry(.75,.9,48),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));actRing.rotation.x=-Math.PI/2;actRing.position.y=.05;actRing.visible=false;scene.add(actRing);
const tgtRing=new THREE.Mesh(new THREE.RingGeometry(.75,.9,48),new THREE.MeshBasicMaterial({color:0xff4a3a,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));tgtRing.rotation.x=-Math.PI/2;tgtRing.position.y=.05;tgtRing.visible=false;scene.add(tgtRing);
let actor=null, target=null;

/* ================= เลือกท่าของผู้เล่น ================= */
let AUTO=false, choose=null;
function pickDefaultTarget(){const es=alive('E');if(target&&target.alive)return target;return es.reduce((a,b)=>a.hp/a.maxHp<b.hp/b.maxHp?a:b,es[0]);}
function showSkills(u){
  const box=$('#skills');box.innerHTML='';box.hidden=false;
  u.skills.forEach(s=>{const cd=u.cds[s.id]||0;const b=document.createElement('button');b.className='sk'+(s.id!=='s1'?' sp':'');b.disabled=cd>0;
    b.innerHTML='<b></b><small></small>'+(cd?'<i class="cd"></i>':'');b.querySelector('b').textContent=s.name;b.querySelector('small').textContent=s.target==='all'?'ศัตรูทุกตัว':'ศัตรู 1 ตัว';if(cd)b.querySelector('.cd').textContent=cd;
    b.title=s.desc;b.onclick=()=>{if(choose){const c=choose;choose=null;c(s);}};
    b.onpointerenter=()=>{$('#skdesc').textContent=s.desc;};box.appendChild(b);});
  $('#skdesc').textContent='แตะศัตรูเพื่อเปลี่ยนเป้า แล้วเลือกท่า';
  $('#acthd').innerHTML='';const n=document.createElement('b');n.textContent=u.name;const l=document.createElement('span');l.textContent='Lv '+u.lv+' · HP '+u.hp+'/'+u.maxHp;$('#acthd').append(n,l);$('#acthd').hidden=false;
}
function hideSkills(){$('#skills').hidden=true;$('#skdesc').textContent='';$('#acthd').hidden=true;}
function aiChoose(u){
  const ready=u.skills.filter(s=>!(u.cds[s.id]>0));
  let s=ready.find(x=>x.id==='s3')||(ready.find(x=>x.id==='s2')&&Math.random()<.7?ready.find(x=>x.id==='s2'):null)||u.skills[0];
  const foes=alive(u.side==='P'?'E':'P');
  const t=Math.random()<.6?foes.reduce((a,b)=>a.hp<b.hp?a:b,foes[0]):foes[Math.floor(Math.random()*foes.length)];
  return [s,t];
}

/* ================= ลงมือ ================= */
async function perform(u,s,t){
  const foes=alive(u.side==='P'?'E':'P'); if(!foes.length)return;
  if(!t||!t.alive)t=foes[0];
  tgtRing.visible=false; actRing.visible=false;
  FOCUS=new Set([u,...(s.target==='all'?foes:[t])]);
  if(u.dragon&&s.type==='ranged'){const c=centroid(u.side==='P'?'E':'P');camSide(u,{w:{position:c}},.7);}
  else if(u.dragon&&s.type==='leap'){camTrack(u,centroid(u.side==='P'?'E':'P'));}
  else if(u.dragon&&s.type==='melee')camSide(u,t,.8);
  else if(s.type==='melee'||s.type==='melee3')camSide(u,t); else camOver(u,()=>centroid(u.side==='P'?'E':'P'),1);
  $('#skname').textContent=s.name; $('#skname').className=u.side==='P'?'p':'e'; $('#skname').hidden=false;
  if(s.type==='melee'||s.type==='melee3'){
    await hop(u,frontOf(t,u),.42,1.1);
    await faceTo(u,t.w.position,.08);
    const n=s.type==='melee3'?3:1;
    if(n===3&&u.inner.userData.play)await strikeCombo(u,()=>{if(t.alive)dealHit(u,t,s);});
    else for(let i=0;i<n&&t.alive;i++)await strike(u,i,()=>dealHit(u,t,s));
    await wait(120); await recoverStance(u);
    await hop(u,u.home,.42,.9); await faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.15);
  } else if(s.type==='ranged'&&u.dragon){
    await faceTo(u,centroid(u.side==='P'?'E':'P'),.2);
    await dragonBreath(u,foes,()=>foes.forEach(f=>dealHit(u,f,s)));
    faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.2);
  } else if(s.type==='ranged'){
    u.inner.userData.acting=true;
    for(const t2 of foes){faceTo(u,t2.w.position,.08);const r=u.rig;poseTo([[r.R.a.rotation,'z',-1.2],[r.R.a.rotation,'x',-1.4]],.08);
      throwAt(u,t2).then(()=>dealHit(u,t2,s)); await wait(170); poseTo([[r.R.a.rotation,'z',-2.3],[r.R.a.rotation,'x',-.2]],.1);}
    await wait(420); await recoverStance(u); faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.15);
  } else if(s.type==='leap'){
    const c=new THREE.Vector3();foes.forEach(f=>c.add(f.w.position));c.divideScalar(foes.length);{const dir=u.side==='P'?1:-1;const front=dir>0?Math.min(...foes.map(f=>f.w.position.x-f.rad)):Math.max(...foes.map(f=>f.w.position.x+f.rad));c.x=front-dir*(u.reach+.35);}
    const r=u.rig, A=u.inner.userData;
    if(u.dragon){await dragonDive(u,c,foes,()=>foes.forEach(f=>dealHit(u,f,s)));await wait(200);await dragonFly(u,u.home,.7,1.4);await faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.2);$('#skname').hidden=true;FOCUS=null;await wait(250);return;}
    if(A.play){const inf=A.clipInfo('leap'),sp=1.15,from=u.w.position.clone();faceTo(u,c,.12);A.play('leap',{speed:sp,fade:.08});
      await tween(inf.main/sp,t=>{u.w.position.lerpVectors(from,c,t);u.w.position.y=Math.sin(t*Math.PI)*.6;},easeIO); u.w.position.y=0;}
    else{
    poseTo([[r.R.sh.rotation,'z',-2.9],[r.L.sh.rotation,'z',2.9],[r.R.el.rotation,'z',-.3],[r.L.el.rotation,'z',.3]],.3);
    await hop(u,c,.6,3);
    poseTo([[r.torso.rotation,'x',.55],[r.R.sh.rotation,'z',-.3],[r.R.sh.rotation,'x',-1.5],[r.L.sh.rotation,'z',.3],[r.L.sh.rotation,'x',-1.5],[r.hips.position,'y',.5]],.1);
    await wait(90);}
    shockRing(c,0xd8f7ff); shake=.2; particles(tmpV.copy(c).setY(.1),0xb8a888,24,1.8,.3,-.2,.5);
    hitArc(tmpV.copy(c).setY(1).add(new THREE.Vector3(u.side==='P'?1:-1,0,.3)),Math.PI/2,0xe8f0ff,1.6);
    foes.forEach(f=>dealHit(u,f,s));
    await wait(420); await recoverStance(u); await hop(u,u.home,.5,1.2);
    await faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.15);
  }
  $('#skname').hidden=true; FOCUS=null;
  await wait(250);
}

/* ================= วงจรการต่อสู้ ================= */
let stage=null, waveIdx=0, deaths=0, running=false;
async function runBattle(st){
  stage=st; waveIdx=0; deaths=0; running=true;
  UNITS.forEach(removeUnit); UNITS=[]; PICKU=[]; RIGS=[]; clearTrails();
  TEAM.forEach((d,i)=>makeUnit('P',d,i));
  $('#hud').hidden=false; $('#stTitle').textContent=st.id+' '+st.name;
  await spawnWave();
  while(running){
    if(!alive('E').length){
      if(waveIdx<stage.waves.length-1){waveIdx++;alive('P').forEach(u=>{u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.25));updateBar(u);popNum(u,'+'+Math.round(u.maxHp*.25),'info');});await wait(500);await spawnWave();continue;}
      return finish(true);
    }
    if(!alive('P').length)return finish(false);
    const u=nextActor(); actor=u; renderOrder(u);
    { const fs=u.side==='P'?'E':'P'; camOver(u,()=>u.side==='P'&&target&&target.alive?target.w.position:centroid(fs)); }
    actRing.visible=true; actRing.position.x=u.w.position.x; actRing.position.z=u.w.position.z; actRing.scale.setScalar(u.boss?1.4:1);
    Object.keys(u.cds).forEach(k=>{if(u.cds[k]>0)u.cds[k]--;});
    if(u.stun){u.stun=0;updateBar(u);popNum(u,'มึน ข้ามเทิร์น','info');await wait(700);continue;}
    let s,t;
    if(u.side==='P'&&!AUTO){
      target=pickDefaultTarget(); showTarget();
      s=await new Promise(res=>{choose=res;showSkills(u);});
      if(!running)return;
      hideSkills(); t=s.target==='all'?null:target;
    } else { [s,t]=aiChoose(u); await wait(u.side==='E'?450:250); }
    if(!running)return;
    await perform(u,s,t);
    u.cds[s.id]=s.cd;
    UNITS.filter(x=>!x.alive&&x.side==='P'&&!x.counted).forEach(x=>{x.counted=true;deaths++;});
  }
}
function showTarget(){if(target&&target.alive){tgtRing.visible=true;tgtRing.position.x=target.w.position.x;tgtRing.position.z=target.w.position.z;tgtRing.scale.setScalar(target.boss?1.4:1);}}
async function spawnWave(){
  camWide();
  UNITS.filter(u=>u.side==='E').forEach(removeUnit); UNITS=UNITS.filter(u=>u.side==='P');
  const wv=stage.waves[waveIdx];
  const boss=wv.some(d=>d.boss);
  await banner(boss?'บอสปรากฏตัว!':'คลื่น '+(waveIdx+1)+'/'+stage.waves.length,boss?'boss':'');
  $('#wave').textContent='คลื่น '+(waveIdx+1)+'/'+stage.waves.length;
  const slots=wv.length===1?[0]:wv.length===2?[1,2]:[1,0,2];
  const order=wv.length===3?[wv[0],wv[1],wv[2]]:wv;
  const made=order.map((d,i)=>makeUnit('E',d,slots[i]));
  made.forEach((u,i)=>{const k=u.w.scale.x;u.w.position.y=6;smoke(tmpV.copy(u.home).setY(.5));tween(.55+i*.1,t=>u.w.position.y=6*(1-t),t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;});});
  if(boss){shake=.25;}
  await wait(900);
}
function finish(win){
  running=false; {const ps=alive('P');if(win&&ps.length)camOver(ps[0],()=>ps[0].w.position.clone().add(new THREE.Vector3(-4,0,1.2)));else camWide();} actRing.visible=false; tgtRing.visible=false; hideSkills();
  const stars=win?(deaths===0?3:deaths===1?2:1):0;
  const prev=PROG.stars[stage.id]||0, first=win&&!prev;
  if(win){PROG.stars[stage.id]=Math.max(prev,stars);saveProg();}
  if(win)alive('P').forEach((u,i)=>setTimeout(()=>{if(u.dragon)dragonSet(u,{rear:1,breath:1,flapSpd:1.6},.4);else if(u.inner.userData.play)u.inner.userData.play('victory',{loop:true,fade:.25});else if(u.evo)poseTo([[u.rig.R.sh.rotation,'z',-2.6],[u.rig.L.sh.rotation,'z',2.6]],.3);else{u.inner.userData.acting=true;poseTo([[u.rig.R.a.rotation,'z',-3],[u.rig.L.a.rotation,'z',2.6]],.3);}particles(tmpV.copy(u.w.position).setY(1.2),0xffd27a,20,2,.05,1.2);},i*150));
  setTimeout(()=>showResult(win,stars,first),900/SPEED);
}

/* ================= หน้าจอ ================= */
const PKEY='amber_battle_prog_v1';
let PROG; try{PROG=JSON.parse(localStorage.getItem(PKEY))||{stars:{}};}catch(e){PROG={stars:{}};}
const saveProg=()=>{try{localStorage.setItem(PKEY,JSON.stringify(PROG));}catch(e){}};
function unlocked(i){return i===0||(PROG.stars[STAGES[i-1].id]||0)>0;}
function showMap(){
  camWide();
  $('#hud').hidden=true; $('#result').hidden=true; $('#map').hidden=false; hideSkills();
  const box=$('#nodes');box.innerHTML='';
  STAGES.forEach((st,i)=>{const b=document.createElement('button');const ok=unlocked(i), s=PROG.stars[st.id]||0;
    b.className='node'+(ok?'':' locked')+(st.waves.some(w=>w.some(d=>d.boss))?' bossn':'');b.disabled=!ok;
    b.innerHTML='<span class="nid"></span><span class="nnm"></span><span class="nst"></span><span class="nmeta"></span>';
    b.querySelector('.nid').textContent=st.id;b.querySelector('.nnm').textContent=st.name;
    b.querySelector('.nst').textContent=ok?('★'.repeat(s)+'☆'.repeat(3-s)):'ล็อก';
    b.querySelector('.nmeta').textContent=st.waves.length+' คลื่น · พลังงาน '+st.cost;
    b.onclick=()=>startStage(st);box.appendChild(b);});
}
function showResult(win,stars,first){
  const r=$('#result');r.hidden=false;r.className=win?'win':'lose';
  $('#rTitle').textContent=win?'ชนะ!':'พ่ายแพ้';
  const st=$('#rStars');st.innerHTML='';for(let i=0;i<3;i++){const s=document.createElement('span');s.textContent='★';if(i<stars){s.className='on';s.style.animationDelay=(.2+i*.25)+'s';}st.appendChild(s);}
  const rw=$('#rRew');rw.innerHTML='';
  const tip=[['คำแนะนำ','ใช้ท่าที่ทำให้ศัตรูมึน และเก็บท่าแรงไว้ใช้กับบอส']];
  const row=(a,b)=>{const d=document.createElement('div');d.className='rr';const x=document.createElement('span');x.textContent=a;const y=document.createElement('b');y.textContent=b;d.append(x,y);rw.appendChild(d);return y;};
  const btns=['#rMap','#rRetry','#rNext'].map(s=>$(s));
  if(BN.bid){
    // ออนไลน์: รางวัลจริงมาจากเซิร์ฟเวอร์
    const cY=win?row('เหรียญ','…'):null, xY=win?row('ค่าประสบการณ์ผู้เล่น','…'):null; if(!win)tip.forEach(([a,b])=>row(a,b));
    const note=row('สถานะ','กำลังบันทึกผล…'); btns.forEach(b=>b.disabled=true);
    bnFinish(win).then(res=>{if(cY){cY.textContent='+'+res.coins;xY.textContent='+'+res.xp;} note.textContent='บันทึกแล้ว ⚡ '+BN.state.player.energy+'/'+BN.state.player.energy_max;})
      .catch(e=>{if(cY){cY.textContent='-';xY.textContent='-';} note.textContent=BERR[e.code]||BERR.network;})
      .finally(()=>btns.forEach(b=>b.disabled=false));
  } else {
    (win?[['เหรียญ','+'+stage.coins+' (ทดลอง)']]:tip).forEach(([a,b])=>row(a,b));
    row('โหมดทดลอง','ไม่ได้รับรางวัลจริง');
  }
  $('#rStarsNote').textContent=win?(stars===3?'ไม่มีมอนสเตอร์ล้มเลย':stars===2?'มีมอนสเตอร์ล้ม 1 ตัว':'มีมอนสเตอร์ล้มมากกว่า 1 ตัว'):'';
  const i=STAGES.indexOf(stage), nx=STAGES[i+1];
  $('#rNext').hidden=!(win&&nx); if(nx)$('#rNext').onclick=()=>startStage(nx);
  $('#rRetry').onclick=()=>startStage(stage);
  $('#rMap').onclick=()=>{UNITS.forEach(removeUnit);UNITS=[];showMap();};
}
$('#bAuto').onclick=()=>{AUTO=!AUTO;$('#bAuto').classList.toggle('on',AUTO);$('#bAuto').setAttribute('aria-pressed',AUTO);if(AUTO&&choose){const c=choose;choose=null;hideSkills();const [s]=aiChoose(actor);target=aiChoose(actor)[1];c(s);}};
$('#bSpeed').onclick=()=>{SPEED=SPEED===1?2:1;$('#bSpeed').textContent='x'+SPEED;$('#bSpeed').classList.toggle('on',SPEED===2);};
$('#bExit').onclick=()=>{if(BN.bid)bnFinish(false).catch(()=>{});running=false;if(choose){choose=null;}UNITS.forEach(removeUnit);UNITS=[];actRing.visible=tgtRing.visible=false;$('#skname').hidden=true;showMap();};

/* ---------- แตะเลือกเป้า ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{
  if(!choose)return;
  const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const h=ray.intersectObjects(PICKU,false).find(h=>{const u=UNITS[h.object.userData.unit]||UNITS.find(x=>x.id===h.object.userData.unit);return u&&u.alive&&u.side==='E';});
  if(h){target=UNITS.find(x=>x.id===h.object.userData.unit);showTarget();}
});

/* ================= ลูป ================= */
let FOCUS=null;
const CAM=new THREE.Vector3(.6,5.2,10.2), LOOK=new THREE.Vector3(0,1,0), CAMt=CAM.clone(), LOOKt=LOOK.clone();
let camMode={type:'wide'}, camK=2.5; const _cd=new THREE.Vector3(), _cr=new THREE.Vector3(), _cf=new THREE.Vector3();
const camWide=()=>{camMode={type:'wide'};camK=2.2;};
const camOver=(u,focus,far)=>{camMode={type:'over',u,focus,far:far||0};camK=3.2;};
const camTrack=(u,c)=>{camMode={type:'track',u,c:c.clone()};camK=3.5;};
const camSide=(a,t,ex)=>{camMode={type:'side',a,t,ex:ex||0};camK=4;};
const centroid=side=>{const us=alive(side);const c=new THREE.Vector3();us.forEach(x=>c.add(x.w.position));return us.length?c.divideScalar(us.length):c;};
function camUpdate(){
  const port=camera.aspect<.9, m=camMode;
  if(m.type==='over'&&m.u){
    const p=m.u.w.position, f=typeof m.focus==='function'?m.focus():m.focus;
    _cd.copy(f).sub(p).setY(0); if(_cd.lengthSq()<1e-4)_cd.set(m.u.side==='P'?1:-1,0,0); _cd.normalize();
    _cr.set(-_cd.z,0,_cd.x);
    const mates=alive(m.u.side).filter(x=>x!==m.u); let cz=0; mates.forEach(x=>cz+=x.w.position.z); cz=mates.length?cz/mates.length:0;
    const out=Math.sign((p.z-cz)*_cr.z)||1; _cr.multiplyScalar(out);
    const sc=m.u.camS||(m.u.boss?1.3:1), far=m.far, small=m.u.evo?0:1;
    const dist=(port?6.4:4.1)*sc+far*2+small*.6, side=(port?.9:1.55)*sc+far*.4, h=(port?3.4:2.55)*sc+far*1.2+small*.35;
    CAMt.copy(p).addScaledVector(_cd,-dist).addScaledVector(_cr,side).setY(h);
    LOOKt.copy(p).addScaledVector(_cd,port?4.2:3.8).addScaledVector(_cr,port?0:-.4).setY(port?1.1:1.25);
  } else if(m.type==='track'&&m.u){
    const c=m.c, p=m.u.w.position; _cd.copy(c).sub(m.u.home).setY(0); if(_cd.lengthSq()<1e-4)_cd.set(1,0,0); _cd.normalize(); _cr.set(-_cd.z,0,_cd.x); if(_cr.z<0)_cr.multiplyScalar(-1);
    _cf.copy(c).lerp(m.u.home,.35);
    CAMt.copy(_cf).addScaledVector(_cr,port?11:8.5).setY(port?3:2.2); LOOKt.copy(_cf).setY(1).lerp(tmpV.copy(p).setY(p.y+1.2),.55);
  } else if(m.type==='side'&&m.a&&m.t){
    const a=m.a.w.position,t=m.t.w.position; _cf.copy(a).add(t).multiplyScalar(.5);
    _cd.copy(t).sub(a).setY(0); if(_cd.lengthSq()<1e-4)_cd.set(1,0,0); _cd.normalize(); _cr.set(-_cd.z,0,_cd.x); if(_cr.z<0)_cr.multiplyScalar(-1);
    const span=Math.min(8,a.distanceTo(t)); const ex=m.ex||0, dist=(port?6.5:4.6)+span*(.35+ex*.12)+ex*(port?2.2:1.4);
    CAMt.copy(_cf).addScaledVector(_cr,dist).setY((port?2.6:2.0)+ex*.5); LOOKt.copy(_cf).setY(1.05+ex*.35);
  } else {
    if(port){CAMt.set(-12,9,.5);LOOKt.set(.5,.3,-.3);} else {CAMt.set(.6,5.2,10.2);LOOKt.set(0,1,0);}
  }
}
function layout(){const w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;const a=camera.aspect;
  camera.fov=a<.6?58:a<.9?50:a<1.3?52:44;
  camera.updateProjectionMatrix();}
new ResizeObserver(layout).observe(view);
const clock=new THREE.Clock(); let T=0;
function loop(){
  requestAnimationFrame(loop);
  const rdt=Math.min(clock.getDelta(),.1), dt=rdt*SPEED*HS; T+=rdt;
  for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i];tw.t+=dt;const k=Math.min(1,tw.t/tw.d);tw.fn(tw.ease(k));if(k>=1){tweens.splice(i,1);tw.r();}}
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.p.position.addScaledVector(q.v,dt);q.v.y-=dt*q.grav;q.v.multiplyScalar(q.grow?.96:1);q.life-=dt*q.decay;q.p.material.opacity=Math.max(0,q.life*q.o);if(q.grow)q.p.scale.multiplyScalar(1+dt*.9);if(q.life<=0){scene.remove(q.p);q.p.material.dispose();parts.splice(i,1);}}
  rigUpdate(dt);
  UNITS.forEach(u=>{if(u.alive||u.w.visible)u.inner.userData.idle(T);});
  separate(); trailUpdate(); blobUpdate();
  falling.forEach((l,i)=>{l.position.y-=rdt*.35;l.position.x+=Math.sin(T+i)*rdt*.3;l.rotation.x+=rdt*(1.5+i%3);l.rotation.y+=rdt;if(l.position.y<.05)l.position.set((Math.random()-.5)*16,5+Math.random()*2,-6+Math.random()*10);});
  flies.forEach(f=>{const [a,b,p]=f.userData.p;f.position.set(p.x+Math.sin(T*.5+a)*.5,p.y+Math.sin(T*.7+b)*.3,p.z+Math.cos(T*.4+a)*.4);f.material.opacity=.4+.5*Math.sin(T*2+a*3);});
  if(actRing.visible){actRing.material.opacity=.6+.35*Math.sin(T*5);}
  if(tgtRing.visible){tgtRing.material.opacity=.6+.35*Math.sin(T*6);tgtRing.rotation.z+=rdt;}
  // แถบพลังชีวิตตามตัว
  UNITS.forEach(u=>{if(!u.barEl||u.barEl.hidden)return;const v=tmpV.copy(u.w.position).setY(u.barY||(u.evo?(u.boss?3.25:2.6):1.6)).project(camera);u.barEl.style.visibility=v.z>1||Math.abs(v.x)>1.1||(FOCUS&&!FOCUS.has(u))?'hidden':'';
    u.barEl.style.transform=`translate(${(v.x*.5+.5)*view.clientWidth}px,${(-v.y*.5+.5)*view.clientHeight}px) translate(-50%,-100%)`;
    u.barEl.querySelector('.atb i').style.width=Math.min(100,u.gauge)+'%';});
  camUpdate(); const ck=1-Math.exp(-rdt*camK); CAM.lerp(CAMt,ck); LOOK.lerp(LOOKt,ck);
  camera.position.copy(CAM).add(tmpV.set(Math.sin(T*.3)*.06,Math.sin(T*.4)*.03,0));
  if(shake>.002){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake*=.86;}
  camera.lookAt(LOOK);
  OCC.forEach(g=>{const dx=g.position.x-camera.position.x,dz=g.position.z-camera.position.z;const r=g.userData.occR||3.4;g.visible=dx*dx+dz*dz>r*r;});
  UNITS.forEach(u=>{if(!u.alive){u.inner.visible=true;return;}const near=u!==actor&&camMode.type!=='wide'&&camera.position.distanceTo(u.w.position)<(actor?camera.position.distanceTo(actor.w.position)-.3:3.1);u.inner.visible=!near;if(u.barEl&&near)u.barEl.style.visibility='hidden';});
  renderer.render(scene,camera);
}
layout(); loop();
$('#loadMsg').hidden=false;
Promise.all([loadMeshy(p=>{$('#loadMsg').textContent='กำลังโหลดโมเดล '+Math.round(p*100)+'%';}),loadDragon(),bnInit()]).then(([g,dr])=>{if(!dr)TEAM.forEach(d=>{if(d.sp==='amateru')d.sp='kazemaru';});bnRender();$('#loadMsg').hidden=true;if(!g){USE_MESHY=false;$('#bModel').hidden=true;}updModelBtn();showMap();});
function updModelBtn(){$('#bModel').textContent='โมเดลคาเซะคิริ: '+(USE_MESHY?'Meshy AI':'แบบเดิม');$('#bModel').classList.toggle('on',USE_MESHY);}
$('#bModel').onclick=()=>{USE_MESHY=!USE_MESHY;updModelBtn();};
addEventListener('resize',layout);
