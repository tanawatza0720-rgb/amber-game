/* ================= คลังมอนสเตอร์ (ดูมอนสเตอร์ที่มี · อัปเลเวล · วิวัฒนาการ · จัดทีม) ================= */
const SPEC={
  kazemaru:{name:'คาเซะมารุ',title:'นินจาฝึกหัดแห่งสายลม',rar:1,el:'ลม',elc:'#6fe0b0',role:'จู่โจม',evo:0,maxLv:20,evolveTo:'kazekiri',
    base:{hp:64,atk:20,def:8,spd:26},lore:'ลูกนินจาตัวจิ๋วที่ฝึกฟันดาบไม้ทุกวัน ดวงตาเรืองแสงกะพริบได้เมื่อตื่นเต้น'},
  kazekiri:{name:'คาเซะคิริ',title:'เงาสามดาบ',rar:2,el:'ลม',elc:'#6fe0b0',role:'จู่โจม',evo:1,maxLv:40,
    base:{hp:102,atk:34,def:13,spd:42},lore:'นินจาเงาผู้ไร้ใบหน้า พกดาบสามเล่ม เคลื่อนไหวเงียบดั่งสายลมยามค่ำ'},
  yorugumo:{name:'โยรุกุโมะ',title:'จอมเวทแมงมุมราตรี',rar:2,el:'มืด',elc:'#b48cff',role:'เวทมนตร์',evo:1,spider:1,maxLv:40,
    base:{hp:100,atk:34,def:14,spd:38},lore:'จอมเวทร่างครึ่งแมงมุมผู้ถักใยอยู่ในถ้ำลึกใต้ป่าอัมพร ลูกแก้วม่วงในมือทั้งสองรวบรวมแสงจันทร์ไว้เป็นเวทมนตร์'},
  kuroga:{name:'คุโรกะ',title:'นักล่าผ้าคลุมขาด',rar:3,el:'มืด',elc:'#b48cff',role:'จู่โจม',evo:1,rig:'kuroga',maxLv:50,
    base:{hp:130,atk:48,def:16,spd:50},lore:'นักล่าอสูรผู้เดินทางคนเดียวในยามราตรี ผ้าคลุมที่ขาดวิ่นทุกรอยคือร่องรอยของการต่อสู้ ดาบยาวของเขาไม่เคยพลาดเป้า'},
  hakuneko:{name:'ฮาคุเนโกะ',title:'นักดาบแมวขาวแห่งตะวันทอง',rar:3,el:'แสง',elc:'#ffd36a',role:'จู่โจม',evo:1,rig:'hakuneko',maxLv:50,
    base:{hp:120,atk:51,def:14,spd:56},lore:'นักดาบเผ่าแมวขาวผู้ร่าเริง แบกดาบโค้งไว้บนบ่าเสมอ ว่ากันว่าเธอมีเก้าชีวิตและยังไม่เคยใช้หมดสักครั้ง'},
  morihime:{name:'โมริฮิเมะ',title:'ธิดาหอกแห่งพงไพร',rar:2,el:'ไม้',elc:'#7fd46a',role:'จู่โจม',evo:1,rig:'morihime',maxLv:40,
    base:{hp:110,atk:32,def:17,spd:38},lore:'เอลฟ์ผู้พิทักษ์ป่าลึก ผ้าคลุมปักลายใบไม้พลิ้วตามสายลม หอกยาวของเธอแทงได้แม่นยำราวกับเงาใบไม้ที่ร่วงหล่น'},
  seiro:{name:'เซย์โร',title:'หมาป่านักดาบแห่งธารน้ำแข็ง',rar:2,el:'น้ำ',elc:'#5fb3ff',role:'จู่โจม',evo:1,rig:'seiro',maxLv:40,
    base:{hp:104,atk:34,def:15,spd:40},lore:'ซามูไรหมาป่าขนสีเงินผู้เฝ้าธารน้ำแข็งเหนือป่าอัมพร ผ้าคาดเอวสีครามพลิ้วตามทุกคมดาบ ว่ากันว่าเสียงหอนของเขาทำให้สายน้ำหยุดไหล'},
  kohaku:{name:'โคฮาคุ',title:'จิ้งจอกนักเวทแห่งอัมพร',rar:2,el:'ไฟ',elc:'#ff8a3a',role:'เวทมนตร์',evo:1,rig:'kohaku',maxLv:40,
    base:{hp:96,atk:36,def:12,spd:40},lore:'สาวจิ้งจอกผู้เฝ้าศาลเจ้าเก่ากลางป่า ลูกแก้วอำพันบนคทาของเธอเก็บเปลวไฟไว้นับร้อยปี ยิ่งหางฟูเท่าไรเวทยิ่งแรงเท่านั้น'},
  garok:{name:'กาโรค',title:'นักรบออร์กเผ่าภูผา',rar:2,el:'ดิน',elc:'#c89a5a',role:'ป้องกัน',evo:1,rig:'garok',maxLv:40,
    base:{hp:124,atk:31,def:19,spd:30},lore:'นักรบออร์กร่างยักษ์จากเผ่าภูผา เกราะไหล่แกะจากหินภูเขา ขวานหินในมือหนักจนต้องใช้สองคนยก แต่เขาเหวี่ยงได้ด้วยมือเดียว'},
  phraiwan:{name:'ไพรวัลย์',title:'ปราชญ์เฒ่าแห่งพงไพร',rar:2,el:'ลม',elc:'#6fe0b0',role:'ฮีล',evo:1,rig:'phraiwan',maxLv:40,
    base:{hp:112,atk:28,def:18,spd:40},lore:'ฤๅษีชราผู้อยู่กับป่ามาตั้งแต่ต้นอัมพรต้นแรกยังเป็นเมล็ด หมวกของเขามีดอกไม้บานไม่เคยเหี่ยว ลมหายใจของเขาทำให้บาดแผลกลายเป็นรากไม้แล้วสมานหาย'},
  mortha:{name:'มอร์ธา',title:'แม่ชีผู้เฝ้าสุสาน',rar:3,el:'น้ำ',elc:'#5fb3ff',role:'ฮีล',evo:1,rig:'mortha',maxLv:50,
    base:{hp:140,atk:42,def:20,spd:52},lore:'แม่ชีสวมหน้ากากทองเหลืองผู้ภาวนาให้ดวงวิญญาณในสุสานเก่า ขวดยาที่เอวกลั่นจากน้ำตาของผู้จากไป หยดเดียวก็ปลุกนักรบที่ล้มให้ลุกขึ้นได้'},
  sarael:{name:'ซาราเอล',title:'เทพสงครามปีกโลหิตและแสง',rar:4,el:'แสง',elc:'#ffd36a',role:'จู่โจม',evo:1,rig:'sarael',maxLv:50,
    base:{hp:180,atk:78,def:24,spd:62},lore:'เทพสงครามไร้ใบหน้าผู้ลอยอยู่เหนือสนามรบโดยไม่เคยแตะพื้น ปีกเปลวไฟสีขาวคือความเมตตา ปีกสีแดงคือการพิพากษา ดาบเพลิงในมือไม่เคยดับตั้งแต่สงครามครั้งแรก'},
  anubis:{name:'อนุบิส',title:'เทพแห่งความตายแห่งผืนทราย',rar:3,el:'มืด',elc:'#b48cff',role:'เวทมนตร์',evo:1,rig:'anubis',maxLv:50,
    base:{hp:128,atk:50,def:15,spd:50},lore:'เทพหัวหมาจิ้งจอกผู้ชั่งน้ำหนักดวงวิญญาณ คทาทองในมือเรียกพายุทรายจากทะเลทรายที่ไม่มีใครเคยกลับออกมา ศัตรูของเขาไม่ได้ตาย แค่ถูกพาไปที่อื่น'},
  amateru:{name:'อามาเทรุ',title:'มังกรอัมพรเพลิง',rar:4,el:'ไฟ',elc:'#ff8a3a',role:'ทำลายล้าง',dragon:1,maxLv:50,
    base:{hp:190,atk:74,def:26,spd:60},lore:'มังกรในตำนานที่หลับใหลใต้ต้นอัมพรนับพันปี เกล็ดของมันร้อนดั่งถ่านที่ไม่เคยดับ'},
};// ธาตุและสกิลมาจาก gamedata.js
Object.keys(SPEC).forEach(k=>{const e=EL_OF[k];if(e){SPEC[k].el=e;SPEC[k].elc=ELEM[e].c;}SPEC[k].skills=SKILLS[k]||[];});
const spOf=d=>SPEC[d.sp]||SPEC.kazemaru;
// ระดับมอนสเตอร์ 4 ขั้น: ทั่วไป < หายาก < ตำนาน < เทพเจ้า
const TIER={1:{n:'ทั่วไป',c:'#c9d1dc',hx:0xc9d1dc},2:{n:'หายาก',c:'#5fb3ff',hx:0x5fb3ff},3:{n:'ตำนาน',c:'#ffc94d',hx:0xffc94d},4:{n:'เทพเจ้า',c:'#ff6ab0',hx:0xff6ab0}};
const tierOf=r=>TIER[r]||TIER[1];
const statOf=d=>{const s=spOf(d),f=1+.1*(d.lv-1);return{hp:Math.round(s.base.hp*f),atk:Math.round(s.base.atk*f),def:Math.round(s.base.def*f),spd:s.base.spd+d.lv};};
const power=d=>{const s=statOf(d);return Math.round((s.hp*.6+s.atk*4+s.def*3+s.spd*2)*starPow(d.stars));};
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
function boxModel(sp,el){
  const S2=SPEC[sp];
  if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}
  let w;
  if(S2.dragon&&DRAGON){w=buildDragon();w.scale.setScalar(.72);}
  else if(S2.spider&&SPIDER){w=buildSpider();w.scale.setScalar(1.05);}
  else{w=buildMonster(S2.rig||(S2.evo?1:0));w.scale.setScalar(w.userData.k*(S2.evo?1.05:1.35));}
  w.traverse(o=>{if(o.isMesh){o.castShadow=true;}}); tintByEl(w,sp,el);
  w.userData.sp=sp; w.userData.el=el; bScene.add(w); BOX.model=w; BOX.spin=0;
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
const FACE={yorugumo:{dx:0,dy:.03,r:.16},hakuneko:{dx:0,dy:.02,r:.15},morihime:{dx:0,dy:.02,r:.15},seiro:{dx:0,dy:.03,r:.15},kohaku:{dx:0,dy:.02,r:.16},garok:{dx:0,dy:.03,r:.15},sarael:{dx:0,dy:.04,r:.15},anubis:{dx:0,dy:.06,r:.15},phraiwan:{dx:0,dy:.02,r:.16},mortha:{dx:0,dy:.05,r:.15},kuroga:{dx:-.03,dy:.03,r:.14},kazekiri:{dx:-.05,dy:.02,r:.14},amateru:{dx:-.07,dy:-.13,r:.21},kazemaru:{dx:.04,dy:.08,r:.36}};
function makeThumb(sp,el){
  el=el||EL_OF[sp]; const key=sp+'|'+el;
  if(THUMB[key])return THUMB[key];
  const W=192, rt=new THREE.WebGLRenderTarget(W,W,{encoding:THREE.sRGBEncoding}); rt.texture.encoding=THREE.sRGBEncoding;
  const prevSp=BOX.model&&BOX.model.userData.sp, prevEl=BOX.model&&BOX.model.userData.el;
  const w=boxModel(sp,el); const A=w.userData.inner.userData;
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
  const col=ELEM[el]?ELEM[el].c:SPEC[sp].elc, g=x.createRadialGradient(W*.5,W*.42,W*.05,W*.5,W*.5,W*.75);
  g.addColorStop(0,col); g.addColorStop(.55,'#3a2a1e'); g.addColorStop(1,'#140e0a');
  x.fillStyle=g; x.fillRect(0,0,W,W);
  x.globalAlpha=.18; x.strokeStyle='#fff'; x.lineWidth=2; for(let i=-W;i<W;i+=14){x.beginPath();x.moveTo(i,W);x.lineTo(i+W,0);x.stroke();} x.globalAlpha=1;
  x.drawImage(fg,0,0);
  THUMB[key]=c.toDataURL('image/jpeg',.88); rt.dispose();
  if(prevSp)boxModel(prevSp,prevEl); else{bScene.remove(BOX.model);BOX.model=null;}
  return THUMB[key];
}

