/* ================= แถบพลังชีวิตและตัวเลข ================= */
const ov=$('#ov');
// เหนือหัว: แสดงเฉพาะบัพ/ดีบัพ · เลือดอยู่ในแผงข้าง (ทีมเรา = ซ้าย, ศัตรู = ขวา)
function makeBar(u){
  const b=document.createElement('div'); b.className='ubar '+(u.side==='P'?'p':'e')+(u.boss?' boss':''); b.hidden=true; ov.appendChild(b); u.barEl=b; u.stSig='';
  const r=document.createElement('div'); r.className='hrow2 '+(u.side==='P'?'p':'e')+(u.boss?' boss':'');
  r.innerHTML='<div class="rt"><span class="el"></span><span class="nm"></span><span class="lv"></span></div><div class="hp"><i></i><em></em></div>';
  const E=ELEM[u.el]; if(E){r.querySelector('.el').textContent=E.i;r.title='ธาตุ'+u.el;} else r.querySelector('.el').remove();
  r.querySelector('.nm').textContent=u.name; r.querySelector('.lv').textContent='Lv'+u.lv+(u.stars?' ★'+u.stars:'');
  const box=$(u.side==='P'?'#hpL':'#hpR'); if(u.boss)box.prepend(r); else box.appendChild(r); u.row=r;
  setTimeout(()=>updateBar(u),0); return b;
}
function updateBar(u){const r=u.row;if(!r)return;if(u.raidBar){u.raidBar(r);return;}const k=Math.max(0,u.hp/u.maxHp);
  r.querySelector('.hp i').style.width=(k*100)+'%'; r.querySelector('.hp em').textContent=u.hp+'/'+u.maxHp;
  r.classList.toggle('low',k>0&&k<.3); r.classList.toggle('dead',!u.alive||u.hp<=0);}
function rowGone(u){const r=u.row;if(!r)return;r.classList.add('dead');if(u.side==='E')setTimeout(()=>{r.classList.add('out');setTimeout(()=>r.remove(),400);},500);}
// บัพ/ดีบัพที่ตัวละครได้รับ (คืนค่าเป็นรายการ [ไอคอน, คลาส, คำอธิบาย])
function statusOf(u){const L=[];
  if(u.stun||u.stunT>0)L.push(['💫','bad','มึน']);
  const ta=teamAtkOf(u.side); if(ta)L.push(['⚔️','good','โจมตี +'+Math.round(ta*100)+'%']);
  if(raceAtkBonus(u.side))L.push(['🚩','good','ธงศึก โจมตี +'+Math.round(RACES.human.atk*100)+'%']);
  const p=u.pas||{}; if(p.dr)L.push(['🛡️','good','รับดาเมจ −'+Math.round(p.dr*100)+'%']);
  if(p.revive&&!u.revived)L.push(['💖','good','เก้าชีวิต (ยังไม่ใช้)']);
  if(p.dmgLow)L.push(['🎯','good','แรงขึ้นใส่ศัตรูเลือดน้อย']);
  return L;}
function renderStatus(u){const L=statusOf(u), sig=L.map(x=>x[0]).join('');if(sig===u.stSig)return !!sig;u.stSig=sig;const b=u.barEl;b.innerHTML='';
  L.forEach(([i,c,t])=>{const s=document.createElement('span');s.className='bf '+c;s.textContent=i;s.title=t;b.appendChild(s);});return !!sig;}
