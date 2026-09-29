/* ================= ดินแดนสี่เผ่า (สนามรบประจำเผ่า) =================
   โมเดลสนามจาก Tripo (ลดเหลือ ~9 หมื่นสามเหลี่ยม/ฉาก) อยู่ที่ realm/<file>.glb
   ใช้ตอน: ด่านทั่วไปวนดินแดนตามบท (บท 1 = นครหอคอยคู่เดิม, บท 2+ = มนุษย์ → กึ่งมนุษย์ → อันเดด → เทพเจ้า)
           ด่านบอส = สู้ในดินแดนของศัตรู โดนสกิลดินแดน (ฝั่งเจ้าบ้าน = ศัตรู)
           PVP ในอนาคต: ผู้บุกไปสู้ในดินแดนของผู้ป้องกัน (เผ่าของผู้ป้องกัน) และโดนสกิลดินแดนของเขา
   ทดสอบ: battle.html?realm=human|undead|beast|god  (&realmfx=1 เปิดสกิลดินแดนทุกด่าน) */
const REALMS={
  human:{name:'มหานครอัมพร',file:'human',floor:.0913,r:.30,flat:.29,exp:.95,
    sky:['#0d1a2b','#23405e','#6c8fb0','#c9d8e6'],fog:0x3d5670,fogN:120,fogF:420,hemi:[0xcfe2ff,0x3a3f4a,.9],sunC:0xfff1dc,sunI:2.1,
    base:0x3a3d44,skill:{name:'ปืนพิทักษ์นคร',icon:'🏙️',desc:'ทุก 10 วินาที ป้อมปืนเมืองยิงลำแสงใส่ผู้บุกรุก 1 ตัว (6% HP สูงสุด)'}},
  beast:{name:'หุบเขาพงไพร',file:'forest',floor:.1939,r:.22,flat:.215,exp:1,
    sky:['#2d6c8f','#5ba7c8','#bfe3d8','#e9f4dd'],fog:0x8fb9a8,fogN:120,fogF:430,hemi:[0xe8ffe0,0x3c4a2a,1],sunC:0xfff4d6,sunI:2.3,
    base:0x3f5a2c,skill:{name:'พรแห่งพงไพร',icon:'🌿',desc:'ทุก 10 วินาที ป่าฟื้นพลังให้เจ้าบ้านทุกตัว (4% HP สูงสุด)'}},
  undead:{name:'สมรภูมิยมโลก',file:'undead',floor:.1749,r:.27,flat:.26,exp:1.05,
    sky:['#07030a','#240a10','#5a1a12','#a8401a'],fog:0x2a0e0c,fogN:90,fogF:380,hemi:[0xffb09a,0x1a0808,.75],sunC:0xff9a6a,sunI:1.9,
    base:0x1a0c08,lava:true,skill:{name:'ลาวาปะทุ',icon:'🌋',desc:'ทุก 10 วินาที ลาวาพุ่งใต้เท้าผู้บุกรุก 2 ตัว (ตัวละ 4% HP สูงสุด)'}},
  god:{name:'วิหารแดนสวรรค์',file:'gods',floor:.345,r:.22,flat:.22,exp:.8,
    sky:['#3c7fc4','#79b4e6','#cfe6f7','#fdf8ec'],fog:0xcfe2f2,fogN:140,fogF:520,hemi:[0xffffff,0x8aa0b8,1.05],sunC:0xfff6e0,sunI:2.4,
    base:null,clouds:true,skill:{name:'แสงพิพากษา',icon:'✨',desc:'ทุก 10 วินาที เสาแสงทองฟาดผู้บุกรุก 1 ตัว (5% HP สูงสุด)'}},
};
const REALM_R=30;                 // รัศมีลานสนาม (หน่วยเกม) — ศัตรูเกิดที่ x≈21–31
const REALM_CHAPTER=['human','beast','undead','god'];
// ดินแดนของด่าน n: บทแรกใช้นครหอคอยคู่เดิม จากนั้นวนสี่ดินแดน
const realmFor=n=>{const q=(location.search.match(/[?&]realm=(\w+)/)||[])[1];if(q&&REALMS[q])return q;if(q==='none')return null;
  const ch=Math.floor((Math.max(1,n)-1)/10);return ch<1?null:REALM_CHAPTER[(ch-1)%REALM_CHAPTER.length];};