function boxSpark(p,color,n,speed){for(let i=0;i<n;i++){const g=glow(bScene,color,.18,[p.x,p.y,p.z],1);const v=new THREE.Vector3((Math.random()-.5),Math.random()*.9+.2,(Math.random()-.5)).normalize().multiplyScalar(speed*(.4+Math.random()*.8));const p0=g.position.clone();
  tween(.9+Math.random()*.5,k=>{g.position.copy(p0).addScaledVector(v,k*1.2);g.position.y-=k*k*.6;g.material.opacity=1-k;}).then(()=>{bScene.remove(g);g.material.dispose();});}}
/* ---------- หน้าต่างมอนสเตอร์ ---------- */
const stars=n=>tierOf(n).n; let bagAsk=0;
// ปุ่ม + ขยายกระเป๋า (แตะครั้งแรก = ดูราคา แตะซ้ำภายใน 4 วิ = ซื้อ)
function bagBtn(){const b=$('#bAdd');if(!b)return;const g=S.bag;
  if(!g||g.bag_cost==null){b.hidden=true;return;} b.hidden=false;
  b.classList.toggle('ask',!!bagAsk);b.textContent=bagAsk?'✓':'+';b.dataset.ask='แตะ ✓ อีกครั้งเพื่อขยาย +'+g.bag_step+' ช่อง · '+g.bag_cost+' อัมพร';
  b.setAttribute('aria-label','ขยายกระเป๋า +'+g.bag_step+' ช่อง ราคา '+g.bag_cost+' อัมพร');}
