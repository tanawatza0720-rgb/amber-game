/* ================= สงครามแห่งการช่วงชิง: หน้าข้อมูลในฟาร์ม (แตะเกาะโคลอสเซียม หรือปุ่ม #rWar) =================
   server/migrate_arena.sql: arena_state() / arena_refresh() · บุกที่ battle.html?war=1&slot=N (battle_war.js)
   กลับมาด้วย ?war=1 เปิดหน้านี้ให้เอง */
var WAR=null;
const WAR_DIFF={easy:['ง่าย','#7fe0a0'],close:['สูสี','#ffd36a'],hard:['ยาก','#ff8a7a']};
async function loadWar(){if(NET.mode!=='online')return null;try{WAR=await api('arena_state');WAR.at=Date.now();}catch(e){console.warn('arena',e);WAR=null;}
  const b=$('#rWar');if(b)b.classList.toggle('reddot',!!(WAR&&WAR.left>0));return WAR;}
async function openWar(){
  if(NET.mode!=='online'){openSheet('สงครามแห่งการช่วงชิง','',para('ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนจึงจะร่วมสงครามได้'),[]);return;}
  openSheet('สงครามแห่งการช่วงชิง','กำลังเรียกพล…',para('กำลังโหลด…'),[]);
  const W=await loadWar(); if($('#shTitle').textContent!=='สงครามแห่งการช่วงชิง')return;
  if(!W){openSheet('สงครามแห่งการช่วงชิง','',para('เชื่อมต่อลานประลองไม่ได้ ลองใหม่อีกครั้ง'),[]);return;}
  renderWar(W);
}
function warTeamRow(team){const r=el('div','wTeam');(team||[]).forEach(m=>{const sp=SPEC[m.sp],c=el('span','wMon');
  c.append(el('i',null,ELEM[m.el]?ELEM[m.el].i:''));c.append(el('b',null,sp?sp.name:m.sp));c.append(el('small',null,'Lv'+m.lv+(m.stars?' ★'+m.stars:'')));r.append(c);});return r;}
