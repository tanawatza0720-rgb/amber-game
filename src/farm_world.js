/* ================= ฟาร์มของผู้เล่น ================= */
const FARM_R=26, FS=FARM_R/17; // เกาะขยายกว้างขึ้น (เดิม 17) · ตัวเกาะใช้โมเดลเกาะของเผ่า (farm_race.js)
const SM=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
const FT={
  grass:srgb(canvasTex(512,(x,s)=>{x.fillStyle='#5f9d45';x.fillRect(0,0,s,s);
    for(let i=0;i<50;i++){const cx=Math.random()*s,cy=Math.random()*s,r=20+Math.random()*70,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=Math.random()<.5?'120,170,70':'70,120,50';g.addColorStop(0,`rgba(${c},.35)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    x.lineWidth=1.2;for(let i=0;i<14000;i++){const h=85+Math.random()*35,l=28+Math.random()*28;x.strokeStyle=`hsla(${h},50%,${l}%,.6)`;const px=Math.random()*s,py=Math.random()*s;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*3,py-3-Math.random()*5);x.stroke();}},[1,1])),
  dirt:srgb(canvasTex(256,(x,s)=>{x.fillStyle='#6b4a2f';x.fillRect(0,0,s,s);for(let y=0;y<s;y+=6+Math.random()*10){x.fillStyle=`rgba(${60+Math.random()*60|0},${40+Math.random()*30|0},${20+Math.random()*20|0},.6)`;x.fillRect(0,y,s,3+Math.random()*6);}
    for(let i=0;i<3000;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.25})`;x.fillRect(Math.random()*s,Math.random()*s,2,2);}},[4,1])),
  rock:srgb(canvasTex(256,(x,s)=>{x.fillStyle='#8a8580';x.fillRect(0,0,s,s);for(let i=0;i<60;i++){x.fillStyle=`rgba(${Math.random()<.5?40:210},${Math.random()<.5?40:200},${Math.random()<.5?40:190},${Math.random()*.08})`;x.beginPath();x.arc(Math.random()*s,Math.random()*s,8+Math.random()*40,0,7);x.fill();}
    for(let i=0;i<8000;i++){const v=Math.random()*255|0;x.fillStyle=`rgba(${v},${v},${v},.12)`;x.fillRect(Math.random()*s,Math.random()*s,1.5,1.5);}},[2,2])),
  wood:srgb(canvasTex(256,(x,s)=>{x.fillStyle='#8a5a36';x.fillRect(0,0,s,s);for(let i=0;i<8;i++){const px=i*s/8;x.fillStyle=`rgba(${120+Math.random()*40|0},${75+Math.random()*25|0},${40+Math.random()*20|0},.5)`;x.fillRect(px,0,s/8,s);x.fillStyle='rgba(30,18,10,.6)';x.fillRect(px,0,2,s);}
    for(let i=0;i<60;i++){x.strokeStyle=`rgba(60,35,18,${.15+Math.random()*.2})`;x.beginPath();const px=Math.random()*s;x.moveTo(px,0);x.bezierCurveTo(px+5,s*.3,px-5,s*.6,px+2,s);x.stroke();}},[1,1])),
  roof:srgb(canvasTex(256,(x,s)=>{x.fillStyle='#3b414d';x.fillRect(0,0,s,s);for(let y=0;y<s;y+=16){for(let xx=(y/16%2)*8;xx<s;xx+=16){x.fillStyle=`rgba(0,0,0,${.25+Math.random()*.15})`;x.beginPath();x.arc(xx+8,y+14,8,Math.PI,0);x.fill();x.fillStyle='rgba(255,255,255,.06)';x.fillRect(xx,y,16,3);}}},[4,4])),
  shoji:srgb(canvasTex(128,(x,s)=>{x.fillStyle='#f3ead6';x.fillRect(0,0,s,s);x.fillStyle='#6b4a2e';for(let i=0;i<=4;i++){x.fillRect(i*s/4-2,0,4,s);x.fillRect(0,i*s/4-2,s,4);}},[1,1])),
  water:canvasTex(128,(x,s)=>{x.fillStyle='#4fb3e0';x.fillRect(0,0,s,s);for(let i=0;i<50;i++){x.strokeStyle=`rgba(255,255,255,${.1+Math.random()*.35})`;x.lineWidth=1+Math.random()*2;const px=Math.random()*s;x.beginPath();x.moveTo(px,Math.random()*s);x.lineTo(px+(Math.random()-.5)*4,Math.random()*s);x.stroke();}},[1,1]),
  pond:canvasTex(256,(x,s)=>{x.fillStyle='#3a9fd0';x.fillRect(0,0,s,s);for(let i=0;i<40;i++){x.strokeStyle=`rgba(255,255,255,${.08+Math.random()*.15})`;x.lineWidth=1.5;x.beginPath();const cx=Math.random()*s,cy=Math.random()*s;x.ellipse(cx,cy,10+Math.random()*25,3+Math.random()*5,0,0,Math.PI*2);x.stroke();}},[2,2]),
  cloud:canvasTex(256,(x,s)=>{for(let i=0;i<16;i++){const cx=s*.2+Math.random()*s*.6,cy=s*.4+Math.random()*s*.25,r=s*(.1+Math.random()*.16),g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.6,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}}),
  sky:srgb(canvasTex(64,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#3f78cf');g.addColorStop(.3,'#7fb4ec');g.addColorStop(.47,'#cfe4f7');g.addColorStop(.53,'#ffe7c6');g.addColorStop(.62,'#f6efe6');g.addColorStop(1,'#dfe9f6');x.fillStyle=g;x.fillRect(0,0,s,s);})),
  strata:srgb(canvasTex(256,(x,s)=>{let y=0;const cs=['#7b6049','#8d7055','#6a5040','#9a7d60','#5e4739','#86694f'];while(y<s){const h=6+Math.random()*22;x.fillStyle=cs[Math.random()*cs.length|0];x.fillRect(0,y,s,h);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,y+h-2,s,2);y+=h;}
    for(let i=0;i<5000;i++){const v=Math.random()*255|0;x.fillStyle=`rgba(${v},${v},${v},.08)`;x.fillRect(Math.random()*s,Math.random()*s,2,1.5);}
    for(let i=0;i<14;i++){x.strokeStyle='rgba(30,20,12,.35)';x.lineWidth=1.5;x.beginPath();let px=Math.random()*s,py=Math.random()*s;x.moveTo(px,py);for(let k=0;k<5;k++){px+=(Math.random()-.5)*18;py+=6+Math.random()*14;x.lineTo(px,py);}x.stroke();}},[8,1])),
  grassTop:srgb(canvasTex(512,(x,s)=>{x.fillStyle='#5f9e40';x.fillRect(0,0,s,s);
    for(let i=0;i<90;i++){const cx=Math.random()*s,cy=Math.random()*s,r=30+Math.random()*90,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=['124,176,70','78,130,48','140,182,80','86,140,60'][i%4];g.addColorStop(0,`rgba(${c},.45)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    x.lineWidth=1.1;for(let i=0;i<22000;i++){const h=80+Math.random()*40,l=26+Math.random()*28;x.strokeStyle=`hsla(${h},50%,${l}%,.55)`;const px=Math.random()*s,py=Math.random()*s;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*3,py-3-Math.random()*5);x.stroke();}},[1,1])),
  fade:canvasTex(8,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#fff');g.addColorStop(.75,'#fff');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,s,s);}),

};
function textTex(text,w,h,bg,fg,font){return srgb(canvasTex(256,(x,s)=>{x.fillStyle=bg;x.fillRect(0,0,s,s);x.fillStyle=fg;x.font=font||`bold ${s*.26}px "Chakra Petch", sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,s/2,s/2);}));}

/* ---------- ท้องฟ้า เมฆ แสง ---------- */
const SKY=new THREE.Mesh(new THREE.SphereGeometry(240,32,16),new THREE.MeshBasicMaterial({map:FT.sky,side:THREE.BackSide,fog:false,toneMapped:false}));scene.add(SKY);
scene.fog=new THREE.Fog(0xcfe0f3,95,230);
renderer.toneMappingExposure=.82;
const HEMI=new THREE.HemisphereLight(0xcfe3ff,0x5a7a45,.62); scene.add(HEMI);
const sun=new THREE.DirectionalLight(0xffe6c0,1.9); sun.position.set(18,30,12); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-FARM_R-6,right:FARM_R+6,top:FARM_R+6,bottom:-FARM_R-6,near:1,far:100}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.04;
scene.add(sun);
const bounce=new THREE.DirectionalLight(0xffc89a,.4); bounce.position.set(-14,6,-10); scene.add(bounce);
{ // ดวงอาทิตย์เรือง ๆ บนฟ้า
  const sd=sun.position.clone().normalize().multiplyScalar(200);
  glow(scene,0xfff1d0,70,[sd.x,sd.y,sd.z],.55); glow(scene,0xffffff,22,[sd.x,sd.y,sd.z],.9);
}
const clouds=[];
function cloudSprite(x,y,z,sz,op,v){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:FT.cloud,transparent:true,opacity:op,depthWrite:false,fog:false}));
  s.position.set(x,y,z); s.scale.set(sz,sz*.55,1); s.userData.v=v; scene.add(s); clouds.push(s); return s;}
