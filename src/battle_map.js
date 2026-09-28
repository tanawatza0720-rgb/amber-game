/* ================= แผนที่ใหญ่: หุบเขาป้อมอัมพร =================
   ฝั่งเรา = ป้อมกำแพงหินทางซ้าย (x ติดลบ)  ฝั่งศัตรู = ค่ายนินจาชาดทางขวา (x บวก)
   สนามรบกลางหุบ มีแม่น้ำด้านหลัง ภูเขาหินล้อมรอบ */
const BIG=true;
// เครื่องสเปกต่ำ (มือถือ): ปิดเงาจริง ใช้เงาวงกลมแทน, ลดความละเอียดจอ, ลดจำนวนศัตรู
const LOW=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||Math.min(screen.width,screen.height)<700||/[?&]low=1/.test(location.search);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,LOW?1:1.5));
if(LOW){renderer.shadowMap.enabled=false;} else {renderer.shadowMap.type=THREE.PCFShadowMap;}
const MAP0=scene.children.length;
const FXK=LOW?.35:.65; // ลดจำนวนประกายไฟ/ฝุ่น
const MAPK={road:14};
scene.background=new THREE.Color(0x9cb8d6);
const skyM=new THREE.Mesh(new THREE.SphereGeometry(420,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,
  map:srgb(canvasTex(16,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#4f79b8');g.addColorStop(.42,'#9cc0e6');g.addColorStop(.52,'#f0d7b0');g.addColorStop(1,'#c9b89a');x.fillStyle=g;x.fillRect(0,0,s,s);}))}));
scene.add(skyM);
scene.fog=new THREE.Fog(0xc8d4de,90,260);
scene.add(new THREE.HemisphereLight(0xe4efff,0x4d5a3a,.95));
const sun=new THREE.DirectionalLight(0xffe2b8,2.3); sun.position.set(40,60,25); sun.castShadow=true;
sun.shadow.mapSize.set(LOW?512:1536,LOW?512:1536); Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:180}); sun.shadow.bias=-.0006; sun.shadow.normalBias=.04; scene.add(sun); scene.add(sun.target);
const rimL=new THREE.DirectionalLight(0x9fb8ff,.5); rimL.position.set(-30,25,-40); scene.add(rimL);
// แสงอาทิตย์ตามกล้อง (เงาคมเฉพาะบริเวณที่มองอยู่)
function sunFollow(c){sun.position.set(c.x+40,60,c.z+25);sun.target.position.set(c.x,0,c.z);}
const falling=[], flies=[];
{
  const rnd=(a,b)=>a+Math.random()*(b-a);
  // พื้นหญ้า + ถนนดินกลางหุบ
  const grassT=srgb(canvasTex(512,(x,s)=>{x.fillStyle='#5f8a3e';x.fillRect(0,0,s,s);
    for(let i=0;i<60;i++){const cx=Math.random()*s,cy=Math.random()*s,r=20+Math.random()*90,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=Math.random()<.5?'120,155,70':'70,105,45';g.addColorStop(0,`rgba(${c},.45)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    for(let i=0;i<9000;i++){const h=78+Math.random()*40,l=24+Math.random()*28;x.fillStyle=`hsla(${h},45%,${l}%,.5)`;x.fillRect(Math.random()*s,Math.random()*s,1.5,3);}},[40,40]));
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(520,520),SM(0xffffff,{map:grassT,roughness:.97}));gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;scene.add(gr);
  const dirtT=srgb(canvasTex(512,(x,s)=>{x.clearRect(0,0,s,s);
    const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'rgba(150,120,80,0)');g.addColorStop(.18,'rgba(150,120,80,.9)');g.addColorStop(.82,'rgba(140,112,76,.9)');g.addColorStop(1,'rgba(140,112,76,0)');x.fillStyle=g;x.fillRect(0,0,s,s);
    for(let i=0;i<6000;i++){const y=s*.12+Math.random()*s*.76;x.fillStyle=`rgba(${90+Math.random()*70|0},${70+Math.random()*50|0},${45+Math.random()*30|0},.45)`;x.fillRect(Math.random()*s,y,2,2);}
    for(let i=0;i<30;i++){const cx=Math.random()*s,cy=s*(.2+Math.random()*.6),r=10+Math.random()*40,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(110,88,58,.35)');g.addColorStop(1,'rgba(110,88,58,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}},[6,1]));
  const road=new THREE.Mesh(new THREE.PlaneGeometry(110,MAPK.road*2.2),new THREE.MeshStandardMaterial({map:dirtT,transparent:true,roughness:1,depthWrite:false}));
  road.rotation.x=-Math.PI/2;road.position.set(2,.02,0);road.receiveShadow=true;road.renderOrder=-1;scene.add(road);
  // แม่น้ำด้านหลัง
  const waterT=canvasTex(256,(x,s)=>{x.fillStyle='#3d6f8f';x.fillRect(0,0,s,s);for(let i=0;i<300;i++){x.strokeStyle=`rgba(200,230,255,${.1+Math.random()*.25})`;x.lineWidth=1.5;x.beginPath();const y=Math.random()*s,xx=Math.random()*s;x.moveTo(xx,y);x.lineTo(xx+10+Math.random()*25,y);x.stroke();}},[18,2]);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(420,22),new THREE.MeshStandardMaterial({map:srgb(waterT),color:0x9fd0f0,roughness:.2,metalness:.1,transparent:true,opacity:.92}));
  water.rotation.x=-Math.PI/2;water.position.set(0,.05,-40);scene.add(water); MAPK.water=waterT;
  const bank=new THREE.Mesh(new THREE.PlaneGeometry(420,30),SM(0xb5a27a,{roughness:1}));bank.rotation.x=-Math.PI/2;bank.position.set(0,.03,-40);bank.receiveShadow=true;scene.add(bank);
  // ภูเขาหิน: ก้อนหินใหญ่รูปทรงเหลี่ยม
  const rockGeo=(()=>{const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);v.multiplyScalar(1+(Math.sin(v.x*5.1)+Math.sin(v.y*4.3+1)+Math.sin(v.z*6.2+2))*.07);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;})();
  const rockM=SM(0x8d8a86,{map:TX.stone,roughness:.95,flatShading:true}), rockD=SM(0x6f6c6a,{map:TX.stone,roughness:.95,flatShading:true});
  const rock=(x,z,sx,sy,sz,m)=>{const r=new THREE.Mesh(rockGeo,m||rockM);r.position.set(x,sy*.35,z);r.scale.set(sx,sy,sz);r.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.2,.2));r.castShadow=true;r.receiveShadow=true;scene.add(r);return r;};
  for(let i=0;i<46;i++){const a=i/46*Math.PI*2, R=rnd(95,125);rock(Math.cos(a)*R*1.25,Math.sin(a)*R,rnd(14,26),rnd(18,42),rnd(14,26),i%3?rockM:rockD);}
  // หน้าผาสองข้างหุบ (แบบภาพตัวอย่าง)
  [[-2,31],[14,34],[-18,33],[28,30],[6,-27],[-10,-26],[22,-26]].forEach(([x,z],i)=>{rock(x,z,rnd(5,8),rnd(5,9),rnd(4,6),i%2?rockM:rockD);rock(x+rnd(-4,4),z+Math.sign(z)*rnd(3,6),rnd(4,6),rnd(6,11),rnd(4,6));});
  for(let i=0;i<40;i++){const x=rnd(-60,60),z=(Math.random()<.5?-1:1)*rnd(15,34);if(Math.abs(z+40)<14)continue;rock(x,z,rnd(.6,1.6),rnd(.5,1.2),rnd(.6,1.6));}
  // ป้อมฝั่งเรา: กำแพงหิน ประตู หอคอย ธง
  const wallM=SM(0xb7ae9d,{map:TX.stone,roughness:.92}), roofM=SM(0x3d4f7a,{roughness:.6}), woodM=SM(0x7a5433,{map:TX.wood,roughness:.8}), flagM=new THREE.MeshStandardMaterial({color:0xffb347,side:THREE.DoubleSide,roughness:.7});
  const FX=-32;
  const tower=(x,z,h,r)=>{const g=J(scene,x,0,z);P(g,new THREE.CylinderGeometry(r,r*1.12,h,10),wallM,[0,h/2,0]);
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2;P(g,B1,wallM,[Math.cos(a)*r*.95,h+.5,Math.sin(a)*r*.95],[.8,1,.8]);}
    P(g,new THREE.ConeGeometry(r*1.25,h*.45,10),roofM,[0,h+1.8,0]);
    const pole=J(g,0,h+h*.45+1.5,0);P(pole,Y1,woodM,[0,1.2,0],[.12,2.4,.12]);const f=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.2),flagM);f.position.set(1.1,2,0);pole.add(f);MAPK.flags=(MAPK.flags||[]).concat(f);return g;};
  [[-26,-5],[-5,5],[5,26]].forEach(([a,b],k)=>{if(k===1)return;const L=b-a;P(J(scene,FX,0,(a+b)/2),B1,wallM,[0,3.5,0],[3,7,L]);
    for(let z=a+1;z<b;z+=2)P(scene,B1,wallM,[FX,7.6,z],[3.1,1.2,1]);});
  tower(FX,-5.5,11,2.6);tower(FX,5.5,11,2.6);tower(FX,-27,9,3.2);tower(FX,27,9,3.2);
  // ประตูไม้ + ซุ้ม
  P(scene,B1,wallM,[FX,9.6,0],[3.2,2.4,9]);
  P(scene,B1,woodM,[FX-1.2,3,-2.6],[.4,6,.3],[0,.9,0]);P(scene,B1,woodM,[FX-1.2,3,2.6],[.4,6,.3],[0,-.9,0]);
  for(let i=0;i<6;i++){const tx=FX-6-i*7,tz=rnd(-18,18);const g=J(scene,tx,0,tz);P(g,B1,wallM,[0,2.5,0],[5,5,5]);P(g,new THREE.ConeGeometry(4.2,3,4),roofM,[0,6.5,0],null,[0,Math.PI/4,0]);}
  // ค่ายศัตรู: รั้วไม้ปลายแหลม เต็นท์ กองไฟ
  const EX=38, tentM=SM(0x8a2d24,{roughness:.8}), tentM2=SM(0x5a1c1a,{roughness:.8}), logM=SM(0x5c3d24,{map:TX.wood,roughness:.9});
  for(let z=-26;z<=26;z+=1.1){if(Math.abs(z)<5)continue;const h=rnd(3,4.2);P(scene,new THREE.CylinderGeometry(.35,.4,h,6),logM,[EX+rnd(-.2,.2),h/2,z],null,[0,0,rnd(-.08,.08)]);P(scene,new THREE.ConeGeometry(.36,.9,6),logM,[EX,h+.45,z]);}
  for(let i=0;i<14;i++){const g=J(scene,EX+rnd(5,26),0,rnd(-20,20));const r=rnd(2.2,3.4);P(g,new THREE.ConeGeometry(r,r*1.5,6),i%2?tentM:tentM2,[0,r*.75,0],null,[0,rnd(0,3),0]);}
  MAPK.fires=[];
  [[EX+8,-8],[EX+10,7],[EX+18,0],[EX+20,-12],[EX+22,11]].forEach(([x,z])=>{const g=J(scene,x,0,z);for(let k=0;k<5;k++)P(g,Y1,logM,[0,.2,0],[.18,1.4,.18],[Math.PI/2.4,k*1.2,0]);
    const gl=glow(g,0xffa040,2.6,[0,.9,0],.9);glow(g,0xff6a20,5,[0,.3,0],.35);MAPK.fires.push({gl});});
  // ป่าสน/ต้นไม้ (instanced)
  const trunkG=new THREE.CylinderGeometry(.18,.28,2,6), coneG=new THREE.ConeGeometry(1.5,4,7), blobG=new THREE.IcosahedronGeometry(1.5,1);
  const NT=320, trunk=new THREE.InstancedMesh(trunkG,SM(0x5e4027),NT), pine=new THREE.InstancedMesh(coneG,SM(0xffffff,{flatShading:true}),NT);
  const NM=70, blob=new THREE.InstancedMesh(blobG,SM(0xffffff,{flatShading:true}),NM), trunk2=new THREE.InstancedMesh(trunkG,SM(0x5e4027),NM);
  const mm=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(), col=new THREE.Color();
  let nt=0, nm=0;
  const okSpot=(x,z)=>!(Math.abs(z)<MAPK.road+2&&x>FX-4&&x<EX+30)&&!(Math.abs(z+40)<13)&&!(x<FX+3&&x>FX-50&&Math.abs(z)<30)&&!(x>EX-2&&x<EX+30&&Math.abs(z)<27);
  for(let i=0;i<3000&&(nt<NT||nm<NM);i++){const x=rnd(-95,95),z=rnd(-80,80);if(!okSpot(x,z)||Math.hypot(x/1.25,z)>92)continue;
    const s=rnd(.9,1.8);q.setFromEuler(new THREE.Euler(0,rnd(0,6),0));
    if(Math.random()<.82&&nt<NT){mm.compose(ps.set(x,s,z),q,sc.set(s,s,s));trunk.setMatrixAt(nt,mm);mm.compose(ps.set(x,s*3.2,z),q,sc.set(s,s,s));pine.setMatrixAt(nt,mm);
      pine.setColorAt(nt,col.setHSL(.3+rnd(-.03,.04),.35+rnd(0,.15),.2+rnd(0,.1)).convertSRGBToLinear());nt++;}
    else if(nm<NM){mm.compose(ps.set(x,s,z),q,sc.set(s,s,s));trunk2.setMatrixAt(nm,mm);mm.compose(ps.set(x,s*2.6,z),q,sc.set(s*1.1,s*.9,s*1.1));blob.setMatrixAt(nm,mm);
      blob.setColorAt(nm,col.setHSL(rnd(.02,.1),.7,.5).convertSRGBToLinear());nm++;}}
  trunk.count=pine.count=nt; trunk2.count=blob.count=nm;
  [trunk,pine,blob,trunk2].forEach(o=>{o.castShadow=true;o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;scene.add(o);});
  // กอหญ้า
  const tuftG=new THREE.ConeGeometry(.12,.5,4), NG=900, tuft=new THREE.InstancedMesh(tuftG,SM(0x6f9b45),NG);let ng=0;
  for(let i=0;i<4000&&ng<NG;i++){const x=rnd(-70,70),z=rnd(-34,34);if(Math.abs(z)<MAPK.road-2&&Math.abs(x)<50)continue;if(Math.abs(z+40)<12)continue;q.setFromEuler(new THREE.Euler(rnd(-.3,.3),rnd(0,6),rnd(-.3,.3)));const s=rnd(.7,1.6);mm.compose(ps.set(x,.2*s,z),q,sc.set(s,s,s));tuft.setMatrixAt(ng++,mm);}
  tuft.count=ng; tuft.instanceMatrix.needsUpdate=true; scene.add(tuft);
}
// รวมฉากนิ่งทั้งหมดเป็นก้อนเดียวต่อวัสดุ (ลดการวาดจากหลายร้อยครั้งเหลือหลักสิบ)
{
  const groups=new Map(), kill=[];
  scene.updateMatrixWorld(true);
  scene.children.slice(MAP0).forEach(root=>root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.isSprite||!o.geometry||!o.material||Array.isArray(o.material))return;
    if(o.material.transparent||o===skyM||(MAPK.flags||[]).includes(o))return;
    if(o.geometry.parameters&&o.geometry.parameters.width>=400)return; // พื้นใหญ่ไม่ต้องรวม
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const key=o.material; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(g); kill.push(o);}));
  kill.forEach(o=>o.parent&&o.parent.remove(o));
  groups.forEach((list,mat)=>{let n=0;list.forEach(g=>n+=g.attributes.position.count);
    const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
    list.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);o+=g.attributes.position.count;g.dispose();});
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('uv',new THREE.BufferAttribute(U,2));G.computeBoundingSphere();
    const m=new THREE.Mesh(G,mat);m.receiveShadow=!LOW;m.castShadow=false;scene.add(m);});
  // ของประกอบฉากที่ยังเหลือ (ต้นไม้ หญ้า) ไม่ต้องทอดเงา
  scene.children.slice(MAP0).forEach(r=>r.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)o.castShadow=false;}));
}
// ขยับน้ำ ธง ไฟ
function mapTick(T){if(MAPK.water)MAPK.water.offset.x=T*.02;(MAPK.flags||[]).forEach((f,i)=>{f.rotation.y=Math.sin(T*2+i)*.35;});(MAPK.fires||[]).forEach((f,i)=>{f.gl.scale.setScalar(2.4+Math.sin(T*9+i*3)*.3+Math.random()*.2);});}
