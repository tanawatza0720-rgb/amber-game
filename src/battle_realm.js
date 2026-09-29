/* ================= ดินแดนสี่เผ่า (สนามรบประจำเผ่า) =================
   โมเดลสนามจาก Tripo (ลดเหลือ ~9 หมื่นสามเหลี่ยม/ฉาก) อยู่ที่ realm/<file>.glb
   ทุกดินแดนเป็นเกาะลอยฟ้า กว้าง ISLAND_D หน่วย (ซูมออกสุดแล้วเห็นทั้งเกาะพอดี)
   พื้นลานมีลายเรืองแสง/ของประดับ และเหตุการณ์บรรยากาศ (พายุหมุน อุกกาบาต พื้นปะทุ ดาวตก) — เป็นฉากอย่างเดียว ไม่มีผลกับการต่อสู้
   ใช้ตอน: ด่านทั่วไปวนดินแดนตามบท (บท 1 = นครหอคอยคู่เดิม, บท 2+ = มนุษย์ → กึ่งมนุษย์ → อันเดด → เทพเจ้า)
           ด่านบอส = สู้ในดินแดนของศัตรู โดนสกิลดินแดน (ฝั่งเจ้าบ้าน = ศัตรู)
           PVP (ไม่เรียลไทม์): ทีมบุกของเราไปสู้กับทีมป้องกันที่ผู้เล่นอื่นตั้งไว้ ในดินแดนเผ่าของผู้ป้องกัน และโดนสกิลดินแดนของเขา
   ทดสอบ: battle.html?realm=human|undead|beast|god  (&realmfx=1 เปิดสกิลดินแดนทุกด่าน) */
const REALMS={
  human:{name:'มหานครอัมพร',file:'human',floor:.0913,r:.30,flat:.29,exp:.95,
    sky:['#0d1a2b','#23405e','#6c8fb0','#c9d8e6'],fog:0x3d5670,hemi:[0xcfe2ff,0x3a3f4a,.9],sunC:0xfff1dc,sunI:2.1,
    under:0x4a4f5a,cloud:0xdfe8f2,skill:{name:'ปืนพิทักษ์นคร',icon:'🏙️',desc:'ทุก 10 วินาที ป้อมปืนเมืองยิงลำแสงใส่ผู้บุกรุก 1 ตัว (6% HP สูงสุด)'}},
  beast:{name:'หุบเขาพงไพร',file:'forest',floor:.1939,r:.22,flat:.215,exp:1,
    sky:['#2d6c8f','#5ba7c8','#bfe3d8','#e9f4dd'],fog:0x8fb9a8,hemi:[0xe8ffe0,0x3c4a2a,1],sunC:0xfff4d6,sunI:2.3,
    under:0x5a4a36,cloud:0xffffff,skill:{name:'พรแห่งพงไพร',icon:'🌿',desc:'ทุก 10 วินาที ป่าฟื้นพลังให้เจ้าบ้านทุกตัว (4% HP สูงสุด)'}},
  undead:{name:'สมรภูมิยมโลก',file:'undead',floor:.1749,r:.27,flat:.26,exp:1.05,
    sky:['#07030a','#240a10','#5a1a12','#a8401a'],fog:0x2a0e0c,hemi:[0xffb09a,0x1a0808,.75],sunC:0xff9a6a,sunI:1.9,
    under:0x241512,cloud:0x3a2622,skill:{name:'ลาวาปะทุ',icon:'🌋',desc:'ทุก 10 วินาที ลาวาพุ่งใต้เท้าผู้บุกรุก 2 ตัว (ตัวละ 4% HP สูงสุด)'}},
  god:{name:'วิหารแดนสวรรค์',file:'gods',floor:.345,r:.22,flat:.22,exp:.8,
    sky:['#3c7fc4','#79b4e6','#cfe6f7','#fdf8ec'],fog:0xcfe2f2,hemi:[0xffffff,0x8aa0b8,1.05],sunC:0xfff6e0,sunI:2.4,
    under:null,cloud:0xffffff,skill:{name:'แสงพิพากษา',icon:'✨',desc:'ทุก 10 วินาที เสาแสงทองฟาดผู้บุกรุก 1 ตัว (5% HP สูงสุด)'}},
};
const ISLAND_D=80, ISLAND_K=ISLAND_D/.98;   // ความกว้างทั้งเกาะ (หน่วยเกม)
const REALM_CHAPTER=['human','beast','undead','god'];
// ดินแดนของด่าน n: บทแรกใช้นครหอคอยคู่เดิม จากนั้นวนสี่ดินแดน
const realmFor=n=>{const q=(location.search.match(/[?&]realm=(\w+)/)||[])[1];if(q&&REALMS[q])return q;if(q==='none')return null;
  const ch=Math.floor((Math.max(1,n)-1)/10);return ch<1?null:REALM_CHAPTER[(ch-1)%REALM_CHAPTER.length];};
