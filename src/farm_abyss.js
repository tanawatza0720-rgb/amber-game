/* ================= ขุมนรก 50 ชั้น: หน้าข้อมูลในฟาร์ม (เปิดจากประตูมิติ farm_portal.js หรือปุ่ม #rAbyss) =================
   server/migrate_abyss.sql: abyss_state() · เข้าสู้ที่ battle.html?abyss=1 (battle_abyss.js) · กลับมาด้วย ?portal=1 เปิดหน้านี้ให้เอง */
var ABY=null;
const abyDur=s=>{s=Math.max(0,s|0);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?d+' วัน '+h+' ชม.':h?h+' ชม. '+m+' นาที':m+' นาที';};
function abyssDot(){const b=$('#rAbyss');if(!b)return;b.classList.toggle('reddot',!!(ABY&&!ABY.joined&&NET.mode==='online'));}
async function loadAbyss(){if(NET.mode!=='online')return null;try{ABY=await api('abyss_state');ABY.at=Date.now();}catch(e){console.warn('abyss',e);}abyssDot();return ABY;}
function abyssGo(){closeSheet();location.href='battle.html?abyss=1';}
async function openPortal(){
  if(NET.mode!=='online'){openSheet('ขุมนรก','ประตูมิติลึกลับ',para('ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนจึงจะลงขุมนรกได้ (ผลและอันดับบันทึกบนเซิร์ฟเวอร์)'),[]);return;}
  openSheet('ขุมนรก 50 ชั้น','กำลังเปิดประตูมิติ…',para('กำลังโหลด…'),[]);
  const A=await loadAbyss(); if($('#shTitle').textContent!=='ขุมนรก 50 ชั้น')return;
  if(!A){openSheet('ขุมนรก 50 ชั้น','',para('เชื่อมต่อขุมนรกไม่ได้ ลองใหม่อีกครั้ง'),[]);return;}
  renderAbyss(A);
}
function renderAbyss(A){
  const d=el('div','aby'), F=A.floor, nx=A.next, Z=nx?abyssZone(nx):abyssZone(50);
  // ความคืบหน้า
  const hero=el('div','abHero');
  const top=el('div','abTop');top.append(el('b',null,'ผ่านแล้ว '+F+' / 50 ชั้น'));top.append(el('span',null,nx?'ชั้นต่อไป: '+nx+' · '+Z.n:'พิชิตครบทุกชั้นแล้ว!'));hero.append(top);
  const bar=el('div','abBar');const bi=el('i');bi.style.width=(F*2)+'%';bar.append(bi);hero.append(bar);
  if(nx){const need=A.need_next,pw=A.power,minp=Math.ceil(need*.85/1.05),st=pw>=need?['ok','พลังพอ']:pw>=minp?['mid','พอลุ้น ต้องใช้ฝีมือ']:['low','พลังยังไม่พอ'];
    const pr=el('div','abNeed '+st[0]);pr.append(el('span',null,'ต้องการพลัง ~'+fmt(need)+' · ทีมคุณ '+fmt(pw)));pr.append(el('em',null,st[1]));hero.append(pr);}
  if(nx){const go=el('button','sbtn gold abGo','⚔ ลงสู่ชั้น '+nx);go.onclick=abyssGo;hero.append(go);}
  d.append(hero);
  // พรประจำสัปดาห์
  const B=abyssBless(A.bless), bl=el('div','abBless'+(B?'':' none'));
  bl.append(el('i',null,B?B.i:'🎲'));const bt=el('div');bt.append(el('b',null,B?B.n:'พรประจำสัปดาห์'));bt.append(el('small',null,B?B.d+' · ใช้ได้จนถึงรีเซ็ต':'สุ่มพร 1 อย่าง (+10%) ให้ตอนเข้าสู้ครั้งแรกของสัปดาห์ ใช้ได้ทั้งสัปดาห์'));bl.append(bt);d.append(bl);
  if(A.box){let bx={};try{bx=typeof A.box==='string'?JSON.parse(A.box):A.box;}catch(e){}
    d.append(rows([['🎁 กล่องลึกลับสัปดาห์นี้','อัมพร '+fmt(bx.amber||0)+' + '+(bx.egg==='sure'?'ไข่เทพการันตี':'ไข่เทพ'),'#ffb347']]));}
  // รางวัลแต่ละชั้น (แบ่งตามโซน · กางโซนของชั้นถัดไปไว้)
  d.append(el('h4','abH','รางวัลแต่ละชั้น (ได้เมื่อผ่านครั้งแรกของสัปดาห์ · ทุกชั้น +🔶2)'));
  ABYSS_ZONES.forEach((z,zi)=>{const a=zi*10+1,b=a+9,det=el('details','abZone');if(nx?(nx>=a&&nx<=b):zi===4)det.open=true;
    const sm=el('summary');sm.append(el('b',null,'ชั้น '+a+'–'+b+' · '+z.n));sm.append(el('span',null,z.el.map(e=>ELEM[e]?ELEM[e].i:'').join('')+' บอส: '+z.boss[1]+(F>=b?' ✓':'')));det.append(sm);
    const grid=el('div','abGrid');
    (A.floors||[]).slice(a-1,b).forEach(r=>{const t=el('div','abT'+(r.boss?' boss':'')+(r.box?' box':'')+(r.f<=F?' done':r.f===nx?' next':''));
      t.append(el('small',null,(r.boss?'👑 ':'')+'ชั้น '+r.f));
      if(r.box){t.append(el('b',null,'🎁 กล่องลึกลับ'));t.append(el('b',null,'🔶'+r.amber));}
      else if(r.boss){t.append(el('b',null,'🔶'+r.amber));t.append(el('em',null,'🪙'+fmt(r.coins)));}
      else{t.append(el('b',null,'🪙'+fmt(r.coins)));t.append(el('em',null,'🔶'+r.amber));}
      t.title='ต้องการพลัง ~'+fmt(r.need);grid.append(t);});
    det.append(grid);d.append(det);});
  // อันดับสัปดาห์นี้
  d.append(el('h4','abH','อันดับสัปดาห์นี้'+(A.players?' · '+A.players+' คนลงไปแล้ว':'')));
  const L=el('ol','abTop10');
  if(!(A.top||[]).length)L.append(el('li','none','ยังไม่มีใครผ่านชั้นแรก เป็นคนแรกเลย!'));
  (A.top||[]).forEach((r,i)=>{const li=el('li',r.me?'me':null);li.append(el('em',null,['🥇','🥈','🥉'][i]||String(i+1)));
    li.append(el('b',null,(r.race&&RACES[r.race]?RACES[r.race].icon+' ':'')+r.name));li.append(el('span',null,'ชั้น '+r.floor));L.append(li);});
  d.append(L);
  if(A.rank)d.append(el('p','abMe','อันดับของคุณ: '+A.rank+(A.players?' จาก '+A.players+' คน':'')));
  d.append(el('p','frNote','ไต่ได้ทีละชั้น · แพ้ไม่เสียอะไร ลองใหม่ได้ไม่จำกัด · ระวัง "มือดำ" ที่โผล่จากพื้นคว้าตัวละครให้มึนแล้วลากเข้าหาศัตรู ยิ่งลึกยิ่งบ่อย · รีเซ็ตคืนวันอาทิตย์เที่ยงคืน (เวลาไทย) ทุกคนเริ่มชั้น 1 ใหม่'));
  const left=Math.max(0,A.reset_in-Math.floor((Date.now()-A.at)/1000));
  openSheet('ขุมนรก 50 ชั้น','รีเซ็ตใน '+abyDur(left),d,nx?[['⚔ ลงสู่ชั้น '+nx,abyssGo,'gold']]:[['พิชิตครบ 50 ชั้นแล้ว · รอรีเซ็ต',()=>{},'',true]]);
}
if($('#rAbyss'))$('#rAbyss').onclick=()=>openPortal();
if(window.__F)__F.abyss=d=>{ABY=Object.assign(d,{at:Date.now()});renderAbyss(ABY);};
// เข้าเกม: เช็กว่าสัปดาห์นี้เข้าร่วมแล้วหรือยัง (จุดแดง) · กลับจากสนามรบด้วย ?portal=1 → เปิดหน้าขุมนรกให้เลย
{let done=false;const t=setInterval(()=>{if(typeof entered==='undefined'||!entered)return;clearInterval(t);if(done)return;done=true;
  if(NET.mode!=='online')return;
  if(/[?&]portal=1/.test(location.search)){history.replaceState(null,'',location.pathname+location.search.replace(/([?&])portal=1&?/,'$1').replace(/[?&]$/,''));setTimeout(openPortal,600);}
  else loadAbyss();},1000);}