for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2, r=26+Math.random()*40; cloudSprite(Math.cos(a)*r,-6+Math.random()*14,Math.sin(a)*r,12+Math.random()*16,.85,.2+Math.random()*.3);}
// ทะเลเมฆใต้เกาะ
for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2, r=8+Math.random()*80; cloudSprite(Math.cos(a)*r,-20-Math.random()*8,Math.sin(a)*r,26+Math.random()*30,.8,.12+Math.random()*.15);}
const SEA=new THREE.Mesh(new THREE.CircleGeometry(200,48),new THREE.MeshBasicMaterial({color:0x9fc4ee,fog:false,depthWrite:false,toneMapped:false}));SEA.rotation.x=-Math.PI/2;SEA.position.y=-26;scene.add(SEA);

/* ---------- เกาะ ---------- */
const nz=a=>Math.sin(a*3+1)*.5+Math.sin(a*7+2)*.3+Math.sin(a*13+.5)*.2;
const coastR=a=>FARM_R+nz(a)*1.3;
const island=new THREE.Group(); scene.add(island);
const ISL={}; // วัสดุหลักของเกาะ (ใช้เปลี่ยนธีมตามเผ่า)
const AMBER_GLOW=[];
{
  const sh=new THREE.Shape(); for(let i=0;i<=200;i++){const a=i/200*Math.PI*2, r=coastR(a); const x=Math.cos(a)*r, y=Math.sin(a)*r; i?sh.lineTo(x,y):sh.moveTo(x,y);}
  const g=new THREE.ExtrudeGeometry(sh,{depth:2.2,bevelEnabled:true,bevelThickness:.45,bevelSize:.5,bevelSegments:4,curveSegments:1});
  g.rotateX(Math.PI/2);
  const grassT=FT.grassTop.clone(); grassT.needsUpdate=true; grassT.repeat.set(.12,.12);
  const strT=FT.strata.clone(); strT.needsUpdate=true; strT.repeat.set(.06,.9);
  const top=new THREE.Mesh(g,[SM(0xffffff,{map:grassT,roughness:.95}),SM(0xffffff,{map:strT,roughness:1})]); ISL.top=top.material[0]; ISL.side=top.material[1];
  top.position.y=-.45; top.receiveShadow=true; island.add(top);
  // ฐานหินใต้เกาะ เป็นชั้น ๆ
  const ug=lathe([[0,-19],[1.4,-16.5],[3.6,-13],[6.4,-9.6],[9.6,-6.4],[12.2,-4],[14.8,-2.4],[16.6,-1.5],[17.4,-1.1]].map(([r,y])=>[r*FS,y*(1+(FS-1)*.6)]),96);
  const p=ug.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);const k=coastR(a)/FARM_R;
    const j=1+(Math.sin(a*17+y*.8)*.07+Math.sin(a*5-y*.6)*.09+Math.sin(a*29+y*1.7)*.03);p.setXYZ(i,Math.cos(a)*r*k*j,y+Math.sin(a*9+r)*.4,Math.sin(a)*r*k*j);}
  ug.computeVertexNormals();
  const rockT=FT.strata.clone(); rockT.needsUpdate=true; rockT.repeat.set(5,2.2);
  const under=new THREE.Mesh(ug,SM(0xb49c84,{map:rockT,roughness:1})); under.position.y=-.5; island.add(under); ISL.under=under.material;
  // หินงอกห้อยใต้เกาะ
  for(let i=0;i<22;i++){const a=Math.random()*6.28,r=(3+Math.random()*10)*FS;const len=2+Math.random()*4;
    const c=new THREE.Mesh(new THREE.ConeGeometry(.6+Math.random()*.9,len,7),SM(0x8a735e,{map:FT.rock,roughness:1}));
    c.rotation.x=Math.PI; c.position.set(Math.cos(a)*r,-6-(13*FS-r)*.95-len*.35+Math.random(),Math.sin(a)*r); island.add(c);}
  // รากไม้และเถาวัลย์ห้อยจากขอบเกาะ
  const rootM=SM(0x5a3f2a,{roughness:1}), vineM=SM(0x4f8f3f,{roughness:.9});
  for(let i=0;i<44;i++){const a=i/44*Math.PI*2+Math.random()*.1, r=coastR(a)-.3-Math.random()*1.2, L=2+Math.random()*5, vine=i%3===0;
    const pts=[];for(let k=0;k<=5;k++){const t=k/5;pts.push(new THREE.Vector3(Math.cos(a)*(r+Math.sin(t*3)*.3),-1.6-t*L,Math.sin(a)*(r+Math.sin(t*3)*.3)).add(new THREE.Vector3((Math.random()-.5)*.25,0,(Math.random()-.5)*.25)));}
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,vine?.035:.06+Math.random()*.05,5,false),vine?vineM:rootM); island.add(m);
    if(vine)for(let k=1;k<5;k++){const lf=new THREE.Mesh(new THREE.SphereGeometry(.12,6,4),vineM);lf.position.copy(pts[k]);lf.scale.set(1,.6,1);island.add(lf);}}
  // ผลึกอัมพรเรืองแสงใต้เกาะ
  const crysM=SM(0xffb347,{emissive:0xff7a1a,emissiveIntensity:1.4,roughness:.2,metalness:.1,transparent:true,opacity:.95});
  for(let i=0;i<14;i++){const a=Math.random()*6.28,t=Math.random(),r=(16.5-t*13)*FS*coastR(a)/FARM_R,y=-2-t*14;
    const g2=new THREE.Group(); g2.position.set(Math.cos(a)*r*.98,y,Math.sin(a)*r*.98); g2.lookAt(Math.cos(a)*r*3,y-4,Math.sin(a)*r*3); island.add(g2);
    for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.4,0),crysM);c.scale.set(.6,1.6+Math.random(),.6);c.position.set((k-1)*.35,0,.3);c.rotation.z=(k-1)*.4;g2.add(c);}
    AMBER_GLOW.push(glow(g2,0xffa040,3,[0,0,.6],.5));}
}
const onIsland=(x,z,m)=>Math.hypot(x,z)<coastR(Math.atan2(z,x))-(m||0);

/* ---------- ทางเดินหิน ---------- */
const stoneM=SM(0xb8b2a6,{map:FT.rock,roughness:.95});
function path(pts){
  for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/.75));
    for(let k=0;k<n;k++){const t=k/n;const s=new THREE.Mesh(new THREE.CylinderGeometry(.34+Math.random()*.1,.38,.08,7),stoneM);
      s.position.set(ax+(bx-ax)*t+(Math.random()-.5)*.25,.03,az+(bz-az)*t+(Math.random()-.5)*.25);s.rotation.y=Math.random()*3;s.receiveShadow=true;scene.add(s);}}
}
path([[0,16.2],[0,5.6]]); path([[-.8,3.5],[-4.6,.6]]); path([[1,3.5],[5,3.2]]); path([[-1.8,1.5],[-4.2,-4.6]]); path([[1.6,1.3],[4.6,-3.6]]);

