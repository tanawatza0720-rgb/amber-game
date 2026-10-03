/* ================= ส่งสำรวจ (Expedition) =================
   ส่งมอนสเตอร์ที่ไม่อยู่ในทีมออกไปสำรวจได้ครั้งละ 6 ตัว · บางตัวอาจไม่กลับมา (หายถาวร ได้วิญญาณชดเชย)
   ผลสุ่มที่เซิร์ฟเวอร์ (server/migrate_expedition.sql) · หน้านี้คำนวณโอกาสให้ดูด้วยสูตรเดียวกัน */
var EXP={st:null,at:0,zone:null,sel:[],confirm:false,view:'list',busy:false};
const EXP_ICON={meadow:'🌾',crystal:'💎',ashen:'🌋',skyruin:'🏛️'};
const expRisk=(z,party,one,avg)=>Math.min(.6,Math.max(.01,z.risk*Math.pow(z.rec/Math.max(party,1),1.3)*Math.pow(avg/Math.max(one,1),.3)));
// กติกา v2 (server/migrate_expedition2.sql): โอกาสสำเร็จของทั้งทีม + โอกาสตายรายตัวไล่ตามระดับ · ค่ากติกามาจากเซิร์ฟเวอร์ (EXP.st.rule)
const expRule=()=>EXP.st&&EXP.st.rule&&EXP.st.rule.v>=2?EXP.st.rule:null;
const clampN=(v,a,b)=>Math.min(b,Math.max(a,v));
const expWin=(z,party)=>{const r=expRule();return r?clampN(r.win_k*Math.pow(Math.max(party,1)/z.rec,r.win_pow),r.win_min,r.win_max):1;};
const expDie=(z,party,one,avg,rar,failed)=>{const r=expRule();if(!r)return expRisk(z,party,one,avg);const t=clampN(rar||1,1,4);
  return clampN(z.die*r.tier[t]*clampN(z.rec/Math.max(party,1),r.team_min,r.team_max)*clampN(Math.pow(avg/Math.max(one,1),r.self_pow),r.self_min,r.self_max)*(failed?r.fail_k:1),r.floor[t],r.cap[t]);};
// ของลุ้นของพื้นที่ (เมื่อสำรวจสำเร็จ) + รางวัลปลอบใจตอนล้มเหลว
const pct=v=>(v*100>=1&&v*100%1===0?Math.round(v*100):+(v*100).toFixed(1))+'%';
const expDrops=z=>[z.gold_p>0?'🥚 ไข่ทองคำ '+pct(z.gold_p):'',z.god_p>0?'🌟 ไข่เทพ '+pct(z.god_p):''].filter(Boolean);
function expRewardBox(z){const r=expRule(),b=el('div','exRwBox');
  b.append(el('b',null,'รางวัลเมื่อสำเร็จ (ส่งครบ 6 ตัว กลับมาครบ)'));
  b.append(el('span',null,'🪙 เหรียญ '+fmt(z.coins)+' · 🔶 อัมพร '+z.amber+' · ⬆️ ตัวที่รอด เลเวล +'+z.lv));
  const dr=expDrops(z); b.append(el('span',dr.length?'exDrop':null,dr.length?'ของลุ้น: '+dr.join(' · '):'ของลุ้น: ไม่มีในพื้นที่นี้'));
  if(r&&r.fail_coins)b.append(el('small',null,'ล้มเหลว: ได้เหรียญ '+pct(r.fail_coins)+' ไม่ได้อัมพร เลเวล และของลุ้น · ส่งน้อยกว่า 6 ตัวหรือมีตัวไม่กลับมา เหรียญ/อัมพรลดลง'));
  return b;}