function renderWar(W){
  const d=el('div','war');
  const hero=el('div','wHero');
  const top=el('div','wTop');top.append(el('b',null,'แต้มประลอง '+fmt(W.pts)));top.append(el('span',null,W.rank?'อันดับ '+W.rank+(W.players?' / '+W.players:''):'ยังไม่มีอันดับ'));hero.append(top);
  const s2=el('div','wSub');s2.append(el('span',null,'บุกได้อีกวันนี้ '+W.left+'/'+W.per_day));s2.append(el('span',null,'ชนะ '+W.wins+' · แพ้ '+W.losses+' · ป้องกันสำเร็จ '+W.def_ok));hero.append(s2);
  const B=typeof abyssBless==='function'?abyssBless(W.bless):null;
  hero.append(el('p','wBless',B?B.i+' '+B.n+' — '+B.d+' (ใช้ในสงครามด้วย)':'🎲 ยังไม่มีพรสัปดาห์นี้ · ลงขุมนรกเพื่อสุ่มพร +10% มาใช้ในสงครามด้วย'));
  d.append(hero);
  d.append(el('h4','wH','เลือกเป้าหมาย · ทีมเพื่อน 2 ทีมจะมาสมทบระหว่างสู้'));
  (W.offers||[]).forEach(o=>{const D=WAR_DIFF[o.diff]||['?','#fff'],c=el('div','wCard');
    const h=el('div','wCh');const tg=el('em',null,D[0]);tg.style.background=D[1];h.append(tg);
    h.append(el('b',null,(o.race&&RACES[o.race]?RACES[o.race].icon+' ':'')+o.name));h.append(el('span',null,'พลัง '+fmt(o.power)));c.append(h);
    c.append(warTeamRow(o.team));
    const ft=el('div','wFt');const ob=abyssBless(o.bless);
    ft.append(el('span',null,'โอกาสชนะ ~'+Math.round(o.chance*100)+'% · ชนะ +'+o.win_pts+' / แพ้ '+o.lose_pts+(ob?' · ศัตรูมี'+ob.n:'')));
    const go=el('button','sbtn gold','⚔ บุก');go.disabled=!(W.left>0);go.onclick=()=>{closeSheet();location.href='battle.html?war=1&slot='+o.slot;};ft.append(go);c.append(ft);
    d.append(c);});
  // อันดับ
  d.append(el('h4','wH','อันดับแต้มประลองสัปดาห์นี้'));
  const L=el('ol','abTop10');
  if(!(W.top||[]).length)L.append(el('li','none','ยังไม่มีใครลงสนาม เป็นคนแรกเลย!'));
  (W.top||[]).forEach((r,i)=>{const li=el('li',r.me?'me':null);li.append(el('em',null,['🥇','🥈','🥉'][i]||String(i+1)));
    li.append(el('b',null,(r.race&&RACES[r.race]?RACES[r.race].icon+' ':'')+r.name));li.append(el('span',null,fmt(r.pts)+' แต้ม'));L.append(li);});
  d.append(L);
  // ประวัติการถูกบุก
  if((W.defense||[]).length){d.append(el('h4','wH','ปราการของคุณถูกบุก'));const dl=el('ul','wDef');
    W.defense.forEach(x=>{const li=el('li',x.held?'ok':'bad');li.append(el('span',null,(x.held?'🛡️ ป้องกันสำเร็จ จาก ':'💥 ถูกตีแตก โดย ')+(x.race&&RACES[x.race]?RACES[x.race].icon+' ':'')+x.name));
      li.append(el('b',null,(x.pts>0?'+':'')+x.pts));dl.append(li);});d.append(dl);}
  const rw=el('details','wRules');rw.append(el('summary',null,'กติกาและรางวัล'));
  rw.append(para('ทีมป้องกัน = ทีมปัจจุบันของคุณ · ผู้ป้องกันได้พลังศิลา สกิลดินแดน และคืนชีพที่ศิลาได้ 1 ครั้ง ฝั่งบุกต้องรอเพื่อนมาสมทบแล้วยึดศิลาให้ได้ใน 90 วินาที'));
  rw.append(para('แต้ม: ชนะ +10/+20/+32 · แพ้ −8/−6/−4 (ง่าย/สูสี/ยาก) · ป้องกันสำเร็จ +5 ถูกตีแตก −3 · แพ้ไม่เสียตัว ไม่เสียเหรียญ'));
  rw.append(para('รางวัลทุกคืนวันอาทิตย์เที่ยงคืน (ส่งเข้าจดหมาย): ที่ 1 🔶300 · ที่ 2 🔶200 · ที่ 3 🔶150 · ที่ 4–10 🔶60 · ทุกคนที่ได้บุก 🔶20 · แต้มส่วนที่เกิน 1,000 ลดครึ่งเมื่อขึ้นสัปดาห์ใหม่'));
  d.append(rw);
  const left=Math.max(0,W.reset_in-Math.floor((Date.now()-W.at)/1000));
  const acts=[['🎲 สุ่มเป้าใหม่ (เหลือ '+W.refresh_left+')',async()=>{const r=await act('arena_refresh',{});if(r){WAR=Object.assign(r,{at:Date.now()});renderWar(WAR);}},'ghost',!(W.refresh_left>0)]];
  openSheet('สงครามแห่งการช่วงชิง','รีเซ็ตอันดับใน '+abyDur(left),d,acts);
}
if($('#rWar'))$('#rWar').onclick=()=>openWar();
if(window.__F)__F.war=d=>{WAR=Object.assign(d,{at:Date.now()});renderWar(WAR);};
{let done=false;const t=setInterval(()=>{if(typeof entered==='undefined'||!entered)return;clearInterval(t);if(done)return;done=true;
  if(NET.mode!=='online')return;
  if(/[?&]war=1/.test(location.search)){history.replaceState(null,'',location.pathname+location.search.replace(/([?&])war=1&?/,'$1').replace(/[?&]$/,''));setTimeout(openWar,600);}
  else loadWar();},1000);}