/* ---------- ตัวช่วยอาคาร ---------- */
const BUILDINGS=[], PICK=[], BLOCK=[];
// ลานด้านหลังเกาะ เว้นว่างไว้ตั้งวิหาร/ปราสาทของเผ่า (farm_race.js)
const CASTLE={x:0,z:-(FARM_R-7),r:7};BLOCK.push({x:CASTLE.x,z:CASTLE.z,r:CASTLE.r});
function roofGeo(w,d,h){const g=lathe([[1,0],[.8,.1],[.62,.28],[.45,.5],[.3,.72],[.15,.9],[0,1]],4);g.rotateY(Math.PI/4);g.scale(w/1.414,h,d/1.414);return g;}
const woodM=SM(0xffffff,{map:FT.wood}), darkWood=SM(0x3a2518,{roughness:.7}), redM=SM(0xb23a2c,{roughness:.6}), roofM=SM(0xffffff,{map:FT.roof,roughness:.6,metalness:.1}), whiteM=SM(0xf1eadb,{roughness:.9}), goldM=SM(0xd4a84a,{metalness:.9,roughness:.3});
const warmGlow=SM(0xffd9a0,{emissive:0xffa24d,emissiveIntensity:1.6});
function building(id,name,x,z,r,build){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g); build(g);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.pick=id;PICK.push(o);}});
  BUILDINGS.push({id,name,g,x,z,r}); BLOCK.push({x,z,r}); return g;
}
function lanternSmall(parent,x,z){
  const g=J(parent,x,0,z);
  P(g,Y1,stoneM,[0,.06,0],[.22,.12,.22]); P(g,Y1,stoneM,[0,.4,0],[.07,.6,.07]); P(g,B1,stoneM,[0,.78,0],[.26,.2,.26]);
  P(g,B1,warmGlow,[0,.78,0],[.2,.14,.27]); P(g,B1,warmGlow,[0,.78,0],[.27,.14,.2]); P(g,C1,stoneM,[0,.98,0],[.26,.2,.26],[0,Math.PI/4,0]);
  glow(g,0xffb060,.8,[0,.78,0],.35); return g;
}

/* ศาลฟักไข่ */
let hatchEgg=null, hatchEggMat=null;
building('hatch','ศาลฟักไข่',0,3.2,2.9,g=>{
  P(g,Y1,stoneM,[0,.2,0],[2.7,.4,2.7]); P(g,Y1,stoneM,[0,.5,0],[2.05,.25,2.05]);
  const rune=new THREE.Mesh(new THREE.TorusGeometry(1.75,.05,8,80),SM(0x9ffff0,{emissive:0x3fe0c0,emissiveIntensity:1.6}));rune.rotation.x=Math.PI/2;rune.position.y=.64;g.add(rune);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;P(g,B1,SM(0x9ffff0,{emissive:0x3fe0c0,emissiveIntensity:1.2}),[Math.cos(a)*1.45,.64,Math.sin(a)*1.45],[.14,.02,.05],[0,-a,0]);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4, x=Math.cos(a)*2.25, z=Math.sin(a)*2.25;
    P(g,Y1,stoneM,[x,1.4,z],[.2,2.2,.2]); P(g,B1,stoneM,[x,2.55,z],[.42,.14,.42]);
    P(g,S1,SM(0xbffff4,{emissive:0x5fe0c0,emissiveIntensity:1.8}),[x,2.8,z],[.16,.16,.16]); glow(g,0x7fffe0,1.2,[x,2.8,z],.5);}
  P(g,Y1,stoneM,[0,.95,0],[.5,.7,.5]); P(g,Y1,goldM,[0,1.32,0],[.55,.06,.55]);
  const egg=new THREE.Group(); egg.position.set(0,2.15,0); g.add(egg);
  hatchEggMat=SM(0xffcf4d,{metalness:.7,roughness:.25,emissive:0xff9a30,emissiveIntensity:.25});
  P(egg,S1,hatchEggMat,[0,0,0],[.55,.72,.55]);
  const gems=[0xff5a7a,0x5fd3ff,0x8dff7a,0xb07aff];
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;P(egg,new THREE.OctahedronGeometry(1,0),SM(gems[i%4],{emissive:gems[i%4],emissiveIntensity:.6}),[Math.cos(a)*.54,0,Math.sin(a)*.54],[.07,.07,.07]);}
  P(egg,Y1,goldM,[0,0,0],[.56,.05,.56]);
  glow(egg,0xffd27a,3.2,[0,0,0],.45); hatchEgg=egg;
  lanternSmall(g,-1.2,2.4); lanternSmall(g,1.2,2.4);
});

/* สนามประลอง (โดโจ) */
building('dojo','ประตูผจญภัย',-6.8,-.4,3.3,g=>{
  g.rotation.y=.5;
  P(g,B1,stoneM,[0,.25,0],[5.2,.5,4.2]); P(g,B1,stoneM,[0,.12,2.35],[1.8,.24,.6]);
  P(g,B1,woodM,[0,1.5,0],[4.4,2,3.4]);
  for(const [x,z] of [[-2.2,1.7],[2.2,1.7],[-2.2,-1.7],[2.2,-1.7],[-.75,1.7],[.75,1.7]])P(g,Y1,darkWood,[x,1.5,z],[.11,2,.11]);
  const sj=SM(0xffffff,{map:FT.shoji,emissive:0xffe2b0,emissiveIntensity:.15});
  for(const x of [-1.5,0,1.5])P(g,B1,sj,[x,1.35,1.71],[1.3,1.6,.04]);
  P(g,B1,darkWood,[0,2.45,1.72],[4.5,.14,.08]);
  P(g,roofGeo(6.2,5.2,1.9),roofM,[0,2.5,0]);
  P(g,B1,woodM,[0,3.75,0],[1.8,.7,1.4]);
  P(g,roofGeo(2.9,2.4,1.1),roofM,[0,4.05,0]);
  P(g,B1,darkWood,[0,2.95,2.02],[1.7,.55,.07]);
  P(g,B1,textTex('ประลอง',256,256,'#2a1a10','#f3d58a'),[0,2.95,2.07],[1.55,.45,.01]);
  // ธง
  [-1,1].forEach(sx=>{P(g,Y1,darkWood,[sx*2.9,2.2,2.2],[.05,4.4,.05]);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.9,1,6),SM(0xffffff,{map:textTex('⚔',256,256,'#a3262a','#f6e7c8',`bold 150px sans-serif`),side:THREE.DoubleSide}));
    fl.position.set(sx*2.55,3.35,2.2); fl.userData.flag=1; g.add(fl);});
  // หุ่นฝึก
  [[-1.4,3.1],[1.4,3.2]].forEach(([x,z])=>{P(g,Y1,woodM,[x,.75,z],[.08,1.5,.08]);for(let i=0;i<5;i++)P(g,Y1,SM(0xcfb27a,{roughness:1}),[x,.6+i*.12,z],[.14,.1,.14]);P(g,B1,woodM,[x,1.15,z],[.6,.06,.06]);});
});

/* หอคัมภีร์ (เก็บมอนสเตอร์) */
building('archive','หอคัมภีร์มอนสเตอร์',-4.6,-6.4,2.6,g=>{
  g.rotation.y=.35;
  P(g,B1,stoneM,[0,.2,0],[3.6,.4,3.6]);
  for(let i=0;i<3;i++){const sz=2.6-i*.6, y=.4+i*1.75;
    P(g,B1,whiteM,[0,y+.65,0],[sz,1.3,sz]);
    for(const sx of [-1,1])for(const sz2 of [-1,1])P(g,Y1,redM,[sx*sz/2,y+.65,sz2*sz/2],[.09,1.3,.09]);
    P(g,B1,redM,[0,y+1.25,0],[sz+.08,.12,sz+.08]);
    P(g,B1,SM(0x3a2518),[0,y+.55,sz/2+.01],[sz*.35,.8,.02]);
    P(g,roofGeo(sz+1.5,sz+1.5,.85),roofM,[0,y+1.3,0]);}
  P(g,Y1,goldM,[0,6.3,0],[.06,1.3,.06]); for(let i=0;i<5;i++)P(g,ROPE,goldM,[0,5.9+i*.18,0],[.14-i*.015,.14-i*.015,.14-i*.015],[Math.PI/2,0,0]);
  P(g,S1,goldM,[0,7.0,0],[.12,.12,.12]);
  lanternSmall(g,-1.6,2); lanternSmall(g,1.6,2);
});