// โอกาสไม่กลับมาโดยรวมของ 1 ตัว (รวมกรณีสำเร็จและล้มเหลว)
const expLoss=(z,P,m,avg)=>{const w=expWin(z,P),o=expPow(m),t=spOf(m).rar;return w*expDie(z,P,o,avg,t,false)+(1-w)*expDie(z,P,o,avg,t,true);};
const expPow=m=>{const s=EXP.st;return s&&s.mpow&&s.mpow[m.uid]!=null?s.mpow[m.uid]:power(m);};
const fmtDur=sec=>{sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?h+' ชม. '+m+' นาที':m?m+' นาที '+s+' วิ':s+' วินาที';};
async function loadExp(force){
  if(NET.mode!=='online'){$('#rExp').hidden=true;return;}
  $('#rExp').hidden=false;
  if(EXP.busy||(!force&&Date.now()-EXP.at<30000))return; EXP.busy=true;
  try{EXP.st=await api('exp_state');EXP.at=Date.now();expHud();}catch(e){console.warn('exp',e);}finally{EXP.busy=false;}
}
function expLeft(){const a=EXP.st&&EXP.st.active;if(!a)return null;return Math.max(0,a.left-(Date.now()-EXP.at)/1000);}
function expHud(){const a=EXP.st&&EXP.st.active,b=$('#bExp');
  if(!a){b.hidden=true;$('#rExpBar').style.width='0%';return;}
  const left=expLeft(),tot=(new Date(a.ends_at)-new Date(a.started_at))/1000;
  $('#rExpBar').style.width=(100*(1-left/Math.max(1,tot)))+'%';
  b.hidden=left>0; b.textContent='✓';}
setInterval(()=>{if(!EXP.st||!EXP.st.active)return;expHud();if(!$('#sheet').hidden&&EXP.view==='active'&&$('#shTitle').textContent==='ส่งสำรวจ')expActiveTick();},1000);
function openExp(){
  if(NET.mode!=='online'){toast('ส่งสำรวจต้องเข้าสู่ระบบก่อน');return;}
  if(!EXP.st){loadExp(true).then(()=>EXP.st&&openExp());return;}
  if(EXP.st.active){EXP.view='active';return renderExpActive();}
  if(EXP.zone){EXP.view='pick';return renderExpPick();}
  EXP.view='list';renderExpList();
}
function soulRow(){const s=EXP.st,r=el('div','exSoul');
  r.append(el('span',null,'👻 วิญญาณ '+fmt(s.souls||0)));
  const b=el('button','sbtn','แลก 10 → 25 อัมพร');b.disabled=(s.souls||0)<10;
  b.onclick=async()=>{const x=await act('soul_exchange',{sets:1});if(x){EXP.st=x.exp;EXP.at=Date.now();toast('ได้รับ 25 อัมพร');openExp();}};
  r.append(b);return r;}
