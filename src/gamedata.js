/* ================= ข้อมูลเกมที่ใช้ร่วมกัน (ฟาร์ม + สนามรบ) =================
   ธาตุ 6 ธาตุ + ตารางแพ้ทาง และสกิลของทุกสายพันธุ์ (แก้ที่นี่ที่เดียว)
   ระดับ: ทั่วไป 2 สกิล · หายาก 3 สกิล · ตำนาน/เทพเจ้า 3 สกิล + สกิลติดตัว (type:'passive') */
// c = สีป้าย/ย้อมตัว · fx = สีเอฟเฟกต์สกิล · pal = ไล่สีเปลวของท่าพ่น (สว่าง → มืด)
const ELEM={
  'ดิน':{c:'#c8a26a',i:'🪨',fx:0xe0b870,pal:[0xfff0c8,0xe8c47a,0xb8893e,0x7a5424,0x2e2014]},
  'น้ำ':{c:'#5fb3ff',i:'💧',fx:0x5fc8ff,pal:[0xeaffff,0x8fe4ff,0x3aa8ff,0x1a5ad8,0x0e1e4a]},
  'ลม':{c:'#6fe0b0',i:'🌪️',fx:0x8ff0c8,pal:[0xf0fff6,0xaaf5d0,0x5fdca8,0x2a9a78,0x123a30]},
  'ไฟ':{c:'#ff8a3a',i:'🔥',fx:0xff8a3a,pal:[0xffd88a,0xffb030,0xff7a1a,0xd8380e,0x4a2014]},
  'แสง':{c:'#ffd36a',i:'☀️',fx:0xfff0a0,pal:[0xffffff,0xfff6c0,0xffe07a,0xe8b840,0x4a3a14]},
  'มืด':{c:'#b48cff',i:'🌙',fx:0xb070ff,pal:[0xf0d8ff,0xc890ff,0x9a4dff,0x5a1ab8,0x1a0a30]}};
const EL_LIST=Object.keys(ELEM);
const elFx=u=>{const e=ELEM[u&&u.el];return e?e.fx:0xe8f0ff;};
// วงจรธาตุพื้นฐาน: น้ำ > ไฟ > ลม > ดิน > น้ำ (ตัวหน้าชนะตัวถัดไป)
const EL_CYCLE=['น้ำ','ไฟ','ลม','ดิน'];
const EL_ADV=1.3, EL_WEAK=.8, EL_LD=1.5, EL_LD_OVER=1.15, EL_LD_UNDER=.9;
function elMul(a,d){
  if(!a||!d||a===d)return 1;
  const ia=EL_CYCLE.indexOf(a), id=EL_CYCLE.indexOf(d);
  if(ia>=0&&id>=0){if((ia+1)%4===id)return EL_ADV;if((id+1)%4===ia)return EL_WEAK;return 1;}
  if(ia<0&&id<0)return EL_LD;          // แสง ↔ มืด แพ้ทางกันเอง แรงทั้งสองฝั่ง
  return ia<0?EL_LD_OVER:EL_LD_UNDER;  // แสง/มืด ได้เปรียบธาตุพื้นฐานทุกธาตุเล็กน้อย
}
// ข้อความอธิบายธาตุ (ใช้ในคลังมอนสเตอร์)
function elInfo(e){
  const all=Object.keys(ELEM), strong=all.filter(d=>elMul(e,d)>1), weak=all.filter(d=>elMul(d,e)>1&&elMul(e,d)<=1);
  return {strong,weak};
}
// ธาตุประจำตัว (ภาพหลักของตัวละคร) · ตัวที่ฟักได้สุ่มธาตุได้ทั้ง 6 ธาตุ (เก็บใน monsters.el; ว่าง = ธาตุประจำตัว)
const EL_OF={kazemaru:'ลม',kazekiri:'ลม',yorugumo:'มืด',morihime:'ดิน',kuroga:'มืด',hakuneko:'แสง',amateru:'ไฟ'};
const elOfMon=m=>(m&&m.el&&ELEM[m.el])?m.el:EL_OF[m&&m.sp];
/* ================= ออร่าตามธาตุ =================
   ผิวตัวละครเป็นสีเดิม · ห่อด้วย "เปลือกออร่า" (ใช้กระดูกเดียวกับตัว จึงขยับตาม) ขอบเรืองเป็นเปลวไหวขึ้นด้านบน
   + ควันออร่าลอยขึ้นรอบตัว · ธาตุมืด = ควันดำขอบม่วง (ผสมแบบทึบ) ธาตุอื่น = เรืองแสง (บวกแสง)
   ทุกธาตุใช้ shader ตัวเดียวกัน (สลับแค่ค่าสี) ไม่ต้องคอมไพล์ใหม่ · ไม่มีไฟล์เพิ่ม */