/* ร้านค้า */
building('shop','ร้านค้า',6.6,2.6,2.5,g=>{
  g.rotation.y=-.6;
  P(g,B1,woodM,[0,.02,0],[3.4,.08,2.6]);
  P(g,B1,woodM,[0,.55,.6],[3,1,.7]); P(g,B1,darkWood,[0,1.08,.62],[3.1,.08,.8]);
  P(g,B1,woodM,[0,1.3,-1.1],[3.2,2.6,.15]);
  for(const x of [-1.5,1.5])for(const z of [.95,-1.05])P(g,Y1,darkWood,[x,1.3,z],[.08,2.6,.08]);
  const stripes=srgb(canvasTex(128,(x,s)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f3e6c8':'#c2372c';x.fillRect(i*s/8,0,s/8,s);}}));
  const aw=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.3,1,4),SM(0xffffff,{map:stripes,side:THREE.DoubleSide}));aw.position.set(0,2.55,-.05);aw.rotation.x=-Math.PI/2+.32;g.add(aw);
  P(g,B1,darkWood,[0,3.1,-1.1],[2,.5,.08]); P(g,B1,textTex('ร้านค้า',256,256,'#2a1a10','#f3d58a'),[0,3.1,-1.05],[1.8,.44,.01]);
  const pot=[0xff5a7a,0x5fd3ff,0x8dff7a,0xffc94d,0xb07aff];
  for(let i=0;i<5;i++){const b=J(g,-1.1+i*.55,1.12,.62);P(b,Y1,SM(pot[i],{emissive:pot[i],emissiveIntensity:.35,roughness:.2}),[0,.14,0],[.1,.24,.1]);P(b,Y1,SM(0x6b4a2e),[0,.3,0],[.05,.06,.05]);}
  [[-1.9,.9],[1.9,.5],[-1.8,-.3]].forEach(([x,z],i)=>{if(i<2){P(g,Y1,woodM,[x,.45,z],[.36,.9,.36]);P(g,ROPE,darkWood,[x,.3,z],[.37,.37,.37],[Math.PI/2,0,0]);P(g,ROPE,darkWood,[x,.65,z],[.37,.37,.37],[Math.PI/2,0,0]);}else P(g,B1,woodM,[x,.35,z],[.7,.7,.7]);});
  [-1.2,1.2].forEach(x=>{const l=J(g,x,2.15,.9);P(l,S1,warmGlow,[0,0,0],[.2,.26,.2]);P(l,Y1,darkWood,[0,.27,0],[.12,.04,.12]);P(l,Y1,darkWood,[0,-.27,0],[.12,.04,.12]);glow(l,0xffb060,1,[0,0,0],.5);});
});

/* ต้นอัมพร */
let amberBubble=null, amberReady=true, amberTimer=0;
building('tree','ต้นอัมพร',6,-5.6,2.2,g=>{
  const bark=SM(0x5b3a24,{map:FT.wood,roughness:.9});
  const trunk=lathe([[.75,0],[.55,.4],[.45,1.2],[.4,2.2],[.32,3.2],[.2,3.8],[0,4]],14);
  P(g,trunk,bark,[0,0,0]);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;P(g,C1,bark,[Math.cos(a)*.6,.18,Math.sin(a)*.6],[.22,.9,.22],[Math.sin(a)*1.3,0,-Math.cos(a)*1.3]);}
  [[-.9,2.8,.2,-.8],[.9,3.1,-.1,.8],[.1,3.2,.8,.2]].forEach(([x,y,z,rz])=>P(g,Y1,bark,[x*.5,y,z*.5],[.12,1.4,.12],[z*.8,0,rz]));
  const leafC=[0xe8a33a,0xd9772b,0xf2c14e,0xc9582a];
  [[0,4.3,0,1.7],[-1.3,3.7,.4,1.15],[1.3,3.9,-.2,1.2],[.3,3.6,1.2,1.05],[-.4,3.9,-1.1,1.1],[.9,4.8,.5,.9],[-.8,4.7,-.2,.95]].forEach(([x,y,z,r],i)=>
    P(g,new THREE.IcosahedronGeometry(1,1),SM(leafC[i%4],{flatShading:true,roughness:.8}),[x,y,z],[r,r*.85,r]));
  const amberM=SM(0xffb347,{emissive:0xff7a1a,emissiveIntensity:1.1,roughness:.15,metalness:.1,transparent:true,opacity:.92});
  [[-1.2,3,.9],[1.4,3.2,.6],[.2,2.9,-1.3],[-1.5,3.4,-.7],[1.1,3.5,-1]].forEach(([x,y,z])=>{P(g,Y1,SM(0x3a2518),[x,y+.25,z],[.01,.5,.01]);P(g,new THREE.OctahedronGeometry(1,0),amberM,[x,y,z],[.13,.2,.13]);glow(g,0xffa040,.6,[x,y,z],.5);});
  // ฟองให้เก็บอัมพร
  const bt=srgb(canvasTex(128,(x,s)=>{x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.arc(s/2,s/2,s*.46,0,7);x.fill();x.strokeStyle='#ff9a30';x.lineWidth=8;x.stroke();
    x.fillStyle='#ffa53a';x.beginPath();x.moveTo(s/2,s*.2);x.lineTo(s*.72,s*.45);x.lineTo(s/2,s*.8);x.lineTo(s*.28,s*.45);x.closePath();x.fill();x.fillStyle='#ffe0a8';x.beginPath();x.moveTo(s/2,s*.2);x.lineTo(s*.6,s*.45);x.lineTo(s/2,s*.5);x.lineTo(s*.4,s*.45);x.closePath();x.fill();}));
  amberBubble=new THREE.Sprite(new THREE.SpriteMaterial({map:bt,depthTest:false}));amberBubble.scale.set(1.1,1.1,1);amberBubble.position.set(0,6.1,0);amberBubble.userData.pick='tree';g.add(amberBubble);PICK.push(amberBubble);
});

/* ประตูโทริอิ */
building('gate','ประตูเยี่ยมเพื่อน',0,10.6,1.6,g=>{
  [-1.25,1.25].forEach(x=>{P(g,Y1,redM,[x,1.7,0],[.16,3.4,.16]);P(g,Y1,SM(0x222222),[x,.12,0],[.22,.24,.22]);});
  P(g,B1,redM,[0,2.75,0],[3.1,.18,.2]);
  P(g,B1,SM(0x1f1f22,{roughness:.5}),[0,3.35,0],[3.9,.22,.34]);
  [-1,1].forEach(sx=>P(g,B1,SM(0x1f1f22,{roughness:.5}),[sx*1.85,3.43,0],[.5,.18,.34],[0,0,sx*.22]));
  P(g,B1,SM(0x1f1f22),[0,3.05,.02],[.35,.45,.1]); P(g,B1,textTex('友',128,128,'#1f1f22','#f3d58a','bold 90px sans-serif'),[0,3.05,.08],[.3,.4,.01]);
});

/* หน้าผา น้ำตก และบ่อน้ำ */
const waterfallT=FT.water.clone(); waterfallT.needsUpdate=true; waterfallT.repeat.set(1,2);
const pondT=FT.pond.clone(); pondT.needsUpdate=true;
{
  const cliffM=SM(0x8f8478,{map:FT.rock,flatShading:true,roughness:1}), mossM=SM(0x4f8a3c,{flatShading:true,roughness:1}); ISL.cliff=cliffM; ISL.moss=mossM;
  [[-3.6,-10.6,2.2,5],[-1.4,-11.2,2.4,7],[3.6,-11,2.6,6.2],[5.8,-10,1.9,4.2],[-5.6,-9.8,1.8,3.6],[1.1,-11.8,2,7.8]].forEach(([x,z,r,h])=>{
    const c=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),cliffM);c.position.set(x,h*.45,z);c.scale.set(r,h*.55,r*.9);c.rotation.y=Math.random()*3;c.castShadow=c.receiveShadow=true;scene.add(c);
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2),mossM);m.position.set(x,h*.45+h*.5,z);m.scale.set(r*.8,.35,r*.75);scene.add(m);
    BLOCK.push({x,z,r:r+.3});});
  const wf=new THREE.Mesh(new THREE.PlaneGeometry(1.7,6.2,1,8),new THREE.MeshStandardMaterial({map:waterfallT,transparent:true,opacity:.88,roughness:.1,side:THREE.DoubleSide,emissive:0x2a6f95,emissiveIntensity:.35}));
  wf.position.set(1.5,3.3,-9.35); scene.add(wf);
  const pond=new THREE.Mesh(new THREE.CircleGeometry(2.6,48),new THREE.MeshStandardMaterial({map:pondT,color:0xffffff,transparent:true,opacity:.9,roughness:.05,metalness:.2}));
  pond.rotation.x=-Math.PI/2; pond.position.set(1.5,.06,-7.4); pond.receiveShadow=true; scene.add(pond);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*.2,0),stoneM);r.position.set(1.5+Math.cos(a)*2.75,.05,-7.4+Math.sin(a)*2.75);r.scale.y=.6;r.castShadow=r.receiveShadow=true;scene.add(r);}
  BLOCK.push({x:1.5,z:-7.4,r:3.1});
}