function renderExpList(){
  const s=EXP.st,d=el('div','exp');
  d.append(para(expRule()?'ส่งมอนสเตอร์ที่ไม่อยู่ในทีม (สูงสุด 6 ตัว) ออกไปสำรวจ · โอกาสสำเร็จขึ้นกับพลังทีมเทียบกับพลังแนะนำของพื้นที่ · สำเร็จได้เหรียญ อัมพร เลเวล และมีสิทธิ์ลุ้นไข่ในพื้นที่ยาก · ล้มเหลวได้แค่เหรียญเล็กน้อยและเสี่ยงไม่กลับมามากขึ้น · ตัวระดับต่ำเสี่ยงสูงกว่าตัวระดับสูงมาก':'ส่งมอนสเตอร์ที่ไม่อยู่ในทีม (สูงสุด 6 ตัว) ออกไปสำรวจ ได้เหรียญ อัมพร และเลเวลเมื่อกลับมา · ยิ่งพื้นที่ยาก ยิ่งเสี่ยงที่บางตัวจะไม่กลับมา'));
  s.zones.forEach(z=>{const c=el('button','exZone');
    c.append(el('span','exIc',EXP_ICON[z.id]||'🧭'));
    const t=el('div');t.append(el('b',null,z.name));t.append(el('small',null,'พลังแนะนำ '+fmt(z.rec)+' · '+fmtDur(z.min*60)));
    t.append(el('small','exRw','🪙 '+fmt(z.coins)+' · 🔶 '+z.amber+' · เลเวล +'+z.lv+(expRule()?'':' · เสี่ยงพื้นฐาน '+Math.round(z.risk*100)+'%')));
    {const dr=expDrops(z);if(dr.length)t.append(el('small','exRw exDrop','ของลุ้น: '+dr.join(' · ')));}
    if(expRule())t.append(el('small','exRw','เสี่ยงไม่กลับ (พลังพอดี): '+[1,2,3,4].map(k=>tierOf(k).n+' '+Math.round(expDie(z,z.rec,1,1,k,false)*100)+'%').join(' · ')));c.append(t);
    c.onclick=()=>{EXP.zone=z.id;EXP.sel=[];EXP.confirm=false;EXP.view='pick';renderExpPick();};d.append(c);});
  d.append(soulRow());
  openSheet('ส่งสำรวจ','เลือกพื้นที่',d,[]);
}
function expParty(){return EXP.sel.map(u=>S.mons.find(m=>m.uid===u)).filter(Boolean);}
function renderExpPick(){
  const s=EXP.st,z=s.zones.find(x=>x.id===EXP.zone); if(!z){EXP.zone=null;return renderExpList();}
  EXP.sel=EXP.sel.filter(u=>S.mons.some(m=>m.uid===u&&!S.team.includes(u)));
  const party=expParty(),P=party.reduce((a,m)=>a+expPow(m),0),avg=party.length?P/party.length:1;
  const d=el('div','exp');
  const hd=el('div','exHead');hd.append(el('span','exIc',EXP_ICON[z.id]||'🧭'));const t=el('div');t.append(el('b',null,z.name));t.append(el('small',null,'พลังแนะนำ '+fmt(z.rec)+' · '+fmtDur(z.min*60)));hd.append(t);d.append(hd);
  if(expRule())d.append(expRewardBox(z));
  // ทีมสำรวจ 6 ช่อง
  const slots=el('div','exSlots');
  for(let i=0;i<6;i++){const m=party[i];if(m){const c=icon(m);const r=expLoss(z,P,m,avg);c.append(el('span','exRisk'+(r>.3?' hi':r>.1?' mid':''),Math.round(r*100)+'%'));c.onclick=()=>{EXP.sel=EXP.sel.filter(u=>u!==m.uid);EXP.confirm=false;renderExpPick();};slots.append(c);}
    else slots.append(el('div','exEmpty','+'));}
  d.append(slots);
  const win=expWin(z,P), allIf=f=>party.reduce((a,m)=>a*(1-expDie(z,P,expPow(m),avg,spOf(m).rar,f)),1), all=win*allIf(false)+(1-win)*allIf(true);
  const pw=el('div','exPow');pw.append(el('span',null,'พลังทีมสำรวจ '));const pb=el('b',null,fmt(P));pb.style.color=P>=z.rec?'#8ff0c4':'#ffb36a';pw.append(pb);
  pw.append(el('span',null,party.length?' · โอกาสกลับครบ '+Math.round(all*100)+'%':''));d.append(pw);
  if(party.length&&expRule()){const w=el('div','exPow');w.append(el('span',null,'โอกาสสำรวจสำเร็จ '));const b=el('b',null,Math.round(win*100)+'%');b.style.color=win>=.7?'#8ff0c4':win>=.4?'#ffd34d':'#ff8a7a';w.append(b);w.append(el('span',null,EXP.st.rule.fail_coins?' · ล้มเหลว = ได้แค่เหรียญ '+pct(EXP.st.rule.fail_coins):' · ล้มเหลว = ไม่ได้รางวัล'));d.append(w);}
  if(party.length&&P<z.rec)d.append(el('p','exWarn',expRule()?'พลังต่ำกว่าที่แนะนำ โอกาสสำเร็จลดลงและเสี่ยงไม่กลับมามากขึ้น':'พลังต่ำกว่าที่แนะนำ ความเสี่ยงจะสูงขึ้นมาก'));
  // ตัวเลือก (ไม่อยู่ในทีม)
  const L=el('div','exList'),cands=[...S.mons].sort((a,b)=>expPow(b)-expPow(a));
  cands.forEach(m=>{const c=icon(m),inT=S.team.includes(m.uid),on=EXP.sel.includes(m.uid);if(on)c.classList.add('on');if(inT)c.classList.add('no');
    c.onclick=()=>{if(inT){toast('ตัวที่อยู่ในทีมส่งไปสำรวจไม่ได้');return;}
      if(on)EXP.sel=EXP.sel.filter(u=>u!==m.uid);else if(EXP.sel.length<6)EXP.sel.push(m.uid);else{toast('ส่งได้สูงสุด 6 ตัว');return;}
      EXP.confirm=false;renderExpPick();};L.append(c);});
  if(!cands.some(m=>!S.team.includes(m.uid)))L.append(el('div','evEmpty','ไม่มีมอนสเตอร์นอกทีม · ฟักไข่เพิ่มก่อนนะ'));
  d.append(el('div','exHint','เลือกได้เฉพาะตัวที่ไม่อยู่ในทีม · ตัวเลข % คือโอกาสที่ตัวนั้นจะไม่กลับมา'));d.append(L);
  const rare=party.filter(m=>(m.stars||0)>0||spOf(m).rar>=4);
  const acts=[['‹ พื้นที่อื่น',()=>{EXP.zone=null;EXP.sel=[];renderExpList();},''],
    [EXP.confirm?'ยืนยันส่ง ('+rare.length+' ตัวหายาก/มีดาว)':'ส่งสำรวจ '+party.length+' ตัว',async()=>{
      if(rare.length&&!EXP.confirm){EXP.confirm=true;toast('มี '+rare.map(m=>spOf(m).name+((m.stars||0)?' ★'+m.stars:'')).join(', ')+' ในทีมสำรวจ อาจไม่กลับมา · กดอีกครั้งเพื่อยืนยัน');renderExpPick();return;}
      const r=await act('exp_start',{zone:z.id,mon_ids:EXP.sel.slice()});if(!r)return;
      EXP.st=r.exp;EXP.at=Date.now();EXP.zone=null;EXP.sel=[];EXP.confirm=false;expHud();if(typeof syncAgents==='function')try{syncAgents();}catch(e){}
      toast('ออกเดินทางแล้ว! กลับมาใน '+fmtDur(EXP.st.active.left));EXP.view='active';renderExpActive();},'main',!party.length]];
  openSheet('ส่งสำรวจ','วิญญาณ '+fmt(s.souls||0),d,acts);
}
function expActiveTick(){const a=EXP.st.active,left=expLeft(),tot=(new Date(a.ends_at)-new Date(a.started_at))/1000;
  const bar=$('#exBar'),tx=$('#exLeft');if(!bar)return;bar.style.width=(100*(1-left/Math.max(1,tot)))+'%';tx.textContent=left>0?'เหลือ '+fmtDur(left):'กลับมาแล้ว! กดรับผล';
  const go=[...$('#shActs').children].find(b=>b.dataset.claim);if(go)go.disabled=left>0;}
