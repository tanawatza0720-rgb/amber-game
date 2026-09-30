/* ================= ด่านสตอรี่: ศัตรูตามดินแดน + บอสประจำบท + เงื่อนไขพิเศษประจำด่าน =================
   บท 1 = นินจาชาดหน้าประตูนครอัมพร (แบบเดิม) · บท 2+ วนดินแดน (ดู realmFor ใน battle_realm.js)
   บอส (ด่าน x-10): มีชื่อเฉพาะ · เลือดเหลือครึ่งจะคลั่ง (โจมตี +30% เร็วขึ้น) และเรียกลูกน้อง 2 ตัว
   เงื่อนไขพิเศษ: สุ่มแบบคงที่ตามเลขด่าน (ด่านเดิมได้เงื่อนไขเดิมเสมอ) · บท 1 ด่าน 1–3 ไม่มีเงื่อนไข */
const STORY_REALM={
  null:{tint:null,minion:{sp:'kazemaru',name:'นินจาชาดจิ๋ว'},mid:{sp:'kazekiri',name:'นินจาชาด'},big:{sp:'kazekiri',name:'นินจาชาด'},
    boss:{sp:'kazekiri',name:'หัวหน้านินจาชาด'},stage:'หน้าประตูนครอัมพร',bossStage:'ประตูแดงของนินจาชาด'},
  human:{tint:{dark:0x243248,skin:0xa8bedc,em:0x00101e,glow:0x7fd4ff},minion:{sp:'kazemaru',name:'ทหารยามเหล็ก'},mid:{sp:'kazekiri',name:'อัศวินเหล็ก'},big:{sp:'kuroga',name:'กัปตันนครา'},
    boss:{sp:'kuroga',name:'จอมทัพเหล็กกล้า'},stage:'ลานมหานครอัมพร',bossStage:'ป้อมจอมทัพเหล็กกล้า'},
  beast:{tint:{dark:0x2c4a1c,skin:0xa6dc8c,em:0x061400,glow:0x9dff7a},minion:{sp:'kazemaru',name:'ภูตไม้'},mid:{sp:'yorugumo',name:'แมงมุมพงไพร'},big:{sp:'morihime',name:'พรานเอลฟ์ป่า'},
    boss:{sp:'yorugumo',name:'ราชินีแมงมุมพงไพร'},stage:'หุบเขาพงไพร',bossStage:'รังราชินีแมงมุม'},
  undead:{tint:{dark:0x170e22,skin:0x8e7cb0,em:0x1c0034,glow:0xb070ff},minion:{sp:'kazemaru',name:'โครงกระดูกทมิฬ'},mid:{sp:'hakuneko',name:'แม่มดวิญญาณ'},big:{sp:'kuroga',name:'อัศวินวิญญาณ'},
    boss:{sp:'amateru',alt:'kuroga',name:'มังกรทมิฬยมโลก'},stage:'สมรภูมิยมโลก',bossStage:'บัลลังก์มังกรทมิฬ'},
  god:{tint:{dark:0x6a5418,skin:0xffe8b0,em:0x201400,glow:0xffe08a},minion:{sp:'kazemaru',name:'ภูตแสง'},mid:{sp:'kazekiri',name:'ผู้พิทักษ์วิหาร'},big:{sp:'hakuneko',name:'เทวทูตทอง'},
    boss:{sp:'amateru',alt:'hakuneko',name:'มังกรทองแห่งสรวงสวรรค์'},stage:'วิหารแดนสวรรค์',bossStage:'บัลลังก์มังกรทอง'},
};
const STORY_MODS=[
  {id:'el',icon:'🔥',name:'พลังธาตุ',desc:'ศัตรูทั้งหมดเป็นธาตุเดียวกัน พลังโจมตี +25%',e:{atk:1.25},el:1},
  {id:'armor',icon:'🛡️',name:'เกราะหนา',desc:'ศัตรูป้องกัน +50%',e:{def:1.5}},
  {id:'swift',icon:'💨',name:'ลมกรด',desc:'ศัตรูเร็วขึ้น 30%',e:{spd:1.3}},
  {id:'giant',icon:'🗿',name:'ร่างยักษ์',desc:'ศัตรูน้อยลง แต่เลือด ×1.6 และตัวใหญ่ขึ้น',e:{hp:1.6,size:1.18},fewer:1},
  {id:'fog',icon:'🌫️',name:'หมอกหนา',desc:'ทุกฝ่ายช้าลง 20%',e:{spd:.8},p:{spd:.8}},
  {id:'bless',icon:'🍀',name:'พรแห่งดินแดน',desc:'ทีมเราเลือด +15%',p:{hp:1.15}},
  {id:'horde',icon:'👥',name:'ฝูงใหญ่',desc:'ศัตรูมากขึ้น แต่ตัวเล็กลง',e:{hp:.8,atk:.85},more:1},
  {id:'blood',icon:'🩸',name:'กระหายเลือด',desc:'ศัตรูดูดเลือด 15% ของความเสียหายที่ทำ',e:{leech:.15}},
];
var STORY={mod:null,rage:new Set()};
const storyHash=n=>{let h=(n*2654435761)>>>0;h^=h>>>13;h=Math.imul(h,1274126177)>>>0;return h;};
function storyMod(n){if(n<=3)return null;const h=storyHash(n),k=h%(STORY_MODS.length+4);if(k>=STORY_MODS.length)return null;
  const m=Object.assign({},STORY_MODS[k]);if(m.el){m.elv=EN_ELS[(h>>>8)%EN_ELS.length];m.name='พลังธาตุ'+m.elv;m.desc='ศัตรูทั้งหมดเป็นธาตุ'+m.elv+' พลังโจมตี +25%';m.icon=ELEM&&ELEM[m.elv]?ELEM[m.elv].i:'🔥';}return m;}
