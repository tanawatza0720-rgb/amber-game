/* ================= แท่นบูชาวิญญาณ: สังเวยตัวระดับทั่วไป → วิญญาณ · ร้านแลกวิญญาณ =================
   server/migrate_altar.sql: altar_state() / soul_sacrifice(ids) / soul_buy('gold'|'god') · แลกอัมพรใช้ soul_exchange(sets) เดิม
   สังเวยได้เฉพาะ: ระดับทั่วไป (rar 1) · ไม่มีดาว · ไม่อยู่ในทีม · Lv ต่ำกว่า 10 = 1 วิญญาณ · Lv 10 ขึ้นไป = 2
   แท่นหินในฟาร์ม (building 'altar') แตะแล้วเปิดหน้าต่าง · ไฟวิญญาณลุกตอนสังเวย (altarBurst) · กระเป๋าเต็มตอนฟักไข่ → altarOverflow */
var ALT={souls:null,gold:30,god:200,lv2:10,sel:new Set(),confirmAt:0};
const altarSoulOf=m=>m.lv>=ALT.lv2?2:1;
const altarOk=m=>spOf(m).rar===1&&!(m.stars>0)&&!S.team.includes(m.uid);
const altarList=()=>S.mons.filter(altarOk).sort((a,b)=>a.lv-b.lv||a.uid-b.uid);