async function bagBuy(){const g=S.bag;if(!g||g.bag_cost==null)return;
  if(!bagAsk){bagAsk=setTimeout(()=>{bagAsk=0;bagBtn();},4000);bagBtn();return;}
  clearTimeout(bagAsk);bagAsk=0;if(S.amber<g.bag_cost){toast('อัมพรไม่พอ ต้องใช้ '+g.bag_cost+' อัมพร');bagBtn();return;}
  const r=await act('buy_bag');bagBtn();if(r){if(typeof bumpRes==='function')bumpRes('amber');toast('ขยายกระเป๋าแล้ว! ตอนนี้มี '+r.slots+' ช่อง 🎒');renderBox();}}
const FLAG='<svg viewBox="0 0 12 12"><path d="M3 1v10M3 1.5h6l-1.6 2.2L9 6H3" fill="#2b1808" stroke="#2b1808" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const PAW='<svg viewBox="0 0 24 24" fill="#ffd9a0"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="10" r="2.2"/></svg>';
let boxSort='power', boxTab='info';
function openBox(){BOX.win=true;BOX.open=false;$('#box').hidden=false;$('#box').classList.remove('v3d');$('#mdet').hidden=true;closeSheet();
  document.body.classList.add('boxOpen');
  if(!S.mons.some(m=>m.uid===BOX.detail))BOX.detail=(S.mons.find(m=>m.uid===S.team[0])||S.mons[0]||{}).uid;
  renderBox();}
