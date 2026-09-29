/* ================= แผนที่ใหญ่: นครหอคอยคู่อัมพร (สนามรบหน้าประตูเมือง) =================
   ฝั่งเรา (ซ้าย x ติดลบ) = กำแพงเมืองสูง ประตูใหญ่ขนาบด้วยหอคอยคู่แบบโกธิก ในกำแพงมีเมืองไล่ระดับขึ้นเขา ยอดสุดคือหอคอยปราสาท
   ฝั่งศัตรู (ขวา) = ค่ายนินจาชาด หอรบล้อเลื่อน เครื่องยิงหิน
   กลาง = ทุ่งสนามรบ ดินไหม้ หลุมระเบิด ควันไฟ ลูกไฟจากเครื่องยิงหินปลิวข้ามฟ้า */
const BIG=true;
// เครื่องสเปกต่ำ (มือถือ): ปิดเงาจริง ใช้เงาวงกลมแทน, ลดความละเอียดจอ, ลดจำนวนศัตรูและเอฟเฟกต์
const LOW=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||Math.min(screen.width,screen.height)<700||/[?&]low=1/.test(location.search);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,LOW?1:1.5));
if(LOW){renderer.shadowMap.enabled=false;} else {renderer.shadowMap.type=THREE.PCFShadowMap;}
renderer.toneMappingExposure=1.12; camera.far=700; camera.updateProjectionMatrix();
const MAP0=scene.children.length;
const FXK=LOW?.35:.65;
const MAPK={road:14,smokes:[],fires:[],flags:[],balls:[],debris:[],nextBall:2};
// ท้องฟ้าครึ้มสงคราม: เมฆเทาทึบด้านบน ขอบฟ้าเรืองส้มจากไฟ
scene.background=new THREE.Color(0x4a4e58);
const skyM=new THREE.Mesh(new THREE.SphereGeometry(420,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,fog:false,
  map:srgb(canvasTex(256,(x,s)=>{const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#2b2f3a');g.addColorStop(.3,'#4b505c');g.addColorStop(.47,'#8a7a6c');g.addColorStop(.52,'#d0875a');g.addColorStop(.58,'#6a5a4c');g.addColorStop(1,'#3a3630');x.fillStyle=g;x.fillRect(0,0,s,s);
    for(let i=0;i<260;i++){const cx=Math.random()*s,cy=Math.random()*s*.45,r=8+Math.random()*30;const gg=x.createRadialGradient(cx,cy,0,cx,cy,r);const d=Math.random()<.5;gg.addColorStop(0,d?'rgba(30,32,40,.35)':'rgba(120,115,120,.25)');gg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gg;x.fillRect(0,0,s,s);}}))}));
