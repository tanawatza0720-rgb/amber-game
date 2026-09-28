/* ================= เชื่อมเซิร์ฟเวอร์ (ใช้บัญชีเดียวกับฟาร์ม) =================
   ล็อกอินค้างจากหน้าฟาร์ม -> ใช้ทีมจริง, หักพลังงานที่เซิร์ฟเวอร์ (battle_start), รับรางวัลจากเซิร์ฟเวอร์ (battle_finish)
   ไม่ได้ล็อกอิน/ต่อไม่ได้ -> โหมดทดลอง เล่นได้แต่ไม่ได้รางวัล */
const SUPABASE_URL='https://spkzkwksjweszytkgokx.supabase.co';
const SUPABASE_KEY='sb_publishable_FsTybeBpKC_v3gHQ4gnUHA_xhYmbBIt'; // publishable key เท่านั้น
const BSTORE={getItem:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},setItem:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}},removeItem:k=>{try{localStorage.removeItem(k);}catch(e){}}};
const BN={sb:null,online:false,state:null,bid:null,t0:0,busy:false};
const BERR={not_enough_energy:'พลังงานไม่พอ รอฟื้นฟูหรือซื้อที่ร้านค้าในฟาร์ม',too_fast:'จบด่านเร็วผิดปกติ',expired:'ด่านนี้หมดเวลาแล้ว',
  already_finished:'บันทึกผลด่านนี้ไปแล้ว',no_battle:'ไม่พบข้อมูลด่านนี้',bad_stage:'ไม่พบด่านนี้',
  session:'การเข้าสู่ระบบหมดอายุ กลับไปฟาร์มแล้วเข้าสู่ระบบใหม่',network:'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง'};
const bTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
const bAuthErr=e=>e&&(/jwt|token|expired|401|not_authenticated/i.test(String(e.message||''))&&!/^expired$/.test(String(e.message||''))||e.status===401||e.code==='PGRST301');
async function brpc(fn,args){
  const once=async()=>{try{return await bTimeout(BN.sb.rpc(fn,args||{}),15000);}catch(e){return {net:true};}};
  let r=await once();
  if(r.error&&bAuthErr(r.error)){try{await bTimeout(BN.sb.auth.refreshSession(),10000);}catch(e){} r=await once();}
  if(r.net){await sleep(1500); r=await once();}
  if(r.net)throw Object.assign(new Error('network'),{code:'network'});
  if(r.error){const m=String(r.error.message||'');const k=Object.keys(BERR).find(k=>m.includes(k))||(bAuthErr(r.error)?'session':'network');throw Object.assign(new Error(k),{code:k});}
  return r.data;
}
let msgT=0;
function bMsg(t){const m=$('#bMsg');m.textContent=t;m.hidden=false;clearTimeout(msgT);msgT=setTimeout(()=>m.hidden=true,3200);}
function bnApply(st){
  if(!st||!st.player)return; BN.state=st;
  const mons=st.monsters||[], ids=(st.player.team||[]).map(Number);
  let team=ids.map(id=>mons.find(m=>Number(m.id)===id)).filter(Boolean);
  if(!team.length)team=[...mons].sort((a,b)=>b.lv-a.lv).slice(0,3);
  team=team.filter(m=>SPECIES[m.sp]).slice(0,3);
  if(team.length)TEAM.splice(0,TEAM.length,...team.map(m=>({sp:m.sp,lv:m.lv})));
  bnRender();
}
function bnRender(){
  const tl=$('#teamLine');tl.textContent='';
  TEAM.forEach((d,i)=>{if(i)tl.append(' · ');const b=document.createElement('b');b.textContent=SPECIES[d.sp].name+' Lv'+d.lv;tl.append(b);});
  const n=$('#mapNet');
  if(BN.online&&BN.state){const p=BN.state.player;n.textContent='⚡ พลังงาน '+p.energy+'/'+p.energy_max+' · 🪙 '+p.coins+' เหรียญ';n.className='sub net';}
  else{n.textContent='โหมดทดลอง: ยังไม่ได้เข้าสู่ระบบ เล่นได้แต่ไม่ได้รับรางวัล (เข้าสู่ระบบที่หน้าฟาร์มก่อน)';n.className='sub net off';}
}
async function bnInit(){
  try{
    if(!window.supabase)return false;
    BN.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storage:BSTORE,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data}=await bTimeout(BN.sb.auth.getSession(),10000);
    if(!data||!data.session)return false;
    const st=await brpc('game_state'); BN.online=true; bnApply(st); return true;
  }catch(e){console.warn('battle net',e);BN.online=false;return false;}
}
// เริ่มด่าน: ออนไลน์ให้เซิร์ฟเวอร์หักพลังงานก่อน
async function startStage(st){
  if(BN.busy)return;
  if(BN.online){
    BN.busy=true; $('#loadMsg').textContent='กำลังเริ่มด่าน…'; $('#loadMsg').hidden=false;
    try{const r=await brpc('battle_start',{stage:st.id}); BN.bid=r.battle_id; BN.t0=Date.now(); bnApply(r.state);}
    catch(e){BN.busy=false;$('#loadMsg').hidden=true;bMsg(BERR[e.code]||BERR.network);UNITS.forEach(removeUnit);UNITS=[];showMap();return;}
    BN.busy=false; $('#loadMsg').hidden=true;
  } else BN.bid=null;
  $('#map').hidden=true; $('#result').hidden=true; runBattle(st);
}
// จบด่าน: ส่งผลให้เซิร์ฟเวอร์ (ต้องเล่นอย่างน้อย 15 วินาที) คืน {coins,xp} หรือ null ถ้าเป็นโหมดทดลอง
async function bnFinish(win){
  const bid=BN.bid; BN.bid=null; if(!bid)return null;
  const w=15600-(Date.now()-BN.t0); if(w>0)await sleep(w);
  const r=await brpc('battle_finish',{battle_id:bid,won:!!win}); bnApply(r.state); return r;
}