function closeBox(){BOX.win=false;BOX.open=false;$('#box').hidden=true;document.body.classList.remove('boxOpen');if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}syncAgents();}
function icon(m,cls){const sp=spOf(m);const c=el('button','ic r'+sp.rar+(cls?' '+cls:''));
  const img=el('img');img.src=makeThumb(m.sp,elOfMon(m));img.alt=sp.name;c.append(img);
  c.append(el('span','st',stars(sp.rar)));
  const lv=el('span','lv'+(m.lv>=sp.maxLv?' max':''),m.lv+'');c.append(lv);
  if(m.stars){c.classList.add('hs');c.append(el('span','sr'+(m.stars>=STAR_MAX?' full':''),'★'.repeat(m.stars)));}
  if(S.team.includes(m.uid)){const t=el('span','tm');t.innerHTML=FLAG;c.append(t);}
  if(canFuse(m)&&fuseMates(m).some(canFuse)){const e=el('span','ev','↑');e.title='รวมร่างได้';c.append(e);}
  else if(canStar(m)){const e=el('span','ev','★');e.title='วิวัฒน์ (ขึ้นดาว) ได้';c.append(e);}
  {const me=elOfMon(m);const b=el('span','elb',ELEM[me].i);b.style.background=ELEM[me].c;c.append(b);c.title=sp.name+' ธาตุ'+me+' Lv'+m.lv+(m.stars?' ★'+m.stars:'');} return c;}
// วัตถุดิบขึ้นดาว: ตัวซ้ำสายพันธุ์เดียวกันที่ไม่อยู่ในทีม และดาวไม่มากกว่าตัวหลัก เลือกตัวดาว/เลเวลต่ำสุดก่อน
const isMat=(m,x)=>x.sp===m.sp&&x.uid!==m.uid&&!S.team.includes(x.uid)&&(x.stars||0)<=(m.stars||0);
function starMats(m){const need=starCost((m.stars||0)+1);
  const L=S.mons.filter(x=>isMat(m,x)).sort((a,b)=>(a.stars||0)-(b.stars||0)||a.lv-b.lv);
  return {need,list:L.slice(0,need),have:L.length};}