function storyTheme(n){const k=typeof realmFor==='function'?realmFor(n):null;return STORY_REALM[k]||STORY_REALM.null;}
// ย้อมสีศัตรูตามดินแดน (แทนสีแดงของนินจาชาด)
function tintRealm(w,T,boss){
  const dark=new THREE.Color(T.dark),cache=new Map(),tint=(m,f)=>{if(!cache.has(m)){const n=m.clone();f(n);cache.set(m,n);}return cache.get(m);};
  w.traverse(o=>{
    if(o.isMesh&&o.material&&!o.material.isMeshBasicMaterial&&o.material.color){o.material=tint(o.material,n=>{const c=n.color,l=(c.r+c.g+c.b)/3;if(l<.35&&!(n.metalness>.5))c.lerp(dark,.65);if(n.emissive)n.emissive.set(T.em);});}
    else if(o.isMesh&&o.material&&o.material.isMeshBasicMaterial){o.material=tint(o.material,n=>{n.color.set(T.glow);});}
    if(o.isSprite){o.material=o.material.clone();o.material.color.set(T.glow);}
    if(o.isPointLight)o.color.set(T.glow);
    if(o.isSkinnedMesh){o.material=o.material.clone();o.material.color.set(T.skin);if(o.material.emissive)o.material.emissive.set(boss?T.em:0x000000);}
  });
  if(boss)glow(w,T.glow,3.2,[0,1.2,0],.35);
}
function storyWaveDefs(T,count,bigs,mod,show){
  let n=count;if(mod&&mod.fewer)n=Math.max(3,Math.round(n*.65));if(mod&&mod.more)n=Math.round(n*1.3);
  const cap=typeof LOW!=='undefined'&&LOW?7:99;n=Math.min(n,cap);
  const out=[];for(let i=0;i<n;i++){const r=i%4===3&&bigs>0?(bigs--,T.big):(i%3===1?T.mid:T.minion);out.push({sp:r.sp,name:r.name,show});}
  return out;}
function storyApply(defs,T,mod){return defs.map(d=>Object.assign(d,T.tint?{tint:T.tint}:{},mod&&mod.e?{mod:mod.e}:{},mod&&mod.elv?{el:mod.elv}:{}));}
idleStage=function(n,E){
  const T=storyTheme(n),mod=storyMod(n);
  const sizes=n<4?[[6,0],[7,1],[8,1]]:n<10?[[8,1],[9,2],[10,2]]:[[9,2],[10,3],[11,3]];
  const waves=sizes.map(([c,b],i)=>storyApply(makeWave(storyWaveDefs(T,c+b,b,mod,n),E,enemyEl(n,i)),T,mod));
  return {id:stLabel(n),name:T.stage,mod,waves};
};
bossStage=function(n){
  const R=REQ(n),T=storyTheme(n),mod=storyMod(n);
  const bsp=T.boss.sp==='amateru'&&(typeof NO_DRAGON!=='undefined'&&NO_DRAGON||typeof DRAGON==='undefined'||!DRAGON)?T.boss.alt:T.boss.sp;
  const w1=storyApply(makeWave(storyWaveDefs(T,8,2,mod,n),R*.55,enemyEl(n,0)),T,mod);
  const minions=storyWaveDefs(T,6,1,null,n);minions.splice(3,0,{sp:bsp,boss:1,name:T.boss.name,show:n});
  const w2=storyApply(makeWave(minions,R*.8,EN_ELS[(Math.ceil(n/10)+3)%EN_ELS.length]),T,mod);
  return {id:stLabel(n),name:T.bossStage,mod,boss:T.boss.name,theme:T,waves:[w1,w2]};
};
const stageTitle=(n,st)=>st.name+(st.mod?' · '+st.mod.icon+' '+st.mod.name:'');
// ตอนเริ่มด่าน: แจ้งเงื่อนไขพิเศษ
function storyStart(st){STORY.mod=st&&st.mod||null;STORY.rage.clear();STORY.theme=st&&st.theme||null;
  if(st&&st.mod){const m=st.mod;setTimeout(()=>{const t=alive('P')[0];if(t)popNum(t,m.icon+' '+m.name+': '+m.desc,'info');},900);}}
// บอสคลั่งเมื่อเลือดเหลือครึ่ง: โจมตีแรงขึ้น เร็วขึ้น และเรียกลูกน้อง
function storyTick(dt){
  if(typeof running==='undefined'||!running||MODE==='raid')return;
  UNITS.forEach(u=>{if(!u.boss||!u.alive||u.side!=='E'||STORY.rage.has(u.id)||u.hp>u.maxHp*.5)return;STORY.rage.add(u.id);
    u.atk=Math.round(u.atk*1.3);u.spd=Math.round(u.spd*1.2);banner(u.name+' คลั่ง!','boss');shake=Math.max(shake,.3);
    shockRing(u.w.position.clone().setY(.08),0xff4a2a);particles(u.w.position.clone().setY(1.2),0xff6a3a,24,4,.12,1);
    (u.mats||[]).forEach(m=>{if(m.emissive){m.emissive.setHex(0x3a0800);}});
    const T=STORY.theme||STORY_REALM.null;
    const adds=[T.mid,T.minion].map(r=>Object.assign({sp:r.sp,name:r.name,lv:u.defLv||1,mul:(u.defMul||1)*.8,show:u.lv},T.tint?{tint:T.tint}:{}));
    try{if(typeof rtSpawn==='function'){rtSpawn(adds);popNum(u,'เรียกลูกน้อง!','info');}}catch(e){console.warn(e);}
  });
}
