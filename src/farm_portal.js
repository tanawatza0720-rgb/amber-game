/* ================= ประตูมิติขุมนรก (ฉากฟาร์ม · ขอบเกาะฝั่งตะวันตกเฉียงเหนือ) =================
   ทางเข้าดันเจี้ยนขุมนรก 50 ชั้น: วงหลุมดำหมุนวน + ออร่าดำพวยพุ่งขึ้นจากขอบ + ควันดำลอยขึ้น + มือดำเล็ก ๆ ยื่นออกมา
   shader/มือ มาจาก abyss_fx.js (ใช้ร่วมกับสนามรบ) · แตะวงประตูหรือปุ่ม "ขุมนรก" บนแถบซ้าย → openPortal()
   อัปเดตใน worldTick → portalTick · server/migrate_abyss.sql (abyss_state) */
const PORTAL=(()=>{
  const R=6.2, ANG=2.2, DIST=33, LOWF=matchMedia('(pointer:coarse)').matches;
  const g=new THREE.Group(); g.position.set(Math.cos(ANG)*DIST,8.5,-Math.sin(ANG)*DIST); g.rotation.set(-.42,.3,0); scene.add(g);
  const U={t:{value:0},R:{value:R},ps:{value:600}};
  const aura=new THREE.Mesh(new THREE.RingGeometry(R*.9,R*2.3,96,6),ABYSS_FX.auraMat(U)); aura.position.z=-.05; aura.renderOrder=1; g.add(aura);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(R*1.12,72),ABYSS_FX.discMat(U)); disc.renderOrder=2; disc.userData.portal=1; g.add(disc); PICK.push(disc);
  const smoke=ABYSS_FX.smokePts(U,LOWF?70:140); smoke.renderOrder=3; g.add(smoke);
  const handMat=ABYSS_FX.handMat(U), HANDS=[], NH=LOWF?7:9, Y=new THREE.Vector3(0,1,0), q=new THREE.Quaternion(), q2=new THREE.Quaternion(), dv=new THREE.Vector3();
  for(let i=0;i<NH;i++){const a=i/NH*6.283+(Math.random()-.5)*.5,rr=R*(.45+Math.random()*.4);
    const m=new THREE.Mesh(ABYSS_FX.handGeo(),handMat);m.scale.setScalar(1.35+Math.random()*.5);g.add(m);
    HANDS.push({m,base:new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr,0),dir:new THREE.Vector3(Math.cos(a)*1.1,Math.sin(a)*1.1,.8).normalize(),ph:Math.random()*6.283,sp:.45+Math.random()*.35,a});}
  function tick(dt,T){U.t.value=T; U.ps.value=ABYSS_FX.pointScale(renderer,camera);
    HANDS.forEach(h=>{const s=.5+.5*Math.sin(T*h.sp+h.ph),reach=-2.6+4.6*s*s+Math.sin(T*7+h.ph)*.04;
      h.m.position.copy(h.base).addScaledVector(h.dir,reach);
      dv.copy(h.dir);dv.x+=Math.sin(T*1.3+h.ph)*.18;dv.y+=Math.cos(T*1.1+h.ph)*.18;dv.normalize();
      q.setFromUnitVectors(Y,dv);q2.setFromAxisAngle(Y,h.a+Math.sin(T*.9+h.ph)*.5);h.m.quaternion.copy(q).multiply(q2);});}
  return {g,tick,disc};
})();
function portalTick(dt,T){PORTAL.tick(dt,T);}

