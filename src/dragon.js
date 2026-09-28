/* ================= อามาเทรุ มังกรอัมพรเพลิง (โมเดล Meshy + โครงกระดูกที่สร้างเอง) ================= */
let DRAGON=null;
const WING_X=2.1, WING_Z=1.35, DRAGON_S=2.6; // ปีกยาวขึ้น 2.1 เท่า กว้างขึ้น 1.35 เท่า ตัวใหญ่ 2.2
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
      const wingW=(ax,y)=>ss(.17,.32,ax)*ss(-.38,-.12,y);
      // แนวกลางลำตัว (y ตามตำแหน่ง z) และแนวปีก (y,z ตามระยะออกข้าง) คำนวณจากตัวโมเดลเอง
      const NZ=40, zlo=[],zhi=[],zc=new Array(NZ).fill(0);for(let b=0;b<NZ;b++){zlo[b]=1e9;zhi[b]=-1e9;}
      const NA=10, wy=new Array(NA).fill(0), wz=new Array(NA).fill(0), wc=new Array(NA).fill(0);
      for(let i=0;i<n;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ax=Math.abs(x);
        if(ax<.14){const b=Math.min(NZ-1,Math.max(0,Math.floor((z+1)/2*NZ)));zlo[b]=Math.min(zlo[b],y);zhi[b]=Math.max(zhi[b],y);zc[b]++;}
        if(wingW(ax,y)>.5){const b=Math.min(NA-1,Math.max(0,Math.floor((ax-.17)/.083)));wy[b]+=y;wz[b]+=z;wc[b]++;}}
      const cy=zc.map((c,b)=>c?(zlo[b]+zhi[b])/2:null); for(let b=0;b<NZ;b++)if(cy[b]==null){let l=b,r=b;while(l>=0&&cy[l]==null)l--;while(r<NZ&&cy[r]==null)r++;cy[b]=l<0?cy[r]:r>=NZ?cy[l]:(cy[l]+cy[r])/2;}
      const cyAt=z=>{const f=Math.min(NZ-1.001,Math.max(0,(z+1)/2*NZ-.5)),b=Math.floor(f);return cy[b]+(cy[Math.min(NZ-1,b+1)]-cy[b])*(f-b);};
      const wAt=(ax,arr)=>{const f=Math.min(NA-1.001,Math.max(0,(ax-.17)/.083-.5)),b=Math.floor(f),v=k=>wc[k]?arr[k]/wc[k]:0;return v(b)+(v(Math.min(NA-1,b+1))-v(b))*(f-b);};
      // โครงกระดูก 30 ชิ้น
      const RIG=[]; const bone=(name,parent,p)=>{RIG.push({name,parent,p});return RIG.length-1;};
      const AXZ=[['t6',-.95],['t5',-.8],['t4',-.65],['t3',-.5],['t2',-.35],['t1',-.2],['hips',-.05],['sp',.12],['chest',.28],['n1',.44],['n2',.54],['n3',.62],['n4',.7],['head',.78]];
      const AXI={};
      AXI.hips=bone('hips',-1,[0,cyAt(-.05),-.05]);
      AXI.sp=bone('sp',AXI.hips,[0,cyAt(.12),.12]); AXI.chest=bone('chest',AXI.sp,[0,cyAt(.28),.28]);
      let pv=AXI.chest; ['n1','n2','n3','n4','head'].forEach(k=>{const z=AXZ.find(a=>a[0]===k)[1];AXI[k]=bone(k,pv,[0,cyAt(z),z]);pv=AXI[k];});
      AXI.jaw=bone('jaw',AXI.head,[0,cyAt(.78)-.06,.82]);
      pv=AXI.hips; ['t1','t2','t3','t4','t5','t6'].forEach(k=>{const z=AXZ.find(a=>a[0]===k)[1];AXI[k]=bone(k,pv,[0,cyAt(z),z]);pv=AXI[k];});
      const WA=[.19,.36,.54,.72], WB={L:[],R:[]};
      ['L','R'].forEach(sd=>{const sx=sd==='L'?-1:1;let p=AXI.chest;WA.forEach((a,k)=>{const yy=k?wAt(a,wy):.14,zz=k?wAt(a,wz):.26;p=bone('w'+sd+(k+1),p,[sx*a,yy,zz]);WB[sd].push(p);});});
      // ขา 2 ท่อน: ต้นขา/ไหล่ และ เข่า/ศอก (ตำแหน่งวัดจากโมเดล)
      const LG={};[['F',-1,'L'],['F',1,'R'],['B',-1,'L'],['B',1,'R']].forEach(([fb,sx,sd])=>{
        const par=fb==='F'?AXI.chest:AXI.hips, top=fb==='F'?[sx*.13,-.25,.38]:[sx*.12,-.25,-.02], knee=fb==='F'?[sx*.14,-.4,.38]:[sx*.13,-.45,-.05];
        LG[fb+sd]=bone(fb+sd,par,top); LG[fb+sd+'k']=bone(fb+sd+'k',LG[fb+sd],knee);});
      const AXB=AXZ.map(a=>[AXI[a[0]],a[1]]);
      for(let i=0;i<n;i++){
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ax=Math.abs(x),L=x<0;
        const w={}; const add=(k,v)=>{if(v>0)w[k]=(w[k]||0)+v;};
        const wing=wingW(ax,y);
        if(wing>0){const B=WB[L?'L':'R'];let k=0;while(k<WA.length-1&&ax>WA[k+1])k++;
          if(k>=WA.length-1)add(B[k],wing);else{const t=Math.min(1,Math.max(0,(ax-WA[k])/(WA[k+1]-WA[k])));add(B[k],wing*(1-t));add(B[k+1],wing*t);}}
        let r=1-wing;
        const legB=ss(-.2,-.3,y)*ss(-.34,-.26,z)*(1-ss(.1,.16,z))*ss(.04,.08,ax)*(1-ss(.26,.32,ax))*r;
        const legF=ss(-.2,-.3,y)*ss(.22,.28,z)*(1-ss(.64,.7,z))*ss(.03,.07,ax)*(1-ss(.26,.32,ax))*r;
        const kB=ss(-.38,-.48,y), kF=ss(-.34,-.42,y), sd=L?'L':'R';
        add(LG['B'+sd],legB*(1-kB)); add(LG['B'+sd+'k'],legB*kB); add(LG['F'+sd],legF*(1-kF)); add(LG['F'+sd+'k'],legF*kF); r-=legB+legF;
        // แกนลำตัว: ถ่วงแบบเส้นตรงระหว่างกระดูกสองชิ้นที่ใกล้ที่สุด ทำให้โค้งเนียน
        let k=0; while(k<AXB.length-1&&z>AXB[k+1][1])k++;
        let ia,ib,t;
        if(z<=AXB[0][1]){ia=ib=AXB[0][0];t=0;} else if(k>=AXB.length-1){ia=ib=AXB[AXB.length-1][0];t=0;}
        else{ia=AXB[k][0];ib=AXB[k+1][0];t=(z-AXB[k][1])/(AXB[k+1][1]-AXB[k][1]);}
        const jw=ss(.74,.8,z)*ss(-.17,-.24,y);
        const put=(bi,v)=>{if(bi===AXI.head){add(AXI.jaw,v*jw);add(AXI.head,v*(1-jw));}else add(bi,v);};
        put(ia,r*(1-t)); put(ib,r*t);
        const idx=Object.entries(w).map(([k2,v])=>[v,+k2]).sort((a,b)=>b[0]-a[0]).slice(0,4); const sum=idx.reduce((a,b)=>a+b[0],0)||1;
        idx.forEach(([v,k2],jj)=>{SI[i*4+jj]=k2;SW[i*4+jj]=v/sum;});
      }
      // ขยายปีกให้กางกว้าง (ยืดจากโคนปีก)
      const stretch=(x,y,z,wg)=>{const ax=Math.abs(x),sx=Math.sign(x)||1,rx=.19,ex=Math.max(0,ax-rx);
        return [sx*(rx+ex*(1+(WING_X-1)*wg)), y+ex*(WING_X-1)*wg*.12, .26+(z-.26)*(1+(WING_Z-1)*wg*ss(.2,.5,ax))];};
      for(let i=0;i<n;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),wg=wingW(Math.abs(x),y);if(wg<=0)continue;const q=stretch(x,y,z,wg);pos.setXYZ(i,q[0],q[1],q[2]);}
      RIG.forEach(b=>{if(/^w[LR]/.test(b.name))b.p=stretch(b.p[0],b.p[1],b.p[2],1);});
      pos.needsUpdate=true; geo.computeVertexNormals(); geo.computeBoundingBox();
      geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));
      geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
      geo.userData.rig=RIG;
      const mat=mesh.material.clone(); mat.skinning=true; if(ENV){mat.envMap=ENV;mat.envMapIntensity=.5;}
      mat.emissive=new THREE.Color(0xff5a1a); mat.emissiveIntensity=.0; mat.emissiveMap=mat.map;
      DRAGON={geo,mat,rig:RIG,minY:geo.boundingBox.min.y};
      res(DRAGON);
    },undefined,()=>res(null));
  });
}
function buildDragon(){
  const w=new THREE.Group(), m=new THREE.Group(); w.add(m);
  const hover=new THREE.Group(); m.add(hover);
  const B=DRAGON.rig.map(()=>new THREE.Bone()), N={};
  DRAGON.rig.forEach((d,i)=>{const b=B[i];b.name=d.name;N[d.name]=b;const pp=d.parent<0?[0,0,0]:DRAGON.rig[d.parent].p;b.position.set(d.p[0]-pp[0],d.p[1]-pp[1],d.p[2]-pp[2]);if(d.parent>=0)B[d.parent].add(b);});
  const mesh=new THREE.SkinnedMesh(DRAGON.geo,DRAGON.mat.clone()); mesh.material.skinning=true;
  mesh.add(B[0]); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(B)); mesh.castShadow=true; mesh.receiveShadow=true; mesh.frustumCulled=false;
  const S=DRAGON_S; hover.scale.setScalar(S); hover.add(mesh);
  const baseY=-DRAGON.minY*S;
  m.userData.dragon=true; m.userData.mats=[mesh.material];
  const st={fly:1,flapAmp:.55,flapSpd:1,rear:0,lunge:0,fold:0,breath:0,headDown:0,dead:0,spread:0,rise:0,jaw:0,
    legF:0,clawL:0,clawR:0,tailWhip:0,roar:0,droop:0,bank:0,look:0,recoil:0};
  const neck=[N.n1,N.n2,N.n3,N.n4], tail=[N.t1,N.t2,N.t3,N.t4,N.t5,N.t6], WL=[N.wL1,N.wL2,N.wL3,N.wL4], WR=[N.wR1,N.wR2,N.wR3,N.wR4];
  const R={body:N.hips,chest:N.chest,neck:N.n1,neck1:N.n1,neck2:N.n3,head:N.head,jaw:N.jaw,tail1:N.t1,wl1:N.wL1,wr1:N.wR1,st,tg:Object.assign({},st),rate:{}};
  m.userData.rig=R;
  { const g=glow(N.head,0xffa040,.7,[0,-.05,.16],0); g.material.opacity=0; m.userData.mouthGlow=g; }
  // สปริงทุกข้อต่อ: ปลายโซ่ (หาง ปลายปีก คอ) นิ่มกว่า จะตามช้าและเหวี่ยงเลยนิดหน่อย = พลิ้ว
  const SP=[]; const spring=(b,k,z)=>{const s={b,k,c:2*Math.sqrt(k)*(z||1),t:new THREE.Vector3(),v:new THREE.Vector3(),r:new THREE.Vector3()};b.userData.sp=s;SP.push(s);return s;};
  spring(N.hips,140);spring(N.sp,110);spring(N.chest,110);
  neck.forEach((b,i)=>spring(b,90-i*14,.8)); spring(N.head,70,.75); spring(N.jaw,160);
  tail.forEach((b,i)=>spring(b,70-i*9,.62));
  [WL,WR].forEach(ws=>ws.forEach((b,i)=>spring(b,[260,150,90,55][i],[.9,.75,.6,.5][i])));
  [N.FL,N.FR,N.BL,N.BR].forEach(b=>spring(b,80,.65)); [N.FLk,N.FRk,N.BLk,N.BRk].forEach(b=>spring(b,55,.55));
  const T3=(b,x,y,z)=>b.userData.sp.t.set(x,y,z);
  let ph=Math.random()*6, lastT=null, lookY=0,lookX=0,lookT=0,lookTY=0,lookTX=0, stretchT=4+Math.random()*4, stretchK=0;
  const lastP=new THREE.Vector3(), lastYaw={v:null}; let turnV=0, fwdV=0;
  m.userData.idle=T=>{
    const dt=lastT==null?0:Math.min(.1,T-lastT); lastT=T; const gdt=dt*(typeof SPEED!=='undefined'?SPEED*HS:1);
    for(const k in R.tg){const r=R.rate[k]||4;st[k]+=(R.tg[k]-st[k])*Math.min(1,gdt*r*3.2);}
    // ความเร็วจริงของตัว (ใช้ทำแรงเฉื่อย: หางลาก ตัวเอียง)
    const W=w; if(lastYaw.v==null){lastYaw.v=W.rotation.y;lastP.copy(W.position);}
    if(gdt>0){let dy=W.rotation.y-lastYaw.v;dy=Math.atan2(Math.sin(dy),Math.cos(dy));turnV+=(dy/gdt-turnV)*Math.min(1,gdt*6);
      const dv=W.position.clone().sub(lastP);fwdV+=((dv.x*Math.sin(W.rotation.y)+dv.z*Math.cos(W.rotation.y))/gdt-fwdV)*Math.min(1,gdt*5);}
    lastYaw.v=W.rotation.y; lastP.copy(W.position);
    // มองซ้ายขวาเป็นระยะ + ยืดปีกเล่นเวลาว่าง
    lookT-=gdt; if(lookT<=0){lookT=1.2+Math.random()*2.5;lookTY=(Math.random()-.5)*.9;lookTX=(Math.random()-.5)*.35;}
    lookY+=(lookTY-lookY)*Math.min(1,gdt*2.5); lookX+=(lookTX-lookX)*Math.min(1,gdt*2.5);
    const calm=Math.max(0,1-st.rear-st.lunge-st.roar-st.breath-st.fold-Math.abs(st.tailWhip)-st.droop);
    stretchT-=gdt; if(stretchT<=0){stretchT=6+Math.random()*6;stretchK=1;} stretchK=Math.max(0,stretchK-gdt*.6);
    const stretchA=Math.sin(Math.min(1,1-stretchK)*Math.PI)*calm*(stretchK>0?1:0);
    // จังหวะปีก: ตีลงเร็ว ยกขึ้นช้า
    ph+=gdt*(5.2*st.flapSpd*(1-st.droop*.6)*(1-stretchA*.5));
    const sp=ph+.5*Math.sin(ph), fl=Math.sin(sp), vel=Math.cos(sp), up=Math.max(0,-vel);
    const amp=st.flapAmp*(1-st.fold)*(1-st.droop*.7)*(1-stretchA*.6), open=.38-st.fold*1.3+(st.spread+stretchA*.8)*.3-st.droop*.5;
    const sweep=st.fold*.75-(st.spread+stretchA)*.25;
    WL.forEach((b,i)=>{const lag=i*.75, a=[open+fl*amp, Math.sin(sp-lag)*amp*.55+up*amp*.3-st.fold*.7+(st.spread+stretchA)*.12, Math.sin(sp-lag)*amp*.5+up*amp*.25-st.fold*.5+stretchA*.1, Math.sin(sp-lag)*amp*.45-st.fold*.3][i];
      const tw=vel*amp*.18*(i+1)/4, sy=i===0?sweep-up*.14*amp:(st.fold*.4-stretchA*.1)*(i<3?1:.5)+Math.sin(sp-lag-.5)*.1*amp;
      T3(b,tw,sy,-a); T3(WR[i],tw,-sy,a);});
    // ลำตัว: ขึ้นลงตามปีก เอียงตามการเลี้ยว ก้มตามความเร็ว
    const lift=st.fly*(.9+(-Math.sin(sp-.6))*.18*st.flapAmp/.55)+st.rise+Math.sin(T*.9)*.05;
    hover.position.y=baseY+lift*(1-st.dead)-st.droop*.25;
    hover.position.x=Math.sin(T*.6)*.06*calm; 
    const lean=Math.min(.35,Math.max(-.2,fwdV*.06)), bank=st.bank*.35-turnV*.12;
    T3(N.hips,-st.rear*.3+st.lunge*.18+lean*.5+Math.sin(sp+2)*.04*st.fly+st.dead*.25+st.droop*.12-st.recoil*.12, 0, bank);
    T3(N.sp,-st.rear*.2+st.lunge*.1+Math.sin(sp+1.6)*.03, turnV*.05, bank*.4);
    T3(N.chest,-st.rear*.25+st.lunge*.1+Math.sin(sp+1.2)*.04-st.recoil*.12, turnV*.06, bank*.2);
    // คอเป็นตัว S หัวพยายามตั้งตรง
    const nx=st.rear*.14-st.lunge*.1+st.headDown*.12-st.roar*.15+st.droop*.16+st.recoil*.12-lean*.2+lookX*.3;
    const ny=lookY*.25*calm+st.look*.25-turnV*.08, wav=Math.sin(T*1.3);
    neck.forEach((b,i)=>T3(b,nx+wav*.03*(i%2?1:-1)+Math.sin(sp-.8-i*.4)*.03*st.fly, ny, Math.sin(T*.9-i*.5)*.03));
    T3(N.head,-nx*1.8+st.headDown*.2+st.roar*.2+st.droop*.25-st.recoil*.2+lookX*.4, ny*.8, Math.sin(T*16)*st.roar*.2+Math.sin(T*3)*st.droop*.15);
    T3(N.jaw,Math.max(st.jaw,st.roar*.9,st.breath*.55)*.65+Math.max(0,Math.sin(T*.9))*.05,0,0);
    // หาง: คลื่นเดินทาง + ลากตามการเลี้ยว + ฟาดหาง
    const tw=st.tailWhip;
    tail.forEach((b,i)=>T3(b,(i===0?.08:.04)+Math.sin(ph*.8-i*.7)*.05*st.fly-st.rear*.08+lean*.08+st.droop*.04,
      Math.sin(T*1.5-i*.6)*(.1+i*.03)*(1-Math.abs(tw))+tw*(.22+i*.06)+turnV*.1*(i+1)*.3, Math.sin(T*1.1-i*.5)*.04));
    // ขา
    // ขาหน้า: ตอนบินพายขึ้นลงตามจังหวะปีก / ยื่นตะปบ / พับเก็บตอนพุ่ง
    const pad=Math.sin(sp*.5), pad2=Math.sin(sp*.5+Math.PI);
    const tuck=Math.min(1,Math.max(0,lean*2.2))*(1-st.legF);
    [['L',st.clawL,pad,-1],['R',st.clawR,pad2,1]].forEach(([sd,cl,pd,sx])=>{
      T3(N['F'+sd],-.05+pd*.3*calm+st.legF*1.1+cl*1.3-tuck*.9+st.rear*.5-st.droop*.3+st.roar*.4, 0, sx*(.12+cl*.45+st.roar*.25));
      T3(N['F'+sd+'k'],.15+pd*.35*calm-st.legF*.6-cl*.8+tuck*.6+st.roar*-.3+st.droop*.3,0,0);});
    // ขาหลัง: ห้อยแกว่งสลับกัน / ลากไปด้านหลังตอนพุ่ง / ยื่นลงตอนจะลงพื้น
    [['L',0,-1],['R',Math.PI*.7,1]].forEach(([sd,o,sx])=>{
      const sw=Math.sin(T*1.4+o)*.22*calm+Math.sin(sp*.5+o)*.12;
      T3(N['B'+sd],.05+sw+lean*1.3-st.rear*.7+st.lunge*.4+st.dead*.3, 0, sx*(.1+st.spread*.1));
      T3(N['B'+sd+'k'],-.1-sw*.6-lean*.4+st.rear*.3+st.droop*.2,0,0);});
    // ขยับสปริง (แบ่งช่วงย่อยให้เสถียร)
    const n=Math.max(1,Math.ceil(gdt/(1/90))), h=gdt/n;
    for(let s=0;s<n;s++)SP.forEach(q=>{q.v.x+=((q.t.x-q.r.x)*q.k-q.v.x*q.c)*h;q.v.y+=((q.t.y-q.r.y)*q.k-q.v.y*q.c)*h;q.v.z+=((q.t.z-q.r.z)*q.k-q.v.z*q.c)*h;q.r.addScaledVector(q.v,h);});
    SP.forEach(q=>q.b.rotation.set(q.r.x,q.r.y,q.r.z));
    mesh.material.emissiveIntensity=.06+st.breath*.7*(.85+.15*Math.sin(T*18))+st.roar*.25+Math.max(0,Math.sin(T*2.3))*.04;
    if(m.userData.mouthGlow){m.userData.mouthGlow.material.opacity=Math.max(st.breath*.95,st.roar*.5);m.userData.mouthGlow.scale.setScalar(.25+Math.max(st.breath,st.roar*.5)*.55*(1+.2*Math.sin(T*22)));}
  };
  w.userData.k=1; w.userData.inner=m;
  return w;
}
// จุดปากมังกรใน world space
function dragonMouth(u){const R=u.rig;R.head.updateMatrixWorld(true);return new THREE.Vector3(0,-.05,.18).applyMatrix4(R.head.matrixWorld);}
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
  dragonSet(u,{rear:0,lunge:1,spread:.3,flapAmp:.9,flapSpd:2.2,rise:0,jaw:0,legF:.7},.08);
  await tween(.12,k=>u.w.position.copy(home).addScaledVector(dir,.7*k),easeIn);
  const hp=dragonMouth(u);
  clawSlash(hp.clone().addScaledVector(dir,.2),dir,0xffb050);
  for(let i=0;i<14;i++)fireSprite(hp,new THREE.Vector3((Math.random()-.5)*3,Math.random()*2,(Math.random()-.5)*3),.35,.18);
  fireLight(hp,5,.35);
  onHit(); hitStop(); shake=Math.max(shake,.18);
  await wait(160);
  // ถอยกลับ ตีปีกแรง
  dragonSet(u,{lunge:0,legF:0,flapAmp:.6,flapSpd:1.2},.25);
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
function dragonReact(u){dragonSet(u,{recoil:1,spread:.6,jaw:.5,flapSpd:2},.06);setTimeout(()=>dragonSet(u,{recoil:0,spread:0,jaw:0,flapSpd:1},.35),180/SPEED);}
/* ---------- คำราม: ยืดตัว กางปีกเต็ม อ้าปาก สั่นหัว ---------- */
async function dragonRoar(u,dur){
  dragonSet(u,{rear:.8,spread:1,roar:1,flapAmp:.3,flapSpd:.7,rise:.25},.25); await wait(200);
  const mo=dragonMouth(u); shockRing(u.w.position.clone().setY(.05),0xffb050); shake=Math.max(shake,.15);
  for(let i=0;i<12;i++)fireSprite(mo,new THREE.Vector3((Math.random()-.5)*1.6,Math.random()*1.4,(Math.random()-.5)*1.6),.45,.25,{grav:0,grow:2});
  fireLight(mo,4,.5);
  await wait(dur||800);
  dragonSet(u,{rear:0,spread:0,roar:0,flapAmp:.55,flapSpd:1,rise:0},.35);
}
/* ---------- ตะปบซ้าย-ขวา ---------- */
async function dragonClaw(u,t,onHit){
  const dir=dragonDir(u), home=u.w.position.clone();
  dragonSet(u,{legF:.6,lunge:.3,rear:.35,spread:.5,flapAmp:.8,flapSpd:1.6,jaw:.4},.18); await wait(240);
  for(const side of ['clawL','clawR']){
    dragonSet(u,{[side]:-.6},.1); await wait(130);
    dragonSet(u,{[side]:1,rear:0,lunge:.8},.07);
    await tween(.1,k=>u.w.position.copy(home).addScaledVector(dir,.55*k),easeIn);
    const hp=t.w.position.clone().setY(1.1).addScaledVector(dir,-.3); clawSlash(hp,dir,0xffc070);
    for(let i=0;i<6;i++)fireSprite(hp,new THREE.Vector3((Math.random()-.5)*2,Math.random()*1.5,(Math.random()-.5)*2),.3,.15);
    onHit(); shake=Math.max(shake,.14); await wait(150);
    dragonSet(u,{[side]:0},.2);
  }
  dragonSet(u,{legF:0,lunge:0,spread:0,jaw:0,flapAmp:.55,flapSpd:1},.3);
  await tween(.25,k=>u.w.position.copy(home).addScaledVector(dir,.55*(1-k)),easeOut);
}
/* ---------- หมุนตัวฟาดหาง ---------- */
async function dragonTail(u,t,onHit){
  const y0=u.w.rotation.y;
  dragonSet(u,{tailWhip:-1,rise:.35,spread:.7,flapSpd:2.2,flapAmp:.8},.15); await wait(260);
  dragonSet(u,{tailWhip:1},.12);
  let hit=false;
  await tween(.6,k=>{u.w.rotation.y=y0+k*Math.PI*2;
    if(!hit&&k>.42){hit=true;onHit();const c=t.w.position.clone().setY(.05);shockRing(c,0xffe0a0);shake=Math.max(shake,.22);particles(tmpV.copy(c).setY(.2),0xb8a888,18,2,.3,-.2,.5);hitArc(tmpV.copy(c).setY(1),0,0xffd090,1.6);}},easeIO);
  u.w.rotation.y=y0; dragonSet(u,{tailWhip:0,rise:0,spread:0,flapSpd:1,flapAmp:.55},.3); await wait(220);
}
async function dragonDie(u){
  dragonSet(u,{flapSpd:2.8,flapAmp:1,rear:.8,spread:1},.1); await wait(260);
  dragonSet(u,{fold:1,dead:1,flapAmp:.1,rear:0,spread:0,breath:0},.5); await wait(520); shake=Math.max(shake,.18);
  particles(tmpV.copy(u.w.position).setY(.3),0xb8b0a0,28,1.8,.32,-.3,.5); embers(u.w.position.clone(),12,1.6);
}