/* ---------- ต้นไม้ ไผ่ พุ่มไม้ ดอกไม้ หญ้า ---------- */
const trunkM=SM(0x5b3a24,{roughness:.9});
const LEAFGEO=(()=>{const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position,nm=g.attributes.normal;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);const n=v.clone().normalize();v.multiplyScalar(1+.08*Math.sin(n.x*7)+.06*Math.sin(n.y*9+n.z*5));p.setXYZ(i,v.x,v.y,v.z);nm.setXYZ(i,n.x,n.y,n.z);}return g;})(); // ผิวเรียบนุ่ม
const leafMats={};
// สีใบไม้กำหนดเป็น sRGB แปลงเป็น linear ให้สีเข้มสดตามที่ตั้งใจ (ไม่ซีด)
const leafM=c=>leafMats[c]||(leafMats[c]=SM(new THREE.Color(c).convertSRGBToLinear(),{roughness:.8}));
function trunk(g,h,r){const t=lathe([[r*1.5,0],[r,.25*h],[r*.85,.6*h],[r*.6,h]],10);P(g,t,trunkM,[0,0,0]);}
// ต้นไม้พุ่มฟู (ทรงกลมหลายก้อน)
function fluffy(x,z,s,cols,h,parent){const g=J(parent||scene,x,0,z);g.scale.setScalar(s);g.rotation.y=Math.random()*6;h=h||2.4;trunk(g,h,.16);
  const blobs=[[0,h+.5,0,1.05],[.75,h+.1,.2,.75],[-.7,h+.2,-.25,.8],[.15,h+.2,.75,.7],[-.2,h+.15,-.8,.72],[.1,h+1.15,-.1,.7],[.55,h+.8,-.45,.55],[-.5,h+.85,.4,.58]];
  blobs.forEach(([a,b,c,r],i)=>P(g,LEAFGEO,leafM(cols[i%cols.length]),[a,b,c],[r,r*.88,r]));
  [[.5,h*.7,.2,-.9],[-.45,h*.75,-.1,.9]].forEach(([a,b,c,rz])=>P(g,Y1,trunkM,[a*.5,b,c*.5],[.05,.7,.05],[0,0,rz]));
  if(!parent)BLOCK.push({x,z,r:.75*s}); return g;}
function pineTree(g){trunk(g,1.4,.15);[[1.45,1.5,1.3],[1.2,1.4,2.1],[.95,1.3,2.85],[.65,1.1,3.55]].forEach(([r,h,y],i)=>P(g,new THREE.ConeGeometry(1,1,12),leafM(i%2?0x2f6b3a:0x3a7d45),[0,y,0],[r,h,r],[0,i*.4,0]));}
function pine(x,z,s){const g=J(scene,x,0,z);g.scale.setScalar(s);pineTree(g);BLOCK.push({x,z,r:.8*s});}
const maple=(x,z,s)=>fluffy(x,z,s,[0xe0632c,0xf08c35,0xcc4a2a,0xf0b040]);
const oak=(x,z,s)=>fluffy(x,z,s,[0x4c8f3a,0x5fa545,0x3d7d31,0x6fb050]);
const sakura=(x,z,s,parent)=>fluffy(x,z,s,[0xf4a3bf,0xf8bcd0,0xee8fb0,0xfbd3e0],2.6,parent);
function bamboo(x,z){const g=J(scene,x,0,z);const bm=SM(0x6aa35f,{roughness:.6});for(let i=0;i<7;i++){const h=4+Math.random()*2.5,px=(Math.random()-.5)*1.4,pz=(Math.random()-.5)*1.4;P(g,Y1,bm,[px,h/2,pz],[.07,h,.07]);for(let k=0;k<4;k++){const l=new THREE.Mesh(new THREE.PlaneGeometry(.55,.1),SM(0x5a9a4d,{side:THREE.DoubleSide}));l.position.set(px+(Math.random()-.5)*.5,h*(.6+Math.random()*.4),pz+(Math.random()-.5)*.5);l.rotation.set(Math.random(),Math.random()*3,-.5);g.add(l);}}BLOCK.push({x,z,r:1.1});}
function bush(x,z,s,c){const b=new THREE.Mesh(LEAFGEO,leafM(c||0x4f8f3f));b.position.set(x,s*.5,z);b.scale.set(s,s*.75,s);b.castShadow=b.receiveShadow=true;scene.add(b);
  if(Math.random()<.5)for(let k=0;k<5;k++){const f=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),SM([0xff8fb0,0xffffff,0xffd24d][k%3]));const a=Math.random()*6.28;f.position.set(x+Math.cos(a)*s*.8,s*(.5+Math.random()*.4),z+Math.sin(a)*s*.8);scene.add(f);}}
// ต้นไม้วงใน (ที่เดิม) + วงนอก (พื้นที่ขยาย)
[[-10.5,3,1.1],[-9.8,6.5,.9],[10.2,-1,1],[9.6,6.4,1.15],[-11,-5,1],[11,-5.4,.95],[-8,-9.2,.9],[-3.2,11.2,.8],[3.5,11.4,.85],[-11.6,.5,.8]].forEach(([x,z,s],i)=>[pine,maple,oak][i%3](x,z,s));
[[-14.6,-6.5,1.2],[-7,-13.8,1.1],[7.5,-13.6,1.05],[14.8,-3.2,1.1],[12.5,9.8,1],[-6.8,14.6,.95],[6.5,14.8,1],[-15.3,4.6,1.05]].forEach(([x,z,s],i)=>[oak,pine,maple,pine][i%4](x,z,s));
[[-13.4,-1.5,1.25],[-12.2,9,1.1],[-9.6,12.2,1],[-14.3,-10.2,.9]].forEach(([x,z,s])=>sakura(x,z,s));
bamboo(-10.2,-2.2); bamboo(-9.2,-3.8); bamboo(9.8,2.8); bamboo(15.2,6.2);
[[-2.5,6.5,.5],[2.8,6.8,.55],[-8.5,4.8,.6],[8.8,-3.5,.55],[-2.6,-3.2,.45],[3.4,-2.4,.4],[4.8,7.9,.5,0x6aa84f],[-5.6,8.6,.5,0x6aa84f],
 [-2.2,14.8,.55],[2.3,15,.55,0x6aa84f],[-12.8,6.2,.6,0x5f9f4f],[13.9,-6.6,.55],[-4.4,-14.9,.6,0x6aa84f],[10.5,12.8,.5],[-15.5,1.2,.5],[15.6,-0.5,.55,0x5f9f4f]].forEach(([x,z,s,c])=>bush(x,z,s,c));
lanternSmall(scene,-1.1,8.2); lanternSmall(scene,1.1,8.2); lanternSmall(scene,-1.1,13.4); lanternSmall(scene,1.1,13.4);

