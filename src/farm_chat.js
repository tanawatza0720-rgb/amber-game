/* ================= แชทโลก + แชทเผ่า + กล่องข้อเสนอแนะ (server/migrate_chat.sql) =================
   แชท: กล่องลอยโปร่งใสมุมซ้ายล่างเหนือปุ่มผจญภัย (#chatBox สร้างด้วยโค้ด) พับ/กางได้ จำสถานะใน localStorage
        ไม่ใช้ช่องสัญญาณเรียลไทม์ — หน้าเกมเรียก chat_poll(w,r) เป็นระยะ (กางอยู่ทุก 4 วิ · พับอยู่ทุก 30 วิ)
        ส่งด้วย chat_send('world'|'race', ข้อความ) · เซิร์ฟเวอร์จำกัดความยาว/ความถี่/ปิดปาก · ข้อความแสดงด้วย textContent เท่านั้น (กันโค้ดแฝง)
   ข้อเสนอแนะ: suggest_list(sort) / suggest_post(body) / suggest_vote(p_id, vote) / suggest_delete(p_id)
        เขียนและโหวตได้เฉพาะบัญชีที่ผูกแล้ว (เซิร์ฟเวอร์ตรวจ) · ทุกคนอ่านได้ */
var CH={w:[],r:[],lw:0,lr:0,tab:'world',seen:{w:0,r:0},race:null,mute:null,len:200,last:0,busy:false,ready:false,open:true};
try{const s=JSON.parse(localStorage.getItem('amber_chat_seen')||'{}');CH.seen={w:+s.w||0,r:+s.r||0};CH.open=localStorage.getItem('amber_chat_open')!=='0';if(localStorage.getItem('amber_chat_tab')==='race')CH.tab='race';}catch(e){}
const chKey=()=>CH.tab==='world'?'w':'r';
// กล่องแชทลอยโปร่งใสมุมซ้ายล่าง (เหนือปุ่มผจญภัย) · ลูกศรพับ/กาง · พับแล้วเหลือบรรทัดเดียวแสดงข้อความล่าสุด
function chatBoxEl(){let b=$('#chatBox');if(b)return b;
  b=document.createElement('section');b.id='chatBox';b.hidden=true;
  b.innerHTML='<div class="cbHead"><button class="cbTab" id="chTabW" type="button">🌏 โลก</button><button class="cbTab" id="chTabR" type="button">เผ่า</button><span class="cbPrev" id="cbPrev"></span><button class="cbFold" id="cbFold" type="button" aria-label="พับหรือกางแชท"></button></div><div class="cbList" id="chList"></div><div class="cbIn"><input id="chIn" type="text" autocomplete="off" enterkeyhint="send"><button id="chGo" type="button">ส่ง</button></div>';
  document.body.append(b);
  $('#chTabW').onclick=()=>chPick('world');$('#chTabR').onclick=()=>chPick('race');
  $('#cbFold').onclick=()=>chFold(!CH.open);$('#cbPrev').onclick=()=>chFold(true);
  $('#chGo').onclick=chatSend;$('#chIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();chatSend();}e.stopPropagation();});
  const box=$('#chList');box.onscroll=()=>{if(box.scrollHeight-box.scrollTop-box.clientHeight<50)chMarkSeen();};
  return b;}
const chOpen=()=>{const b=$('#chatBox');return !!b&&!b.hidden&&CH.open&&b.offsetParent!==null;};
const chUnread=k=>CH[k].some(m=>!m.me&&m.id>CH.seen[k]);
const chTime=t=>{const d=new Date(t),p=n=>(n<10?'0':'')+n,now=new Date();return (d.toDateString()===now.toDateString()?'':d.getDate()+'/'+(d.getMonth()+1)+' ')+p(d.getHours())+':'+p(d.getMinutes());};
function chSaveSeen(){try{localStorage.setItem('amber_chat_seen',JSON.stringify(CH.seen));}catch(e){}}
function chBadge(){const b=$('#chatBox');if(!b)return;
  $('#chTabW').classList.toggle('dot',CH.tab!=='world'&&chUnread('w'));$('#chTabR').classList.toggle('dot',CH.tab!=='race'&&chUnread('r'));
  $('#cbFold').classList.toggle('dot',!CH.open&&(chUnread('w')||chUnread('r')));
  // พับอยู่: แสดงข้อความล่าสุดของห้องที่เลือก 1 บรรทัด
  const L=CH[chKey()],m=L[L.length-1],pv=$('#cbPrev');pv.textContent='';
  if(m){const R=RACES[m.race],n=el('b',null,(R?R.icon+' ':'')+(m.name||'ผู้เล่น')+': ');if(R)n.style.color=R.c;pv.append(n);pv.append(document.createTextNode(m.body));}else pv.textContent='💬 แชท';}
function chRow(m){const d=el('div','cbMsg'+(m.me?' me':'')),R=RACES[m.race];d.append(el('i',null,chTime(m.at)));
  const n=el('b',null,(R?R.icon+' ':'')+(m.name||'ผู้เล่น')+': ');if(R)n.style.color=R.c;d.append(n);d.append(document.createTextNode(m.body));return d;}
function chMarkSeen(){const k=chKey(),L=CH[k];if(L.length&&CH.open){CH.seen[k]=Math.max(CH.seen[k],L[L.length-1].id);chSaveSeen();}chBadge();}
function chFill(){const box=$('#chList');if(!box)return;box.innerHTML='';const L=CH[chKey()];
  if(!L.length)box.append(el('div','chEmpty',CH.tab==='world'?'ยังไม่มีใครพิมพ์ในแชทโลก เริ่มทักทายได้เลย':'ยังไม่มีใครพิมพ์ในแชทเผ่า เริ่มคุยกับเพื่อนร่วมเผ่าได้เลย'));
  L.forEach(m=>box.append(chRow(m)));box.scrollTop=box.scrollHeight;chMarkSeen();}
function chPick(t){CH.tab=t;try{localStorage.setItem('amber_chat_tab',t);}catch(e){}chSync();chFill();}
function chFold(open){CH.open=!!open;try{localStorage.setItem('amber_chat_open',open?'1':'0');}catch(e){}chSync();if(open){chFill();CH.last=0;}else{const i=$('#chIn');if(i)i.blur();chBadge();}}
// ปรับหน้าตากล่องตามสถานะ (แท็บที่เลือก · พับ/กาง · ถูกระงับ)
function chSync(){const b=chatBoxEl(),R=RACES[CH.race||S.race];
  b.classList.toggle('shut',!CH.open);$('#cbFold').textContent=CH.open?'▾':'▴';
  $('#chTabW').classList.toggle('on',CH.tab==='world');const tr=$('#chTabR');tr.classList.toggle('on',CH.tab==='race');tr.textContent=(R?R.icon+' ':'')+'เผ่า';
  const inp=$('#chIn'),go=$('#chGo'),mu=CH.mute&&new Date(CH.mute)>new Date();inp.maxLength=CH.len;
  inp.disabled=go.disabled=!!mu;inp.placeholder=mu?'ถูกระงับการพิมพ์ถึง '+chTime(CH.mute):(CH.tab==='world'?'พิมพ์ถึงทุกคน…':'พิมพ์ถึงเพื่อนร่วมเผ่า…');chBadge();}
async function chatPoll(){
  if(NET.mode!=='online'||CH.busy)return;CH.busy=true;
  try{const r=await api('chat_poll',{w:CH.lw,r:CH.lr});CH.last=Date.now();CH.race=r.race_key;CH.mute=r.muted_until;if(r.len)CH.len=r.len;
    const add=(k,list)=>{if(!list||!list.length)return [];const have=new Set(CH[k].map(m=>m.id)),nw=list.filter(m=>!have.has(m.id));CH[k]=CH[k].concat(nw).slice(-150);if(CH[k].length)CH['l'+k]=CH[k][CH[k].length-1].id;return nw;};
    const nw={w:add('w',r.world),r:add('r',r.race)},b=chatBoxEl(),first=!CH.ready;CH.ready=true;
    b.hidden=false;if($('#rSuggest'))$('#rSuggest').hidden=false;chSync();
    if(first)chFill();
    else if(CH.open){const box=$('#chList'),k=chKey(),near=box.scrollHeight-box.scrollTop-box.clientHeight<50;
      if(nw[k].length){const emp=box.querySelector('.chEmpty');if(emp)emp.remove();nw[k].forEach(m=>box.append(chRow(m)));while(box.children.length>150)box.firstChild.remove();if(near||nw[k].some(m=>m.me))box.scrollTop=box.scrollHeight;}
      if(near)chMarkSeen();}
    chBadge();
  }catch(e){CH.last=Date.now();if(e.code!=='not_ready')console.warn('chat',e);}finally{CH.busy=false;}
}
async function chatSend(){const inp=$('#chIn'),go=$('#chGo');if(!inp||go.disabled)return;const t=inp.value.trim();if(!t)return;
  go.disabled=true;try{await api('chat_send',{ch:CH.tab==='world'?'world':'race',body:t});inp.value='';CH.busy=false;await chatPoll();}
  catch(e){toast(ERR[e.code]||ERR.network);}finally{go.disabled=false;chSync();}}
// ดึงข้อความ: กางอยู่ทุก 4 วิ · พับ/ถูกบังอยู่ทุก 30 วิ · แท็บเบราว์เซอร์ซ่อน = ไม่ดึง
setInterval(()=>{if(NET.mode!=='online'||typeof entered==='undefined'||!entered||document.visibilityState==='hidden')return;
  if(Date.now()-CH.last>=(chOpen()?4000:30000))chatPoll();},2000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&chOpen())CH.last=0;});

