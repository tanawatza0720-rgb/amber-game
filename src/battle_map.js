/* ================= แผนที่ใหญ่: นครหอคอยคู่อัมพร (สนามรบหน้าประตูเมือง) =================
   ฝั่งเรา (ซ้าย x ติดลบ) = กำแพงเมืองสูง ประตูใหญ่ขนาบด้วยหอคอยคู่แบบโกธิก ในกำแพงมีเมืองไล่ระดับขึ้นเขา ยอดสุดคือหอคอยปราสาท
   ฝั่งศัตรู (ขวา) = ค่ายนินจาชาด หอรบล้อเลื่อน เครื่องยิงหิน
   กลาง = ทุ่งสนามรบ ดินไหม้ หลุมระเบิด ควันไฟ ลูกไฟจากเครื่องยิงหินปลิวข้ามฟ้า */
const BIG=true;
// เครื่องสเปกต่ำ (มือถือ): ปิดเงาจริง ใช้เงาวงกลมแทน, ลดความละเอียดจอ, ลดจำนวนศัตรูและเอฟเฟกต์
const LOW=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||Math.min(screen.width,screen.height)<700||/[?&]low=1/.test(location.search);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,LOW?1:1.5));
if(LOW){renderer.shadowMap.enabled=false;} else {renderer.shadowMap.type=THREE.PCFShadowMap;}
renderer.toneMappingExposure=1.05; camera.far=700; camera.updateProjectionMatrix();
const MAP0=scene.children.length;
const FXK=LOW?.35:.65;
const MAPK={road:14,smokes:[],fires:[],flags:[],balls:[],nextBall:2};
// ท้องฟ้าครึ้มสงคราม: เมฆเทาทึบด้านบน ขอบฟ้าเรืองส้มจากไฟ
scene.background=new THREE.Color(0x4a4e58);
const skyM=new THREE.Mesh(new THREE.SphereGeometry(420,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,
  map:srgb(canvasTex(256,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#2b2f3a');g.addColorStop(.3,'#4b505c');g.addColorStop(.47,'#8a7a6c');g.addColorStop(.52,'#d0875a');g.addColorStop(.58,'#6a5a4c');g.addColorStop(1,'#3a3630');x.fillStyle=g;x.fillRect(0,0,s,s);
    for(let i=0;i<260;i++){const cx=Math.random()*s,cy=Math.random()*s*.45,r=8+Math.random()*30;const gg=x.createRadialGradient(cx,cy,0,cx,cy,r);const d=Math.random()<.5;gg.addColorStop(0,d?'rgba(30,32,40,.35)':'rgba(120,115,120,.25)');gg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}}))}));
