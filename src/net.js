/* ================= เชื่อมต่อเซิร์ฟเวอร์ (Supabase) =================
   ออนไลน์: ทุกการใช้เหรียญ/อัมพร/สุ่มไข่/อัปเลเวล ให้เซิร์ฟเวอร์ตัดสิน (ดู setup_v2.sql)
   ออฟไลน์: ถ้าต่อเซิร์ฟเวอร์ไม่ได้ ใช้ LocalServer ที่มีกติกาเดียวกัน เก็บในเครื่องนี้ */
const SUPABASE_URL='https://spkzkwksjweszytkgokx.supabase.co';
const SUPABASE_KEY='sb_publishable_FsTybeBpKC_v3gHQ4gnUHA_xhYmbBIt'; // publishable key ใส่หน้าเว็บได้ ห้ามใส่ secret key
const MEMST={};
const SafeStore={getItem:k=>{try{return localStorage.getItem(k);}catch(e){return MEMST[k]??null;}},
  setItem:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){MEMST[k]=v;}},removeItem:k=>{try{localStorage.removeItem(k);}catch(e){delete MEMST[k];}}};
const NET={mode:'offline',sb:null,user:null,busy:false};
const ERR={raid_no_access:'บุกบ้านนี้ไม่ได้ (ต้องเป็นเพื่อน หรือสุ่มเจอวันนี้)',raid_scout_limit:'สุ่มบ้านครบ 20 ครั้งแล้ววันนี้',raid_no_one:'ตอนนี้ยังไม่มีบ้านให้บุก ลองใหม่ภายหลัง',raid_friend_today:'วันนี้บุกปล้นเพื่อนคนนี้ไปแล้ว',raid_limit:'วันนี้บุกปล้นครบแล้ว',raid_shield:'เพื่อนคนนี้ถูกปล้นครบ 3 ครั้งแล้ววันนี้ (มีโล่คุ้มกัน)',raid_no_target:'ไม่พบมอนสเตอร์เป้าหมาย',raid_bad_party:'ต้องเลือกมอนสเตอร์ 4 ตัว',friend_not_found:'ไม่พบผู้เล่นรหัสนี้',friend_self:'นี่คือรหัสของคุณเอง',friend_already:'เป็นเพื่อนกันอยู่แล้ว',friend_pending:'ส่งคำขอไปแล้ว รออีกฝ่ายกดรับ',friend_limit:'เพื่อนเต็มแล้ว (สูงสุด 30 คน)',friend_no_request:'ไม่มีคำขอนี้แล้ว',friend_not_friend:'ยังไม่ได้เป็นเพื่อนกัน',exp_busy:'มีทีมสำรวจออกไปอยู่แล้ว',mon_in_team:'ตัวที่อยู่ในทีมส่งไปสำรวจไม่ได้',bad_party:'เลือกมอนสเตอร์ 1–6 ตัว',bad_zone:'ไม่มีพื้นที่นี้',no_exp:'ไม่มีทีมสำรวจ',exp_not_done:'ทีมสำรวจยังไม่กลับมา',exp_finished:'ทีมสำรวจกลับมาแล้ว กดรับผลได้เลย',not_enough_souls:'วิญญาณไม่พอ',material_stronger:'ใช้ตัวที่ดาวมากกว่าเป็นวัตถุดิบไม่ได้',bad_race:'ไม่มีเผ่านี้',race_locked:'เลือกเผ่าไปแล้ว เปลี่ยนไม่ได้',no_mail:'จดหมายนี้หมดอายุแล้ว',max_stars:'ดาวเต็มแล้ว (6 ดาว)',bad_material:'ตัวซ้ำไม่พอ',not_same_species:'ต้องใช้ตัวละครเดียวกัน',material_in_team:'ตัวที่ใช้เป็นวัตถุดิบต้องไม่อยู่ในทีม',same_monster:'เลือกตัวเดียวกันไม่ได้',not_enough_coins:'เหรียญไม่พอ',not_enough_amber:'อัมพรไม่พอ',not_enough_energy:'พลังงานไม่พอ รอฟื้นฟูหรือซื้อที่ร้านค้า',box_full:'ช่องเก็บมอนสเตอร์เต็ม',
  max_level:'เลเวลสูงสุดแล้ว',level_too_low:'เลเวลยังไม่ถึง',cannot_evolve:'ตัวนี้เป็นร่างสุดท้ายแล้ว',already_claimed:'รับไปแล้ว',not_ready:'ยังไม่พร้อม',
  quest_not_done:'ภารกิจยังไม่สำเร็จ',bad_team:'จัดทีมไม่ถูกต้อง',bad_name:'ชื่อต้องยาว 1–12 ตัวอักษร',no_monster:'ไม่พบมอนสเตอร์ตัวนี้',too_fast:'จบด่านเร็วผิดปกติ',
  not_authenticated:'ยังไม่ได้เข้าสู่ระบบ',network:'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',offline_net:'ไม่มีอินเทอร์เน็ต ตรวจสอบการเชื่อมต่อแล้วลองใหม่',session:'การเข้าสู่ระบบหมดอายุ กรุณาออกจากระบบแล้วเข้าใหม่'};
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
function errCode(e){const m=(e&&(e.message||e.msg||e.error_description))||'';const k=Object.keys(ERR).find(k=>m.includes(k));return k||'network';}
const isAuthErr=e=>e&&(/jwt|token|expired|401|not_authenticated/i.test(String(e.message||''))||e.status===401||e.code==='PGRST301');
async function rpcOnce(fn,args){
  let r; try{r=await withTimeout(NET.sb.rpc(fn,args||{}),15000);}catch(e){return {net:true};}
  return r;
}
async function api(fn,args){
  if(NET.mode==='online'){
    let r=await rpcOnce(fn,args);
    // บัตรผ่าน (token) หมดอายุ เช่นเปิดเกมทิ้งไว้นานหรือเครื่องพักหน้าจอ: ขอบัตรใหม่แล้วลองอีกครั้ง
    if(r.error&&isAuthErr(r.error)){try{await withTimeout(NET.sb.auth.refreshSession(),10000);}catch(e){} r=await rpcOnce(fn,args);}
    // เน็ตสะดุด: รอแป๊บแล้วลองใหม่ 1 ครั้ง
    if(r.net){await new Promise(z=>setTimeout(z,1500)); r=await rpcOnce(fn,args);}
    if(r.net){const c=navigator.onLine===false?'offline_net':'network';throw Object.assign(new Error(c),{code:c});}
    if(r.error){const c=isAuthErr(r.error)?'session':errCode(r.error);throw Object.assign(new Error(c),{code:c});}
    return r.data;
  }
  return LOCAL.call(fn,args||{});
}
// กลับมาที่แท็บเกม: ต่ออายุบัตรผ่านทันที
document.addEventListener('visibilitychange',()=>{if(!NET.sb)return;
  if(document.visibilityState==='visible'){try{NET.sb.auth.startAutoRefresh();}catch(e){} NET.sb.auth.getSession().catch(()=>{});}
  else{try{NET.sb.auth.stopAutoRefresh();}catch(e){}}});
