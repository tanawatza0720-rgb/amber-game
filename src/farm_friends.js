/* ================= เพื่อน + เยี่ยมบ้านเพื่อน =================
   เพิ่มเพื่อนด้วยรหัสผู้เล่น 8 ตัว · รับ/ปฏิเสธคำขอ · เยี่ยมบ้านเพื่อน (ดูเกาะเผ่า มอนสเตอร์เดินเล่น ทีม และพลัง)
   เยี่ยมครั้งแรกของวันต่อเพื่อน 1 คน ได้ 50 เหรียญ (วันละ 5 คน) · เซิร์ฟเวอร์: server/migrate_friends.sql */
var FR={st:null,at:0,busy:false,arm:null};
var VISIT={on:false,f:null,save:null,home:null};
// ระหว่างเยี่ยมบ้านเพื่อน: เก็บสถานะของเราไว้ก่อน ไม่ให้ทับข้อมูลเกาะเพื่อน
const _applyStateHome=applyState;
applyState=function(st){if(VISIT.on){VISIT.home=st;return;}return _applyStateHome(st);};
const ago=t=>{if(!t)return '';const s=(Date.now()-new Date(t))/1000;return s<300?'เพิ่งเล่น':s<3600?Math.floor(s/60)+' นาทีก่อน':s<86400?Math.floor(s/3600)+' ชม. ก่อน':Math.floor(s/86400)+' วันก่อน';};
async function loadFriends(force){
  if(NET.mode!=='online'){$('#rFriend').hidden=true;return;}
  $('#rFriend').hidden=false;
  if(FR.busy||(!force&&Date.now()-FR.at<60000))return; FR.busy=true;
  try{FR.st=await api('friend_list');try{FR.raid=await api('friend_raid_info');}catch(e){FR.raid=null;}FR.at=Date.now();frHud();}catch(e){console.warn('friends',e);}finally{FR.busy=false;}
}
function frHud(){const n=FR.st?FR.st.incoming.length:0,b=$('#bFriend');b.hidden=!n;b.textContent=n;}
setInterval(()=>{if(typeof entered!=='undefined'&&entered&&!VISIT.on&&document.visibilityState==='visible')loadFriends();},90000);
async function frCall(fn,args,after){
  for(let i=0;i<40&&FR.busy;i++)await new Promise(r=>setTimeout(r,100));
  if(FR.busy)return null;FR.busy=true;
  try{const r=await api(fn,args);return r;}catch(e){toast(ERR[e.code]||ERR.network);return null;}finally{FR.busy=false;}
}
function frRow(f,btns){const r=el('div','frRow');const R=RACES[f.race];
  const av=el('span','frAv',R?R.icon:'🌱');if(R)av.style.background=R.c+'33';r.append(av);
  const t=el('div','frInfo');const nm=el('b',null,f.name);t.append(nm);
  t.append(el('small',null,'Lv '+f.lv+' · '+(R?R.n:'ยังไม่มีเผ่า')+' · พลัง '+fmt(f.power||0)+(f.seen?' · '+ago(f.seen):'')));r.append(t);
  const bx=el('div','frBtns');btns.forEach(b=>bx.append(b));r.append(bx);return r;}