/* ---------- แท่นหินกลางฟาร์ม ---------- */
const ALTAR=(()=>{
  const spots=[[-8.2,5.4],[-9.6,3],[-6.6,7.4],[8.6,-1.2],[-10.4,-3.4],[3.6,7.6]];
  let pos=spots.find(([x,z])=>onIsland(x,z,2)&&!BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+1.9))||[-8,5];
  const stone=SM(0x2e2a3a,{roughness:.95,metalness:.1}), stoneD=SM(0x1c1924,{roughness:1}), rune=SM(0x6a4cff,{emissive:0x5a3cff,emissiveIntensity:.9,roughness:.6});
  const fires=[], wisps=[];
  const g=building('altar','แท่นบูชาวิญญาณ',pos[0],pos[1],1.7,g=>{
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.75,.35,8),stoneD);base.position.y=.17;g.add(base);
    const step=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.3,.35,8),stone);step.position.y=.52;g.add(step);
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,1.1,8),stone);col.position.y=1.24;g.add(col);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.95,.55,.42,10,1,true),stone);bowl.material=stone;bowl.position.y=1.98;g.add(bowl);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(.9,20),new THREE.MeshBasicMaterial({color:0x4a2fb8}));pool.rotation.x=-Math.PI/2;pool.position.y=2.08;g.add(pool);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.95,.08,6,20),stoneD);lip.rotation.x=Math.PI/2;lip.position.y=2.19;g.add(lip);
    for(let i=0;i<8;i++){const a=i/8*6.283,r=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,.04),rune);r.position.set(Math.cos(a)*1.21,.55,Math.sin(a)*1.21);r.rotation.y=-a+Math.PI/2;g.add(r);}
    // เสาเตี้ย 4 ต้นรอบแท่น
    for(let i=0;i<4;i++){const a=i/4*6.283+.785,p=new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,1.1,6),stone);p.position.set(Math.cos(a)*1.55,.55,Math.sin(a)*1.55);g.add(p);
      const gm=new THREE.Mesh(new THREE.OctahedronGeometry(.13),rune);gm.position.set(p.position.x,1.2,p.position.z);g.add(gm);wisps.push({o:gm,a,k:'gem'});}
  });
  // ไฟวิญญาณในชาม (สไปรต์เรือง) + ดวงวิญญาณลอยวน
  for(let i=0;i<5;i++){const f=glow(g,i%2?0x7a3cff:0x3f6cff,2,[(Math.random()-.5)*.5,2.5,(Math.random()-.5)*.6],.85);f.material.blending=THREE.NormalBlending;f.userData.b=[f.scale.x,Math.random()*6];fires.push(f);}
  for(let i=0;i<3;i++){const w=glow(g,0xc9b8ff,.35,[0,2.6,0],.9);w.material.blending=THREE.NormalBlending;wisps.push({o:w,a:i/3*6.283,k:'wisp'});}
  const halo=glow(g,0x7a5cff,4,[0,1.2,0],.18);
  // ---- เอฟเฟกต์เพิ่ม: วงเวทบนพื้น 2 วง · ม่านวิญญาณ · ดวงวิญญาณลอยขึ้น · ผลึกลอยวน · คลื่นวงตอนสังเวย ----
  const cvTex=(n,draw)=>{const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;};
  const runeTex=(outer)=>cvTex(512,(x,n)=>{const h=n/2;x.translate(h,h);if(outer){const gr=x.createRadialGradient(0,0,60,0,0,250);gr.addColorStop(0,'rgba(50,20,110,.45)');gr.addColorStop(.85,'rgba(60,25,140,.3)');gr.addColorStop(1,'rgba(60,25,140,0)');x.fillStyle=gr;x.beginPath();x.arc(0,0,250,0,6.283);x.fill();}
    x.strokeStyle='#a98aff';x.fillStyle='#b9a0ff';x.shadowColor='#6a2cff';x.shadowBlur=18;
    const ring=(r,w)=>{x.lineWidth=w;x.beginPath();x.arc(0,0,r,0,6.283);x.stroke();};
    if(outer){ring(244,8);ring(222,4);ring(150,5);
      x.font='bold 36px serif';x.textAlign='center';x.textBaseline='middle';const G='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
      for(let i=0;i<24;i++){x.save();x.rotate(i/24*6.283);x.fillText(G[i],0,-188);x.restore();}
      x.lineWidth=4;for(let k=0;k<2;k++){x.beginPath();for(let i=0;i<=3;i++){const a=(i/3)*6.283+k*Math.PI/3-Math.PI/2;i?x.lineTo(Math.cos(a)*150,Math.sin(a)*150):x.moveTo(Math.cos(a)*150,Math.sin(a)*150);}x.stroke();}
    }else{ring(120,7);ring(96,4);for(let i=0;i<8;i++){x.save();x.rotate(i/8*6.283);x.beginPath();x.moveTo(0,-96);x.lineTo(14,-120);x.lineTo(-14,-120);x.closePath();x.fill();x.restore();}}
  });
  const flatMat=(map,op)=>new THREE.MeshBasicMaterial({map,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const ringO=new THREE.Mesh(new THREE.PlaneGeometry(5.6,5.6),flatMat(runeTex(true),.9));ringO.rotation.x=-Math.PI/2;ringO.position.y=.05;g.add(ringO);
  const ringI=new THREE.Mesh(new THREE.PlaneGeometry(4.4,4.4),flatMat(runeTex(false),.8));ringI.rotation.x=-Math.PI/2;ringI.position.y=.38;g.add(ringI);
  // ม่านวิญญาณ: ทรงกระบอกโปร่ง ไล่จางขึ้นบน เลื่อนลาย
  const veilT=cvTex(128,(x,n)=>{const gr=x.createLinearGradient(0,n,0,0);gr.addColorStop(0,'rgba(140,100,255,.9)');gr.addColorStop(.5,'rgba(90,120,255,.35)');gr.addColorStop(1,'rgba(90,120,255,0)');x.fillStyle=gr;x.fillRect(0,0,n,n);
    x.globalCompositeOperation='destination-out';for(let i=0;i<9;i++){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(i*14+Math.random()*6,0,5+Math.random()*5,n);}});
  veilT.wrapS=THREE.RepeatWrapping;
  const veil=new THREE.Mesh(new THREE.CylinderGeometry(.8,.92,3.2,20,1,true),new THREE.MeshBasicMaterial({map:veilT,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  veil.position.y=3.75;g.add(veil);
  // ดวงวิญญาณลอยขึ้นจากบ่อ (pool ใช้ซ้ำ)
  const rise=[];for(let i=0;i<14;i++){const w=glow(g,i%3?0x8a5cff:0x5a8cff,.34,[0,2.2,0],0);w.material.blending=THREE.NormalBlending;rise.push({o:w,t:i/14,a:Math.random()*6.283,r:.2+Math.random()*.5,sp:.18+Math.random()*.12});}
  // ผลึกลอยวน 3 ชิ้น
  const shardM=new THREE.MeshStandardMaterial({color:0x9a7cff,emissive:0x5a2cff,emissiveIntensity:.8,roughness:.25,metalness:.2,transparent:true,opacity:.92});
  const shards=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.28),shardM);m.scale.y=1.9;g.add(m);shards.push({o:m,a:i/3*6.283});}
  // คลื่นวงตอนสังเวย
  const waveT=cvTex(256,(x,n)=>{const h=n/2,gr=x.createRadialGradient(h,h,h*.78,h,h,h);gr.addColorStop(0,'rgba(160,120,255,0)');gr.addColorStop(.6,'rgba(160,120,255,.95)');gr.addColorStop(1,'rgba(160,120,255,0)');x.fillStyle=gr;x.fillRect(0,0,n,n);});
  const waves=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),flatMat(waveT,0));m.rotation.x=-Math.PI/2;m.position.y=.12;m.visible=false;g.add(m);return {m,t:9};});
  let burst=0;
  function fxTick(dt,T){
    const k=1+burst*.8;
    ringO.rotation.z=T*.12; ringI.rotation.z=-T*.25; ringO.material.opacity=Math.min(1,.78+.15*Math.sin(T*1.6)+burst*.2); ringI.material.opacity=Math.min(1,.75+.2*Math.sin(T*2.1+1)+burst*.2);
    veilT.offset.x=T*.06; veil.material.opacity=Math.min(.9,(.5+.1*Math.sin(T*2))*(1+burst*.6)); veil.scale.set(1+burst*.15,1+burst*.35,1+burst*.15);
    rise.forEach(p=>{p.t+=dt*p.sp*k;if(p.t>1){p.t-=1;p.a=Math.random()*6.283;p.r=.2+Math.random()*.5;}
      const a=p.a+p.t*4;p.o.position.set(Math.cos(a)*p.r*(1-p.t*.4),2.2+p.t*3.6,Math.sin(a)*p.r*(1-p.t*.4));p.o.material.opacity=Math.sin(p.t*Math.PI)*.9;p.o.scale.setScalar(.3+.25*Math.sin(p.t*Math.PI));});
    shards.forEach((sd,i)=>{const a=sd.a+T*.5;sd.o.position.set(Math.cos(a)*1.9,3.1+.25*Math.sin(T*1.4+i*2),Math.sin(a)*1.9);sd.o.rotation.y=T*1.8+i;});
    shardM.emissiveIntensity=.7+.3*Math.sin(T*2.4)+burst*.8;
    waves.forEach(w=>{if(w.t>=1.2){w.m.visible=false;return;}w.t+=dt;const q=Math.min(1,w.t/1.2),s=1.5+q*7;w.m.scale.set(s,s,1);w.m.material.opacity=(1-q)*.85;});
  }
  function waveNow(){waves.forEach((w,i)=>{w.t=-i*.25;w.m.visible=true;w.m.scale.set(1.5,1.5,1);w.m.material.opacity=0;});}
  function tick(dt,T){
    const b=1+burst*1.1;
    fires.forEach((f,i)=>{const [s,a]=f.userData.b;{const k=s*b*(.85+.25*Math.sin(T*8+a)+.1*Math.sin(T*19+a*2));f.scale.set(k*.7,k*1.5,1);}f.position.y=2.75+.15*Math.sin(T*3+a)+burst*.6+.08*Math.sin(T*5+a);f.material.opacity=(.95+.05*Math.sin(T*11+a))/(1+burst*.6);});
    wisps.forEach(w=>{if(w.k==='wisp'){const a=w.a+T*.9;w.o.position.set(Math.cos(a)*1.25,2.5+Math.sin(T*1.7+w.a)*.25,Math.sin(a)*1.25);}else w.o.rotation.y=T*1.5+w.a;});
    fxTick(dt,T);
    halo.material.opacity=.12+.06*Math.sin(T*1.3)+burst*.12; burst=Math.max(0,burst-dt*.7);
  }
  return {g,tick,pos,burstNow:k=>{burst=Math.min(1.5,burst+k);waveNow();}};
})();
function altarTick(dt,T){ALTAR.tick(dt,T);}
function altarBurst(n){
  ALTAR.burstNow(1); const p=new THREE.Vector3(ALTAR.pos[0],2.4,ALTAR.pos[1]);
  particles(p,0x7a5cff,Math.min(60,20+n*3),2.4,.09,-1.4,.75); particles(p,0x4fb8ff,Math.min(40,14+n*2),1.6,.05,-1.8,.7);
}