var MAP_OBJS=scene.children.slice(MAP0).filter(o=>!o.isLight);
var RL={key:null,cache:{},root:null,fx:null,T:0,next:6,skillOn:false,home:'E',loading:null,
  classic:{bg:scene.background,fog:scene.fog},hemi:new THREE.HemisphereLight(0xffffff,0x444444,0)};
scene.add(RL.hemi);
const RL_TIME={value:0};
const rlVert='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const rlLava=()=>new THREE.ShaderMaterial({uniforms:{uTime:RL_TIME},vertexShader:rlVert,fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){vec2 p=vUv*11.0;float t=uTime*.5;float f=sin(p.x*2.4+t*1.8+sin(p.y*2.0-t))*sin(p.y*2.7-t*2.1+sin(p.x*1.7+t));float v=smoothstep(-.1,.45,f+sin((p.x+p.y)*1.9-t*3.0)*.25);vec3 c=mix(vec3(.9,.12,.01),vec3(1.,.68,.04),v);gl_FragColor=vec4(c,.08+.55*v);}',transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false});
const rlLavaSea=()=>new THREE.ShaderMaterial({uniforms:{uTime:RL_TIME},vertexShader:rlVert,fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){vec2 p=vUv*60.0;float t=uTime*.25;float f=sin(p.x*1.3+t*1.7+sin(p.y*1.1-t))*sin(p.y*1.5-t*1.9+sin(p.x*.9+t));float v=smoothstep(.1,.8,f*.5+.5);float d=length(vUv-.5)*2.0;vec3 c=mix(vec3(.18,.02,0.),vec3(1.,.42,.05),v*v);c=mix(c,vec3(.12,.03,.02),smoothstep(.55,1.0,d));gl_FragColor=vec4(c,1.0);}',fog:false});
function rlSkyTex(cols){return srgb(canvasTex(256,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,cols[0]);g.addColorStop(.32,cols[1]);g.addColorStop(.49,cols[2]);g.addColorStop(.56,cols[3]);g.addColorStop(1,cols[2]);x.fillStyle=g;x.fillRect(0,0,s,s);
  for(let i=0;i<120;i++){const cx=Math.random()*s,cy=s*.25+Math.random()*s*.25,r=6+Math.random()*22,gg=x.createRadialGradient(cx,cy,0,cx,cy,r);gg.addColorStop(0,'rgba(255,255,255,.18)');gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}}));}
