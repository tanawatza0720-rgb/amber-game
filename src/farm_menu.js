/* ================= ปุ่มเมนูรวม (มือถือ แนวตั้ง/แนวนอน) =================
   จอเล็ก (กว้าง ≤760 หรือสูง ≤520): ปุ่มรางด้านซ้าย (#rail) ถูกพับไว้ใต้ปุ่ม ☰ "เมนู" (#menuBtn) กดแล้วกางออกทีละปุ่ม
   แตะปุ่มในเมนู / แตะที่ว่าง / กด Esc = พับเก็บ · มีจุดแดงบนปุ่มเมนูเมื่อปุ่มข้างในมี badge/จุดแดง
   ระหว่างคู่มือผู้เล่นใหม่ (body.guideOn) รางกางค้างไว้เพื่อให้ไฮไลต์ปุ่มได้ · จอใหญ่ใช้รางแบบเดิม (ปุ่มเมนูซ่อน) */
const MENU={open:false};
(function(){
  const rail=$('#rail');if(!rail)return;
  const b=document.createElement('button');b.id='menuBtn';b.type='button';b.className='rbtn';
  b.setAttribute('aria-controls','rail');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','เปิดเมนู');
  b.innerHTML='<span class="mbIc" aria-hidden="true"><i></i><i></i><i></i></span><span class="mbTx">เมนู</span><span class="mbDot" hidden></span>';
  document.body.append(b);
  const set=o=>{MENU.open=!!o;document.body.classList.toggle('menuOpen',MENU.open);b.setAttribute('aria-expanded',String(MENU.open));
    b.setAttribute('aria-label',MENU.open?'ปิดเมนู':'เปิดเมนู');b.querySelector('.mbTx').textContent=MENU.open?'ปิด':'เมนู';};
  b.addEventListener('click',e=>{e.stopPropagation();set(!MENU.open);});
  rail.addEventListener('click',e=>{if(MENU.open&&e.target.closest('.rbtn'))setTimeout(()=>set(false),80);});
  document.addEventListener('pointerdown',e=>{if(MENU.open&&!e.target.closest('#rail,#menuBtn'))set(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&MENU.open){set(false);b.focus();}});
  // ลำดับการกางออก (หน่วงทีละปุ่ม)
  const order=()=>{let i=0;rail.querySelectorAll('.rbtn').forEach(x=>{if(!x.hidden)x.style.setProperty('--i',i++);});};
  // จุดแดงรวมบนปุ่มเมนู
  const dot=b.querySelector('.mbDot');
  setInterval(()=>{order();const on=[...rail.querySelectorAll('.rbtn')].some(x=>!x.hidden&&(x.classList.contains('reddot')||[...x.querySelectorAll('.badge')].some(y=>!y.hidden&&y.textContent.trim()&&y.textContent.trim()!=='0')));dot.hidden=!on;},700);
  order();window.menuSet=set;
})();