const AURA={
  'ไฟ':{c:0xe0100a,e:0xff5a1a,add:1},  'น้ำ':{c:0x1f6bff,e:0x8fd8ff,add:1}, 'ลม':{c:0x1fd070,e:0xb0ffd0,add:1},
  'แสง':{c:0xffe9a8,e:0xffffff,add:1}, 'ดิน':{c:0x6b4420,e:0xc08a4a,add:0}, 'มืด':{c:0x0c0418,e:0x8a40ff,add:0}};
const AURA_T={value:0};
const AURA_VS=`#include <common>
#include <skinning_pars_vertex>
uniform float uTime,uThick,uRise,uPush; varying float vRim; varying vec3 vW;
void main(){
#include <beginnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <skinning_vertex>
  vec3 wp=(modelMatrix*vec4(transformed,1.)).xyz;
  float f=sin(wp.y*9.-uTime*7.+wp.x*5.)*.5+.5, g=sin(wp.y*5.3-uTime*4.3+wp.z*6.1)*.5+.5;
  transformed+=objectNormal*uThick*(.55+f*.9);
  vec4 wq=modelMatrix*vec4(transformed,1.); wq.y+=uRise*pow(f*g,2.)*clamp(normalize(mat3(modelMatrix)*objectNormal).y+.6,0.,1.);
  vec4 mvPosition=viewMatrix*wq; vec3 mvRim=mvPosition.xyz; mvPosition.xyz+=normalize(mvPosition.xyz)*uPush; gl_Position=projectionMatrix*mvPosition;
  vec3 N=normalize(transformedNormal); vRim=1.-abs(dot(N,normalize(-mvRim))); vW=wq.xyz;
}`;
const AURA_FS=`uniform vec3 uCol,uEdge; uniform float uTime,uAlpha,uAdd; varying float vRim; varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 q=vec2(vW.x*2.3+vW.z*2.1,vW.y*2.6-uTime*2.2);
  float fl=n2(q)*.65+n2(q*2.3+3.1)*.35;
  float inner=pow(1.-vRim,.85);
  float a=inner*smoothstep(.2,.78,fl+inner*.25)*uAlpha;
  vec3 col=mix(uCol,uEdge,uAdd>.5?inner*fl:inner*.85);
  gl_FragColor=vec4(col*(uAdd>.5?1.4:1.),clamp(a,0.,1.));
}`;
let WISPTEX=null;
function wispTex(){if(WISPTEX)return WISPTEX;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  WISPTEX=new THREE.CanvasTexture(c);return WISPTEX;}
const AURA_LIVE=[];
function auraPrune(now){for(let i=AURA_LIVE.length-1;i>=0;i--){const L=AURA_LIVE[i];if(L.end<now||!L.w.parent){if(L.s.parent)L.s.parent.remove(L.s);L.m.dispose();AURA_LIVE.splice(i,1);}}}
function addAura(w,sp,el){
  el=(el&&AURA[el])?el:EL_OF[sp]; const A=AURA[el]; if(!w||!A||w.userData.aura)return;
  const low=(typeof LOW!=='undefined'&&LOW)||!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
  w.userData.el=el; const shells=[]; w.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(w), H=Math.max(.3,box.max.y-box.min.y);
  const push=H*.18, mk=(skinned,geo,thick,rise,alpha)=>{const m=new THREE.ShaderMaterial({vertexShader:AURA_VS,fragmentShader:AURA_FS,skinning:!!skinned,transparent:true,depthWrite:false,
      blending:A.add?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.BackSide,
      uniforms:{uTime:AURA_T,uThick:{value:thick},uRise:{value:rise},uPush:{value:push},uAlpha:{value:alpha},uAdd:{value:A.add?1:0},uCol:{value:new THREE.Color(A.c)},uEdge:{value:new THREE.Color(A.e)}}});return m;};
  const meshes=[];w.traverse(o=>{if(o.isMesh&&!o.userData.outline&&!o.userData.aura&&o.geometry&&o.visible&&o.geometry.attributes.normal)meshes.push(o);});
  meshes.forEach(o=>{
    // ความหนาคิดจากขนาดตัวจริงบนจอ แปลงกลับเป็นหน่วยของโมเดลนั้น
    const ws=new THREE.Vector3();o.getWorldScale(ws);const wsc=Math.max(1e-4,(ws.x+ws.y+ws.z)/3);
    [[.035,.1,A.add?1:1.2],[.1,.34,A.add?.62:.85]].forEach(([t,r,a],li)=>{if(low&&li)return;
      const th=H*t/wsc, mat=mk(o.isSkinnedMesh,o.geometry,th,H*r,a);
      const s=o.isSkinnedMesh?new THREE.SkinnedMesh(o.geometry,mat):new THREE.Mesh(o.geometry,mat);
      if(o.isSkinnedMesh){s.bind(o.skeleton,o.bindMatrix);s.bindMode=o.bindMode;}
      s.position.copy(o.position);s.quaternion.copy(o.quaternion);s.scale.copy(o.scale);
      s.frustumCulled=false;s.renderOrder=5+li;s.userData.aura=1;s.castShadow=false;s.receiveShadow=false;
      o.parent.add(s);shells.push(s);});});
  // ควันออร่าลอยขึ้นรอบตัว
  const cen=box.getCenter(new THREE.Vector3()), inv=new THREE.Matrix4().copy(w.matrixWorld).invert();
  const base=cen.clone().setY(box.min.y).applyMatrix4(inv), top=cen.clone().setY(box.max.y).applyMatrix4(inv), R=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.38/(w.scale.x||1);
  const Hl=top.y-base.y; let last=0;
  const anchor=new THREE.Object3D(); w.add(anchor); shells.push(anchor);
  const spawn=t=>{auraPrune(t);if(AURA_LIVE.length>(low?40:110))return;
    const m=new THREE.SpriteMaterial({map:wispTex(),color:Math.random()<.5?A.c:A.e,transparent:true,depthWrite:false,opacity:0,blending:A.add?THREE.AdditiveBlending:THREE.NormalBlending});
    const sp2=new THREE.Sprite(m), a=Math.random()*6.283, r=R*(.45+Math.random()*.55), y0=base.y+Hl*(.02+Math.random()*.75), t0=t, life=.9+Math.random()*.8, sz=Hl*(.16+Math.random()*.16);
    sp2.position.set(base.x+Math.cos(a)*r,y0,base.z+Math.sin(a)*r); sp2.renderOrder=7; w.add(sp2); AURA_LIVE.push({s:sp2,m,w,end:t0+life});
    sp2.onBeforeRender=()=>{const k=Math.min(1,(AURA_T.value-t0)/life);
      sp2.position.y=y0+Hl*.35*k; sp2.position.x+=Math.sin(AURA_T.value*3+a)*.002*Hl; const s=sz*(1-k*.5); sp2.scale.set(s*.7,s,1); m.opacity=Math.sin(k*Math.PI)*(A.add?.55:.7);};};
  // เวลาของออร่าเดินจากนาฬิกาจริง (ใช้ได้ทุกฉาก: ฟาร์ม คลัง สนามรบ)
  if(shells[0])shells[0].onBeforeRender=()=>{const t=performance.now()/1000;AURA_T.value=t;
    if(anchor.visible&&t-last>(low?.2:.08)){last=t;spawn(t);}};
  const g={shells,set visible(v){shells.forEach(s=>s.visible=v);},get visible(){return shells[0]?shells[0].visible:false;}};
  w.userData.aura=g; return g;
}
const tintByEl=addAura; // ชื่อเดิม (จุดที่เรียกใช้เดิมยังทำงาน)

