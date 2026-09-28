/* ================= HUD & เมนู ================= */
const fmt=n=>n.toLocaleString('en-US');
function bump(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
function renderHUD(){
  $('#pname').textContent=S.name; $('#plv').textContent='Lv '+S.lv; $('#pxp').style.width=Math.min(100,S.xp)+'%'; $('#netDot').className=NET.mode; $('#netDot').title=NET.mode==='online'?'ออนไลน์ · เซฟบนเซิร์ฟเวอร์':'ออฟไลน์ · เซฟในเครื่องนี้'; $('#avaT').textContent=S.name.slice(0,1);
  $('#rEnergy').textContent=S.energy+'/'+S.energyMax; $('#rCoin').textContent=fmt(S.coins); $('#rAmber').textContent=fmt(S.amber);
  $('#bDaily').hidden=S.dailyClaimed; $('#bMail').hidden=S.mailRead;
  const qDone=questList().filter(q=>q.cur>=q.need&&!q.claimed).length; $('#bQuest').hidden=!qDone; $('#bQuest').textContent=qDone;
}
let toastT; function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2600);}
function bumpRes(kind){bump($(kind==='coins'?'#pCoin':kind==='amber'?'#pAmber':'#pEnergy'));}

/* ---------- แผ่นข้อมูล (bottom sheet) ---------- */
const sheet=$('#sheet');
function openSheet(title,sub,body,actions){
  $('#shTitle').textContent=title; $('#shSub').textContent=sub||''; const b=$('#shBody'); b.innerHTML=''; if(body)b.append(body);
  const a=$('#shActs'); a.innerHTML=''; (actions||[]).forEach(([label,fn,cls,dis])=>{const bt=document.createElement('button');bt.className='sbtn '+(cls||'');bt.textContent=label;bt.disabled=!!dis;bt.onclick=fn;a.append(bt);});
  sheet.hidden=false;
}
function closeSheet(){sheet.hidden=true;selRing.visible=false;}
$('#shClose').onclick=closeSheet;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function rows(list){const d=el('div','rows');list.forEach(([a,b,c])=>{const r=el('div','row');r.append(el('span',null,a));const v=el('b',null,b);if(c)v.style.color=c;r.append(v);d.append(r);});return d;}
function para(t){return el('p','ptxt',t);}