/* ---------- ลำธารไหลตกขอบเกาะ + น้ำตกลงทะเลเมฆ ---------- */
const streamT=FT.water.clone(); streamT.needsUpdate=true; streamT.repeat.set(1,6);
const edgeFallT=FT.water.clone(); edgeFallT.needsUpdate=true; edgeFallT.repeat.set(1,5);
const MIST=[];
{
  const ea=-.55, er=coastR(ea)+.2, ex=Math.cos(ea)*er, ez=Math.sin(ea)*er;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(4,.05,-7.6),new THREE.Vector3(6.8,.05,-8.6),new THREE.Vector3(9.5,.05,-8.2),new THREE.Vector3(12.2,.05,-8.9),new THREE.Vector3(ex,.05,ez)]);
  const N=60, W=.75, pos=[], uv=[], idx=[];
  for(let i=0;i<=N;i++){const t=i/N, pt=curve.getPoint(t), tg=curve.getTangent(t), nx=-tg.z, nz=tg.x, w=W*(1+.25*Math.sin(t*9));
    pos.push(pt.x+nx*w,.06,pt.z+nz*w, pt.x-nx*w,.06,pt.z-nz*w); uv.push(0,t,1,t);
    if(i<N){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
    if(i%3===0&&i<N-2)[1,-1].forEach(sd=>{const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.22+Math.random()*.15,0),stoneM);r.position.set(pt.x+nx*(w+.2)*sd,.05,pt.z+nz*(w+.2)*sd);r.scale.y=.55;r.receiveShadow=true;scene.add(r);});
    if(i%6===0)BLOCK.push({x:pt.x,z:pt.z,r:W+.3});}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const st=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:streamT,color:0xbfe8ff,transparent:true,opacity:.92,roughness:.08,metalness:.1,emissive:0x1d5f86,emissiveIntensity:.25,side:THREE.DoubleSide}));st.receiveShadow=true;scene.add(st);
  // สะพานไม้ข้ามลำธาร
  const bp=curve.getPoint(.5), bt=curve.getTangent(.5); const br=J(scene,bp.x,0,bp.z); br.rotation.y=Math.atan2(bt.x,bt.z)+Math.PI/2;
  const bw=SM(0xffffff,{map:FT.wood,roughness:.8});
  for(let k=-3;k<=3;k++)P(br,B1,bw,[0,.22-Math.abs(k)*.03,k*.28],[1.1,.06,.24]);
  [-1,1].forEach(sx=>{P(br,Y1,darkWood,[sx*.55,.45,-.9],[.05,.6,.05]);P(br,Y1,darkWood,[sx*.55,.45,.9],[.05,.6,.05]);P(br,B1,redM,[sx*.55,.72,0],[.05,.05,1.9]);});
  BLOCK.push({x:bp.x,z:bp.z,r:1.1});
  // น้ำตกตกจากขอบเกาะ
  const fall=new THREE.Mesh(new THREE.PlaneGeometry(1.7,24,1,12),new THREE.MeshStandardMaterial({map:edgeFallT,alphaMap:FT.fade,transparent:true,opacity:.9,roughness:.1,side:THREE.DoubleSide,emissive:0x2a6f95,emissiveIntensity:.3,depthWrite:false}));
  fall.position.set(Math.cos(ea)*(er+.35),-12,Math.sin(ea)*(er+.35)); fall.rotation.y=-ea+Math.PI/2; scene.add(fall);
  for(let k=0;k<10;k++){const m=glow(scene,0xffffff,1.6+Math.random()*1.5,[Math.cos(ea)*(er+.5),-(Math.random()*3),Math.sin(ea)*(er+.5)],.25);m.material.blending=THREE.NormalBlending;m.userData.p=[Math.random()*6,m.position.clone()];MIST.push(m);}
  for(let k=0;k<8;k++)cloudSprite(Math.cos(ea)*(er+1)+(Math.random()-.5)*4,-22+Math.random()*2,Math.sin(ea)*(er+1)+(Math.random()-.5)*4,6+Math.random()*5,.9,0);
}

/* ---------- แปลงผักและหุ่นไล่กา (ฝั่งตะวันออก) ---------- */
{
  const soil=SM(0x6b4a2f,{map:FT.dirt,roughness:1});
  [[12.6,1.4,0],[12.4,5.2,.25]].forEach(([x,z,ry],pi)=>{const g=J(scene,x,0,z);g.rotation.y=ry;
    P(g,B1,SM(0xffffff,{map:FT.wood}),[0,.1,0],[3.2,.2,2.6]); P(g,B1,soil,[0,.2,0],[3,.12,2.4]);
    for(let r=0;r<4;r++)for(let c=0;c<6;c++){const px=-1.2+c*.48,pz=-.9+r*.6;P(g,B1,soil,[px,.29,pz],[.36,.1,.44]);
      const kind=(r+pi)%3; if(kind===0){P(g,S1,SM(0xff8c2a),[px,.34,pz],[.08,.06,.08]);P(g,C1,leafM(0x5fae4f),[px,.46,pz],[.08,.2,.08]);}
      else if(kind===1){P(g,LEAFGEO,leafM(0x7cc35e),[px,.4,pz],[.14,.1,.14]);}
      else{P(g,Y1,leafM(0x4f9a45),[px,.5,pz],[.02,.4,.02]);P(g,S1,SM(0xd9482b,{roughness:.4}),[px+.05,.52,pz],[.06,.06,.06]);}}
    BLOCK.push({x,z,r:1.9});});
  const sc=J(scene,14.9,0,3.3); P(sc,Y1,darkWood,[0,.9,0],[.05,1.8,.05]); P(sc,Y1,darkWood,[0,1.4,0],[.04,1.3,.04],[0,0,Math.PI/2]);
  P(sc,B1,SM(0x3f6fb0),[0,1.25,0],[.5,.5,.2]); P(sc,S1,SM(0xe9d3a0),[0,1.75,0],[.18,.2,.18]); P(sc,C1,SM(0xd9b45a),[0,2,0],[.35,.2,.35]);
  BLOCK.push({x:14.9,z:3.3,r:.5});
}

/* ---------- ระเบียงชมวิวยื่นออกนอกเกาะ (ทิศใต้) ---------- */
{
  const g=J(scene,0,0,coastR(Math.PI/2)-1.2); const wd=SM(0xffffff,{map:FT.wood,roughness:.8});
  P(g,B1,wd,[0,.08,1.4],[2.6,.16,4.2]);
  for(let z=-.5;z<=3.3;z+=1.25)[-1,1].forEach(sx=>{P(g,Y1,darkWood,[sx*1.22,.55,z],[.07,.9,.07]);P(g,Y1,darkWood,[sx*1.1,-.8,z],[.09,1.8,.09]);});
  [-1,1].forEach(sx=>P(g,B1,redM,[sx*1.22,.98,1.4],[.07,.07,3.9]));P(g,B1,redM,[0,.98,3.35],[2.5,.07,.07]);
  [-1,1].forEach(sx=>{const l=J(g,sx*1.22,1.25,3.3);P(l,S1,warmGlow,[0,0,0],[.16,.2,.16]);glow(l,0xffb060,.9,[0,0,0],.5);});
}

