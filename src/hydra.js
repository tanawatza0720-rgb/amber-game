/* ================= ราชันไฮดรา (บอสโลก) =================
   โมเดล Tripo ลดเหลือ 24k สามเหลี่ยม (boss/hydra.glb) + โครงกระดูก 80 ชิ้น (boss/hydra_rig.json)
   กระดูก/น้ำหนักผิวคำนวณจากรูปทรงโมเดล: ลำตัว 3 · หาง 2 เส้น · คอ 6 เส้น (เส้นละ 4 ข้อ + หัว) · ปีก 2 ข้าง (แขนปีก + แผ่นปีก) · ขา 4
   ท่าทางทั้งหมดคำนวณสด: ทุกข้อมีสปริง ข้อที่อยู่ปลายตามช้ากว่า (คอ/หาง/ปีกเหวี่ยงตามแรงเฉื่อย)
   ใช้: const H=await loadHydra(); scene.add(H.root); ทุกเฟรม H.tick(dt); ท่า H.play(ชื่อ) ดูรายชื่อใน HY_MOVES
   แกนโมเดล: หน้า +x, ขึ้น +y, ปีกซ้าย +z */
const HYDRA_BASE_=(typeof HYDRA_BASE!=='undefined'?HYDRA_BASE:'boss/'), HYDRA_URL=HYDRA_BASE_+'hydra.glb', HYDRA_RIG=HYDRA_BASE_+'hydra_rig.json';
const HY_HEADS=['black','gold','red','white','blue','grey'];
const HY_EL={black:0x8a4dff,gold:0xffe27a,red:0xff5a1f,white:0xbff3ff,blue:0x3fb6ff,grey:0xc89a5a}; // มืด แสง ไฟ ลม น้ำ ดิน
function loadHydra(scale){
  scale=scale||10;
  const gl=new Promise((res,rej)=>new THREE.GLTFLoader().load(HYDRA_URL+'?v=1',res,undefined,rej));
  const rj=fetch(HYDRA_RIG+'?v=80b',{cache:'no-cache'}).then(r=>r.json());
  return Promise.all([gl,rj]).then(([g,rig])=>{
    let mesh=null; g.scene.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});
    const geo=mesh.geometry, n=geo.attributes.position.count;
    const raw=Uint8Array.from(atob(rig.skin),c=>c.charCodeAt(0));
    const SI=new Uint16Array(n*4), SW=new Float32Array(n*4);
    for(let i=0;i<n;i++)for(let k=0;k<4;k++){SI[i*4+k]=raw[i*8+k];SW[i*4+k]=raw[i*8+4+k]/255;}
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4)); geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
    // กระดูก (ท่าพักไม่มีการหมุน ตำแหน่ง = ตำแหน่งโลก − ตำแหน่งแม่)
    const B={}, list=[];
    rig.bones.forEach(d=>{const b=new THREE.Bone();b.name=d.n;const p=d.p?rig.bones.find(x=>x.n===d.p).x:[0,0,0];b.position.set(d.x[0]-p[0],d.x[1]-p[1],d.x[2]-p[2]);b.userData.w=new THREE.Vector3(...d.x);B[d.n]=b;list.push(b);if(d.p)B[d.p].add(b);});
    const mat=mesh.material.clone(); mat.skinning=true; mat.side=THREE.FrontSide; mat.roughness=.72; mat.metalness=.05;
    const sm=new THREE.SkinnedMesh(geo,mat); sm.add(B.root); sm.bind(new THREE.Skeleton(list)); sm.castShadow=true; sm.receiveShadow=false; sm.frustumCulled=false;
    // โครงนอก: pivot (ยืนสองขาหลัง หมุนรอบเท้าหลัง) -> body
    const root=new THREE.Group(), pivot=new THREE.Group(), body=new THREE.Group();
    root.add(pivot); pivot.add(body); body.add(sm);
    const FOOT_X=-.16, GROUND=.463;
    pivot.position.set(FOOT_X*scale,0,0); body.position.set(-FOOT_X*scale,GROUND*scale,0); body.scale.setScalar(scale);
    return makeHydra(root,pivot,body,sm,B,scale);
  });
}
/* ---------- ระบบท่า: แต่ละท่าเป็นเส้นเวลา (keyframe โค้งนุ่ม) ใช้เวลาเกม dt ไม่ใช่ setTimeout ----------
   ท่า = {D:ระยะเวลา, f(t,o,e): ใส่ค่าพารามิเตอร์ ณ เวลา t ลงใน o, ev:[[เวลา,ฟังก์ชัน]], hold:ค้างท่าสุดท้าย}
   ค่าที่ได้ -> สปริงวิกฤต (ไม่เด้งเกิน) -> หมุนกระดูก -> กระดูกปลายตามช้ากว่า (แรงเฉื่อย) */