function frBtn(label,cls,fn,dis){const b=el('button','fb '+(cls||''),label);b.disabled=!!dis;b.onclick=fn;return b;}
function openFriends(){
  if(NET.mode!=='online'){toast('ระบบเพื่อนต้องเข้าสู่ระบบก่อน');return;}
  if(!FR.st){loadFriends(true).then(()=>FR.st&&openFriends());return;}
  const s=FR.st,d=el('div','fr');
  // รหัสของเรา
  const me=el('div','frMe');me.append(el('span',null,'รหัสของคุณ'));const code=el('b',null,s.me);me.append(code);
  me.append(frBtn('คัดลอก','',async()=>{try{await navigator.clipboard.writeText(s.me);toast('คัดลอกรหัสแล้ว ส่งให้เพื่อนได้เลย');}catch(e){toast('รหัสของคุณ: '+s.me);}}));d.append(me);
  // เพิ่มเพื่อน
  const add=el('div','frAdd');const inp=el('input');inp.placeholder='ใส่รหัสเพื่อน 8 ตัว';inp.maxLength=12;inp.autocapitalize='characters';inp.spellcheck=false;
  const go=frBtn('เพิ่มเพื่อน','main',async()=>{const c=inp.value.trim().toUpperCase();if(!/^[0-9A-F]{8}$/.test(c.replace(/[^0-9A-F]/g,''))){toast('รหัสเพื่อนคือตัวอักษร/ตัวเลข 8 ตัว');return;}
    const r=await frCall('friend_request',{code:c});if(!r)return;FR.st=r.list;FR.at=Date.now();frHud();
    toast(r.added?'เป็นเพื่อนกับ '+r.friend.name+' แล้ว!':'ส่งคำขอถึง '+r.friend.name+' แล้ว รออีกฝ่ายกดรับ');openFriends();});
  inp.onkeydown=e=>{if(e.key==='Enter')go.click();};add.append(inp,go);d.append(add);
  // คำขอที่ได้รับ
  if(s.incoming.length){d.append(el('h4',null,'คำขอเป็นเพื่อน ('+s.incoming.length+')'));
    s.incoming.forEach(f=>d.append(frRow(f,[frBtn('รับ','main',async()=>{const r=await frCall('friend_respond',{code:f.code,accept:true});if(r){FR.st=r;FR.at=Date.now();frHud();toast('เป็นเพื่อนกับ '+f.name+' แล้ว!');openFriends();}}),
      frBtn('ไม่รับ','',async()=>{const r=await frCall('friend_respond',{code:f.code,accept:false});if(r){FR.st=r;FR.at=Date.now();frHud();openFriends();}})])));}
  // รายชื่อเพื่อน
  d.append(el('h4',null,'เพื่อน '+s.friends.length+'/'+s.max));
  const left=Math.max(0,s.visit_max-s.visits_today);
  if(!s.friends.length)d.append(para('ยังไม่มีเพื่อน · ส่งรหัสของคุณให้เพื่อน หรือใส่รหัสของเพื่อนด้านบน'));
  else d.append(el('p','frNote','เยี่ยมบ้านเพื่อนครั้งแรกของวัน ได้ '+s.visit_coins+' เหรียญ (เหลือวันนี้ '+left+'/'+s.visit_max+' คน)'+(s.visitors_today?' · วันนี้มีเพื่อนมาเยี่ยมคุณ '+s.visitors_today+' คน':'')));
  const RI=FR.raid;
  if(RI&&RI.robbed&&RI.robbed.length){const bx=el('div','rdRobbed');bx.append(el('b',null,'⚔ วันนี้ถูกบุกปล้น '+RI.robbed.length+' ครั้ง'));
    RI.robbed.forEach(x=>{const ln=el('div','rdRobRow');ln.append(el('small',null,x.name+(x.win?' ปล้นสำเร็จ · เสีย '+fmt(x.lost)+' เหรียญ':' บุกมาแต่แพ้กลับไป')));if(x.revenge)ln.append(frBtn('👊 เอาคืน','raid',()=>visitFriend(x.code,true,{rpc:'raid_visit'})));bx.append(ln);});d.append(bx);}
  s.friends.forEach(f=>{const vb=frBtn(f.visited||!left?'เยี่ยม':'เยี่ยม +'+s.visit_coins+'🪙','main',()=>visitFriend(f.code));
    const done=RI&&RI.raided.includes(f.code),rb=frBtn(done?'ปล้นแล้ว':'บุกปล้น','raid',()=>visitFriend(f.code,true),!RI||done||RI.left<=0);
    const rm=frBtn('ลบ','ghost',async function(){if(FR.arm!==f.code){FR.arm=f.code;this.textContent='ยืนยันลบ';setTimeout(()=>{if(FR.arm===f.code){FR.arm=null;this.textContent='ลบ';}},4000);return;}
      FR.arm=null;const r=await frCall('friend_remove',{code:f.code});if(r){FR.st=r;FR.at=Date.now();toast('ลบ '+f.name+' ออกจากเพื่อนแล้ว');openFriends();}});
    d.append(frRow(f,[vb,rb,rm]));});
  // คำขอที่ส่งไป
  if(s.outgoing.length){d.append(el('h4',null,'รออีกฝ่ายตอบรับ'));
    s.outgoing.forEach(f=>d.append(frRow(f,[frBtn('ยกเลิก','ghost',async()=>{const r=await frCall('friend_remove',{code:f.code});if(r){FR.st=r;FR.at=Date.now();openFriends();}})])));}
  openSheet('เพื่อน',s.incoming.length?'มีคำขอใหม่ '+s.incoming.length+' รายการ':'เพิ่มเพื่อนและไปเยี่ยมบ้านกัน',d,[]);
}
/* ---------- เยี่ยมบ้านเพื่อน ---------- */
// opt: {payload} = ข้อมูลที่ได้มาแล้ว (สุ่มบ้าน) · {rpc:'raid_visit'} = เข้าเกาะเพื่อบุก/เอาคืน · back: เปิดหน้าเพื่อนตอนกลับ
async function visitFriend(code,raid,opt){
  opt=opt||{};if(VISIT.on)return;
  const r=opt.payload||await frCall(opt.rpc||'friend_visit',{code});if(!r)return;
  VISIT.back=opt.back!==false;VISIT.kind=r.kind||'friend';
  closeSheet(); if(r.state)_applyStateHome(r.state); if(r.coins){if(typeof bumpRes==='function')bumpRes('coins');}
  const f=r.friend;
  if(FR.st){const x=FR.st.friends.find(y=>y.code===code);if(x&&!x.visited){x.visited=true;FR.st.visits_today++;}}
  VISIT.save={race:S.race,mons:S.mons,team:S.team};VISIT.home=null;VISIT.on=true;VISIT.f=f;
  document.body.classList.add('visiting');$('#mtag').hidden=true;
  if(f.race&&typeof applyRaceTheme==='function')applyRaceTheme(f.race);
  S.mons=(r.monsters||[]).map(m=>({uid:-Number(m.id),sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null}));
  syncAgents();
  const R=RACES[f.race],bar=$('#visitBar');bar.innerHTML='';
  const hd=el('div','vbHead');const av=el('span','frAv',R?R.icon:'🌱');if(R)av.style.background=R.c+'33';hd.append(av);
  const t=el('div');t.append(el('b',null,'บ้านของ '+f.name));t.append(el('small',null,'Lv '+f.lv+' · '+(R?R.n:'ยังไม่มีเผ่า')+' · พลังทีม '+fmt(f.power||0)+' · ด่าน '+(f.stage||0)));hd.append(t);
  hd.append(frBtn('🏠 กลับบ้าน','main',leaveVisit));bar.append(hd);
  if(r.kind==='random')t.firstChild.textContent='🎲 บ้านของ '+f.name;if(r.revenge)t.firstChild.textContent='😤 บ้านของ '+f.name;
  const team=(r.team||[]).map(id=>r.monsters.find(m=>Number(m.id)===Number(id))).filter(Boolean);
  if(team.length){const tr=el('div','vbTeam');tr.append(el('small',null,'ทีม'));team.forEach(m=>{const c=icon({uid:-m.id,sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null});c.onclick=null;tr.append(c);});bar.append(tr);}
  bar.append(el('small','vbNote',(r.monsters||[]).length+' ตัวในฟาร์ม'+(r.visitors_today?' · วันนี้มีคนมาเยี่ยม '+r.visitors_today+' คน':'')));
  bar.hidden=false;
  if(!raid)toast(r.coins?'มาเยี่ยม '+f.name+' ได้รับ '+r.coins+' เหรียญ 🪙':'มาเยี่ยมบ้าน '+f.name);
  if(typeof isletBadges==='function')isletBadges(false);
  if(r.raid&&FR)FR.raid=r.raid;
  if(raid&&typeof raidEnter==='function'&&r.raid)setTimeout(()=>VISIT.on&&raidEnter(r,code),900);
}
function leaveVisit(){if(!VISIT.on)return;
  if(typeof raidExit==='function')raidExit();
  const sv=VISIT.save;VISIT.on=false;document.body.classList.remove('visiting');$('#visitBar').hidden=true;$('#mtag').hidden=true;
  S.mons=sv.mons;S.team=sv.team;if(sv.race&&typeof applyRaceTheme==='function')applyRaceTheme(sv.race);
  if(VISIT.home){_applyStateHome(VISIT.home);VISIT.home=null;}
  syncAgents();if(typeof renderHUD==='function')renderHUD();VISIT.f=null;if(typeof isletBadges==='function')isletBadges(true);if(VISIT.back)openFriends();}
$('#rFriend').onclick=()=>openFriends();
