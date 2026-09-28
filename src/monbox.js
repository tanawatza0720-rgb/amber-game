/* ================= คลังมอนสเตอร์ (ดูมอนสเตอร์ที่มี · อัปเลเวล · วิวัฒนาการ · จัดทีม) ================= */
const SPEC={
  kazemaru:{name:'คาเซะมารุ',title:'นินจาฝึกหัดแห่งสายลม',rar:1,el:'ลม',elc:'#6fe0b0',role:'จู่โจม',evo:0,maxLv:20,evolveTo:'kazekiri',
    base:{hp:64,atk:20,def:8,spd:26},lore:'ลูกนินจาตัวจิ๋วที่ฝึกฟันดาบไม้ทุกวัน ดวงตาเรืองแสงกะพริบได้เมื่อตื่นเต้น',
    skills:[['ฟันดาบไม้','ฟันศัตรู 1 ตัว 100%'],['ดาวกระจายจิ๋ว','ขว้างดาวกระจายใส่ศัตรูทุกตัว 55% · คูลดาวน์ 3']]},
  kazekiri:{name:'คาเซะคิริ',title:'เงาสามดาบ',rar:2,el:'ลม',elc:'#6fe0b0',role:'จู่โจม',evo:1,maxLv:40,
    base:{hp:102,atk:34,def:13,spd:42},lore:'นินจาเงาผู้ไร้ใบหน้า พกดาบสามเล่ม เคลื่อนไหวเงียบดั่งสายลมยามค่ำ',
    skills:[['ฟันเงา','ฟันศัตรู 1 ตัว 110%'],['สามดาบวายุ','ฟัน 3 ครั้ง ครั้งละ 70% · คูลดาวน์ 3'],['กระโดดฟัน','ฟาดพื้นใส่ศัตรูทุกตัว 85% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
  yorugumo:{name:'โยรุกุโมะ',title:'จอมเวทแมงมุมราตรี',rar:2,el:'มืด',elc:'#b48cff',role:'เวทมนตร์',evo:1,spider:1,maxLv:40,
    base:{hp:100,atk:34,def:14,spd:38},lore:'จอมเวทร่างครึ่งแมงมุมผู้ถักใยอยู่ในถ้ำลึกใต้ป่าอัมพร ลูกแก้วม่วงในมือทั้งสองรวบรวมแสงจันทร์ไว้เป็นเวทมนตร์',
    skills:[['เขี้ยวพิษ','ยกขาหน้าแทงศัตรู 1 ตัว 110%'],['ลูกแก้วมนตร์ม่วง','ร่ายลูกแก้วเวทใส่ศัตรูทุกตัว 55% · คูลดาวน์ 3'],['กระโจนใยมรณะ','กระโจนลงกลางศัตรูทุกตัว 80% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
  kuroga:{name:'คุโรกะ',title:'นักล่าผ้าคลุมขาด',rar:3,el:'มืด',elc:'#b48cff',role:'จู่โจม',evo:1,rig:'kuroga',maxLv:50,
    base:{hp:130,atk:48,def:16,spd:50},lore:'นักล่าอสูรผู้เดินทางคนเดียวในยามราตรี ผ้าคลุมที่ขาดวิ่นทุกรอยคือร่องรอยของการต่อสู้ ดาบยาวของเขาไม่เคยพลาดเป้า',
    skills:[['ฟันเงาจันทร์','ฟันศัตรู 1 ตัว 120%'],['คมดาบราตรี','ฟัน 3 ครั้ง ครั้งละ 75% · คูลดาวน์ 3'],['ดิ่งฟันสังหาร','กระโดดฟาดศัตรูทุกตัว 90% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
  hakuneko:{name:'ฮาคุเนโกะ',title:'นักดาบแมวขาวแห่งตะวันทอง',rar:3,el:'แสง',elc:'#ffd36a',role:'จู่โจม',evo:1,rig:'hakuneko',maxLv:50,
    base:{hp:120,atk:51,def:14,spd:56},lore:'นักดาบเผ่าแมวขาวผู้ร่าเริง แบกดาบโค้งไว้บนบ่าเสมอ ว่ากันว่าเธอมีเก้าชีวิตและยังไม่เคยใช้หมดสักครั้ง',
    skills:[['ฟันตะวันทอง','ฟันศัตรู 1 ตัว 125%'],['กรงเล็บเก้าชีวิต','ฟัน 3 ครั้ง ครั้งละ 72% · คูลดาวน์ 3'],['ดาบจันทร์เสี้ยว','กระโดดฟันศัตรูทุกตัว 95% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
  morihime:{name:'โมริฮิเมะ',title:'ธิดาหอกแห่งพงไพร',rar:2,el:'ไม้',elc:'#7fd46a',role:'จู่โจม',evo:1,rig:'morihime',maxLv:40,
    base:{hp:110,atk:32,def:17,spd:38},lore:'เอลฟ์ผู้พิทักษ์ป่าลึก ผ้าคลุมปักลายใบไม้พลิ้วตามสายลม หอกยาวของเธอแทงได้แม่นยำราวกับเงาใบไม้ที่ร่วงหล่น',
    skills:[['แทงหอกพงไพร','แทงศัตรู 1 ตัว 120%'],['หอกพายุใบไม้','แทง 3 ครั้ง ครั้งละ 70% · คูลดาวน์ 3'],['หอกดิ่งฟ้า','กระโดดปักหอกใส่ศัตรูทุกตัว 90% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
  amateru:{name:'อามาเทรุ',title:'มังกรอัมพรเพลิง',rar:4,el:'ไฟ',elc:'#ff8a3a',role:'ทำลายล้าง',dragon:1,maxLv:50,
    base:{hp:175,atk:66,def:24,spd:56},lore:'มังกรในตำนานที่หลับใหลใต้ต้นอัมพรนับพันปี เกล็ดของมันร้อนดั่งถ่านที่ไม่เคยดับ',
    skills:[['กรงเล็บเพลิง','บินโฉบเข้าไปงับศัตรู 1 ตัว 115%'],['ลมหายใจอัมพร','พ่นไฟใส่ศัตรูทุกตัว 70% · คูลดาวน์ 3'],['ดิ่งฟ้าถล่ม','ดิ่งลงกระแทกศัตรูทุกตัว 95% มีโอกาสทำให้มึน · คูลดาวน์ 4']]},
};
const spOf=d=>SPEC[d.sp]||SPEC.kazemaru;
// ระดับมอนสเตอร์ 4 ขั้น: ทั่วไป < หายาก < ตำนาน < เทพเจ้า
const TIER={1:{n:'ทั่วไป',c:'#c9d1dc',hx:0xc9d1dc},2:{n:'หายาก',c:'#5fb3ff',hx:0x5fb3ff},3:{n:'ตำนาน',c:'#ffc94d',hx:0xffc94d},4:{n:'เทพเจ้า',c:'#ff6ab0',hx:0xff6ab0}};
const tierOf=r=>TIER[r]||TIER[1];
const statOf=d=>{const s=spOf(d),f=1+.1*(d.lv-1);return{hp:Math.round(s.base.hp*f),atk:Math.round(s.base.atk*f),def:Math.round(s.base.def*f),spd:s.base.spd+d.lv};};
const power=d=>{const s=statOf(d);return Math.round(s.hp*.6+s.atk*4+s.def*3+s.spd*2);};
const lvCost=d=>60*d.lv;
;

/* ---------- ฉากโชว์มอนสเตอร์ (ใช้ renderer เดียวกับฟาร์ม) ---------- */
const BOX={open:false,detail:null,model:null,spin:0,drag:null,t:0};
const bScene=new THREE.Scene(), bCam=new THREE.PerspectiveCamera(32,1,.1,100);
{
  const sky=canvasTex(16,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#1b1420');g.addColorStop(.55,'#4a2c24');g.addColorStop(1,'#8a5230');x.fillStyle=g;x.fillRect(0,0,s,s);});
  srgb(sky); const sph=new THREE.Mesh(new THREE.SphereGeometry(40,32,16),new THREE.MeshBasicMaterial({map:sky,side:THREE.BackSide,fog:false})); bScene.add(sph);
  bScene.fog=new THREE.Fog(0x3a2420,14,40);
  const hemi=new THREE.HemisphereLight(0xffe2c0,0x2a1a14,.4); bScene.add(hemi);
  const key=new THREE.DirectionalLight(0xffd6a8,1.25); key.position.set(4,7,6); key.castShadow=true; key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-2,near:1,far:20}); bScene.add(key);
  const rim=new THREE.DirectionalLight(0x9fd0ff,1.1); rim.position.set(-5,4,-6); bScene.add(rim);
  const warm=new THREE.PointLight(0xff9a40,.6,6,2); warm.position.set(0,1.6,2.6); bScene.add(warm);
  // แท่นหินวงกลมขอบอัมพร
  const stone=new THREE.MeshStandardMaterial({color:0x1e1815,roughness:.95,metalness:0});
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.5,.35,64),stone); ped.position.y=-.18; ped.receiveShadow=true; bScene.add(ped);
  const rimM=new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:.85,blending:THREE.AdditiveBlending});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.32,.03,8,96),rimM); ring.rotation.x=Math.PI/2; ring.position.y=.005; bScene.add(ring);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(30,48),new THREE.MeshStandardMaterial({color:0x2a1c16,roughness:1})); floor.rotation.x=-Math.PI/2; floor.position.y=-.36; floor.receiveShadow=true; bScene.add(floor);
  BOX.motes=[]; for(let i=0;i<40;i++){const s=glow(bScene,0xffc070,.12,[(Math.random()-.5)*8,Math.random()*4,(Math.random()-.5)*6-1],.7);s.userData.p=[Math.random()*6,Math.random()*6,s.position.clone()];BOX.motes.push(s);}
  BOX.ring=ring; BOX.deco=[sph,ped,ring,floor,...BOX.motes]; bScene.fog.near0=14;
}
function boxModel(sp){
  const S2=SPEC[sp];
  if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}
  let w;
  if(S2.dragon&&DRAGON){w=buildDragon();w.scale.setScalar(.72);}
  else if(S2.spider&&SPIDER){w=buildSpider();w.scale.setScalar(1.05);}
  else{w=buildMonster(S2.rig||(S2.evo?1:0));w.scale.setScalar(w.userData.k*(S2.evo?1.05:1.35));}
  w.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  w.userData.sp=sp; bScene.add(w); BOX.model=w; BOX.spin=0;
  const A=w.userData.inner.userData; if(A.clipW)A.clipW(1);
  return w;
}
function frameCam(){
  const sp=BOX.model&&BOX.model.userData.sp, dr=sp&&SPEC[sp].dragon, evo=sp&&SPEC[sp].evo;
  const h=dr?2.2:evo?1.35:.8, d=dr?8.2:evo?6.2:6.4, port=bCam.aspect<.9;
  bCam.position.set(dr?2.4:1.2, h+(dr?1.6:.8), d*(port?1.3:1)); bCam.lookAt(0,h,0);
}
// ไอคอนหน้ามอนสเตอร์: ถ่ายเฉพาะส่วนหัวจากโมเดลจริง บนพื้นสีตามธาตุ
const THUMB={};
function headOf(w,sp){
  const inner=w.userData.inner, R=inner.userData.rig; let hb=null;
  if((SPEC[sp].dragon||SPEC[sp].spider)&&R&&R.head)hb=R.head;
  else inner.traverse(o=>{if(!hb&&o.isBone&&/Head$/.test(o.name))hb=o;});
  const box=new THREE.Box3(); inner.traverse(o=>{if(o.isMesh&&!o.userData.outline&&!o.userData.noBox)box.expandByObject(o);});
  const H=box.max.y-box.min.y;
  const F=FACE[sp]||{dx:0,dy:0,r:.3}; let p;
  if(hb){p=new THREE.Vector3();hb.getWorldPosition(p);}
  else p=new THREE.Vector3((box.min.x+box.max.x)/2,box.max.y-.3*H,(box.min.z+box.max.z)/2);
  return{p:p.add(new THREE.Vector3(F.dx*H,F.dy*H,0)),r:F.r*H};
}
// ปรับกรอบหน้าแต่ละสายพันธุ์ (สัดส่วนของความสูงตัว)
const FACE={yorugumo:{dx:0,dy:.03,r:.16},hakuneko:{dx:0,dy:.02,r:.15},morihime:{dx:0,dy:.02,r:.15},kuroga:{dx:-.03,dy:.03,r:.14},kazekiri:{dx:-.05,dy:.02,r:.14},amateru:{dx:-.07,dy:-.13,r:.21},kazemaru:{dx:.04,dy:.08,r:.36}};
function makeThumb(sp){
  if(THUMB[sp])return THUMB[sp];
  const W=192, rt=new THREE.WebGLRenderTarget(W,W,{encoding:THREE.sRGBEncoding}); rt.texture.encoding=THREE.sRGBEncoding;
  const prevSp=BOX.model&&BOX.model.userData.sp;
  const w=boxModel(sp); const A=w.userData.inner.userData;
  if(A.clipW)A.clipW(0); for(let i=0;i<3;i++){A.idle&&A.idle(1+i*.016);} rigUpdate(.016);
  w.rotation.y=SPEC[sp].dragon?-.35:-.3; bScene.updateMatrixWorld(true);
  const f=headOf(w,sp), cam=new THREE.PerspectiveCamera(30,1,.05,100);
  const dist=f.r/Math.tan(15*Math.PI/180);
  cam.position.copy(f.p).add(new THREE.Vector3(.12*dist,.1*dist,dist)); cam.lookAt(f.p.x,f.p.y-.05*f.r,f.p.z);
  BOX.deco.forEach(o=>o.visible=false); const fog=bScene.fog, fn=fog.near, ff=fog.far; fog.near=900; fog.far=1000;
  const cc=renderer.getClearColor(new THREE.Color()), ca=renderer.getClearAlpha(); renderer.setClearColor(0,0);
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(bScene,cam); renderer.setRenderTarget(null);
  renderer.setClearColor(cc,ca); fog.near=fn; fog.far=ff; BOX.deco.forEach(o=>o.visible=true);
  const px=new Uint8Array(W*W*4); renderer.readRenderTargetPixels(rt,0,0,W,W,px);
  const c=document.createElement('canvas'); c.width=c.height=W; const x=c.getContext('2d'), im=x.createImageData(W,W);
  for(let y=0;y<W;y++)im.data.set(px.subarray((W-1-y)*W*4,(W-y)*W*4),y*W*4);
  const fg=document.createElement('canvas'); fg.width=fg.height=W; fg.getContext('2d').putImageData(im,0,0);
  const col=SPEC[sp].elc, g=x.createRadialGradient(W*.5,W*.42,W*.05,W*.5,W*.5,W*.75);
  g.addColorStop(0,col); g.addColorStop(.55,'#3a2a1e'); g.addColorStop(1,'#140e0a');
  x.fillStyle=g; x.fillRect(0,0,W,W);
  x.globalAlpha=.18; x.strokeStyle='#fff'; x.lineWidth=2; for(let i=-W;i<W;i+=14){x.beginPath();x.moveTo(i,W);x.lineTo(i+W,0);x.stroke();} x.globalAlpha=1;
  x.drawImage(fg,0,0);
  THUMB[sp]=c.toDataURL('image/jpeg',.88); rt.dispose();
  if(prevSp)boxModel(prevSp); else{bScene.remove(BOX.model);BOX.model=null;}
  return THUMB[sp];
}

function boxSpark(p,color,n,speed){for(let i=0;i<n;i++){const g=glow(bScene,color,.18,[p.x,p.y,p.z],1);const v=new THREE.Vector3((Math.random()-.5),Math.random()*.9+.2,(Math.random()-.5)).normalize().multiplyScalar(speed*(.4+Math.random()*.8));const p0=g.position.clone();
  tween(.9+Math.random()*.5,k=>{g.position.copy(p0).addScaledVector(v,k*1.2);g.position.y-=k*k*.6;g.material.opacity=1-k;}).then(()=>{bScene.remove(g);g.material.dispose();});}}
/* ---------- หน้าต่างมอนสเตอร์ ---------- */
const CAP=30, stars=n=>tierOf(n).n;
const FLAG='<svg viewBox="0 0 12 12"><path d="M3 1v10M3 1.5h6l-1.6 2.2L9 6H3" fill="#2b1808" stroke="#2b1808" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const PAW='<svg viewBox="0 0 24 24" fill="#ffd9a0"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="10" r="2.2"/></svg>';
let boxSort='power', boxTab='info';
function openBox(){BOX.win=true;BOX.open=false;$('#box').hidden=false;$('#box').classList.remove('v3d');$('#mdet').hidden=true;closeSheet();
  document.body.classList.add('boxOpen');
  if(!S.mons.some(m=>m.uid===BOX.detail))BOX.detail=(S.mons.find(m=>m.uid===S.team[0])||S.mons[0]||{}).uid;
  renderBox();}
function closeBox(){BOX.win=false;BOX.open=false;$('#box').hidden=true;document.body.classList.remove('boxOpen');if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}syncAgents();}
function icon(m,cls){const sp=spOf(m);const c=el('button','ic r'+sp.rar+(cls?' '+cls:''));
  const img=el('img');img.src=makeThumb(m.sp);img.alt=sp.name;c.append(img);
  c.append(el('span','st',stars(sp.rar)));
  const lv=el('span','lv'+(m.lv>=sp.maxLv?' max':''),m.lv+'');c.append(lv);
  if(S.team.includes(m.uid)){const t=el('span','tm');t.innerHTML=FLAG;c.append(t);}
  if(sp.evolveTo&&m.lv>=sp.maxLv){const e=el('span','ev','↑');e.title='วิวัฒนาการได้';c.append(e);}
  c.title=sp.name+' Lv'+m.lv; return c;}
function renderTeam(){
  const t=$('#bTeam'); t.innerHTML='';
  for(let i=0;i<6;i++){const m=S.mons.find(x=>x.uid===S.team[i]);let s;
    if(m){s=icon(m);s.querySelector('.tm')&&s.querySelector('.tm').remove();s.onclick=()=>selectMon(m.uid);}
    else{s=el('button','ic empty');s.innerHTML=PAW;s.onclick=()=>toast('เลือกมอนสเตอร์ แล้วกด "ใส่ทีม"');}
    if(i===0&&m)s.append(el('em',null,'ผู้นำ'));
    t.append(s);}
  const tp=S.team.map(u=>S.mons.find(m=>m.uid===u)).filter(Boolean).reduce((a,m)=>a+power(m),0);
  $('#bTeamPow').textContent='พลังทีม '+fmt(tp);
}
function sorted(){return[...S.mons].sort((a,b)=>boxSort==='lv'?b.lv-a.lv:boxSort==='rar'?(spOf(b).rar-spOf(a).rar||b.lv-a.lv):boxSort==='new'?b.uid-a.uid:power(b)-power(a));}
function renderBox(){
  $('#bCount').textContent=S.mons.length+'/'+CAP;
  renderTeam();
  const g=$('#bList'); g.innerHTML='';
  sorted().forEach(m=>{const c=icon(m,m.uid===BOX.detail?'sel':'');c.dataset.uid=m.uid;c.onclick=()=>selectMon(m.uid);g.append(c);});
  for(let i=S.mons.length;i<CAP;i++){const e=el('div','ic empty');e.innerHTML=PAW;g.append(e);}
  $('#bSort').value=boxSort;
  renderDetail();
}
function selectMon(uid){BOX.detail=uid;renderBox();}
function renderDetail(){
  const m=S.mons.find(x=>x.uid===BOX.detail), P=$('#bPage'); P.innerHTML='';
  document.querySelectorAll('.bTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===boxTab));
  if(!m)return; const sp=spOf(m), st=statOf(m);
  const h=el('div','iHead');const e=el('span','iEl',sp.el);e.style.background=sp.elc;h.append(e);h.append(el('b',null,sp.name));{const tg=el('span','iTier r'+sp.rar,stars(sp.rar));h.append(tg);}P.append(h);
  P.append(el('div','iSub',sp.title+' · '+sp.role));
  if(boxTab==='info'){
    const x=el('div','iExp');x.append(el('span',null,'LV'));const bar=el('div');const i=el('i');i.style.width=(m.lv/sp.maxLv*100)+'%';bar.append(i);bar.append(el('em',null,m.lv>=sp.maxLv?'MAX':m.lv+' / '+sp.maxLv));x.append(bar);P.append(x);
    const T=el('table','iTbl');
    [['เลเวล',m.lv+' / '+sp.maxLv],['พลังชีวิต (HP)',fmt(st.hp*10)],['โจมตี (ATK)',st.atk*10],['ป้องกัน (DEF)',st.def*10],['ความเร็ว (SPD)',st.spd],['ธาตุ','ธาตุ'+sp.el],['พลังรวม',fmt(power(m)),'pw']]
      .forEach(([k,v,c],j)=>{const r=el('tr',j===5?'sep':'');r.append(el('td',null,k));const td=el('td',c||null,v+'');if(j===5)td.style.color=sp.elc;r.append(td);T.append(r);});
    P.append(T);
  }else if(boxTab==='skill'){sp.skills.forEach(([n,d],i)=>{const s=el('div','skr');s.append(el('span','skn',(i+1)+''));const t=el('div');t.append(el('b',null,n));t.append(el('p',null,d));s.append(t);P.append(s);});}
  else P.append(el('p','iLore',sp.lore));
  const inT=S.team.includes(m.uid);
  $('#mdTeam').innerHTML='';$('#mdTeam').append(el('span',null,inT?'ออกทีม':'ใส่ทีม'));$('#mdTeam').append(el('small',null,inT?'อยู่ในทีม':S.team.length>=6?'สลับตัวที่ 6':'ทีม '+S.team.length+'/6'));
  const maxed=m.lv>=sp.maxLv, cost=lvCost(m);
  $('#mdUp').innerHTML=''; $('#mdUp').append(el('span',null,maxed?'MAX':'อัปเลเวล')); $('#mdUp').append(el('small',null,maxed?'เลเวลเต็ม':fmt(cost)+' เหรียญ'));
  $('#mdUp').disabled=maxed;
  const canEvo=sp.evolveTo&&maxed; $('#mdEvo').disabled=!canEvo;
  $('#mdEvo').innerHTML=''; $('#mdEvo').append(el('span',null,'วิวัฒน์')); $('#mdEvo').append(el('small',null,!sp.evolveTo?'ร่างสุดท้าย':canEvo?'300 เหรียญ':'ต้อง Lv '+sp.maxLv));
}
document.querySelectorAll('.bTabs button').forEach(b=>b.onclick=()=>{boxTab=b.dataset.t;renderDetail();});
$('#bSort').onchange=e=>{boxSort=e.target.value;renderBox();};
$('#bClose').onclick=closeBox;
$('#box').addEventListener('pointerdown',e=>{if(e.target.id==='box')closeBox();});
function open3d(){const m=S.mons.find(x=>x.uid===BOX.detail);if(!m)return;
  BOX.open=true;$('#box').classList.add('v3d');$('#mdet').hidden=false;$('#md3Name').textContent=spOf(m).name+' Lv'+m.lv;
  boxModel(m.sp);boxLayout();const A=BOX.model.userData.inner.userData;if(A.play)A.play('victory',{fade:.25});
  if(spOf(m).spider){const R=A.rig;spiderSet({rig:R},{rear:1,cast:1},.35);setTimeout(()=>spiderSet({rig:R},{rear:0,cast:0},.5),1400);}
  if(spOf(m).dragon)dragonSet({rig:A.rig},{rear:1,spread:1,breath:1},.4),setTimeout(()=>BOX.model&&dragonSet({rig:BOX.model.userData.inner.userData.rig},{rear:0,spread:0,breath:0},.6),1300);}
function close3d(){BOX.open=false;$('#box').classList.remove('v3d');$('#mdet').hidden=true;if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}renderBox();}
$('#md3d').onclick=open3d; $('#mdBack').onclick=close3d;
$('#mdTeam').onclick=async()=>{const m=S.mons.find(x=>x.uid===BOX.detail);if(!m)return;const t=[...S.team];const i=t.indexOf(m.uid);let msg;
  if(i>=0){if(t.length<=1)return toast('ทีมต้องมีอย่างน้อย 1 ตัว');t.splice(i,1);msg=spOf(m).name+' ออกจากทีมแล้ว';}
  else if(t.length>=6){const out=S.mons.find(x=>x.uid===t[5]);t[5]=m.uid;msg='สลับ '+spOf(out).name+' ออก ใส่ '+spOf(m).name+' แทน';}
  else{t.push(m.uid);msg=spOf(m).name+' เข้าทีมแล้ว';}
  if(await act('set_team',{ids:t})){toast(msg);renderBox();}};
$('#mdUp').onclick=async()=>{const uid=BOX.detail;const m=S.mons.find(x=>x.uid===uid);if(!m)return;const sp=spOf(m);if(m.lv>=sp.maxLv)return;
  const r=await act('level_up',{mon_id:uid});if(!r)return;
  bumpRes('coins');renderBox();const ic=$('#bList .ic.sel');if(ic)ic.classList.add('pop');
  if(r.lv>=sp.maxLv&&sp.evolveTo)toast('ถึงเลเวลสูงสุด! วิวัฒนาการได้แล้ว');};
$('#mdEvo').onclick=async()=>{const uid=BOX.detail;const m=S.mons.find(x=>x.uid===uid);if(!m)return;const sp=spOf(m);if(!sp.evolveTo||m.lv<sp.maxLv)return;
  open3d(); $('#mdBack').disabled=true;
  const w=BOX.model; const p=new THREE.Vector3(0,1,0);
  const glowT=tween(1.4,t=>{w.rotation.y+=.05+t*.5;w.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive){o.material.emissive.setHex(0xfff0c0);o.material.emissiveIntensity=t*2;}});});
  const r=await act('evolve_monster',{mon_id:uid}); await glowT;
  if(!r){boxModel(m.sp);$('#mdBack').disabled=false;return;}
  bumpRes('coins');
  boxSpark(p,0xffffff,70,3.4);boxSpark(p,0xffc94d,50,2.6);
  boxModel(r.sp); $('#md3Name').textContent=SPEC[r.sp].name+' Lv1';
  boxSpark(p,0xffc94d,40,2); const A=BOX.model.userData.inner.userData; if(A.play)A.play('victory',{fade:.1});
  $('#mdBack').disabled=false; toast('วิวัฒนาการสำเร็จ! กลายเป็น '+SPEC[r.sp].name);};
// หมุนโมเดลด้วยการลาก (มุมมอง 3D)
addEventListener('pointerdown',e=>{if(!BOX.open||e.target.closest('button'))return;BOX.drag={x:e.clientX,s:BOX.spin};});
addEventListener('pointermove',e=>{if(BOX.drag)BOX.spin=BOX.drag.s+(e.clientX-BOX.drag.x)*.012;});
addEventListener('pointerup',()=>BOX.drag=null);
function boxLayout(){const w=view.clientWidth,h=view.clientHeight;bCam.aspect=w/h;bCam.fov=bCam.aspect<.9?42:30;bCam.updateProjectionMatrix();}
function boxFrame(dt,T){
  BOX.t+=dt;
  if(BOX.model){const A=BOX.model.userData.inner.userData;A.idle&&A.idle(T);if(!BOX.drag)BOX.spin+=dt*.25;BOX.model.rotation.y=-.45+BOX.spin;}
  BOX.motes.forEach(f=>{const [a,b,p]=f.userData.p;f.position.set(p.x+Math.sin(T*.4+a)*.4,p.y+Math.sin(T*.6+b)*.3,p.z);f.material.opacity=.3+.5*Math.sin(T*1.5+a*3);});
  BOX.ring.material.opacity=.6+.3*Math.sin(T*2);
  frameCam();
  renderer.render(bScene,bCam);
}
$('#nMons').onclick=openBox;

startFarm();