// เรียก API แล้วอัปเดตสถานะ ถ้าพลาดขึ้นข้อความภาษาไทย คืนค่า null
async function act(fn,args){
  if(NET.busy)return null; NET.busy=true;
  try{const r=await api(fn,args); if(r&&r.state)applyState(r.state); return r;}
  catch(e){toast(ERR[e.code]||ERR.network); return null;}
  finally{NET.busy=false;}
}
// เตรียมตัวเชื่อม + อ่านบัญชีที่ล็อกอินค้างไว้ (ไม่สร้างบัญชีใหม่) คืน user หรือ null
async function authInit(){
  if(!window.supabase||!SUPABASE_URL||!SUPABASE_KEY)throw new Error('no client');
  if(!NET.sb)NET.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storage:SafeStore,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await withTimeout(NET.sb.auth.getSession(),15000);
  // บัญชีที่จำไว้ใช้ไม่ได้แล้ว (เช่นบัตรต่ออายุหมด): ล้างออกแล้วให้ล็อกอินใหม่ แทนที่จะขึ้นว่าเชื่อมต่อไม่ได้
  if(error){console.warn('session',error.message);try{await NET.sb.auth.signOut({scope:'local'});}catch(e){} NET.user=null; NET.sessionLost=true; return null;}
  NET.user=(data&&data.session&&data.session.user)||null;
  return NET.user;
}
const redirectTo=()=>location.origin+location.pathname;
async function signInGoogle(){
  // ผู้เยี่ยมชมที่ล็อกอินค้างอยู่: ผูก Google เข้ากับบัญชีเดิม เซฟจะติดไปด้วย
  if(NET.user&&NET.user.is_anonymous){
    const {error}=await NET.sb.auth.linkIdentity({provider:'google',options:{redirectTo:redirectTo()}});
    if(!error)return; }
  const {error}=await NET.sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectTo(),queryParams:{prompt:'select_account'}}});
  if(error)throw error;
}
async function switchToGoogle(){ // บัญชี Google นี้มีเซฟอยู่แล้ว: ออกจากผู้เยี่ยมชมแล้วเข้าบัญชี Google
  try{await NET.sb.auth.signOut({scope:'local'});}catch(e){}
  NET.user=null; await signInGoogle();
}
async function signInGuest(){
  const r=await withTimeout(NET.sb.auth.signInAnonymously(),8000); if(r.error)throw r.error; NET.user=r.data.user; return NET.user;
}
async function signOutAll(){ try{sessionStorage.removeItem('amber_in');}catch(e){} try{await NET.sb.auth.signOut({scope:'local'});}catch(e){} NET.user=null; }
// เข้าเกม: โหลดเซฟจากเซิร์ฟเวอร์ (หรือในเครื่องถ้าออฟไลน์)
async function enterOnline(){ NET.mode='online'; applyState(await api('game_state')); }
function enterOffline(){ NET.mode='offline'; applyState(LOCAL.call('game_state',{})); }
async function linkGoogle(){
  if(NET.mode!=='online')return toast('ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อน');
  try{await signInGoogle();}catch(e){toast('ผูกบัญชีไม่สำเร็จ: '+e.message);}
}
const userLabel=u=>!u?'':u.is_anonymous?'ผู้เยี่ยมชม (เล่นได้เฉพาะเครื่องนี้)':((u.user_metadata&&(u.user_metadata.full_name||u.user_metadata.name))||u.email||'บัญชี Google');
const userSub=u=>!u||u.is_anonymous?'':(u.email||'');