var MAP_OBJS=scene.children.slice(MAP0).filter(o=>!o.isLight);
var RL={key:null,cache:{},root:null,T:0,next:6,skillOn:false,home:'E',fr:99,amb:4,ups:[],
  classic:{bg:scene.background,fog:scene.fog},hemi:new THREE.HemisphereLight(0xffffff,0x444444,0)};
scene.add(RL.hemi);
const RL_TIME={value:0};
const rlRnd=(a,b)=>a+Math.random()*(b-a);
// ---------- พื้นผิวเรืองแสงบนลาน (shader ตามดินแดน) ----------
const RL_DECAL_VS='varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const RL_DECAL_FS={
  human:`uniform float uTime,uR;varying vec2 vP;
    void main(){float r=length(vP)/uR,a=atan(vP.y,vP.x);
      float ring=0.;ring+=smoothstep(.012,0.,abs(r-.34));ring+=smoothstep(.01,0.,abs(r-.62));ring+=smoothstep(.014,0.,abs(r-.9));
      float sp=abs(sin(a*4.))*r*uR;float spoke=smoothstep(.16,0.,sp)*step(.36,r)*step(r,.9);
      float run=pow(smoothstep(.75,1.,fract(r*2.2-uTime*.45)),3.);
      float hex=0.;{vec2 q=vP*.22;q.x*=1.1547;q.y+=mod(floor(q.x),2.)*.5;vec2 f=abs(fract(q)-.5);hex=smoothstep(.03,0.,abs(max(f.x*1.5+f.y,f.y*2.)-1.))*.18*step(.36,r)*step(r,.9);}
      float scan=smoothstep(.02,0.,abs(r-fract(uTime*.12)*.95))*.8;
      float v=ring*(.45+.25*sin(uTime*2.+r*9.))+spoke*(.25+1.2*run)+hex*(.6+.4*sin(uTime*1.3+a*3.))+scan*step(r,.93);
      gl_FragColor=vec4(vec3(.3,.85,1.)*v,1.)*smoothstep(1.,.95,r);}`,
  undead:`uniform float uTime,uR;varying vec2 vP;
    vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
    void main(){float r=length(vP)/uR;vec2 g=vP*.3,ip=floor(g),fp=fract(g);float f1=8.,f2=8.;vec2 c1;
      for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 b=vec2(float(i),float(j));vec2 o=h2(ip+b);o=.5+.4*sin(uTime*.15+6.28*o);vec2 d=b+o-fp;float dd=dot(d,d);
        if(dd<f1){f2=f1;f1=dd;c1=ip+b;}else if(dd<f2)f2=dd;}
      float e=sqrt(f2)-sqrt(f1);float crack=smoothstep(.09,0.,e);
      float ph=h2(c1).x*6.28;float pulse=.45+.55*pow(.5+.5*sin(uTime*1.6+ph),2.);
      float flow=.7+.3*sin(length(vP)*.8-uTime*2.);
      vec3 col=mix(vec3(1.,.25,.02),vec3(1.,.75,.2),crack*pulse);
      float v=crack*pulse*flow*smoothstep(.08,.25,r)*smoothstep(1.,.9,r);
      gl_FragColor=vec4(col*v*1.3,1.);}`,
  god:`uniform float uTime,uR;varying vec2 vP;
    float band(float r,float c,float w){return smoothstep(w,0.,abs(r-c));}
    void main(){float r=length(vP)/uR,a=atan(vP.y,vP.x);
      float a1=a+uTime*.08,a2=a-uTime*.06;
      float v=band(r,.3,.006)+band(r,.33,.004)+band(r,.58,.008)+band(r,.62,.004)+band(r,.88,.006);
      v+=band(r,.455,.06)*step(.965,abs(sin(a1*18.)))*.9;
      v+=band(r,.75,.05)*step(.94,abs(sin(a2*12.)))*.9;
      float star=0.;for(int k=0;k<6;k++){float t=float(k)*1.0472+uTime*.05;vec2 n=vec2(cos(t),sin(t));float d=abs(dot(vP/uR,n)-.3);star+=smoothstep(.006,0.,d)*step(length(vP/uR),.62);}
      v+=star*.6;
      float sh=.65+.35*sin(uTime*1.7+r*14.-a*2.);
      gl_FragColor=vec4(vec3(1.,.82,.4)*v*sh,1.)*smoothstep(1.,.95,r);}`,
};
function rlDecal(key,fr){const fs=RL_DECAL_FS[key];if(!fs)return null;
  const m=new THREE.Mesh(new THREE.CircleGeometry(fr,96),new THREE.ShaderMaterial({uniforms:{uTime:RL_TIME,uR:{value:fr}},vertexShader:RL_DECAL_VS,fragmentShader:fs,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,polygonOffset:true,polygonOffsetFactor:-2}));
  m.rotation.x=-Math.PI/2;m.position.y=.04;m.renderOrder=1;return m;}