scene.add(skyM);
scene.fog=new THREE.Fog(0x7d7570,110,420);
scene.add(new THREE.HemisphereLight(0xb9c2d6,0x3d3226,.8));
const sun=new THREE.DirectionalLight(0xffb676,2.4); sun.position.set(40,38,25); sun.castShadow=true;
sun.shadow.mapSize.set(LOW?512:1536,LOW?512:1536); Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:180}); sun.shadow.bias=-.0006; sun.shadow.normalBias=.04; scene.add(sun); scene.add(sun.target);
const rimL=new THREE.DirectionalLight(0xff9a5a,.55); rimL.position.set(40,12,-30); scene.add(rimL);
function sunFollow(c){sun.position.set(c.x+40,38,c.z+25);sun.target.position.set(c.x,0,c.z);}
const falling=[], flies=[];
{
  const rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  // สัญญาณรบกวน 3 มิติแบบนุ่ม (value noise + fbm) ใช้ปั้นหิน/ภูเขา/พุ่มไม้ให้เป็นธรรมชาติ
  const hsh=(x,y,z)=>{let h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h);};
  const vn=(x,y,z)=>{const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),fx=x-X,fy=y-Y,fz=z-Z,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
    const L=(a,b,t)=>a+(b-a)*t;return L(L(L(hsh(X,Y,Z),hsh(X+1,Y,Z),u),L(hsh(X,Y+1,Z),hsh(X+1,Y+1,Z),u),v),L(L(hsh(X,Y,Z+1),hsh(X+1,Y,Z+1),u),L(hsh(X,Y+1,Z+1),hsh(X+1,Y+1,Z+1),u),v),w)*2-1;};
  const fbm=(x,y,z,o)=>{let a=0,f=1,amp=.5;for(let i=0;i<(o||4);i++){a+=vn(x*f,y*f,z*f)*amp;f*=2.03;amp*=.5;}return a;};
  // รวมจุดซ้ำให้ผิวเชื่อมกัน (ได้ผิวเรียบไม่เป็นเหลี่ยม)
  const weld=g=>{const p=g.attributes.position,map=new Map(),pos=[],idx=[];for(let i=0;i<p.count;i++){const k=Math.round(p.getX(i)*1e4)+'_'+Math.round(p.getY(i)*1e4)+'_'+Math.round(p.getZ(i)*1e4);
      let j=map.get(k);if(j===undefined){j=pos.length/3;map.set(k,j);pos.push(p.getX(i),p.getY(i),p.getZ(i));}idx.push(j);}
    const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setIndex(idx);return o;};
  const withUV=g=>{if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;};
  // ---------- พื้นดิน: ภูมิประเทศลูกคลื่น + สีไล่เนียน (หญ้าแห้ง → ดินโคลนกลางสนาม → รอยไหม้) ----------
  const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const nz=(x,z)=>Math.sin(x*.045+z*.03)*.55+Math.sin(x*.11-z*.07+1.3)*.3+Math.sin(x*.23+z*.19+2.1)*.15+Math.sin(x*.61-z*.53)*.06;
  const flat=(x,z)=>{const lane=1-ss(28,44,Math.abs(z))*1; const nearCity=ss(-40,-20,x)*0+(x<-26&&x>-120&&Math.abs(z)<70?1:0); return Math.max(x>-40&&x<62?lane:0,nearCity);};
  const heightAt=(x,z)=>{const f=flat(x,z);return (1-f)*(nz(x,z)*3.2+ss(60,120,Math.hypot(x/1.2,z))*10);};
  MAPK.heightAt=heightAt;
  const detailT=srgb(canvasTex(256,(x,s)=>{x.fillStyle='#b8b8b8';x.fillRect(0,0,s,s);
    for(let i=0;i<14000;i++){const v=150+Math.random()*90|0;x.fillStyle=`rgba(${v},${v},${v},.55)`;x.fillRect(Math.random()*s,Math.random()*s,1+Math.random()*2,1+Math.random()*3);}
    for(let i=0;i<40;i++){const cx=Math.random()*s,cy=Math.random()*s,r=6+Math.random()*24,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(120,120,120,.35)');g.addColorStop(1,'rgba(120,120,120,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}},[70,70]));
  const SEG=LOW?90:150, gg=new THREE.PlaneGeometry(520,520,SEG,SEG); gg.rotateX(-Math.PI/2);
  const gp=gg.attributes.position, gc=new Float32Array(gp.count*3), c1=new THREE.Color(), c2=new THREE.Color();
  const GR=[new THREE.Color(0x6f6b44),new THREE.Color(0x585a36),new THREE.Color(0x7d7250)], MUD=new THREE.Color(0x5e4a36), MUD2=new THREE.Color(0x46382a), ROCKC=new THREE.Color(0x6a655c);
  MAPK.burns=[];
  for(let k=0;k<(LOW?8:16);k++)MAPK.burns.push([rnd(-26,40),rnd(-24,24),rnd(1.6,3.4)]);
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setY(i,heightAt(x,z));
    const n=nz(x*1.7,z*1.7), n2=nz(x*4.1+13,z*4.1-7);
    c1.copy(GR[0]).lerp(GR[1],.5+.5*n).lerp(GR[2],Math.max(0,n2)*.6);
    const mud=(1-ss(20,34,Math.abs(z+n*4)))*ss(-40,-30,x)*(1-ss(52,66,x));
    c2.copy(MUD).lerp(MUD2,.5+.5*n2); c1.lerp(c2,mud*.92);
    const road=(1-ss(3,7,Math.abs(z+Math.sin(x*.05)*2)))*(x<-30?1:0)*(x>-110?1:0); c1.lerp(MUD,road*.7);
    const hi=ss(3,9,gp.getY(i)); c1.lerp(ROCKC,hi*.6);
    let burn=0; MAPK.burns.forEach(([bx,bz,br])=>{burn=Math.max(burn,1-ss(br*.5,br*1.3,Math.hypot(x-bx,z-bz)));}); c1.multiplyScalar(1-burn*.55);
    c1.convertSRGBToLinear(); gc[i*3]=c1.r;gc[i*3+1]=c1.g;gc[i*3+2]=c1.b;}
  gg.setAttribute('color',new THREE.BufferAttribute(gc,3)); gg.computeVertexNormals();
  const gr=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({map:detailT,vertexColors:true,roughness:.97}));gr.receiveShadow=true;gr.userData.noMerge=true;scene.add(gr);

  // ---------- วัสดุ ----------
  // ก้อนหินก่อเรียงเป็นแถว มีร่องปูน สีต่างกันเล็กน้อย รอยคราบ
  const blockCanvas=(bw,bh,base,mort)=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=mort;x.fillRect(0,0,512,512);
    for(let r=0;r<512/bh;r++){const off=(r%2)*bw/2;for(let q=-1;q<512/bw+1;q++){const w=bw*(.8+Math.random()*.4),X=q*bw+off+Math.random()*3,Y=r*bh;
      const v=base+(Math.random()-.5)*26;x.fillStyle=`rgb(${v+4|0},${v|0},${v-8|0})`;x.fillRect(X+2,Y+2,w-4,bh-4);
      const g=x.createLinearGradient(0,Y,0,Y+bh);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(1,'rgba(0,0,0,.16)');x.fillStyle=g;x.fillRect(X+2,Y+2,w-4,bh-4);}}
    for(let i=0;i<7000;i++){const v=Math.random()<.5?0:255;x.fillStyle=`rgba(${v},${v},${v},.05)`;x.fillRect(Math.random()*512,Math.random()*512,2,2);}
    for(let i=0;i<22;i++){const X=Math.random()*512,g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'rgba(40,36,30,0)');g.addColorStop(1,'rgba(40,36,30,.25)');x.fillStyle=g;x.fillRect(X,Math.random()*300,6+Math.random()*14,512);}
    return c;};
  const bc=blockCanvas(64,32,178,'#6d675e'); const stoneT=srgb(new THREE.CanvasTexture(bc)); stoneT.wrapS=stoneT.wrapT=THREE.RepeatWrapping; stoneT.anisotropy=4;
  const stoneB=new THREE.CanvasTexture(bc); stoneB.wrapS=stoneB.wrapT=THREE.RepeatWrapping;
  const tileC=document.createElement('canvas');tileC.width=tileC.height=256;{const x=tileC.getContext('2d');x.fillStyle='#555';x.fillRect(0,0,256,256);
    for(let r=0;r<16;r++)for(let q=0;q<16;q++){const v=150+Math.random()*60|0;x.fillStyle=`rgb(${v},${v},${v})`;x.beginPath();x.arc(q*16+(r%2)*8+8,r*16+4,8,0,Math.PI);x.fill();}}
  const tileT=new THREE.CanvasTexture(tileC);tileT.wrapS=tileT.wrapT=THREE.RepeatWrapping;tileT.repeat.set(1,1);
  const BUMP=LOW?null:stoneB;  const wallM=SM(0xb0a998,{map:stoneT,bumpMap:BUMP,bumpScale:.04,roughness:.9}), wallD=SM(0x857e72,{map:stoneT,bumpMap:BUMP,bumpScale:.05,roughness:.93}), wallL=SM(0xcac2b2,{map:stoneT,bumpMap:BUMP,bumpScale:.04,roughness:.88}); [wallM,wallD,wallL].forEach(m=>m.userData.uvk=.26);
  const slateM=SM(0x3c404a,{map:tileT,roughness:.65,metalness:.1}), roofR=SM(0x7d3f2c,{map:tileT,roughness:.75}), roofB=SM(0x4a5361,{map:tileT,roughness:.7}); [slateM,roofR,roofB].forEach(m=>m.userData.uvk=.5);
  const winM=new THREE.MeshStandardMaterial({color:0x2a1a10,emissive:0xffa24a,emissiveIntensity:1.6});
  const woodM=SM(0x4e3726,{map:TX.wood,roughness:.88}), woodD=SM(0x33241a,{map:TX.wood,roughness:.92}), ironM=SM(0x3a3c40,{roughness:.5,metalness:.6});
  const flagM=new THREE.MeshStandardMaterial({color:0xd49a3a,side:THREE.DoubleSide,roughness:.7}), flagE=new THREE.MeshStandardMaterial({color:0x8a1c16,side:THREE.DoubleSide,roughness:.7});
  const rockT=srgb(canvasTex(256,(x,s)=>{x.fillStyle='#8a8781';x.fillRect(0,0,s,s);
    for(let i=0;i<60;i++){const cx=Math.random()*s,cy=Math.random()*s,r=10+Math.random()*50,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const v=Math.random()<.5?'60,58,55':'165,160,150';g.addColorStop(0,`rgba(${v},.3)`);g.addColorStop(1,`rgba(${v},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}
    for(let i=0;i<9000;i++){const v=90+Math.random()*100|0;x.fillStyle=`rgba(${v},${v-2},${v-6},.35)`;x.fillRect(Math.random()*s,Math.random()*s,1.5,1.5);}
    for(let i=0;i<14;i++){x.strokeStyle=`rgba(35,33,30,${.3+Math.random()*.3})`;x.lineWidth=.8+Math.random();x.beginPath();let px=Math.random()*s,py=Math.random()*s;x.moveTo(px,py);for(let k=0;k<6;k++){px+=rnd(-22,22);py+=rnd(-22,22);x.lineTo(px,py);}x.stroke();}}));
  const rockM=SM(0x9a978f,{map:rockT,roughness:.96}), rockD=SM(0x6e6b65,{map:rockT,roughness:.96}); rockM.userData.uvk=rockD.userData.uvk=.12;
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
  const peakGeo=(()=>{const g=weld(new THREE.ConeGeometry(1,1,28,18)),p=g.attributes.position,c=new Float32Array(p.count*3),sd=Math.random()*50;
    for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const k=.5-y, r=Math.hypot(x,z)||1e-4;
      const ridge=1-Math.abs(vn(x*3+sd,y*4,z*3)); const n=fbm(x*2.2+sd,y*2.6,z*2.2)*.35+ridge*.18;
      const s=1+n*(k*.9+.15); x*=s; z*=s; y+=fbm(x*4,y*3+sd,z*4,3)*.05;
      p.setXYZ(i,x,y,z); const t=Math.min(1,Math.max(0,(y+.5))), v=.55+.35*t+n*.35; c[i*3]=v*1.02;c[i*3+1]=v;c[i*3+2]=v*.96;}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();return withUV(g);})();
  const peakM=SM(0x8c877f,{map:rockT,roughness:.95,vertexColors:true}), peakD=SM(0x68645e,{map:rockT,roughness:.95,vertexColors:true}); peakM.userData.uvk=peakD.userData.uvk=.06;
  const peak=(x,z,r,h,m)=>{const o=new THREE.Mesh(peakGeo,m===rockD?peakD:peakM);o.position.set(x,h/2-1+MAPK.heightAt(x,z)*.6,z);o.scale.set(r,h,r*rnd(.8,1.2));o.rotation.y=rnd(0,6);o.receiveShadow=true;scene.add(o);};
  for(let i=0;i<34;i++){const a=Math.PI*.5+i/33*Math.PI, R=rnd(118,150);peak(Math.cos(a)*R-20,Math.sin(a)*R*.9,rnd(18,30),rnd(45,95),i%2?rockM:rockD);}
  for(let i=0;i<26;i++){const a=-Math.PI*.5+i/25*Math.PI, R=rnd(125,160);peak(Math.cos(a)*R+10,Math.sin(a)*R*.9,rnd(18,32),rnd(30,70),i%2?rockM:rockD);}
  // หน้าผาหินข้างสนาม
  const ROCKS=[0,1,2,3].map(v=>{const g=weld(new THREE.IcosahedronGeometry(1,LOW?3:4)),p=g.attributes.position,c=new Float32Array(p.count*3),sd=v*17.3;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const ridge=1-Math.abs(vn(x*2.2+sd,y*2.2,z*2.2));
      let n=fbm(x*1.4+sd,y*1.4,z*1.4)*.5+ridge*ridge*.22+fbm(x*6+sd,y*6,z*6,3)*.08; n+=Math.round(y*5+fbm(x,y,z,2)*2)*.012;
      let s=1+n; let nx=x*s,ny=y*s*(.75+v*.12),nz=z*s; if(ny<-.3)ny=-.3+(ny+.3)*.2; p.setXYZ(i,nx,ny,nz);
      const cr=.62+n*.9, top=Math.max(0,y)*.22; const moss=Math.max(0,y-.45)*1.2*Math.max(0,fbm(x*3,y*3+sd,z*3,2)+.2);
      c[i*3]=Math.min(1.2,cr+top)*(1-moss*.25);c[i*3+1]=Math.min(1.2,cr+top)*(1-moss*.05);c[i*3+2]=Math.min(1.2,cr+top)*(.97-moss*.35);}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();return withUV(g);});
  rockM.flatShading=rockD.flatShading=false; rockM.vertexColors=rockD.vertexColors=true;
  MAPK.debGeo=ROCKS; MAPK.debM=SM(0x6a645c,{map:rockT,roughness:.95,vertexColors:true});
  const rock=(x,z,sx,sy,sz,m)=>{const r=new THREE.Mesh(pick(ROCKS),m||rockM);r.position.set(x,sy*.3+MAPK.heightAt(x,z),z);r.scale.set(sx,sy,sz);r.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.2,.2));r.receiveShadow=true;scene.add(r);};
  [[0,36],[16,40],[-14,38],[30,35],[6,-36],[-12,-38],[24,-37],[44,32],[44,-34]].forEach(([x,z],i)=>{rock(x,z,rnd(6,10),rnd(6,12),rnd(5,8),i%2?rockM:rockD);rock(x+rnd(-5,5),z+Math.sign(z)*rnd(4,7),rnd(5,8),rnd(9,16),rnd(5,7),rockD);});
  for(let i=0;i<(LOW?25:60);i++){const x=rnd(-28,60),z=(Math.random()<.5?-1:1)*rnd(12,32);rock(x,z,rnd(.5,1.4),rnd(.4,1),rnd(.5,1.4));}

  // ---------- ซากสนามรบ: หลุมไหม้ หอกปัก โล่ เกวียนพัง หลักแหลม ----------
  MAPK.burns.forEach(([x,z,r])=>{r*=.8;
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2+rnd(-.3,.3);const m=new THREE.Mesh(pick(ROCKS),rockD);m.position.set(x+Math.cos(a)*r,.05,z+Math.sin(a)*r);m.scale.set(rnd(.25,.5),rnd(.15,.3),rnd(.25,.5));m.rotation.y=rnd(0,6);scene.add(m);}});
  for(let i=0;i<(LOW?30:70);i++){const x=rnd(-28,42),z=rnd(-26,26);P(scene,Y1,woodD,[x,.9,z],[.05,2,.05],[rnd(-.5,.5),0,rnd(-.5,.5)]);}
  for(let i=0;i<(LOW?12:30);i++){const x=rnd(-28,42),z=rnd(-26,26);P(scene,Y1,Math.random()<.5?woodM:ironM,[x,.08,z],[.45,.06,.45],[rnd(-.4,.4),0,rnd(-.4,.4)]);}
  for(let i=0;i<(LOW?3:7);i++){const g=J(scene,rnd(-20,35),0,rnd(-22,22));g.rotation.set(rnd(-.2,.2),rnd(0,6),rnd(-.3,.3));
    P(g,B1,woodM,[0,.7,0],[3,.25,1.6]);P(g,B1,woodM,[1.4,1.1,0],[.2,.8,1.6]);P(g,Y1,woodD,[.8,.5,.9],[.55,.12,.55],[Math.PI/2,0,0]);P(g,Y1,woodD,[-.9,.2,-.95],[.55,.12,.55],[Math.PI/2.4,0,.4]);}
  // แนวหลักไม้แหลมกันม้าหน้ากำแพง
  for(let z=-40;z<=40;z+=2.2){if(Math.abs(z)<9)continue;const x=FX+7+Math.abs(z)*.05;P(scene,Y1,woodD,[x,.9,z],[.12,2.4,.12],[0,0,-.7]);P(scene,Y1,woodD,[x,.9,z+.8],[.12,2.4,.12],[0,0,.7]);}

  // ---------- ค่ายศัตรู ----------
  const EX=46;
  // พื้นผิวไม้กระดาน (ลายเสี้ยน ร่องต่อ ปุ่มไม้) และผ้าใบเต็นท์ (ลายทอ คราบดิน)
  const plankT=srgb(canvasTex(256,(x,s)=>{x.fillStyle='#7a5a3c';x.fillRect(0,0,s,s);const W=32;
    for(let q=0;q<s/W;q++){const v=(Math.random()-.5)*30;x.fillStyle=`rgb(${120+v|0},${88+v|0},${58+v|0})`;x.fillRect(q*W+1,0,W-2,s);
      for(let k=0;k<26;k++){x.strokeStyle=`rgba(50,32,18,${.12+Math.random()*.2})`;x.lineWidth=1;x.beginPath();const xx=q*W+3+Math.random()*(W-6);x.moveTo(xx,0);x.bezierCurveTo(xx+rnd(-3,3),s*.3,xx+rnd(-3,3),s*.6,xx+rnd(-2,2),s);x.stroke();}
      if(Math.random()<.6){const ky=Math.random()*s;x.fillStyle='rgba(40,25,12,.6)';x.beginPath();x.ellipse(q*W+W/2,ky,3,6,0,0,Math.PI*2);x.fill();}
      x.fillStyle='rgba(20,12,6,.8)';x.fillRect(q*W,0,1.5,s);}
    const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=g;x.fillRect(0,0,s,s);}));
  const canvasT=srgb(canvasTex(128,(x,s)=>{x.fillStyle='#b8a888';x.fillRect(0,0,s,s);for(let i=0;i<s;i+=2){x.fillStyle='rgba(0,0,0,.06)';x.fillRect(i,0,1,s);x.fillRect(0,i,s,1);}
    for(let i=0;i<30;i++){const cx=Math.random()*s,cy=Math.random()*s,r=5+Math.random()*20,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(70,55,35,.25)');g.addColorStop(1,'rgba(70,55,35,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}}));
  const plankM=SM(0x9a8a78,{map:plankT,roughness:.9}), beamM=SM(0x6a5846,{map:plankT,roughness:.9}), hideM=SM(0x3e2a1e,{roughness:1,metalness:0}), ropeM=SM(0x8a7a5a,{roughness:1});
  plankM.userData.uvk=.35; beamM.userData.uvk=.5;
  const tentR=SM(0x7a3026,{map:canvasT,roughness:.95}), tentB=SM(0x8e7c5e,{map:canvasT,roughness:.95}), tentD=SM(0x4e2a22,{map:canvasT,roughness:.95});
  [tentR,tentB,tentD].forEach(m=>m.userData.uvk=.25);
  const beam=(g,a,b,t,m)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),L=A.distanceTo(B),o=new THREE.Mesh(B1,m||beamM);o.position.copy(A).add(B).multiplyScalar(.5);o.scale.set(t,L,t);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());o.castShadow=o.receiveShadow=true;g.add(o);return o;};
  const wheel=(g,x,y,z,r,rotY)=>{const w=J(g,x,y,z);w.rotation.y=rotY||0;P(w,new THREE.TorusGeometry(r,r*.12,6,18),beamM,[0,0,0]);P(w,Y1,beamM,[0,0,0],[r*.22,r*.35,r*.22],[Math.PI/2,0,0]);for(let k=0;k<6;k++){const a=k/6*Math.PI;beam(w,[Math.cos(a)*r,Math.sin(a)*r,0],[-Math.cos(a)*r,-Math.sin(a)*r,0],r*.09);}return w;};
  // รั้วซุงปลายแหลม
  for(let z=-30;z<=30;z+=1.1){if(Math.abs(z)<6)continue;const h=rnd(3,4.4),x=EX+rnd(-.25,.25);P(scene,Y1,beamM,[x,h/2,z],[.3,h,.3],[rnd(-.05,.05),0,rnd(-.06,.06)]);P(scene,CN8,beamM,[x,h+.35,z],[.3,.8,.3]);}
  for(let z=-30;z<=30;z+=6){if(Math.abs(z)<6)continue;beam(scene,[EX-.3,1.2,z-3],[EX-.3,1.4,z+3],.18,beamM);beam(scene,[EX-.3,2.6,z-3],[EX-.3,2.8,z+3],.18,beamM);}
  // เต็นท์: ทรงสันจั่วพร้อมเสาและเชือก / เต็นท์กลมผู้บัญชาการ
  const ridgeTent=(x,z,m)=>{const g=J(scene,x,0,z);g.rotation.y=rnd(0,Math.PI);const L=rnd(3,4.4),W=rnd(2.2,3),H=rnd(1.8,2.4);
    const t=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,3,1,false),m);t.rotation.x=-Math.PI/2;t.scale.set(W*.58,L,H*.66);t.position.y=H*.33;t.castShadow=t.receiveShadow=true;g.add(t);
    beam(g,[0,0,-L/2-.1],[0,H*1.02,-L/2-.1],.1);beam(g,[0,0,L/2+.1],[0,H*1.02,L/2+.1],.1);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>beam(g,[0,H,b*L/2],[a*W,0,b*(L/2+.6)],.03,ropeM));};
  const roundTent=(x,z,r,m)=>{const g=J(scene,x,0,z);P(g,new THREE.CylinderGeometry(r,r,1.4,16,1,true),m,[0,.7,0]);P(g,new THREE.ConeGeometry(r*1.08,r*.95,16),m,[0,1.4+r*.47,0]);P(g,Y1,beamM,[0,1.4+r,0],[.08,1.2,.08]);flag(g,0,1.4+r*.95,0,flagE,.6);
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;beam(g,[Math.cos(a)*r,1.3,Math.sin(a)*r],[Math.cos(a)*(r+1.4),0,Math.sin(a)*(r+1.4)],.03,ropeM);}};
  for(let i=0;i<(LOW?7:14);i++)ridgeTent(EX+rnd(6,28),rnd(-24,24),pick([tentR,tentB,tentD]));
  roundTent(EX+22,0,3.2,tentR); if(!LOW){roundTent(EX+26,-14,2.4,tentD);roundTent(EX+26,14,2.4,tentB);}
  // ลังไม้ ถังไม้ กองหอก
  for(let i=0;i<(LOW?8:20);i++){const x=EX+rnd(3,28),z=rnd(-24,24);if(Math.random()<.5)P(scene,B1,plankM,[x,.45,z],[.9,.9,.9],[0,rnd(0,3),0]);else P(scene,Y1,plankM,[x,.55,z],[.42,1.1,.42]);}
  // หอรบล้อเลื่อน: โครงเสาเอียงสอบ ผนังกระดาน หนังสัตว์คลุมด้านหน้า เชิงเทิน สะพานพาดยกขึ้น ล้อซี่
  const siege=(x,z)=>{const g=J(scene,x,0,z);g.rotation.y=-Math.PI/2+rnd(-.15,.15);const H=13,B=2.2,T=1.6;
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>beam(g,[a*B,.8,b*B],[a*T,H,b*T],.35));
    for(let y=1.5;y<H;y+=2.4){const k=(y-.8)/(H-.8),w=B+(T-B)*k;beam(g,[-w,y,-w],[w,y,-w],.22);beam(g,[-w,y,w],[w,y,w],.22);beam(g,[-w,y,-w],[-w,y,w],.22);beam(g,[w,y,-w],[w,y,w],.22);}
    const wall=(sx)=>{const m=new THREE.Mesh(B1,plankM);m.position.set(sx*(B+T)/2,H*.52,0);m.scale.set(.15,H*.9,(B+T)*1.95/2);m.rotation.z=-sx*Math.atan((B-T)/H);m.castShadow=m.receiveShadow=true;g.add(m);};wall(-1);wall(1);
    const front=new THREE.Mesh(B1,beamM);front.position.set(0,H*.5,(B+T)/2+.12);front.scale.set((B+T)*1.95/2,H*.92,.12);front.rotation.x=Math.atan((B-T)/H);front.castShadow=true;g.add(front);
    for(let y=2;y<H-1;y+=2.4)beam(g,[-(B+T)/2,y,(B+T)/2+.22],[(B+T)/2,y,(B+T)/2+.22],.14,beamM);
    P(g,B1,plankM,[0,H,0],[T*2.4,.3,T*2.4]);for(let k=-1;k<=1;k+=2)for(let q=-2;q<=2;q++){P(g,B1,plankM,[q*T*.45,H+.6,k*T*1.15],[T*.3,.9,.2]);P(g,B1,plankM,[k*T*1.15,H+.6,q*T*.45],[.2,.9,T*.3]);}
    const br=J(g,0,H-1.2,T+.2);br.rotation.x=-.25;P(br,B1,plankM,[0,1.6,0],[T*1.8,3.2,.2]);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>wheel(g,a*(B+.25),.95,b*(B-.4),.95,Math.PI/2));
    beam(g,[-(B+.25),.95,-(B-.4)],[-(B+.25),.95,(B-.4)],.18);beam(g,[(B+.25),.95,-(B-.4)],[(B+.25),.95,(B-.4)],.18);
    flag(g,0,H+.8,0,flagE,1.2);};
  siege(EX-7,-15);siege(EX-6,14);if(!LOW)siege(EX+9,-2);
  // เครื่องเหวี่ยงหิน (แขนขยับตอนยิง)
  MAPK.cats=[];
  const trebuchet=(x,z)=>{const g=J(scene,x,0,z);g.rotation.y=-Math.PI/2;const HH=4.2;
    beam(g,[-1.6,.3,-2.6],[-1.6,.3,2.6],.35);beam(g,[1.6,.3,-2.6],[1.6,.3,2.6],.35);beam(g,[-1.6,.3,-2.2],[1.6,.3,-2.2],.3);beam(g,[-1.6,.3,2.2],[1.6,.3,2.2],.3);
    [-1.5,1.5].forEach(sx=>{beam(g,[sx,.4,-1.8],[sx*.9,HH,0],.28);beam(g,[sx,.4,1.8],[sx*.9,HH,0],.28);beam(g,[sx,.4,0],[sx*.9,HH,0],.22);});
    beam(g,[-1.5,HH,0],[1.5,HH,0],.25);
    const arm=J(g,0,HH,0); arm.userData.noMergeTree=true; const A=[];
    const ab=new THREE.Mesh(B1,beamM);ab.scale.set(.28,7.5,.28);ab.position.set(0,1.5,0);ab.castShadow=true;arm.add(ab);
    const cw=new THREE.Mesh(B1,plankM);cw.scale.set(1.6,1.4,1.4);cw.position.set(0,-2.4,0);cw.castShadow=true;arm.add(cw);
    const sl=new THREE.Mesh(Y1,ropeM);sl.scale.set(.04,2.2,.04);sl.position.set(0,5.2,.3);sl.rotation.x=.4;arm.add(sl);
    [ab,cw,sl].forEach(o=>o.userData.noMerge=true);
    arm.rotation.x=-.95; [[-1.6,-2.6],[1.6,-2.6],[-1.6,2.6],[1.6,2.6]].forEach(([a,b])=>wheel(g,a+(a>0?.3:-.3),.6,b*.8,.6,Math.PI/2));
    MAPK.cats.push({p:new THREE.Vector3(x,HH+4,z),arm,t:9});};
  [[EX+10,-10],[EX+11,8],[EX+16,-20],[EX+16,20]].forEach(([x,z])=>trebuchet(x,z));
  // กองไฟในค่าย (ฟืนเรียงกระโจม)
  [[EX+8,-4],[EX+12,10],[EX+20,-14],[EX+22,6]].forEach(([x,z])=>{const g=J(scene,x,0,z);for(let k=0;k<7;k++){const a=k/7*Math.PI*2;beam(g,[Math.cos(a)*.7,0,Math.sin(a)*.7],[0,1.1,0],.12,beamM);}
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;P(g,B1,rockD,[Math.cos(a)*1,.12,Math.sin(a)*1],[.35,.25,.3],[0,a,0]);}
    MAPK.fires.push({gl:glow(g,0xffa040,2.6,[0,.9,0],.9)});glow(g,0xff6a20,5,[0,.3,0],.35);});

  // ---------- ต้นไม้: สนหลายชั้นขอบใบแตก + ไม้ใบพุ่มกลม (ผิวเรียบ มีเงาในพุ่ม) ----------
  const colorize=(g,fn)=>{const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=fn(p.getX(i),p.getY(i),p.getZ(i));c[i*3]=v[0];c[i*3+1]=v[1];c[i*3+2]=v[2];}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;};
  const mergeG=list=>{list=list.map(g=>g.index?g.toNonIndexed():g);let n=0;list.forEach(g=>n+=g.attributes.position.count);const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
    list.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);C.set(g.attributes.color.array,o*3);o+=g.attributes.position.count;});
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('color',new THREE.BufferAttribute(C,3));G.computeBoundingSphere();return G;};
  const pineGeo=(()=>{const parts=[];const tr=new THREE.CylinderGeometry(.12,.22,3,7);tr.translate(0,1.5,0);tr.computeVertexNormals();parts.push(colorize(tr,()=>[.3,.21,.14]));
    for(let L=0;L<4;L++){const r=1.55-L*.32,h=1.8-L*.12,y=1.3+L*1.05;let c=new THREE.ConeGeometry(r,h,10,2,false);const p=c.attributes.position;
      for(let i=0;i<p.count;i++){let x=p.getX(i),yy=p.getY(i),z=p.getZ(i);const a=Math.atan2(z,x), rr=Math.hypot(x,z), t=(yy+h/2)/h;
        const droop=(1-t)*(1-t)*.35*(.6+.4*Math.sin(a*6+L*1.7)); const k=1+(1-t)*.14*Math.sin(a*9+L*2.3);
        p.setXYZ(i,x*k,yy-droop+y,z*k);}
      c.computeVertexNormals();c=colorize(c,(x,yy,z)=>{const t=Math.min(1,Math.max(0,(yy-y+h/2)/h)),rr=Math.hypot(x,z)/r;const v=.42+.35*t+.25*rr;return [.1*v+.01,.19*v+.02,.1*v+.01];});parts.push(c);}
    return mergeG(parts);})();
  const leafGeo=(()=>{const parts=[];const tr=new THREE.CylinderGeometry(.14,.26,2.4,7);tr.translate(0,1.2,0);tr.computeVertexNormals();parts.push(colorize(tr,()=>[.3,.22,.15]));
    [[0,3.2,0,1.3],[.8,2.7,.3,.9],[-.7,2.8,-.2,.95],[.2,2.6,-.8,.85],[-.2,3.8,.3,.8]].forEach(([x,y,z,r],k)=>{let b=weld(new THREE.IcosahedronGeometry(r,1));const p=b.attributes.position;
      for(let i=0;i<p.count;i++){const X=p.getX(i),Y=p.getY(i),Z=p.getZ(i),n=1+fbm(X*2+k,Y*2,Z*2,3)*.35;p.setXYZ(i,X*n+x,Y*n*.85+y,Z*n+z);}
      b.computeVertexNormals();b=colorize(b,(X,Y,Z)=>{const t=Math.min(1,Math.max(0,(Y-y+r)/(2*r)));const v=.45+.55*t;return [v,v,v];});parts.push(b);});
    return mergeG(parts);})();
  const treeM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});
  const NT=LOW?110:220, NL=LOW?40:80, pine=new THREE.InstancedMesh(pineGeo,treeM,NT), leaf=new THREE.InstancedMesh(leafGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),NL);
  const mm=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(), col=new THREE.Color(); let nt=0, nl=0;
  const okSpot=(x,z)=>!(Math.abs(z)<34&&x>FX-4&&x<EX+32)&&!(Math.hypot(x-CX,z-CZ)<40)&&!(x<FX+4&&x>FX-30&&Math.abs(z)<60);
  for(let i=0;i<6000&&(nt<NT||nl<NL);i++){const x=rnd(-110,100),z=rnd(-100,100);if(!okSpot(x,z)||Math.hypot(x/1.2,z)>105)continue;
    const s=rnd(.8,1.6),hy=MAPK.heightAt(x,z)-.1;q.setFromEuler(new THREE.Euler(rnd(-.05,.05),rnd(0,6),rnd(-.05,.05)));mm.compose(ps.set(x,hy,z),q,sc.set(s,s*rnd(.9,1.2),s));
    if(Math.random()<.75&&nt<NT){pine.setMatrixAt(nt,mm);pine.setColorAt(nt,col.setRGB(rnd(.85,1.1),rnd(.85,1.1),rnd(.8,1)));nt++;}
    else if(nl<NL){leaf.setMatrixAt(nl,mm);leaf.setColorAt(nl,col.setHSL(pick([rnd(.06,.1),rnd(.16,.22),rnd(.2,.26)]),rnd(.25,.42),rnd(.15,.24)).convertSRGBToLinear());nl++;}}
  pine.count=nt; leaf.count=nl;
  [pine,leaf].forEach(o=>{o.castShadow=false;o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;scene.add(o);});

  // ---------- หญ้าแห้งและพุ่มไม้ (instanced) ----------
  { const tuftG=new THREE.ConeGeometry(.14,.6,4), NG=LOW?500:1400, tuft=new THREE.InstancedMesh(tuftG,SM(0xffffff),NG); let ng=0;
    for(let i=0;i<6000&&ng<NG;i++){const x=rnd(-90,90),z=rnd(-80,80);const lane=Math.abs(z)<22&&x>-30&&x<60;if(lane&&Math.random()<.85)continue;if(Math.hypot(x-CX,z-CZ)<35)continue;
      q.setFromEuler(new THREE.Euler(rnd(-.35,.35),rnd(0,6),rnd(-.35,.35)));const s=rnd(.6,1.5);mm.compose(ps.set(x,MAPK.heightAt(x,z)+.22*s,z),q,sc.set(s,s*rnd(.8,1.4),s));tuft.setMatrixAt(ng,mm);
      tuft.setColorAt(ng,col.setHSL(rnd(.1,.2),rnd(.25,.45),rnd(.22,.36)).convertSRGBToLinear());ng++;}
    tuft.count=ng;tuft.instanceMatrix.needsUpdate=true;tuft.instanceColor.needsUpdate=true;tuft.receiveShadow=true;scene.add(tuft); }
  // ---------- คบเพลิงบนกำแพง (จุดแสง 1 ครั้งวาด) ----------
  const glowTex=canvasTex(64,(x,s)=>{const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,240,200,1)');g.addColorStop(.25,'rgba(255,170,80,.8)');g.addColorStop(1,'rgba(255,120,40,0)');x.fillStyle=g;x.fillRect(0,0,s,s);});
  { const pts=[]; for(let i=0;i<wpts.length;i++){if(!wpts[i]||!wpts[i+1])continue;const [x0,z0]=wpts[i],[x1,z1]=wpts[i+1];const L=Math.hypot(x1-x0,z1-z0);for(let t=4;t<L;t+=7){const k=t/L;pts.push(x0+(x1-x0)*k+2.6,WH+1.6,z0+(z1-z0)*k);}}
    [[FX+2.8,WH*.55,-GATE+.5],[FX+2.8,WH*.55,GATE-.5],[FX+2.8,WH+5,-3],[FX+2.8,WH+5,3]].forEach(p=>pts.push(...p));
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    const m=new THREE.PointsMaterial({map:glowTex,size:3.2,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffb060});
    const t=new THREE.Points(g,m);scene.add(t);MAPK.torch=m; }
  // ---------- ประกายไฟลอยขึ้น + เถ้าถ่านลอยทั่วสนาม ----------
  { const NE=LOW?90:260, ep=new Float32Array(NE*3), ev=[]; const src=[...MAPK.burns.map(b=>[b[0],b[1]]),[-60,-14],[-88,10],[-52,22],[EX+18,-22],[EX+6,20],[FX,0]];
    for(let i=0;i<NE;i++){const s0=pick(src);ep[i*3]=s0[0]+rnd(-2,2);ep[i*3+1]=rnd(0,14);ep[i*3+2]=s0[1]+rnd(-2,2);ev.push({s:s0,v:rnd(1,3),w:rnd(0,6)});}
    const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(ep,3));
    const em=new THREE.PointsMaterial({map:glowTex,size:.55,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xff9040});
    scene.add(new THREE.Points(eg,em)); MAPK.embers={g:eg,v:ev};
    const NA=LOW?120:320, ap=new Float32Array(NA*3); for(let i=0;i<NA;i++){ap[i*3]=rnd(-40,60);ap[i*3+1]=rnd(0,26);ap[i*3+2]=rnd(-35,35);}
    const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.BufferAttribute(ap,3));
    const am=new THREE.PointsMaterial({color:0x8f8a86,size:.22,transparent:true,opacity:.7,depthWrite:false});
    scene.add(new THREE.Points(ag,am)); MAPK.ash=ag; }
  // ---------- เมฆต่ำลอยช้า ----------
  { const cT=canvasTex(128,(x,s)=>{x.clearRect(0,0,s,s);for(let i=0;i<26;i++){const cx=s*.2+Math.random()*s*.6,cy=s*.35+Math.random()*s*.3,r=12+Math.random()*30,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(90,88,92,.5)');g.addColorStop(1,'rgba(90,88,92,0)');x.fillStyle=g;x.fillRect(0,0,s,s);}});
    MAPK.clouds=[]; for(let i=0;i<(LOW?4:9);i++){const m=new THREE.SpriteMaterial({map:cT,transparent:true,depthWrite:false,opacity:.55});const c=new THREE.Sprite(m);const w=rnd(60,110);c.scale.set(w,w*.45,1);c.position.set(rnd(-140,120),rnd(55,80),rnd(-120,60));scene.add(c);MAPK.clouds.push(c);} }
  // ---------- ควันไฟลอยขึ้นฟ้า (เสาควันเลื่อนพื้นผิวขึ้น) ----------
  // ควัน: ลายควันเลื่อนขึ้น (map) + รูปทรงเสาควันนิ่ง ขอบนุ่ม บานออกด้านบน (alphaMap)
  const smokeT=canvasTex(128,(x,s)=>{x.fillStyle='#3e3a38';x.fillRect(0,0,s,s);for(let i=0;i<90;i++){const cx=Math.random()*s,cy=Math.random()*s,r=8+Math.random()*22,g=x.createRadialGradient(cx,cy,0,cx,cy,r);const v=Math.random()<.5?'95,90,88':'30,28,27';g.addColorStop(0,`rgba(${v},.6)`);g.addColorStop(1,`rgba(${v},0)`);x.fillStyle=g;x.fillRect(0,0,s,s);}});
  smokeT.wrapS=smokeT.wrapT=THREE.RepeatWrapping;
  const shapeT=canvasTex(128,(x,s)=>{const img=x.createImageData(s,s);for(let py=0;py<s;py++)for(let px=0;px<s;px++){const v=1-py/s, w=.12+.3*Math.pow(v,.8), d=Math.abs(px/s-.5)/w;
      const a=Math.exp(-d*d*2.2)*Math.min(1,v*7)*Math.min(1,(1-v)*1.6+.05)*(.75+.25*Math.sin(py*.2+px*.05));const k=(py*s+px)*4;img.data[k]=img.data[k+1]=img.data[k+2]=Math.max(0,Math.min(255,a*400));img.data[k+3]=255;}x.putImageData(img,0,0);});
  shapeT.wrapS=shapeT.wrapT=THREE.ClampToEdgeWrapping;
  const smokeAt=[[-60,-14],[-88,10],[-52,22],[12,-18],[26,15],[-4,20],[EX+18,-22],[EX+6,20]].slice(0,LOW?4:8);
  smokeAt.forEach(([x,z],i)=>{const t=smokeT.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,.6);t.offset.x=Math.random();
    const m=new THREE.SpriteMaterial({map:t,alphaMap:shapeT,transparent:true,depthWrite:false,opacity:.9,fog:true});const s=new THREE.Sprite(m);const h=rnd(24,38);s.scale.set(h*.55,h,1);s.position.set(x,h/2-.5,z);scene.add(s);
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
    if(o.userData.noMerge)return; {let pp=o.parent;while(pp){if(pp.userData&&pp.userData.noMergeTree)return;pp=pp.parent;}}
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if(o.material.userData.uvk&&g.attributes.normal){const k=o.material.userData.uvk,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv;
      for(let i=0;i<pa.count;i+=3){const ax=Math.abs(na.getX(i))+Math.abs(na.getX(i+1)),ay=Math.abs(na.getY(i))+Math.abs(na.getY(i+1)),az=Math.abs(na.getZ(i))+Math.abs(na.getZ(i+1));
        for(let j=i;j<i+3;j++){const x=pa.getX(j),y=pa.getY(j),z=pa.getZ(j);if(ay>=ax&&ay>=az)ua.setXY(j,x*k,z*k);else if(ax>=az)ua.setXY(j,z*k,y*k);else ua.setXY(j,x*k,y*k);}}}
    { g.computeBoundingBox(); const y0=g.boundingBox.min.y, hgt=Math.max(.5,g.boundingBox.max.y-y0), tint=.92+Math.random()*.16, pa=g.attributes.position, ca=new Float32Array(pa.count*3);
      for(let i=0;i<pa.count;i++){const t=(pa.getY(i)-y0), ao=.5+.5*Math.min(1,t/Math.min(3,hgt*.5)), top=1+.08*Math.min(1,t/Math.max(hgt,1)); const v=Math.min(1.2,ao*tint*top); ca[i*3]=v;ca[i*3+1]=v*.99;ca[i*3+2]=v*.97;}
      if(g.attributes.color){const oc=g.attributes.color;for(let i=0;i<pa.count;i++){ca[i*3]*=oc.getX(i);ca[i*3+1]*=oc.getY(i);ca[i*3+2]*=oc.getZ(i);}} g.setAttribute('color',new THREE.BufferAttribute(ca,3)); }
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const key=o.material; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(g); kill.push(o);}));
  kill.forEach(o=>o.parent&&o.parent.remove(o));
  groups.forEach((list,mat)=>{let n=0;list.forEach(g=>n+=g.attributes.position.count);
    const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),C=new Float32Array(n*3);let o=0;
    list.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);C.set(g.attributes.color.array,o*3);o+=g.attributes.position.count;g.dispose();});
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('uv',new THREE.BufferAttribute(U,2));G.setAttribute('color',new THREE.BufferAttribute(C,3));G.computeBoundingSphere();
    mat.vertexColors=true; mat.needsUpdate=true;
    const m=new THREE.Mesh(G,mat);m.receiveShadow=!LOW;m.castShadow=false;scene.add(m);});
  scene.children.slice(MAP0).forEach(r=>r.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)o.castShadow=false;}));
}
// ธงสะบัด ควันลอย ไฟกระพริบ ลูกไฟจากเครื่องยิงหิน
const _bv=new THREE.Vector3();
let _lastT=null;
function mapTick(T){
  const dt=_lastT==null?0:Math.min(.1,T-_lastT); _lastT=T;
  if(MAPK.torch)MAPK.torch.size=3+Math.sin(T*11)*.25+Math.random()*.2;
  if(MAPK.embers){const p=MAPK.embers.g.attributes.position;MAPK.embers.v.forEach((e,i)=>{let y=p.getY(i)+e.v*dt;let x=p.getX(i)+Math.sin(T*1.3+e.w)*dt*.6+dt*.4,z=p.getZ(i)+Math.cos(T*1.1+e.w)*dt*.5;
    if(y>16){y=0;x=e.s[0]+(Math.random()-.5)*4;z=e.s[1]+(Math.random()-.5)*4;}p.setXYZ(i,x,y,z);});p.needsUpdate=true;}
  if(MAPK.ash){const p=MAPK.ash.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i)+dt*(1.2+Math.sin(i)*.4),y=p.getY(i)-dt*(.5+(i%5)*.1),z=p.getZ(i)+Math.sin(T*.7+i)*dt*.3;if(y<0||x>65){y=20+Math.random()*8;x=-40+Math.random()*30;}p.setXYZ(i,x,y,z);}p.needsUpdate=true;}
  (MAPK.clouds||[]).forEach((c,i)=>{c.position.x+=dt*(1.2+i*.1);if(c.position.x>160)c.position.x=-160;});
  MAPK.flags.forEach((f,i)=>{f.rotation.y=Math.sin(T*2.2+i)*.35;});
  MAPK.fires.forEach((f,i)=>{f.gl.scale.setScalar(f.gl.userData.s0||(f.gl.userData.s0=f.gl.scale.x));f.gl.scale.multiplyScalar(.9+Math.sin(T*9+i*3)*.08+Math.random()*.06);});
  MAPK.smokes.forEach(s=>{s.t.offset.y=-T*s.sp;s.fire.scale.setScalar(3.4+Math.sin(T*8+s.ph)*.5+Math.random()*.4);});
  // เครื่องเหวี่ยงหิน: แขนเหวี่ยง -> ปล่อยก้อนหินติดไฟ -> ตกระเบิด
  const dt2=Math.min(.05,dt||1/60);
  (MAPK.cats||[]).forEach(c=>{c.t+=dt2;const t=c.t;
    {const e=Math.min(1,Math.max(0,(t-.38)/3.1));c.arm.rotation.x=t<.38?-.95+2.45*Math.pow(t/.38,2):1.5-2.45*e*e*(3-2*e);}
    if(c.fire&&t>=.3){c.fire=false;launch(c);}});
  if(T>MAPK.nextBall&&MAPK.cats&&MAPK.cats.length){MAPK.nextBall=T+(LOW?5:2.8)+Math.random()*3;const c=MAPK.cats[Math.floor(Math.random()*MAPK.cats.length)];if(c.t>3.5){c.t=0;c.fire=true;}}
  for(let i=MAPK.balls.length-1;i>=0;i--){const o=MAPK.balls[i];o.t+=dt2;const k=Math.min(1,o.t/o.d);
    _bv.lerpVectors(o.from,o.to,k);_bv.y+=Math.sin(k*Math.PI)*o.arc;o.m.position.copy(_bv);o.m.rotation.x+=dt2*6;o.m.rotation.z+=dt2*4;
    o.trail-=dt2;if(o.trail<=0){o.trail=LOW?.1:.04;fireSprite(_bv.clone(),new THREE.Vector3((Math.random()-.5)*.4,.6,(Math.random()-.5)*.4),.55,1.1,{grav:0,grow:2});if(Math.random()<.5)fireSprite(_bv.clone(),new THREE.Vector3(0,.8,0),1.6,1,{smoke:true,grav:.2,grow:3.5});}
    if(k>=1){scene.remove(o.m);MAPK.balls.splice(i,1);boom(o.to);}}
  // เศษหินกระเด็น
  for(let i=MAPK.debris.length-1;i>=0;i--){const d=MAPK.debris[i];d.life-=dt2;d.v.y-=18*dt2;d.m.position.addScaledVector(d.v,dt2);d.m.rotation.x+=d.r*dt2;d.m.rotation.y+=d.r*.7*dt2;
    const gy=d.floor;if(d.m.position.y<gy){d.m.position.y=gy;d.v.y*=-.3;d.v.x*=.6;d.v.z*=.6;d.r*=.5;}
    if(d.life<=0){scene.remove(d.m);MAPK.debris.splice(i,1);}}

}

// ยิงก้อนหินติดไฟจากเครื่องเหวี่ยง
function launch(c){
  const from=c.p.clone(), r=Math.random(), to=new THREE.Vector3();
  if(r<.55)to.set(-34+Math.random()*2,5+Math.random()*8,(Math.random()-.5)*56);        // กำแพงเมือง
  else if(r<.8)to.set(-50-Math.random()*40,3+Math.random()*10,(Math.random()-.5)*40);  // ในเมือง
  else to.set(-26+Math.random()*24,0,(Math.random()-.5)*30);                           // ทุ่งหน้ากำแพง
  const m=new THREE.Mesh(MAPK.debGeo[0],MAPK.debM);m.scale.setScalar(.55);m.castShadow=true;scene.add(m);
  glow(m,0xff9a40,5,[0,0,0],.9);
  MAPK.balls.push({m,from,to,t:0,d:2.6+Math.random()*1,arc:22+Math.random()*10,trail:0});
  for(let j=0;j<6;j++)fireSprite(from.clone(),new THREE.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2),.5,.9,{grav:0,grow:2});
}
// ระเบิดตอนกระทบ: แสงวาบ ลูกไฟพองตัว ควันดำ เศษหินกระเด็น คลื่นฝุ่น รอยไหม้ สั่นกล้องถ้าอยู่ใกล้
function boom(p){
  const ground=p.y<1.2;
  try{const l=takeLight(0xffa860,26);l.position.copy(p).setY(p.y+2);tween(.6,k=>{l.intensity=14*(1-k)*(1-k);}).then(()=>freeLight(l));}catch(e){}
  const core=glow(scene,0xfff0c8,1,[p.x,p.y+.5,p.z],1);tween(.6,k=>{core.scale.setScalar(3+k*12);core.material.opacity=1-k*k;},t=>t).then(()=>scene.remove(core));
  const nF=LOW?8:18, nS=LOW?3:8, nD=LOW?4:10;
  for(let j=0;j<nF;j++){const a=Math.random()*Math.PI*2,sp=2+Math.random()*5;fireSprite(p.clone(),new THREE.Vector3(Math.cos(a)*sp,1.5+Math.random()*5,Math.sin(a)*sp),.6+Math.random()*.5,1.2+Math.random()*1.2,{grav:-1.5,grow:3.2});}
  for(let j=0;j<nS;j++)fireSprite(p.clone().add(new THREE.Vector3((Math.random()-.5)*2,Math.random(),(Math.random()-.5)*2)),new THREE.Vector3((Math.random()-.5)*1.5,1.2+Math.random()*1.5,(Math.random()-.5)*1.5),3.2+Math.random()*1.5,2.2+Math.random(),{smoke:true,grav:.2,grow:4.5});
  particles(p.clone().setY(p.y+.3),0xffd27a,LOW?6:14,3.5,.06,1.4);
  for(let j=0;j<nD;j++){const m=new THREE.Mesh(MAPK.debGeo[j%4],MAPK.debM);m.scale.setScalar(.12+Math.random()*.25);m.position.copy(p);scene.add(m);
    const a=Math.random()*Math.PI*2,sp=3+Math.random()*6;MAPK.debris.push({m,v:new THREE.Vector3(Math.cos(a)*sp,3+Math.random()*7,Math.sin(a)*sp),r:(Math.random()-.5)*14,life:2.5+Math.random(),floor:.08});}
  const gp=ground?p.clone():new THREE.Vector3(p.x+2.5,0,p.z);
  shockRing(gp.clone().setY(.05),0xc8b898); if(ground)scorch(gp,2.4);
  particles(gp.clone().setY(.2),0xa89878,LOW?8:18,2.6,.3,-.2,.5);
  const d=Math.hypot(p.x-LOOK.x,p.z-LOOK.z); if(d<40)shake=Math.max(shake,.22*(1-d/40));
}