/* ---------- กล่องข้อเสนอแนะ ---------- */
var SG={st:null,sort:'top',draft:'',delAt:0,delId:0};
const sgDate=t=>{const d=new Date(t);return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();};
async function loadSuggest(){try{SG.st=await api('suggest_list',{sort:SG.sort});return true;}catch(e){toast(ERR[e.code]||ERR.network);return false;}}
async function openSuggest(){
  if(NET.mode!=='online'){toast('ข้อเสนอแนะต้องเข้าสู่ระบบก่อน');return;}
  openSheet('ข้อเสนอแนะ','กำลังโหลด…',para('กำลังโหลด…'),[]);
  if(!await loadSuggest()){if($('#shTitle').textContent==='ข้อเสนอแนะ')openSheet('ข้อเสนอแนะ','',para('โหลดข้อเสนอแนะไม่ได้ ลองใหม่อีกครั้ง'),[]);return;}
  if($('#shTitle').textContent==='ข้อเสนอแนะ')renderSuggest();
}
function renderSuggest(){
  const st=SG.st,d=el('div','sg'),keepY=$('#shBody')?$('#shBody').scrollTop:0;
  d.append(para('บอกทีมงานได้เลยว่าอยากให้เกมมีอะไรเพิ่มหรือปรับตรงไหน · กด 👍 ถ้าเห็นด้วยกับข้อเสนอของคนอื่น ทีมงานจะได้รู้ว่ามีคนคิดเหมือนกันกี่คน'));
  if(st.linked){
    const ta=el('textarea','sgIn');ta.maxLength=st.max;ta.rows=3;ta.placeholder='พิมพ์ข้อเสนอแนะ ('+st.min+'–'+st.max+' ตัวอักษร)';ta.value=SG.draft;d.append(ta);
    const row=el('div','sgRow'),cnt=el('small',null,SG.draft.length+'/'+st.max),go=el('button','sbtn gold',st.left_today>0?'ส่งข้อเสนอแนะ (เหลือ '+st.left_today+' วันนี้)':'วันนี้ส่งครบแล้ว');
    go.disabled=st.left_today<=0||SG.draft.trim().length<st.min;
    ta.oninput=()=>{SG.draft=ta.value;cnt.textContent=ta.value.length+'/'+st.max;go.disabled=st.left_today<=0||ta.value.trim().length<st.min;};
    go.onclick=async()=>{go.disabled=true;try{SG.st=await api('suggest_post',{body:ta.value});SG.sort='new';SG.draft='';toast('ส่งข้อเสนอแนะแล้ว ขอบคุณครับ 🙏');}catch(e){toast(ERR[e.code]||ERR.network);}renderSuggest();};
    row.append(cnt,go);d.append(row);
  }else{
    const nb=el('div','sgLock');nb.append(el('span',null,'🔒 เขียนข้อเสนอแนะและกดโหวตได้เฉพาะบัญชีที่ผูกแล้ว (ผู้เยี่ยมชมอ่านได้อย่างเดียว)'));
    if(NET.user&&NET.user.is_anonymous&&typeof linkGoogle==='function'){const b=el('button','sbtn gold','ผูกบัญชี Google');b.onclick=()=>linkGoogle();nb.append(b);}d.append(nb);
  }
  const tabs=el('div','chTabs');[['top','🔥 ยอดนิยม'],['new','🕒 ล่าสุด']].forEach(([k,t])=>{const b=el('button','chTab'+(SG.sort===k?' on':''),t);b.onclick=async()=>{if(SG.sort===k)return;SG.sort=k;if(await loadSuggest())renderSuggest();};tabs.append(b);});d.append(tabs);
  if(!st.list.length)d.append(el('div','chEmpty','ยังไม่มีข้อเสนอแนะ มาเป็นคนแรกกันเลย'));
  st.list.forEach(x=>{const it=el('div','sgItem'+(x.mine?' mine':'')),R=RACES[x.race];
    it.append(el('div','sgBody',x.body));
    if(x.reply){const rp=el('div','sgReply');rp.append(el('b',null,'ทีมงาน: '));rp.append(document.createTextNode(x.reply));it.append(rp);}
    const ft=el('div','sgFoot'),who=el('span','sgWho',(R?R.icon+' ':'')+(x.name||'ผู้เล่น')+' · '+sgDate(x.at)+(x.mine?' · ของคุณ':''));ft.append(who);
    const vote=async v=>{if(!st.linked){toast(ERR.need_link);return;}if(x.mine){toast(ERR.suggest_own);return;}
      try{const r=await api('suggest_vote',{p_id:x.id,vote:x.my===v?0:v});x.my=r.my;x.up=r.up;x.down=r.down;}catch(e){toast(ERR[e.code]||ERR.network);}renderSuggest();};
    const up=el('button','sgV up'+(x.my===1?' on':''),'👍 '+fmt(x.up)),dn=el('button','sgV dn'+(x.my===-1?' on':''),'👎 '+fmt(x.down));up.onclick=()=>vote(1);dn.onclick=()=>vote(-1);ft.append(up,dn);
    if(x.mine){const arm=SG.delId===x.id&&Date.now()-SG.delAt<4000,del=el('button','sgV del',arm?'แตะอีกครั้งเพื่อลบ':'ลบ');
      del.onclick=async()=>{if(!(SG.delId===x.id&&Date.now()-SG.delAt<4000)){SG.delId=x.id;SG.delAt=Date.now();renderSuggest();return;}
        try{await api('suggest_delete',{p_id:x.id});st.list=st.list.filter(y=>y.id!==x.id);toast('ลบข้อเสนอแนะแล้ว');}catch(e){toast(ERR[e.code]||ERR.network);}renderSuggest();};ft.append(del);}
    it.append(ft);d.append(it);});
  openSheet('ข้อเสนอแนะ',st.list.length?'ทั้งหมด '+st.list.length+' เรื่อง':'',d,[]);if($('#shBody'))$('#shBody').scrollTop=keepY;
}
$('#rSuggest').onclick=()=>openSuggest();
// ดีบัก: index.html?dbg=1 → __F.chat({world:[…],race:[…]}) / __F.suggest(ข้อมูลแบบ suggest_list) เปิดหน้าต่างด้วยข้อมูลจำลอง (ไม่เรียกเซิร์ฟเวอร์)
if(window.__F)Object.assign(window.__F,{chat:(d,tab,open)=>{CH.w=d.world||[];CH.r=d.race||[];CH.race=d.race_key||S.race;CH.tab=tab||'world';CH.open=open!==false;CH.ready=true;CH.busy=true;chatBoxEl().hidden=false;$('#rSuggest').hidden=false;chSync();chFill();return CH.w.length;},
  suggest:d=>{SG.st=d;renderSuggest();return d.list.length;}});
