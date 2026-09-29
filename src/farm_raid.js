/* ================= การรุกรานของไฮดรา (บอสโลก) : ฝั่งฟาร์ม =================
   ไฮดราบินวนอยู่ข้างเกาะตอนมีการรุกราน · แตะตัวไฮดราหรือปุ่ม "ไฮดรา" เพื่อดูเลือดรวม ดาเมจแต่ละเผ่า และไปโจมตี
   กติกา/สุ่มรางวัลอยู่ที่เซิร์ฟเวอร์ (server/migrate_raid.sql) */
var RAID={st:null,at:0,H:null,holder:null,loading:false,busy:false,next:6};
async function loadRaid(force){
  if(NET.mode!=='online'){$('#rRaid').hidden=true;return;}
  if(RAID.busy||(!force&&Date.now()-RAID.at<45000))return; RAID.busy=true;
  try{RAID.st=await api('raid_state');RAID.at=Date.now();raidHud();raidSpawn();if(!$('#sheet').hidden&&$('#shTitle').textContent==='การรุกรานของไฮดรา')openRaid(true);}
  catch(e){console.warn('raid',e);}
  finally{RAID.busy=false;}
}
function raidHud(){
  const s=RAID.st,b=$('#rRaid'); if(!s||!s.raid){b.hidden=true;return;}
  b.hidden=false; const R=s.raid, k=R.hp/R.hp_max;
  $('#rRaidHp').style.width=(k*100)+'%';
  const left=s.active?s.me.left:0; $('#bRaid').hidden=!left; $('#bRaid').textContent=left||'';
  b.classList.toggle('dead',!s.active);
}
// โมเดลไฮดรายืนที่ขอบเกาะ (โหลดเฉพาะตอนมีการรุกราน)
function raidSpawn(){
  const s=RAID.st;
  if(!s||!s.active){if(RAID.holder){scene.remove(RAID.holder);RAID.holder=null;RAID.H=null;
      const i=BLOCK.indexOf(RAID.block);if(i>=0)BLOCK.splice(i,1);
      [...(typeof RACE_DECO!=='undefined'?RACE_DECO.children:[]),...scene.children].forEach(o=>{if(o.userData.hidByRaid){o.visible=true;o.userData.hidByRaid=0;}});}return;}
  if(RAID.H||RAID.loading||typeof loadHydra!=='function')return;
  RAID.loading=true;
  loadHydra(15).then(H=>{
    RAID.loading=false; if(!RAID.st||!RAID.st.active)return;
    // ยืนบนพื้นที่ขอบเกาะด้านตะวันออกเฉียงเหนือ (เท้าแตะพื้น y=0) หันหน้าเข้าหากลางเกาะ
    const g=new THREE.Group(), a=-.72, R=FARM_R-7.5, px=Math.cos(a)*R, pz=Math.sin(a)*R;
    g.position.set(px,0,pz); g.rotation.y=Math.atan2(pz,-px); RAID.yaw=g.rotation.y;
    g.add(H.root); scene.add(g); H.flying=false;
    H.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.raid=1;PICK.push(o);if(o.material&&ENV){o.material.envMap=ENV;o.material.envMapIntensity=.35;}}});
    // เว้นพื้นที่รอบตัว: มอนสเตอร์ไม่เดินทะลุ และซ่อนของตกแต่งที่ทับตัวไฮดรา
    RAID.block={x:px,z:pz,r:6.5}; BLOCK.push(RAID.block);
    if(typeof RACE_DECO!=='undefined')RACE_DECO.children.forEach(o=>{if(Math.hypot(o.position.x-px,o.position.z-pz)<7.5){o.visible=false;o.userData.hidByRaid=1;}});
    scene.children.forEach(o=>{if(o.isGroup&&o!==g&&o!==island&&o!==RACE_DECO&&!BUILDINGS.some(b=>b.g===o)&&o.visible&&Math.hypot(o.position.x-px,o.position.z-pz)<6.5){o.visible=false;o.userData.hidByRaid=1;}});
    RAID.H=H; RAID.holder=g; RAID.next=2.5;
  }).catch(e=>{RAID.loading=false;console.warn('hydra',e);});
}
function raidTick(dt,T){
  const H=RAID.H; if(!H)return;
  H.tick(dt);
  RAID.next-=dt; if(RAID.next<=0&&!H.busy()){const L=['roar','taunt','breath','flameSweep','enrage','breathAll','gust','stomp','sweep','tailStab','bite','biteCombo'];H.play(L[Math.floor(Math.random()*L.length)]);RAID.next=7+Math.random()*7;}
}
const raceDmgRows=(s)=>{
  const R=s.races||{}, tot=RACE_ORDER.reduce((a,r)=>a+((R[r]||{}).dmg||0),0)||1;
  const top=RACE_ORDER.reduce((a,r)=>((R[r]||{}).dmg||0)>((R[a]||{}).dmg||0)?r:a,RACE_ORDER[0]);
  const box=el('div','rdRaces');
  RACE_ORDER.map(r=>[r,(R[r]||{}).dmg||0,(R[r]||{}).n||0]).sort((a,b)=>b[1]-a[1]).forEach(([r,d,n])=>{
    const w=el('div','rdRace'+(S.race===r?' mine':'')); w.style.setProperty('--rc',RACES[r].c);
    const hd=el('div','rdRow'); hd.append(el('b',null,RACES[r].icon+' '+RACES[r].n+(d>0&&r===top?' 👑':'')),el('span',null,fmt(d)+' · '+Math.round(d/tot*100)+'%'));
    const bar=el('div','rdBar'); const i=el('i'); i.style.width=(d/tot*100)+'%'; bar.append(i);
    w.append(hd,bar,el('small',null,n+' คนร่วมตี')); box.append(w);});
  return box;
};
function openRaid(refresh){
  const s=RAID.st;
  if(!s){loadRaid(true);return;}
  if(!refresh&&Date.now()-RAID.at>8000)loadRaid(true);
  const R=s.raid, d=el('div','raid'); const me=s.me||{};
  if(!R){openSheet('การรุกรานของไฮดรา','',para('ยังไม่มีการรุกราน'),[]);return;}
  // เลือดรวม
  const hp=el('div','rdHp'); const hi=el('i'); hi.style.width=(R.hp/R.hp_max*100)+'%'; hp.append(hi,el('em',null,fmt(R.hp)+' / '+fmt(R.hp_max)));
  d.append(hp);
  if(s.active)d.append(para('ราชันไฮดราบุกมาถึงเกาะลอยฟ้า! ผู้เล่นทั้งเซิร์ฟเวอร์ต้องช่วยกันตีจนกว่ามันจะตาย · ร่วมรบแล้ว '+fmt(s.fighters)+' คน'));
  else{const nx=s.next_at?new Date(s.next_at):null;d.append(para('🎉 ไฮดราถูกปราบแล้ว!'+(nx?' ตัวใหม่จะบินมาวัน'+nx.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'short'})+' '+nx.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}):' ตัวใหม่จะบินมาวันจันทร์หน้า')));}
  // ดาเมจแต่ละเผ่า
  d.append(el('h4',null,'ดาเมจรวมของแต่ละเผ่า')); d.append(raceDmgRows(s));
  // ของเรา
  const mine=el('div','rdMe');
  mine.append(el('div',null,'ดาเมจของคุณ '),el('b',null,fmt(me.dmg||0)),el('span',null,me.rank?' · อันดับ '+me.rank+' จาก '+fmt(s.fighters):' · ยังไม่ได้ร่วมตี'));
  d.append(mine);
  if(me.prize){const P=me.prize,nm=P.tier===1?'👑 ราชันผู้ปราบไฮดรา':P.tier===2?'🏅 วีรชนปราบไฮดรา':P.tier===3?'⚔️ นักรบปราบไฮดรา':'🎁 รางวัลร่วมปราบ';
    d.append(el('div','rdPrize','คุณได้ '+nm+' · '+fmt(P.amber)+' อัมพร + '+fmt(P.coins)+' เหรียญ (อยู่ในกล่องจดหมาย)'));}
  // 5 อันดับดาเมจ
  if(s.top&&s.top.length){d.append(el('h4',null,'ดาเมจสูงสุด'));const ol=el('ol','rdTop');s.top.forEach((t,i)=>{const li=el('li',t.me?'me':null);li.append(el('em',null,['🥇','🥈','🥉','4','5'][i]),el('b',null,(RACES[t.race]?RACES[t.race].icon+' ':'')+t.name),el('small',null,fmt(t.dmg)));ol.append(li);});d.append(ol);}
  // กติการางวัล
  const rw=el('details','rdRules'); rw.append(el('summary',null,'รางวัลเมื่อไฮดราตาย (สุ่มตามดาเมจ)'));
  rw.append(para('👑 1 คน: 3,000 อัมพร + 20,000 เหรียญ · 🏅 5 คน: 1,000 อัมพร · ⚔️ 15 คน: 400 อัมพร · 🎁 ทุกคนที่ร่วมตี: 100 อัมพร + 2,000 เหรียญ'));
  rw.append(para('ยิ่งทำดาเมจมาก โอกาสสุ่มได้รางวัลใหญ่ยิ่งสูง (คิดแบบลดหลั่น มือใหม่ก็ยังลุ้นได้) · เผ่าที่ทำดาเมจรวมสูงสุดได้โอกาสเพิ่มอีก '+Math.round(((s.rules&&s.rules.top_race_w)||1.15)*100-100)+'% · ตีได้วันละ '+((s.rules&&s.rules.hits_per_day)||5)+' ครั้ง'));
  d.append(rw);
  const acts=[];
  if(s.active){const left=me.left||0, wt=me.wait||0;
    acts.push([left<=0?'วันนี้ตีครบแล้ว':wt>0?'รออีก '+wt+' วินาที':'⚔ โจมตีไฮดรา (เหลือ '+left+' ครั้ง)',()=>{if(!S.race){openRace();return;}closeSheet();location.href='battle.html?raid=1';},'',left<=0||wt>0||!S.team.length]);}
  openSheet('การรุกรานของไฮดรา',s.active?'บอสโลก · ทั้งเซิร์ฟเวอร์':'จบแล้ว',d,acts);
}
$('#rRaid').onclick=()=>openRaid();
setInterval(()=>{if(entered&&document.visibilityState==='visible')loadRaid();},60000);
document.addEventListener('visibilitychange',()=>{if(entered&&document.visibilityState==='visible')loadRaid();});
