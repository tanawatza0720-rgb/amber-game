/* ================= เอฟเฟกต์สกิลชุดใหญ่ (หายาก/ตำนาน/เทพเจ้า) =================
   ตัวทั่วไป (kazemaru) ไม่ใช้ · ระดับยิ่งสูงยิ่งใหญ่ (FX_RAR) · มือถือ (LOW) ลดจำนวนชิ้นเอง
   กฎประสิทธิภาพ: ไม่สร้างไฟ (PointLight) · geometry/texture ใช้ร่วม (FX2G/FX2T) · material ต่อชิ้นแล้ว dispose ทิ้ง
   เรียกจาก battle_rt.js (rtUse/rigCast/rigRain/rigHeal) */
const FX_RAR={kazekiri:2,yorugumo:2,morihime:2,seiro:2,kohaku:2,garok:2,phraiwan:2,kuroga:3,hakuneko:3,anubis:3,mortha:3,amateru:4,sarael:4};
const fxTier=u=>u?FX_RAR[u.sp]||0:0;                 // 0 = ไม่ใช้เอฟเฟกต์ชุดใหญ่
const fxOn=u=>fxTier(u)>0&&!(LOW&&u.side==='E'&&!u.boss); // มือถือ: ศัตรูธรรมดาใช้เอฟเฟกต์เดิม
const fxK=u=>({2:1,3:1.3,4:1.65}[fxTier(u)]||1)*(u&&u.boss?1.2:1);
// สีประจำตัว (ทับสีธาตุ): [หลัก, แกนสว่าง]
const FX_SIG={sarael:[0xff6a2a,0xfff2d0],amateru:[0xff7a1a,0xffe0a0],anubis:[0x9a5cff,0xffe08a],hakuneko:[0xffd36a,0xffffff],kuroga:[0xa070ff,0xe8d8ff],mortha:[0x7fd8ff,0xffffff],phraiwan:[0x8dffb0,0xf0fff0]};
const fxCol=u=>{const s=FX_SIG[u.sp];if(s)return s;const c=elFx(u);return [c,0xffffff];};