const INFO={
  hatch:()=>{const d=el('div');d.append(para('วางไข่บนแท่นแล้วฟักเพื่อรับมอนสเตอร์ใหม่ ผลสุ่มตัดสินโดยเซิร์ฟเวอร์ ตัวที่ฟักได้จะเดินออกมาอยู่ในฟาร์มทันที'));
    const T=el('table','oddsT');T.innerHTML='<tr><th>ระดับ</th><th>ไข่ป่า</th><th>ไข่ทองคำ</th></tr>';
    [[4,'อามาเทรุ','1%','6%'],[3,'คุโรกะ','4%','16%'],[2,'คาเซะคิริ','13%','33%'],[1,'คาเซะมารุ','82%','45%']].forEach(([r,n,a,b])=>{const tr2=document.createElement('tr');const td=document.createElement('td');const t=el('span','tierTag r'+r,tierOf(r).n);td.append(t,' '+n);tr2.append(td);[a,b].forEach(x=>{const c=document.createElement('td');c.textContent=x;tr2.append(c);});T.append(tr2);});
    d.append(T); d.append(rows([['การันตีระดับเทพเจ้า (ไข่ทองคำ)','อีก '+Math.max(1,S.pityMax-S.pity)+' ใบ','#ff8ac4']]));
    openSheet('ศาลฟักไข่','ฟักแล้ว '+(S.quests.hatch||0)+' ครั้งวันนี้ · ช่องเก็บ '+S.mons.length+'/'+S.slots,d,[['ฟักไข่ป่า · 100 เหรียญ',()=>hatch('wild','ไข่ป่า'),'',S.coins<100],['ฟักไข่ทองคำ · 30 อัมพร',()=>hatch('gold','ไข่ทองคำ'),'gold',S.amber<30]]);},
  dojo:()=>{const d=el('div');d.append(para('ทีม 3 ตัวออกผจญภัยดันด่านให้เองตลอดเวลา แม้ปิดเกมก็ยังสะสมรางวัลได้สูงสุด 8 ชั่วโมง ทุก 10 ด่านจะมีบอสให้กดสู้เอง'));
    const lb=n=>Math.ceil(n/10)+'-'+(((n-1)%10)+1), sec=Math.min(S.idleMax||28800,(S.idleSec||0)+Math.floor((Date.now()-(S.idleAt||Date.now()))/1000));
    const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);
    d.append(rows([['ด่านที่ผ่านแล้ว',S.stage?lb(S.stage):'-'],['พลังทีม',(S.power||0).toLocaleString('en-US')],
      ['ด่านต่อไป',S.boss?'บอส '+lb(S.stage+1):lb(S.stage+1)+' · ต้องการ '+(S.need||0).toLocaleString('en-US'),S.boss?'#ffd24a':S.power>=S.need?'#5fe0c0':'#ffb09a'],
      ['รางวัลสะสม','🪙 '+Math.floor(sec*(S.rateC||0)/60).toLocaleString('en-US')+' · '+(h?h+' ชม. ':'')+m+' นาที','#ffb347']]));
    const tm=S.team.map(u=>S.mons.find(m=>m.uid===u)).filter(Boolean).map(m=>spOf(m).name).join(', ');
    openSheet('ผจญภัย','ทีมปัจจุบัน: '+(tm||'-'),d,[['ไปผจญภัย',()=>{location.href='battle.html';}],['จัดทีม',()=>openBox(),'ghost']]);},
  archive:()=>{const d=el('div');d.append(para('ที่เก็บและดูแลมอนสเตอร์ทั้งหมดของคุณ เลี้ยง อัปเลเวล วิวัฒนาการ และจัดทีม'));
    const list=el('div','mons');S.mons.forEach((m,i)=>{const c=el('div','mcard');c.append(el('b',null,spOf(m).name));c.append(el('span',null,tierOf(spOf(m).rar).n+' · Lv '+m.lv));list.append(c);});d.append(list);
    openSheet('หอคัมภีร์มอนสเตอร์','มีอยู่ '+S.mons.length+'/'+S.slots+' ตัว',d,[['เปิดคลังมอนสเตอร์',()=>openBox()]]);},
  shop:()=>{const d=el('div');d.append(para('ของทุกชิ้นซื้อด้วยสกุลเงินในเกม'));
    const items=[['พลังงาน +30','20 อัมพร',async()=>{if(await act('buy_energy')){bumpRes('energy');toast('เติมพลังงาน +30');}}],
      ['ไข่ป่า ×1','100 เหรียญ',()=>{closeSheet();INFO.hatch();}]];
    const list=el('div','shop');items.forEach(([n,p,fn])=>{const r=el('button','sitem');r.append(el('span',null,n));r.append(el('b',null,p));r.onclick=fn;list.append(r);});d.append(list);
    openSheet('ร้านค้า','สินค้าเปลี่ยนทุกวัน',d,[]);},
  tree:()=>{const d=el('div');d.append(para('ต้นไม้ประจำฟาร์มที่ออกผลเป็นก้อนอัมพร ใช้ฟักไข่ทองคำและซื้อของพิเศษ'));
    d.append(rows([['ผลผลิต','5 อัมพร ทุก 10 นาที'],['รอบถัดไป',amberReady?'พร้อมเก็บแล้ว':fmtTime(S.amberIn),amberReady?'#ffb347':null]]));
    openSheet('ต้นอัมพร','ระดับ 2',d,[['เก็บอัมพร',()=>{collectAmber();closeSheet();},'',!amberReady]]);},
  gate:()=>{const d=el('div');d.append(para('ไปเยี่ยมฟาร์มของเพื่อน ดูมอนสเตอร์ของเขา และส่งหัวใจให้กันได้วันละครั้ง'));
    d.append(rows([['เพื่อนออนไลน์','3 คน'],['หัวใจที่ส่งได้วันนี้','5']]));
    openSheet('ประตูเยี่ยมเพื่อน','',d,[['เยี่ยมฟาร์มเพื่อน',()=>toast('ฟาร์มเพื่อนจะเปิดเมื่อเชื่อมระบบบัญชีผู้เล่น')]]);},
};
function focusBuilding(id){
  const b=BUILDINGS.find(x=>x.id===id); if(!b)return;
  camTTo.set(b.x,0,b.z+1.5); distTo=Math.min(distTo,22);
  selRing.visible=true; selRing.position.x=b.x; selRing.position.z=b.z; selRing.scale.setScalar(b.r+.2);
  const g=b.g; tween(.35,t=>g.scale.setScalar(1+Math.sin(t*Math.PI)*.05));
  INFO[id]();
}
function questList(){return[
  {id:'hatch',n:'ฟักไข่ 1 ครั้ง',cur:S.quests.hatch||0,need:1,r:'100 เหรียญ',claimed:!!S.quests.hatchC},
  {id:'battle',n:'ชนะการต่อสู้ 3 ครั้ง',cur:S.quests.battle||0,need:3,r:'10 อัมพร',claimed:!!S.quests.battleC},
  {id:'amber',n:'เก็บอัมพรจากต้นไม้',cur:S.quests.amber||0,need:1,r:'150 เหรียญ',claimed:!!S.quests.amberC}];}