/* ---------- หน้าต่างแท่นบูชา ---------- */
async function loadAltar(){if(NET.mode!=='online')return null;try{const r=await api('altar_state');Object.assign(ALT,{souls:r.souls,gold:r.gold,god:r.god,lv2:r.lv2,godEggs:r.god_eggs});return r;}catch(e){console.warn('altar',e);return null;}}
async function openAltar(){
  if(NET.mode!=='online'){openSheet('แท่นบูชาวิญญาณ','',para('ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนจึงจะสังเวยหรือแลกวิญญาณได้'),[]);return;}
  ALT.sel=new Set(); openSheet('แท่นบูชาวิญญาณ','กำลังจุดไฟ…',para('กำลังโหลด…'),[]);
  const r=await loadAltar(); if($('#shTitle').textContent!=='แท่นบูชาวิญญาณ')return;
  if(!r){openSheet('แท่นบูชาวิญญาณ','',para('เชื่อมต่อแท่นบูชาไม่ได้ ลองใหม่อีกครั้ง (ถ้าเพิ่งอัปเดต อาจรอผู้ดูแลเปิดระบบ)'),[]);return;}
  renderAltar();
}
function renderAltar(){
  const L=altarList(); ALT.sel.forEach(id=>{if(!L.some(m=>m.uid===id))ALT.sel.delete(id);});
  const d=el('div','altar');
  const hero=el('div','alHero');hero.append(el('b',null,'👻 '+fmt(ALT.souls||0)));hero.append(el('span',null,'วิญญาณที่มี'));d.append(hero);
  // สังเวย
  d.append(el('h4','wH','สังเวยมอนสเตอร์ระดับทั่วไป'));
  if(!L.length)d.append(para('ยังไม่มีตัวที่สังเวยได้ (ต้องเป็นระดับทั่วไป ไม่มีดาว และไม่อยู่ในทีม)'));
  else{
    const qs=el('div','alQuick');
    const q=(t,f)=>{const b=el('button','sbtn ghost',t);b.onclick=()=>{ALT.sel=new Set(L.filter(f).map(m=>m.uid));renderAltar();};qs.append(b);};
    q('เลือกทั้งหมด ('+L.length+')',()=>true); q('เลเวลต่ำกว่า 5',m=>m.lv<5); q('ล้าง',()=>false);
    d.append(qs);
    const grid=el('div','alGrid');
    L.forEach(m=>{const c=icon(m);if(ALT.sel.has(m.uid))c.classList.add('sel');c.onclick=()=>{ALT.sel.has(m.uid)?ALT.sel.delete(m.uid):ALT.sel.add(m.uid);renderAltar();};grid.append(c);});
    d.append(grid);
  }
  d.append(el('p','alLock','🔒 ตัวในทีม ตัวที่มีดาว และตัวหายากขึ้นไป สังเวยไม่ได้ · Lv ต่ำกว่า '+ALT.lv2+' ได้ 1 วิญญาณ · Lv '+ALT.lv2+' ขึ้นไปได้ 2'));
  // ร้านแลก
  d.append(el('h4','wH','ร้านแลกวิญญาณ'));
  const shop=el('div','alShop'), s=ALT.souls||0;
  const card=(ic,name,sub,cost,fn)=>{const c=el('div','alItem');c.append(el('i',null,ic));const t=el('div');t.append(el('b',null,name));t.append(el('small',null,sub));c.append(t);
    const b=el('button','sbtn gold','👻 '+cost);b.disabled=s<cost;b.onclick=fn;c.append(b);shop.append(c);};
  card('🥚','ไข่ทองคำ 1 ใบ','ฟักทันที อัตราเดียวกับไข่ทองคำปกติ',ALT.gold,()=>altarBuyGold());
  card('🌟','ไข่เทพ 1 ใบ','เก็บเข้าคลังไข่เทพ ไปฟักที่ประตูผจญภัย'+(ALT.godEggs?' (มีอยู่ '+ALT.godEggs+')':''),ALT.god,()=>altarBuyGod());
  card('🔶','อัมพร 25','แลกวิญญาณ 10 → อัมพร 25',10,()=>altarExchange());
  d.append(shop);
  const n=ALT.sel.size, gain=[...ALT.sel].reduce((a,id)=>{const m=L.find(x=>x.uid===id);return a+(m?altarSoulOf(m):0);},0);
  const confirming=Date.now()-ALT.confirmAt<4000;
  openSheet('แท่นบูชาวิญญาณ','วิญญาณ '+fmt(s),d,[[n?(confirming?'แตะอีกครั้งเพื่อยืนยัน ('+n+' ตัว)':'🔥 สังเวย '+n+' ตัว → +'+gain+' วิญญาณ'):'เลือกตัวที่จะสังเวย',()=>altarSacrifice(),'god',!n]]);
}
async function altarSacrifice(){
  const ids=[...ALT.sel]; if(!ids.length)return;
  if(Date.now()-ALT.confirmAt>4000){ALT.confirmAt=Date.now();renderAltar();return;}
  ALT.confirmAt=0; const r=await act('soul_sacrifice',{ids}); if(!r){renderAltar();return;}
  ALT.souls=r.souls; ALT.sel=new Set(); altarBurst(r.count); if(typeof syncAgents==='function')syncAgents();
  toast('สังเวย '+r.count+' ตัว ได้วิญญาณ +'+r.gain); renderAltar();
}
async function altarBuyGold(){if((ALT.souls||0)<ALT.gold)return; ALT.souls-=ALT.gold; await hatch('soulgold','ไข่ทองคำ (วิญญาณ)'); loadAltar();}
async function altarBuyGod(){const r=await act('soul_buy',{item:'god'});if(!r)return;ALT.souls=r.souls;ALT.godEggs=r.god_eggs;altarBurst(8);
  if(typeof stageLoad==='function')try{stageLoad();}catch(e){}
  toast('ได้ไข่เทพ 1 ใบ! ไปฟักได้ที่ประตูผจญภัย');renderAltar();}