scene.add(skyM);
scene.fog=new THREE.Fog(0x6f6a68,70,230);
scene.add(new THREE.HemisphereLight(0xc6ccdc,0x3a3428,.85));
const sun=new THREE.DirectionalLight(0xffc28a,2.0); sun.position.set(40,45,25); sun.castShadow=true;
sun.shadow.mapSize.set(LOW?512:1536,LOW?512:1536); Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:180}); sun.shadow.bias=-.0006; sun.shadow.normalBias=.04; scene.add(sun); scene.add(sun.target);
const rimL=new THREE.DirectionalLight(0xff9a5a,.55); rimL.position.set(40,12,-30); scene.add(rimL);
function sunFollow(c){sun.position.set(c.x+40,45,c.z+25);sun.target.position.set(c.x,0,c.z);}
const falling=[], flies=[];
{
  const rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  // ---------- พื้น: ทุ่งหญ้าแห้งปนโคลน รอยไหม้ ----------
  const groundT=srgb(canvasTex(512,(x,s)=>{x.fillStyle='#5d5a3d';x.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){const cx=Math.random()*s,cy=Math.random()*s,r=20+Math.random()*90,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const c=pick(['110,112,60','72,66,44','95,84,58','62,78,40']);g.addColorStop(0,`rgba(${c},.55)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    for(let i=0;i<9000;i++){const h=50+Math.random()*40,l=20+Math.random()*25;x.fillStyle=`hsla(${h},35%,${l}%,.5)`;x.fillRect(Math.random()*s,Math.random()*s,1.5,3);}},[36,36]));
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(520,520),SM(0xffffff,{map:groundT,roughness:.98}));gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;scene.add(gr);
  // สนามรบกลาง: ดินโคลนเข้ม รอยล้อ รอยเท้า
  const mudT=srgb(canvasTex(512,(x,s)=>{x.clearRect(0,0,s,s);
    const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'rgba(92,76,56,0)');g.addColorStop(.15,'rgba(92,76,56,.92)');g.addColorStop(.85,'rgba(84,70,52,.92)');g.addColorStop(1,'rgba(84,70,52,0)');x.fillStyle=g;x.fillRect(0,0,s,s);
    for(let i=0;i<7000;i++){const y=s*.1+Math.random()*s*.8;x.fillStyle=`rgba(${50+Math.random()*60|0},${40+Math.random()*45|0},${28+Math.random()*25|0},.5)`;x.fillRect(Math.random()*s,y,2,2);}
    for(let i=0;i<30;i++){const cx=Math.random()*s,cy=s*(.2+Math.random()*.6),r=8+Math.random()*30,gg=x.createRadialGradient(cx,cy,0,cx,cy,r);gg.addColorStop(0,'rgba(40,32,24,.35)');gg.addColorStop(1,'rgba(40,32,24,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}},[5,1]));
  const field=new THREE.Mesh(new THREE.PlaneGeometry(120,56),new THREE.MeshStandardMaterial({map:mudT,transparent:true,roughness:1,depthWrite:false}));
  field.rotation.x=-Math.PI/2;field.position.set(4,.02,0);field.receiveShadow=true;field.renderOrder=-1;scene.add(field);

  // ---------- วัสดุ ----------
  const stoneT=TX.stone;
  const wallM=SM(0xb9b3a6,{map:stoneT,roughness:.9}), wallD=SM(0x8f897e,{map:stoneT,roughness:.92}), wallL=SM(0xd6d0c2,{map:stoneT,roughness:.88});
  const slateM=SM(0x3a3f4c,{roughness:.7}), roofR=SM(0x7a3a2a,{roughness:.75}), roofB=SM(0x46505e,{roughness:.7});
  const winM=new THREE.MeshStandardMaterial({color:0x2a1a10,emissive:0xffa24a,emissiveIntensity:1.6});
  const woodM=SM(0x6b4a2e,{map:TX.wood,roughness:.85}), woodD=SM(0x3f2c1c,{map:TX.wood,roughness:.9}), ironM=SM(0x3a3c40,{roughness:.5,metalness:.6});
  const flagM=new THREE.MeshStandardMaterial({color:0xd49a3a,side:THREE.DoubleSide,roughness:.7}), flagE=new THREE.MeshStandardMaterial({color:0x8a1c16,side:THREE.DoubleSide,roughness:.7});
  const rockM=SM(0x6d6a66,{map:stoneT,roughness:.95,flatShading:true}), rockD=SM(0x4d4a48,{map:stoneT,roughness:.95,flatShading:true});
  const burnM=SM(0x3a2f22,{roughness:1});
  const O8=new THREE.CylinderGeometry(1,1,1,8), CN8=new THREE.ConeGeometry(1,1,8), CN4=new THREE.ConeGeometry(1,1,4);
  const flag=(parent,x,y,z,m,s)=>{const pole=J(parent,x,y,z);P(pole,Y1,woodM,[0,1.6*(s||1),0],[.1,3.2*(s||1),.1]);const f=new THREE.Mesh(new THREE.PlaneGeometry(2.4*(s||1),1.3*(s||1),6,1),m||flagM);f.position.set(1.2*(s||1),2.6*(s||1),0);pole.add(f);MAPK.flags.push(f);};

  // ---------- หอคอยโกธิก: ฐานแปดเหลี่ยม ค้ำยันมุม ชั้นลดหลั่น ยอดแหลม หน้าต่างเรืองไฟ ----------
  function gothicTower(x,z,h,r,opt){
    opt=opt||{}; const g=J(scene,x,0,z); let y=0, rr=r;
    const tiers=opt.tiers||3;
    for(let t=0;t<tiers;t++){
      const th=h*(t===0?.46:t===1?.3:.24)/(tiers===3?1:1.1);
      P(g,O8,t%2?wallM:wallL,[0,y+th/2,0],[rr,th,rr],[0,Math.PI/8,0]);
      // ค้ำยันที่มุม + ยอดแหลมเล็ก
      for(let k=0;k<4;k++){const a=k/4*Math.PI*2+Math.PI/4,bx=Math.cos(a)*rr*.98,bz=Math.sin(a)*rr*.98;
        P(g,B1,wallD,[bx,y+th*.5,bz],[rr*.34,th*1.02,rr*.34],[0,-a,0]);
        P(g,CN4,slateM,[bx,y+th+rr*.35,bz],[rr*.22,rr*.8,rr*.22],[0,Math.PI/4-a,0]);}
      // หน้าต่างยาวโค้งแหลม (เรืองไฟ)
      for(let k=0;k<8;k++){if(Math.random()<.3)continue;const a=k/8*Math.PI*2,wx=Math.cos(a)*rr*1.005,wz=Math.sin(a)*rr*1.005;
        for(let wy=y+th*.3;wy<y+th*.85;wy+=th*.34)P(g,B1,winM,[wx,wy,wz],[.08,Math.min(1.6,th*.18),.42],[0,-a,0]);}
      // เชิงเทิน
      const cr=rr*1.08;P(g,O8,wallD,[0,y+th+.25,0],[cr,.5,cr],[0,Math.PI/8,0]);
      for(let k=0;k<16;k++){const a=k/16*Math.PI*2;P(g,B1,wallM,[Math.cos(a)*cr*.95,y+th+.8,Math.sin(a)*cr*.95],[.55,.7,.4],[0,-a,0]);}
      y+=th+.5; rr*=.72;
    }
    P(g,CN8,slateM,[0,y+h*.14,0],[rr*1.25,h*.28,rr*1.25]);
    if(opt.flag!==false)flag(g,0,y+h*.27,0,flagM,1.3);
    // เปลวไฟ/แสงบนยอด
    MAPK.fires.push({gl:glow(g,0xffb060,3.5,[0,y+.8,0],.5)});
    return g;
  }

  // ---------- กำแพงเมือง ----------
  const FX=-34, WH=13, GATE=6.5;
  function wallSeg(x0,z0,x1,z1){
    const dx=x1-x0,dz=z1-z0,L=Math.hypot(dx,dz),a=Math.atan2(dz,dx),cx=(x0+x1)/2,cz=(z0+z1)/2;
    const g=J(scene,cx,0,cz); g.rotation.y=-a;
    P(g,B1,wallM,[0,WH/2,0],[L,WH,4.2]); P(g,B1,wallD,[0,.9,0],[L+.2,1.8,5.2]);
    P(g,B1,wallD,[0,WH+.2,-2.1],[L,.4,.5]);
    for(let s=-L/2+.7;s<L/2-.4;s+=1.5)P(g,B1,wallM,[s,WH+.85,2.05],[.9,1.3,.55]);
    for(let s=-L/2+3;s<L/2-2;s+=6)P(g,B1,wallD,[s,WH*.45,2.5],[1.2,WH*.9,1.4]);
    for(let s=-L/2+4.5;s<L/2-3;s+=9)P(g,B1,winM,[s,WH*.7,2.12],[.25,.9,.05]);
  }
  // กำแพงโค้งเล็กน้อย (ด้านหน้าหันเข้าสนามรบ) + หอเล็กตามแนว
  const wpts=[[FX-18,-62],[FX-7,-44],[FX-2,-26],[FX,-GATE],null,[FX,GATE],[FX-2,26],[FX-7,44],[FX-18,62]];
  for(let i=0;i<wpts.length-1;i++){if(!wpts[i]||!wpts[i+1])continue;wallSeg(wpts[i][0],wpts[i][1],wpts[i+1][0],wpts[i+1][1]);}
  [[FX-2,-26],[FX-7,-44],[FX-2,26],[FX-7,44]].forEach(([x,z])=>gothicTower(x,z,20,3.4,{tiers:2}));
  [[FX-18,-62],[FX-18,62]].forEach(([x,z])=>gothicTower(x,z,24,4,{tiers:2}));
  // หอคอยคู่ขนาบประตู (สูงเด่น)
  gothicTower(FX-1,-GATE-4.2,40,5.2); gothicTower(FX-1,GATE+4.2,40,5.2);
  // ซุ้มประตู + บานประตูเหล็กไม้ + สะพานเชื่อมสองหอ
  { const g=J(scene,FX,0,0);
    P(g,B1,wallL,[0,WH+4,0],[5,6,GATE*2+3]); P(g,B1,wallD,[0,WH+7.3,0],[5.6,.6,GATE*2+3.5]);
    for(let s=-GATE-1;s<=GATE+1;s+=1.5)P(g,B1,wallM,[2.4,WH+8,s],[.6,1.2,.8]);
    P(g,B1,woodD,[.8,WH*.42,0],[.8,WH*.84,GATE*2-.6]); for(let s=-GATE+1;s<GATE;s+=1.3)P(g,B1,ironM,[1.25,WH*.42,s],[.12,WH*.84,.18]);
    for(let yy=1.5;yy<WH*.8;yy+=2)P(g,B1,ironM,[1.25,yy,0],[.12,.18,GATE*2-.6]);
    P(g,B1,winM,[2.55,WH+4.5,-2],[.05,1.2,.6]);P(g,B1,winM,[2.55,WH+4.5,2],[.05,1.2,.6]);
    flag(g,2.5,WH+7.6,-GATE,flagM,1.1);flag(g,2.5,WH+7.6,GATE,flagM,1.1); }

  // ---------- เมืองในกำแพง: ไล่ระดับขึ้นเขา ----------
  const CX=-78, CZ=0;
  const plateau=(r,h,m)=>{P(scene,O8,m||wallD,[CX,h/2,CZ],[r,h,r],[0,Math.PI/8,0]);};
  plateau(34,2.5,rockD); plateau(26,7,wallD); plateau(18,13,wallD); plateau(10,19,wallD);
  const ringWall=(r,y,h)=>{const n=Math.round(r*.9);for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=CX+Math.cos(a)*r,z=CZ+Math.sin(a)*r;
      P(scene,B1,wallM,[x,y+h/2,z],[2*Math.PI*r/n+.1,h,1.2],[0,-a+Math.PI/2,0]);if(k%2===0)P(scene,B1,wallM,[x,y+h+.35,z],[.9,.7,1.3],[0,-a+Math.PI/2,0]);}};
  ringWall(26,7,2.2); ringWall(18,13,2.2); ringWall(10.2,19,2.2);
  const house=(x,y,z,rot)=>{const w=rnd(1.6,3.2),d=rnd(1.6,2.8),h=rnd(1.8,3.6),g=J(scene,x,y,z);g.rotation.y=rot;
    P(g,B1,Math.random()<.6?wallL:wallM,[0,h/2,0],[w,h,d]);
    P(g,CN4,Math.random()<.55?roofB:roofR,[0,h+w*.35,0],[w*.78,w*.7,d*.78],[0,Math.PI/4,0]);
    if(Math.random()<.55)P(g,B1,winM,[0,h*.55,d/2+.01],[.35,.5,.04]);
    if(Math.random()<.25)P(g,Y1,wallD,[w*.3,h+w*.55,0],[.18,1.1,.18]);};
  const NH=LOW?70:150;
  const rings=[[34,2.5,27.5],[26,7,19.5],[18,13,11.5]];
  for(let i=0;i<NH;i++){const [ro,y,ri]=pick(rings);const a=rnd(0,Math.PI*2),r=rnd(ri,ro-1.6);const x=CX+Math.cos(a)*r,z=CZ+Math.sin(a)*r;
    if(x>FX-10)continue; house(x,y,z,-a+rnd(-.3,.3));}
  // หอคอยปราสาทบนยอดสุด (สูงเรียว)
  gothicTower(CX,CZ,52,5.5,{tiers:3});
  [[CX+6,CZ-6],[CX+6,CZ+6],[CX-6,CZ-6],[CX-6,CZ+6]].forEach(([x,z])=>{const g=gothicTower(x,z,16,2,{tiers:2,flag:false});g.position.y=19;});
  // บ้านนอกเมือง/ลานระหว่างกำแพงกับเมือง
  for(let i=0;i<(LOW?12:30);i++){const x=rnd(FX-40,FX-10),z=rnd(-50,50);if(Math.abs(z)<6)continue;if(Math.hypot(x-CX,z-CZ)<36)continue;house(x,0,z,rnd(0,6));}

  // ---------- ภูเขาหินขรุขระล้อมรอบ (ด้านหลังเมืองสูงชัน) ----------
  const peakGeo=(()=>{const g=new THREE.ConeGeometry(1,1,9,6),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.5-y;
      const n=1+(Math.sin(x*9+y*7)+Math.sin(z*11-y*5)+Math.sin((x+z)*6))*.09*(k+.2);p.setXYZ(i,x*n,y+(Math.sin(x*13+z*7)*.03),z*n);}g.computeVertexNormals();return g;})();
  const peak=(x,z,r,h,m)=>{const o=new THREE.Mesh(peakGeo,m||rockM);o.position.set(x,h/2-1,z);o.scale.set(r,h,r*rnd(.8,1.2));o.rotation.y=rnd(0,6);o.receiveShadow=true;scene.add(o);};
  for(let i=0;i<34;i++){const a=Math.PI*.5+i/33*Math.PI, R=rnd(118,150);peak(Math.cos(a)*R-20,Math.sin(a)*R*.9,rnd(18,30),rnd(45,95),i%2?rockM:rockD);}
  for(let i=0;i<26;i++){const a=-Math.PI*.5+i/25*Math.PI, R=rnd(125,160);peak(Math.cos(a)*R+10,Math.sin(a)*R*.9,rnd(18,32),rnd(30,70),i%2?rockM:rockD);}
  // หน้าผาหินข้างสนาม
  const rockGeo=(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);v.multiplyScalar(1+(Math.sin(v.x*5.1)+Math.sin(v.y*4.3+1)+Math.sin(v.z*6.2+2))*.08);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;})();
  const rock=(x,z,sx,sy,sz,m)=>{const r=new THREE.Mesh(rockGeo,m||rockM);r.position.set(x,sy*.3,z);r.scale.set(sx,sy,sz);r.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.2,.2));r.receiveShadow=true;scene.add(r);};
  [[0,36],[16,40],[-14,38],[30,35],[6,-36],[-12,-38],[24,-37],[44,32],[44,-34]].forEach(([x,z],i)=>{rock(x,z,rnd(6,10),rnd(6,12),rnd(5,8),i%2?rockM:rockD);rock(x+rnd(-5,5),z+Math.sign(z)*rnd(4,7),rnd(5,8),rnd(9,16),rnd(5,7),rockD);});
  for(let i=0;i<(LOW?25:60);i++){const x=rnd(-28,60),z=(Math.random()<.5?-1:1)*rnd(12,32);rock(x,z,rnd(.5,1.4),rnd(.4,1),rnd(.5,1.4));}

  // ---------- ซากสนามรบ: หลุมไหม้ หอกปัก โล่ เกวียนพัง หลักแหลม ----------
  for(let i=0;i<(LOW?8:16);i++){const x=rnd(-26,40),z=rnd(-24,24);const r=rnd(1.2,3);const c=new THREE.Mesh(new THREE.CircleGeometry(r,10),burnM);c.rotation.x=-Math.PI/2;c.position.set(x,.03,z);scene.add(c);
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;P(scene,B1,rockD,[x+Math.cos(a)*r,.12,z+Math.sin(a)*r],[rnd(.4,.8),rnd(.2,.4),rnd(.4,.8)],[0,a,0]);}}
  for(let i=0;i<(LOW?30:70);i++){const x=rnd(-28,42),z=rnd(-26,26);P(scene,Y1,woodD,[x,.9,z],[.05,2,.05],[rnd(-.5,.5),0,rnd(-.5,.5)]);}
  for(let i=0;i<(LOW?12:30);i++){const x=rnd(-28,42),z=rnd(-26,26);P(scene,Y1,Math.random()<.5?woodM:ironM,[x,.08,z],[.45,.06,.45],[rnd(-.4,.4),0,rnd(-.4,.4)]);}
  for(let i=0;i<(LOW?3:7);i++){const g=J(scene,rnd(-20,35),0,rnd(-22,22));g.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.3,.3));
    P(g,B1,woodM,[0,.7,0],[3,.25,1.6]);P(g,B1,woodM,[1.4,1.1,0],[.2,.8,1.6]);P(g,Y1,woodD,[.8,.5,.9],[.55,.12,.55],[Math.PI/2,0,0]);P(g,Y1,woodD,[-.9,.2,-.95],[.55,.12,.55],[Math.PI/2.4,0,.4]);}
  // แนวหลักไม้แหลมกันม้าหน้ากำแพง
  for(let z=-40;z<=40;z+=2.2){if(Math.abs(z)<9)continue;const x=FX+7+Math.abs(z)*.05;P(scene,Y1,woodD,[x,.9,z],[.12,2.4,.12],[0,0,-.7]);P(scene,Y1,woodD,[x,.9,z+.8],[.12,2.4,.12],[0,0,.7]);}

  // ---------- ค่ายศัตรู ----------
  const EX=46, tentM=SM(0x5a1c1a,{roughness:.85}), tentM2=SM(0x3a1614,{roughness:.85});
  for(let z=-30;z<=30;z+=1.2){if(Math.abs(z)<6)continue;const h=rnd(3,4.4);P(scene,Y1,woodD,[EX+rnd(-.2,.2),h/2,z],[.34,h,.34]);P(scene,CN8,woodD,[EX,h+.4,z],[.36,.9,.36]);}
  for(let i=0;i<(LOW?8:16);i++){const g=J(scene,EX+rnd(5,28),0,rnd(-24,24));const r=rnd(2.2,3.4);P(g,CN8,i%2?tentM:tentM2,[0,r*.75,0],[r,r*1.5,r],[0,rnd(0,3),0]);}
  // หอรบล้อเลื่อน
  const siege=(x,z)=>{const g=J(scene,x,0,z);g.rotation.y=Math.PI/2+rnd(-.2,.2);const H=11;
    [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]].forEach(([a,b])=>P(g,B1,woodD,[a,H/2,b],[.4,H,.4]));
    for(let y=2;y<H;y+=2.2){P(g,B1,woodM,[0,y,-1.5],[3.4,.25,.3]);P(g,B1,woodM,[0,y,1.5],[3.4,.25,.3]);P(g,B1,woodM,[-1.5,y,0],[.3,.25,3.4]);P(g,B1,woodM,[1.5,y,0],[.3,.25,3.4]);}
    P(g,B1,woodM,[0,H,0],[3.8,.35,3.8]);P(g,B1,SM(0x6a5a44,{roughness:.9}),[0,H*.55,-1.7],[3.4,H*.8,.1]);
    [[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]].forEach(([a,b])=>P(g,Y1,woodD,[a,.7,b],[.7,.25,.7],[0,0,Math.PI/2]));
    flag(g,0,H,0,flagE,1);};
  siege(EX-6,-15);siege(EX-5,14);if(!LOW)siege(EX+10,0);
  // เครื่องยิงหิน (ใช้เป็นจุดปล่อยลูกไฟ)
  MAPK.cats=[];
  const catapult=(x,z)=>{const g=J(scene,x,0,z);g.rotation.y=Math.PI/2;P(g,B1,woodD,[0,.5,0],[2.2,.4,3.2]);P(g,B1,woodM,[-.9,1.5,0],[.3,2.2,.3]);P(g,B1,woodM,[.9,1.5,0],[.3,2.2,.3]);
    P(g,B1,woodM,[0,2.3,-.4],[.25,.25,3.4],[.6,0,0]);[[-1.1,-1.3],[1.1,-1.3],[-1.1,1.3],[1.1,1.3]].forEach(([a,b])=>P(g,Y1,woodD,[a,.45,b],[.45,.2,.45],[0,0,Math.PI/2]));
    MAPK.cats.push(new THREE.Vector3(x,3,z));};
  [[EX+8,-10],[EX+9,8],[EX+14,-20],[EX+14,20]].forEach(([x,z])=>catapult(x,z));
  // กองไฟในค่าย
  [[EX+8,-4],[EX+12,10],[EX+20,-14],[EX+22,4]].forEach(([x,z])=>{const g=J(scene,x,0,z);for(let k=0;k<5;k++)P(g,Y1,woodD,[0,.2,0],[.18,1.4,.18],[Math.PI/2.4,k*1.2,0]);
    MAPK.fires.push({gl:glow(g,0xffa040,2.6,[0,.9,0],.9)});glow(g,0xff6a20,5,[0,.3,0],.35);});

  // ---------- ต้นไม้แห้ง/ป่าสนเข้ม (instanced) ----------
  const trunkG=new THREE.CylinderGeometry(.16,.26,2,5), coneG=new THREE.ConeGeometry(1.4,4,6);
  const NT=LOW?120:240, trunk=new THREE.InstancedMesh(trunkG,SM(0x4a3524),NT), pine=new THREE.InstancedMesh(coneG,SM(0xffffff,{flatShading:true}),NT);
  const mm=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(), col=new THREE.Color(); let nt=0;
  const okSpot=(x,z)=>!(Math.abs(z)<34&&x>FX-4&&x<EX+32)&&!(Math.hypot(x-CX,z-CZ)<40)&&!(x<FX+4&&x>FX-30&&Math.abs(z)<60);
  for(let i=0;i<4000&&nt<NT;i++){const x=rnd(-110,100),z=rnd(-100,100);if(!okSpot(x,z)||Math.hypot(x/1.2,z)>105)continue;
    const s=rnd(.9,1.7);q.setFromEuler(new THREE.Euler(0,rnd(0,6),0));
    mm.compose(ps.set(x,s,z),q,sc.set(s,s,s));trunk.setMatrixAt(nt,mm);mm.compose(ps.set(x,s*3,z),q,sc.set(s,s,s));pine.setMatrixAt(nt,mm);
    pine.setColorAt(nt,col.setHSL(.26+rnd(-.04,.05),.22+rnd(0,.12),.14+rnd(0,.08)).convertSRGBToLinear());nt++;}
  trunk.count=pine.count=nt;
  [trunk,pine].forEach(o=>{o.castShadow=false;o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;scene.add(o);});

  // ---------- ควันไฟลอยขึ้นฟ้า (เสาควันเลื่อนพื้นผิวขึ้น) ----------
  const smokeT=canvasTex(128,(x,s)=>{x.clearRect(0,0,s,s);for(let i=0;i<60;i++){const cx=s/2+(Math.random()-.5)*s*.35,cy=Math.random()*s,r=10+Math.random()*26,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(60,56,54,.55)');g.addColorStop(1,'rgba(60,56,54,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}
    const m=x.createLinearGradient(0,0,s,0);m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(.25,'rgba(0,0,0,0)');m.addColorStop(.75,'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=m;x.fillRect(0,0,s,s);
    const v=x.createLinearGradient(0,0,0,s);v.addColorStop(0,'rgba(0,0,0,1)');v.addColorStop(.3,'rgba(0,0,0,0)');x.fillStyle=v;x.fillRect(0,0,s,s);});
  smokeT.wrapT=THREE.RepeatWrapping;
  const smokeAt=[[-60,-14],[-88,10],[-52,22],[12,-18],[26,15],[-4,20],[EX+18,-22],[EX+6,20]].slice(0,LOW?4:8);
  smokeAt.forEach(([x,z],i)=>{const t=smokeT.clone();t.needsUpdate=true;t.wrapT=THREE.RepeatWrapping;
    const m=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:.85,fog:true});const s=new THREE.Sprite(m);const h=rnd(22,36);s.scale.set(h*.35,h,1);s.position.set(x,h/2,z);scene.add(s);
    const fire=glow(scene,0xff7a2a,4,[x,.8,z],.8);MAPK.smokes.push({t,sp:rnd(.05,.09),fire,ph:i});});
}
// รวมฉากนิ่งทั้งหมดเป็นก้อนเดียวต่อวัสดุ (ลดการวาดจากหลายร้อยครั้งเหลือหลักสิบ)
{
  const groups=new Map(), kill=[];
  scene.updateMatrixWorld(true);
  scene.children.slice(MAP0).forEach(root=>root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.isSprite||!o.geometry||!o.material||Array.isArray(o.material))return;
    if(o.material.transparent||o===skyM||MAPK.flags.includes(o))return;
    if(o.geometry.parameters&&o.geometry.parameters.width>=400)return;
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const key=o.material; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(g); kill.push(o);}));
  kill.forEach(o=>o.parent&&o.parent.remove(o));
  groups.forEach((list,mat)=>{let n=0;list.forEach(g=>n+=g.attributes.position.count);
    const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
    list.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);o+=g.attributes.position.count;g.dispose();});
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('uv',new THREE.BufferAttribute(U,2));G.computeBoundingSphere();
    const m=new THREE.Mesh(G,mat);m.receiveShadow=!LOW;m.castShadow=false;scene.add(m);});
  scene.children.slice(MAP0).forEach(r=>r.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)o.castShadow=false;}));
}
// ธงสะบัด ควันลอย ไฟกระพริบ ลูกไฟจากเครื่องยิงหิน
const _bv=new THREE.Vector3();
function mapTick(T){
  MAPK.flags.forEach((f,i)=>{f.rotation.y=Math.sin(T*2.2+i)*.35;});
  MAPK.fires.forEach((f,i)=>{f.gl.scale.setScalar(f.gl.userData.s0||(f.gl.userData.s0=f.gl.scale.x));f.gl.scale.multiplyScalar(.9+Math.sin(T*9+i*3)*.08+Math.random()*.06);});
  MAPK.smokes.forEach(s=>{s.t.offset.y=-T*s.sp;s.fire.scale.setScalar(3.4+Math.sin(T*8+s.ph)*.5+Math.random()*.4);});
  // ลูกไฟ
  if(T>MAPK.nextBall&&MAPK.cats&&MAPK.cats.length){MAPK.nextBall=T+(LOW?5:2.5)+Math.random()*3;
    const from=MAPK.cats[Math.floor(Math.random()*MAPK.cats.length)].clone(), to=new THREE.Vector3(-34+Math.random()*4,6+Math.random()*7,(Math.random()-.5)*60);
    if(Math.random()<.3)to.set(-45-Math.random()*40,3+Math.random()*10,(Math.random()-.5)*40);
    const b=glow(scene,0xff8a30,2.2,[from.x,from.y,from.z],1);MAPK.balls.push({b,from,to,t:0,d:3+Math.random()*1.2,trail:0});}
  for(let i=MAPK.balls.length-1;i>=0;i--){const o=MAPK.balls[i];o.t+=1/60;const k=Math.min(1,o.t/o.d);
    _bv.lerpVectors(o.from,o.to,k);_bv.y+=Math.sin(k*Math.PI)*28;o.b.position.copy(_bv);
    o.trail-=1/60;if(o.trail<=0){o.trail=LOW?.12:.05;fireSprite(_bv.clone(),new THREE.Vector3(0,.4,0),.7,.9,{smoke:Math.random()<.4,grav:0,grow:2.5});}
    if(k>=1){for(let j=0;j<(LOW?6:16);j++)fireSprite(o.to.clone(),new THREE.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6),.8,1.2,{grav:-2,grow:3});
      for(let j=0;j<(LOW?2:5);j++)fireSprite(o.to.clone(),new THREE.Vector3((Math.random()-.5)*2,2+Math.random()*2,(Math.random()-.5)*2),1.6,1.4,{smoke:true,grav:.3,grow:3});
      scene.remove(o.b);o.b.material.dispose();MAPK.balls.splice(i,1);}}
}