const canStar=m=>(m.stars||0)<STAR_MAX&&starMats(m).have>=starMats(m).need;
// รวมร่าง: 2 ตัวระดับเดียวกัน (ทั่วไป/หายาก) ที่เลเวลเต็ม + ดาวเต็ม → ตัวใหม่แบบสุ่ม (server/migrate_fusion.sql)
const FUSE_UP={1:1,2:.1};
const canFuse=m=>FUSE_UP[spOf(m).rar]!=null&&m.lv>=spOf(m).maxLv&&(m.stars||0)>=STAR_MAX;
const fuseMates=m=>S.mons.filter(x=>x.uid!==m.uid&&spOf(x).rar===spOf(m).rar);
const fuseOdds=r=>FUSE_UP[r]>=1?'ได้ระดับ'+tierOf(r+1).n+' 100%':tierOf(r+1).n+' '+Math.round(FUSE_UP[r]*100)+'% · '+tierOf(r).n+' '+Math.round((1-FUSE_UP[r])*100)+'%';
const starStr=n=>'★'.repeat(n)+'☆'.repeat(STAR_MAX-n);
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
  $('#bCount').textContent=S.mons.length+'/'+S.slots; bagBtn();
  renderTeam();
  const g=$('#bList'); g.innerHTML='';
  sorted().forEach(m=>{const c=icon(m,m.uid===BOX.detail?'sel':'');c.dataset.uid=m.uid;c.onclick=()=>selectMon(m.uid);g.append(c);});
  for(let i=S.mons.length;i<S.slots;i++){const e=el('div','ic empty');e.innerHTML=PAW;g.append(e);}
  $('#bSort').value=boxSort;
  renderDetail();
}
function selectMon(uid){BOX.detail=uid;renderBox();}
function renderDetail(){
  const m=S.mons.find(x=>x.uid===BOX.detail), P=$('#bPage'); P.innerHTML='';
  document.querySelectorAll('.bTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===boxTab));
  if(!m)return; const sp=spOf(m), st=statOf(m);
  const mEl=elOfMon(m); const h=el('div','iHead');const e=el('span','iEl',mEl);e.style.background=ELEM[mEl].c;h.append(e);h.append(el('b',null,sp.name));{const tg=el('span','iTier r'+sp.rar,stars(sp.rar));h.append(tg);}P.append(h);
  {const r=el('div','iStars');r.append(el('span','ss',starStr(m.stars||0)));r.append(el('small',null,(m.stars||0)>=STAR_MAX?'ดาวเต็ม':'ดาว '+(m.stars||0)+'/'+STAR_MAX));P.append(r);}
  P.append(el('div','iSub',sp.title+' · '+sp.role));
  if(boxTab==='info'){
    const x=el('div','iExp');x.append(el('span',null,'LV'));const bar=el('div');const i=el('i');i.style.width=(m.lv/sp.maxLv*100)+'%';bar.append(i);bar.append(el('em',null,m.lv>=sp.maxLv?'MAX':m.lv+' / '+sp.maxLv));x.append(bar);P.append(x);
    const T=el('table','iTbl');
    {const EI=elInfo(mEl), nm=l=>l.length?l.map(x=>ELEM[x].i+' '+x).join(' · '):'—';
    [['เลเวล',m.lv+' / '+sp.maxLv],['พลังชีวิต (HP)',fmt(st.hp*10)],['โจมตี (ATK)',st.atk*10],['ป้องกัน (DEF)',st.def*10],['ความเร็ว (SPD)',st.spd],['ธาตุ',ELEM[mEl].i+' ธาตุ'+mEl+(mEl!==sp.el?' (ธาตุพิเศษ)':'')],['ชนะทาง',nm(EI.strong),'adv'],['แพ้ทาง',nm(EI.weak),'weak'],['พลังรวม',fmt(power(m)),'pw']]
      .forEach(([k,v,c],j)=>{const r=el('tr',j===5?'sep':'');r.append(el('td',null,k));const td=el('td',c||null,v+'');if(j===5)td.style.color=ELEM[mEl].c;r.append(td);T.append(r);});}
    P.append(T);
  }else if(boxTab==='skill'){{const st=m.stars||0, cur=skillLvs(m.sp,st), nx=st<STAR_MAX?skillLvs(m.sp,st+1):cur;
    sp.skills.forEach((k,i)=>{const pv=k.type==='passive',s=el('div','skr'+(pv?' pas':''));s.append(el('span','skn',pv?'ติดตัว':(i+1)+''));const t=el('div');
      const hd=el('b',null,k.name);hd.append(el('span','skLv'+(cur[i]>1?' up':''),'Lv'+cur[i]));if(nx[i]>cur[i])hd.append(el('span','skNx','ดาวถัดไป → Lv'+nx[i]));t.append(hd);
      t.append(el('p',null,k.desc.replace(/^ติดตัว: /,'')));
      if(cur[i]>1)t.append(el('p','skBon',(pv?'ผลสกิลติดตัว':'ความแรงสกิล')+' +'+Math.round((cur[i]-1)*(pv?PAS_STEP:SK_STEP)*100)+'%'));
      else if(k.id==='s1')t.append(el('p','skBon dim','โจมตีปกติ ไม่อัปตามดาว'));
      s.append(t);P.append(s);});
    P.append(el('p','skNote','วิวัฒน์ด้วยตัวซ้ำ: ทุกดาวสกิลขึ้น 1 Lv วนตามลำดับ (ท่า 2 → ท่า 3 → ติดตัว) · ใช้ตัวซ้ำดาวละ 1 ตัว ดาวที่ 3 และ 6 ใช้ 2 ตัว · สูงสุด 6 ดาว'));}}
  else P.append(el('p','iLore',sp.lore));
  const inT=S.team.includes(m.uid);
  $('#mdTeam').innerHTML='';$('#mdTeam').append(el('span',null,inT?'ออกทีม':'ใส่ทีม'));$('#mdTeam').append(el('small',null,inT?'อยู่ในทีม':S.team.length>=6?'สลับตัวที่ 6':'ทีม '+S.team.length+'/6'));
  const maxed=m.lv>=sp.maxLv, cost=lvCost(m);
  $('#mdUp').innerHTML=''; $('#mdUp').append(el('span',null,maxed?'MAX':'อัปเลเวล')); $('#mdUp').append(el('small',null,maxed?'เลเวลเต็ม':fmt(cost)+' เหรียญ'));
  $('#mdUp').disabled=maxed;
  const nst=m.stars||0, SM=starMats(m), fz=FUSE_UP[sp.rar]!=null&&nst>=STAR_MAX;
  $('#mdEvo').innerHTML='';
  if(fz){const k=fuseMates(m).filter(canFuse).length;$('#mdEvo').disabled=!maxed;$('#mdEvo').append(el('span',null,'รวมร่าง'));$('#mdEvo').append(el('small',null,!maxed?'ต้องเลเวลเต็ม':k?'คู่พร้อม '+k+' ตัว':'ยังไม่มีคู่'));}
  else{$('#mdEvo').disabled=nst>=STAR_MAX;$('#mdEvo').append(el('span',null,'วิวัฒน์'));
    $('#mdEvo').append(el('small',null,nst>=STAR_MAX?'ดาวเต็มแล้ว':'อาหาร '+Math.min(SM.have,SM.need)+'/'+SM.need));}
}
document.querySelectorAll('.bTabs button').forEach(b=>b.onclick=()=>{boxTab=b.dataset.t;renderDetail();});
$('#bSort').onchange=e=>{boxSort=e.target.value;renderBox();};
$('#bClose').onclick=closeBox;
$('#box').addEventListener('pointerdown',e=>{if(e.target.id==='box')closeBox();});
function open3d(){const m=S.mons.find(x=>x.uid===BOX.detail);if(!m)return;
  BOX.open=true;$('#box').classList.add('v3d');$('#mdet').hidden=false;$('#md3Name').textContent=spOf(m).name+' Lv'+m.lv;
  boxModel(m.sp,elOfMon(m));boxLayout();const A=BOX.model.userData.inner.userData;if(A.play)A.play('victory',{fade:.25});
  if(spOf(m).spider){const R=A.rig;spiderSet({rig:R},{rear:1,cast:1},.35);setTimeout(()=>spiderSet({rig:R},{rear:0,cast:0},.5),1400);}
  if(spOf(m).dragon)dragonSet({rig:A.rig},{rear:1,spread:1,breath:1},.4),setTimeout(()=>BOX.model&&dragonSet({rig:BOX.model.userData.inner.userData.rig},{rear:0,spread:0,breath:0},.6),1300);}
function close3d(){BOX.open=false;$('#box').classList.remove('v3d');$('#mdet').hidden=true;if(BOX.model){bScene.remove(BOX.model);BOX.model=null;}renderBox();}
$('#mdBack').onclick=close3d;
$('#mdTeam').onclick=async()=>{const m=S.mons.find(x=>x.uid===BOX.detail);if(!m)return;const t=[...S.team];const i=t.indexOf(m.uid);let msg;
  if(i>=0){if(t.length<=1)return toast('ทีมต้องมีอย่างน้อย 1 ตัว');t.splice(i,1);msg=spOf(m).name+' ออกจากทีมแล้ว';}
  else if(t.length>=6){const out=S.mons.find(x=>x.uid===t[5]);t[5]=m.uid;msg='สลับ '+spOf(out).name+' ออก ใส่ '+spOf(m).name+' แทน';}
  else{t.push(m.uid);msg=spOf(m).name+' เข้าทีมแล้ว';}
  if(await act('set_team',{ids:t})){toast(msg);renderBox();}};
$('#mdUp').onclick=async()=>{const uid=BOX.detail;const m=S.mons.find(x=>x.uid===uid);if(!m)return;const sp=spOf(m);if(m.lv>=sp.maxLv)return;
  const r=await act('level_up',{mon_id:uid});if(!r)return;
  bumpRes('coins');renderBox();const ic=$('#bList .ic.sel');if(ic)ic.classList.add('pop');
  const nm=S.mons.find(x=>x.uid===uid); if(nm&&r.lv>=sp.maxLv&&canFuse(nm))toast('เลเวลเต็ม + ดาวเต็ม! รวมร่างได้แล้ว');};
$('#mdEvo').onclick=()=>{const m=S.mons.find(x=>x.uid===BOX.detail);if(!m)return;canFuse(m)?fuseOpen(m):starUp(m);};
// วิวัฒนาการ (ขึ้นดาว): เปิดหน้าเลือกอาหาร (ตัวซ้ำ) เอง แล้วกดยืนยัน
const EVO={m:null,sel:[],mode:'star',at:0};
const EV_HINT='เลือกตัวซ้ำที่จะใช้เป็นอาหาร · ใช้ได้เฉพาะตัวที่ดาวไม่มากกว่าตัวหลัก และไม่อยู่ในทีม';
function starUp(m){
  const st=m.stars||0; if(st>=STAR_MAX){toast('ดาวเต็มแล้ว');return;}
  EVO.mode='star'; EVO.m=m; EVO.sel=starMats(m).list.map(x=>x.uid); $('#evo').hidden=false; renderEvo();}
function closeEvo(){$('#evo').hidden=true;EVO.m=null;EVO.sel=[];EVO.at=0;}
function renderEvo(){
  if(EVO.mode==='fuse')return renderFuse();
  const m=EVO.m; if(!m)return; const sp=spOf(m), st=m.stars||0, need=starCost(st+1);
  $('#evHint').textContent=EV_HINT;
  const main=$('#evMain'); main.innerHTML=''; main.append(icon(m));
  $('#evName').textContent=sp.name+' Lv'+m.lv;
  const ss=$('#evStars'); ss.innerHTML=''; ss.append(document.createTextNode('★'.repeat(st)+'☆'.repeat(STAR_MAX-st)+'  →  ')); ss.append(el('span','to','★'.repeat(st+1)+'☆'.repeat(STAR_MAX-st-1)));
  const before=skillLvs(m.sp,st), after=skillLvs(m.sp,st+1), i=after.findIndex((v,j)=>v>before[j]), sk=sp.skills[i];
  $('#evGain').textContent='พลังรบ +'+Math.round(STAR_POW*100)+'%'+(sk?' · '+sk.name+' Lv'+after[i]:'');
  EVO.sel=EVO.sel.filter(u=>S.mons.some(x=>x.uid===u&&isMat(m,x))).slice(0,need);
  $('#evCount').textContent='อาหารวิวัฒนาการ ('+EVO.sel.length+'/'+need+')';
  const pk=$('#evPicked'); pk.innerHTML='';
  for(let k=0;k<need;k++){const x=S.mons.find(y=>y.uid===EVO.sel[k]);
    if(x){const c=icon(x);c.onclick=()=>{EVO.sel=EVO.sel.filter(u=>u!==x.uid);renderEvo();};pk.append(c);}else pk.append(el('div','slot'));}
  const L=$('#evList'); L.innerHTML='';
  const same=S.mons.filter(x=>x.sp===m.sp&&x.uid!==m.uid).sort((a,b)=>(a.stars||0)-(b.stars||0)||a.lv-b.lv);
  if(!same.length)L.append(el('div','evEmpty','ยังไม่มี'+sp.name+'ตัวซ้ำ · ฟักไข่เพื่อหาตัวซ้ำมาใช้เป็นอาหาร'));
  same.forEach(x=>{const c=icon(x), ok=isMat(m,x), on=EVO.sel.includes(x.uid); if(on)c.classList.add('on');
    if(!ok){c.classList.add('no');c.title=S.team.includes(x.uid)?'อยู่ในทีม ใช้เป็นอาหารไม่ได้':'ดาวมากกว่าตัวหลัก ใช้เป็นอาหารไม่ได้';}
    c.onclick=()=>{if(!ok){toast(c.title);return;}
      if(on)EVO.sel=EVO.sel.filter(u=>u!==x.uid);else if(EVO.sel.length<need)EVO.sel.push(x.uid);else{EVO.sel.shift();EVO.sel.push(x.uid);}
      renderEvo();};
    L.append(c);});
  $('#evGo').disabled=EVO.sel.length!==need; $('#evGo').textContent='วิวัฒนาการ';
}
$('#evX').onclick=closeEvo;
$('#evo').addEventListener('pointerdown',e=>{if(e.target.id==='evo')closeEvo();});
$('#evAuto').onclick=()=>{if(!EVO.m)return;if(EVO.mode==='fuse'){const c=fuseMates(EVO.m).filter(canFuse).sort((a,b)=>S.team.includes(a.uid)-S.team.includes(b.uid))[0];EVO.sel=c&&EVO.sel[0]!==c.uid?[c.uid]:[];EVO.at=0;return renderEvo();}const L=starMats(EVO.m).list.map(x=>x.uid);EVO.sel=EVO.sel.length===L.length&&EVO.sel.every(u=>L.includes(u))?[]:L;renderEvo();};
$('#evGo').onclick=async()=>{const m=EVO.m;if(!m)return;if(EVO.mode==='fuse')return fuseGo();const st=m.stars||0,need=starCost(st+1);if(EVO.sel.length!==need)return;
  const sp=spOf(m),before=skillLvs(m.sp,st),pw0=power(m);$('#evGo').disabled=true;$('#evGo').textContent='กำลังวิวัฒนาการ…';
  const r=await act('star_up',{mon_id:m.uid,mat_ids:EVO.sel.slice()}); if(!r){renderEvo();return;}
  closeEvo();
  const after=skillLvs(m.sp,st+1), i=after.findIndex((v,j)=>v>before[j]), sk=sp.skills[i];
  renderBox(); const ic=$('#bList .ic.sel'); if(ic)ic.classList.add('pop');
  const nm=S.mons.find(x=>x.uid===m.uid), pw1=nm?power(nm):pw0;
  toast('วิวัฒน์สำเร็จ! ★'+(st+1)+(sk?' · '+sk.name+' Lv'+after[i]:'')+(pw1>pw0?' · พลังรบ +'+fmt(pw1-pw0):''));};
// รวมร่าง: ใช้หน้าต่างเดียวกับวิวัฒนาการ (โหมด fuse) เลือกคู่ 1 ตัว แล้วแตะยืนยัน 2 ครั้ง
function fuseOpen(m){EVO.mode='fuse';EVO.m=m;EVO.at=0;const c=fuseMates(m).filter(canFuse).filter(x=>!S.team.includes(x.uid));EVO.sel=c.length===1?[c[0].uid]:[];$('#evo').hidden=false;renderFuse();}
function renderFuse(){
  const m=EVO.m; if(!m)return; const sp=spOf(m), r=sp.rar;
  const main=$('#evMain'); main.innerHTML=''; main.append(icon(m));
  $('#evName').textContent=sp.name+' Lv'+m.lv;
  const ss=$('#evStars'); ss.innerHTML=''; ss.append(document.createTextNode(tierOf(r).n+' + '+tierOf(r).n+'  →  ')); ss.append(el('span','to','สุ่มตัวใหม่'));
  $('#evGain').textContent=fuseOdds(r);
  $('#evHint').textContent='เลือกคู่ระดับ'+tierOf(r).n+'ที่เลเวลเต็มและดาวเต็ม · ทั้งสองตัวจะหายไป แล้วได้ตัวใหม่แบบสุ่ม (Lv 1 · 0 ดาว)';
  const L0=fuseMates(m); EVO.sel=EVO.sel.filter(u=>L0.some(x=>x.uid===u&&canFuse(x))).slice(0,1);
  $('#evCount').textContent='คู่รวมร่าง ('+EVO.sel.length+'/1)';
  const pk=$('#evPicked'); pk.innerHTML=''; {const x=S.mons.find(y=>y.uid===EVO.sel[0]);
    if(x){const c=icon(x);c.onclick=()=>{EVO.sel=[];EVO.at=0;renderFuse();};pk.append(c);}else pk.append(el('div','slot'));}
  const L=$('#evList'); L.innerHTML='';
  const list=L0.slice().sort((a,b)=>canFuse(b)-canFuse(a)||(b.stars||0)-(a.stars||0)||b.lv-a.lv);
  if(!list.some(canFuse))L.append(el('div','evEmpty','ยังไม่มีตัวระดับ'+tierOf(r).n+'อีกตัวที่เลเวลเต็มและดาวเต็ม (6 ดาว)'));
  list.forEach(x=>{const c=icon(x), ok=canFuse(x), on=EVO.sel[0]===x.uid; if(on)c.classList.add('on');
    if(!ok){c.classList.add('no');c.title=x.lv<spOf(x).maxLv?'ต้องเลเวลเต็มก่อน':'ต้องดาวเต็ม 6 ดาวก่อน';}
    c.onclick=()=>{if(!ok){toast(c.title);return;}EVO.sel=on?[]:[x.uid];EVO.at=0;renderFuse();};
    L.append(c);});
  const sure=Date.now()-EVO.at<4000;
  $('#evGo').disabled=EVO.sel.length!==1; $('#evGo').textContent=sure?'แตะอีกครั้งเพื่อยืนยัน (2 ตัวนี้จะหายไป)':'รวมร่าง';
}
async function fuseGo(){
  const m=EVO.m; if(!m||EVO.sel.length!==1)return;
  if(Date.now()-EVO.at>4000){EVO.at=Date.now();renderFuse();setTimeout(()=>{if(EVO.mode==='fuse'&&EVO.m&&Date.now()-EVO.at>=4000)renderFuse();},4100);return;}
  EVO.at=0; $('#evGo').disabled=true; $('#evGo').textContent='กำลังรวมร่าง…';
  const r=await act('fuse_monsters',{a:m.uid,b:EVO.sel[0]}); if(!r){if(EVO.m)renderFuse();return;}
  closeEvo(); const nid=Number(r.mon.id), d=S.mons.find(x=>x.uid===nid), hel=d?elOfMon(d):(r.mon.el||SPEC[r.mon.sp].el), up=r.rar>spOf(m).rar;
  if(typeof syncAgents==='function'&&!(typeof VISIT!=='undefined'&&VISIT.on))syncAgents();
  BOX.detail=nid; renderBox();
  if(d){open3d(); const p=new THREE.Vector3(0,1,0), col=tierOf(r.rar).hx; boxSpark(p,0xffffff,70,3.4); boxSpark(p,col,60,2.8);}
  toast('รวมร่างสำเร็จ! ได้'+SPEC[r.mon.sp].name+' '+ELEM[hel].i+'ธาตุ'+hel+' ระดับ'+tierOf(r.rar).n+(up?'!':''));
  if(r.rar>=3&&typeof pullFx==='function'){pullFx(r.rar,SPEC[r.mon.sp].name,ELEM[hel].i+' ธาตุ'+hel);if(typeof PULL!=='undefined'){PULL.last=0;setTimeout(pullsLoad,2500);}}
}
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

if($('#bAdd'))$('#bAdd').onclick=bagBuy;
