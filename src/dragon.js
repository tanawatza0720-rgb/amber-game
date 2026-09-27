/* ================= อามาเทรุ มังกรอัมพรเพลิง (โมเดล Meshy + โครงกระดูกที่สร้างเอง) ================= */
let DRAGON=null;
const DRAGON_URL='drg/dragon.json';
function loadDragon(){
  return new Promise(res=>{
    if(!THREE.GLTFLoader){res(null);return;}
    new THREE.GLTFLoader().load(DRAGON_URL,g=>{
      let mesh=null; g.scene.updateMatrixWorld(true); g.scene.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});
      if(!mesh){res(null);return;}
      const geo=mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld);
      geo.computeBoundingBox(); const bb=geo.boundingBox, c=bb.getCenter(new THREE.Vector3()), sz=bb.getSize(new THREE.Vector3());
      // ย่อให้อยู่ในกรอบ -1..1 (หัว +z ปีก ±x ขึ้น +y)
      const s=2/Math.max(sz.x,sz.z); geo.translate(-c.x,-c.y,-c.z); geo.scale(s,s,s); geo.computeBoundingBox();
      const pos=geo.attributes.position, n=pos.count;
      const SI=new Uint16Array(n*4), SW=new Float32Array(n*4);
      const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
      // กระดูก: 0 ตัว,1 คอ,2 หัว,3 หาง1,4 หาง2,5 ปีกซ้าย1,6 ปีกซ้าย2,7 ปีกขวา1,8 ปีกขวา2
      for(let i=0;i<n;i++){
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ax=Math.abs(x);
        const w=[0,0,0,0,0,0,0,0,0];
        const wing=ss(.17,.32,ax)*ss(-.38,-.12,y);
        const tail=ss(-.12,-.34,z)*(1-wing), tail2=ss(-.45,-.7,z);
        const neck=ss(.28,.44,z)*(1-wing)*(1-ss(.1,.3,y)*ss(.15,.25,ax)), head=ss(.52,.66,z);
        const w2=ss(.42,.62,ax);
        let rest=1;
        if(wing>0){const a=x<0?5:7; w[a]+=wing*(1-w2); w[a+1]+=wing*w2; rest-=wing;}
        if(tail>0){w[3]+=tail*(1-tail2); w[4]+=tail*tail2; rest-=tail;}
        if(neck>0){w[1]+=neck*(1-head); w[2]+=neck*head; rest-=neck;}
        w[0]+=Math.max(0,rest);
        const idx=w.map((v,k)=>[v,k]).sort((a,b)=>b[0]-a[0]).slice(0,4); const sum=idx.reduce((a,b)=>a+b[0],0)||1;
        idx.forEach(([v,k],j)=>{SI[i*4+j]=k;SW[i*4+j]=v/sum;});
      }
      geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));
      geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
      const mat=mesh.material.clone(); mat.skinning=true; if(ENV){mat.envMap=ENV;mat.envMapIntensity=.5;}
      mat.emissive=new THREE.Color(0xff5a1a); mat.emissiveIntensity=.0; mat.emissiveMap=mat.map;
      DRAGON={geo,mat,minY:geo.boundingBox.min.y};
      res(DRAGON);
    },undefined,()=>res(null));
  });
}
function buildDragon(){
  const w=new THREE.Group(), m=new THREE.Group(); w.add(m);
  const hover=new THREE.Group(); m.add(hover);
  const B=[]; const mk=(p,x,y,z)=>{const b=new THREE.Bone();b.position.set(x,y,z);B.push(b);if(p)p.add(b);return b;};
  const body=mk(null,0,0,0), neck=mk(body,0,.02,.34), head=mk(neck,0,-.04,.26), tail1=mk(body,0,-.12,-.22), tail2=mk(tail1,0,-.14,-.36),
        wl1=mk(body,-.19,.14,.26), wl2=mk(wl1,-.36,.12,0), wr1=mk(body,.19,.14,.26), wr2=mk(wr1,.36,.12,0);
  const mesh=new THREE.SkinnedMesh(DRAGON.geo,DRAGON.mat.clone()); mesh.material.skinning=true;
  mesh.add(body); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(B)); mesh.castShadow=true; mesh.receiveShadow=true; mesh.frustumCulled=false;
  const S=1.5; hover.scale.setScalar(S); hover.add(mesh);
  const baseY=-DRAGON.minY*S; // ให้ตีนแตะพื้นเมื่อ hover=0
  m.userData.dragon=true; m.userData.mats=[mesh.material];
  // ท่าทาง (ควบคุมด้วยค่าเป้าหมาย + สปริงของระบบ rig เดิม)
  const st={fly:1,flapAmp:.55,flapSpd:1,rear:0,lunge:0,fold:0,breath:0,headDown:0,dead:0,spread:0,rise:0,jaw:0};
  const R={body,neck,head,tail1,tail2,wl1,wl2,wr1,wr2,st,tg:Object.assign({},st),rate:{}};
  m.userData.rig=R;
  { const g=glow(head,0xffa040,.7,[0,-.02,.22],0); g.material.opacity=0; m.userData.mouthGlow=g; }
  let ph=Math.random()*6, lastT=null;
  m.userData.idle=T=>{
    const dt=lastT==null?0:Math.min(.1,T-lastT); lastT=T; const gdt=dt*(typeof SPEED!=='undefined'?SPEED*HS:1);
    for(const k in R.tg){const r=R.rate[k]||4;st[k]+=(R.tg[k]-st[k])*Math.min(1,gdt*r*3.2);}
    ph+=gdt*(5.2*st.flapSpd);
    // จังหวะกระพือ: ตีลงเร็ว ยกขึ้นช้า
    const sp=ph+.45*Math.sin(ph), fl=Math.sin(sp), vel=Math.cos(sp);
    const amp=st.flapAmp*(1-st.fold), open=.12-st.fold*1.1+st.spread*.35;
    const up=Math.max(0,-vel); // ช่วงยกปีกขึ้น ปลายปีกพับ
    wl1.rotation.z=-(open+fl*amp); wr1.rotation.z=(open+fl*amp);
    const tip=Math.sin(sp-1.1)*amp*.8+up*amp*.5-st.fold*.9;
    wl2.rotation.z=-tip; wr2.rotation.z=tip;
    wl1.rotation.y=st.fold*.75-up*.12*amp; wr1.rotation.y=-st.fold*.75+up*.12*amp;
    wl2.rotation.y=st.fold*.5; wr2.rotation.y=-st.fold*.5;
    // ลำตัวยกขึ้นตอนตีปีกลง
    const lift=st.fly*(.9+(-Math.sin(sp-.6))*.14*st.flapAmp/.55)+st.rise;
    hover.position.y=baseY+lift*(1-st.dead);
    body.rotation.x=-st.rear*.55+st.lunge*.25+Math.sin(ph+1.4)*.03+st.dead*.25;
    neck.rotation.x=st.rear*.5-st.lunge*.35+st.headDown*.5+Math.sin(T*1.3)*.05;
    head.rotation.x=-st.rear*.3-st.lunge*.2+st.headDown*.3-st.jaw*.25;
    neck.rotation.y=Math.sin(T*.7)*.08;
    tail1.rotation.y=Math.sin(T*1.6)*.25; tail2.rotation.y=Math.sin(T*1.6-.8)*.35;
    tail1.rotation.x=.1+Math.sin(ph)*.06;
    // เปลวไฟในปาก/รอยแตกเรือง
    mesh.material.emissiveIntensity=.06+st.breath*.7*(.85+.15*Math.sin(T*18))+Math.max(0,Math.sin(T*2.3))*.04;
    if(m.userData.mouthGlow){m.userData.mouthGlow.material.opacity=st.breath*.95;m.userData.mouthGlow.scale.setScalar(.25+st.breath*.55*(1+.2*Math.sin(T*22)));}
  };
  // ปรับขนาดรวมให้ปีกกว้างพอดีสนาม
  w.userData.k=1; w.userData.inner=m;
  return w;
}
// จุดปากมังกรใน world space
function dragonMouth(u){const R=u.rig;R.head.updateMatrixWorld(true);return new THREE.Vector3(0,-.02,.24).applyMatrix4(R.head.matrixWorld);}
function dragonSet(u,o,d){const R=u.rig;Object.keys(o).forEach(key=>{R.tg[key]=o[key];R.rate[key]=1/Math.max(.05,d||.25);});}
function dragonDir(u){return new THREE.Vector3(Math.sin(u.w.rotation.y),0,Math.cos(u.w.rotation.y));}