/* ---------- เซิร์ฟเวอร์จำลองในเครื่อง (กติกาเดียวกับ setup_v2.sql) ---------- */
const LOCAL=(()=>{
  const KEY='amber_local_v2', C={energy_max:60,energy_sec:180,amber_sec:600,amber_yield:5,slots:30,wild_cost:100,gold_cost:30,pity_max:30,energy_buy:20};
  const SPS={kazemaru:{rar:1,max:20,to:'kazekiri',cost:300},kazekiri:{rar:2,max:40},yorugumo:{rar:2,max:40},kuroga:{rar:3,max:50},hakuneko:{rar:3,max:50},morihime:{rar:2,max:40},amateru:{rar:4,max:50}};
  const today=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
  const yesterday=()=>new Date(Date.now()+7*3600e3-864e5).toISOString().slice(0,10);
  let D=null, nid=1;
  const fail=c=>{throw Object.assign(new Error(c),{code:c});};
  function load(){
    try{D=JSON.parse(SafeStore.getItem(KEY));}catch(e){D=null;}
    if(!D){ // สร้างใหม่ (ย้ายของเดิมจากเดโมถ้ามี)
      let old=null; try{old=JSON.parse(SafeStore.getItem('amber_farm_demo_v1'));}catch(e){}
      const now=Date.now();
      D={name:(old&&old.name)||'ผู้เยี่ยมชม',lv:1,xp:0,coins:old?old.coins:1200,amber:old?old.amber:50,energy:old?Math.min(60,old.energy):45,energy_at:now,amber_at:now,
        daily_streak:0,daily_last:null,hatch_count:0,pity:0,quest_day:null,quests:{},team:[],mons:[],nid:1};
      const src=(old&&old.mons&&old.mons.length)?old.mons.map(m=>({sp:m.sp||(m.evo?'kazekiri':'kazemaru'),lv:m.lv})):[{sp:'kazekiri',lv:18},{sp:'kazemaru',lv:4},{sp:'kazemaru',lv:7},{sp:'kazemaru',lv:1}];
      if(!src.some(m=>m.sp==='amateru'))src.push({sp:'amateru',lv:10});
      if(!src.some(m=>m.sp==='kuroga'))src.push({sp:'kuroga',lv:10});
      src.forEach(m=>D.mons.push({id:D.nid++,sp:m.sp,lv:m.lv}));
      const ord=m=>({kazekiri:1,amateru:2}[m.sp]||3)*100-m.lv;
      D.team=[...D.mons].sort((a,b)=>ord(a)-ord(b)).slice(0,6).map(m=>m.id);
    }
    return D;
  }
  const persist=()=>SafeStore.setItem(KEY,JSON.stringify(D));
  function tick(){const now=Date.now();
    if(D.energy>=C.energy_max)D.energy_at=now;
    else{const n=Math.floor((now-D.energy_at)/1000/C.energy_sec);if(n>0){D.energy=Math.min(C.energy_max,D.energy+n);D.energy_at=D.energy>=C.energy_max?now:D.energy_at+n*C.energy_sec*1000;}}
    if(D.quest_day!==today()){D.quest_day=today();D.quests={};}}
  const qadd=k=>D.quests[k]=(D.quests[k]||0)+1;
  function state(){const now=Date.now();return{player:{name:D.name,lv:D.lv,xp:D.xp,coins:D.coins,amber:D.amber,energy:D.energy,energy_max:C.energy_max,
    energy_next:D.energy>=C.energy_max?0:Math.max(0,C.energy_sec-Math.floor((now-D.energy_at)/1000)),energy_sec:C.energy_sec,
    amber_in:Math.max(0,Math.ceil((D.amber_at-now)/1000)),daily_streak:D.daily_streak,daily_claimed:D.daily_last===today(),hatch_count:D.hatch_count,
    race:D.race||null,pity:D.pity,pity_max:C.pity_max,quests:{...D.quests},team:[...D.team],slots:C.slots,named:!!D.named,uid:'ในเครื่องนี้'},monsters:D.mons.map(m=>({...m}))};}
  const mon=id=>D.mons.find(m=>m.id===id)||fail('no_monster');
  const F={
    game_state:()=>state(),
    set_name:({new_name})=>{const n=String(new_name||'').trim();if(n.length<1||n.length>12)fail('bad_name');D.name=n;D.named=true;return{};},
    hatch_egg:({kind})=>{if(D.mons.length>=C.slots)fail('box_full');let ch;
      if(kind==='wild'){if(D.coins<C.wild_cost)fail('not_enough_coins');D.coins-=C.wild_cost;ch=[.83,.15,.02,0];}
      else if(kind==='gold'){if(D.amber<C.gold_cost)fail('not_enough_amber');D.amber-=C.gold_cost;D.pity++;ch=[.575,.32,.10,.005];}else fail('bad_egg');
      const r=Math.random(); let t=r<ch[3]?4:r<ch[3]+ch[2]?3:r<ch[3]+ch[2]+ch[1]?2:1; if(kind==='gold'&&t<3&&D.pity>=C.pity_max)t=3;
      const pool=Object.keys(SPS).filter(k=>SPS[k].rar===t), sp=pool[Math.floor(Math.random()*pool.length)]||'kazemaru'; if(kind==='gold'&&t>=3)D.pity=0;
      const m={id:D.nid++,sp,lv:1,stars:0,el:EL_LIST[Math.floor(Math.random()*EL_LIST.length)]};D.mons.push(m);D.hatch_count++;qadd('hatch');return{mon:{...m},rar:SPS[sp].rar};},
    level_up:({mon_id})=>{const m=mon(mon_id);if(m.lv>=SPS[m.sp].max)fail('max_level');const c=60*m.lv;if(D.coins<c)fail('not_enough_coins');D.coins-=c;m.lv++;return{lv:m.lv};},
    evolve_monster:({mon_id})=>{const m=mon(mon_id),s=SPS[m.sp];if(!s.to)fail('cannot_evolve');if(m.lv<s.max)fail('level_too_low');if(D.coins<s.cost)fail('not_enough_coins');D.coins-=s.cost;m.sp=s.to;m.lv=1;return{sp:m.sp};},
    star_up:({mon_id,mat_ids})=>{const m=mon(mon_id);const st=m.stars||0;if(st>=STAR_MAX)fail('max_stars');const need=starCost(st+1);
      if(!Array.isArray(mat_ids)||mat_ids.length!==need||new Set(mat_ids).size!==need)fail('bad_material');
      const xs=mat_ids.map(id=>mon(id));if(xs.some(x=>x.id===m.id||x.sp!==m.sp))fail('not_same_species');if(xs.some(x=>D.team.includes(x.id)))fail('material_in_team');if(xs.some(x=>(x.stars||0)>st))fail('material_stronger');
      D.mons=D.mons.filter(x=>!mat_ids.includes(x.id));m.stars=st+1;return{stars:m.stars};},
    set_race:({r})=>{if(!RACES[r])fail('bad_race');if(D.race)fail('race_locked');D.race=r;return{race:r};},
    mail_list:()=>[],
    claim_mail:()=>fail('no_mail'),
    set_team:({ids})=>{if(!Array.isArray(ids)||ids.length<1||ids.length>6||new Set(ids).size!==ids.length||!ids.every(i=>D.mons.some(m=>m.id===i)))fail('bad_team');D.team=[...ids];return{};},
    claim_daily:()=>{if(D.daily_last===today())fail('already_claimed');const s=D.daily_last===yesterday()?D.daily_streak+1:1;const day=(s-1)%7+1;
      const [kind,amount]=[['coins',200],['amber',5],['coins',300],['coins',400],['amber',10],['coins',500],['amber',30]][day-1];D[kind]+=amount;D.daily_streak=s;D.daily_last=today();return{day,kind,amount};},
    collect_amber:()=>{if(Date.now()<D.amber_at)fail('not_ready');D.amber+=C.amber_yield;D.amber_at=Date.now()+C.amber_sec*1000;qadd('amber');return{amount:C.amber_yield};},
    claim_quest:({q})=>{const Q={hatch:[1,'coins',100],battle:[3,'amber',10],amber:[1,'coins',150]}[q]||fail('bad_quest');if(D.quests[q+'C'])fail('already_claimed');if((D.quests[q]||0)<Q[0])fail('quest_not_done');
      D[Q[1]]+=Q[2];D.quests[q+'C']=true;return{kind:Q[1],amount:Q[2]};},
    buy_energy:()=>{if(D.amber<C.energy_buy)fail('not_enough_amber');D.amber-=C.energy_buy;D.energy=Math.min(99,D.energy+30);return{};},
  };
  return{call(fn,args){load();tick();const f=F[fn]||fail('unknown');
    const before=JSON.stringify(D); try{const r=f(args);persist();return fn==='game_state'?r:Object.assign(r,{state:state()});}catch(e){D=JSON.parse(before);throw e;}}};
})();