function rlLoad(key){
  const R=REALMS[key]; if(RL.cache[key])return Promise.resolve(RL.cache[key]);
  return new Promise(res=>new THREE.GLTFLoader().load('realm/'+R.file+'.glb?v=1',g=>{
    const k=REALM_R/R.r, root=new THREE.Group(), model=g.scene;
    model.scale.setScalar(k); model.position.y=-R.floor*k;
    // ปรับลานกลางให้เรียบ (ตัวละครยืนที่ y=0 เสมอ)
    model.traverse(o=>{if(o.isMesh&&o.geometry){const P=o.geometry.attributes.position;let ch=0;
      for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),rr=Math.hypot(x,z);
        if(rr<R.flat&&y>R.floor-.03&&y<R.floor+.07){const t=Math.min(1,Math.max(0,(rr-R.flat*.9)/(R.flat*.1)));const e=t*t*(3-2*t);P.setY(i,R.floor+(y-R.floor)*e);ch++;}}
      if(ch){P.needsUpdate=true;o.geometry.computeVertexNormals();}}});
    model.traverse(o=>{if(o.isMesh){o.receiveShadow=!LOW;o.castShadow=false;const m=o.material;if(m){m.metalness=0;m.roughness=.85;if(m.map)m.map.anisotropy=4;}}});
    root.add(model);
    const sky=new THREE.Mesh(new THREE.SphereGeometry(430,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,map:rlSkyTex(R.sky)}));root.add(sky);
    const bottom=-R.floor*k;
    if(R.lava){const sea=new THREE.Mesh(new THREE.CircleGeometry(380,64),rlLavaSea());sea.rotation.x=-Math.PI/2;sea.position.y=bottom+1.2;root.add(sea);
      const ring=new THREE.Mesh(new THREE.RingGeometry(.3*k,.355*k,96,3),rlLava());ring.rotation.x=-Math.PI/2;ring.position.y=-.004*k;root.add(ring);
      root.add(new THREE.PointLight(0xff5a20,1.2,160));}
    else if(R.base!=null){const gnd=new THREE.Mesh(new THREE.CircleGeometry(400,48),new THREE.MeshStandardMaterial({color:R.base,roughness:1}));gnd.rotation.x=-Math.PI/2;gnd.position.y=bottom+.3;root.add(gnd);}
    if(R.clouds){const ct=srgb(canvasTex(256,(x,s)=>{for(let i=0;i<70;i++){const cx=Math.random()*s,cy=Math.random()*s,r=14+Math.random()*40,gg=x.createRadialGradient(cx,cy,0,cx,cy,r);gg.addColorStop(0,'rgba(255,255,255,.85)');gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}}));
      ct.wrapS=ct.wrapT=THREE.RepeatWrapping;ct.repeat.set(6,6);
      for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshBasicMaterial({map:ct,transparent:true,opacity:.75-i*.15,depthWrite:false,fog:false}));c.rotation.x=-Math.PI/2;c.position.y=bottom-14-i*16;c.userData.drift=.6+i*.4;root.add(c);}}
    if(key==='human')[-1,1].forEach(s=>{const m=new THREE.Mesh(new THREE.RingGeometry(5.8/110*k,6.4/110*k,64),new THREE.MeshBasicMaterial({color:0x56dfff,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(s*22/110*k,.05,s*-2/110*k);m.userData.pulse=1;root.add(m);});
    RL.cache[key]=root; res(root);
  },undefined,()=>{console.warn('realm load failed',key);res(null);}));
}
// สลับสนาม (null = นครหอคอยคู่เดิม)
async function useRealm(key){
  if(key===RL.key&&!RL.loading)return;
  if(key){const root=await rlLoad(key);if(!root)key=null;}
  if(RL.root){scene.remove(RL.root);RL.root=null;}
  RL.key=key; const R=key?REALMS[key]:null;
  MAP_OBJS.forEach(o=>o.visible=!R);
  if(RL.exp0==null)RL.exp0=renderer.toneMappingExposure; renderer.toneMappingExposure=R?RL.exp0*(R.exp||1):RL.exp0;
  if(!R){scene.background=RL.classic.bg;scene.fog=RL.classic.fog;RL.hemi.intensity=0;if(typeof sun!=='undefined'){sun.color.set(0xffb676);sun.intensity=2.4;}return;}
  RL.root=RL.cache[key]; scene.add(RL.root);
  scene.background=new THREE.Color(R.fog); scene.fog=new THREE.Fog(R.fog,R.fogN,R.fogF);
  RL.hemi.color.set(R.hemi[0]);RL.hemi.groundColor.set(R.hemi[1]);RL.hemi.intensity=R.hemi[2]*.25;
  if(typeof sun!=='undefined'){sun.color.set(R.sunC);sun.intensity=R.sunI*.62;}
}
const realmName=k=>k&&REALMS[k]?REALMS[k].name:'หน้าประตูนครอัมพร';
// สกิลดินแดน: ทำงานกับฝั่งผู้บุกรุก (visitor) หรือช่วยฝั่งเจ้าบ้าน (home)
function realmSkillOn(on,home){RL.skillOn=!!on&&!!RL.key;RL.home=home||'E';RL.next=6;
  if(RL.skillOn){const S=REALMS[RL.key].skill;setTimeout(()=>{if(RL.skillOn&&typeof popNum==='function'){const t=alive(RL.home==='E'?'P':'E')[0];if(t)popNum(t,S.icon+' ดินแดนศัตรู: '+S.name,'info');}},1600);}}