/* ---------- เอฟเฟกต์ไฟ ---------- */
const FIRE_COL=[0xffd88a,0xffb030,0xff7a1a,0xd8380e,0x4a2014];
const FLAMETEX=canvasTex(64,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.85)');g.addColorStop(.7,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);});
function fireSprite(pos,vel,life,size,opts){
  opts=opts||{};
  const add=!opts.smoke&&Math.random()<.35;
  const m=new THREE.SpriteMaterial({map:FLAMETEX,color:0xffffff,transparent:true,opacity:1,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,fog:false});
  const s=new THREE.Sprite(m); s.position.copy(pos); s.scale.setScalar(size*.4); scene.add(s);
  const c=new THREE.Color(), p0=pos.clone(), g=opts.grav==null?.6:opts.grav, grow=opts.grow||2.6, rot=(Math.random()-.5)*2;
  return tween(life,k=>{
    s.position.copy(p0).addScaledVector(vel,k*life); s.position.y+=g*k*k*life;
    const sc=size*(.4+k*grow); s.scale.set(sc,sc,1); m.rotation+=rot*.02;
    if(opts.smoke){c.setHex(0x3a2e28);m.opacity=(1-k)*.35;}
    else{const f=Math.min(FIRE_COL.length-1.001,k*(FIRE_COL.length-1));const i=Math.floor(f);c.setHex(FIRE_COL[i]).lerp(new THREE.Color(FIRE_COL[i+1]),f-i);m.opacity=Math.min(.95,(1-k)*1.8)*(add?.8:1);}
    m.color.copy(c);
  },t=>t).then(()=>{scene.remove(s);m.dispose();});
}
function fireLight(pos,intensity,dur){const l=new THREE.PointLight(0xff8a3a,0,9,2);l.position.copy(pos);scene.add(l);
  return tween(dur,k=>{l.intensity=intensity*Math.sin(Math.min(1,k*1.4)*Math.PI*.5)*(1-k*k)*(.8+.2*Math.random());}).then(()=>scene.remove(l));}