/* สกิล: mult = คูณพลังโจมตี · cd = คูลดาวน์ (เทิร์น; เรียลไทม์ ×2.3 วินาที) · stun = โอกาสทำให้มึน
   passive: dmgLow (แรงขึ้นใส่ศัตรูเลือด<50%) · crit (เพิ่มโอกาสคริ) · revive (รอดตาย 1 ครั้ง คืนเลือด %) · teamAtk (ทั้งทีมแรงขึ้น) · dr (รับดาเมจลดลง) */
const SKILLS={
  // ---------- ทั่วไป ----------
  kazemaru:[
    {id:'s1',name:'ฟันดาบไม้',desc:'ฟันศัตรู 1 ตัว 100%',cd:0,type:'melee',mult:1,target:'one'},
    {id:'s2',name:'ดาวกระจายจิ๋ว',desc:'ขว้างดาวกระจายใส่ศัตรูรอบตัว 50% · คูลดาวน์ 3',cd:3,type:'ranged',mult:.5,target:'all'}],
  // ---------- หายาก ----------
  kazekiri:[
    {id:'s1',name:'ฟันเงา',desc:'ฟันศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'สามดาบวายุ',desc:'ฟัน 3 ครั้ง ครั้งละ 62% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.62,target:'one'},
    {id:'s3',name:'กระโดดฟัน',desc:'ฟาดพื้นใส่ศัตรูรอบจุดตก 80% โอกาส 25% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.8,target:'all',stun:.25}],
  yorugumo:[
    {id:'s1',name:'เขี้ยวพิษ',desc:'ยกขาหน้าแทงศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'ลูกแก้วมนตร์ม่วง',desc:'ร่ายลูกแก้วเวทใส่ศัตรูรอบเป้าหมาย 58% · คูลดาวน์ 3',cd:3,type:'ranged',mult:.58,target:'all'},
    {id:'s3',name:'กระโจนใยมรณะ',desc:'กระโจนลงกลางศัตรู 78% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.78,target:'all',stun:.3}],
  morihime:[
    {id:'s1',name:'แทงหอกพงไพร',desc:'แทงศัตรู 1 ตัว 105%',cd:0,type:'melee',mult:1.05,target:'one'},
    {id:'s2',name:'หอกพายุใบไม้',desc:'แทง 3 ครั้ง ครั้งละ 60% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.6,target:'one'},
    {id:'s3',name:'หอกดิ่งฟ้า',desc:'กระโดดปักหอกใส่ศัตรูรอบจุดตก 80% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:.8,target:'all',stun:.3}],
  // ---------- ตำนาน ----------
  kuroga:[
    {id:'s1',name:'ฟันเงาจันทร์',desc:'ฟันศัตรู 1 ตัว 120%',cd:0,type:'melee',mult:1.2,target:'one'},
    {id:'s2',name:'คมดาบราตรี',desc:'ฟัน 3 ครั้ง ครั้งละ 82% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.82,target:'one'},
    {id:'s3',name:'ดิ่งฟันสังหาร',desc:'กระโดดฟาดศัตรูรอบจุดตก 105% โอกาส 35% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.05,target:'all',stun:.35},
    {id:'s4',name:'สัญชาตญาณนักล่า',desc:'ติดตัว: โจมตีศัตรูที่เลือดต่ำกว่า 50% แรงขึ้น 35%',type:'passive',passive:{dmgLow:.35}}],
  hakuneko:[
    {id:'s1',name:'ฟันตะวันทอง',desc:'ฟันศัตรู 1 ตัว 125%',cd:0,type:'melee',mult:1.25,target:'one'},
    {id:'s2',name:'กรงเล็บเก้าชีวิต',desc:'ฟัน 3 ครั้ง ครั้งละ 80% ใส่ศัตรู 1 ตัว · คูลดาวน์ 3',cd:3,type:'melee3',mult:.8,target:'one'},
    {id:'s3',name:'ดาบจันทร์เสี้ยว',desc:'กระโดดฟันศัตรูรอบจุดตก 110% โอกาส 30% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.1,target:'all',stun:.3},
    {id:'s4',name:'เก้าชีวิต',desc:'ติดตัว: เมื่อเลือดหมดครั้งแรกจะรอดและฟื้นเลือด 35% (1 ครั้งต่อการต่อสู้) · โอกาสคริ +10%',type:'passive',passive:{revive:.35,crit:.1}}],
  // ---------- เทพเจ้า ----------
  amateru:[
    {id:'s1',name:'กรงเล็บเพลิง',desc:'บินโฉบเข้าไปงับศัตรู 1 ตัว 140%',cd:0,type:'melee',mult:1.4,target:'one'},
    {id:'s2',name:'ลมหายใจอัมพร',desc:'พ่นไฟใส่ศัตรูรอบเป้าหมาย 100% · คูลดาวน์ 3',cd:3,type:'ranged',mult:1,target:'all'},
    {id:'s3',name:'ดิ่งฟ้าถล่ม',desc:'บินขึ้นฟ้าแล้วดิ่งลงกระแทกศัตรูรอบจุดตก 150% โอกาส 45% ทำให้มึน · คูลดาวน์ 4',cd:4,type:'leap',mult:1.5,target:'all',stun:.45},
    {id:'s4',name:'หัวใจมังกรอัมพร',desc:'ติดตัว: ทั้งทีมโจมตีแรงขึ้น 15% · อามาเทรุรับดาเมจลดลง 25% · โอกาสคริ +10%',type:'passive',passive:{teamAtk:.15,dr:.25,crit:.1}}]
};
const passiveOf=sp=>{const s=(SKILLS[sp]||[]).find(x=>x.type==='passive');return s?s.passive:null;};

/* ================= ดาว (วิวัฒนาการด้วยตัวซ้ำ) =================
   เริ่ม 0 ดาว สูงสุด 6 ดาว · ใช้ตัวซ้ำ (สายพันธุ์เดียวกัน) ดาวละ 1 ตัว ยกเว้นดาวที่ 3 และ 6 ใช้ 2 ตัว (รวม 8 ตัว)
   ทุกดาวที่ได้ สกิลขึ้น 1 Lv วนตามลำดับ: ท่า 2 → ท่า 3 → ติดตัว → ท่า 2 … (โจมตีปกติไม่อัป) · ค่าพลังไม่เพิ่ม */
const STAR_MAX=6;
const starCost=next=>next===3||next===6?2:1;          // ตัวซ้ำที่ต้องใช้เพื่อขึ้นไปดาว next
const SK_STEP=.1, PAS_STEP=.15;                         // สกิลแรงขึ้นต่อ Lv: ท่าโจมตี +10% · ติดตัว +15%
function skillLvs(sp,stars){
  const L=SKILLS[sp]||[], up=L.filter(s=>s.id!=='s1'), n=up.length, st=Math.max(0,Math.min(STAR_MAX,stars||0));
  return L.map(s=>{const i=up.indexOf(s);if(i<0||!n)return 1;return 1+(st>i?Math.floor((st-1-i)/n)+1:0);});
}
function skillsAt(sp,stars){
  const lv=skillLvs(sp,stars);
  return (SKILLS[sp]||[]).map((s,i)=>{const k=lv[i]-1, o=Object.assign({},s,{lv:lv[i]});
    if(s.type==='passive'){o.passive={};for(const p in s.passive){let v=s.passive[p]*(1+PAS_STEP*k);if(p==='revive')v=Math.min(.6,v);if(p==='dr')v=Math.min(.45,v);o.passive[p]=+v.toFixed(3);}}
    else{if(s.mult)o.mult=+(s.mult*(1+SK_STEP*k)).toFixed(3);if(s.stun)o.stun=Math.min(.8,s.stun+.03*k);}
    return o;});
}