function rlHurt(u,frac){if(!u.alive)return;const d=Math.max(1,Math.round(u.maxHp*frac));u.hp=Math.max(0,u.hp-d);popNum(u,d,'dmg');updateBar(u);
  if(u.hp<=0){if(u.pas&&u.pas.revive&&!u.revived){u.revived=true;u.hp=Math.round(u.maxHp*u.pas.revive);popNum(u,'เก้าชีวิต! +'+u.hp,'heal');updateBar(u);}else die(u);}}
function rlBeam(p,color,h){const g=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,h||40,16,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  g.position.copy(p).setY((h||40)/2);scene.add(g);tween(.7,k=>{g.scale.set(1-k*.8,1,1-k*.8);g.material.opacity=.85*(1-k);}).then(()=>{scene.remove(g);g.geometry.dispose();});
  shockRing(p.clone().setY(.06),color);glow(scene,color,6,[p.x,1,p.z],.9);}
function realmFire(){
  const R=REALMS[RL.key], vis=alive(RL.home==='E'?'P':'E'), home=alive(RL.home); if(!vis.length)return;
  const pick=n=>[...vis].sort(()=>Math.random()-.5).slice(0,n);
  popNum(home[0]||vis[0],R.skill.icon+' '+R.skill.name,'info');
  if(RL.key==='human')pick(1).forEach(u=>{rlBeam(u.w.position,0x56dfff,50);particles(u.w.position.clone().setY(.4),0x9ff0ff,14,4,.12,1);rlHurt(u,.06);shake=Math.max(shake,.12);});
  else if(RL.key==='god')pick(1).forEach(u=>{rlBeam(u.w.position,0xffd86a,60);particles(u.w.position.clone().setY(.4),0xfff0b0,16,4,.12,1);rlHurt(u,.05);shake=Math.max(shake,.1);});
  else if(RL.key==='undead')pick(2).forEach((u,i)=>{const p=u.w.position.clone();const warn=new THREE.Mesh(new THREE.CircleGeometry(1.6,32),new THREE.MeshBasicMaterial({color:0xff3a10,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
    warn.rotation.x=-Math.PI/2;warn.position.copy(p).setY(.05);scene.add(warn);
    tween(.8,k=>{warn.material.opacity=.7*Math.sin(k*Math.PI*3)**2;}).then(()=>{scene.remove(warn);
      for(let j=0;j<10;j++){const a=Math.random()*6.28,s=1+Math.random()*2.5;fireSprite(p.clone().setY(.3),new THREE.Vector3(Math.cos(a)*s,5+Math.random()*6,Math.sin(a)*s),.7+Math.random()*.4,1.4+Math.random(),{grav:-4,grow:2.5});}
      shockRing(p.clone().setY(.06),0xff6a20);scorch(p,1.6);if(u.alive)rlHurt(u,.04);shake=Math.max(shake,.1);});});
  else if(RL.key==='beast')home.forEach(u=>{const h=Math.round(u.maxHp*.04);u.hp=Math.min(u.maxHp,u.hp+h);popNum(u,'+'+h,'heal');updateBar(u);particles(u.w.position.clone().setY(.3),0x9dff8a,10,1.6,.12,-.6);shockRing(u.w.position.clone().setY(.06),0x7dff7a);});
}
function realmTick(dt){
  RL_TIME.value+=dt; RL.T+=dt;
  if(RL.root)RL.root.traverse(o=>{if(o.userData.pulse)o.material.opacity=.35+.22*Math.sin(RL.T*1.7+o.position.x);if(o.userData.drift&&o.material.map)o.material.map.offset.x+=dt*.002*o.userData.drift;});
  if(!RL.skillOn||!RL.key||typeof running==='undefined'||!running)return;
  RL.next-=dt; if(RL.next<=0){RL.next=10;try{realmFire();}catch(e){console.warn(e);}}
}