function popNum(u,text,cls){
  const v=tmpV.copy(u.w.position).setY(u.popY||(u.evo?(u.boss?3.4:2.7):1.7)).project(camera);
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
  [cur,...previewOrder(5)].forEach((u,i)=>{const c=document.createElement('div');c.className='oc '+(u.side==='P'?'p':'e')+(i===0?' now':'')+(u.boss?' boss':'');c.textContent=u.side==='E'?(u.boss?'บอส':'ชาด'):({kazekiri:'คิริ',kazemaru:'มารุ',amateru:'มังกร',kuroga:'คุโร',hakuneko:'เนโกะ',morihime:'โมริ',yorugumo:'แมงมุม',seiro:'เซย์',kohaku:'โคฮา',garok:'กาโรค'}[u.sp]||'');o.appendChild(c);});
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
  u.skills.filter(s=>s.type!=='passive').forEach(s=>{const cd=u.cds[s.id]||0;const b=document.createElement('button');b.className='sk'+(s.id!=='s1'?' sp':'');b.disabled=cd>0;
    b.innerHTML='<b></b><small></small>'+(cd?'<i class="cd"></i>':'');b.querySelector('b').textContent=s.name;b.querySelector('small').textContent=s.target==='all'?'ศัตรูทุกตัว':'ศัตรู 1 ตัว';if(cd)b.querySelector('.cd').textContent=cd;
    b.title=s.desc;b.onclick=()=>{if(choose){const c=choose;choose=null;c(s);}};
    b.onpointerenter=()=>{$('#skdesc').textContent=s.desc;};box.appendChild(b);});
  $('#skdesc').textContent='แตะศัตรูเพื่อเปลี่ยนเป้า แล้วเลือกท่า';
  $('#acthd').innerHTML='';const n=document.createElement('b');n.textContent=u.name;const l=document.createElement('span');l.textContent='Lv '+u.lv+' · HP '+u.hp+'/'+u.maxHp;$('#acthd').append(n,l);$('#acthd').hidden=false;
}
function hideSkills(){$('#skills').hidden=true;$('#skdesc').textContent='';$('#acthd').hidden=true;}
function aiChoose(u){
  const ready=u.skills.filter(s=>s.type!=='passive'&&!(u.cds[s.id]>0));
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
  if(u.spider){const back=()=>faceTo(u,new THREE.Vector3(u.home.x+(u.side==='P'?5:-5),0,u.home.z),.15);
    if(s.type==='ranged'){await faceTo(u,centroid(u.side==='P'?'E':'P'),.2);await spiderCast(u,foes,f=>dealHit(u,f,s));}
    else if(s.type==='leap'){await spiderLeap(u,centroid(u.side==='P'?'E':'P'),foes,()=>foes.forEach(f=>dealHit(u,f,s)));}
    else{const fr=frontOf(t,u),from=u.w.position.clone();await faceTo(u,fr,.1);spiderSet(u,{walk:1},.1);await tween(.45,k=>u.w.position.lerpVectors(from,fr,k),easeIO);spiderSet(u,{walk:0},.15);
      await faceTo(u,t.w.position,.08);const n=s.type==='melee3'?3:1;for(let i=0;i<n&&t.alive;i++)await spiderStrike(u,t,()=>dealHit(u,t,s));
      await faceTo(u,u.home,.1);spiderSet(u,{walk:1},.1);await tween(.45,k=>u.w.position.lerpVectors(fr,u.home,k),easeIO);spiderSet(u,{walk:0},.15);}
    await back();
  } else if(s.type==='melee'||s.type==='melee3'){
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
let stage=null, waveIdx=0, deaths=0, running=false, OPTS={};
async function runBattle(st,opts){
  stage=st; OPTS=opts||{}; waveIdx=0; deaths=0; running=true;
  UNITS.forEach(removeUnit); UNITS=[]; PICKU=[]; RIGS=[]; clearTrails();
  TEAM.forEach((d,i)=>makeUnit('P',d,i));
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
    if(u.side==='P'&&!AUTO&&!OPTS.idle){
      target=pickDefaultTarget(); showTarget();
      s=await new Promise(res=>{choose=res;showSkills(u);});
      if(!running||!s)return;
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
  const bd=wv.find(d=>d.boss);
  if(!OPTS.idle){await banner(boss?(bd&&bd.name?bd.name+' ปรากฏตัว!':'บอสปรากฏตัว!'):'คลื่น '+(waveIdx+1)+'/'+stage.waves.length,boss?'boss':'');$('#wave').textContent='คลื่น '+(waveIdx+1)+'/'+stage.waves.length;}
  else if(OPTS.banner)await banner(OPTS.banner,'');
  const slots=wv.length===1?[0]:wv.length===2?[1,2]:[1,0,2];
  const made=wv.map((d,i)=>makeUnit('E',d,slots[i]));
  made.forEach((u,i)=>{u.w.position.y=6;smoke(tmpV.copy(u.home).setY(.5));tween(.55+i*.1,t=>u.w.position.y=6*(1-t),t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;});});
  if(boss){shake=.25;}
  await wait(OPTS.idle?600:900);
}
async function finish(win){
  running=false; {const ps=alive('P');if(!BIG&&win&&ps.length)camOver(ps[0],()=>ps[0].w.position.clone().add(new THREE.Vector3(-4,0,1.2)));else camWide();} actRing.visible=false; tgtRing.visible=false; hideSkills();
  if(win)alive('P').forEach((u,i)=>setTimeout(()=>{if(u.dragon)dragonVictory(u);else if(u.spider)spiderVictory(u);else if(u.inner.userData.play)u.inner.userData.play('victory',{loop:true,fade:.25});else if(u.evo)poseTo([[u.rig.R.sh.rotation,'z',-2.6],[u.rig.L.sh.rotation,'z',2.6]],.3);else{u.inner.userData.acting=true;poseTo([[u.rig.R.a.rotation,'z',-3],[u.rig.L.a.rotation,'z',2.6]],.3);}particles(tmpV.copy(u.w.position).setY(1.2),0xffd27a,20,2,.05,1.2);},i*150));
  await wait(OPTS.idle?1000:900);
  return win;
}

/* ================= โหมด idle: ดันด่านเอง ================= */
let MODE='idle', CUR=null;
function idleRender(){
  const p=BN.online&&BN.state?BN.state.player:null, tl=$('#ipTeam');
  tl.textContent='';TEAM.forEach((d,i)=>{if(i)tl.append(' · ');const b=document.createElement('b');b.textContent=SPECIES[d.sp].name+' Lv'+d.lv;tl.append(b);});
  const pow=teamPow();
  $('#ipPow').textContent=fmtN(p?p.power:pow);
  if(!p){sweepRender(null);$('#ipNeed').textContent='';$('#ipBoss').hidden=true;$('#ipChest').hidden=true;$('#ipTrial').hidden=false;$('#ipStage').textContent='-';return;}
  $('#ipTrial').hidden=true;$('#ipChest').hidden=false;
  $('#ipStage').textContent=p.stage?stLabel(p.stage):'-';
  const ok=p.power>=p.need;
  $('#ipNeed').textContent=p.boss?'ด่านต่อไปเป็นบอส':(ok?'พอสำหรับด่าน '+stLabel(p.stage+1):'ด่าน '+stLabel(p.stage+1)+' ต้องการ '+fmtN(p.need));
  $('#ipNeed').className=p.boss?'boss':ok?'ok':'low';
  $('#ipBoss').hidden=!p.boss||MODE!=='idle'; $('#ipBoss').textContent='⚔ ท้าบอสด่าน '+stLabel(p.stage+1);
  const q=idleNow();
  $('#ipRew').textContent='🪙 '+fmtN(q.coins)+'  ·  ✦ '+fmtN(q.xp)+' exp';
  $('#ipBar').style.width=(q.sec/q.max*100)+'%';
  $('#ipTime').textContent=(q.sec>=q.max?'เต็มแล้ว! ':'')+fmtDur(q.sec)+' / '+fmtDur(q.max)+' · 🪙 '+p.rate_c+'/นาที';
  $('#ipClaim').disabled=q.sec<60;
  sweepRender(p);
}
// กวาดด่านด้วยพลังงาน (sweep_claim): 10 ⚡ = รางวัลดันด่าน 30 นาที · สูงสุด 6 ครั้งต่อการกด
function energyNow(p){
  const mx=p.energy_max||60,sec=p.energy_sec||180; let e=Number(p.energy||0);
  if(e<mx&&p.energy_next!=null){const el=Math.floor((Date.now()-BN.at)/1000),first=Number(p.energy_next)||sec;if(el>=first)e=Math.min(mx,e+1+Math.floor((el-first)/sec));}
  return {e,mx};
}
let SWBUSY=false;
function sweepRender(p){
  const box=$('#ipSweep'); if(!p){box.hidden=true;return;} box.hidden=false;
  const {e,mx}=energyNow(p),per=30*(p.rate_c||5),n=Math.min(6,Math.floor(e/10));
  $('#swEn').textContent='⚡ '+e+'/'+mx; $('#swPer').textContent='ครั้งละ 🪙 '+fmtN(per)+' · ✦ 30 exp';
  const b1=$('#sw1'),ba=$('#swAll');
  b1.innerHTML='กวาด ×1<small>10 ⚡</small>'; b1.disabled=SWBUSY||e<10;
  ba.hidden=n<2; if(n>=2){ba.innerHTML='×'+n+'<small>'+(n*10)+' ⚡</small>';ba.dataset.n=n;} ba.disabled=SWBUSY;
}
async function doSweep(n){
  if(SWBUSY||!n)return; SWBUSY=true; idleRender();
  try{const r=await brpc('sweep_claim',{n});bnApply(r.state);bMsg('กวาดด่าน '+n+' ครั้ง ได้ 🪙 '+fmtN(r.coins)+' · ✦ '+fmtN(r.xp)+' exp');}
  catch(e){bMsg(BERR[e.code]||BERR.network);}
  finally{SWBUSY=false;idleRender();}
}
$('#sw1').onclick=()=>doSweep(1);
$('#swAll').onclick=()=>doSweep(Number($('#swAll').dataset.n)||0);
setInterval(()=>{if(!document.hidden)idleRender();},1000);
async function idleLoop(){
  for(;;){
    if(MODE!=='idle'||document.hidden){await sleep(700);continue;}
    const p=BN.online&&BN.state?BN.state.player:null, pow=teamPow();
    let n, E, label, push=false, won=true;
    const farm=()=>{n=Math.max(1,p?p.stage:1);E=Math.min(REQ(n),pow*.42);};
    if(!p){farm();label='โหมดทดลอง';}
    else if(p.boss||p.power<p.need){farm();label=p.boss?'ฟาร์มอยู่ · รอท้าบอสด่าน '+stLabel(p.stage+1):'ฟาร์มอยู่ · อัปเลเวลทีมเพื่อไปต่อ';}
    else{
      try{const r=await brpc('idle_push');bnApply(r.state);push=true;won=r.won;n=r.stage;E=pow*(won?.42:1.5);label=won?'บุกด่านใหม่':'พลังไม่พอ';}
      catch(e){if(e.code!=='too_fast')bMsg(BERR[e.code]||BERR.network);if(e.code==='session')BN.online=false;farm();label='ฟาร์มอยู่';}
    }
    if(MODE!=='idle')continue;
    await useRealm(realmFor(n)); realmSkillOn(/[?&]realmfx=1/.test(location.search),'E');
    const ST=idleStage(n,E);
    $('#stTitle').textContent='ด่าน '+stLabel(n)+' · '+stageTitle(n,ST);
    CUR=rtBattle(ST,{idle:true,label,banner:push?'ด่าน '+stLabel(n):null});
    const vis=await CUR; CUR=null;
    if(push&&vis!==undefined&&vis!==won)console.warn('visual result differs from server',vis,won);
    if(MODE!=='idle')continue;
    if(push)await banner(won?'ผ่านด่าน '+stLabel(n)+'!':'พลังไม่พอ · ต้องการ '+fmtN(REQ(n)),won?'':'boss');
    else await wait(600);
    idleRender();
  }
}
function setBossUI(on){
  $('#idle').hidden=on; $('#bAuto').hidden=!on; $('#bExit').hidden=!on; $('#farmLink').hidden=on;
  AUTO=false; $('#bAuto').classList.remove('on'); $('#bAuto').setAttribute('aria-pressed','false');
}
async function startBoss(){
  if(MODE!=='idle'||!BN.online)return;
  MODE='boss'; $('#ipBoss').disabled=true;
  running=false; if(CUR)await CUR;
  let r;
  try{r=await brpc('boss_start');}catch(e){bMsg(BERR[e.code]||BERR.network);MODE='idle';$('#ipBoss').disabled=false;return;}
  $('#ipBoss').disabled=false;
  BN.bid=r.battle_id; BN.t0=Date.now(); bnApply(r.state);
  const n=r.stage; setBossUI(true);
  await useRealm(realmFor(n)); realmSkillOn(!!RL.key,'E');
  const BS=bossStage(n);
  $('#stTitle').textContent='ด่านบอส '+stLabel(n)+' · '+BS.boss+(BS.mod?' · '+BS.mod.icon+' '+BS.mod.name:''); $('#hud').hidden=false;
  const win=await rtBattle(BS,{manual:true,label:'ด่านบอส'}); realmSkillOn(false);
  showBossResult(!!win,n);
}
async function showBossResult(win,n){
  const r=$('#result');r.hidden=false;r.className=win?'win':'lose';
  $('#rTitle').textContent=win?'ชนะบอส!':'พ่ายแพ้';
  const rw=$('#rRew');rw.innerHTML='';
  const row=(a,b)=>{const d=document.createElement('div');d.className='rr';const x=document.createElement('span');x.textContent=a;const y=document.createElement('b');y.textContent=b;d.append(x,y);rw.appendChild(d);return y;};
  const note=row('สถานะ','กำลังบันทึกผล…'); const back=$('#rBack'); back.disabled=true;
  $('#rStarsNote').textContent=win?'ปลดล็อกด่าน '+stLabel(n+1)+' แล้ว ทีมจะดันด่านต่อเอง':'ลองอัปเลเวลทีมในฟาร์ม หรือใช้ท่าที่ทำให้ศัตรูมึนกับบอส';
  const bid=BN.bid; BN.bid=null;
  try{const w=15600-(Date.now()-BN.t0);if(w>0)await sleep(w);
    const res=await brpc('boss_finish',{battle_id:bid,won:win}); bnApply(res.state);
    if(res.won){row('เหรียญ','+'+fmtN(res.coins));row('อัมพร','+'+res.amber);note.textContent='บันทึกแล้ว';}
    else if(win&&res.weak){r.className='lose';$('#rTitle').textContent='ผลไม่ผ่าน';note.textContent='ทีมยังอ่อนเกินไปสำหรับด่านนี้';
      row('พลังทีม',fmtN(res.power)+' / ต้องมีอย่างน้อย '+fmtN(res.min_power));$('#rStarsNote').textContent='อัปเลเวลหรืออัปดาวทีมในฟาร์มให้พลังถึงเกณฑ์ แล้วลองใหม่';}
    else note.textContent='บันทึกแล้ว';}
  catch(e){note.textContent=BERR[e.code]||BERR.network;}
  back.disabled=false;
}
$('#rBack').onclick=()=>{$('#result').hidden=true;setBossUI(false);MODE='idle';idleRender();};
$('#ipBoss').onclick=startBoss;
$('#ipClaim').onclick=()=>claimIdle();
async function claimIdle(){
  const b=$('#ipClaim'),c=$('#awClaim'); if(b.disabled&&!c)return; b.disabled=true;if(c)c.disabled=true;
  try{const r=await brpc('idle_claim');bnApply(r.state);$('#away').hidden=true;bMsg('ได้รับ 🪙 '+fmtN(r.coins)+' · ✦ '+fmtN(r.xp)+' exp');}
  catch(e){bMsg(BERR[e.code]||BERR.network);}
  finally{if(c)c.disabled=false;idleRender();}
}
function showAway(){
  const q=idleNow(); if(!q||q.sec<600)return;
  $('#awTime').textContent='ทีมของคุณสู้ต่อระหว่างที่ไม่อยู่ '+fmtDur(q.sec)+(q.sec>=q.max?' (เต็มแล้ว)':'');
  $('#awCoins').textContent='+'+fmtN(q.coins); $('#awXp').textContent='+'+fmtN(q.xp); $('#away').hidden=false;
}
$('#awClaim').onclick=()=>claimIdle();
$('#awLater').onclick=()=>{$('#away').hidden=true;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&BN.online)bnRefresh().then(()=>{if(MODE==='idle')showAway();});});
setInterval(()=>{if(!document.hidden&&MODE==='idle')bnRefresh();},60000);
$('#bAuto').onclick=()=>{AUTO=!AUTO;$('#bAuto').classList.toggle('on',AUTO);$('#bAuto').setAttribute('aria-pressed',AUTO);if(AUTO&&choose){const c=choose;choose=null;hideSkills();const [s]=aiChoose(actor);target=aiChoose(actor)[1];c(s);}};
$('#bSpeed').onclick=()=>{SPEED=SPEED===1?2:1;$('#bSpeed').textContent='x'+SPEED;$('#bSpeed').classList.toggle('on',SPEED===2);};
$('#bExit').onclick=()=>{if(MODE==='raid'){if(RB&&RB.live)RB.t=RAID_T;return;}if((MODE!=='boss'&&MODE!=='abyss')||!running)return;running=false;if(choose){const c=choose;choose=null;c(null);}actRing.visible=tgtRing.visible=false;$('#skname').hidden=true;ultButtons(false);};

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
let camMode={type:'wide'}, camK=2.5;
// ซูมเข้าในสนามรบได้ไม่ใกล้เกินไป (ลดภาระเครื่อง)
const BT_ZMIN=45; var BT_ZMAX=75;
const RTS={tgt:new THREE.Vector3(-4,0,0),auto:new THREE.Vector3(),dist:55,base:55,pitch:.95,yaw:.3,manual:0,zoomed:false}; const _cd=new THREE.Vector3(), _cr=new THREE.Vector3(), _cf=new THREE.Vector3();
const camWide=()=>{camMode={type:'wide'};camK=3;};
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
    // กล้องมุมสูงแบบเกมวางแผน: ตามกลุ่มที่กำลังสู้ หรือเลื่อน/ซูมเองได้
    const us=UNITS.filter(u=>u.alive);
    if(RTS.manual<=0&&us.length){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;us.forEach(u=>{const p=u.w.position;x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);});
      RTS.auto.set((x0+x1)/2,0,(z0+z1)/2); RTS.tgt.lerp(RTS.auto,.06); if(!RTS.zoomed)RTS.dist+=(Math.min(BT_ZMAX,Math.max(RTS.base,Math.max(x1-x0,(z1-z0)*1.6)*.95))-RTS.dist)*.03;}
    const d=RTS.dist*(port?1.45:1), cp=Math.cos(RTS.pitch);
    CAMt.set(RTS.tgt.x+Math.sin(RTS.yaw)*cp*d, Math.sin(RTS.pitch)*d, RTS.tgt.z+Math.cos(RTS.yaw)*cp*d); LOOKt.copy(RTS.tgt).setY(.8);
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
  rigUpdate(dt); rtTick(dt,T); if(typeof raidTick==='function')raidTick(dt); if(typeof realmTick==='function')realmTick(dt); if(typeof storyTick==='function')storyTick(dt); if(typeof abyssTick==='function')abyssTick(dt,T);
  UNITS.forEach(u=>{if(u.alive||u.w.visible)u.inner.userData.idle(T);});
  separate(); trailUpdate(); blobUpdate();
  falling.forEach((l,i)=>{l.position.y-=rdt*.35;l.position.x+=Math.sin(T+i)*rdt*.3;l.rotation.x+=rdt*(1.5+i%3);l.rotation.y+=rdt;if(l.position.y<.05)l.position.set((Math.random()-.5)*16,5+Math.random()*2,-6+Math.random()*10);});
  flies.forEach(f=>{const [a,b,p]=f.userData.p;f.position.set(p.x+Math.sin(T*.5+a)*.5,p.y+Math.sin(T*.7+b)*.3,p.z+Math.cos(T*.4+a)*.4);f.material.opacity=.4+.5*Math.sin(T*2+a*3);});
  if(actRing.visible){actRing.material.opacity=.6+.35*Math.sin(T*5);}
  if(tgtRing.visible){tgtRing.material.opacity=.6+.35*Math.sin(T*6);tgtRing.rotation.z+=rdt;}
  // แถบพลังชีวิตตามตัว
  UNITS.forEach(u=>{if(!u.barEl)return;const on=u.alive&&renderStatus(u);u.barEl.hidden=!on;if(!on)return;
    const v=tmpV.copy(u.w.position).setY(u.barY||(u.evo?(u.boss?3.25:2.6):1.6)).project(camera);u.barEl.style.visibility=v.z>1||Math.abs(v.x)>1.1||(FOCUS&&!FOCUS.has(u))?'hidden':'';
    u.barEl.style.transform=`translate(${(v.x*.5+.5)*view.clientWidth}px,${(-v.y*.5+.5)*view.clientHeight}px) translate(-50%,-100%)`;});
  RTS.manual-=rdt; mapTick(T); sunFollow(LOOK); camUpdate(); const ck=1-Math.exp(-rdt*camK); CAM.lerp(CAMt,ck); LOOK.lerp(LOOKt,ck);
  camera.position.copy(CAM).add(tmpV.set(Math.sin(T*.3)*.06,Math.sin(T*.4)*.03,0));
  if(shake>.002){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake*=.86;}
  camera.lookAt(LOOK);
  { const lx=LOOK.x-camera.position.x, lz=LOOK.z-camera.position.z, ll=lx*lx+lz*lz||1;
    OCC.forEach(g=>{const dx=g.position.x-camera.position.x,dz=g.position.z-camera.position.z;const r=g.userData.occR||3.4;
      const t=(dx*lx+dz*lz)/ll, px=dx-lx*t, pz=dz-lz*t, block=t>0&&t<.92&&px*px+pz*pz<(r*.5)*(r*.5);
      g.visible=dx*dx+dz*dz>r*r&&!block;}); }
  UNITS.forEach(u=>{if(!u.alive){u.inner.visible=true;return;}const near=u!==actor&&camMode.type!=='wide'&&camera.position.distanceTo(u.w.position)<(actor?camera.position.distanceTo(actor.w.position)-.3:3.1);u.inner.visible=!near;if(u.barEl&&near)u.barEl.style.visibility='hidden';});
  renderer.render(scene,camera);
}
layout(); loop();
$('#loadMsg').hidden=false;
Promise.all([loadMeshy(p=>{$('#loadMsg').textContent='กำลังโหลดโมเดล '+Math.round(p*100)+'%';}),loadDragon(),bnInit(),loadSpider()]).then(([g,dr])=>{
  NO_DRAGON=!dr; if(!dr)TEAM.forEach(d=>{if(d.sp==='amateru')d.sp='kazemaru';});
  $('#loadMsg').hidden=true; if(!g)USE_MESHY=false;
  if(RAID_MODE){raidStart();return;}
  if(typeof ABYSS_MODE!=='undefined'&&ABYSS_MODE){abyssStart();return;}
  $('#hud').hidden=false; setBossUI(false); idleRender(); showAway(); idleLoop();
});
addEventListener('resize',layout);