async function altarExchange(){const r=await act('soul_exchange',{sets:1});if(!r)return;ALT.souls=r.exp&&r.exp.souls!=null?r.exp.souls:(ALT.souls||0)-10;bumpRes('amber');toast('ได้รับ 25 อัมพร');renderAltar();}
INFO.altar=()=>openAltar();

/* ---------- กระเป๋าเต็มตอนฟักไข่: เสนอสังเวยตัวทั่วไปที่ไม่ได้ใช้ ---------- */
function altarOverflow(need,retry){
  if(NET.mode!=='online'||S.mons.length+need<=S.slots)return false;
  const L=altarList(); if(!L.length)return false;
  const gain=L.reduce((a,m)=>a+altarSoulOf(m),0), free=S.slots-S.mons.length+L.length;
  const d=el('div');d.append(para('ช่องเก็บมอนสเตอร์เต็ม ('+S.mons.length+'/'+S.slots+') · มีตัวระดับทั่วไปที่ไม่ได้ใช้ '+L.length+' ตัว'));
  const g=el('div','alGrid');L.slice(0,24).forEach(m=>g.append(icon(m)));if(L.length>24)g.append(el('span','alMore','+'+(L.length-24)));d.append(g);
  d.append(el('p','alLock','🔒 ตัวในทีม ตัวที่มีดาว และตัวหายากขึ้นไปจะไม่ถูกสังเวย'));
  openSheet('กระเป๋าเต็ม','สังเวยแล้วได้ +'+gain+' วิญญาณ',d,[
    ['🔥 สังเวย '+L.length+' ตัว แล้วฟักต่อ',async()=>{const r=await act('soul_sacrifice',{ids:L.map(m=>m.uid)});if(!r)return;ALT.souls=r.souls;closeSheet();altarBurst(r.count);
      if(typeof syncAgents==='function')syncAgents();toast('สังเวย '+r.count+' ตัว ได้วิญญาณ +'+r.gain);if(free>=need)setTimeout(retry,700);},'god'],
    ['ไปแท่นบูชา (เลือกเอง)',()=>{closeSheet();focusBuilding('altar');},'ghost'],['ปิด',()=>closeSheet(),'ghost']]);
  return true;
}
// ดีบัก: index.html?dbg=1 → __F.altar(souls) เปิดหน้าแท่นบูชาด้วยข้อมูลจำลอง (ไม่เรียกเซิร์ฟเวอร์)
if(window.__F)Object.assign(window.__F,{altar:(souls,sel)=>{Object.assign(ALT,{souls,godEggs:1});focusBuilding('altar');renderAltar();if(sel)ALT.sel=new Set(altarList().filter(m=>m.lv<sel).map(m=>m.uid));renderAltar();return [ALTAR.pos,altarList().length];},
  altarFull:()=>{const m0=NET.mode;NET.mode='online';const sl=S.slots;S.slots=S.mons.length;const r=altarOverflow(1,()=>{});NET.mode=m0;S.slots=sl;return r;},burst:n=>altarBurst(n),cam:(x,z,d)=>{camTTo.set(x,0,z);distTo=d;}});