// ---------- พื้นผิวภาพ (canvas) ----------
const RLTX={};
function rlTex(k){if(RLTX[k])return RLTX[k];let t;
  if(k==='soft')t=canvasTex(64,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);});
  else if(k==='cloud')t=canvasTex(128,(x,s)=>{for(let i=0;i<14;i++){const cx=s*(.25+Math.random()*.5),cy=s*(.35+Math.random()*.3),r=s*(.12+Math.random()*.18),g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}});
  else if(k==='leaf')t=canvasTex(32,(x,s)=>{x.fillStyle='#fff';x.beginPath();x.ellipse(s/2,s/2,s*.42,s*.2,.6,0,6.3);x.fill();});
  else if(k==='grass')t=canvasTex(64,(x,s)=>{x.clearRect(0,0,s,s);for(let i=0;i<14;i++){const bx=s*(.1+Math.random()*.8),h=s*(.45+Math.random()*.5),lean=(Math.random()-.5)*s*.3;
      const g=x.createLinearGradient(0,s,0,s-h);g.addColorStop(0,'#2d4a17');g.addColorStop(1,Math.random()<.5?'#9bd05a':'#7fbf45');x.fillStyle=g;x.beginPath();x.moveTo(bx-2,s);x.quadraticCurveTo(bx+lean*.3,s-h*.6,bx+lean,s-h);x.quadraticCurveTo(bx+lean*.3+1,s-h*.6,bx+2,s);x.fill();}});
  else if(k==='flower')t=canvasTex(32,(x,s)=>{x.fillStyle='#fff';for(let i=0;i<5;i++){const a=i*1.2566;x.beginPath();x.ellipse(s/2+Math.cos(a)*s*.2,s/2+Math.sin(a)*s*.2,s*.16,s*.1,a,0,6.3);x.fill();}x.fillStyle='#ffd24a';x.beginPath();x.arc(s/2,s/2,s*.1,0,6.3);x.fill();});
  else if(k==='stripe')t=canvasTex(64,(x,s)=>{for(let i=0;i<s;i++){const v=Math.pow(.5+.5*Math.sin(i/s*6.283*5+Math.sin(i*.3)),3);x.fillStyle=`rgba(255,255,255,${v})`;x.fillRect(0,i,s,1);}});
  if(t&&k!=='grass'&&k!=='leaf'&&k!=='flower')t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return RLTX[k]=t;}
// ---------- อนุภาคลอย (หิ่งห้อย/ถ่านไฟ/ละอองแสง/ใบไม้ร่วง) ----------
function rlMotes(root,n,fr,color,size,opts){opts=opts||{};n=LOW?Math.round(n*.5):n;
  const g=new THREE.BufferGeometry(),P=new Float32Array(n*3),V=[];
  for(let i=0;i<n;i++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*fr*1.05;P[i*3]=Math.cos(a)*r;P[i*3+1]=rlRnd(opts.y0||.3,opts.y1||9);P[i*3+2]=Math.sin(a)*r;V.push({w:Math.random()*6.28,s:rlRnd(.5,1.2)});}
  g.setAttribute('position',new THREE.BufferAttribute(P,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({color,size,map:rlTex(opts.tex||'soft'),transparent:true,depthWrite:false,blending:opts.normal?THREE.NormalBlending:THREE.AdditiveBlending,sizeAttenuation:true,fog:false}));
  root.add(m);const vy=opts.vy==null?.6:opts.vy;
  RL.ups.push((dt,T)=>{const p=g.attributes.position;for(let i=0;i<n;i++){const v=V[i];let x=p.getX(i)+Math.sin(T*.7+v.w)*dt*(opts.drift||.4),y=p.getY(i)+vy*v.s*dt,z=p.getZ(i)+Math.cos(T*.6+v.w)*dt*(opts.drift||.4);
    if(y>(opts.y1||9)){y=opts.y0||.3;}if(y<(opts.y0||.3)){y=opts.y1||9;}p.setXYZ(i,x,y,z);}p.needsUpdate=true;
    if(opts.blink)m.material.opacity=.6+.4*Math.sin(T*3);});
  return m;}
// ---------- พายุหมุนเดินวนบนลาน ----------
function rlWhirl(root,fr,o){const g=new THREE.Group();root.add(g);
  const H=o.h||7,tex=rlTex('stripe');
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(o.top||2.6,.35,H,28,6,true),new THREE.MeshBasicMaterial({map:tex,color:o.c,transparent:true,opacity:o.op||.45,depthWrite:false,side:THREE.DoubleSide,blending:o.normal?THREE.NormalBlending:THREE.AdditiveBlending,fog:false}));
  cone.position.y=H/2;g.add(cone);
  const cone2=cone.clone();cone2.material=cone.material.clone();cone2.scale.set(.7,.92,.7);cone2.material.opacity*=.8;g.add(cone2);
  tex.repeat.set(3,1);
  const n=LOW?12:26,ps=[];for(let i=0;i<n;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:rlTex(o.sprite||'soft'),color:(o.pc||[o.c])[i%(o.pc||[o.c]).length],transparent:true,depthWrite:false,blending:o.normal?THREE.NormalBlending:THREE.AdditiveBlending,fog:false}));
    const sc=rlRnd(.25,.6)*(o.ps||1);s.scale.set(sc,sc,1);g.add(s);ps.push({s,h:Math.random()*H,a:Math.random()*6.28,v:rlRnd(2.5,4.5)});}
  const dust=new THREE.Mesh(new THREE.CircleGeometry(2.4,32),new THREE.MeshBasicMaterial({map:rlTex('soft'),color:o.dust||o.c,transparent:true,opacity:.35,depthWrite:false,fog:false}));dust.rotation.x=-Math.PI/2;dust.position.y=.06;g.add(dust);
  const pick=()=>{const a=Math.random()*6.28,r=rlRnd(.25,.72)*fr;return new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);};
  g.position.copy(pick());let tgt=pick();
  RL.ups.push((dt,T)=>{const d=tgt.clone().sub(g.position);if(d.length()<1)tgt=pick();else g.position.addScaledVector(d.normalize(),dt*(o.speed||2.2));
    cone.rotation.y-=dt*5;cone2.rotation.y-=dt*7;tex.offset.y=(tex.offset.y+dt*.6)%1;const sw=Math.sin(T*1.7)*.12;cone.rotation.z=sw;cone2.rotation.z=sw*1.4;
    ps.forEach(p=>{p.a+=p.v*dt;p.h+=dt*(1+p.v*.3);if(p.h>H)p.h=0;const rr=.4+(p.h/H)*(o.top||2.6)*1.05;p.s.position.set(Math.cos(p.a)*rr+Math.sin(p.h+T)*.2*sw,p.h,Math.sin(p.a)*rr);});});
  return g;}