/* ---------- ควบคุมกล้อง: ลากเพื่อเลื่อน ถ่าง/ล้อเมาส์เพื่อซูม ดับเบิลแตะให้กลับมาตามการต่อสู้ ---------- */
document.body.classList.add('big');
{ const el=renderer.domElement, pts=new Map(); let pinch0=0, dist0=0, lastTap=0;
  const pan=(dx,dy)=>{const k=RTS.dist*(camera.aspect<.9?1.45:1)*1.1/Math.max(300,view.clientHeight), cy=Math.cos(RTS.yaw), sy=Math.sin(RTS.yaw);
    RTS.tgt.x-=(dx*cy+dy*sy)*k; RTS.tgt.z-=(-dx*sy+dy*cy)*k*1.25; RTS.tgt.x=Math.max(-60,Math.min(70,RTS.tgt.x)); RTS.tgt.z=Math.max(-45,Math.min(45,RTS.tgt.z)); RTS.manual=6;};
  const zoom=f=>{RTS.dist=Math.max(BT_ZMIN,Math.min(BT_ZMAX,RTS.dist*f));RTS.zoomed=true;RTS.manual=Math.max(RTS.manual,3);};
  el.addEventListener('pointerdown',e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const [a,b]=[...pts.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);dist0=RTS.dist;}
    const now=performance.now(); if(now-lastTap<300){RTS.manual=0;RTS.zoomed=false;} lastTap=now;});
  el.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;
    if(pts.size===1){pan(e.clientX-p.x,e.clientY-p.y);} else if(pts.size===2){p.x=e.clientX;p.y=e.clientY;const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0>0){RTS.dist=Math.max(BT_ZMIN,Math.min(BT_ZMAX,dist0*pinch0/d));RTS.zoomed=true;RTS.manual=Math.max(RTS.manual,3);}return;}
    p.x=e.clientX;p.y=e.clientY;});
  const up=e=>{pts.delete(e.pointerId);pinch0=0;}; el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('pointerleave',up);
  el.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:1/1.12);},{passive:false});
}
// ดีบัก: battle.html?dbg=1 เปิด window.__B (กล้อง/ยูนิต) ไว้ตรวจท่าทางตัวละครใกล้ ๆ
if(/[?&]dbg=1/.test(location.search))window.__B={RTS,get UNITS(){return UNITS;},camera,MXA:typeof MXA!=='undefined'?MXA:null,setDist:d=>{RTS.dist=d;RTS.manual=99;},BN,idleRender,get AB(){return typeof AB!=='undefined'?AB:null},get AT(){return typeof AT!=='undefined'?AT:null},get MODE(){return MODE},get running(){return running}};