/* ---------- เกาะเล็กลอยรอบ ๆ ---------- */
const ISLETS=[];
{
  const mk=(x,y,z,R,tree)=>{const g=J(scene,x,y,z);
    const itop=P(g,new THREE.CylinderGeometry(R,R*.92,.5,20),SM(0xffffff,{map:FT.grassTop}),[0,0,0]); g.userData.top=itop.material||itop;
    P(g,lathe([[0,-R*2.2],[R*.35,-R*1.6],[R*.7,-R],[R*.95,-.4],[R,-.2]],16),SM(0xb49c84,{map:FT.strata,roughness:1}),[0,0,0]);
    if(tree==='sakura'){sakura(0,0,R*.45,g).position.y=.25;}
    else if(tree==='pine'){const t=J(g,0,.25,0);t.scale.setScalar(R*.4);pineTree(t);}
    else{const cm=SM(0xffb347,{emissive:0xff7a1a,emissiveIntensity:1.4,roughness:.2});for(let k=0;k<4;k++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.3,0),cm);c.scale.set(.7,1.8+k*.3,.7);c.position.set((k-1.5)*.35,.6,0);c.rotation.z=(k-1.5)*.25;g.add(c);}glow(g,0xffa040,3.5,[0,.9,0],.5);}
    for(let k=0;k<5;k++){const a=Math.random()*6.28;const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.18+Math.random()*.2,0),stoneM);r.position.set(Math.cos(a)*R*.7,.3,Math.sin(a)*R*.7);g.add(r);}
    g.userData.b=[y,Math.random()*6]; ISLETS.push(g); return g;};
  const K=1.35; mk(-27*K,3,-14*K,2.6,'sakura'); mk(25*K,-1,-20*K,2.1,'pine'); mk(30*K,5,8*K,1.6,'amber'); mk(-24*K,-3,16*K,1.9,'pine'); mk(-6*K,8,-34*K,2.2,'sakura'); mk(12*K,1,-36*K,1.5,'amber');
}
const WIND={value:0};
{ // หญ้าและดอกไม้ (instanced) ไหวตามลม
  const gG=new THREE.ConeGeometry(.05,.42,3); gG.translate(0,.21,0);
  const gMat=SM(0xffffff,{roughness:.9});
  gMat.onBeforeCompile=sh=>{sh.uniforms.uTime=WIND;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vec4 ip=instanceMatrix[3]; float sw=sin(uTime*1.8+ip.x*.55+ip.z*.35)*.5+sin(uTime*3.1+ip.x*1.3)*.25; transformed.x+=sw*position.y*.35; transformed.z+=sw*position.y*.18;');};
  const NG=9800;
  const gm=new THREE.InstancedMesh(gG,gMat,NG), fm=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),SM(0xffffff,{emissive:0x222222}),520);
  const d=new THREE.Object3D(), col=new THREE.Color(); let n=0,f=0,guard=0;
  const blocked=(x,z)=>BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r*.9);
  while(n<NG&&guard++<60000){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*(FARM_R-.2),x=Math.cos(a)*r,z=Math.sin(a)*r;if(!onIsland(x,z,.25)||blocked(x,z)||Math.abs(x)<.6&&z>5)continue;
    d.position.set(x,0,z);d.rotation.set((Math.random()-.5)*.4,Math.random()*3,(Math.random()-.5)*.4);d.scale.setScalar(.7+Math.random()*.9);d.updateMatrix();gm.setMatrixAt(n,d.matrix);col.setHSL(.22+Math.random()*.08,.5,.3+Math.random()*.16);gm.setColorAt(n,col);n++;}
  gm.count=n;
  const fc=[0xffffff,0xffd24d,0xff8fb0,0xb58cff,0xff6b5a,0x8fd3ff]; guard=0;
  while(f<520&&guard++<20000){const cl=Math.random()<.6, a=cl?(f%7)*.9+Math.random()*.25:Math.random()*6.28, r=cl?11+Math.random()*9:Math.sqrt(Math.random())*(FARM_R-.5),x=Math.cos(a)*r,z=Math.sin(a)*r;if(!onIsland(x,z,.5)||blocked(x,z))continue;
    d.position.set(x,.3+Math.random()*.12,z);d.rotation.set(0,0,0);d.scale.setScalar(.8+Math.random()*.6);d.updateMatrix();fm.setMatrixAt(f,d.matrix);fm.setColorAt(f,col.setHex(fc[f%6]));f++;}
  fm.count=f;
  gm.castShadow=false; gm.receiveShadow=true; gm.frustumCulled=false; scene.add(gm); scene.add(fm); ISL.grass=gm; ISL.flowers=fm;
}
// ละอองเกสรลอยในอากาศ
const POLLEN=[];for(let i=0;i<40;i++){const s=glow(scene,0xfff6c8,.18,[(Math.random()-.5)*30,.5+Math.random()*4,(Math.random()-.5)*30],.7);s.userData.p=[Math.random()*6,s.position.clone()];POLLEN.push(s);}
// นกบินวนไกล ๆ
const BIRDS=[];{const bm=new THREE.MeshBasicMaterial({color:0x2a2a33,side:THREE.DoubleSide});
  for(let i=0;i<7;i++){const g=new THREE.Group();const ws=[-1,1].map(sx=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(.7,.18),bm);w.position.x=sx*.35;g.add(w);return w;});g.userData.w=ws;g.userData.p=[Math.random()*6,26+Math.random()*10,9+Math.random()*5,.12+Math.random()*.06];scene.add(g);BIRDS.push(g);}}
function worldTick(dt,T){
  WIND.value=T; if(typeof raceWorldTick==='function')raceWorldTick(dt,T); if(typeof raidTick==='function')raidTick(dt,T); if(typeof portalTick==='function')portalTick(dt,T); if(typeof colTick==='function')colTick(dt,T);
  streamT.offset.y-=dt*.6; edgeFallT.offset.y+=dt*1.6;
  clouds.forEach(c=>{if(!c.userData.v)return;c.position.x+=c.userData.v*dt;if(c.position.x>90)c.position.x=-90;});
  MIST.forEach(m=>{const [a,p]=m.userData.p;m.position.y=p.y+Math.sin(T*.8+a)*.4;m.material.opacity=.18+.12*Math.sin(T*1.3+a);});
  POLLEN.forEach(s=>{const [a,p]=s.userData.p;s.position.set(p.x+Math.sin(T*.3+a)*1.5,p.y+Math.sin(T*.5+a*2)*.6,p.z+Math.cos(T*.25+a)*1.5);});
  ISLETS.forEach(g=>{const [y,a]=g.userData.b;g.position.y=y+Math.sin(T*.5+a)*.5;g.rotation.y+=dt*.02;});
  AMBER_GLOW.forEach((g,i)=>g.material.opacity=.35+.25*Math.sin(T*1.5+i));
  BIRDS.forEach(b=>{const [a,R,h,sp]=b.userData.p;const t=T*sp+a;b.position.set(Math.cos(t)*R,h+Math.sin(t*2)*.8,Math.sin(t)*R);b.rotation.y=-t;const f=Math.sin(T*9+a)*.6;b.userData.w[0].rotation.z=f;b.userData.w[1].rotation.z=-f;});
}
const butterflies=[];for(let i=0;i<8;i++){const s=glow(scene,[0xfff1a8,0xffc0e0,0xc8f0ff][i%3],.35,[0,1,0],.9);s.userData.p=[Math.random()*6,Math.random()*6,(Math.random()-.5)*16,(Math.random()-.5)*16];butterflies.push(s);}
const fallLeaves=[];{const lm=[0xd9482b,0xf07a2a,0xe8a33a].map(c=>new THREE.MeshBasicMaterial({map:TX.leaf,color:c,transparent:true,alphaTest:.3,side:THREE.DoubleSide}));
  for(let i=0;i<18;i++){const l=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),lm[i%3]);l.position.set(4+Math.random()*4,1+Math.random()*5,-8+Math.random()*5);scene.add(l);fallLeaves.push(l);}}