function scorch(pos,r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,32),new THREE.MeshBasicMaterial({map:BLOBTEX,color:0x1a0c06,transparent:true,opacity:0,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.copy(pos).setY(.03);scene.add(m);
  tween(.25,k=>m.material.opacity=.55*k).then(()=>tween(2.4,k=>m.material.opacity=.55*(1-k))).then(()=>{scene.remove(m);m.geometry.dispose();m.material.dispose();});}
function embers(pos,n,spread){for(let i=0;i<n;i++){const v=new THREE.Vector3((Math.random()-.5)*spread,1+Math.random()*1.8,(Math.random()-.5)*spread);
  const p=pos.clone().add(new THREE.Vector3((Math.random()-.5)*spread*.5,0,(Math.random()-.5)*spread*.5));fireSprite(p,v,.8+Math.random()*.6,.12,{grav:-.2,grow:.3});}}
function clawSlash(pos,dir,col){const rot=Math.atan2(dir.x,dir.z);for(let i=0;i<3;i++){const p=pos.clone().add(new THREE.Vector3(0,(i-1)*.28,0));hitArc(p,-.9+rot*0+i*.05,col,1.1+i*.12);}}
function chargeIn(u,dur){const t0=performance.now();let alive=true;
  (async()=>{while(alive){const mo=dragonMouth(u);const d=new THREE.Vector3((Math.random()-.5),(Math.random()-.3),(Math.random()-.5)).normalize().multiplyScalar(1.4);
    fireSprite(mo.clone().add(d),d.clone().multiplyScalar(-1/.35),.35,.3,{grav:0,grow:.1});await wait(30);}})();
  return wait(dur).then(()=>{alive=false;});}

/* ---------- การเคลื่อนที่ ---------- */
async function dragonFly(u,to,dur,h){
  const from=u.w.position.clone(); faceTo(u,to,.2);
  dragonSet(u,{flapSpd:1.9,flapAmp:.75,lunge:.35},.15);
  particles(tmpV.copy(from).setY(.1),0xb8a888,14,1.6,.3,-.2,.45);
  await tween(dur,t=>{u.w.position.lerpVectors(from,to,t);u.w.position.y=Math.sin(t*Math.PI)*h;},easeIO);
  u.w.position.y=0; dragonSet(u,{flapSpd:1,flapAmp:.55,lunge:0},.3);
  particles(tmpV.copy(to).setY(.1),0xb8a888,10,1.2,.26,-.2,.4);
}

/* ---------- กรงเล็บเพลิง: ง้าง - พุ่งงับ - ตะปบ ---------- */
async function dragonBite(u,t,onHit){
  const dir=dragonDir(u), home=u.w.position.clone();
  // ง้าง: ยืดตัวขึ้น กางปีกค้าง หัวเงย
  dragonSet(u,{rear:1,spread:1,flapAmp:.25,flapSpd:.6,rise:.35,jaw:1},.22); await wait(300);
  // พุ่ง
  dragonSet(u,{rear:0,lunge:1,spread:.3,flapAmp:.9,flapSpd:2.2,rise:0,jaw:0},.08);
  await tween(.12,k=>u.w.position.copy(home).addScaledVector(dir,.7*k),easeIn);
  const hp=dragonMouth(u);
  clawSlash(hp.clone().addScaledVector(dir,.2),dir,0xffb050);
  for(let i=0;i<14;i++)fireSprite(hp,new THREE.Vector3((Math.random()-.5)*3,Math.random()*2,(Math.random()-.5)*3),.35,.18);
  fireLight(hp,5,.35);
  onHit(); hitStop(); shake=Math.max(shake,.18);
  await wait(160);
  // ถอยกลับ ตีปีกแรง
  dragonSet(u,{lunge:0,flapAmp:.6,flapSpd:1.2},.25);
  await tween(.3,k=>u.w.position.copy(home).addScaledVector(dir,.7*(1-k)),easeOut);
  dragonSet(u,{spread:0,flapSpd:1,flapAmp:.55},.3); await wait(120);
}

/* ---------- ลมหายใจอัมพร: ชาร์จ - พ่นเป็นกรวยไฟต่อเนื่อง ---------- */
async function dragonBreath(u,foes,onHit){
  const c=new THREE.Vector3();foes.forEach(f=>c.add(f.w.position));c.divideScalar(foes.length);
  // ชาร์จ: ยกตัว กางปีก ไฟในตัวสว่างขึ้น ประกายไฟถูกดูดเข้าปาก
  dragonSet(u,{rear:1,spread:1,rise:.2,breath:1,flapAmp:.35,flapSpd:.8,jaw:.6},.35);
  const ml=new THREE.PointLight(0xff9a40,0,6,2); scene.add(ml);
  const follow=()=>ml.position.copy(dragonMouth(u));
  await Promise.all([chargeIn(u,620),tween(.62,k=>{follow();ml.intensity=k*3;})]);
  // พ่น: หัวก้มลงกวาดจากซ้ายไปขวา
  dragonSet(u,{rear:.15,lunge:.7,headDown:.45,rise:0,jaw:1,flapSpd:1.6,flapAmp:.6},.12);
  shake=Math.max(shake,.1);
  const N=46, dur=1100; let hit=false;
  for(let i=0;i<N;i++){
    const k=i/N, mo=dragonMouth(u); follow(); ml.intensity=4+Math.random()*2;
    const sweep=(k-.5)*2.2, tgt=c.clone().add(new THREE.Vector3(0,.4,sweep)), d=tgt.sub(mo), L=d.length(); d.normalize();
    for(let j=0;j<5;j++){const v=d.clone().multiplyScalar(L/(.5+Math.random()*.15)).add(new THREE.Vector3((Math.random()-.5)*2.2,(Math.random()-.3)*1.4,(Math.random()-.5)*2.2));
      fireSprite(mo,v,.55+Math.random()*.2,.45+Math.random()*.35,{grav:1.1,grow:4.2});}
    fireSprite(mo,d.clone().multiplyScalar(L/.35),.35,.35,{grav:0,grow:1.2});
    if(i%3===0)fireSprite(mo.clone().addScaledVector(d,L*.8),new THREE.Vector3(0,1.2,0),1.1,.6,{smoke:true,grav:.3,grow:2});
    if(!hit&&k>.4){hit=true;foes.forEach(f=>{scorch(f.w.position,1.1);embers(f.w.position.clone().setY(.3),10,1.2);fireLight(f.w.position.clone().setY(1),4,.8);});onHit();shake=Math.max(shake,.2);}
    await wait(dur/N);
  }
  foes.forEach(f=>embers(f.w.position.clone().setY(.2),8,1.4));
  dragonSet(u,{rear:0,lunge:0,headDown:0,breath:0,spread:0,rise:0,jaw:0,flapSpd:1,flapAmp:.55},.45);
  tween(.4,k=>ml.intensity*=1-k).then(()=>scene.remove(ml));
  await wait(420);
}

/* ---------- ดิ่งฟ้าถล่ม: ทะยานขึ้น - หุบปีกดิ่ง - ระเบิดไฟ ---------- */
async function dragonDive(u,c,foes,onHit){
  const from=u.w.position.clone(), dir=c.clone().sub(from).setY(0).normalize(); faceTo(u,c,.2);
  // ทะยาน: ตีปีกแรง ฝุ่นฟุ้ง
  dragonSet(u,{flapSpd:2.6,flapAmp:.95,rear:.6,spread:.5},.15);
  smoke(tmpV.copy(from).setY(.2)); particles(tmpV.copy(from).setY(.1),0xb8a888,26,2.4,.35,-.2,.5);
  const apex=from.clone().lerp(c,.45).setY(5.5);
  await tween(.6,t=>{u.w.position.lerpVectors(from,apex,t);u.w.position.y=apex.y*Math.sin(t*Math.PI*.5);},easeOut);
  // ค้างกลางฟ้า หุบปีก ตัวลุกเป็นไฟ
  dragonSet(u,{fold:.9,lunge:1,rear:0,breath:1,flapAmp:.15,spread:0},.18);
  await tween(.22,k=>{u.w.position.y=apex.y+.3*Math.sin(k*Math.PI);});
  // ดิ่ง พร้อมหางไฟ
  const top=u.w.position.clone(); let trail=true;
  (async()=>{while(trail){fireSprite(u.w.position.clone().setY(u.w.position.y+1.2),new THREE.Vector3(0,1.5,0),.4,.45,{grav:0,grow:1.5});await wait(28);}})();
  await tween(.3,t=>{u.w.position.lerpVectors(top,c,t);u.w.position.y=top.y*(1-t);},easeIn);
  trail=false; u.w.position.y=0;
  // กระแทก
  dragonSet(u,{fold:0,lunge:.3,spread:1,flapAmp:1,flapSpd:1.4,breath:.4},.12);
  hitStop(); shake=.35;
  shockRing(c,0xffc070); setTimeout(()=>shockRing(c,0xff5a20),90/SPEED);
  fireLight(c.clone().setY(1.2),9,.9); scorch(c,2.2);
  for(let i=0;i<55;i++){const a=Math.random()*Math.PI*2,r=Math.random();fireSprite(c.clone().setY(.3),new THREE.Vector3(Math.cos(a)*(2+r*4),1.5+Math.random()*4,Math.sin(a)*(2+r*4)),.8,.7+Math.random()*.4,{grav:-2.5,grow:3});}
  for(let i=0;i<14;i++)fireSprite(c.clone().setY(.2),new THREE.Vector3((Math.random()-.5)*.8,3+Math.random()*3,(Math.random()-.5)*.8),.7,.9,{grav:-1,grow:2.4});
  for(let i=0;i<10;i++)fireSprite(c.clone().setY(.4),new THREE.Vector3((Math.random()-.5)*1.5,2.5+Math.random()*2,(Math.random()-.5)*1.5),1.4,.9,{smoke:true,grav:.4,grow:2.5});
  particles(tmpV.copy(c).setY(.1),0xb8a888,30,2.6,.35,-.2,.55);
  onHit();
  foes.forEach(f=>embers(f.w.position.clone().setY(.2),8,1.2));
  await wait(520); dragonSet(u,{lunge:0,spread:0,breath:0,flapAmp:.55,flapSpd:1},.4);
}
function dragonReact(u){dragonSet(u,{rear:.7,spread:.6,flapSpd:2},.06);setTimeout(()=>dragonSet(u,{rear:0,spread:0,flapSpd:1},.35),160/SPEED);}
async function dragonDie(u){
  dragonSet(u,{flapSpd:2.8,flapAmp:1,rear:.8,spread:1},.1); await wait(260);
  dragonSet(u,{fold:1,dead:1,flapAmp:.1,rear:0,spread:0,breath:0},.5); await wait(520); shake=Math.max(shake,.18);
  particles(tmpV.copy(u.w.position).setY(.3),0xb8b0a0,28,1.8,.32,-.3,.5); embers(u.w.position.clone(),12,1.6);
}
