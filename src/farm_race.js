/* ================= เกาะตามเผ่า =================
   เผ่าที่เลือกเปลี่ยนหน้าตาเกาะทั้งเกาะ: สีพื้น/หน้าผา/ใบไม้/ท้องฟ้า/แสง + ของตกแต่งประจำเผ่ารอบขอบเกาะ
   + เกาะสัญลักษณ์ของเผ่า (โมเดล Tripo) ลอยอยู่ด้านหลัง · ของตกแต่งสร้างด้วยโค้ด ไม่มีไฟล์เพิ่ม */
const THEME={
  god:{sky:['#5f95e0','#a9cdf5','#eef2ff','#fff1d8','#fbf6ee','#eef2fa'],fog:0xeef0fa,fogN:110,fogF:260,hemi:[0xfff8e8,0xd8d0c0,.8],sun:[0xfff4dc,2],
    grass:['#dcd6ae',['236,226,184','210,214,160','248,236,200','224,220,170'],[44,70],[30,48],[62,80]],blade:[.14,.38,.66,.12],
    side:0xf2eee4,under:0xe9e4da,cliff:0xf3f0ea,moss:0xfff0c0,leaf:[0xfff7fb,0xf6e8ff,0xffe6a0,0xfffdf2],flower:[0xffffff,0xffe39a,0xf6e8ff],pollen:0xfff4c0,cloud:0xffffff,sea:0xdce8fa,islet:0xf4eccc},
  undead:{sky:['#120a24','#2c1c46','#4a3366','#5e4062','#3c2e4c','#1e1628'],fog:0x2e2440,fogN:70,fogF:210,hemi:[0x9a88d0,0x201828,.6],sun:[0xc8b8ff,1.15],
    grass:['#3e3a44',['70,62,84','48,44,56','86,74,96','58,50,66'],[250,290],[10,22],[20,34]],blade:[.76,.12,.22,.06],
    side:0x4a4452,under:0x3e3946,cliff:0x55505e,moss:0x5a3a78,leaf:[0x3a2a48,0x4c3058,0x2a2034,0x5e3a6c],flower:[0xb080ff,0x7fd8ff,0xe0c8ff],pollen:0xb890ff,cloud:0x6a5a88,sea:0x2a2040,islet:0x6a6078},
  beast:{sky:['#3f86c8','#86c2ea','#d4ecf2','#f2f0c8','#eef4e0','#dcece8'],fog:0xd4ecd8,fogN:95,fogF:230,hemi:[0xe0f4d0,0x4a7a38,.7],sun:[0xfff0c0,1.95],
    grass:['#4f9a3a',['104,176,64','62,126,40','130,190,74','76,140,52'],[80,120],[48,62],[24,48]],blade:[.24,.62,.3,.18],
    side:0x8a6a48,under:0x9a8264,cliff:0x7a7466,moss:0x3f8f34,leaf:[0x3f9a38,0x57b045,0x2f7d2c,0x7cc050],flower:[0xff6a5a,0xffd24d,0xff8fb0],pollen:0xdfffa8,cloud:0xffffff,sea:0xa8d4e8,islet:0xffffff},
  human:{sky:['#3f78cf','#7fb4ec','#cfe4f7','#ffe7c6','#f6efe6','#dfe9f6'],fog:0xcfe0f3,fogN:95,fogF:230,hemi:[0xcfe3ff,0x6a7a55,.62],sun:[0xffe6c0,1.9],
    grass:['#6a9e48',['140,176,82','96,130,58','162,182,96','104,146,66'],[70,100],[40,52],[30,46]],blade:[.2,.45,.34,.14],
    side:0x9a8068,under:0xb49c84,cliff:0x9a9288,moss:0x5a8a44,leaf:[0x4c8f3a,0xe0892c,0x5fa545,0xd9b040],flower:[0xffffff,0xff6b5a,0x8fd3ff],pollen:0xfff6c8,cloud:0xffffff,sea:0x9fc4ee,islet:0xf0f0d8}};
