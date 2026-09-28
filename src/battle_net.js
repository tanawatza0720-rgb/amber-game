/* ================= เชื่อมเซิร์ฟเวอร์ (ใช้บัญชีเดียวกับฟาร์ม) =================
   ล็อกอินค้างจากหน้าฟาร์ม -> ทีมจริง ดันด่าน/รางวัลสะสม/บอส ตัดสินที่เซิร์ฟเวอร์ (migrate_idle.sql)
   ไม่ได้ล็อกอิน/ต่อไม่ได้ -> โหมดทดลอง ดูการต่อสู้ได้แต่ไม่ได้รางวัล */
const SUPABASE_URL='https://spkzkwksjweszytkgokx.supabase.co';
const SUPABASE_KEY='sb_publishable_FsTybeBpKC_v3gHQ4gnUHA_xhYmbBIt'; // publishable key เท่านั้น
const BSTORE={getItem:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},setItem:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}},removeItem:k=>{try{localStorage.removeItem(k);}catch(e){}}};
let NO_DRAGON=false;
const BN={sb:null,online:false,state:null,at:0,bid:null,t0:0};
const BERR={not_ready:'ยังสะสมรางวัลไม่ถึง 1 นาที',too_fast:'จบด่านเร็วผิดปกติ',expired:'การต่อสู้นี้หมดเวลาแล้ว',boss_gate:'ต้องชนะบอสก่อน',no_boss:'ยังไม่ถึงด่านบอส',
  already_finished:'บันทึกผลไปแล้ว',no_battle:'ไม่พบข้อมูลการต่อสู้นี้',
  session:'การเข้าสู่ระบบหมดอายุ กลับไปฟาร์มแล้วเข้าสู่ระบบใหม่',network:'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง'};
const bTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
const bAuthErr=e=>{const m=String(e&&e.message||'');return e&&((/jwt|token|401|not_authenticated/i.test(m))||e.status===401||e.code==='PGRST301');};
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
function bMsg(t){const m=$('#bMsg');m.textContent=t;m.hidden=false;clearTimeout(msgT);msgT=setTimeout(()=>m.hidden=true,3500);}
function bnApply(st){
  if(!st||!st.player)return; BN.state=st; BN.at=Date.now();
  const mons=st.monsters||[], ids=(st.player.team||[]).map(Number);
  let team=ids.map(id=>mons.find(m=>Number(m.id)===id)).filter(Boolean);
  if(!team.length)team=[...mons].sort((a,b)=>b.lv-a.lv).slice(0,6);
  team=team.filter(m=>SPECIES[m.sp]).slice(0,6);
  if(team.length)TEAM.splice(0,TEAM.length,...team.map(m=>({sp:NO_DRAGON&&m.sp==='amateru'?'kazemaru':m.sp,lv:m.lv})));
  if(typeof idleRender==='function')idleRender();
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
async function bnRefresh(){if(!BN.online)return;try{bnApply(await brpc('game_state'));}catch(e){}}
// รางวัลสะสมตอนนี้ (นับต่อจากที่เซิร์ฟเวอร์บอกล่าสุด)
function idleNow(){
  const p=BN.state&&BN.state.player; if(!p)return null;
  const sec=Math.min(p.idle_max,p.idle_sec+Math.floor((Date.now()-BN.at)/1000));
  return {sec,coins:Math.floor(sec*p.rate_c/60),xp:Math.floor(sec*p.rate_x/60),max:p.idle_max};
}
const fmtDur=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+' ชม. '+m+' นาที':m+' นาที';};
const fmtN=n=>Number(n||0).toLocaleString('en-US');
