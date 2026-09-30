/* ================= คู่มือผู้เล่นใหม่ (ป๊อปอัปแนะนำทีละขั้น) =================
   เริ่มเองครั้งแรกหลังเลือกเผ่า · ทำตามได้ (แตะจุดที่ไฮไลต์) หรือกดข้าม · เปิดซ้ำได้จากปุ่ม "คู่มือ" */
const GUIDE_KEY='amber_guide_v1';
const GUIDE_STEPS=[
  {t:'ยินดีต้อนรับสู่ป่าอัมพร! 🌳',d:'ให้พาทัวร์สั้น ๆ ไหม? ใช้เวลาไม่ถึงนาที ทำตามจุดที่เรืองแสงได้เลย หรือกดข้ามก็ได้',center:1,btn:'เริ่มเลย'},
  {sel:'#pCoin',t:'เหรียญ 🪙',d:'ได้จากการผจญภัยและภารกิจ ใช้อัปเลเวลมอนสเตอร์และฟักไข่ป่า'},
  {sel:'#pAmber',t:'อัมพร 🔶',d:'ต้นอัมพรกลางฟาร์มออกผลเรื่อย ๆ แตะเก็บได้ ใช้ฟักไข่ทองคำที่มีโอกาสได้ตัวหายาก'},
  {sel:'#nHatch',t:'ลองฟักไข่',d:'แตะ "ฟักไข่" เพื่อไปที่ศาลฟักไข่',click:1},
  {sel:'#shActs',t:'เลือกไข่',d:'ไข่ป่าใช้เหรียญ ไข่ทองคำใช้อัมพร แตะเพื่อฟักได้เลย (หรือกดถัดไป)',click:'#shActs button',opt:1},
  {sel:'#nMons',t:'มอนสเตอร์ของคุณ',d:'แตะเพื่อเปิดคลังมอนสเตอร์',click:1},
  {sel:'#bTeam',t:'ทีมต่อสู้ 6 ตัว',d:'ทีมนี้ใช้ในทุกการต่อสู้ แตะมอนสเตอร์ในคลัง แล้วกด "ใส่ทีม" เพื่อจัดทีม',opt:1},
  {sel:'#mdUp',t:'อัปเลเวล',d:'ใช้เหรียญเพิ่มเลเวล พลังรบจะสูงขึ้นทันที',opt:1},
  {sel:'#mdEvo',t:'วิวัฒน์',d:'ใช้ตัวซ้ำเป็นอาหารเพื่อขึ้นดาว สกิลแรงขึ้น และพลังรบ +5% ต่อดาว',opt:1},
  {sel:'#bClose',t:'ปิดคลัง',d:'แตะกากบาทเพื่อกลับฟาร์ม',click:1,opt:1},
  {sel:'#nQuest',t:'ภารกิจรายวัน',d:'ทำภารกิจง่าย ๆ ทุกวันเพื่อรับเหรียญและอัมพร'},
  {sel:'#rDaily',t:'รางวัลเข้าเกมรายวัน',d:'เข้าเกมทุกวันรับของฟรี ยิ่งต่อเนื่องยิ่งได้เยอะ'},
  {sel:'#rFriend',t:'เพื่อน 👥',d:'แลกรหัสกับเพื่อนเพื่อเพิ่มเพื่อน แล้วไปเยี่ยมบ้านกัน เยี่ยมครั้งแรกของวันได้เหรียญด้วย',opt:1},
  {sel:'#rExp',t:'ส่งสำรวจ 🧭',d:'ส่งมอนสเตอร์นอกทีมออกไปสำรวจ ได้ของและเลเวลกลับมา แต่ระวัง บางตัวอาจไม่กลับมา!',opt:1},
  {sel:'#rRaid',t:'การรุกรานของไฮดรา',d:'บอสโลกบุกทุกวันจันทร์ ทั้งเซิร์ฟเวอร์ช่วยกันตี รางวัลสุ่มตามดาเมจ',opt:1},
  {sel:'#rankBox',t:'อันดับเผ่า',d:'ดูจำนวนสมาชิกและ 3 อันดับแรกของแต่ละเผ่า',opt:1},
  {sel:'#nBattle',t:'ผจญภัย ⚔️',d:'ทีมของคุณดันด่านเองตลอดเวลา ทุก 10 ด่านมีบอสให้ท้า และแต่ละบทจะพาไปสู้ในดินแดนต่าง ๆ พร้อมแล้วก็ลุยเลย!',last:1},
];
var GD={i:-1,on:false,tm:null,wait:null};
function guideDone(){try{return localStorage.getItem(GUIDE_KEY)==='1';}catch(e){return false;}}
function guideMark(){try{localStorage.setItem(GUIDE_KEY,'1');}catch(e){}}
function guideEl(){let g=$('#guide');if(g)return g;g=document.createElement('div');g.id='guide';
  g.innerHTML='<div id="gdHole"></div><div id="gdTip" role="dialog" aria-live="polite"><div id="gdStep"></div><b id="gdT"></b><p id="gdD"></p><div id="gdBtns"><button id="gdSkip">ข้ามคู่มือ</button><button id="gdNext">ถัดไป</button></div></div>';
  document.body.append(g);$('#gdSkip').onclick=()=>guideEnd(true);$('#gdNext').onclick=()=>guideGo(GD.i+1);return g;}