function openQuests(){
  const d=el('div','quests');
  questList().forEach(q=>{const r=el('div','quest');const t=el('div');t.append(el('b',null,q.n));t.append(el('span',null,'รางวัล '+q.r));
    const bar=el('div','qbar');const i=el('i');i.style.width=Math.min(100,q.cur/q.need*100)+'%';bar.append(i);t.append(bar);r.append(t);
    const bt=el('button','sbtn small',q.claimed?'รับแล้ว':q.cur>=q.need?'รับรางวัล':Math.min(q.cur,q.need)+'/'+q.need);bt.disabled=q.claimed||q.cur<q.need;
    bt.onclick=async()=>{const r=await act('claim_quest',{q:q.id});if(r){bumpRes(r.kind);toast('ได้รับ '+r.amount+(r.kind==='coins'?' เหรียญ':' อัมพร'));}openQuests();};r.append(bt);d.append(r);});
  openSheet('ภารกิจประจำวัน','รีเซ็ตทุกวันเวลา 00:00 (เวลาไทย)',d,[]);
}
const DAILY=[['coins',200],['amber',5],['coins',300],['coins',400],['amber',10],['coins',500],['amber',30]];
function openDaily(){
  const d=el('div','days'); const done=S.dailyClaimed?((S.daily-1)%7+1):(S.daily%7), next=S.daily%7;
  DAILY.forEach(([k,a],i)=>{const c=el('div','day'+(i<done?' got':i===next&&!S.dailyClaimed?' now':''));c.append(el('span',null,'วัน '+(i+1)));c.append(el('b',null,a+(k==='coins'?' เหรียญ':' อัมพร')));d.append(c);});
  openSheet('รางวัลเข้าเกมรายวัน','เข้าเกมต่อเนื่อง '+S.daily+' วัน',d,[[S.dailyClaimed?'รับแล้ววันนี้':'รับรางวัลวันที่ '+(next+1),async()=>{const r=await act('claim_daily');if(r){bumpRes(r.kind);toast('ได้รับ '+r.amount+(r.kind==='coins'?' เหรียญ':' อัมพร'));closeSheet();}},'',S.dailyClaimed]]);
}
function openMail(){S.mailRead=true;save();renderHUD();
  const d=el('div','mail');[['ยินดีต้อนรับสู่ป่าอัมพร!','ของขวัญต้อนรับ: มังกรอามาเทรุ ระดับเทพเจ้า อยู่ในคลังมอนสเตอร์แล้ว'],['อัปเดตเกม','เซฟบนเซิร์ฟเวอร์แล้ว เล่นต่อได้ทุกครั้งที่เปิด']].forEach(([a,b])=>{const m=el('div','mitem');m.append(el('b',null,a));m.append(el('span',null,b));d.append(m);});
  openSheet('กล่องจดหมาย','2 ฉบับ',d,[]);}