let RACE_NOW=null; const RACE_DECO=new THREE.Group(); scene.add(RACE_DECO);
const RACE_TICKS=[]; let LANDMARK=null;
function skyTex(c){return srgb(canvasTex(64,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);[0,.3,.47,.53,.62,1].forEach((t,i)=>g.addColorStop(t,c[i]));x.fillStyle=g;x.fillRect(0,0,s,s);}));}
function groundTex(G){const [base,spots,hue,sat,lig]=G;return srgb(canvasTex(512,(x,s)=>{x.fillStyle=base;x.fillRect(0,0,s,s);
  for(let i=0;i<90;i++){const cx=Math.random()*s,cy=Math.random()*s,r=30+Math.random()*90,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=spots[i%4];g.addColorStop(0,`rgba(${c},.45)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
  x.lineWidth=1.1;for(let i=0;i<22000;i++){const h=hue[0]+Math.random()*(hue[1]-hue[0]),l=lig[0]+Math.random()*(lig[1]-lig[0]);x.strokeStyle=`hsla(${h},${sat[0]+Math.random()*(sat[1]-sat[0])}%,${l}%,.55)`;const px=Math.random()*s,py=Math.random()*s;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*3,py-3-Math.random()*5);x.stroke();}}));}
// ตำแหน่งวางของตกแต่งรอบขอบเกาะ (เลี่ยงทางเดินทิศใต้ ลำธาร และสิ่งกีดขวางเดิม)
function decoSpots(n,rMin,rMax,pad){const out=[];let guard=0;
  while(out.length<n&&guard++<4000){const a=Math.random()*6.283, r=rMin+Math.random()*(rMax-rMin), x=Math.cos(a)*r, z=Math.sin(a)*r;
    const da=Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)), ds=Math.atan2(Math.sin(a+.55),Math.cos(a+.55));
    if(Math.abs(da)<.3||Math.abs(ds)<.2||!onIsland(x,z,1.2))continue;
    if(BLOCK.some(b=>!b.race&&Math.hypot(x-b.x,z-b.z)<b.r+pad)||out.some(o=>Math.hypot(x-o[0],z-o[1])<pad*2))continue;
    out.push([x,z]);}
  return out;}
const DK=(c,o)=>SM(c,o);
function decoAdd(o,x,z,r){o.position.x=x;o.position.z=z;o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});RACE_DECO.add(o);if(r)BLOCK.push({x,z,r,race:1});return o;}
/* ---------- ของตกแต่งแต่ละเผ่า ---------- */
const DECO={
  god(){const marble=DK(0xf4f1ea,{roughness:.45}), gold=DK(0xe0b54a,{metalness:.85,roughness:.28}), cry=DK(0x9ff0ff,{emissive:0x4fd8ff,emissiveIntensity:1.1,roughness:.1,transparent:true,opacity:.9});
    decoSpots(12,FARM_R-7,FARM_R-1.5,1.3).forEach(([x,z],i)=>{const g=new THREE.Group();
      if(i%3===0){const h=2.2+Math.random()*1.6,br=Math.random()<.35; P(g,Y1,marble,[0,.12,0],[.62,.24,.62]); P(g,new THREE.CylinderGeometry(.28,.32,1,12),marble,[0,(br?h*.55:h)/2+.24,0],[1,br?h*.55:h,1]);
        if(!br){P(g,Y1,marble,[0,h+.3,0],[.62,.16,.62]);P(g,Y1,gold,[0,h+.4,0],[.66,.05,.66]);}else P(g,new THREE.DodecahedronGeometry(.3,0),marble,[.5,.2,.3],[1,.6,1]);}
      else if(i%3===1){P(g,Y1,marble,[0,.35,0],[.7,.7,.7]);P(g,Y1,gold,[0,.72,0],[.76,.06,.76]);P(g,new THREE.SphereGeometry(.34,20,14),gold,[0,1.1,0]);glow(g,0xfff0a0,1.6,[0,1.1,0],.45);}
      else{for(let k=0;k<5;k++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),cry);c.scale.set(.6,1.6+Math.random()*1.4,.6);c.position.set((Math.random()-.5)*.7,.45,(Math.random()-.5)*.7);c.rotation.set((Math.random()-.5)*.6,0,(Math.random()-.5)*.6);g.add(c);}glow(g,0x9ff0ff,2.2,[0,.8,0],.4);}
      decoAdd(g,x,z,.8);});
    // เมฆปุยเกาะตามขอบ
    for(let i=0;i<14;i++){const a=i/14*6.283+Math.random()*.2, r=coastR(a)-.4;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:FT.cloud,transparent:true,opacity:.85,depthWrite:false}));s.position.set(Math.cos(a)*r,.3,Math.sin(a)*r);s.scale.set(3.4,1.6,1);RACE_DECO.add(s);}
    // ซุ้มประตูทองริมระเบียงใต้
    {const g=new THREE.Group();[-1.4,1.4].forEach(sx=>{P(g,Y1,marble,[sx,1.4,0],[.26,2.8,.26]);P(g,Y1,gold,[sx,2.85,0],[.34,.1,.34]);});const arc=new THREE.Mesh(new THREE.TorusGeometry(1.4,.12,8,24,Math.PI),gold);arc.position.y=2.85;g.add(arc);glow(g,0xfff0b0,2.4,[0,3.6,0],.35);decoAdd(g,0,FARM_R-4.8);}
  },
  undead(){const stone=DK(0x6a6572,{roughness:.95}), dark=DK(0x2a2230,{roughness:.9}), cry=DK(0xc58cff,{emissive:0x9a4dff,emissiveIntensity:1.3,roughness:.15,transparent:true,opacity:.92}), bone=DK(0xd8d0c0,{roughness:.8});
    decoSpots(17,FARM_R-7.5,FARM_R-1.5,1.1).forEach(([x,z],i)=>{const g=new THREE.Group();g.rotation.y=Math.random()*6;
      if(i%3===0){for(let k=0;k<3;k++){const t=new THREE.Group();t.position.set((k-1)*.9,0,(Math.random()-.5)*.6);t.rotation.set((Math.random()-.5)*.2,(Math.random()-.5)*.5,(Math.random()-.5)*.25);
          P(t,B1,stone,[0,.45,0],[.55,.9,.16]);P(t,new THREE.CylinderGeometry(.275,.275,.16,16,1,false,0,Math.PI),stone,[0,.9,0],[1,1,1],[Math.PI/2,0,Math.PI/2]);P(t,B1,dark,[0,.6,.085],[.28,.05,.01]);P(t,B1,dark,[0,.6,.085],[.05,.32,.01]);g.add(t);}}
      else if(i%3===1){const bark=DK(0x2e2430,{roughness:1});const tr=lathe([[.35,0],[.26,.8],[.18,2],[.08,3]],8);P(g,tr,bark,[0,0,0]);
        for(let k=0;k<5;k++){const a=k/5*6.28+Math.random(),h=1.2+Math.random()*1.6,L=.9+Math.random()*.8;P(g,Y1,bark,[Math.cos(a)*L*.4,h+L*.3,Math.sin(a)*L*.4],[.06,L,.06],[Math.sin(a)*.9,0,-Math.cos(a)*.9]);}}
      else{for(let k=0;k<4;k++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),cry);c.scale.set(.55,1.8+Math.random()*1.5,.55);c.position.set((Math.random()-.5)*.6,.5,(Math.random()-.5)*.6);c.rotation.set((Math.random()-.5)*.7,0,(Math.random()-.5)*.7);g.add(c);}
        P(g,new THREE.SphereGeometry(.12,8,6),bone,[.5,.1,.3]);glow(g,0xb070ff,2.4,[0,.9,0],.45);}
      decoAdd(g,x,z,.9);});
    // วิญญาณลอย
    const W=[];for(let i=0;i<12;i++){const s=glow(RACE_DECO,i%2?0xb8a0ff:0x9fe8ff,.5+Math.random()*.4,[0,0,0],.6);s.userData.p=[Math.random()*6,10+Math.random()*9,.8+Math.random()*2];W.push(s);}
    RACE_TICKS.push((dt,T)=>W.forEach(s=>{const [a,R,h]=s.userData.p;const t=T*.12+a;s.position.set(Math.cos(t)*R,h+Math.sin(T*1.3+a)*.5,Math.sin(t)*R);s.material.opacity=.35+.3*Math.sin(T*2+a*3);}));
    // รั้วเหล็กดำตามขอบ
    const fm=DK(0x1e1a24,{metalness:.6,roughness:.5});for(let i=0;i<36;i++){const a=i/36*6.283, r=coastR(a)-.6;const da=Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2));if(Math.abs(da)<.3)continue;
      const g=new THREE.Group();for(let k=-2;k<=2;k++){P(g,Y1,fm,[k*.3,.55,0],[.035,1.1,.035]);P(g,C1,fm,[k*.3,1.16,0],[.06,.14,.06]);}P(g,B1,fm,[0,.9,0],[1.3,.04,.04]);P(g,B1,fm,[0,.3,0],[1.3,.04,.04]);
      g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);g.rotation.y=-a+Math.PI/2;RACE_DECO.add(g);}
  },
  beast(){const stem=DK(0xf1e6cc,{roughness:.8}), cap=DK(0xd83a2c,{roughness:.55}), spot=DK(0xfff6e8), wood=DK(0x8a5a36,{map:FT.wood,roughness:.9}), paint=[0xd8432c,0x2c8fd8,0xf0c030,0x3fa84a];
    decoSpots(14,FARM_R-7.5,FARM_R-1.5,1.2).forEach(([x,z],i)=>{const g=new THREE.Group();g.rotation.y=Math.random()*6;
      if(i%3===0){const s=.8+Math.random()*.9;P(g,lathe([[.18,0],[.14,.5],[.16,1],[.2,1.2]],10),stem,[0,0,0],[s,s,s]);const c=new THREE.Mesh(new THREE.SphereGeometry(.75,18,10,0,6.283,0,Math.PI/2),cap);c.position.y=1.15*s;c.scale.set(s,s*.8,s);g.add(c);
        for(let k=0;k<7;k++){const a=Math.random()*6.28,b=Math.random()*1.1;P(g,new THREE.SphereGeometry(.08,6,4),spot,[Math.cos(a)*Math.sin(b)*.72*s,1.15*s+Math.cos(b)*.58*s,Math.sin(a)*Math.sin(b)*.72*s],[1,.4,1]);}}
      else if(i%3===1){for(let k=0;k<4;k++){P(g,Y1,DK(paint[(k+i)%4],{roughness:.7}),[0,.35+k*.62,0],[.36,.6,.36]);P(g,B1,DK(0x1a1410),[0,.42+k*.62,.36],[.3,.08,.02]);}
        [-1,1].forEach(sx=>P(g,B1,DK(paint[i%4]),[sx*.55,2.2,0],[.7,.14,.12],[0,0,sx*.35]));P(g,C1,DK(0xf0c030),[0,2.95,0],[.3,.4,.3]);}
      else{P(g,new THREE.CylinderGeometry(1.1,1.2,.9,8,1,true),wood,[0,.45,0]);const r=new THREE.Mesh(new THREE.ConeGeometry(1.45,1.2,8),DK(0xc8a060,{roughness:1}));r.position.y=1.5;g.add(r);P(g,B1,DK(0x2a1a10),[0,.4,1.08],[.5,.7,.05]);}
      decoAdd(g,x,z,1);});
    // ซุ้มเถาวัลย์ดอกไม้
    {const g=new THREE.Group();const vine=DK(0x3f8f34,{roughness:.9});const arc=new THREE.Mesh(new THREE.TorusGeometry(1.5,.14,8,24,Math.PI),vine);arc.position.y=1.4;g.add(arc);[-1.5,1.5].forEach(sx=>P(g,Y1,wood,[sx,.7,0],[.12,1.4,.12]));
      for(let k=0;k<12;k++){const a=k/11*Math.PI;P(g,new THREE.SphereGeometry(.12,6,4),DK([0xff6a5a,0xffd24d,0xff8fb0][k%3]),[Math.cos(a)*1.5,1.4+Math.sin(a)*1.5,.1]);}decoAdd(g,0,FARM_R-4.8);}
  },
  human(){const stone=DK(0xb8b0a2,{map:FT.rock,roughness:.95}), wood=DK(0x8a5a36,{map:FT.wood,roughness:.9}), cloth=[0xc23a2c,0x2c5fb8,0xe0b040];
    decoSpots(13,FARM_R-7.5,FARM_R-1.5,1.3).forEach(([x,z],i)=>{const g=new THREE.Group();g.rotation.y=Math.random()*6;
      if(i%3===0){P(g,B1,stone,[0,.55,0],[2.4,1.1,.55]);for(let k=-2;k<=2;k++)if(k%2===0)P(g,B1,stone,[k*.5,1.28,0],[.4,.36,.56]);}
      else if(i%3===1){P(g,Y1,wood,[0,1.7,0],[.07,3.4,.07]);const f=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.4,1,6),DK(cloth[i%3],{side:THREE.DoubleSide,roughness:.8}));f.position.set(.47,2.7,0);f.userData.flag=1;g.add(f);P(g,S1,DK(0xe0b54a,{metalness:.8,roughness:.3}),[0,3.45,0],[.1,.1,.1]);}
      else{P(g,new THREE.CylinderGeometry(.75,.8,.8,14),stone,[0,.4,0]);P(g,new THREE.CylinderGeometry(.62,.62,.05,14),DK(0x3a7fb0,{roughness:.1}),[0,.72,0]);[-1,1].forEach(sx=>P(g,Y1,wood,[sx*.62,1.2,0],[.07,1.2,.07]));P(g,C1,DK(0x8a3a2c),[0,2.05,0],[1.1,.55,1.1],[0,Math.PI/4,0]);}
      decoAdd(g,x,z,1);});
    // หอสังเกตการณ์หินเล็ก ๆ
    {const a=-2.4,r=coastR(a)-2.2;const g=new THREE.Group();P(g,new THREE.CylinderGeometry(1,1.15,4,10),stone,[0,2,0]);for(let k=0;k<8;k++){const t=k/8*6.283;P(g,B1,stone,[Math.cos(t)*.95,4.2,Math.sin(t)*.95],[.35,.45,.35]);}
      P(g,C1,DK(0x8a3a2c),[0,5,0],[1.3,1.3,1.3]);P(g,B1,DK(0x1a1410),[0,2.6,1.1],[.35,.6,.05]);decoAdd(g,Math.cos(a)*r,Math.sin(a)*r,1.4);}
  }};
/* ---------- เปลี่ยนธีมเกาะ ---------- */
const LEAF0=new Map();
function applyRaceTheme(r){
  if(!THEME[r]||RACE_NOW===r)return; RACE_NOW=r; const Th=THEME[r];
  // ท้องฟ้า หมอก แสง
  if(SKY.material.map)SKY.material.map.dispose(); SKY.material.map=skyTex(Th.sky); SKY.material.needsUpdate=true;
  scene.fog.color.setHex(Th.fog); scene.fog.near=Th.fogN; scene.fog.far=Th.fogF;
  HEMI.color.setHex(Th.hemi[0]); HEMI.groundColor.setHex(Th.hemi[1]); HEMI.intensity=Th.hemi[2]; sun.color.setHex(Th.sun[0]); sun.intensity=Th.sun[1];
  // พื้นเกาะ หน้าผา ใต้เกาะ
  const gt=groundTex(Th.grass); gt.repeat.set(.12,.12); if(ISL.top.map)ISL.top.map.dispose(); ISL.top.map=gt; ISL.top.needsUpdate=true;
  ISL.side.color.setHex(Th.side); ISL.under.color.setHex(Th.under); ISL.cliff.color.setHex(Th.cliff); ISL.moss.color.setHex(Th.moss);
  // ใบไม้ทั้งเกาะ (จำสีเดิมไว้ แล้วไล่เลือกจากจานสีของเผ่าตามความสว่างเดิม)
  const hsl={};Object.values(leafMats).forEach((m,i)=>{if(!LEAF0.has(m))LEAF0.set(m,m.color.clone());LEAF0.get(m).getHSL(hsl);
    const c=Th.leaf[(Math.floor(hsl.l*9)+i)%Th.leaf.length];m.color.set(c).convertSRGBToLinear();});
  // หญ้าและดอกไม้
  {const g=ISL.grass,b=Th.blade,c=new THREE.Color();for(let i=0;i<g.count;i++){c.setHSL(b[0]+Math.random()*.06,b[1],b[2]+Math.random()*b[3]);g.setColorAt(i,c);}g.instanceColor.needsUpdate=true;
    const f=ISL.flowers;for(let i=0;i<f.count;i++)f.setColorAt(i,c.setHex(Th.flower[i%Th.flower.length]));f.instanceColor.needsUpdate=true;}
  POLLEN.forEach(s=>s.material.color.setHex(Th.pollen)); clouds.forEach(s=>s.material.color.setHex(Th.cloud));
  SEA.material.color.setHex(Th.sea); ISLETS.forEach(g=>{const m=g.userData.top;if(m&&m.color){m.map=gt;m.color.setHex(0xffffff);m.needsUpdate=true;}});
  // ของตกแต่งเผ่า (ลบของเก่าก่อน)
  for(let i=BLOCK.length-1;i>=0;i--)if(BLOCK[i].race)BLOCK.splice(i,1);
  RACE_TICKS.length=0; while(RACE_DECO.children.length)RACE_DECO.remove(RACE_DECO.children[0]);
  DECO[r]();
  loadStatue(r);
  // ตัวเกาะหลัก = โมเดลเกาะของเผ่า (ขยายใหญ่) · ฐานหินใต้เกาะใช้ของโมเดล ส่วนวิหาร/ปราสาทตั้งที่ลานหลังเกาะ
  loadRaceIsland(r);
}
/* เกาะหลักจากโมเดลของเผ่า
   ใช้ไฟล์เดียวทำ 2 ชิ้นด้วย clipping plane (ไม่ต้องโหลดเพิ่ม):
   1) ฐานเกาะ: ขยายให้กว้างกว่าพื้นฟาร์มเล็กน้อย ตัดส่วนที่สูงกว่าพื้นทิ้ง เหลือหินใต้เกาะ+ขอบพื้น
   2) วิหาร/ปราสาท: ย่อลงตั้งบนลานหลังเกาะ (CASTLE) ตัดส่วนใต้พื้นทิ้ง
   GY = ระดับพื้นของโมเดล (สัดส่วนความสูงจากก้นโมเดล วัดจากพื้นผิวแนวราบที่มากที่สุด) */
const GY={god:.44,undead:.44,beast:.38,human:.25};
renderer.localClippingEnabled=true;
let RISL=null;
function cloneClip(src,plane,dbl){const o=src.clone(true);o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.clippingPlanes=[plane];if(dbl)m.material.side=THREE.DoubleSide;if(ENV){m.material.envMap=ENV;m.material.envMapIntensity=.3;}}});return o;}
function loadRaceIsland(r){
  if(RISL){scene.remove(RISL);RISL=null;}
  new THREE.GLTFLoader().load(RACES[r].glb,g=>{if(RACE_NOW!==r)return;const src=g.scene;
    const box=new THREE.Box3().setFromObject(src),sz=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3()),gy=box.min.y+sz.y*(GY[r]||.4),W=Math.max(sz.x,sz.z);
    const root=new THREE.Group();
    // 1) ฐานเกาะ: พื้นของโมเดลอยู่ต่ำกว่าพื้นฟาร์มนิดเดียว (-0.3) ให้ขอบหินโผล่รอบเกาะ
    const sb=2*FARM_R*1.14/W, base=cloneClip(src,new THREE.Plane(new THREE.Vector3(0,-1,0),-.18),true);
    base.scale.setScalar(sb);base.position.set(-ctr.x*sb,-.3-gy*sb,-ctr.z*sb);
    base.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=true;}});root.add(base);
    // 2) วิหาร/ปราสาทของเผ่า บนลานหลังเกาะ
    const st=CASTLE.r*3.2/W, top=cloneClip(src,new THREE.Plane(new THREE.Vector3(0,1,0),-.02),false);
    top.scale.setScalar(st);top.position.set(CASTLE.x-ctr.x*st,-gy*st,CASTLE.z-ctr.z*st);
    top.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});root.add(top);
    glow(root,new THREE.Color(RACES[r].c).getHex(),CASTLE.r*2.4,[CASTLE.x,sz.y*st*.45,CASTLE.z-1],.16);
    scene.add(root);RISL=root;
    // ซ่อนฐานหินเดิมของเกาะฟาร์ม (เหลือพื้นหญ้าด้านบน)
    island.children.forEach((c,i)=>{if(i>0)c.visible=false;});
  });
}
/* รูปปั้นประจำเผ่า (Tripo) ตั้งบนเกาะในที่ว่างที่เห็นชัดจากกล้อง */
let STATUE=null;
function statueSpot(){for(const r of [11,12.5,9.5,14])for(let k=0;k<50;k++){const a=.75+(k%2?1:-1)*Math.ceil(k/2)*.08,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(onIsland(x,z,2)&&!BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+1.6))return [x,z];}
  return [8,8];}
function loadStatue(r){if(STATUE){RACE_DECO.remove(STATUE);STATUE=null;}const src=RACES[r].statue;if(!src)return;
  new THREE.GLTFLoader().load(src,g=>{if(RACE_NOW!==r)return;const o=g.scene;o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;if(m.material&&ENV){m.material.envMap=ENV;m.material.envMapIntensity=.4;}}});
    const box=new THREE.Box3().setFromObject(o),sz=box.getSize(new THREE.Vector3()),s=(RACES[r].statueH||5.5)/sz.y;o.scale.setScalar(s);
    const c=box.getCenter(new THREE.Vector3());o.position.set(-c.x*s,-box.min.y*s,-c.z*s);
    const [x,z]=statueSpot(),w=new THREE.Group();w.add(o);w.position.set(x,0,z);w.rotation.y=Math.atan2(-x,30-z);
    glow(w,new THREE.Color(RACES[r].c).getHex(),3.4,[0,(RACES[r].statueH||5.5)*.55,0],.22);RACE_DECO.add(w);BLOCK.push({x,z,r:Math.max(sz.x,sz.z)*s*.5+.3,race:1});STATUE=w;window.__statue=[x,z];});}
function raceWorldTick(dt,T){RACE_TICKS.forEach(f=>f(dt,T));}