// ---------- เมฆรอบเกาะ + ฐานหินใต้เกาะ ----------
function rlClouds(root,col,dark){const n=LOW?6:11;for(let i=0;i<n;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:rlTex('cloud'),color:col,transparent:true,opacity:dark?.75:.85,depthWrite:false,fog:false}));
  const a=i/n*6.28+Math.random()*.4,r=rlRnd(44,70),sc=rlRnd(22,40);s.scale.set(sc,sc*.55,1);s.position.set(Math.cos(a)*r,rlRnd(-26,-6),Math.sin(a)*r);s.userData.a=a;s.userData.r=r;root.add(s);
  RL.ups.push(dt=>{s.userData.a+=dt*.01;s.position.x=Math.cos(s.userData.a)*s.userData.r;s.position.z=Math.sin(s.userData.a)*s.userData.r;});}}
function rlUnder(root,top,y,col,glowCol){
  const pts=[[1,0],[.97,-1.5],[.9,-4],[.78,-8],[.62,-13],[.44,-19],[.26,-25],[.1,-31],[0,-34]].map(([r,h])=>new THREE.Vector2(r*top,h*top/40));
  const g=new THREE.LatheGeometry(pts,40);const P=g.attributes.position;
  for(let i=0;i<P.count;i++){const x=P.getX(i),yy=P.getY(i),z=P.getZ(i),r=Math.hypot(x,z);if(yy>-.5)continue;const a=Math.atan2(z,x);
    const n=1+.14*Math.sin(a*5+yy*.3)+.1*Math.sin(a*11-yy*.5)+.06*Math.sin(a*23+yy);P.setXYZ(i,x*n,yy+Math.sin(a*7)*1.2,z*n);}
  g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:col,roughness:1,flatShading:true,emissive:glowCol||0x000000,emissiveIntensity:glowCol?.35:0}));m.position.y=y;root.add(m);
  // หินลอยเล็ก ๆ ใต้เกาะ
  for(let i=0;i<(LOW?4:8);i++){const s=new THREE.Mesh(new THREE.DodecahedronGeometry(rlRnd(1,2.6),0),m.material);const a=Math.random()*6.28,r=rlRnd(top*.9,top*1.3);s.position.set(Math.cos(a)*r,y-rlRnd(4,16),Math.sin(a)*r);
    s.userData.b=Math.random()*6.28;root.add(s);RL.ups.push((dt,T)=>{s.position.y+=Math.sin(T*.8+s.userData.b)*dt*.4;s.rotation.y+=dt*.2;});}
}
// ---------- ของประดับบนลาน ----------
function rlProps(key,root,fr){
  if(key==='human'){ // เสาโฮโลแกรมรอบลาน + ห่วงพลังงานหมุน
    for(let i=0;i<8;i++){const a=i/8*6.28+.2,r=fr*.95,g=new THREE.Group();g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,.5,8),new THREE.MeshStandardMaterial({color:0x2a3240,metalness:.6,roughness:.4}));base.position.y=.25;g.add(base);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,5,8,1,true),new THREE.MeshBasicMaterial({color:0x5fe6ff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));beam.position.y=3;g.add(beam);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.05,6,24),new THREE.MeshBasicMaterial({color:0x8ff4ff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));ring.rotation.x=Math.PI/2;g.add(ring);
      glow(g,0x6fe8ff,2.4,[0,5.6,0],.9);root.add(g);
      RL.ups.push((dt,T)=>{const k=(T*.6+i*.125)%1;ring.position.y=.5+k*5;ring.material.opacity=.9*(1-k);beam.material.opacity=.35+.25*Math.sin(T*3+i);});}
  }else if(key==='beast'){ // พุ่มหญ้า ดอกไม้ ก้อนหิน
    const gm=new THREE.MeshLambertMaterial({map:rlTex('grass'),transparent:true,alphaTest:.4,side:THREE.DoubleSide});
    const gg=new THREE.PlaneGeometry(1,1);gg.translate(0,.5,0);
    const n=LOW?260:620,im=new THREE.InstancedMesh(gg,gm,n*2),M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),e=new THREE.Euler();
    for(let i=0;i<n;i++){const a=Math.random()*6.28,r=Math.pow(Math.random(),.6)*fr*.97,h=rlRnd(.5,1.1);p.set(Math.cos(a)*r,0,Math.sin(a)*r);
      for(let j=0;j<2;j++){e.set(0,Math.random()*3.14+j*1.57,0);q.setFromEuler(e);s.set(h*1.1,h,1);M.compose(p,q,s);im.setMatrixAt(i*2+j,M);}}
    im.receiveShadow=false;root.add(im);
    const fl=new THREE.InstancedMesh(new THREE.PlaneGeometry(.45,.45).rotateX(-Math.PI/2).translate(0,.12,0),new THREE.MeshLambertMaterial({map:rlTex('flower'),transparent:true,alphaTest:.4,side:THREE.DoubleSide}),LOW?80:180);
    const FC=[0xff7fb0,0xfff07a,0xb6a2ff,0xffffff,0xff9a5a];
    for(let i=0;i<fl.count;i++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*fr*.95;p.set(Math.cos(a)*r,0,Math.sin(a)*r);q.setFromEuler(e.set(0,Math.random()*6,0));const sc=rlRnd(.7,1.3);s.set(sc,sc,sc);M.compose(p,q,s);fl.setMatrixAt(i,M);fl.setColorAt(i,new THREE.Color(FC[i%FC.length]));}
    root.add(fl);
    const rm=new THREE.MeshStandardMaterial({color:0x5e5d4e,roughness:1,flatShading:true});
    for(let i=0;i<14;i++){const a=Math.random()*6.28,r=rlRnd(.82,.97)*fr,st=new THREE.Mesh(new THREE.DodecahedronGeometry(rlRnd(.5,1.3),0),rm);st.position.set(Math.cos(a)*r,.2,Math.sin(a)*r);st.scale.y=rlRnd(.5,.9);st.rotation.set(Math.random(),Math.random()*6,0);root.add(st);}
  }else if(key==='undead'){ // หินแหลมเรืองไฟรอบลาน + โครงกระดูกหิน
    const rm=new THREE.MeshStandardMaterial({color:0x140c0a,roughness:1,flatShading:true,emissive:0x2a0600,emissiveIntensity:.5,fog:false});
    for(let i=0;i<12;i++){const a=i/12*6.28+Math.random()*.3,r=rlRnd(.88,.98)*fr,h=rlRnd(1.6,4.2),c=new THREE.Mesh(new THREE.ConeGeometry(rlRnd(.5,1),h,5),rm);c.position.set(Math.cos(a)*r,h/2-.1,Math.sin(a)*r);c.rotation.set(rlRnd(-.25,.25),Math.random()*6,rlRnd(-.25,.25));root.add(c);
      if(i%3===0)glow(c,0xff5a1a,1.6,[0,h*.5,0],.7);}
  }else if(key==='god'){ // ผลึกลอยหมุนรอบลาน
    const cm=new THREE.MeshStandardMaterial({color:0xaef3ff,emissive:0x3ab8ff,emissiveIntensity:.9,metalness:.2,roughness:.15,transparent:true,opacity:.9});
    for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),cm);c.scale.set(.6,1.3,.6);root.add(c);const gl=glow(c,0x9fe8ff,3.2,[0,0,0],.7);
      RL.ups.push((dt,T)=>{const a=i/6*6.28+T*.12,r=fr*.9;c.position.set(Math.cos(a)*r,4+Math.sin(T*1.3+i)*.6,Math.sin(a)*r);c.rotation.y+=dt*1.2;});}
  }
}
// ---------- เหตุการณ์บรรยากาศ (ภาพอย่างเดียว) ----------
const rlRim=(fr,a0,a1)=>{const a=Math.random()*6.28,r=rlRnd(a0,a1)*fr;return new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);};
function rlMeteor(to,o){ // ลูกไฟ/ดาวตกจากฟ้า
  const dir=new THREE.Vector3(rlRnd(-1,1),0,rlRnd(-1,1)).normalize(),from=to.clone().addScaledVector(dir,-30).setY(42);
  const head=glow(scene,o.c,o.size||3.2,[from.x,from.y,from.z],1);let acc=0;
  return tween(o.t||1.25,k=>{head.position.lerpVectors(from,to,k*k);acc+=1;
    if(acc%2===0){if(o.fire)fireSprite(head.position.clone(),new THREE.Vector3(0,.3,0),.5,1.6,{grav:0,grow:2});else particles(head.position.clone(),o.c2||o.c,2,.4,.12,0,.9);}}).then(()=>{
    scene.remove(head);shockRing(to.clone().setY(.07),o.c);particles(to.clone().setY(.3),o.c2||o.c,o.fire?16:12,4.5,.14,2);
    if(o.fire){for(let j=0;j<9;j++){const a=Math.random()*6.28,s=rlRnd(1,3);fireSprite(to.clone().setY(.4),new THREE.Vector3(Math.cos(a)*s,rlRnd(2,5),Math.sin(a)*s),rlRnd(.6,1),rlRnd(1.2,2),{grav:-2,grow:2.5});}scorch(to,2.2);}
    try{fireLight(to.clone().setY(1.5),o.fire?7:5,.6);}catch(e){}
    const d=Math.hypot(to.x-LOOK.x,to.z-LOOK.z);if(d<30)shake=Math.max(shake,.12*(1-d/30));});}