$('#nBattle').onclick=()=>focusBuilding('dojo');
$('#nMons').onclick=()=>focusBuilding('archive');
$('#nHatch').onclick=()=>focusBuilding('hatch');
$('#nQuest').onclick=openQuests;
$('#nShop').onclick=()=>focusBuilding('shop');
$('#rDaily').onclick=openDaily; $('#rMail').onclick=openMail;
$('#rEvent').onclick=()=>openSheet('กิจกรรม','',para('กิจกรรมพิเศษประจำเดือนจะแสดงที่นี่ เช่น ไข่ธีมเทศกาล และด่านบอสจำกัดเวลา'),[]);

/* ---------- ฟักไข่ในฟาร์ม (เซิร์ฟเวอร์สุ่มผล) ---------- */
let hatching=false;
async function hatch(kind,name){
  if(hatching)return; hatching=true; closeSheet(); camTTo.set(0,0,5); distTo=16;
  const shake=tween(1.4,t=>{hatchEggMat.emissiveIntensity=.25+t*2.5;hatchEgg.rotation.y+=.2+t*.6;hatchEgg.position.y=2.15+Math.sin(t*40)*.03*t;});
  const r=await act('hatch_egg',{kind}); await shake; hatchEggMat.emissiveIntensity=.25;
  if(!r){hatching=false;return;}
  bumpRes(kind==='gold'?'amber':'coins');
  const col=tierOf(r.rar).hx;
  const ep=new THREE.Vector3(0,2.15,3.2);
  flashBall(ep,col,r.rar>=4?6:r.rar>=3?5:4); particles(ep,col,r.rar>=4?120:r.rar>=3?85:60,3.2,.07,1.6); particles(ep,0xffffff,24,2.4,.05,1.2);
  if(r.rar>=4){shakeCam=.4;}else if(r.rar>=3){shakeCam=.2;}
  const d=S.mons.find(m=>m.uid===Number(r.mon.id))||{uid:Number(r.mon.id),sp:r.mon.sp,lv:1};
  const ag=addAgent(d,[0,5.9],true); if(!ag.fly){ag.state='idle'; ag.wait=2.5;}
  toast(name+' ฟักแล้ว! ได้'+SPEC[r.mon.sp].name+' ระดับ'+tierOf(r.rar).n+(r.rar>=4?'!!':r.rar>=3?'!':' เดินออกมาในฟาร์มแล้ว'));
  hatching=false;
}
let shakeCam=0;
const fmtTime=s=>s>=60?Math.floor(s/60)+' นาที '+(s%60|0)+' วินาที':Math.ceil(s)+' วินาที';

/* ---------- ต้นอัมพร ---------- */
async function collectAmber(){
  if(!amberReady)return;
  const r=await act('collect_amber'); if(!r)return;
  amberReady=false; amberBubble.visible=false;
  const p=new THREE.Vector3(6,6.1,-5.6); particles(p,0xffb347,30,2.2,.06,1.2);
  bumpRes('amber'); toast('เก็บอัมพร +'+r.amount);
}

