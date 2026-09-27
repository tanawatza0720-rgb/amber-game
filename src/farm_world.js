/* ================= ฟาร์มของผู้เล่น ================= */
const FARM_R=13;
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
  sky:srgb(canvasTex(8,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#5d8fd6');g.addColorStop(.45,'#9cc6ee');g.addColorStop(.62,'#f3d9b8');g.addColorStop(1,'#c8d9ef');x.fillStyle=g;x.fillRect(0,0,s,s);})),
};
function textTex(text,w,h,bg,fg,font){return srgb(canvasTex(256,(x,s)=>{x.fillStyle=bg;x.fillRect(0,0,s,s);x.fillStyle=fg;x.font=font||`bold ${s*.26}px "Chakra Petch", sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,s/2,s/2);}));}

/* ---------- ท้องฟ้า เมฆ แสง ---------- */
const sky=new THREE.Mesh(new THREE.SphereGeometry(220,32,16),new THREE.MeshBasicMaterial({map:FT.sky,side:THREE.BackSide,fog:false}));scene.add(sky);
scene.fog=new THREE.Fog(0xc9dcf0,55,140);
scene.add(new THREE.HemisphereLight(0xd6ebff,0x5a7a45,.95));
const sun=new THREE.DirectionalLight(0xfff0d6,2.1); sun.position.set(14,24,10); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:70}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.03;
scene.add(sun);
const bounce=new THREE.DirectionalLight(0xffc28a,.35); bounce.position.set(-12,6,-8); scene.add(bounce);
const clouds=[];
for(let i=0;i<22;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:FT.cloud,transparent:true,opacity:.85,depthWrite:false,fog:false}));
  const a=Math.random()*Math.PI*2, r=20+Math.random()*26, sz=10+Math.random()*14;
  s.position.set(Math.cos(a)*r,-8+Math.random()*12,Math.sin(a)*r); s.scale.set(sz,sz*.55,1); s.userData.v=.2+Math.random()*.3; scene.add(s); clouds.push(s);}

/* ---------- เกาะ ---------- */
const nz=a=>Math.sin(a*3+1)*.5+Math.sin(a*7+2)*.3+Math.sin(a*13+.5)*.2;
const coastR=a=>FARM_R+nz(a)*1.1;
const island=new THREE.Group(); scene.add(island);
{
  const sh=new THREE.Shape(); for(let i=0;i<=180;i++){const a=i/180*Math.PI*2, r=coastR(a); const x=Math.cos(a)*r, y=Math.sin(a)*r; i?sh.lineTo(x,y):sh.moveTo(x,y);}
  const g=new THREE.ExtrudeGeometry(sh,{depth:1.6,bevelEnabled:true,bevelThickness:.35,bevelSize:.4,bevelSegments:3,curveSegments:1});
  g.rotateX(Math.PI/2);
  const grassT=FT.grass.clone(); grassT.needsUpdate=true; grassT.repeat.set(.16,.16);
  const top=new THREE.Mesh(g,[SM(0xffffff,{map:grassT,roughness:.95}),SM(0xffffff,{map:FT.dirt,roughness:1})]);
  top.position.y=-.35; top.receiveShadow=true; island.add(top);
  // ฐานหินใต้เกาะ
  const ug=lathe([[0,-14],[1.6,-11.5],[4.5,-8],[8,-5],[10.8,-3],[12.6,-1.7],[13.3,-.9]],72);
  const p=ug.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);const k=coastR(a)/FARM_R;
    const j=1+(Math.sin(a*17+y)*.06+Math.sin(a*5-y*.7)*.08);p.setXYZ(i,Math.cos(a)*r*k*j,y+Math.sin(a*9+r)*.35,Math.sin(a)*r*k*j);}
  ug.computeVertexNormals();
  const rockT=FT.rock.clone(); rockT.needsUpdate=true; rockT.repeat.set(6,3);
  const under=new THREE.Mesh(ug,SM(0x8a7a68,{map:rockT,flatShading:true,roughness:1})); under.position.y=-.4; island.add(under);
  for(let i=0;i<9;i++){const a=Math.random()*6.28,r=4+Math.random()*7;const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(.8+Math.random()*1.2,0),SM(0x7a6d5e,{flatShading:true,map:FT.rock}));rk.position.set(Math.cos(a)*r,-9-Math.random()*6+r*.6,Math.sin(a)*r);rk.scale.y=1.8;island.add(rk);}
}
const onIsland=(x,z,m)=>Math.hypot(x,z)<coastR(Math.atan2(z,x))-(m||0);

/* ---------- ทางเดินหิน ---------- */
const stoneM=SM(0xb8b2a6,{map:FT.rock,roughness:.95});
function path(pts){
  for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/.75));
    for(let k=0;k<n;k++){const t=k/n;const s=new THREE.Mesh(new THREE.CylinderGeometry(.34+Math.random()*.1,.38,.08,7),stoneM);
      s.position.set(ax+(bx-ax)*t+(Math.random()-.5)*.25,.03,az+(bz-az)*t+(Math.random()-.5)*.25);s.rotation.y=Math.random()*3;s.receiveShadow=true;scene.add(s);}}
}
path([[0,11],[0,5.6]]); path([[-.8,3.5],[-4.6,.6]]); path([[1,3.5],[5,3.2]]); path([[-1.8,1.5],[-4.2,-4.6]]); path([[1.6,1.3],[4.6,-3.6]]);

/* ---------- ตัวช่วยอาคาร ---------- */
const BUILDINGS=[], PICK=[], BLOCK=[];
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
building('dojo','สนามประลอง',-6.8,-.4,3.3,g=>{
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
  const cliffM=SM(0x8f8478,{map:FT.rock,flatShading:true,roughness:1}), mossM=SM(0x4f8a3c,{flatShading:true,roughness:1});
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
function pine(x,z,s){const g=J(scene,x,0,z);g.scale.setScalar(s);P(g,Y1,trunkM,[0,.6,0],[.18,1.2,.18]);
  [[1.3,1.7,1.4],[1.05,1.5,2.3],[.75,1.2,3.1]].forEach(([r,h,y],i)=>P(g,new THREE.ConeGeometry(1,1,9),SM(i%2?0x2f6b3a:0x357a42,{flatShading:true}),[0,y,0],[r,h,r]));BLOCK.push({x,z,r:.8*s});}
function maple(x,z,s){const g=J(scene,x,0,z);g.scale.setScalar(s);P(g,Y1,trunkM,[0,.9,0],[.16,1.8,.16]);
  const cs=[0xd9482b,0xf07a2a,0xc23a3a,0xe8a33a];[[0,2.4,0,1],[.6,2.1,.3,.7],[-.6,2.2,-.2,.75],[.1,2.8,-.3,.65]].forEach(([a,b,c,r],i)=>P(g,new THREE.IcosahedronGeometry(1,1),SM(cs[(i+Math.floor(x*3))&3],{flatShading:true}),[a,b,c],[r,r*.85,r]));BLOCK.push({x,z,r:.8*s});}
function bamboo(x,z){const g=J(scene,x,0,z);const bm=SM(0x5f9a5a,{roughness:.6});for(let i=0;i<7;i++){const h=4+Math.random()*2.5,px=(Math.random()-.5)*1.4,pz=(Math.random()-.5)*1.4;P(g,Y1,bm,[px,h/2,pz],[.07,h,.07]);for(let k=0;k<4;k++){const l=new THREE.Mesh(new THREE.PlaneGeometry(.55,.1),SM(0x4d8a45,{side:THREE.DoubleSide}));l.position.set(px+(Math.random()-.5)*.5,h*(.6+Math.random()*.4),pz+(Math.random()-.5)*.5);l.rotation.set(Math.random(),Math.random()*3,-.5);g.add(l);}}BLOCK.push({x,z,r:1.1});}
function bush(x,z,s,c){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),SM(c||0x4f8f3f,{flatShading:true}));b.position.set(x,s*.55,z);b.scale.set(s,s*.8,s);b.castShadow=b.receiveShadow=true;scene.add(b);}
[[-10.5,3,1.1],[-9.8,6.5,.9],[10.2,-1,1],[9.6,6.4,1.15],[-11,-5,1],[11,-6.2,.95],[-8,-9.2,.9],[8.4,-9,1],[-3.2,11.2,.8],[3.5,11.4,.85],[-11.6,.5,.8]].forEach(([x,z,s],i)=>(i%2?maple:pine)(x,z,s));
bamboo(-10.2,-2.2); bamboo(-9.2,-3.8); bamboo(9.8,2.8);
[[-2.5,6.5,.5],[2.8,6.8,.55],[-8.5,4.8,.6],[8.8,-3.5,.55],[-2.6,-3.2,.45],[3.4,-2.4,.4],[4.8,7.9,.5,0x6aa84f],[-5.6,8.6,.5,0x6aa84f]].forEach(([x,z,s,c])=>bush(x,z,s,c));
lanternSmall(scene,-1.1,8.2); lanternSmall(scene,1.1,8.2);
{ // หญ้าและดอกไม้ (instanced)
  const gG=new THREE.ConeGeometry(.05,.38,3); gG.translate(0,.19,0);
  const gm=new THREE.InstancedMesh(gG,SM(0xffffff,{roughness:.9}),1400), fm=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),SM(0xffffff,{emissive:0x222222}),260);
  const d=new THREE.Object3D(), col=new THREE.Color(); let n=0,f=0;
  const blocked=(x,z)=>BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r*.9);
  while(n<1400){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*12.8,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!onIsland(x,z,.3)||blocked(x,z)||Math.abs(x)<.6&&z>5)continue;
    d.position.set(x,0,z);d.rotation.set((Math.random()-.5)*.4,Math.random()*3,(Math.random()-.5)*.4);d.scale.setScalar(.7+Math.random()*.8);d.updateMatrix();gm.setMatrixAt(n,d.matrix);col.setHSL(.24+Math.random()*.06,.5,.28+Math.random()*.15);gm.setColorAt(n,col);n++;}
  const fc=[0xffffff,0xffd24d,0xff8fb0,0xb58cff,0xff6b5a];
  while(f<260){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*12.5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!onIsland(x,z,.5)||blocked(x,z))continue;
    d.position.set(x,.3+Math.random()*.1,z);d.rotation.set(0,0,0);d.scale.setScalar(.8+Math.random()*.6);d.updateMatrix();fm.setMatrixAt(f,d.matrix);fm.setColorAt(f,col.setHex(fc[f%5]));f++;}
  gm.castShadow=false; gm.receiveShadow=true; scene.add(gm); scene.add(fm);
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
function freePoint(pad){for(let k=0;k<200;k++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*10.5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(onIsland(x,z,1.5)&&!BLOCK.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+pad))return[x,z];}return[0,7];}
function addAgent(data,at,pop){
  const spc=SPEC[data.sp]||SPEC.kazemaru;
  if(spc.dragon&&DRAGON){const w=buildDragon();w.scale.setScalar(1.7);scene.add(w);
    w.traverse(o=>{if(o.isMesh){o.userData.agent=AGENTS.length;PICK.push(o);}});
    const ag={w,inner:w.userData.inner,data,evo:1,fly:true,ang:Math.random()*6.28,r:8.5+Math.random()*1.5,state:'fly'};AGENTS.push(ag);
    if(pop){w.scale.setScalar(.001);tween(.8,t=>w.scale.setScalar(Math.max(.001,1.7*t)),easeBack);}return ag;}
  const w=buildMonster(spc.evo?1:0); w.userData.k*=1.5; w.scale.setScalar(w.userData.k); scene.add(w);
  const [x,z]=at||freePoint(.8); w.position.set(x,0,z); w.rotation.y=Math.random()*6;
  const inner=w.userData.inner;
  w.traverse(o=>{if(o.isMesh){o.userData.agent=AGENTS.length;PICK.push(o);}});
  const ag={w,inner,data,evo:spc.evo,state:'idle',wait:1+Math.random()*3,tx:x,tz:z,ph:Math.random()*6,yaw:w.rotation.y,speed:spc.evo?1.45:1.0};
  AGENTS.push(ag);
  if(pop){const k=w.userData.k;w.scale.setScalar(.001);tween(.6,t=>w.scale.setScalar(Math.max(.001,k*t)),easeBack);}
  return ag;
}
function agentUpdate(ag,dt){
  const w=ag.w, rig=ag.inner.userData.rig, A=ag.inner.userData;
  if(ag.fly){ag.ang+=dt*.22;const x=Math.cos(ag.ang)*ag.r,z=Math.sin(ag.ang)*ag.r*.8;w.position.set(x,4.2+Math.sin(ag.ang*3)*.6,z);w.rotation.y=Math.atan2(-Math.sin(ag.ang)*ag.r,Math.cos(ag.ang)*ag.r*.8);w.rotation.z=-.18;return;}
  if(A.clipW)A.clipW(ag.state==='walk'?0:1);
  if(ag.state==='idle'){ag.wait-=dt;if(ag.wait<=0){
    for(let k=0;k<14;k++){const [tx,tz]=freePoint(.6);if(Math.hypot(tx-w.position.x,tz-w.position.z)>2&&!blockedSeg(w.position.x,w.position.z,tx,tz,.35)){ag.tx=tx;ag.tz=tz;ag.state='walk';break;}}
    if(ag.state!=='walk')ag.wait=1;}
    return;}
  const dx=ag.tx-w.position.x,dz=ag.tz-w.position.z,d=Math.hypot(dx,dz);
  if(d<.15){ag.state='idle';ag.wait=2+Math.random()*5;ag.inner.rotation.z=0;poseTo(rig.base,.45);return;}
  const want=Math.atan2(dx,dz);let diff=want-ag.yaw;diff=Math.atan2(Math.sin(diff),Math.cos(diff));ag.yaw+=diff*Math.min(1,dt*6);w.rotation.y=ag.yaw;
  const sp=ag.speed*(Math.abs(diff)>1?.3:1);
  w.position.x+=Math.sin(ag.yaw)*sp*dt; w.position.z+=Math.cos(ag.yaw)*sp*dt;
  ag.ph+=dt*(ag.evo?6.5:9);
  const s=Math.sin(ag.ph), c=Math.cos(ag.ph);
  if(ag.evo){
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
    amberIn:p.amber_in,daily:p.daily_streak,dailyClaimed:!!p.daily_claimed,quests:p.quests||{},team:(p.team||[]).map(Number),pity:p.pity,pityMax:p.pity_max,slots:p.slots});
  S.mons=(st.monsters||[]).map(m=>({uid:Number(m.id),sp:m.sp,lv:m.lv}));
  if(typeof renderHUD==='function')renderHUD();
}
function syncAgents(){AGENTS.forEach(a=>{scene.remove(a.w);});AGENTS.length=0;PICK.splice(0,PICK.length,...PICK.filter(o=>o.userData.agent==null));S.mons.forEach(d=>addAgent(d));}