/* ---------- ของใช้ร่วม: geometry + texture (สร้างครั้งเดียว) ---------- */
const FX2G={}, FX2T={};
function fxCanvasTex(key,draw,S){if(FX2T[key])return FX2T[key];S=S||256;const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');draw(g,S);const t=new THREE.CanvasTexture(c);FX2T[key]=t;return t;}
// วงเวท: วงซ้อน + ขีดรอบวง + อักษรรูน + ดาว 6 แฉก
const fxRuneTex=()=>fxCanvasTex('rune',(g,S)=>{const c=S/2;g.strokeStyle='#fff';g.fillStyle='#fff';g.lineCap='round';
  const ring=(r,w)=>{g.lineWidth=w;g.beginPath();g.arc(c,c,r,0,7);g.stroke();};
  ring(c*.95,S*.018);ring(c*.84,S*.008);ring(c*.56,S*.012);ring(c*.2,S*.01);
  for(let i=0;i<48;i++){const a=i/48*6.283,r0=c*.85,r1=c*(i%4?.89:.94);g.lineWidth=S*.006;g.beginPath();g.moveTo(c+Math.cos(a)*r0,c+Math.sin(a)*r0);g.lineTo(c+Math.cos(a)*r1,c+Math.sin(a)*r1);g.stroke();}
  g.lineWidth=S*.009;g.beginPath();for(let k=0;k<2;k++)for(let i=0;i<=3;i++){const a=(i/3+k/6)*6.283-1.571;const x=c+Math.cos(a)*c*.56,y=c+Math.sin(a)*c*.56;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
  g.font=`${Math.round(S*.06)}px serif`;g.textAlign='center';g.textBaseline='middle';const R='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ';
  for(let i=0;i<18;i++){const a=i/18*6.283;g.save();g.translate(c+Math.cos(a)*c*.7,c+Math.sin(a)*c*.7);g.rotate(a+1.571);g.fillText(R[i],0,0);g.restore();}},256);
// รอยแตกพื้น
const fxCrackTex=()=>fxCanvasTex('crack',(g,S)=>{const c=S/2,grd=g.createRadialGradient(c,c,0,c,c,c);grd.addColorStop(0,'rgba(255,255,255,.9)');grd.addColorStop(.25,'rgba(255,255,255,.25)');grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd;g.fillRect(0,0,S,S);g.strokeStyle='#fff';g.lineCap='round';
  for(let i=0;i<11;i++){let x=c,y=c,a=i/11*6.283+Math.random()*.4;g.lineWidth=S*.016;g.beginPath();g.moveTo(x,y);
    for(let k=0;k<7;k++){a+=(Math.random()-.5)*.8;const L=c*(.08+Math.random()*.08);x+=Math.cos(a)*L;y+=Math.sin(a)*L;g.lineTo(x,y);g.lineWidth=S*.016*(1-k/8);}g.stroke();}},256);
// เส้นประกาย (สำหรับเส้นพุ่ง/รังสี)
const fxStreakTex=()=>fxCanvasTex('streak',(g,S)=>{const grd=g.createLinearGradient(0,0,0,S);grd.addColorStop(0,'rgba(255,255,255,0)');grd.addColorStop(.5,'rgba(255,255,255,1)');grd.addColorStop(1,'rgba(255,255,255,0)');
  const h=g.createLinearGradient(0,0,S,0);g.fillStyle=grd;g.fillRect(S*.42,0,S*.16,S);},64);
// แถบโค้งจันทร์เสี้ยว: uv.x = ตามความยาวโค้ง (0 หาง → 1 หัว), uv.y = ตามความกว้าง (0 ใน → 1 ขอบนอก)
function fxArcGeo(){if(FX2G.arc)return FX2G.arc;const N=40,P=[],U=[],I=[];
  for(let i=0;i<=N;i++){const t=i/N,a=-1.25+t*2.5,w=.12+.88*Math.sin(t*Math.PI)**.7;
    [[1-.45*w,0],[1,1]].forEach(([r,v])=>{P.push(Math.cos(a)*r,Math.sin(a)*r,0);U.push(t,v);});
    if(i<N){const k=i*2;I.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);FX2G.arc=g;return g;}
const FX_ARC_VS='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const FX_ARC_FS='uniform vec3 c1,c2;uniform float k,f;varying vec2 vU;void main(){float rev=smoothstep(k,k-.18,vU.x);'+  // k = กวาดไปถึงไหน, f = จางหาย
  'float tail=smoothstep(0.,.35,vU.x);float edge=smoothstep(0.,1.,vU.y);float a=rev*tail*(.35+.65*edge)*f*1.5;vec3 col=mix(c1,c2,smoothstep(.55,1.,edge)*(.5+.5*smoothstep(k-.3,k,vU.x)));gl_FragColor=vec4(col,a);}';
// เสาแสง: ทรงกระบอกเปิด จางขึ้นบน มีริ้วเลื่อนขึ้น
const FX_COL_VS='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const FX_COL_FS='uniform vec3 c1,c2;uniform float t,o;varying vec2 vU;void main(){float y=vU.y;float st=.6+.4*sin(vU.x*37.7+t*3.)*sin(vU.x*12.6-t*2.);'+
  'float a=(1.-y)*(1.-y)*smoothstep(0.,.08,y)*o*.45*(.55+.45*st);float stripe=smoothstep(.85,1.,fract(y*3.-t*1.6));gl_FragColor=vec4(mix(c1,c2,.2+.35*stripe),a*(1.+.5*stripe));}';
const fxCylGeo=()=>FX2G.cyl||(FX2G.cyl=new THREE.CylinderGeometry(1,1,1,28,1,true).translate(0,.5,0));
const fxPlane=()=>FX2G.plane||(FX2G.plane=new THREE.PlaneGeometry(1,1));
const fxCone=()=>FX2G.cone||(FX2G.cone=new THREE.ConeGeometry(.22,1,6).translate(0,.5,0));
const fxBox=()=>FX2G.box||(FX2G.box=new THREE.BoxGeometry(.16,.12,.14));

/* ---------- ตัวช่วยสร้าง/ลบ ---------- */
const fxAdd=(o)=>{scene.add(o);return o;};
const fxKill=(...os)=>os.forEach(o=>{if(!o)return;scene.remove(o);if(o.material)o.material.dispose();});
const fxBasic=(color,op,map)=>new THREE.MeshBasicMaterial({color,map:map||null,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
// แสงแฟลช: แกนขาวจัด ขอบจางเร็ว (สว่างกว่า TX.glow)
const fxFlashTex=()=>fxCanvasTex('flash',(g,S)=>{const c=S/2,grd=g.createRadialGradient(c,c,0,c,c,c);grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.18,'rgba(255,255,255,.95)');grd.addColorStop(.4,'rgba(255,255,255,.4)');grd.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grd;g.fillRect(0,0,S,S);},128);
// สไปรต์เอฟเฟกต์: ไม่ทดสอบความลึก (กล้องมองจากบนลงล่าง ครึ่งล่างของสไปรต์จะจมพื้นถ้าทดสอบ)
const FX_BRIGHT=.6; // ความสว่างรวมของเอฟเฟกต์ (เจ้าของไม่อยากให้จอขาวจ้า)
const fxSprite=(color,size,pos,op,map)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:map||fxFlashTex(),color,transparent:true,opacity:(op==null?1:op)*FX_BRIGHT,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));s.renderOrder=20;s.scale.set(size,size,1);s.position.copy(pos);return fxAdd(s);};
const fxN=n=>Math.max(1,Math.round(n*(LOW?.45:1)));
// แฟลชจอ (DOM) สีจาง ๆ ตอนไม้ตาย/โดนแรง
function fxScreen(color,o){return; // ปิดแฟลชจอ (เจ้าของไม่ชอบ 1 ต.ค. 2026)
  const e=document.getElementById('fxFlash');if(!e)return;const c=new THREE.Color(color);
  e.style.background=`radial-gradient(circle at 50% 55%,rgba(255,255,255,${.55*(o||1)}),rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},${.35*(o||1)}) 45%,rgba(0,0,0,0) 80%)`;
  e.classList.remove('on');void e.offsetWidth;e.classList.add('on');}

/* ---------- คลื่นดาบจันทร์เสี้ยว ---------- */
function fxSlash(u,t,opt){
  if(!fxOn(u)||!t)return; opt=opt||{};
  const [c1,c2]=fxCol(u), K=fxK(u)*(opt.k||1);
  const mid=t.w.position.clone().setY((t.evo?.95:.65)*(t.boss?1.3:1)), from=u.w.position;
  const dir=Math.atan2(mid.x-from.x,mid.z-from.z);
  const m=new THREE.ShaderMaterial({vertexShader:FX_ARC_VS,fragmentShader:FX_ARC_FS,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{c1:{value:new THREE.Color(c1)},c2:{value:new THREE.Color(c2)},k:{value:0},f:{value:1}}});
  const g=new THREE.Mesh(fxArcGeo(),m); g.renderOrder=21; g.position.copy(mid);
  const tilt=opt.tilt!=null?opt.tilt:(Math.random()-.5)*1.4; g.rotation.order='YXZ'; g.rotation.set(-1.05+tilt*.25,dir+Math.PI,tilt*.9); // วางเอียงหันหากล้อง (กล้องมองจากบน)
  const R=1.35*K; g.scale.setScalar(R); fxAdd(g);
  tween(.42,k=>{m.uniforms.k.value=Math.min(1.2,k*3);m.uniforms.f.value=k<.35?1:1-(k-.35)/.65;g.scale.setScalar(R*(1+k*.3));},easeOut).then(()=>fxKill(g));
  fxImpact(mid,u,{k:.75*(opt.k||1),noRing:!opt.big});
  if(fxTier(u)>=3&&!LOW)particles(mid,c2,6,2.6,.04,1.5,.9);
}

/* ---------- ระเบิดตอนโดน: แฟลช + เส้นพุ่งรอบทิศ + วงกระแทก ---------- */
function fxImpact(pos,u,opt){
  opt=opt||{}; const [c1,c2]=u?fxCol(u):[opt.c||0xffffff,0xffffff], K=(u?fxK(u):1)*(opt.k||1);
  const f=fxSprite(c1,1*K,pos,.6), f2=fxSprite(c1,1.8*K,pos,.4);
  tween(.22,k=>{f.scale.setScalar(1*K*(1+k*.6));f.material.opacity=(.55*(1-k))*FX_BRIGHT;f2.scale.setScalar(1.8*K*(1+k*.4));f2.material.opacity=(.5*(1-k))*FX_BRIGHT;}).then(()=>fxKill(f,f2));
  const n=fxN(opt.rays||7);
  for(let i=0;i<n;i++){const s=fxSprite(i%2?c1:c2,1,pos,1);const a=Math.random()*6.283,L=(.9+Math.random()*.9)*K;
    s.material.rotation=a; s.scale.set(.16*K,L,1);
    const off=new THREE.Vector3(-Math.sin(a),Math.cos(a),0);
    tween(.26+Math.random()*.1,k=>{s.position.copy(pos).addScaledVector(off,k*L*.6);s.scale.y=L*(1-k*.6);s.material.opacity=(1-k)*FX_BRIGHT;},easeOut).then(()=>fxKill(s));}
  if(!opt.noRing)fxRing(pos,c1,.9*K,.45);
}
// วงคลื่นที่พื้น
function fxRing(pos,color,size,dur,map){const m=new THREE.Mesh(fxPlane(),fxBasic(color,.95,map||fxRingTex()));m.rotation.x=-Math.PI/2;m.position.copy(pos).setY(.06);fxAdd(m);
  tween(dur||.5,k=>{m.scale.setScalar(size*(.3+k*2.2));m.material.opacity=.95*(1-k);},easeOut).then(()=>fxKill(m));}
const fxRingTex=()=>fxCanvasTex('ring',(g,S)=>{const c=S/2,grd=g.createRadialGradient(c,c,c*.55,c,c,c);grd.addColorStop(0,'rgba(255,255,255,0)');grd.addColorStop(.75,'rgba(255,255,255,1)');grd.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grd;g.fillRect(0,0,S,S);},128);

/* ---------- วงเวทที่พื้น (ก่อนตก/ใต้เท้าคนร่าย) ---------- */
function fxRune(pos,color,size,dur,spin){const m=new THREE.Mesh(fxPlane(),fxBasic(color,0,fxRuneTex()));m.rotation.x=-Math.PI/2;m.position.copy(pos).setY(.07);m.scale.setScalar(size);fxAdd(m);
  const sp=spin||1.2;return tween(dur,k=>{m.material.opacity=Math.sin(Math.min(1,k*1.4)*Math.PI*.5)*(k>.8?(1-k)/.2:1)*.95;m.rotation.z=k*sp;m.scale.setScalar(size*(.85+k*.2));}).then(()=>fxKill(m));}

/* ---------- เสาแสง ---------- */
function fxPillar(pos,c1,c2,r,h,dur){
  const m=new THREE.ShaderMaterial({vertexShader:FX_COL_VS,fragmentShader:FX_COL_FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{c1:{value:new THREE.Color(c1)},c2:{value:new THREE.Color(c2)},t:{value:0},o:{value:0}}});
  const p=new THREE.Mesh(fxCylGeo(),m);p.position.copy(pos).setY(0);p.scale.set(r,h,r);fxAdd(p);
  return tween(dur,k=>{const o=k<.15?k/.15:1-(k-.15)/.85;m.uniforms.t.value=k*dur*3;m.uniforms.o.value=o*.6;p.scale.x=p.scale.z=r*(1+k*.5);},).then(()=>{fxKill(p);});
}

/* ---------- ไม้ตาย: แฟลชจอ + ระเบิดพลังรอบตัวก่อนออกท่า ---------- */
function fxUltStart(u){
  if(!fxOn(u))return; const [c1,c2]=fxCol(u),K=fxK(u),p=u.w.position.clone();
  fxRune(p,c1,2.2*K,.9,2.4); fxRing(p,c2,1.1*K,.5);
  const n=fxN(14);for(let i=0;i<n;i++){const a=i/n*6.283,s=fxSprite(i%2?c1:c2,.22*K,p.clone().add(new THREE.Vector3(Math.cos(a)*.9*K,.1,Math.sin(a)*.9*K)),1);
    tween(.7,k=>{const r=.9*K*(1-k*.8);s.position.set(p.x+Math.cos(a+k*3)*r,.1+k*2.2*K,p.z+Math.sin(a+k*3)*r);s.material.opacity=(1-k*k)*FX_BRIGHT;}).then(()=>fxKill(s));}
  if(u.side==='P'||u.boss)fxScreen(c1,fxTier(u)>=4?1:.7);
  if(fxTier(u)>=4)fxPillar(p,c1,c2,.6*K,4*K,.8);
}

/* ---------- กระโดดฟัน/ดิ่งลง ---------- */
function fxLeapTele(u,c){if(!fxOn(u))return;const [c1]=fxCol(u),K=fxK(u);fxRune(c,c1,2.6*K,1.1,-1.6);}
function fxLeapLand(u,c){
  if(!fxOn(u))return; const [c1,c2]=fxCol(u),K=fxK(u),T=fxTier(u),el=u.el, cy=c.clone().setY(0);
  shake=Math.max(shake,.22+.06*T); if(u.side==='P'||u.boss)fxScreen(c1,.45+.15*T);
  if(!u.dragon){fxRing(cy,c2,1.6*K,.55); setTimeout(()=>fxRing(cy,c1,2.3*K,.7),90/SPEED);}   // มังกรใช้วงไฟดำของตัวเอง (blackFireRing ใน dragon.js)
  const cr=new THREE.Mesh(fxPlane(),new THREE.MeshBasicMaterial({color:c1,map:fxCrackTex(),transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  cr.rotation.x=-Math.PI/2;cr.rotation.z=Math.random()*6;cr.position.copy(cy).setY(.05);cr.scale.setScalar(3.4*K);fxAdd(cr);
  tween(1.3,k=>{cr.material.opacity=.95*(1-k*k);}).then(()=>fxKill(cr));
  fxPillar(cy,c1,c2,.55*K,(2.6+T)*K,.7);
  fxImpact(cy.clone().setY(.6),u,{k:1.3,rays:10});
  // เศษหินกระเด็น
  const n=fxN(8+T*2),mat=new THREE.MeshLambertMaterial({color:0x4a3c2e});
  const rocks=[];for(let i=0;i<n;i++){const r=new THREE.Mesh(fxBox(),mat);r.position.copy(cy).setY(.1);const a=Math.random()*6.283,s=(2+Math.random()*3)*K;
    r.userData.v=new THREE.Vector3(Math.cos(a)*s*.5,3+Math.random()*3,Math.sin(a)*s*.5);r.scale.setScalar(.6+Math.random()*1.2);fxAdd(r);rocks.push(r);}
  tween(.9,k=>rocks.forEach(r=>{const v=r.userData.v;r.position.addScaledVector(v,1/60);v.y-=9.8/60;if(r.position.y<.05){r.position.y=.05;v.multiplyScalar(.5);v.y=Math.abs(v.y)*.3;}r.rotation.x+=.2;r.rotation.z+=.15;})).then(()=>{rocks.forEach(r=>scene.remove(r));mat.dispose();});
  fxElement(el,cy,u,K);
  if(u.sp==='sarael')fxFeathers(cy.clone().setY(1.2),K);
}
// เอฟเฟกต์ตามธาตุที่จุดตก
function fxElement(el,c,u,K){
  const [c1,c2]=fxCol(u);
  if(el==='ไฟ'){const n=fxN(10);for(let i=0;i<n;i++){const a=Math.random()*6.283,r=Math.random()*1.6*K,s=fxSprite(i%3?0xff7a1a:0xffd27a,.7*K,c.clone().add(new THREE.Vector3(Math.cos(a)*r,.2,Math.sin(a)*r)),.9);
      const d=.6+Math.random()*.5;tween(d,k=>{s.position.y=.2+k*2.4*K;s.scale.setScalar(.7*K*(1-k*.6));s.material.opacity=(.9*(1-k))*FX_BRIGHT;}).then(()=>fxKill(s));}}
  else if(el==='น้ำ'){const n=fxN(16);for(let i=0;i<n;i++){const a=i/n*6.283,s=fxSprite(i%2?0x8fe4ff:0xeaffff,.28*K,c.clone().setY(.2),1);const v=new THREE.Vector3(Math.cos(a)*2.4*K,4+Math.random()*2,Math.sin(a)*2.4*K);
      tween(.8,k=>{s.position.set(c.x+v.x*k*.5,.2+v.y*k*.5-4.9*k*k*.5*1.6,c.z+v.z*k*.5);s.material.opacity=(1-k)*FX_BRIGHT;}).then(()=>fxKill(s));}
      fxPillar(c,0x3aa8ff,0xeaffff,.4*K,3*K,.6);}
  else if(el==='ลม'){const n=fxN(18);for(let i=0;i<n;i++){const ph=i/n*6.283,s=fxSprite(i%2?0x8ff0c8:0xf0fff6,.3*K,c,.9);
      tween(1,k=>{const r=(.5+k*1.2)*K,a=ph+k*9;s.position.set(c.x+Math.cos(a)*r,.2+k*3*K*(.4+(i%5)/8),c.z+Math.sin(a)*r);s.material.opacity=(.9*(1-k))*FX_BRIGHT;}).then(()=>fxKill(s));}}
  else if(el==='ดิน'){const n=fxN(7),mat=new THREE.MeshLambertMaterial({color:0x6a5236,flatShading:true});const sp=[];
      for(let i=0;i<n;i++){const a=i/n*6.283+Math.random()*.4,r=(.8+Math.random()*.7)*K,m=new THREE.Mesh(fxCone(),mat);m.position.set(c.x+Math.cos(a)*r,0,c.z+Math.sin(a)*r);
        m.rotation.set(Math.sin(a)*.35,0,-Math.cos(a)*.35);m.scale.set(K,.01,K);fxAdd(m);sp.push(m);}
      tween(.25,k=>sp.forEach(m=>m.scale.y=k*1.4*K),easeOut).then(()=>wait(500)).then(()=>tween(.35,k=>sp.forEach(m=>m.scale.y=1.4*K*(1-k)))).then(()=>{sp.forEach(m=>scene.remove(m));mat.dispose();});}
  else if(el==='แสง'){const n=fxN(8);for(let i=0;i<n;i++){const a=i/n*3.14,s=new THREE.Mesh(fxPlane(),fxBasic(0xfff6c0,0,fxStreakTex()));s.position.copy(c).setY(2.2*K);s.rotation.y=a;s.scale.set(.5*K,4.4*K,1);fxAdd(s);
      tween(.7,k=>{s.material.opacity=(Math.sin(k*Math.PI)*.9)*FX_BRIGHT;s.rotation.y=a+k*.6;}).then(()=>fxKill(s));}}
  else if(el==='มืด'){const v=fxSprite(0x5a1ab8,3.2*K,c.clone().setY(.8),.9),v2=fxSprite(0xc890ff,1.2*K,c.clone().setY(.8),1);
      tween(.6,k=>{v.scale.setScalar(3.2*K*(1-k*.85));v.material.opacity=(.9*(1-k*.5))*FX_BRIGHT;v2.material.opacity=(1-k)*FX_BRIGHT;}).then(()=>{fxKill(v,v2);fxImpact(c.clone().setY(.8),null,{c:0xb070ff,k:1.4*K});});}
}
// ขนนกเปลวไฟสองสี (ซาราเอล)
function fxFeathers(p,K){const n=fxN(18);for(let i=0;i<n;i++){const s=fxSprite(i%2?0xfff2d0:0xff3a2a,.32*K,p,1);s.scale.set(.14*K,.5*K,1);const a=Math.random()*6.283,up=Math.random()*2+1;
  const v=new THREE.Vector3(Math.cos(a)*3*K,up,Math.sin(a)*3*K);s.material.rotation=Math.random()*6;
  tween(1.2,k=>{s.position.set(p.x+v.x*k,p.y+v.y*k-1.2*k*k,p.z+v.z*k);s.material.rotation+=.08;s.material.opacity=(1-k)*FX_BRIGHT;}).then(()=>fxKill(s));}}

/* ---------- ลูกพลังมีหางดาวหาง (ใช้แทนลูกไฟเดิมใน rigCast) ---------- */
function fxCometTrail(u,g,k){if(!fxOn(u)||Math.random()>(LOW?.35:.8))return;const [c1,c2]=fxCol(u),s=fxSprite(Math.random()<.5?c1:c2,.32*fxK(u),g.position,.85);
  tween(.35,q=>{s.scale.setScalar(.32*fxK(u)*(1-q));s.material.opacity=(.85*(1-q))*FX_BRIGHT;}).then(()=>fxKill(s));}
function fxBoltHit(u,pos){if(!fxOn(u))return;fxImpact(pos,u,{k:.9,rays:6});}

/* ---------- ฝนดาวตก/พายุทราย ---------- */
function fxMeteorTrail(u,g){fxCometTrail(u,g);if(fxOn(u)&&fxTier(u)>=3&&Math.random()<.4)fxCometTrail(u,g);}
function fxRainLand(u,pos){if(!fxOn(u))return;fxImpact(pos,u,{k:1,rays:8});fxRing(pos,fxCol(u)[0],.9*fxK(u),.45);}
function fxRainEnd(u,c){if(!fxOn(u))return;const [c1,c2]=fxCol(u),K=fxK(u);
  if(u.sp==='anubis'){const n=fxN(26);for(let i=0;i<n;i++){const ph=Math.random()*6.283,s=fxSprite(i%3?0xe8c47a:0x9a5cff,(.35+Math.random()*.4)*K,c,.8);
      tween(1.4,k=>{const r=(.4+k*2)*K,a=ph+k*7;s.position.set(c.x+Math.cos(a)*r,.2+k*3.4*K*((i%7)/7+.3),c.z+Math.sin(a)*r);s.material.opacity=(.8*Math.sin(k*Math.PI))*FX_BRIGHT;}).then(()=>fxKill(s));}}
  fxPillar(c,c1,c2,.9*K,3.2*K,.8); fxRune(c,c1,3*K,1,1.8); if(u.side==='P')fxScreen(c1,.6);}

/* ---------- ฮีล ---------- */
function fxHealCast(u){const [c1,c2]=fxCol(u),K=fxK(u)||1,p=u.w.position.clone();fxRune(p,c1,2.2*K,1,1.4);fxPillar(p,c1,c2,.5*K,2.6*K,.8);}
function fxHealOn(u,f){const [c1,c2]=fxCol(u),p=f.w.position.clone();fxRune(p,c1,1.5,.8,2);fxPillar(p,c1,c2,.38,2.2,.7);
  const n=fxN(10);for(let i=0;i<n;i++){const ph=i/n*6.283,s=fxSprite(i%2?c1:c2,.18,p,1);
    tween(.9,k=>{const a=ph+k*6,r=.55*(1-k*.4);s.position.set(p.x+Math.cos(a)*r,.1+k*2,p.z+Math.sin(a)*r);s.material.opacity=(1-k)*FX_BRIGHT;}).then(()=>fxKill(s));}}

/* ---------- ไฟลุกที่พื้นหลังมังกรพ่นไฟ / ดิ่งลง ---------- */
function fxDragonGround(u,c){if(!fxOn(u))return;fxLeapLand(u,c);}