/* ---------- แตะ / ลาก / ซูม ---------- */
const camT=new THREE.Vector3(0,0,.5), camTTo=camT.clone(); let dist=44, distTo=40;
const PITCH=.92;
const ptrs=new Map(); let downAt=null, moved=0, pinch0=0;
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});downAt={x:e.clientX,y:e.clientY};moved=0;if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;
  if(ptrs.size===1){const dx=e.clientX-p.x,dy=e.clientY-p.y;moved+=Math.abs(dx)+Math.abs(dy);const k=dist*.0017;camTTo.x-=dx*k;camTTo.z-=dy*k/Math.cos(PITCH)*.7;const r=Math.hypot(camTTo.x,camTTo.z);if(r>14)camTTo.multiplyScalar(14/r);}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0){distTo=Math.max(12,Math.min(58,distTo*pinch0/d));}pinch0=d;moved=99;}});
const endPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=0;if(ptrs.size===0&&downAt&&moved<8)tap(e.clientX,e.clientY);if(ptrs.size===0)downAt=null;};
cv.addEventListener('pointerup',endPtr); cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);downAt=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();distTo=Math.max(12,Math.min(58,distTo*(1+e.deltaY*.0012)));},{passive:false});
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
let tagAgent=null;
function tap(cx,cy){
  const r=cv.getBoundingClientRect(); ndc.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1); ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(PICK,false).find(h=>h.object.visible!==false);
  if(!hit){closeSheet();tagAgent=null;$('#mtag').hidden=true;return;}
  const o=hit.object;
  if(o.userData.agent!=null){const ag=AGENTS[o.userData.agent];tagAgent=ag;const t=$('#mtag');t.hidden=false;
    $('#mtName').textContent=spOf(ag.data).name; $('#mtInfo').textContent=tierOf(spOf(ag.data).rar).n+' · Lv '+ag.data.lv+' · '+(ag.state==='walk'?'กำลังเดินเล่น':'กำลังพักผ่อน');
    const w=ag.w; tween(.3,t=>w.position.y=Math.sin(t*Math.PI)*.4); return;}
  if(o===amberBubble&&amberReady){collectAmber();return;}
  if(o.userData.pick)focusBuilding(o.userData.pick);
}

