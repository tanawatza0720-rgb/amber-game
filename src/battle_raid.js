/* ================= การรุกรานของไฮดรา: ฉากต่อสู้ (battle.html?raid=1) =================
   เซิร์ฟเวอร์คิดดาเมจตั้งแต่เริ่ม (raid_attack) · หน้าเกมเล่นฉากต่อสู้ 30 วินาที
   ตัวเลขดาเมจที่เด้งบนไฮดรารวมกันแล้วเท่ากับผลจริงจากเซิร์ฟเวอร์ · ไฮดราตีทีมเราเป็นฉาก (ไม่มีผลกับผล) */
var RAID_MODE=/[?&]raid=1/.test(location.search);
const RAID_T=30;
var RB=null;
// ตัวเลขที่เด้งบนไฮดรา: ไล่ให้ผลรวมตามเวลาถึงดาเมจจริงพอดีตอนจบ
function raidScale(d){
  if(!RB)return d;
  const want=Math.round(RB.res.dmg*Math.min(1,RB.t/RAID_T)*.97);
  let v=want-RB.shown; if(v<=0)v=Math.max(1,Math.round(RB.res.dmg*.004*(.6+Math.random()*.8)));
  v=Math.min(v,Math.max(0,RB.res.dmg-RB.shown)); if(v<=0)v=1;
  RB.shown+=v; return v;
}
const RAID_HITS={ // เวลาที่ท่าโดนทีมเรา: [วินาที, สัดส่วนเลือด, แบบ ('all'|'near'|'rand'), โอกาสมึน]
  roar:[[.95,.025,'all',.15]], breath:[0,1,2,3,4,5].map(i=>[.72+i*.75,.05,'rand']), breathAll:[[1.7,.035,'all'],[2.4,.035,'all'],[3.1,.035,'all']],
  flameSweep:[[1.2,.035,'all'],[1.9,.035,'all'],[2.6,.035,'all']], bite:[[.55,.09,'near']], biteCombo:[0,1,2,3,4,5].map(k=>[.57+k*.62,.05,'rand']),
  slam:[[1.3,.09,'near',.3]], stomp:[[.55,.045,'all'],[1.65,.045,'all']], gust:[[.9,.025,'all'],[1.85,.025,'all'],[2.8,.025,'all']],
  jump:[[2.36,.1,'all',.25]], sweep:[[1,.06,'all']], spin:[[1.2,.06,'all']], tailStab:[[1.25,.11,'rand']], charge:[[1.05,.08,'all']],
  meteor:[[2,.05,'all'],[3,.05,'all']], enrage:[], taunt:[]
};
const RAID_AI=[['roar',1],['breath',1.2],['breathAll',.8],['flameSweep',1],['bite',1.2],['biteCombo',1],['slam',1.2],['stomp',.9],['gust',.8],['jump',.7],['sweep',1],['spin',.8],['tailStab',1],['charge',.7],['meteor',.8],['enrage',.5],['taunt',.4]];
function raidPick(){const tot=RAID_AI.reduce((a,b)=>a+b[1],0);let r=Math.random()*tot;for(const [m,w] of RAID_AI){r-=w;if(r<=0)return m;}return 'bite';}
function raidHurt(u,frac,stun){
  if(!u.alive)return;
  const d=Math.max(1,Math.round(u.maxHp*frac*(.85+Math.random()*.3)*(u.pas&&u.pas.dr?1-u.pas.dr:1)));
  u.hp=Math.max(0,u.hp-d); popNum(u,d,'dmg'); updateBar(u);
  if(stun&&Math.random()<stun&&u.hp>0){u.stun=1;setTimeout(()=>popNum(u,'มึน','info'),200);}
  if(u.hp<=0){if(u.pas&&u.pas.revive&&!u.revived){u.revived=true;u.hp=Math.round(u.maxHp*u.pas.revive);popNum(u,'เก้าชีวิต! +'+u.hp,'heal');updateBar(u);}else die(u);}
  else react(u,RB?RB.u.w.position.x:20);
}
function raidTick(dt){
  if(!RB)return;
  RB.H.tick(dt); shake=Math.max(shake,RB.H.shakeCam*.25);
  if(!RB.live)return;
  RB.t+=dt;
  // ท่าของไฮดรา
  RB.cd-=dt;
  if(RB.cd<=0&&!RB.H.busy()){const mv=raidPick();RB.mv={name:mv,t:0,done:new Set()};RB.H.play(mv);popNum(RB.u,HY_MOVES.find(m=>m[0]===mv)[1],'info');RB.cd=1+Math.random()*1.2;}
  if(RB.mv){const m=RB.mv;m.t+=dt;(RAID_HITS[m.name]||[]).forEach(([at,fr,mode,st],i)=>{if(m.t>=at&&!m.done.has(i)){m.done.add(i);
      const ps=alive('P'); if(!ps.length)return;
      const tg=mode==='all'?ps:mode==='near'?[ps.reduce((a,b)=>Math.hypot(b.w.position.x-RB.u.w.position.x,b.w.position.z)<Math.hypot(a.w.position.x-RB.u.w.position.x,a.w.position.z)?b:a)]:[ps[Math.floor(Math.random()*ps.length)]];
      tg.forEach(u=>raidHurt(u,fr,st));}});}
  const left=Math.max(0,Math.ceil(RAID_T-RB.t));
  $('#wave').textContent='⏱ '+left+' วินาที · ดาเมจ '+fmtN(RB.shown);
  updateBar(RB.u);
  if(RB.t>=RAID_T||!alive('P').length)raidEnd();
}
async function raidStart(){
  MODE='raid'; if(typeof STORY!=='undefined')STORY.mod=null; setBossUI(true); if(typeof useRealm==='function')useRealm(null); $('#hud').hidden=false; $('#bExit').textContent='ถอย';
  $('#stTitle').textContent='การรุกรานของไฮดรา'; $('#wave').textContent='กำลังเตรียมการต่อสู้…';
  let H,res;
  try{
    if(!BN.online)throw Object.assign(new Error('session'),{code:'session'});
    H=await loadHydra(16);
    res=await brpc('raid_attack');
  }catch(e){raidFail(e);return;}
  const holder=new THREE.Group(); holder.position.set(15,0,0); holder.rotation.y=Math.PI; holder.add(H.root); scene.add(holder);
  H.root.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  // ไฮดราเป็นยูนิตฝั่งศัตรูแบบพิเศษ (ไม่ตาย เลือดแสดงเป็นเลือดรวมทั้งเซิร์ฟเวอร์)
  const mats=[];H.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&mats.indexOf(o.material)<0)mats.push(o.material);});
  H.body.userData.idle=()=>{};
  const u={id:UNITS.length,side:'E',sp:'hydra',boss:true,raid:true,evo:true,lv:99,name:'ราชันไฮดรา',maxHp:1e12,hp:1e12,atk:1,def:60,spd:60,skills:[],stars:0,
    alive:true,w:holder,inner:H.body,rig:null,home:holder.position.clone(),el:'ไฟ',pas:null,rad:7.8,reach:7,mats,popY:10,barY:16,revived:true};
  u.raidBar=r=>{const hp=Math.max(res.hp_after,res.hp_before-RB.shown),k=hp/res.hp_max;r.querySelector('.hp i').style.width=(k*100)+'%';r.querySelector('.hp em').textContent=fmtN(hp)+' / '+fmtN(res.hp_max);};
  u.bar=makeBar(u); UNITS.push(u);
  RB={H,u,res,t:0,shown:0,cd:2.2,mv:null,live:false};
  // ทีมเรา
  running=true; RT={manual:true}; raceReset();
  TEAM.forEach((d,i)=>{const p=rtInit(makeUnit('P',d,i));p.w.position.x+=7;p.home.x+=7;p.holdT=1.6;if(hasClip(p,'battlecry'))setTimeout(()=>p.alive&&p.inner.userData.play('battlecry',{speed:1.7,fade:.15}),150);else if(p.dragon)setTimeout(()=>p.alive&&dragonRoar(p,700),150);});
  document.body.classList.add('rt'); camMode={type:'wide'}; camK=1.6; RTS.tgt.set(2,0,0);
  ultButtons(true);
  H.play('roar'); banner('ราชันไฮดราปรากฏตัว!','boss');
  await wait(1200); RB.live=true;
}
function raidFail(e){
  const code=e&&e.code||'network';
  const msg={raid_no_hits:'วันนี้ตีไฮดราครบ 5 ครั้งแล้ว พรุ่งนี้มาใหม่นะ',no_raid:'ตอนนี้ไม่มีไฮดราให้ตี (ถูกปราบไปแล้ว)',no_race:'ต้องเลือกเผ่าก่อน',too_fast:'พักหายใจแป๊บนึง แล้วค่อยโจมตีอีกครั้ง',bad_team:'ต้องจัดทีมก่อน'}[code]||BERR[code]||BERR.network;
  const r=$('#result');r.hidden=false;r.className='lose';$('#rTitle').textContent='โจมตีไม่ได้';$('#rRew').innerHTML='';$('#rStarsNote').textContent=msg;
  $('#rBack').disabled=false; $('#rBack').onclick=()=>location.replace('./index.html?back=1');
}
async function raidEnd(){
  if(!RB||!RB.live)return; RB.live=false;
  const res=RB.res; if(RB.shown<res.dmg){popNum(RB.u,fmtN(res.dmg-RB.shown),'crit');RB.shown=res.dmg;updateBar(RB.u);}
  running=false; RT=null; document.body.classList.remove('rt'); ultButtons(false);
  if(res.killed){RB.H.play('die');banner('ไฮดราถูกปราบแล้ว!','');}else{RB.H.play(Math.random()<.5?'roar':'taunt');}
  alive('P').forEach((p,i)=>setTimeout(()=>{if(p.dragon)dragonVictory(p);else if(p.spider)spiderVictory(p);else if(p.inner.userData.play)p.inner.userData.play('victory',{loop:true,fade:.25});},i*120));
  await wait(1600);
  const R=res.raid||{}, me=R.me||{}, races=R.races||{};
  const r=$('#result');r.hidden=false;r.className='win';$('#rTitle').textContent=res.killed?'คุณปิดฉากไฮดรา!':'ปะทะไฮดรา';
  const rw=$('#rRew');rw.innerHTML='';
  const row=(a,b)=>{const d=document.createElement('div');d.className='rr';const x=document.createElement('span');x.textContent=a;const y=document.createElement('b');y.textContent=b;d.append(x,y);rw.appendChild(d);};
  row('ดาเมจครั้งนี้',fmtN(res.dmg));
  row('ดาเมจรวมของคุณ',fmtN(me.dmg||res.dmg)+(me.rank?' (อันดับ '+me.rank+')':''));
  row('เลือดไฮดราเหลือ',fmtN(res.hp_after)+' / '+fmtN(res.hp_max));
  if(RACE&&races[RACE])row('เผ่า'+RACES[RACE].n.replace(/^เผ่า/,'')+' รวม',fmtN(races[RACE].dmg));
  row('ตีได้อีกวันนี้',(me.left!=null?me.left:'-')+' ครั้ง');
  $('#rStarsNote').textContent=res.killed?'รางวัลสุ่มตามดาเมจถูกส่งเข้ากล่องจดหมายของทุกคนที่ร่วมตีแล้ว':'ยิ่งทำดาเมจมาก โอกาสได้รางวัลใหญ่ตอนไฮดราตายยิ่งสูง';
  $('#rBack').disabled=false; $('#rBack').onclick=()=>location.replace('./index.html?back=1');
}
