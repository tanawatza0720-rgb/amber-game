/* ================= ประกาศอัปเดต (Patch notes) + สิ่งที่ทำได้วันนี้ (to-do รายวัน + จุดแดง) =================
   เพิ่มแพตช์ใหม่: ใส่ไว้บนสุดของ PATCHES (ver ใหม่ไม่ซ้ำ) · ป๊อปอัปจะเด้งก่อนเข้าเกม 1 ครั้งต่อเวอร์ชัน (จำใน localStorage) */
const PATCHES=[
  {ver:'2026.09.30.2',date:'30 ก.ย. 2026',title:'ฟักไข่ ×10 และอัมพรเริ่มต้น 600 🥚',items:[
    '🥚 ศาลฟักไข่กดฟักได้ทั้งทีละ 1 ใบ และทีละ 10 ใบ (ไข่ป่า ×10 · 1,000 เหรียญ / ไข่ทองคำ ×10 · 300 อัมพร) เรทเท่าเดิม',
    '💎 ผู้เล่นใหม่เริ่มต้นด้วยอัมพร 600 · ผู้ที่เริ่มเล่นหลังรีเซ็ตแล้วได้รับเพิ่มให้ครบ 600',
    '✨ หน้าเข้าสู่ระบบโฉมใหม่']},
  {ver:'2026.09.30',date:'30 ก.ย. 2026',title:'เปิดเซิร์ฟเวอร์ใหม่ที่ amberlegend.com 🎉',items:[
    '🌐 ย้ายมาอยู่เว็บใหม่ amberlegend.com (หน้าเกม amberlegend.com/amber-land)',
    '🔄 รีเซ็ตเซิร์ฟเวอร์ ทุกคนเริ่มใหม่พร้อมกัน · ตัวเริ่มต้น: คุโรกะ (ไฟ) · คาเซะคิริ (น้ำ) · โมริฮิเมะ (ลม)',
    '📋 เพิ่มปุ่ม "วันนี้" รวมสิ่งที่ทำได้ในแต่ละวัน มีจุดแดงบอกว่าอะไรยังไม่ได้ทำ',
    '🗺️ ด่านสตอรี่: ศัตรูเปลี่ยนตามดินแดน · บอสประจำบทคลั่งเมื่อเลือดเหลือครึ่ง · เงื่อนไขพิเศษประจำด่าน',
    '🎁 ผ่านทุก 5 ด่านรับอัมพร + ไข่เทพ (เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2%) · ทุก 50 ด่านได้ไข่เทพการันตี',
    '⚔️ บุกปล้น: ชนะแล้วตัวที่ส่งไปกลับมาครบ · แพ้แล้วตัวระดับ/เลเวลสูงรอดง่ายกว่า · คิดแพ้ทางธาตุในโอกาสชนะ',
    '✨ มอนสเตอร์ธาตุแสงและมืดหายากขึ้น',
    '🛡️ ปรับระบบกันโกงด่านบอส']},
];
const NEWS_KEY='amber_news_seen';
const newsSeen=()=>{try{return localStorage.getItem(NEWS_KEY)||'';}catch(e){return '';}};
function newsMark(){try{localStorage.setItem(NEWS_KEY,PATCHES[0].ver);}catch(e){}newsHud();}
function newsHud(){const b=$('#bNews');if(b)b.hidden=newsSeen()===PATCHES[0].ver;}
function openNews(all){
  let pop=$('#newsPop');if(pop)pop.remove();pop=document.createElement('div');pop.id='newsPop';
  const card=el('div','nwCard');card.append(el('div','nwIc','📢'));card.append(el('h3',null,'มีอะไรใหม่'));
  const L=el('div','nwList');
  (all?PATCHES:PATCHES.slice(0,1)).forEach(p=>{const s=el('div','nwPatch');const h=el('div','nwHead');h.append(el('b',null,p.title));h.append(el('small',null,'อัปเดต '+p.date+' · v'+p.ver));s.append(h);
    const ul=el('ul');p.items.forEach(t=>ul.append(el('li',null,t)));s.append(ul);L.append(s);});
  card.append(L);
  const row=el('div','nwBtns');
  if(!all&&PATCHES.length>1){const h=el('button','nwMore','ดูอัปเดตก่อนหน้า');h.onclick=()=>openNews(true);row.append(h);}
  const ok=el('button','nwOk','รับทราบ! 👍');ok.onclick=()=>{newsMark();pop.remove();};row.append(ok);card.append(row);
  pop.append(card);pop.onclick=e=>{if(e.target===pop){newsMark();pop.remove();}};document.body.append(pop);
}
// เด้งก่อนเข้าเกม (หน้าล็อกอิน) ถ้ามีแพตช์ที่ยังไม่เคยเห็น
setTimeout(()=>{if(newsSeen()!==PATCHES[0].ver&&!/[?&]nonews=1/.test(location.search))openNews(false);newsHud();},800);
$('#rEvent').onclick=()=>{closeSheet();openNews(true);};