const HY_MOVES=[['roar','คำราม'],['taunt','ขู่'],['breath','พ่นพลัง 6 หัว'],['breathAll','หกหัวพ่นรวม'],['flameSweep','ไฟกวาด'],['bite','งับ'],['biteCombo','งับต่อเนื่อง'],
  ['slam','ตบกรงเล็บ'],['stomp','กระทืบ'],['gust','กระพือปีก'],['jump','กระโดดกระแทก'],['sweep','กวาดหาง'],['spin','หมุนหวดหาง'],['tailStab','แทงหาง'],
  ['charge','พุ่งชน'],['meteor','เรียกอุกกาบาต'],['enrage','คลั่ง'],['walk','เดิน'],['hit','โดนตี'],['die','ล้ม'],['revive','ฟื้น']];
function makeHydra(root,pivot,body,sm,B,S){
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z), UP=V3(0,1,0), X=V3(1,0,0), Z=V3(0,0,1);
  const dirOf=b=>{const c=b.children.find(x=>x.isBone);return c?c.userData.w.clone().sub(b.userData.w).normalize():null;};
  const axes={}; Object.values(B).forEach(b=>{let d=dirOf(b);if(!d){const p=b.parent;d=p&&p.isBone?b.userData.w.clone().sub(p.userData.w).normalize():V3(1,0,0);}
    const pa=d.clone().cross(UP); if(pa.lengthSq()<1e-4)pa.set(0,0,1); pa.normalize(); axes[b.name]={d,pitch:pa};});
  // พารามิเตอร์ (ค่าจริง v ไล่ตามเป้าด้วยสปริงวิกฤต)
  const PK=['rear','crouch','yaw','spin','fwd','lift','roll','tailSw','tailUp','tailSw2','wingL','wingR','foldL','foldR','armL','armR','legL','legR','walk','dead','glow'];
  const P={}; PK.forEach(n=>P[n]={v:0,vel:0,k:9});
  HY_HEADS.forEach(h=>['P','Y','X'].forEach(q=>P[h+q]={v:0,vel:0,k:q==='X'?13:9}));
  P.spin.k=7;P.dead.k=3;P.glow.k=4;P.walk.k=20;P.fwd.k=8;P.lift.k=11;
  // โค้งนุ่ม
  const sm3=x=>x<=0?0:x>=1?1:x*x*(3-2*x), sm5=x=>x<=0?0:x>=1?1:x*x*x*(x*(x*6-15)+10);
  const kf=(t,K)=>{if(t<=K[0][0])return K[0][1];for(let i=1;i<K.length;i++)if(t<=K[i][0]){const a=K[i-1],b=K[i];return a[1]+(b[1]-a[1])*sm5((t-a[0])/(b[0]-a[0]));}return K[K.length-1][1];};
  const pulse=(t,a,b,c,d)=>t<a||t>d?0:t<b?sm5((t-a)/(b-a)):t<c?1:1-sm5((t-c)/(d-c)); // ขึ้น a→b ค้าง b→c ลง c→d
  const HH=(o,q,f)=>HY_HEADS.forEach((h,i)=>o[h+q]=(o[h+q]||0)+f(i,h));
  // เอฟเฟกต์
  const fx=new THREE.Group(); root.add(fx);
  const dot=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  const POOL=[]; for(let i=0;i<260;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.visible=false;s.userData={life:0};fx.add(s);POOL.push(s);}
  let pi=0; const emit=(p,v,col,size,life,grav)=>{let s=null;for(let k=0;k<POOL.length;k++){const c=POOL[(pi+k)%POOL.length];if(!c.visible){s=c;pi=(pi+k+1)%POOL.length;break;}}if(!s)return;
    s.visible=true;s.position.copy(p);s.userData={v,life,max:life,size,grav:grav||0};s.material.color.setHex(col);s.scale.setScalar(size);};
  const rings=[]; const ring=(x,z,col,R,dur)=>{const m=new THREE.Mesh(new THREE.RingGeometry(.82,1,56),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(x,.12,z);fx.add(m);rings.push({m,t:0,R,dur:dur||.8});};
  const dust=(x,z,n,col)=>{for(let k=0;k<n;k++){const a=Math.random()*6.28,r=Math.random();emit(V3(x+Math.cos(a)*r*.08*S,.03*S,z+Math.sin(a)*r*.08*S),V3(Math.cos(a)*S*(.15+r*.3),S*(.15+Math.random()*.35),Math.sin(a)*S*(.15+r*.3)),col||0xd8b890,S*(.025+Math.random()*.02),.9,-S*.9);}};
  const W=new THREE.Vector3(), Q=new THREE.Quaternion();
  const worldPt=(bn,off)=>{B[bn].getWorldPosition(W);const p=W.clone();if(off){B[bn].getWorldQuaternion(Q);p.addScaledVector(axes[bn].d.clone().applyQuaternion(Q),off*S);}fx.worldToLocal(p);return p;};
  const fwdDir=()=>V3(1,0,0).applyAxisAngle(UP,root.rotation.y+pivot.rotation.y);
  const tip=h=>{const bn='n_'+h+'4';const p=worldPt(bn,.06);B[bn].getWorldQuaternion(Q);const d=axes[bn].d.clone().applyQuaternion(Q);return {p,d};};
  const beams={}; // หัว -> {t, spread, aim}
  const breathe=(h,dur,aim)=>beams[h]={t:dur,aim:aim==null?.65:aim};
  const meteors=[];
  const shake={a:0};
  const API={root,body,bones:B,P,shakeCam:0,onHit:null,moves:HY_MOVES,flying:false,busy:()=>!!cur,
    play(name){const A=ACT[name];if(!A)return Promise.resolve();
      if(name==='revive'){if(cur&&cur.done)cur.done();cur=null;dead=false;return Promise.resolve();}
      if(dead&&name!=='revive')return Promise.resolve();
      if(cur&&cur.done)cur.done();
      return new Promise(res=>{cur={A,name,t:0,fired:new Set(),done:res,w:0};if(name==='die')dead=true;});},
    tick};
  let cur=null, dead=false, T=0;
  const hAct={}; HY_HEADS.forEach((h,i)=>hAct[h]={t:-(.5+i*.7),on:0,k:0,d:1,s:1});
  // ---------- ท่าทั้งหมด ----------
  const ACT={
    roar:{D:2.6,f(t,o){o.rear=kf(t,[[0,0],[.5,.2],[1.1,.14],[2.1,.1],[2.6,0]]);o.crouch=kf(t,[[0,0],[.45,-.025],[.9,.01],[2.6,0]]);
        HH(o,'P',i=>kf(t,[[0,0],[.5,.5+i*.05],[.95,-.2],[2.1,-.12],[2.6,0]]));HH(o,'Y',i=>kf(t,[[0,0],[.5,(i-2.5)*.14],[2.6,0]]));HH(o,'X',i=>kf(t,[[0,0],[.5,-.25],[.95,.55],[2.1,.45],[2.6,0]]));
        o.wingL=o.wingR=kf(t,[[0,0],[.5,.35],[1,-.35],[2.1,-.3],[2.6,0]]);o.tailUp=kf(t,[[0,0],[.95,.35],[2.6,0]]);},
      ev:[[.95,()=>{ring(.4*S,0,0xffc070,S*1.1,1);ring(.4*S,0,0xff8040,S*.7,.8);shake.a=.6;}],[1.3,()=>ring(.4*S,0,0xffc070,S*1.4,1.1)]]},
    taunt:{D:3.2,f(t,o){HH(o,'Y',i=>Math.sin(t*3.2+i*1.3)*.45*pulse(t,0,.4,2.7,3.2));HH(o,'P',i=>Math.sin(t*2.1+i)*.18*pulse(t,0,.4,2.7,3.2)+.12*pulse(t,0,.4,2.7,3.2));
        HH(o,'X',i=>Math.max(0,Math.sin(t*4+i*1.9))*.35*pulse(t,.2,.6,2.6,3.1));o.crouch=-.02*pulse(t,0,.5,2.7,3.2);o.tailSw=Math.sin(t*2.4)*.6*pulse(t,0,.5,2.6,3.2);o.wingL=o.wingR=.15*pulse(t,0,.5,2.7,3.2);}},
    breath:{D:5.3,f(t,o){HY_HEADS.forEach((h,i)=>{const t0=.2+i*.75;o[h+'P']+=kf(t-t0,[[0,0],[.35,.45],[.55,-.15],[1.2,-.1],[1.5,0]]);o[h+'X']+=kf(t-t0,[[0,0],[.35,-.35],[.55,.6],[1.2,.5],[1.5,0]]);});
        o.crouch=-.015*pulse(t,0,.5,4.7,5.3);o.wingL=o.wingR=.12*pulse(t,0,.5,4.7,5.3);},
      ev:HY_HEADS.map((h,i)=>[.2+i*.75+.52,()=>breathe(h,.7)])},
    breathAll:{D:4.2,f(t,o){const up=pulse(t,0,1.1,1.3,1.5), fire=pulse(t,1.4,1.6,3.3,3.9);o.rear=.22*up+.05*fire;o.crouch=-.04*fire;
        HH(o,'P',i=>.6*up-.12*fire);HH(o,'Y',i=>(i-2.5)*.18*up-(i-2.5)*.1*fire);HH(o,'X',i=>-.4*up+.6*fire);o.wingL=o.wingR=.5*up-.35*fire;o.glow=up+fire*.6;},
      ev:[[1.5,()=>{HY_HEADS.forEach(h=>breathe(h,2.2,1.2));shake.a=.35;}]]},
    flameSweep:{D:3.6,f(t,o){const on=pulse(t,.1,.6,3,3.6);o.redP=kf(t,[[0,0],[.5,.35],[.8,-.1],[3,-.1],[3.6,0]]);o.redX=.55*pulse(t,.5,.8,2.9,3.4);o.redY=kf(t,[[0,0],[.8,.6],[2.9,-.7],[3.6,0]]);
        o.yaw=kf(t,[[0,0],[.8,.15],[2.9,-.2],[3.6,0]]);HH(o,'Y',i=>i===2?0:(i<2||i===5?.3:-.3)*on);o.crouch=-.02*on;},
      ev:[[.8,()=>breathe('red',2.1,.9)]]},
    bite:{D:1.8,f(t,o){o.redP=kf(t,[[0,0],[.35,.4],[.55,-.35],[.9,-.3],[1.8,0]]);o.redX=kf(t,[[0,0],[.35,-.45],[.55,.8],[.9,.7],[1.8,0]]);o.fwd=kf(t,[[0,0],[.35,-.02],[.55,.05],[1.8,0]]);o.crouch=kf(t,[[0,0],[.55,-.035],[1.8,0]]);
        HH(o,'Y',i=>i===2?0:(i-2.5)*.1*pulse(t,0,.4,1.2,1.8));},ev:[[.55,()=>{shake.a=.25;const p=worldPt('n_red4',.08);for(let k=0;k<14;k++)emit(p,V3((Math.random()-.5)*S*.5,Math.random()*S*.4,(Math.random()-.5)*S*.5),0xffd9a0,S*.03,.4);}]]},
    biteCombo:{D:4.8,f(t,o){const ord=[2,4,5,1,3,0];ord.forEach((hi,k)=>{const h=HY_HEADS[hi],t0=.15+k*.62;o[h+'P']+=kf(t-t0,[[0,0],[.25,.35],[.42,-.35],[.7,-.25],[1,0]]);o[h+'X']+=kf(t-t0,[[0,0],[.25,-.4],[.42,.75],[.7,.6],[1,0]]);});
        o.fwd=Math.sin(t*6)*.012*pulse(t,0,.3,3.5,4.2);o.crouch=-.03*pulse(t,0,.3,3.6,4.2);o.yaw=Math.sin(t*3)*.06*pulse(t,0,.3,3.5,4.2);},
      ev:[0,1,2,3,4,5].map(k=>[.15+k*.62+.42,()=>{shake.a=.18;}])},
    slam:{D:2.8,f(t,o){o.rear=kf(t,[[0,0],[.8,.62],[1.05,.66],[1.3,-.08],[1.9,-.04],[2.8,0]]);o.armL=o.armR=kf(t,[[0,0],[.8,1],[1.05,1.05],[1.3,-.3],[2,-.1],[2.8,0]]);
        o.wingL=o.wingR=kf(t,[[0,0],[.8,.45],[1.3,-.45],[2,-.2],[2.8,0]]);o.tailUp=kf(t,[[0,0],[.8,-.3],[1.3,.25],[2.8,0]]);o.crouch=kf(t,[[0,0],[1.2,0],[1.35,-.06],[2,-.03],[2.8,0]]);
        HH(o,'P',i=>kf(t,[[0,0],[.8,.35],[1.3,-.3],[2,-.15],[2.8,0]]));HH(o,'X',i=>kf(t,[[0,0],[.8,-.15],[1.3,.45],[2,.2],[2.8,0]]));},
      ev:[[1.3,()=>{ring(.55*S,0,0xffd08a,S*1.3,.9);ring(.55*S,0,0xff8a3a,S*.8,.7);shake.a=1;dust(.5*S,.18*S,26);dust(.5*S,-.18*S,26);if(API.onHit)API.onHit('slam');}]]},
    stomp:{D:2.8,f(t,o){o.armL=kf(t,[[0,0],[.35,.8],[.55,-.15],[.9,0]]);o.armR=kf(t,[[0,0],[1.1,0],[1.45,.8],[1.65,-.15],[2,0]]);o.roll=kf(t,[[0,0],[.35,-.05],[.6,.02],[1.45,.05],[1.7,-.02],[2.2,0]]);
        o.rear=kf(t,[[0,0],[.35,.08],[.55,-.03],[1.45,.08],[1.65,-.03],[2.2,0]]);HH(o,'P',i=>-.15*pulse(t,.4,.6,2,2.6));o.crouch=kf(t,[[0,0],[.55,-.03],[.9,0],[1.65,-.03],[2,0]]);},
      ev:[[.55,()=>{ring(.34*S,.17*S,0xffc890,S*.8,.7);dust(.34*S,.17*S,20);shake.a=.5;}],[1.65,()=>{ring(.34*S,-.16*S,0xffc890,S*.8,.7);dust(.34*S,-.16*S,20);shake.a=.5;}]]},
    gust:{D:3.4,f(t,o){const on=pulse(t,0,.3,2.9,3.4);o.wingL=o.wingR=on*(Math.sin(t*6.5-1.2)*.55-.05);o.lift=on*(.025+Math.sin(t*6.5-2.4)*.02);o.rear=.1*on;o.crouch=-.015*on;
        HH(o,'P',i=>.1*on);HH(o,'Y',i=>Math.sin(t*2+i)*.1*on);o.tailSw=Math.sin(t*3.2)*.25*on;},
      ev:[.9,1.85,2.8].map(tt=>[tt,()=>{shake.a=.25;const f=fwdDir();for(let j=0;j<26;j++)emit(V3(S*(.15+Math.random()*.25),S*(.05+Math.random()*.4),(Math.random()-.5)*S*.9),f.clone().multiplyScalar(S*(1.4+Math.random()*.8)).add(V3(0,-S*.1,(Math.random()-.5)*S*.3)),0xe8fbff,S*.035,.7);}])},
    jump:{D:3.2,f(t,o){o.crouch=kf(t,[[0,0],[.5,-.07],[.7,.02],[2.25,.02],[2.4,-.08],[2.8,-.02],[3.2,0]]);o.lift=kf(t,[[0,0],[.6,0],[1.3,.5],[1.8,.46],[2.35,0],[3.2,0]]);
        o.wingL=o.wingR=kf(t,[[0,0],[.5,.4],[.8,-.6],[1.1,.45],[1.4,-.55],[1.7,.35],[2.35,-.4],[3.2,0]]);o.rear=kf(t,[[0,0],[.6,.12],[1.4,.05],[2.3,-.12],[2.6,-.05],[3.2,0]]);
        o.armL=o.armR=kf(t,[[0,0],[.7,.4],[2.2,.5],[2.4,-.25],[3.2,0]]);o.tailUp=kf(t,[[0,0],[1.3,.5],[2.35,-.2],[3.2,0]]);HH(o,'P',i=>kf(t,[[0,0],[1.3,.3],[2.35,-.35],[3.2,0]]));},
      ev:[[.62,()=>dust(0,0,18)],[2.36,()=>{ring(.1*S,0,0xffd08a,S*1.6,1);ring(.1*S,0,0xff9040,S*1,.8);shake.a=1.1;dust(.3*S,0,30);dust(-.1*S,0,30);if(API.onHit)API.onHit('jump');}]]},
    sweep:{D:2.4,f(t,o){o.yaw=kf(t,[[0,0],[.6,.4],[1,-.45],[1.6,-.35],[2.4,0]]);o.tailSw=kf(t,[[0,0],[.6,-1.2],[1,1.5],[1.6,1.2],[2.4,0]]);o.tailSw2=o.tailSw;o.crouch=-.025*pulse(t,0,.5,1.8,2.4);
        HH(o,'Y',i=>kf(t,[[0,0],[.6,.3],[1,-.3],[2.4,0]]));},ev:[[1,()=>{ring(-.4*S,0,0xffb070,S*1.1,.8);shake.a=.4;dust(-.4*S,.3*S,16);}]]},
    spin:{D:3.4,f(t,o){o.spin=kf(t,[[0,0],[.5,-.25],[2,Math.PI*2],[2.5,Math.PI*2]]);o.tailSw=o.tailSw2=kf(t,[[0,0],[.5,-.8],[1.1,1.4],[2,1.2],[2.6,0]]);o.crouch=-.04*pulse(t,.3,.6,2.2,2.8);
        o.wingL=o.wingR=-.3*pulse(t,.4,.8,2,2.6);HH(o,'Y',i=>kf(t,[[0,0],[.5,.3],[1.2,-.35],[2.4,0]]));o.lift=.03*pulse(t,.6,1,1.6,2);},
      ev:[[1.2,()=>{ring(0,0,0xffb070,S*1.5,1);shake.a=.5;}],[2.1,()=>dust(0,0,20)]],after(){P.spin.v-=Math.PI*2;}},
    tailStab:{D:2.6,f(t,o){o.tailUp=kf(t,[[0,0],[.8,1.25],[1.1,1.5],[1.3,.9],[1.8,.8],[2.6,0]]);o.tailSw=kf(t,[[0,0],[.8,.2],[2.6,0]]);o.rear=kf(t,[[0,0],[.8,-.08],[1.1,.06],[2.6,0]]);o.crouch=-.04*pulse(t,0,.6,1.9,2.6);
        HH(o,'P',i=>-.15*pulse(t,.2,.7,1.9,2.6));HH(o,'Y',i=>(i-2.5)*.15*pulse(t,.2,.7,1.9,2.6));},ev:[[1.25,()=>{shake.a=.45;ring(.6*S,0,0xff70c0,S*.7,.6);}]]},
    charge:{D:3,f(t,o){o.fwd=kf(t,[[0,0],[.55,-.08],[1.05,.45],[1.35,.42],[2.4,0],[3,0]]);o.crouch=kf(t,[[0,0],[.55,-.06],[1.05,-.02],[2.4,0]]);o.rear=kf(t,[[0,0],[.55,-.1],[1.05,-.12],[1.3,.1],[2.4,0]]);
        o.walk=pulse(t,.5,.6,1.1,1.3)*3;o.wingL=o.wingR=kf(t,[[0,0],[.55,.3],[1,-.4],[2.4,0]]);HH(o,'P',i=>kf(t,[[0,0],[.55,-.2],[1.05,-.3],[1.35,.2],[2.4,0]]));HH(o,'X',i=>.4*pulse(t,.6,1,1.4,2));},
      ev:[[1.05,()=>{shake.a=.9;ring(.95*S,0,0xffd08a,S*1,.8);dust(.9*S,0,24);if(API.onHit)API.onHit('charge');}]]},
    meteor:{D:4.6,f(t,o){const up=pulse(t,0,.9,3.4,4.2);o.rear=.28*up;HH(o,'P',i=>.85*up+Math.sin(t*5+i)*.05*up);HH(o,'Y',i=>(i-2.5)*.22*up);o.wingL=o.wingR=.5*up;o.glow=up;o.armL=o.armR=.3*up;},
      ev:[[1,()=>{for(let k=0;k<7;k++)meteors.push({t:-k*.28,x:(Math.random()*1.4+.5)*S,z:(Math.random()-.5)*1.6*S});}]]},
    enrage:{D:3.6,f(t,o){const on=pulse(t,0,.4,3,3.6);HH(o,'P',i=>(Math.sin(t*9+i*2.1)*.3+.2)*on);HH(o,'Y',i=>Math.sin(t*7+i*1.4)*.4*on);HH(o,'X',i=>Math.max(0,Math.sin(t*8+i))*.3*on);
        o.wingL=o.wingR=(Math.sin(t*8)*.3+.1)*on;o.glow=1.4*on;o.crouch=-.03*on;o.rear=(.1+Math.sin(t*4)*.04)*on;o.tailSw=Math.sin(t*5)*.8*on;o.tailSw2=-o.tailSw;},
      ev:[[.5,()=>{shake.a=.5;ring(0,0,0xff3a2a,S*1.4,1.2);}],[1.6,()=>ring(0,0,0xff3a2a,S*1.6,1.2)]]},
    walk:{D:4.2,f(t,o){const on=pulse(t,0,.4,3.7,4.2);o.walk=2.6*on;o.fwd=Math.sin(t*1.5)*.04*on;HH(o,'Y',i=>Math.sin(t*1.5+i)*.12*on);o.tailSw=Math.sin(t*2.6)*.35*on;}},
    hit:{D:1,f(t,o){const k=kf(t,[[0,0],[.08,1],[.35,.5],[1,0]]);o.rear=-.08*k;o.fwd=-.04*k;o.crouch=-.02*k;HH(o,'P',i=>.25*k);HH(o,'X',i=>-.4*k);HH(o,'Y',i=>(i%2?1:-1)*.25*k);o.wingL=o.wingR=.2*k;},ev:[[0,()=>shake.a=.3]]},
    die:{D:3.6,hold:true,f(t,o){HY_HEADS.forEach((h,i)=>{const t0=.3+i*.35;o[h+'P']+=kf(t-t0,[[0,0],[.25,.45],[.7,-.4]]);o[h+'Y']+=kf(t-t0,[[0,0],[.7,(i-2.5)*.14]]);});
        o.dead=kf(t,[[0,0],[1.8,0],[2.6,1]]);o.crouch=kf(t,[[0,0],[1.8,0],[2.6,-.05]]);o.wingL=kf(t,[[0,0],[1,.3],[2.6,-.35]]);o.wingR=kf(t,[[0,0],[1,.3],[2.6,-.3]]);o.foldL=o.foldR=kf(t,[[0,0],[2.6,.25]]);o.tailUp=kf(t,[[0,0],[2.6,-.2]]);},
      ev:[[2.6,()=>{shake.a=.7;dust(0,0,40);}]]},
    revive:{D:0,f(){}}
  };
  // ---------- ทุกเฟรม ----------
  const quat=new THREE.Quaternion(), q2=new THREE.Quaternion(), tq={};
  const target=(b,ax1,a1,ax2,a2,ax3,a3)=>{const q=tq[b]||(tq[b]=new THREE.Quaternion());q.setFromAxisAngle(ax1,a1);if(ax2){q2.setFromAxisAngle(ax2,a2);q.premultiply(q2);}if(ax3){q2.setFromAxisAngle(ax3,a3);q.premultiply(q2);}return q;};
  const lag={}; Object.keys(B).forEach(n=>{const m=n.match(/(\d)$/);lag[n]=m?Math.max(4,14-+m[1]*2):14;});
  const glowMat=sm.material; const baseEm=glowMat.emissive?glowMat.emissive.clone():null;
  let walkPh=0;
  function tick(dt){dt=Math.min(dt,.05);T+=dt;
    const o={}; for(const k in P)o[k]=0;
    let w=0;
    if(cur){const A=cur.A;cur.t+=dt;A.f(cur.t,o);(A.ev||[]).forEach(([et,fn],i)=>{if(cur.t>=et&&!cur.fired.has(i)){cur.fired.add(i);fn();}});
      if(cur.t>=A.D&&!A.hold){if(A.after)A.after();const d=cur.done;cur=null;if(d)d();}}
    // ท่ายืนเฉย (ซ้อนตลอด อ่อนลงเมื่อเล่นท่า)
    const idle=dead?0:1, br=Math.sin(T*1.5);
    HY_HEADS.forEach((h,i)=>{const ph=i*1.9, act=cur?.35:1;o[h+'P']+=(Math.sin(T*.7+ph)*.11+Math.sin(T*1.9+ph*2)*.04)*idle;o[h+'Y']+=(Math.sin(T*.55+ph*1.3)*.24+Math.sin(T*1.3+ph)*.07)*idle;o[h+'X']+=Math.sin(T*.8+ph*1.7)*.08*idle;
      // แอ็กชันเล็ก ๆ ของแต่ละหัว (สุ่ม ไม่พร้อมกัน): ฉก · ขู่ส่ายหัว · เงยคำราม · หันมองข้าง · ก้มดม (ตอนเล่นท่าใหญ่จะเบาลง)
      const a=hAct[h]; a.t+=dt;
      if(a.t>=0&&!a.on&&idle){a.on=1;a.k=Math.floor(Math.random()*5);a.d=[.75,1.4,1.3,1.8,1.5][a.k];a.t=0;a.s=Math.random()<.5?-1:1;}
      if(a.on){const u=Math.min(1,a.t/a.d), e=Math.sin(u*Math.PI)*act*idle;
        if(a.k===0){o[h+'X']+=kf(u,[[0,0],[.3,-.35],[.45,.9],[.7,.5],[1,0]])*act*idle;o[h+'P']+=kf(u,[[0,0],[.3,.3],[.45,-.3],[1,0]])*act*idle;}
        else if(a.k===1){o[h+'Y']+=Math.sin(u*Math.PI*6)*.35*e;o[h+'P']+=.2*e;o[h+'X']+=-.2*e;}
        else if(a.k===2){o[h+'P']+=.75*e;o[h+'X']+=.25*e;}
        else if(a.k===3){o[h+'Y']+=a.s*.7*e;o[h+'P']+=.1*e;}
        else{o[h+'P']+=-.45*e;o[h+'X']+=.35*e;o[h+'Y']+=Math.sin(u*9)*.12*e;}
        if(u>=1){a.on=0;a.t=-(1+Math.random()*3);}}});
    if(API.flying&&!dead){const fb=Math.sin(T*2.3);o.wingL+=fb*.62+.05;o.wingR+=Math.sin(T*2.3+.12)*.62+.05;o.lift+=Math.sin(T*2.3-1.3)*.018+Math.sin(T*.4)*.02;
      o.armL+=.45;o.armR+=.45;o.rear+=.06+Math.sin(T*.5)*.03;o.tailUp+=-.25;o.roll+=Math.sin(T*.35)*.04;}
    o.tailSw+=Math.sin(T*.9)*.12*idle;o.tailSw2+=Math.sin(T*.9+2)*.12*idle;o.wingL+=Math.sin(T*1.5)*.03*idle;o.wingR+=Math.sin(T*1.5+.3)*.03*idle;
    // สปริงวิกฤต
    for(const k in P){const p=P[k],a=p.k*p.k*(o[k]-p.v)-2*p.k*p.vel;p.vel+=a*dt;p.v+=p.vel*dt;}
    const v=k=>P[k].v;
    // ทั้งตัว
    pivot.rotation.z=v('rear')-v('dead')*.05; pivot.rotation.x=v('roll')+v('dead')*.22; pivot.rotation.y=v('spin');
    root.rotation.y=v('yaw')*.6;
    walkPh+=dt*v('walk')*3.2;
    const bob=Math.abs(Math.sin(walkPh))*.012*Math.min(1,v('walk'));
    shake.a=Math.max(0,shake.a-dt*1.8); API.shakeCam=shake.a;
    const sx=Math.sin(T*47)*Math.sin(T*31)*.004*shake.a;
    body.position.set(.16*S+v('fwd')*S+sx*S,(.463+v('crouch')+v('lift')+bob+br*.003*idle-v('dead')*.03)*S,0);
    const L=(n,q)=>B[n].quaternion.slerp(q,1-Math.exp(-dt*lag[n]));
    L('chest',target('chest',axes.chest.pitch,br*.02*idle+v('rear')*.15));
    L('hips',target('hips',axes.hips.pitch,-v('rear')*.35));
    // คอ
    const NW=[.14,.2,.24,.24,.18];
    HY_HEADS.forEach(h=>{const am=h==='black'?.55:1,pp=v(h+'P'),yy=v(h+'Y'),xx=v(h+'X');
      for(let i=0;i<5;i++){const n='n_'+h+i;if(!B[n])continue;
        const pitch=am*(pp*NW[i]*1.6+(i<2?-xx*.22:xx*.18)-v('dead')*(i<2?0:.14));
        L(n,target(n,axes[n].pitch,pitch,UP,am*yy*NW[i]*1.5));}
      const bm=beams[h];if(bm&&bm.t>0){bm.t-=dt;const {p,d}=tip(h);d.multiplyScalar(1-bm.aim*.5).add(fwdDir().multiplyScalar(bm.aim)).normalize();
        for(let k=0;k<4;k++){const vv=d.clone().multiplyScalar(S*(1.7+Math.random()*.7)).add(V3((Math.random()-.5)*S*.22,(Math.random()-.5)*S*.18,(Math.random()-.5)*S*.22));emit(p,vv,HY_EL[h],S*(.04+Math.random()*.05),.6);}
        if(Math.random()<.5)emit(p,V3(0,0,0),0xffffff,S*.09,.12);}});
    // ปีก (+ ยกขึ้น/หุบ, − กางลง)
    [['L',1],['R',-1]].forEach(([sd,sg])=>{const f=v('wing'+sd), fo=v('fold'+sd);
      for(let i=0;i<3;i++){const n='w'+sd+i;if(B[n])L(n,target(n,X,-sg*f*(i?.45:1)*(1+i*.2),UP,sg*fo*(i?.3:.8)));}
      for(let i=0;i<3;i++){const n='m'+sd+i;if(B[n])L(n,target(n,X,-sg*f*.25));}
      const a=v('arm'+sd), wf=Math.sin(walkPh+(sd==='L'?0:Math.PI))*.32*Math.min(1,v('walk')), lift=Math.max(0,Math.sin(walkPh+(sd==='L'?0:Math.PI)))*.3*Math.min(1,v('walk'));
      [0,1,2].forEach(i=>{const n='a'+sd+i;if(B[n])L(n,target(n,Z,[.9,-.5,-.6][i]*a+(i===0?wf:i===1?-lift:0)));});
      const r=v('rear')+(API.flying?.55:0), hw=-Math.sin(walkPh+(sd==='L'?0:Math.PI))*.28*Math.min(1,v('walk')), hl=Math.max(0,-Math.sin(walkPh+(sd==='L'?0:Math.PI)))*.25*Math.min(1,v('walk'));
      [0,1,2].forEach(i=>{const n='l'+sd+i;if(B[n])L(n,target(n,Z,[-r*.5+hw,r*.1+hl,-hl*.6][i]));});});
    // หาง 2 เส้น
    [['tail',v('tailSw'),1],['tailB',v('tailSw2')+v('tailSw')*.5,-1]].forEach(([tn,sw0,sg])=>{for(let i=0;i<8;i++){const n=tn+i;if(!B[n])continue;
      const sw=(sw0*.12*sg+Math.sin(T*1.3-i*.55+(sg<0?2:0))*.035*idle)*(1+i*.12), up=v('tailUp')*.12*(1+i*.05)+Math.sin(T*.8-i*.4)*.015*idle;
      L(n,target(n,UP,sw,axes[n].pitch,up));}});
    // เรืองแสงตอนคลั่ง/ร่ายเวท
    if(baseEm){const g=Math.max(0,v('glow'));glowMat.emissive.setRGB(baseEm.r+g*.11,baseEm.g+g*.025,baseEm.b);}
    // อุกกาบาต
    for(let i=meteors.length-1;i>=0;i--){const m=meteors[i];m.t+=dt;if(m.t<0)continue;const k=m.t/.9, p=V3(m.x-S*.8*(1-k),S*2.2*(1-k),m.z);
      emit(p,V3(S*.3,S*.5,0),0xff7a30,S*.12,.35);emit(p,V3(0,0,0),0xffe0a0,S*.07,.15);
      if(k>=1){ring(m.x,m.z,0xff8a3a,S*.6,.7);dust(m.x,m.z,14,0xff9a50);shake.a=Math.max(shake.a,.45);meteors.splice(i,1);}}
    // อนุภาค + วง
    POOL.forEach(s=>{if(!s.visible)return;const u=s.userData;u.life-=dt;if(u.life<=0){s.visible=false;return;}u.v.y+=u.grav*dt;s.position.addScaledVector(u.v,dt);u.v.multiplyScalar(1-dt*1.1);const k=u.life/u.max;s.material.opacity=Math.min(1,k*1.4);s.scale.setScalar(u.size*(1.9-k));});
    for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=r.t/r.dur,e=1-(1-k)*(1-k);r.m.scale.setScalar(r.R*(.15+e));r.m.material.opacity=.85*(1-k);if(k>=1){fx.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();rings.splice(i,1);}}
  }
  // ออร่าดำทมิฬของบอส (ใช้ระบบออร่าเดียวกับมอนสเตอร์ ถ้ามี gamedata.js)
  if(typeof addAura==='function')addAura(root,'hydra','ทมิฬ',1.1);
  return API;
}