function guideVisible(e){if(!e||e.hidden)return false;const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&cs.display!=='none'&&cs.opacity!=='0';}
function guideStart(force){if(GD.on||(!force&&guideDone()))return;GD.on=true;guideEl().hidden=false;document.body.classList.add('guideOn');guideGo(0);}
function guideEnd(skip){GD.on=false;clearInterval(GD.tm);GD.tm=null;GD.wait=null;const g=$('#guide');if(g)g.hidden=true;document.body.classList.remove('guideOn');guideMark();
  if(skip)toast('ปิดคู่มือแล้ว · เปิดซ้ำได้จากปุ่ม "คู่มือ"');}
function guideGo(i){
  if(i>=GUIDE_STEPS.length){guideEnd(false);toast('จบคู่มือแล้ว ขอให้สนุกกับป่าอัมพร! 🌳');return;}
  GD.i=i;const s=GUIDE_STEPS[i];clearInterval(GD.tm);
  let tries=0;const find=()=>s.sel?document.querySelector(s.sel):null;
  // รอให้จุดที่ต้องชี้ปรากฏ (เช่น หน้าต่างกำลังเปิด) ถ้าไม่มีภายใน ~1.5 วิ ข้ามไปขั้นถัดไป
  const show=()=>{const e=find();
    if(s.sel&&!guideVisible(e)){if(++tries>5){guideGo(i+1);}return false;}
    $('#gdStep').textContent=(i+1)+'/'+GUIDE_STEPS.length;$('#gdT').textContent=s.t;$('#gdD').textContent=s.d;
    $('#gdNext').textContent=s.btn||(s.last?'จบคู่มือ':'ถัดไป');$('#gdNext').hidden=!!s.click&&!s.opt;$('#gdNext').classList.toggle('ghost',!!s.click);
    GD.wait=s.click?(typeof s.click==='string'?s.click:s.sel):null;guidePlace();return true;};
  if(!show()){GD.tm=setInterval(()=>{if(show()){clearInterval(GD.tm);GD.tm=setInterval(guidePlace,300);}},300);}
  else GD.tm=setInterval(guidePlace,300);
}
function guidePlace(){if(!GD.on)return;const s=GUIDE_STEPS[GD.i],hole=$('#gdHole'),tip=$('#gdTip');
  const W=innerWidth,H=innerHeight;let r=null;
  if(s.sel){const e=document.querySelector(s.sel);if(!guideVisible(e)){if(s.click&&GD.wait)return;return;}r=e.getBoundingClientRect();}
  if(!r){hole.style.cssText=`left:${W/2}px;top:${H/2}px;width:0;height:0`;tip.style.left=Math.max(12,(W-Math.min(300,W-24))/2)+'px';tip.style.top=Math.max(12,H/2-80)+'px';return;}
  const p=6;hole.style.cssText=`left:${r.left-p}px;top:${r.top-p}px;width:${r.width+p*2}px;height:${r.height+p*2}px`;
  const tw=Math.min(300,W-24),th=tip.offsetHeight||120;let x=Math.min(W-tw-12,Math.max(12,r.left+r.width/2-tw/2)),y=r.bottom+14;
  if(y+th>H-10)y=Math.max(10,r.top-th-14);
  tip.style.left=x+'px';tip.style.top=y+'px';tip.style.width=tw+'px';}
// ผู้เล่นแตะจุดที่ไฮไลต์: ไปขั้นถัดไป (ไม่ขวางการกดจริง)
document.addEventListener('click',e=>{if(!GD.on||!GD.wait)return;if(e.target.closest('#guide'))return;if(e.target.closest(GD.wait)){GD.wait=null;const n=GD.i+1;setTimeout(()=>GD.on&&GD.i===n-1&&guideGo(n),450);}},true);
addEventListener('resize',()=>GD.on&&guidePlace());
// เริ่มเองครั้งแรก: หลังเข้าเกมและเลือกเผ่าแล้ว ไม่มีหน้าต่างอื่นเปิดอยู่
setInterval(()=>{if(GD.on||guideDone()||typeof entered==='undefined'||!entered||!S.race)return;
  if(document.body.classList.contains('raceOpen')||document.body.classList.contains('boxOpen')||document.body.classList.contains('preLogin'))return;
  if(!$('#sheet').hidden||!$('#login').hidden)return;guideStart(false);},1500);
$('#rGuide').onclick=()=>{closeSheet();guideStart(true);};