/* ---------- สิ่งที่ทำได้วันนี้ ---------- */
// แต่ละข้อ: s = 'todo' (ทำได้ตอนนี้ → จุดแดง) | 'wait' (ยังทำไม่ได้/กำลังดำเนินการ) | 'done' (เสร็จแล้ว)
function todoList(){
  const L=[],on=NET.mode==='online';
  L.push({ic:'🎁',n:'รับรางวัลเข้าเกมรายวัน',s:S.dailyClaimed?'done':'todo',t:S.dailyClaimed?'รับแล้ว':'รับได้เลย',go:()=>openDaily()});
  questList().forEach(q=>L.push({ic:'📜',n:'ภารกิจ: '+q.n,s:q.claimed?'done':q.cur>=q.need?'todo':'wait',
    t:q.claimed?'รับรางวัลแล้ว':q.cur>=q.need?'กดรับรางวัล '+q.r:Math.min(q.cur,q.need)+'/'+q.need,go:()=>openQuests()}));
  L.push({ic:'🌳',n:'เก็บอัมพรจากต้นไม้',s:amberReady?'todo':'wait',t:amberReady?'พร้อมเก็บ':'รอบถัดไป '+fmtTime(S.amberIn),go:()=>{closeSheet();focusBuilding('tree');}});
  if(on&&typeof STG!=='undefined'&&STG){
    if(STG.pending&&STG.pending.length)L.push({ic:'🏆',n:'รับรางวัลผ่านด่าน',s:'todo',t:STG.pending.length+' ขั้นรอรับ',go:()=>openStageRewards()});
    const g=(STG.god_eggs||0)+(STG.god_eggs_sure||0);if(g)L.push({ic:'🥚',n:'ฟักไข่เทพ',s:'todo',t:'มี '+g+' ใบ',go:()=>{closeSheet();focusBuilding('hatch');}});}
  if(S.mailNew)L.push({ic:'✉️',n:'เปิดจดหมาย',s:'todo',t:S.mailNew+' ฉบับใหม่',go:()=>openMail()});
  if(on&&typeof RAID!=='undefined'&&RAID.st&&RAID.st.active){const left=RAID.st.me.left;
    L.push({ic:'🐉',n:'ตีราชันไฮดรา',s:left?'todo':'done',t:left?'เหลือ '+left+' ครั้ง':'ตีครบแล้ววันนี้',go:()=>openRaid()});}
  const spare=S.mons.filter(m=>!(S.team||[]).includes(m.uid)).length;
  if(on&&typeof EXP!=='undefined'&&EXP.st&&(EXP.st.active||spare)){const a=EXP.st.active,left=a?expLeft():0;
    L.push({ic:'🧭',n:'ส่งทีมสำรวจ',s:!a?'todo':left>0?'wait':'todo',t:!a?'ยังไม่ได้ส่งทีม':left>0?'กลับมาใน '+fmtDur(left):'ทีมกลับมาแล้ว กดรับผล',go:()=>openExp()});}
  if(on&&typeof FR!=='undefined'&&FR.st){const fs=FR.st.friends||[],v=fs.filter(f=>f.visited).length,need=Math.min(5,fs.length);
    if(!fs.length)L.push({ic:'👥',n:'เพิ่มเพื่อน',s:'todo',t:'เยี่ยมบ้านเพื่อนได้เหรียญทุกวัน',go:()=>openFriends()});
    else L.push({ic:'🏡',n:'เยี่ยมบ้านเพื่อน (+50 เหรียญ)',s:v>=need?'done':'todo',t:v+'/'+need+' บ้าน',go:()=>openFriends()});
    if(FR.st.incoming&&FR.st.incoming.length)L.push({ic:'🤝',n:'ตอบคำขอเป็นเพื่อน',s:'todo',t:FR.st.incoming.length+' คำขอ',go:()=>openFriends()});
    if(FR.raid&&S.mons.length>=(FR.raid.n||4)){const r=FR.raid;L.push({ic:'⚔️',n:'บุกปล้น',s:r.left>0?'todo':'done',t:r.left>0?'เหลือ '+r.left+'/'+r.per_day+' ครั้ง':'บุกครบแล้ววันนี้',go:()=>openFriends()});}}
  return L;
}
function todoHud(){if(!entered)return;const L=todoList(),n=L.filter(x=>x.s==='todo').length,b=$('#bToday');b.hidden=!n;b.textContent=n;
  // จุดแดงบนปุ่มอื่น ๆ
  const dot=(id,on)=>{const e=$(id);if(e)e.classList.toggle('reddot',!!on);};
  const has=k=>L.some(x=>x.s==='todo'&&x.ic===k);
  dot('#rFriend',(has('🏡')||has('⚔️')||has('👥'))&&$('#bFriend').hidden);
  dot('#rExp',has('🧭')&&$('#bExp').hidden);
  dot('#nHatch',has('🥚'));
  dot('#nBattle',false);
}
function openToday(){
  const L=todoList(),done=L.filter(x=>x.s==='done').length,d=el('div','tdList');
  const top=el('div','tdTop');const bar=el('div','qbar');const i=el('i');i.style.width=(L.length?done/L.length*100:0)+'%';bar.append(i);
  top.append(el('b',null,'ทำแล้ว '+done+'/'+L.length));top.append(bar);d.append(top);
  const ord={todo:0,wait:1,done:2};
  [...L].sort((a,b)=>ord[a.s]-ord[b.s]).forEach(x=>{const r=el('div','tdRow '+x.s);r.append(el('span','tdIc',x.s==='done'?'✅':x.ic));
    const t=el('div','tdTx');t.append(el('b',null,x.n));t.append(el('small',null,x.t));r.append(t);
    if(x.s!=='done'){const bt=el('button','sbtn small'+(x.s==='todo'?' gold':''),x.s==='todo'?'ไปเลย':'ดู');bt.onclick=()=>{closeSheet();x.go();};r.append(bt);}
    d.append(r);});
  openSheet('สิ่งที่ทำได้วันนี้','รีเซ็ตทุกวันเวลา 00:00 (เวลาไทย) · จุดแดง = ยังไม่ได้ทำ',d,[]);
}
$('#rToday').onclick=openToday;
setInterval(()=>{try{todoHud();}catch(e){}},2000);
$('#lgNews').onclick=e=>{e.preventDefault();openNews(true);};