/* ---------- ไฮไลต์อาคารที่เลือก ---------- */
const selRing=new THREE.Mesh(new THREE.RingGeometry(1,1.12,64),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
selRing.rotation.x=-Math.PI/2; selRing.position.y=.08; selRing.visible=false; scene.add(selRing);

/* ================= มอนสเตอร์เดินเล่น ================= */
const AGENTS=[];
function blockedSeg(ax,az,bx,bz,pad){for(const b of BLOCK){const vx=bx-ax,vz=bz-az,wx=b.x-ax,wz=b.z-az,L=vx*vx+vz*vz||1;const t=Math.max(0,Math.min(1,(wx*vx+wz*vz)/L));const dx=ax+vx*t-b.x,dz=az+vz*t-b.z;if(Math.hypot(dx,dz)<b.r+pad)return true;}return false;}
function freePoint(pad){for(let k=0;k<200;k++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*(FARM_R-4),x=Math.cos(a)*r,z=Math.sin(a)*r;if(onIsland(x,z,1.5)&&!BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+pad))return[x,z];}return[0,7];}
function addAgent(data,at,pop){
  const spc=SPEC[data.sp]||SPEC.kazemaru;
  if(spc.dragon&&DRAGON){const w=buildDragon();w.scale.setScalar(1.7);tintByEl(w,data.sp,data.el);scene.add(w);
    w.traverse(o=>{if(o.isMesh){o.userData.agent=AGENTS.length;PICK.push(o);}});
    const ag={w,inner:w.userData.inner,data,evo:1,fly:true,ang:Math.random()*6.28,r:8.5+Math.random()*1.5,state:'fly'};AGENTS.push(ag);
    if(pop){w.scale.setScalar(.001);tween(.8,t=>w.scale.setScalar(Math.max(.001,1.7*t)),easeBack);}return ag;}
  if(spc.spider&&SPIDER){const w=buildSpider();w.scale.setScalar(1.3);tintByEl(w,data.sp,data.el);scene.add(w);
    const [x,z]=at||freePoint(1); w.position.set(x,0,z); w.rotation.y=Math.random()*6;
    w.traverse(o=>{if(o.isMesh){o.userData.agent=AGENTS.length;PICK.push(o);}});
    const ag={w,inner:w.userData.inner,data,evo:1,spider:true,state:'idle',wait:1+Math.random()*3,tx:x,tz:z,ph:0,yaw:w.rotation.y,speed:1.1};AGENTS.push(ag);
    if(pop){w.scale.setScalar(.001);tween(.6,t=>w.scale.setScalar(Math.max(.001,1.3*t)),easeBack);}return ag;}
  const w=buildMonster(spc.rig||(spc.evo?1:0)); w.userData.k*=1.5; w.scale.setScalar(w.userData.k); tintByEl(w,data.sp,data.el); scene.add(w);
  const [x,z]=at||freePoint(.8); w.position.set(x,0,z); w.rotation.y=Math.random()*6;
  const inner=w.userData.inner;
  w.traverse(o=>{if(o.isMesh){o.userData.agent=AGENTS.length;PICK.push(o);}});
  const ag={w,inner,data,evo:spc.evo,state:'idle',wait:1+Math.random()*3,tx:x,tz:z,ph:Math.random()*6,yaw:w.rotation.y,speed:spc.evo?1.45:1.0};
  AGENTS.push(ag);
  if(pop){const k=w.userData.k;w.scale.setScalar(.001);tween(.6,t=>w.scale.setScalar(Math.max(.001,k*t)),easeBack);}
  return ag;
}
function agentUpdate(ag,dt){
  if(ag.hold)return; // ถูกควบคุมจากฉากพิเศษ (เช่น บุกปล้น)
  const w=ag.w, rig=ag.inner.userData.rig, A=ag.inner.userData;
  if(ag.fly){ag.ang+=dt*.22;const x=Math.cos(ag.ang)*ag.r,z=Math.sin(ag.ang)*ag.r*.8;w.position.set(x,4.2+Math.sin(ag.ang*3)*.6,z);w.rotation.y=Math.atan2(-Math.sin(ag.ang)*ag.r,Math.cos(ag.ang)*ag.r*.8);w.rotation.z=-.18;return;}
  if(ag.spider){const tg=rig.tg;
    if(ag.state==='idle'){tg.walk=0;ag.wait-=dt;if(ag.wait<=0){for(let k=0;k<14;k++){const [tx,tz]=freePoint(.8);if(Math.hypot(tx-w.position.x,tz-w.position.z)>2&&!blockedSeg(w.position.x,w.position.z,tx,tz,.5)){ag.tx=tx;ag.tz=tz;ag.state='walk';break;}}if(ag.state!=='walk')ag.wait=1;}return;}
    const dx=ag.tx-w.position.x,dz=ag.tz-w.position.z,d=Math.hypot(dx,dz);
    if(d<.2){ag.state='idle';ag.wait=2+Math.random()*5;tg.walk=0;return;}
    tg.walk=1;const want=Math.atan2(dx,dz);let diff=want-ag.yaw;diff=Math.atan2(Math.sin(diff),Math.cos(diff));ag.yaw+=diff*Math.min(1,dt*4);w.rotation.y=ag.yaw;
    const sp=ag.speed*(Math.abs(diff)>1?.3:1);w.position.x+=Math.sin(ag.yaw)*sp*dt;w.position.z+=Math.cos(ag.yaw)*sp*dt;return;}
  const MC=!!(A.play&&A.clipInfo&&A.clipInfo('walk'));
  if(MC){if(ag.state==='walk'&&!ag.walking){ag.walking=1;A.play('walk',{loop:true,fade:.25});}else if(ag.state!=='walk'&&ag.walking){ag.walking=0;A.play('idle',{loop:true,fade:.3});}}
  else if(A.clipW)A.clipW(ag.state==='walk'?0:1);
  if(ag.state==='idle'){ag.wait-=dt;if(ag.wait<=0){
    for(let k=0;k<14;k++){const [tx,tz]=freePoint(.6);if(Math.hypot(tx-w.position.x,tz-w.position.z)>2&&!blockedSeg(w.position.x,w.position.z,tx,tz,.35)){ag.tx=tx;ag.tz=tz;ag.state='walk';break;}}
    if(ag.state!=='walk')ag.wait=1;}
    return;}
  const dx=ag.tx-w.position.x,dz=ag.tz-w.position.z,d=Math.hypot(dx,dz);
  if(d<.15){ag.state='idle';ag.wait=2+Math.random()*5;ag.inner.rotation.z=0;poseTo(rig.base,.45);return;}
  const want=Math.atan2(dx,dz);let diff=want-ag.yaw;diff=Math.atan2(Math.sin(diff),Math.cos(diff));ag.yaw+=diff*Math.min(1,dt*6);w.rotation.y=ag.yaw;
  const sp=ag.speed*(MC?.8:1)*(Math.abs(diff)>1?.3:1);
  w.position.x+=Math.sin(ag.yaw)*sp*dt; w.position.z+=Math.cos(ag.yaw)*sp*dt;
  ag.ph+=dt*(ag.evo?6.5:9);
  const s=Math.sin(ag.ph), c=Math.cos(ag.ph);
  if(MC){}
  else if(ag.evo){
    const [l0,l1]=rig.legs;
    channel(l0.th.rotation,'x').t=-.06-s*.5; channel(l1.th.rotation,'x').t=.06+s*.5;
    channel(l0.kn.rotation,'x').t=.1+Math.max(0,c)*.75; channel(l1.kn.rotation,'x').t=.06+Math.max(0,-c)*.75;
    channel(rig.R.sh.rotation,'x').t=.06+s*.38; channel(rig.L.sh.rotation,'x').t=.02-s*.38;
    channel(rig.hips.position,'y').t=.88-Math.abs(c)*.035; channel(rig.torso.rotation,'y').t=-.04-s*.1;
    [l0.th,l0.kn,l1.th,l1.kn,rig.R.sh,rig.L.sh].forEach(j=>{channel(j.rotation,'x').k=260;channel(j.rotation,'x').z=.85;});
  } else {
    ag.inner.rotation.z=s*.13;
    channel(rig.L.a.rotation,'x').t=-.6+s*.5;
  }
}

/* ================= สถานะผู้เล่น (เซิร์ฟเวอร์เป็นผู้ตัดสิน ดู net.js) ================= */
let S={name:'…',lv:1,xp:0,coins:0,amber:0,energy:0,energyMax:60,energyNext:0,energySec:180,amberIn:0,daily:0,dailyClaimed:false,quests:{},team:[],mons:[],pity:0,pityMax:30,slots:30,mailRead:false};
try{S.mailRead=SafeStore.getItem('amber_mail_read')==='1';}catch(e){}
const save=()=>{SafeStore.setItem('amber_mail_read',S.mailRead?'1':'0');};
function applyState(st){
  if(!st||!st.player)return; const p=st.player;
  Object.assign(S,{name:p.name,lv:p.lv,xp:p.xp,coins:p.coins,amber:p.amber,energy:p.energy,energyMax:p.energy_max,energyNext:p.energy_next,energySec:p.energy_sec,
    amberIn:p.amber_in,daily:p.daily_streak,dailyClaimed:!!p.daily_claimed,quests:p.quests||{},team:(p.team||[]).map(Number),pity:p.pity,pityMax:p.pity_max,slots:p.slots,bag:p.bag||null,named:!!p.named,uid:p.uid||'',stage:p.stage||0,power:p.power||0,need:p.need||0,boss:!!p.boss,idleSec:p.idle_sec||0,idleMax:p.idle_max||28800,rateC:p.rate_c||0,idleAt:Date.now(),mailNew:p.mail_new||0,race:p.race||null});
  if(S.race&&typeof applyRaceTheme==='function')applyRaceTheme(S.race);
  S.mons=(st.monsters||[]).map(m=>({uid:Number(m.id),sp:m.sp,lv:m.lv,stars:m.stars||0,el:m.el||null}));
  if(typeof renderHUD==='function')renderHUD();
}
function syncAgents(){AGENTS.forEach(a=>{scene.remove(a.w);});AGENTS.length=0;PICK.splice(0,PICK.length,...PICK.filter(o=>o.userData.agent==null));S.mons.forEach(d=>addAgent(d));}
