/* ================= เกาะโคลอสเซียม (ทางเข้าสงครามแห่งการช่วงชิง) — ฉากฟาร์ม ฝั่งตะวันตก =================
   โมเดล war/colosseum.glb (Tripo) · ถ้ายังไม่มีไฟล์จะเป็นเกาะหินเปล่า · ไฟสงคราม (สไปรต์เรือง) + สะเก็ดไฟ + ควันลอยขึ้น
   แตะเกาะ → openWar() (farm_war.js) · อัปเดตใน worldTick → colTick */
const COL=(()=>{
  const LOWF=matchMedia('(pointer:coarse)').matches, g=new THREE.Group(); g.position.set(-41,1.5,6); g.rotation.y=.5; scene.add(g);
  // กล่องรับการแตะ (มองไม่เห็น)
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(9,6,12,12),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=1;hit.userData.war=1;g.add(hit);PICK.push(hit);
  const fires=[],smokes=[],FIRE=[[-4,4.2,2],[3,3.6,-3],[5,5.2,2.5],[-2,2.6,-4.5],[0,4.8,4.5]];
  function addFx(top){
    FIRE.forEach(([x,y,z],i)=>{const f=glow(g,i%2?0xff6a1a:0xffa030,4.2,[x,y*top,z],.95);f.userData.b=[f.scale.x,Math.random()*6];fires.push(f);});
    const n=LOWF?4:7;
    for(let i=0;i<n;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:FT.cloud,color:0x3a3430,transparent:true,opacity:0,depthWrite:false}));
      const p=FIRE[i%FIRE.length];s.userData.b=[p[0],p[1]*top,p[2],Math.random()];g.add(s);smokes.push(s);}
  }
  const load=()=>new Promise(res=>{try{new THREE.GLTFLoader().load('war/colosseum.glb',m=>res(m.scene),undefined,()=>res(null));}catch(e){res(null);}});
  load().then(m=>{
    let top=1;
    if(m){const b=new THREE.Box3().setFromObject(m),s=new THREE.Vector3();b.getSize(s);const k=18/Math.max(s.x,s.z);m.scale.setScalar(k);
      const b2=new THREE.Box3().setFromObject(m);m.position.y=-b2.min.y-s.y*k*.55;top=s.y*k*.45/5;
      m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.material&&o.material.map)o.material.map.anisotropy=4;}});g.add(m);}
    else{const rock=new THREE.Mesh(new THREE.ConeGeometry(8,9,9),new THREE.MeshStandardMaterial({color:0x9a8268,roughness:1}));rock.rotation.x=Math.PI;rock.position.y=-4.5;g.add(rock);
      const top2=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.6,18),new THREE.MeshStandardMaterial({color:0xc8a878,roughness:1}));g.add(top2);}
    addFx(Math.max(.6,top));
  });
  function tick(dt,T){
    fires.forEach(f=>{const [s,a]=f.userData.b;f.scale.setScalar(s*(.8+.25*Math.sin(T*9+a)+.12*Math.sin(T*23+a*2)));f.material.opacity=.7+.25*Math.sin(T*13+a);});
    smokes.forEach((s,i)=>{const [x,y,z,ph]=s.userData.b,k=(T*.18+ph)%1;s.position.set(x+Math.sin(T*.5+i)*.8*k,y+.5+k*7,z);s.scale.setScalar(2+k*5);s.material.opacity=.45*Math.sin(k*Math.PI);});
    if(!LOWF&&Math.random()<dt*4&&fires.length){const f=fires[Math.floor(Math.random()*fires.length)],p=new THREE.Vector3();f.getWorldPosition(p);particles(p,0xffb040,2,1.2,.08,-1.5,.9);}
  }
  return {g,tick};
})();
function colTick(dt,T){COL.tick(dt,T);}