function rlErupt(p,o){ // พื้นปะทุ: วงเตือนเรืองแสง แล้วพุ่ง
  const warn=new THREE.Mesh(new THREE.CircleGeometry(o.r||1.8,28),new THREE.MeshBasicMaterial({color:o.c,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  warn.rotation.x=-Math.PI/2;warn.position.copy(p).setY(.06);scene.add(warn);
  return tween(1,k=>{warn.material.opacity=.75*Math.abs(Math.sin(k*Math.PI*2.5));warn.scale.setScalar(.6+k*.5);}).then(()=>{scene.remove(warn);
    if(o.lava){for(let j=0;j<(LOW?8:16);j++){const a=Math.random()*6.28,s=rlRnd(.2,1.4);fireSprite(p.clone().setY(.3),new THREE.Vector3(Math.cos(a)*s,rlRnd(6,11),Math.sin(a)*s),rlRnd(.8,1.3),rlRnd(1.2,2.2),{grav:-7,grow:2});}scorch(p,1.8);}
    else{const rm=RL.spikeM||(RL.spikeM=new THREE.MeshStandardMaterial({color:o.rock||0x7a6a52,roughness:1,flatShading:true}));
      for(let j=0;j<5;j++){const h=rlRnd(1.2,2.6),c=new THREE.Mesh(new THREE.ConeGeometry(rlRnd(.35,.6),h,5),rm),a=j/5*6.28,rr=j?rlRnd(.6,1.3):0;c.position.set(p.x+Math.cos(a)*rr,-h/2,p.z+Math.sin(a)*rr);c.rotation.z=j?(Math.random()-.5)*.6:0;scene.add(c);
        tween(.25,k=>c.position.y=-h/2+h*.95*k,easeOut).then(()=>wait(1600)).then(()=>tween(.6,k=>c.position.y=h*.45-h*k)).then(()=>{scene.remove(c);c.geometry.dispose();});}
      particles(p.clone().setY(.3),o.dust||0xb8a888,14,3,.3,1.2,.7);}
    shockRing(p.clone().setY(.07),o.c);});}
function realmAmbient(){const k=RL.key,fr=RL.fr;
  if(k==='human'){rlBeam(rlRim(fr,.55,.9),0x56dfff,55,true);RL.amb=rlRnd(5,8);}
  else if(k==='beast'){rlErupt(rlRim(fr,.5,.88),{c:0x9dff7a,rock:0x7c705a,dust:0xa8b878});RL.amb=rlRnd(6,9);}
  else if(k==='undead'){if(Math.random()<.55)rlMeteor(rlRim(fr,.45,.92),{c:0xff7a2a,c2:0xffc060,fire:true});else rlErupt(rlRim(fr,.45,.9),{c:0xff4a10,lava:true});RL.amb=rlRnd(3.5,6);}
  else if(k==='god'){rlMeteor(rlRim(fr,.5,.92),{c:0xffe08a,c2:0xffffff,size:2.6,t:1});if(Math.random()<.5)setTimeout(()=>RL.key==='god'&&rlMeteor(rlRim(fr,.5,.92),{c:0xbfe8ff,c2:0xffffff,size:2,t:1}),500);RL.amb=rlRnd(3.5,6);}
}
function rlDecor(key,root,fr){
  const d=rlDecal(key,fr);if(d)root.add(d);
  rlProps(key,root,fr);
  if(key==='human'){rlMotes(root,70,fr,0x7fe8ff,.35,{y1:10,vy:.5});rlWhirl(root,fr,{c:0x49d6ff,op:.35,top:2,h:6,speed:2.6,pc:[0x9ff4ff,0x4fb8ff]});}
  if(key==='beast'){rlMotes(root,90,fr,0xd9ff7a,.45,{y0:.4,y1:5,vy:.15,drift:.9,blink:1});rlMotes(root,50,fr,0x9fd35a,.6,{tex:'leaf',normal:1,y0:.2,y1:16,vy:-1.2,drift:1.6});
    rlWhirl(root,fr,{c:0xd8f2c0,op:.3,top:2.8,h:7.5,speed:2,sprite:'leaf',pc:[0x6fbf3a,0x9fd35a,0xd9c060],normal:1,ps:1.3,dust:0xb8c898});}
  if(key==='undead'){rlMotes(root,120,fr,0xff8a3a,.3,{y1:14,vy:1.4,drift:.6});rlWhirl(root,fr,{c:0xff6a1a,op:.5,top:2.6,h:8,speed:2.4,pc:[0xffb040,0xff5a10,0xffe070],ps:1.2,dust:0x5a1a08});}
  if(key==='god'){rlMotes(root,110,fr,0xfff0b0,.4,{y1:12,vy:.4});rlMotes(root,40,fr,0xffffff,.55,{tex:'leaf',normal:1,y0:.2,y1:14,vy:-.8,drift:1.2});}
}
function rlSkyTex(cols){return srgb(canvasTex(256,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,cols[0]);g.addColorStop(.32,cols[1]);g.addColorStop(.49,cols[2]);g.addColorStop(.56,cols[3]);g.addColorStop(1,cols[2]);x.fillStyle=g;x.fillRect(0,0,s,s);
  for(let i=0;i<120;i++){const cx=Math.random()*s,cy=s*.25+Math.random()*s*.25,r=6+Math.random()*22,gg=x.createRadialGradient(cx,cy,0,cx,cy,r);gg.addColorStop(0,'rgba(255,255,255,.18)');gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}}));}
function rlLoad(key){
  const R=REALMS[key]; if(RL.cache[key])return Promise.resolve(RL.cache[key]);
  return new Promise(res=>new THREE.GLTFLoader().load('realm/'+R.file+'.glb?v=1',g=>{
    const k=ISLAND_K, fr=R.r*k, root=new THREE.Group(), model=g.scene;
    model.scale.setScalar(k); model.position.y=-R.floor*k;
    // ปรับลานกลางให้เรียบ (ตัวละครยืนที่ y=0 เสมอ)
    model.traverse(o=>{if(o.isMesh&&o.geometry){const P=o.geometry.attributes.position;let ch=0;
      for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),rr=Math.hypot(x,z);
        if(rr<R.flat&&y>R.floor-.03&&y<R.floor+.07){const t=Math.min(1,Math.max(0,(rr-R.flat*.9)/(R.flat*.1)));const e=t*t*(3-2*t);P.setY(i,R.floor+(y-R.floor)*e);ch++;}}
      if(ch){P.needsUpdate=true;o.geometry.computeVertexNormals();}}});
    model.traverse(o=>{if(o.isMesh){o.receiveShadow=!LOW;o.castShadow=false;const m=o.material;if(m){m.metalness=0;m.roughness=.85;if(m.map)m.map.anisotropy=4;}}});
    root.add(model);
    root.add(new THREE.Mesh(new THREE.SphereGeometry(430,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,map:rlSkyTex(R.sky)})));
    if(key==='undead'){const pl=new THREE.PointLight(0xff5a20,1.4,90);pl.position.set(0,-12,0);root.add(pl);}
    RL.cache[key]={root,fr}; res(RL.cache[key]);
  },undefined,()=>{console.warn('realm load failed',key);res(null);}));
}
// สลับสนาม (null = นครหอคอยคู่เดิม)
async function useRealm(key){
  if(key===RL.key)return;
  let C=null; if(key){C=await rlLoad(key);if(!C)key=null;}
  if(RL.root){scene.remove(RL.root);RL.root=null;}
  RL.ups=[]; RL.key=key; const R=key?REALMS[key]:null;
  MAP_OBJS.forEach(o=>o.visible=!R);
  if(RL.exp0==null)RL.exp0=renderer.toneMappingExposure; renderer.toneMappingExposure=R?RL.exp0*(R.exp||1):RL.exp0;
  if(typeof BT_ZMAX!=='undefined')BT_ZMAX=R?82:75;
  if(!R){scene.background=RL.classic.bg;scene.fog=RL.classic.fog;RL.hemi.intensity=0;RL.fr=99;if(typeof sun!=='undefined'){sun.color.set(0xffb676);sun.intensity=2.4;}return;}
  // ของตกแต่งที่ขยับได้ สร้างใหม่ทุกครั้งที่เข้าดินแดน (ผูกกับ root ชั่วคราว)
  if(C.deco){C.root.remove(C.deco);}
  C.deco=new THREE.Group(); C.root.add(C.deco); RL.fr=C.fr;
rlDecor(key,C.deco,C.fr);
  if(R.under!=null)rlUnder(C.deco,.49*ISLAND_K,-R.floor*ISLAND_K+.2,R.under,key==='undead'?0x5a1400:null);
  rlClouds(C.deco,R.cloud,key==='undead');
  RL.root=C.root; scene.add(RL.root); RL.amb=3;
  scene.background=new THREE.Color(R.fog); scene.fog=new THREE.Fog(R.fog,150,520);
  RL.hemi.color.set(R.hemi[0]);RL.hemi.groundColor.set(R.hemi[1]);RL.hemi.intensity=R.hemi[2]*.25;
  if(typeof sun!=='undefined'){sun.color.set(R.sunC);sun.intensity=R.sunI*.62;}
}
const realmName=k=>k&&REALMS[k]?REALMS[k].name:'หน้าประตูนครอัมพร';
// จุดเกิดศัตรูบนเกาะ (ลานเล็กกว่าสนามเดิม)
const realmSpawnX=(row,dx)=>{if(!RL.key)return null;const fr=RL.fr;return Math.min(fr*.9,fr*.62+row*1.9+dx);};
// สกิลดินแดน: ทำงานกับฝั่งผู้บุกรุก (visitor) หรือช่วยฝั่งเจ้าบ้าน (home)
function realmSkillOn(on,home){RL.skillOn=!!on&&!!RL.key;RL.home=home||'E';RL.next=6;
  if(RL.skillOn){const S=REALMS[RL.key].skill;setTimeout(()=>{if(RL.skillOn&&typeof popNum==='function'){const t=alive(RL.home==='E'?'P':'E')[0];if(t)popNum(t,S.icon+' ดินแดนศัตรู: '+S.name,'info');}},1600);}}
