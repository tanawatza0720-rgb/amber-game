/* ================= บุกปล้นบ้านเพื่อน =================
   กด "บุกปล้น" ในรายชื่อเพื่อน → เข้าเกาะเพื่อน มีป้าย ⚔ บนหัวมอนสเตอร์ → แตะเลือกเป้า → เลือกมอนสเตอร์ของเรา 4 ตัว
   เห็นโอกาสชนะและโอกาสสูญเสียรายตัวก่อนกด · ผลสุ่มที่เซิร์ฟเวอร์ (server/migrate_friend_raid.sql) แล้วเล่นฉากต่อสู้บนเกาะเพื่อน */
var FRD={on:false,info:null,f:null,code:null,mons:null,target:null,tag:null,sel:[],arm:false,badges:[],bob:null,busy:false};
let _raidTex=null;
function raidBadgeTex(){if(_raidTex)return _raidTex;_raidTex=srgb(canvasTex(128,(x,s)=>{x.clearRect(0,0,s,s);
  const g=x.createRadialGradient(s/2,s*.42,4,s/2,s*.42,s*.4);g.addColorStop(0,'#ff8a5a');g.addColorStop(1,'#b3261e');x.fillStyle=g;x.beginPath();x.arc(s/2,s*.42,s*.36,0,6.3);x.fill();
  x.lineWidth=5;x.strokeStyle='#ffe3a0';x.stroke();x.font=`${s*.4}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('⚔️',s/2,s*.43);
  x.beginPath();x.moveTo(s*.42,s*.76);x.lineTo(s*.58,s*.76);x.lineTo(s/2,s*.9);x.closePath();x.fillStyle='#b3261e';x.fill();}));return _raidTex;}
const raidWin=(ap,dp,I)=>Math.min(I.win_max,Math.max(I.win_min,ap/Math.max(ap+dp,1)));
const raidLoss=(w,I,m)=>(w*I.die_win+(1-w)*I.die_lose)*(m&&I.die_k?(I.die_k[spOf(m).rar]!=null?I.die_k[spOf(m).rar]:1):1);
function raidEnter(r,code){
  const I=r.raid;FRD.info=I;FRD.f=r.friend;FRD.code=code;FRD.mons=r.monsters||[];
  FRD.rev=!!r.revenge;
  if(!FRD.rev){if(I.raided.includes(code)){toast('วันนี้บุกปล้น '+r.friend.name+' ไปแล้ว พรุ่งนี้มาใหม่นะ');return;}
    if(I.left<=0){toast('วันนี้บุกปล้นครบ '+I.per_day+' ครั้งแล้ว');return;}}
  FRD.on=true;VISIT.raid=true;
  AGENTS.forEach((ag,i)=>{if(!ag.data||ag.data.uid>=0)return;const b=new THREE.Sprite(new THREE.SpriteMaterial({map:raidBadgeTex(),transparent:true,depthTest:false,fog:false}));
    b.scale.set(2,2,1);b.renderOrder=9;b.userData.agent=i;b.userData.ag=ag;scene.add(b);PICK.push(b);FRD.badges.push(b);});
  const place=()=>{const t=performance.now()/1000;FRD.badges.forEach((b,i)=>{const ag=b.userData.ag,p=ag.w.position;b.position.set(p.x,p.y+(ag.fly?2.6:3.1)+Math.sin(t*3+i)*.15,p.z);});};
  place();clearInterval(FRD.bob);FRD.bob=setInterval(place,40);
  const bar=$('#visitBar');bar.classList.add('raiding');
  const note=el('div','vbRaid',FRD.rev?'😤 เอาคืน! แตะป้ายบนหัวมอนสเตอร์เพื่อเลือกเป้า · ส่งได้ '+I.n+' ตัว · ไม่นับโควตาวันนี้':'⚔ โหมดบุกปล้น · แตะป้ายบนหัวมอนสเตอร์เพื่อเลือกเป้า · ส่งได้ '+I.n+' ตัว · เหลือวันนี้ '+I.left+'/'+I.per_day+' ครั้ง');bar.append(note);
  toast(FRD.rev?'ได้เวลาเอาคืน '+r.friend.name+'! 👊':'เลือกมอนสเตอร์ของ '+r.friend.name+' ที่จะบุก!');
}
function raidExit(){FRD.on=false;VISIT.raid=false;clearInterval(FRD.bob);FRD.bob=null;
  FRD.badges.forEach(b=>{scene.remove(b);const i=PICK.indexOf(b);if(i>=0)PICK.splice(i,1);b.material.dispose();});FRD.badges=[];
  const bar=$('#visitBar');bar.classList.remove('raiding');const n=bar.querySelector('.vbRaid');if(n)n.remove();}
// ตัวเราตอนอยู่บ้านเพื่อน อยู่ใน VISIT.save.mons
const raidMine=()=>(VISIT.save&&VISIT.save.mons)||[];
const raidPow=m=>{const p=FRD.info&&FRD.info.mpow&&FRD.info.mpow[m.uid];return p!=null?p:power(m);};
function raidTapAgent(ag){if(!FRD.on||!ag.data||ag.data.uid>=0)return false;
  const m=FRD.mons.find(x=>-Number(x.id)===ag.data.uid);if(!m)return false;
  if(FRD.target!==m){FRD.target=m;FRD.tag=ag;FRD.sel=[];FRD.arm=false;}
  const w=ag.w;tween(.3,t=>w.position.y=Math.sin(t*Math.PI)*.4);raidPick();return true;}
function raidPick(){
  const I=FRD.info,T=FRD.target,dp=Math.round(T.pow*I.def_k),mine=raidMine();
  FRD.sel=FRD.sel.filter(u=>mine.some(m=>m.uid===u)).slice(0,I.n);
  const party=FRD.sel.map(u=>mine.find(m=>m.uid===u)),ap=party.reduce((a,m)=>a+raidPow(m),0);
  const w=party.length===I.n?raidWin(ap,dp,I):0,loss=raidLoss(w,I),d=el('div','exp');
  // เป้า
  const hd=el('div','exHead');const tc=icon({uid:-T.id,sp:T.sp,lv:T.lv,stars:T.stars||0,el:T.el||null});tc.style.width='52px';hd.append(tc);
  const t=el('div');t.append(el('b',null,spOf(T).name+' Lv'+T.lv+' ของ '+FRD.f.name));t.append(el('small',null,'พลังป้องกัน '+fmt(dp)+' (สู้ในบ้านตัวเอง ×'+I.def_k+')'));hd.append(t);d.append(hd);
  // ทีมบุก 4 ช่อง
  const slots=el('div','exSlots rdSlots');
  for(let i=0;i<I.n;i++){const m=party[i];if(m){const c=icon(m);if(party.length===I.n){const lm=raidLoss(w,I,m);c.append(el('span','exRisk'+(lm>.15?' hi':lm>.08?' mid':''),(lm*100).toFixed(lm<.1?1:0)+'%'));}c.onclick=()=>{FRD.sel=FRD.sel.filter(u=>u!==m.uid);FRD.arm=false;raidPick();};slots.append(c);}
    else slots.append(el('div','exEmpty','+'));}
  d.append(slots);
  const st=el('div','rdStat');
  if(party.length===I.n){const odds=el('div','rdOdds');const wb=el('i');wb.style.width=(w*100)+'%';odds.append(wb);st.append(odds);
    const exp=party.reduce((a,m)=>a+raidLoss(w,I,m),0);
    st.append(el('div','rdLine','พลังบุก '+fmt(ap)+' vs '+fmt(dp)+' · โอกาสชนะ '+Math.round(w*100)+'%'));
    st.append(el('div','rdLine dim','โอกาสสูญเสียดูที่ตัวเลขบนแต่ละตัว (ยิ่งระดับสูงยิ่งรอดง่าย · พื้นฐาน ชนะ '+Math.round(I.die_win*100)+'% / แพ้ '+Math.round(I.die_lose*100)+'%) · คาดว่าจะเสียราว '+exp.toFixed(1)+' ตัว'));
    const cp=(I.cap&&I.cap[spOf(T).rar])||0;
    st.append(el('div','rdLine gold','ชนะได้ราว '+fmt(Math.round(T.pow*(I.loot_k||1.2)))+' เหรียญ (+ลุ้นอัมพร)'));
    if(cp)st.append(el('div','rdLine cap','✨ ชนะแล้วมีโอกาส '+(cp*100).toFixed(cp<.05?1:0)+'% ได้ '+spOf(T).name+' มาเป็นของเรา'));}
  else st.append(el('div','rdLine dim','เลือกมอนสเตอร์ของเรา '+I.n+' ตัว (เหลืออีก '+(I.n-party.length)+')'));
  d.append(st);
  const L=el('div','exList'),cands=[...mine].sort((a,b)=>raidPow(b)-raidPow(a));
  const w0=party.length===I.n?w:.5;
  cands.forEach(m=>{const c=icon(m),on=FRD.sel.includes(m.uid);if(on)c.classList.add('on');{const lm=raidLoss(w0,I,m);c.append(el('span','exRisk'+(lm>.15?' hi':lm>.08?' mid':''),(lm*100).toFixed(lm<.1?1:0)+'%'));}
    c.onclick=()=>{if(on)FRD.sel=FRD.sel.filter(u=>u!==m.uid);else if(FRD.sel.length<I.n)FRD.sel.push(m.uid);else{toast('ส่งได้ '+I.n+' ตัว');return;}FRD.arm=false;raidPick();};L.append(c);});
  d.append(el('div','exHint','ตัวที่มีธงคืออยู่ในทีมต่อสู้ ถ้าไม่กลับมาจะหายจากทีมด้วย · ตัวที่ไม่กลับมาได้วิญญาณชดเชย'));d.append(L);
  const risky=party.filter(m=>(VISIT.save.team||[]).includes(m.uid)||(m.stars||0)>0||spOf(m).rar>=4);
  openSheet(FRD.rev?'เอาคืน!':'บุกปล้น',FRD.rev?'ไม่นับโควตาวันนี้':'เหลือวันนี้ '+I.left+'/'+I.per_day+' ครั้ง',d,[['ยกเลิก',()=>{closeSheet();},''],
    [FRD.arm?'ยืนยันบุก! (มีตัวในทีม/หายาก '+risky.length+')':'⚔ บุกปล้น'+(party.length===I.n?' · ชนะ '+Math.round(w*100)+'%':''),async()=>{
      if(risky.length&&!FRD.arm){FRD.arm=true;toast('มี '+risky.map(m=>spOf(m).name).join(', ')+' ที่อาจไม่กลับมา · กดอีกครั้งเพื่อยืนยัน');raidPick();return;}
      raidGo(party);},'main',party.length!==I.n]]);
}
async function raidGo(party){
  if(FRD.busy)return;FRD.busy=true;
  let r=null;try{r=await api('friend_raid',{code:FRD.code,target:Number(FRD.target.id),mon_ids:party.map(m=>m.uid)});}catch(e){toast(ERR[e.code]||ERR.network);}
  FRD.busy=false;if(!r)return;
  closeSheet();
  // สถานะใหม่ของเรา: เก็บไว้ใช้ตอนกลับบ้าน
  VISIT.home=r.state;VISIT.save.mons=(r.state.monsters||[]).map(m=>({uid:Number(m.id),sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null}));VISIT.save.team=(r.state.player.team||[]).map(Number);
  if(FR.st&&FR.raid){FR.raid=r.info;}
  const tag=FRD.tag,info=r.info;raidExit();FRD.info=info;
  await raidAnim(tag,party,r);
  raidResult(r,party);
}
async function raidAnim(tag,party,r){
  const start=AGENTS.length,P=tag.w.position.clone(),TA=tag.inner.userData;
  const has=(A,c)=>A&&A.play&&A.clipInfo&&A.clipInfo(c);
  tag.hold=true; if(typeof camTTo!=='undefined'){camTTo.set(P.x,0,P.z+1.5);if(typeof FARM_ZMIN!=='undefined')distTo=FARM_ZMIN+4;}
  const ags=party.map((m,i)=>{const a=i/party.length*6.283+.5,x=P.x+Math.cos(a)*7,z=P.z+Math.sin(a)*7;
    const ag=addAgent({sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el,uid:1e9+i},[x,z],true);ag.hold=true;ag.m=m;
    const r=ag.fly?3.2:1.8;ag.fx=x;ag.fz=z;ag.fy=ag.fly?3:0;ag.tx=P.x+Math.cos(a)*r;ag.tz=P.z+Math.sin(a)*r;ag.ty=ag.fly?2.4:0;
    ag.w.position.set(x,ag.fy,z);ag.w.rotation.set(0,Math.atan2(P.x-x,P.z-z),0);const A=ag.inner.userData;if(A.play&&A.clipInfo&&A.clipInfo('run'))A.play('run',{loop:true,fade:.1});return ag;});
  if(typeof smoke==='function')ags.forEach(ag=>smoke(ag.w.position.clone().setY(.4)));
  await tween(1.4,k=>ags.forEach(ag=>ag.w.position.set(ag.fx+(ag.tx-ag.fx)*k,ag.fy+(ag.ty-ag.fy)*k,ag.fz+(ag.tz-ag.fz)*k)),easeOut);
  ags.forEach(ag=>{const A=ag.inner.userData;if(A.play&&A.clipInfo&&A.clipInfo('idle'))A.play('idle',{loop:true,fade:.2});});
  if(!tag.fly)tag.w.rotation.y=Math.atan2(ags[0].w.position.x-P.x,ags[0].w.position.z-P.z);
  for(let k=0;k<3;k++){ags.forEach((ag,i)=>{const A=ag.inner.userData;if(has(A,'slash'))setTimeout(()=>A.play(k%2?'slash2':'slash',{fade:.08}),i*90);});
    await tween(.45,()=>{});particles(P.clone().setY(1.2),0xfff0c0,14,3,.07,1.5);particles(P.clone().setY(1),0xff7a3a,8,2.2,.1,1);
    if(has(TA,'hit'))TA.play('hit',{fade:.05});tween(.25,t=>tag.w.position.x=P.x+Math.sin(t*Math.PI*4)*.15);
    if(k===1&&has(TA,'slash'))TA.play('slash',{fade:.1});await tween(.35,()=>{});}
  const deadIds=new Set((r.dead||[]).map(d=>Number(d.id)));
  const capd=r.captured&&!r.captured.full;
  if(r.win&&capd){for(let j=0;j<5;j++)setTimeout(()=>{particles(P.clone().setY(1.2),0xbfe8ff,16,2.5,.1,-1.2);particles(P.clone().setY(.4),0xfff0a0,10,1.5,.08,-2);},j*160);
    if(typeof popDmg==='function')try{popDmg(tag.w,'✨ จับได้!','#bfe8ff');}catch(e){}}
  if(r.win){if(has(TA,'death'))TA.play('death',{fade:.1,hold:true});else tween(.5,t=>tag.inner.rotation.z=t*1.4);
    for(let j=0;j<4;j++)setTimeout(()=>particles(P.clone().setY(1.6),0xffd34d,18,4,.09,2.2),j*180);}
  else ags.forEach(ag=>{const A=ag.inner.userData;if(has(A,'hit'))A.play('hit',{fade:.05});});
  await tween(.7,()=>{});
  // ตัวที่ไม่กลับมา: จางหายไป
  ags.forEach(ag=>{if(deadIds.has(Number(ag.m.uid))){const w=ag.w;w.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.transparent=true;}});
    particles(w.position.clone().setY(1),0xb8a8ff,16,1.2,.12,-1);tween(1.2,t=>{w.position.y=-t*.8;w.traverse(o=>{if(o.isMesh&&o.material)o.material.opacity=1-t;});});}
    else if(r.win){const A=ag.inner.userData;if(has(A,'victory'))A.play('victory',{fade:.2});}});
  await tween(1.6,()=>{});
  for(let i=AGENTS.length-1;i>=start;i--){scene.remove(AGENTS[i].w);AGENTS.pop();}
  for(let i=PICK.length-1;i>=0;i--)if(PICK[i].userData.agent!=null&&PICK[i].userData.agent>=start)PICK.splice(i,1);
  tag.inner.rotation.z=0;if(TA.play)TA.play('idle',{loop:true,fade:.3});tag.hold=false;tag.state='idle';tag.wait=2;
}
function raidResult(r,party){
  const d=el('div','exp'),dead=r.dead||[],alive=r.alive||[];
  d.append(el('h4',null,r.win?(r.revenge?'เอาคืนสำเร็จ! สาแก่ใจ 😎':'บุกสำเร็จ! 🏆'):'บุกไม่สำเร็จ…'));
  d.append(el('p','frNote','โอกาสชนะ '+Math.round(r.win_p*100)+'% · กลับมา '+alive.length+' จาก '+(alive.length+dead.length)+' ตัว'));
  const ok=el('div','exSlots rdSlots');alive.forEach(m=>ok.append(icon({uid:-m.id,sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null})));d.append(ok);
  if(dead.length){d.append(el('h4','exDeadH','ไม่ได้กลับมา'));const ds=el('div','exSlots rdSlots');dead.forEach(m=>{const c=icon({uid:-m.id,sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null});c.classList.add('dead');c.append(el('span','exSoulB','👻'+m.souls));ds.append(c);});d.append(ds);}
  if(r.captured){const cb=el('div','rdCap'),c=r.captured;
    if(c.full){cb.append(el('b',null,'✨ เกือบได้ '+spOf(c).name+' แล้ว!'));cb.append(el('small',null,'แต่คลังมอนสเตอร์เต็ม เลยพามาไม่ได้'));}
    else{const ic=icon({uid:-1,sp:c.sp,lv:c.lv,stars:0,el:c.el||null});cb.append(ic);const t=el('div');t.append(el('b',null,'✨ ได้ '+spOf(c).name+' Lv'+c.lv+' มาเป็นของเรา!'));t.append(el('small',null,'โอกาส '+(r.cap_p*100).toFixed(r.cap_p<.05?1:0)+'% · อยู่ในคลังมอนสเตอร์แล้ว (ดาวเริ่มที่ 0)'));cb.append(t);}
    d.insertBefore(cb,d.children[2]||null);}
  const R=[];if(r.win){R.push(['เหรียญที่ปล้นได้','+'+fmt(r.coins),'#ffd34d']);if(r.amber)R.push(['อัมพรโบนัส','+'+r.amber,'#ffb347']);R.push([FRD.f.name+' เสียไป',fmt(r.lost)+' เหรียญ','#ff9a8a']);}
  if(r.souls)R.push(['วิญญาณ','+'+r.souls,'#c9b8ff']);if(R.length)d.append(rows(R));
  const acts=[['อยู่ต่อ',()=>closeSheet(),''],['🏠 กลับบ้าน',()=>{closeSheet();leaveVisit();},'main']];
  if(VISIT.kind==='random')acts.splice(1,0,['🎲 สุ่มบ้านต่อ',()=>{closeSheet();VISIT.back=false;leaveVisit();setTimeout(raidRandom,400);},'']);
  openSheet(r.win?'บุกปล้นสำเร็จ':'บุกปล้นล้มเหลว',FRD.f.name,d,acts);
}

/* ---------- เกาะเล็กรอบบ้าน: สุ่มบ้านผู้เล่นอื่นเพื่อบุกปล้น ---------- */
var ISB=[];
function isletBadges(on){
  if(on&&(NET.mode!=='online'||!S.race))on=false;
  if(on&&!ISB.length&&typeof ISLETS!=='undefined')ISLETS.forEach((g,i)=>{const b=new THREE.Sprite(new THREE.SpriteMaterial({map:raidBadgeTex(),transparent:true,depthTest:false,fog:false}));
    b.scale.set(3.2,3.2,1);b.position.set(0,4.2,0);b.renderOrder=9;b.userData.islet=1;g.add(b);PICK.push(b);ISB.push(b);});
  ISB.forEach(b=>b.visible=!!on);}
setInterval(()=>{if(!ISB.length)return;const t=performance.now()/1000;ISB.forEach((b,i)=>{b.position.y=4.2+Math.sin(t*2.4+i)*.3;const s=3.2+Math.sin(t*4+i)*.15;b.scale.set(s,s,1);});},60);
setInterval(()=>{if(typeof entered!=='undefined'&&entered&&!VISIT.on)isletBadges(true);},3000);
async function raidRandom(){
  if(VISIT.on||FRD.busy)return;if(NET.mode!=='online'){toast('ต้องเข้าสู่ระบบก่อน');return;}
  FRD.busy=true;let r=null;toast('🎲 กำลังสุ่มบ้านเป้าหมาย…');
  try{r=await api('raid_random');}catch(e){toast(ERR[e.code]||ERR.network);}
  FRD.busy=false;if(!r)return;
  await visitFriend(r.friend.code,true,{payload:r,back:false});
}
/* ---------- แจ้งเตือนโดนบุกปล้น + เอาคืน ---------- */
async function raidInbox(){
  if(NET.mode!=='online')return;let r=null;try{r=await api('raid_inbox');}catch(e){return;}
  const L=(r&&r.raids)||[];if(!L.length)return;
  let pop=$('#raidPop');if(!pop){pop=document.createElement('div');pop.id='raidPop';document.body.append(pop);}
  pop.innerHTML='';const card=el('div','rpCard');
  const lost=L.filter(x=>x.win).reduce((a,x)=>a+x.lost,0);
  card.append(el('div','rpIc','⚔️'));card.append(el('h3',null,L.length>1?'บ้านคุณโดนบุก '+L.length+' ครั้ง!':'บ้านคุณโดนบุกปล้น!'));
  if(lost)card.append(el('p','rpSub','เสียไปทั้งหมด '+fmt(lost)+' เหรียญ'));
  const list=el('div','rpList');
  L.slice(0,5).forEach(x=>{const R=RACES[x.race],row=el('div','rpRow');const av=el('span','frAv',R?R.icon:'🌱');if(R)av.style.background=R.c+'33';row.append(av);
    const t=el('div','frInfo');t.append(el('b',null,x.name+(x.is_revenge?' (เอาคืน)':'')));t.append(el('small',null,(x.win?'ปล้นสำเร็จ · เสีย '+fmt(x.lost)+' เหรียญ':'บุกมาแต่แพ้กลับไป 💪')+' · พลัง '+fmt(x.power||0)));row.append(t);
    if(x.revenge){const b=el('button','rpGo','หวดมันคืนเลยมั้ยเพ่! 👊');b.onclick=()=>{pop.remove();visitFriend(x.code,true,{rpc:'raid_visit',back:false});};row.append(b);}
    list.append(row);});
  card.append(list);
  const close=el('button','rpClose','ช่างมันเถอะ');close.onclick=()=>pop.remove();card.append(close);
  pop.append(card);
}
{let asked=false;setInterval(()=>{if(asked||typeof entered==='undefined'||!entered||NET.mode!=='online'||VISIT.on)return;
  if(document.body.classList.contains('raceOpen')||(typeof GD!=='undefined'&&GD.on))return;asked=true;setTimeout(raidInbox,1500);},1500);}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&typeof entered!=='undefined'&&entered&&!VISIT.on&&!$('#raidPop'))raidInbox();});
if(/[?&]dbg=1/.test(location.search))window.__frd={AGENTS,raidTapAgent,FRD,raidRandom,raidInbox,ISB};