/* ---------- ลูป ---------- */
function layout(){boxLayout&&0;const w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<.8?52:40;camera.updateProjectionMatrix();}
new ResizeObserver(layout).observe(view);
const clock=new THREE.Clock(); let T=0, regen=0;
const wfOff=waterfallT.offset, pOff=pondT.offset, v3=new THREE.Vector3();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.1); T+=dt;
  for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i];tw.t+=dt;const k=Math.min(1,tw.t/tw.d);tw.fn(tw.ease(k));if(k>=1){tweens.splice(i,1);tw.r();}}
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.p.position.addScaledVector(q.v,dt);q.v.y-=dt*q.grav;q.v.multiplyScalar(q.grow?.96:1);q.life-=dt*q.decay;q.p.material.opacity=Math.max(0,q.life*q.o);if(q.grow)q.p.scale.multiplyScalar(1+dt*.9);if(q.life<=0){scene.remove(q.p);q.p.material.dispose();parts.splice(i,1);}}
  AGENTS.forEach(a=>agentUpdate(a,dt));
  rigUpdate(dt);
  AGENTS.forEach(a=>a.inner.userData.idle(T));
  // น้ำ เมฆ สิ่งมีชีวิตเล็ก ๆ
  wfOff.y+=dt*1.2; pOff.x+=dt*.02; pOff.y+=dt*.015;
  if(Math.random()<dt*14)particles(v3.set(1.5+(Math.random()-.5)*1.2,.2,-8.9),0xffffff,1,.8,.08,1.2,.7);
  worldTick(dt,T);
  butterflies.forEach(b=>{const [a,c,x,z]=b.userData.p;b.position.set(x+Math.sin(T*.4+a)*3,1+Math.sin(T*2+c)*.4+.5,z+Math.cos(T*.35+c)*3);});
  fallLeaves.forEach((l,i)=>{l.position.y-=dt*.35;l.position.x+=Math.sin(T+i)*dt*.3;l.rotation.x+=dt*(1.5+i%3);l.rotation.y+=dt;if(l.position.y<.05)l.position.set(4+Math.random()*4,4+Math.random()*2.5,-8+Math.random()*5);});
  scene.traverse&&0;
  if(hatchEgg){hatchEgg.position.y=2.15+Math.sin(T*1.6)*.12;hatchEgg.rotation.y+=dt*.6;}
  S.amberIn=Math.max(0,S.amberIn-dt);
  if(amberBubble){const rd=S.amberIn<=0;if(rd!==amberReady){amberReady=rd;amberBubble.visible=rd;}amberBubble.position.y=6.1+Math.sin(T*2)*.15;}
  if(selRing.visible)selRing.material.opacity=.55+.4*Math.sin(T*4);
  // ฟื้นพลังงาน (แสดงผล เซิร์ฟเวอร์คำนวณจริง)
  if(S.energy<S.energyMax){S.energyNext-=dt;if(S.energyNext<=0){S.energy++;S.energyNext+=S.energySec;renderHUD();}}
  regen+=dt; if(regen>=.5){regen=0;$('#rTimer').textContent=S.energy<S.energyMax?('+1 ใน '+fmtClock(S.energyNext)):'';}
  if(tagAgent){const w=tagAgent.w;v3.set(w.position.x,(tagAgent.fly?tagAgent.w.position.y+2.4:tagAgent.evo?4.1:2.6),w.position.z).project(camera);const t=$('#mtag');t.style.left=((v3.x*.5+.5)*view.clientWidth)+'px';t.style.top=((-v3.y*.5+.5)*view.clientHeight)+'px';}
  camT.lerp(camTTo,Math.min(1,dt*6)); dist+=(distTo-dist)*Math.min(1,dt*6);
  camera.position.set(camT.x,camT.y+Math.sin(PITCH)*dist,camT.z+Math.cos(PITCH)*dist);
  if(shakeCam>0){shakeCam=Math.max(0,shakeCam-dt*.8);camera.position.x+=(Math.random()-.5)*shakeCam;camera.position.y+=(Math.random()-.5)*shakeCam;}
  camera.lookAt(camT);
  if(BOX.open)boxFrame(dt,T); else renderer.render(scene,camera);
}
const fmtClock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
/* ---------- บัญชีผู้เล่น ---------- */
function openAccount(){
  const d=el('div');
  d.append(rows([['สถานะ',NET.mode==='online'?'ออนไลน์ · เซฟบนเซิร์ฟเวอร์':'ออฟไลน์ · เซฟในเครื่องนี้',NET.mode==='online'?'#5fe0c0':'#ffb347'],
    ['รหัสผู้เล่น',S.uid||'-'],
    ['บัญชี',NET.mode!=='online'?'-':userLabel(NET.user)]]));
  if(NET.mode!=='online')d.append(para('ตอนนี้เชื่อมเซิร์ฟเวอร์ไม่ได้ ความคืบหน้าจะเก็บไว้ในเครื่องนี้ก่อน'));
  else if(NET.user&&NET.user.is_anonymous)d.append(para('บัญชีผู้เยี่ยมชมผูกกับเบราว์เซอร์นี้ ถ้าล้างข้อมูลเว็บจะหาย ผูกกับ Google เพื่อเล่นต่อได้ทุกเครื่อง'));
  const f=el('div','nameRow'); const inp=el('input'); inp.value=S.name; inp.maxLength=24; inp.setAttribute('aria-label','ชื่อผู้เล่น'); f.append(inp);
  const sv=el('button','sbtn small','บันทึกชื่อ'); sv.onclick=async()=>{if(await act('set_name',{new_name:inp.value})){toast('เปลี่ยนชื่อแล้ว');closeSheet();}}; f.append(sv); d.append(f);
  const acts=[]; if(NET.mode==='online'&&NET.user&&NET.user.is_anonymous)acts.push(['ผูกบัญชี Google',linkGoogle]);
  acts.push([NET.mode==='online'?'ออกจากระบบ':'กลับหน้าเข้าสู่ระบบ',async()=>{closeSheet();if(NET.mode==='online')await signOutAll();location.replace(redirectTo());},'ghost']);
  openSheet('บัญชีผู้เล่น',S.name+' · Lv '+S.lv,d,acts);
}
$('.profile').onclick=openAccount;
// ดึงสถานะจากเซิร์ฟเวอร์ใหม่ทุก 2 นาที (พลังงาน/ต้นไม้ตรงกับเซิร์ฟเวอร์)
setInterval(async()=>{if(NET.mode==='online'&&!NET.busy&&!document.hidden){try{applyState(await api('game_state'));}catch(e){}}},120000);
// ครั้งแรกที่เข้าเกม: ให้ตั้งชื่อตัวเอง
function openWelcome(){
  const d=el('div'); d.append(para('ยินดีต้อนรับสู่ป่าอัมพร! นี่คือฟาร์มของคุณเอง ตั้งชื่อนักฝึกมอนสเตอร์ก่อนเริ่มเล่น'));
  const f=el('div','nameRow'); const inp=el('input'); inp.value=(NET.user&&!NET.user.is_anonymous&&NET.user.user_metadata&&(NET.user.user_metadata.full_name||'').slice(0,24))||''; inp.placeholder=S.name; inp.maxLength=24; inp.setAttribute('aria-label','ชื่อผู้เล่น'); f.append(inp); d.append(f);
  openSheet('ตั้งชื่อนักฝึก','รหัสผู้เล่น '+(S.uid||'-'),d,[['เริ่มเล่น',async()=>{const n=inp.value.trim()||S.name;if(await act('set_name',{new_name:n})){closeSheet();toast('สวัสดี '+S.name+'! มังกรอามาเทรุรออยู่ในฟาร์มแล้ว');}}]]);
  setTimeout(()=>inp.focus(),50);
}
/* ---------- หน้าเข้าสู่ระบบ (ขึ้นทุกครั้งก่อนเข้าเกม) ---------- */
let modelsReady=false, entered=false;
function lgBtn(label,cls,fn){const b=el('button','lgBtn '+(cls||''),label);b.onclick=async()=>{if(b.disabled)return;document.querySelectorAll('.lgBtn').forEach(x=>x.disabled=true);try{await fn();}catch(e){lgNote('ไม่สำเร็จ: '+((e&&e.message)||'ลองใหม่อีกครั้ง'));}finally{document.querySelectorAll('.lgBtn').forEach(x=>x.disabled=false);}};return b;}
function lgNote(t,warn){const n=$('#lgNote');n.textContent=t||'';n.classList.toggle('warn',!!warn);}
function lgShow(state,extra){
  const B=$('#lgBody'); B.innerHTML='';
  if(state==='checking'){B.append(el('div','lgWait','กำลังตรวจสอบบัญชี…'));return;}
  if(state==='go'){B.append(el('div','lgWait',extra||'กำลังไปหน้า Google…'));return;}
  if(state==='offline'){
    B.append(el('p','lgMsg',navigator.onLine===false?'ไม่มีอินเทอร์เน็ต ตรวจสอบการเชื่อมต่อแล้วลองใหม่':'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ชั่วคราว ลองใหม่อีกครั้ง'));
    B.append(lgBtn('ลองใหม่','main',()=>lgStart()));
    B.append(lgBtn('เล่นแบบออฟไลน์ (เซฟในเครื่องนี้)','ghost',async()=>{enterOffline();enterGame();}));
    return;}
  const u=NET.user;
  if(u){
    const card=el('div','lgUser'); const av=el('div','lgAv',(userLabel(u)||'?').slice(0,1)); card.append(av);
    const t=el('div'); t.append(el('b',null,userLabel(u))); if(userSub(u))t.append(el('span',null,userSub(u))); card.append(t); B.append(card);
    B.append(lgBtn('เข้าเกม','main',async()=>{await enterOnline();enterGame();}));
    if(u.is_anonymous){B.append(lgBtn('ผูกกับ Google เพื่อเล่นได้ทุกเครื่อง','google',async()=>{lgShow('go');await signInGoogle();}));}
    B.append(lgBtn('เปลี่ยนบัญชี','link',async()=>{
      if(u.is_anonymous)lgNote('ถ้าออกจากบัญชีผู้เยี่ยมชมโดยยังไม่ผูก Google เซฟนี้จะหายไป','warn');
      await signOutAll(); lgShow('out');}));
    return;}
  B.append(lgBtn('เข้าสู่ระบบด้วย Google','google',async()=>{lgShow('go');await signInGoogle();}));
  B.append(el('p','lgOr','หรือ'));
  B.append(lgBtn('เล่นแบบผู้เยี่ยมชม','ghost',async()=>{await signInGuest();await enterOnline();enterGame();}));
  B.append(el('p','lgSmall','ผู้เยี่ยมชมเล่นได้เฉพาะเครื่องนี้ ผูก Google ทีหลังได้โดยเซฟไม่หาย'));
}
async function lgStart(){
  lgShow('checking');
  // ผลตอบกลับจากหน้า Google
  const q=new URLSearchParams(location.search+'&'+location.hash.slice(1));
  const errCode=q.get('error_code')||'', errDesc=q.get('error_description')||'';
  // ให้ Supabase อ่าน token ที่ Google ส่งกลับมาใน URL ก่อน แล้วค่อยล้าง URL
  let ok=true; try{await authInit();}catch(e){console.warn(e);ok=false;}
  if(location.hash.includes('access_token')||q.get('code')||errCode)history.replaceState(null,'',redirectTo());
  if(!ok){lgShow('offline');return;}
  if(errCode==='identity_already_exists'||/already/i.test(errDesc)){
    lgShow('out');
    lgNote('บัญชี Google นี้มีเซฟอยู่แล้ว กดปุ่มด้านล่างเพื่อสลับไปใช้บัญชีนั้น (เซฟผู้เยี่ยมชมในเครื่องนี้จะไม่ย้ายไปด้วย)','warn');
    $('#lgBody').prepend(lgBtn('สลับไปบัญชี Google นั้น','google',async()=>{lgShow('go');await switchToGoogle();}));
    return;}
  if(errCode||errDesc)lgNote('เข้าสู่ระบบไม่สำเร็จ: '+(errDesc||errCode).replace(/\+/g,' '),'warn');
  else if(NET.sessionLost)lgNote('การเข้าสู่ระบบครั้งก่อนหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง','warn');
  lgShow(NET.user?'in':'out');
}
function enterGame(){
  if(entered)return; entered=true;
  document.body.classList.remove('preLogin'); $('#login').classList.add('bye'); setTimeout(()=>$('#login').hidden=true,450);
  renderHUD(); distTo=40;
  if(modelsReady){syncAgents(); if(!S.named&&NET.mode==='online')openWelcome();}
  else {$('#loadMsg').hidden=false;}
  if(NET.mode!=='online')toast('เล่นแบบออฟไลน์ ความคืบหน้าเก็บในเครื่องนี้');
}
function startFarm(){renderHUD(); layout(); loop(); distTo=48;
  lgStart();
  Promise.all([loadMeshy(p=>{$('#loadMsg').textContent='กำลังโหลดมอนสเตอร์ '+Math.round(p*100)+'%';}),loadDragon()]).then(()=>{
    modelsReady=true; for(const k in THUMB)delete THUMB[k];
    if(entered){$('#loadMsg').hidden=true; syncAgents(); if(!S.named&&NET.mode==='online')openWelcome();}
  });
}