function rlHurt(u,frac){if(!u.alive)return;const d=Math.max(1,Math.round(u.maxHp*frac));u.hp=Math.max(0,u.hp-d);popNum(u,d,'dmg');updateBar(u);
  if(u.hp<=0){if(u.pas&&u.pas.revive&&!u.revived){u.revived=true;u.hp=Math.round(u.maxHp*u.pas.revive);popNum(u,'เก้าชีวิต! +'+u.hp,'heal');updateBar(u);}else die(u);}}
function rlBeam(p,color,h,quiet){const g=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,h||40,16,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  g.position.copy(p).setY((h||40)/2);scene.add(g);tween(.7,k=>{g.scale.set(1-k*.8,1,1-k*.8);g.material.opacity=.85*(1-k);}).then(()=>{scene.remove(g);g.geometry.dispose();});
  shockRing(p.clone().setY(.06),color);glow(scene,color,6,[p.x,1,p.z],.9);if(quiet)particles(p.clone().setY(.4),0x9ff0ff,10,3.5,.1,1);}
function realmFire(){
  const R=REALMS[RL.key], vis=alive(RL.home==='E'?'P':'E'), home=alive(RL.home); if(!vis.length)return;
  const pick=n=>[...vis].sort(()=>Math.random()-.5).slice(0,n);
  popNum(home[0]||vis[0],R.skill.icon+' '+R.skill.name,'info');
  if(RL.key==='human')pick(1).forEach(u=>{rlBeam(u.w.position,0x56dfff,50);particles(u.w.position.clone().setY(.4),0x9ff0ff,14,4,.12,1);rlHurt(u,.06);shake=Math.max(shake,.12);});
  else if(RL.key==='god')pick(1).forEach(u=>{rlBeam(u.w.position,0xffd86a,60);particles(u.w.position.clone().setY(.4),0xfff0b0,16,4,.12,1);rlHurt(u,.05);shake=Math.max(shake,.1);});
  else if(RL.key==='undead')pick(2).forEach(u=>{const p=u.w.position.clone();rlErupt(p,{c:0xff3a10,lava:true,r:1.6}).then(()=>{if(u.alive)rlHurt(u,.04);shake=Math.max(shake,.1);});});
  else if(RL.key==='beast')home.forEach(u=>{const h=Math.round(u.maxHp*.04);u.hp=Math.min(u.maxHp,u.hp+h);popNum(u,'+'+h,'heal');updateBar(u);particles(u.w.position.clone().setY(.3),0x9dff8a,10,1.6,.12,-.6);shockRing(u.w.position.clone().setY(.06),0x7dff7a);});
}
function realmTick(dt){
  RL_TIME.value+=dt; RL.T+=dt;
  if(RL.key){for(const f of RL.ups)f(dt,RL.T);
    RL.amb-=dt;if(RL.amb<=0){RL.amb=5;try{realmAmbient();}catch(e){console.warn(e);}}}
  if(!RL.skillOn||!RL.key||typeof running==='undefined'||!running)return;
  RL.next-=dt; if(RL.next<=0){RL.next=10;try{realmFire();}catch(e){console.warn(e);}}
}
