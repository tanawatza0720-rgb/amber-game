/* ================= ขุมนรก 50 ชั้น: ฉากต่อสู้ (battle.html?abyss=1) =================
   server/migrate_abyss.sql: abyss_start → สู้จริงในเครื่อง (rtBattle) → abyss_finish (ต้องสู้ ≥15 วิ, พลัง ×1.05 ≥ 85% ของที่ชั้นต้องการ)
   สนาม = ดินแดนยมโลก (realm undead) ย้อมหมอก/ท้องฟ้าตามโซน · ศัตรูตาม ABYSS_ZONES (gamedata.js) · ชั้น 10/20/30/40/50 = บอส (คลั่งได้ผ่าน storyTick)
   พรประจำสัปดาห์ใส่ทีมเราผ่าน STORY.mod.p (makeUnit) · กับดัก "มือดำ": วงหลุมดำโผล่ใต้เท้าตัวละครเรา → มือดำคว้า มึน 1.6 วิ + ดาเมจ + ลากเข้าหาศัตรู */
var ABYSS_MODE=/[?&]abyss=1/.test(location.search);
var AB=null;
// ทดสอบโดยไม่แตะเซิร์ฟเวอร์: battle.html?abyss=1&dbg=1&abyfake=<ชั้น>&bless=<รหัสพร> (เซิร์ฟเวอร์ปลอมในเครื่อง)
const ABY_FAKE=/[?&]dbg=1/.test(location.search)&&(location.search.match(/[?&]abyfake=(\d+)/)||[])[1];
let abyFakeF=Number(ABY_FAKE)||0;
async function abRpc(fn,a){
  if(!ABY_FAKE)return brpc(fn,a);
  const need=f=>Math.round(1300*Math.pow(1.06,f-1)*(f%10===0?1.15:1)),bl=(location.search.match(/[?&]bless=([^&]+)/)||[])[1]||'atk';
  if(fn==='abyss_start')return {battle_id:'x',floor:abyFakeF,need:need(abyFakeF),bless:decodeURIComponent(bl),fresh:true,reward:{}};
  if(fn==='abyss_finish'){const ok=a.won,f=abyFakeF;if(ok)abyFakeF++;return {won:ok,floor:f,coins:200+80*f,amber:2+(({10:30,20:50,30:80,40:120,50:200})[f]||0)+(f===50&&ok?150:0),box:f===50&&ok?{amber:150,egg:'sure'}:null,next:ok?(f<50?f+1:null):f,need_next:need(ok?f+1:f)};}
}
const abyssZi=f=>Math.min(4,Math.floor((Math.max(1,f)-1)/10));
// ด่านของชั้น f (พลังศัตรูอิงพลังที่ชั้นต้องการจากเซิร์ฟเวอร์)
function abyssStage(f,need){
  const Z=abyssZone(f),zi=abyssZi(f),boss=f%10===0,B=AB&&AB.bless;
  const R=a=>({sp:a[0],name:a[1]});
  const bsp=Z.boss[0]==='amateru'&&(typeof NO_DRAGON!=='undefined'&&NO_DRAGON||typeof DRAGON==='undefined'||!DRAGON)?Z.boss[2]:Z.boss[0];
  const T={tint:Z.tint,minion:R(Z.minion),mid:R(Z.mid),big:R(Z.big),boss:{sp:bsp,name:Z.boss[1]}};
  const el=i=>Z.el[(f+i)%Z.el.length];
  const mod=B?{icon:B.i,name:B.n,desc:B.d,p:B.p}:null;
  let waves;
  if(!boss){
    const c1=7+zi,c2=8+zi,b1=Math.min(3,Math.floor(zi/2)),b2=1+Math.floor(zi/2);
    waves=[storyApply(makeWave(storyWaveDefs(T,c1,b1,null,f),need*.62,el(0)),T,null),
           storyApply(makeWave(storyWaveDefs(T,c2,b2,null,f),need*.9,el(1)),T,null)];
  }else{
    const w1=storyApply(makeWave(storyWaveDefs(T,8,2,null,f),need*.6,el(0)),T,null);
    const mins=storyWaveDefs(T,6,1,null,f);mins.splice(3,0,{sp:bsp,boss:1,name:Z.boss[1],show:f});
    waves=[w1,storyApply(makeWave(mins,need*.95,el(1)),T,null)];
  }
  return {id:'A'+f,name:Z.n,mod,boss:boss?Z.boss[1]:null,theme:T,waves};
}
// ย้อมฉากยมโลกตามโซน (หมอก/พื้นหลัง/แสงฟ้า/ท้องฟ้า)
function abyssTheme(f){
  const Z=abyssZone(f),zi=abyssZi(f);
  scene.background=new THREE.Color(Z.fog); scene.fog=new THREE.Fog(Z.fog,110,430);
  RL.hemi.color.set(Z.hemi[0]); RL.hemi.groundColor.set(Z.hemi[1]); RL.hemi.intensity=.3;
  const C=RL.cache.undead; if(C){const sky=C.root.children.find(o=>o.geometry&&o.geometry.type==='SphereGeometry'&&o.material&&o.material.map);
    if(sky)sky.material.color.set([0xb090ff,0xffffff,0x6a9aff,0xb0c890,0xff6a7a][zi]);}
}
/* ---------- กับดักมือดำ ---------- */
var AT={U:{t:{value:0},R:{value:1.8},ps:{value:600}},pool:[],act:[],next:6};
function trapMake(){
  const g=new THREE.Group(),disc=new THREE.Mesh(new THREE.CircleGeometry(2.0,40),ABYSS_FX.discMat(AT.U));
  disc.rotation.x=-Math.PI/2; disc.position.y=.07; disc.renderOrder=2; g.add(disc);
  const hands=[],n=typeof LOW!=='undefined'&&LOW?2:3,hm=ABYSS_FX.handMat(AT.U),Y=new THREE.Vector3(0,1,0);
  for(let i=0;i<n;i++){const a=i/n*6.283+.4,m=new THREE.Mesh(ABYSS_FX.handGeo(),hm);m.scale.setScalar(.95+i*.08);
    const dir=new THREE.Vector3(-Math.cos(a)*.38,1,-Math.sin(a)*.38).normalize();
    m.quaternion.setFromUnitVectors(Y,dir).multiply(new THREE.Quaternion().setFromAxisAngle(Y,-a+Math.PI/2));
    m.userData.base=new THREE.Vector3(Math.cos(a)*.75,0,Math.sin(a)*.75);g.add(m);hands.push(m);}
  g.visible=false; scene.add(g); return {g,disc,hands};
}
function trapFire(u){
  const o=AT.pool.find(x=>!x.busy)||(AT.pool.push(trapMake()),AT.pool[AT.pool.length-1]);
  o.busy=true; o.g.visible=true; o.disc.scale.setScalar(.01); o.hands.forEach(h=>h.position.copy(h.userData.base).setY(-2.6));
  o.g.position.set(u.w.position.x,0,u.w.position.z);
  AT.act.push({o,u,t:0,grabbed:false});
}
function trapGrab(a){
  const u=a.u; if(!u.alive)return;
  const zi=abyssZi(AB.f),frac=.035+.01*zi;
  popNum(u,'✋ มือดำคว้า!','info'); shake=Math.max(shake,.15);
  particles(u.w.position.clone().setY(.4),0x7a3aff,12,2.4,.12,-.4);
  rlHurt(u,frac); if(!u.alive)return;
  u.stun=1;
  // ลากเข้าหาศัตรู (+x) 2.6 หน่วย ไม่เกินขอบลาน
  const fr=(RL.fr||30)*.85,from=u.w.position.clone(),to=from.clone();to.x=Math.min(fr,from.x+2.6);
  const g=a.o.g,g0=g.position.clone();
  tween(.5,k=>{if(!u.alive)return;u.w.position.lerpVectors(from,to,k);g.position.set(g0.x+(to.x-from.x)*k,0,g0.z);},t=>1-(1-t)*(1-t));
}
function abyssTrapClear(){AT.act.forEach(a=>{a.o.busy=false;a.o.g.visible=false;});AT.act=[];}
function abyssTick(dt,T){
  if(!ABYSS_MODE||!AT)return;   // ลูปเริ่มก่อนไฟล์นี้โหลดเสร็จ และหน้าอื่นไม่ต้องทำอะไร
  AT.U.t.value=T;
  if(!AB||MODE!=='abyss')return;
  // ทำงานเฉพาะตอนกำลังสู้
  if(AB.live&&typeof running!=='undefined'&&running){
    AT.next-=dt;
    if(AT.next<=0){const zi=abyssZi(AB.f),ps=alive('P');
      AT.next=Math.max(5.5,12-zi*1.5)*(.85+Math.random()*.3);
      let n=zi<2?1:zi<4?2:3; if(AB.f%10===0)n++; if(typeof LOW!=='undefined'&&LOW)n=Math.min(n,2);
      [...ps].sort(()=>Math.random()-.5).slice(0,n).forEach(trapFire);}
  }
  for(let i=AT.act.length-1;i>=0;i--){const a=AT.act[i],o=a.o;a.t+=dt;const t=a.t;
    if(t<.95&&a.u.alive)o.g.position.set(a.u.w.position.x,0,a.u.w.position.z);   // วงตามตัวเป้าระหว่างเตือน
    o.disc.scale.setScalar(t<.9?Math.max(.01,t/.9):t<2.4?1:Math.max(.01,1-(t-2.4)/.5));
    const rise=t<.9?0:t<1.2?(t-.9)/.3:t<2.3?1:Math.max(0,1-(t-2.3)/.5);
    o.hands.forEach((h,k)=>{h.position.copy(h.userData.base).setY(-2.6+2.75*(1-(1-rise)*(1-rise))+Math.sin(T*9+k)*.04*rise);});
    if(!a.grabbed&&t>=1.15){a.grabbed=true;trapGrab(a);}
    if(t>=2.95){o.busy=false;o.g.visible=false;AT.act.splice(i,1);}
  }
}
/* ---------- เริ่ม/จบชั้น ---------- */
async function abyssStart(){
  MODE='abyss'; if(typeof STORY!=='undefined')STORY.mod=null; setBossUI(true); $('#hud').hidden=false; $('#bExit').textContent='ถอย';
  $('#stTitle').textContent='ขุมนรก'; $('#wave').textContent='กำลังเปิดประตูมิติ…'; $('#farmLink').hidden=true;
  if(!BN.online&&!ABY_FAKE){abyssFail({code:'session'});return;}
  await useRealm('undead'); realmSkillOn(false);
  abyssFloor();
}
async function abyssFloor(){
  $('#result').hidden=true; abyssTrapClear();
  let r; try{r=await abRpc('abyss_start');}catch(e){abyssFail(e);return;}
  if(r.state)bnApply(r.state);
  AB={f:r.floor,need:r.need,bless:abyssBless(r.bless),bid:r.battle_id,t0:Date.now(),reward:r.reward,fresh:!!r.fresh,live:false};
  const f=AB.f,Z=abyssZone(f),B=AB.bless; abyssTheme(f);
  $('#stTitle').textContent='ขุมนรก ชั้น '+f+' · '+Z.n+(B?' · '+B.i+' '+B.n:'');
  if(AB.fresh&&B){await banner('พรประจำสัปดาห์: '+B.i+' '+B.n,'');bMsg(B.i+' '+B.n+' — '+B.d+' (ใช้ได้ทั้งสัปดาห์)');}
  const ST=abyssStage(f,AB.need);
  AB.live=true; AT.next=5;
  const win=await rtBattle(ST,{manual:true,label:'ชั้น '+f,banner:f%10?'ขุมนรก ชั้น '+f:null});
  AB.live=false; abyssTrapClear();
  abyssResult(!!win);
}
function abyssFail(e){
  const code=e&&e.code||'network';
  const msg={abyss_done:'คุณพิชิตครบ 50 ชั้นแล้วในสัปดาห์นี้ รอรีเซ็ตคืนวันอาทิตย์เที่ยงคืน',session:'ต้องเข้าสู่ระบบที่หน้าฟาร์มก่อน',expired:'ขุมนรกรีเซ็ตแล้ว เริ่มชั้น 1 ใหม่ได้เลย'}[code]||BERR[code]||BERR.network;
  const r=$('#result');r.hidden=false;r.className='lose';$('#rTitle').textContent=code==='abyss_done'?'พิชิตขุมนรกแล้ว':'เข้าขุมนรกไม่ได้';$('#rRew').innerHTML='';$('#rStarsNote').textContent=msg;
  $('#rNext').hidden=true; $('#rBack').disabled=false; $('#rBack').textContent='กลับฟาร์ม'; $('#rBack').onclick=()=>location.replace('./index.html?back=1&portal=1');
}
async function abyssResult(win){
  const f=AB.f,r=$('#result');r.hidden=false;r.className=win?'win':'lose';
  $('#rTitle').textContent=win?'ผ่านชั้น '+f+'!':'พ่ายแพ้ที่ชั้น '+f;
  const rw=$('#rRew');rw.innerHTML='';
  const row=(a,b)=>{const d=document.createElement('div');d.className='rr';const x=document.createElement('span');x.textContent=a;const y=document.createElement('b');y.textContent=b;d.append(x,y);rw.appendChild(d);return y;};
  const note=row('สถานะ','กำลังบันทึกผล…'), back=$('#rBack'), nxt=$('#rNext');
  back.disabled=true; nxt.hidden=true; back.textContent='กลับฟาร์ม'; back.onclick=()=>location.replace('./index.html?back=1&portal=1');
  $('#rStarsNote').textContent=win?'':'ลองเปลี่ยนทีมให้ชนะทางธาตุ'+(abyssZone(f).el.map(e=>e).join('/')?' (ศัตรูชั้นนี้ธาตุ'+abyssZone(f).el.join('/')+')':'')+' หรืออัปเลเวลทีมในฟาร์ม แพ้ไม่เสียอะไร';
  let res=null;
  try{const w=(ABY_FAKE?0:15600)-(Date.now()-AB.t0);if(w>0)await sleep(w);
    res=await abRpc('abyss_finish',{battle_id:AB.bid,won:win}); if(res.state)bnApply(res.state);
    if(res.won){note.textContent='บันทึกแล้ว';row('เหรียญ','+'+fmtN(res.coins));const am=res.amber-(res.box?res.box.amber||0:0);if(am>0)row('อัมพร','+'+fmtN(am));
      if(res.box){const bx=res.box;r.className='win';$('#rTitle').textContent='🎁 เปิดกล่องลึกลับ!';shake=.3;
        row('ในกล่อง',(bx.egg==='sure'?'ไข่เทพการันตี':'ไข่เทพ')+' 1 ใบ + อัมพร '+fmtN(bx.amber));
        $('#rStarsNote').textContent='พิชิตขุมนรกครบ 50 ชั้น! ไข่เทพฟักได้ที่ศาลฟักไข่ในฟาร์ม';}
      if(res.floor===5&&!res.box)setTimeout(abyssPrank,900);
      else if(res.next)$('#rStarsNote').textContent='ชั้นต่อไป '+res.next+' ('+abyssZone(res.next).n+') ต้องการพลัง ~'+fmtN(res.need_next);}
    else if(win&&res.weak){r.className='lose';$('#rTitle').textContent='ผลไม่ผ่าน';note.textContent='ทีมยังอ่อนเกินไปสำหรับชั้นนี้';
      row('พลังทีม',fmtN(res.power)+' / ต้องมีอย่างน้อย '+fmtN(res.min_power));$('#rStarsNote').textContent='อัปเลเวลหรืออัปดาวทีมในฟาร์มให้พลังถึงเกณฑ์ แล้วลองใหม่';}
    else note.textContent='บันทึกแล้ว';}
  catch(e){note.textContent=e&&e.code==='expired'?'ขุมนรกรีเซ็ตระหว่างสู้ เริ่มชั้น 1 ใหม่ได้เลย':(BERR[e&&e.code]||BERR.network);}
  back.disabled=false;
  const go=res?res.next:f;
  if(go){nxt.hidden=false;nxt.textContent=res&&res.won?'⚔ ลงชั้น '+go:'↻ ลองชั้น '+go+' อีกครั้ง';nxt.disabled=false;
    nxt.onclick=()=>{nxt.disabled=true;abyssFloor();};}
}

