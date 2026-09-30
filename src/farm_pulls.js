/* ================= ประกาศวิ่ง: มีคนเปิดได้ระดับตำนานขึ้นไป (server/migrate_pulls.sql) =================
   pulls_recent() ทุก 40 วิ → แถบ #pullBar วิ่งขวา→ซ้าย ทีละประกาศ · แตะประกาศของคนอื่น → pull_raid(pid) → เข้าเกาะเพื่อบุกปล้น
   pullFx(rar, ข้อความ) = แฟลชจอ + ป้ายระดับเด้งกลางจอ ตอนเราเปิดได้ตำนาน/เทพเจ้า (เรียกจาก hatch/hatchMulti) */
const PULL={seen:new Set(),q:[],cur:null,busy:false,first:true,last:0};
const PULL_SPEED=75; // พิกเซลต่อวินาที
function pullText(x){const S_=SPEC[x.sp],T=tierOf(x.rar),E=ELEM[x.el];
  return {who:x.me?'คุณ':x.name,what:(x.rar>=4?'🌟':'⭐')+T.n+' '+(E?E.i:'')+(S_?S_.name:x.sp),col:T.c};}
function pullBarEl(){let b=$('#pullBar');if(b)return b;
  b=document.createElement('button');b.id='pullBar';b.type='button';b.hidden=true;b.setAttribute('aria-label','ประกาศ: มีคนเปิดได้ระดับตำนาน');
  b.append(el('span','pbTag','ประกาศ'));const w=el('span','pbWin');w.append(el('span','pbTxt'));b.append(w);
  b.onclick=()=>{if(PULL.cur)pullGo(PULL.cur);};document.body.append(b);return b;}
async function pullsLoad(){
  if(NET.mode!=='online'||typeof entered==='undefined'||!entered||document.visibilityState!=='visible')return;
  const now=Date.now();if(now-PULL.last<20000)return;PULL.last=now;
  let r=null;try{r=await api('pulls_recent');}catch(e){return;}
  const L=((r&&r.list)||[]).filter(x=>!PULL.seen.has(x.id));L.forEach(x=>PULL.seen.add(x.id));
  // เข้าเกมครั้งแรก: แสดงแค่ 3 รายการล่าสุด ไม่ให้วิ่งยาวเกินไป
  const add=(PULL.first?L.slice(0,3):L).reverse();PULL.first=false;
  PULL.q.push(...add);pullNext();
}
function pullNext(){
  if(PULL.busy)return;const x=PULL.q.shift();const b=pullBarEl();
  if(!x){b.hidden=true;PULL.cur=null;return;}
  PULL.busy=true;PULL.cur=x;const t=pullText(x),tx=b.querySelector('.pbTxt');tx.innerHTML='';
  tx.append('🎉 ');tx.append(el('b',null,t.who));tx.append(' เปิดได้ ');const w=el('b','pbWhat',t.what+'!');w.style.color=t.col;tx.append(w);
  tx.append(x.me?' ยินดีด้วย! ✨':' ไปปล้นกันเลยไหม? 👊');
  b.classList.toggle('me',!!x.me);b.classList.toggle('god',x.rar>=4);b.hidden=false;
  requestAnimationFrame(()=>{const W=b.querySelector('.pbWin').clientWidth,w2=tx.scrollWidth;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    // แถบถูกซ่อนอยู่ (เปิดหน้าต่างอื่น/เยี่ยมบ้าน) → เก็บประกาศไว้ ลองใหม่ภายหลัง
    if(!W){PULL.q.unshift(x);PULL.busy=false;PULL.cur=null;b.hidden=true;setTimeout(pullNext,4000);return;}
    const done=()=>{PULL.busy=false;pullNext();};
    if(reduce||!tx.animate){tx.style.transform='none';setTimeout(done,6000);return;}
    const a=tx.animate([{transform:'translateX('+W+'px)'},{transform:'translateX('+(-w2)+'px)'}],{duration:(W+w2)/PULL_SPEED*1000,easing:'linear',iterations:2});
    a.onfinish=done;});
}
async function pullGo(x){
  if(x.me){toast('นี่คือประกาศของคุณเอง ✨');return;}
  if(NET.mode!=='online'){toast('ต้องเข้าสู่ระบบก่อน');return;}
  if(VISIT.on){toast('กลับบ้านก่อนแล้วค่อยไปบุกนะ');return;}
  if(FRD.busy||hatching)return;FRD.busy=true;toast('⚔️ กำลังไปบ้าน '+x.name+'…');let r=null;
  try{r=await api('pull_raid',{pid:x.id});}catch(e){toast(ERR[e.code]||ERR.network);}
  FRD.busy=false;if(!r)return;
  await visitFriend(r.friend.code,true,{payload:r,back:false});
}
setInterval(pullsLoad,40000);
{let started=false;setInterval(()=>{if(started||typeof entered==='undefined'||!entered||NET.mode!=='online')return;started=true;setTimeout(pullsLoad,2500);},1500);}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullsLoad();});

/* ---------- เอฟเฟกต์ตอนเราเปิดได้ตำนาน/เทพเจ้า (DOM ล้วน ไม่แตะฉาก 3D) ---------- */
function pullFx(rar,title,sub){
  if(rar<3)return;const T=tierOf(rar);
  const o=document.createElement('div');o.id='pullFx';o.className=rar>=4?'god':'leg';o.style.setProperty('--tc',T.c);
  o.append(el('div','pfFlash'));o.append(el('div','pfRays'));
  const c=el('div','pfCard');c.append(el('div','pfTier',(rar>=4?'🌟 ':'⭐ ')+T.n));c.append(el('div','pfName',title));if(sub)c.append(el('div','pfSub',sub));o.append(c);
  o.onclick=()=>o.remove();document.body.append(o);
  if(navigator.vibrate)try{navigator.vibrate(rar>=4?[60,40,120]:[50]);}catch(e){}
  setTimeout(()=>o.remove(),rar>=4?3200:2400);
}
if(/[?&]dbg=1/.test(location.search))window.__pull={PULL,pullsLoad,pullNext,pullFx,pullGo};