function renderExpActive(){
  const s=EXP.st,a=s.active,z=s.zones.find(x=>x.id===a.zone)||{name:a.zone},d=el('div','exp');
  const hd=el('div','exHead');hd.append(el('span','exIc',EXP_ICON[a.zone]||'🧭'));const t=el('div');t.append(el('b',null,z.name));t.append(el('small',null,'พลังทีมสำรวจ '+fmt(a.power)+(a.win!=null?' · โอกาสสำเร็จ '+Math.round(a.win*100)+'%':'')));hd.append(t);d.append(hd);
  const pr=el('div','exProg');const i=el('i');i.id='exBar';pr.append(i);d.append(pr);d.append(el('div','exLeft'));d.lastChild.id='exLeft';
  const slots=el('div','exSlots');a.mons.forEach(m=>{const c=icon({uid:-m.id,sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null});c.classList.add('away');slots.append(c);});d.append(slots);
  d.append(para('ระหว่างสำรวจ มอนสเตอร์ที่ส่งไปจะไม่อยู่ในคลัง · เรียกกลับก่อนเวลาได้ ทุกตัวกลับมาครบแต่ไม่ได้รางวัล'));
  d.append(soulRow());
  const left=expLeft();
  const acts=[['เรียกกลับ',async function(){if(!this.dataset.arm){this.dataset.arm=1;this.textContent='แตะอีกครั้งเพื่อเรียกกลับ';return;}
      const r=await act('exp_recall',{});if(!r)return;EXP.st=r.exp;EXP.at=Date.now();expHud();if(typeof syncAgents==='function')try{syncAgents();}catch(e){}toast('ทีมสำรวจกลับมาครบแล้ว');openExp();},'',left<=0],
    ['รับผลการสำรวจ',async()=>{const r=await act('exp_claim',{});if(!r)return;EXP.st=r.exp;EXP.at=Date.now();expHud();if(typeof syncAgents==='function')try{syncAgents();}catch(e){}if(typeof bumpRes==='function')bumpRes('coins');renderExpResult(r.result);},'main',left>0]];
  openSheet('ส่งสำรวจ',left>0?'กำลังสำรวจ':'กลับมาแล้ว',d,acts);
  [...$('#shActs').children].forEach((b,k)=>{if(k===1)b.dataset.claim=1;if(k===0)b.onclick=acts[0][1].bind(b);});
  expActiveTick();
}
function renderExpResult(res){
  const z=EXP.st.zones.find(x=>x.id===res.zone)||{name:res.zone},d=el('div','exp');
  const dead=res.dead||[],alive=res.alive||[];
  if(res.ok!=null)d.append(el('h4',res.ok?'exOk':'exDeadH',res.ok?'สำรวจสำเร็จ! 🎉':'สำรวจล้มเหลว 💀'+(res.coins>0?' ได้แค่เหรียญปลอบใจ':' ไม่ได้รางวัล')));
  d.append(el('h4',null,dead.length?'กลับมา '+alive.length+' จาก '+(alive.length+dead.length)+' ตัว':'กลับมาครบทุกตัว!'+(res.ok===false?'':' 🎉')));
  const ok=el('div','exSlots');alive.forEach(m=>{const c=icon({uid:-m.id,sp:m.sp,lv:m.lv_new,stars:m.stars||0,el:m.el||null});if(m.lv_new>m.lv)c.append(el('span','exUp','+'+(m.lv_new-m.lv)));ok.append(c);});d.append(ok);
  if(dead.length){d.append(el('h4','exDeadH','ไม่ได้กลับมา'));const ds=el('div','exSlots');dead.forEach(m=>{const c=icon({uid:-m.id,sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null});c.classList.add('dead');c.append(el('span','exSoulB','👻'+m.souls));ds.append(c);});d.append(ds);
    d.append(para(dead.map(m=>spOf(m).name).join(', ')+' หลงหายใน'+z.name+' · ได้รับวิญญาณ '+res.souls));}
  (res.drops||[]).forEach(x=>{const b=el('div','exGot');
    if(x.kind==='god'){b.append(el('i',null,'🌟'));b.append(el('span',null,'เจอไข่เทพ 1 ใบ! ไปฟักได้ที่ศาลฟักไข่'));}
    else if(x.kind==='gold'&&x.mon){b.append(icon({uid:-Number(x.mon.id),sp:x.mon.sp,lv:1,stars:0,el:x.mon.el||null}));b.append(el('span',null,'เจอไข่ทองคำ! ฟักได้ '+spOf(x.mon).name+' ระดับ'+tierOf(x.rar).n));}
    else if(x.kind==='gold_amber'){b.append(el('i',null,'🥚'));b.append(el('span',null,'เจอไข่ทองคำ แต่กระเป๋าเต็ม ได้อัมพร '+x.amber+' แทน'));}
    else return; d.append(b);});
  if((res.drops||[]).some(x=>x.kind==='god')&&typeof loadStage==='function')try{loadStage();}catch(e){}
  d.append(rows([['เหรียญ','+'+fmt(res.coins),'#ffd34d'],['อัมพร','+'+fmt(res.amber),'#ffb347'],['วิญญาณ','+'+fmt(res.souls||0),'#c9b8ff']]));
  openSheet('ผลการสำรวจ',z.name,d,[['ส่งสำรวจอีกครั้ง',()=>{EXP.view='list';openExp();},'main']]);
}
$('#rExp').onclick=()=>openExp();

// ดีบัก: index.html?dbg=1 → __F.exp(ข้อมูลแบบ exp_state, zone, จำนวนตัวที่เลือก) เปิดหน้าเลือกทีมสำรวจด้วยข้อมูลจำลอง · __F.expRes(result)
if(window.__F)Object.assign(window.__F,{exp:(st,zone,n)=>{EXP.st=st;EXP.at=Date.now();if(!zone)return renderExpList();EXP.zone=zone;EXP.sel=S.mons.filter(m=>!S.team.includes(m.uid)).slice(0,n||6).map(m=>m.uid);renderExpPick();return EXP.sel.length;},
  expRes:(st,res)=>{EXP.st=st;renderExpResult(res);},expCalc:(st,z,P,one,avg,rar)=>{EXP.st=st;const zz=st.zones.find(x=>x.id===z);return [expWin(zz,P),expDie(zz,P,one,avg,rar,false),expDie(zz,P,one,avg,rar,true)];}});