/* ---------- มุกชั้น 5: กล่องลึกลับปลอม (เจ้าของสั่ง · ไม่มีของจริง ฝั่งหน้าเกมล้วน) ----------
   ผ่านชั้น 5 → กล่องเด้งขึ้นมา กดเปิด → "รับวาร์ปไป <รหัส>" · รหัสเป็นของแต่งขึ้นเอง ไม่ใช่รหัสสินค้าจริง แก้รายการที่ PRANK_CODES */
const PRANK_CODES=['AMBR-985','KHUM-555','HYDR-404','JING-069','NARK-777','PAAA-123','KAZE-888','MEOW-321','LAVA-999','WARP-001'];
function abyssPrank(){
  if(document.getElementById('prank'))return;
  const o=document.createElement('div');o.id='prank';
  o.innerHTML='<div class="pk"><div class="pkBox">🎁</div><h3>กล่องลึกลับ</h3><p>ไม่รู้ว่ามีของวิเศษอะไรอยู่ด้านใน…</p><button class="pkGo">เปิดกล่อง</button></div>';
  document.body.appendChild(o);
  const card=o.querySelector('.pk'),btn=o.querySelector('.pkGo');
  btn.onclick=()=>{
    if(btn.dataset.done){o.remove();return;}
    btn.disabled=true;card.classList.add('shake');
    setTimeout(()=>{card.classList.remove('shake');card.classList.add('open');shake=Math.max(shake,.25);
      const c=PRANK_CODES[Math.floor(Math.random()*PRANK_CODES.length)];
      card.querySelector('.pkBox').textContent='✨';card.querySelector('h3').textContent='รับวาร์ปไป';
      card.querySelector('p').innerHTML='';const b=document.createElement('b');b.className='pkCode';b.textContent=c;card.querySelector('p').append(b);
      btn.textContent='555 ไปต่อ';btn.dataset.done=1;btn.disabled=false;},1100);};
}
