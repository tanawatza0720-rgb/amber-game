/* ================= หน้าเลือกเผ่า (ครั้งแรกที่เข้าเกม · เลือกแล้วเปลี่ยนไม่ได้) =================
   เกาะลอยฟ้า 4 เผ่าหมุนเป็นวงล้อ แตะลูกศร/ปัดจอ/แตะไอคอนเพื่อดูแต่ละเผ่า */
const RP={open:false,idx:0,rot:0,isl:{},arm:0,loading:false};
const rScene=new THREE.Scene(), rCam=new THREE.PerspectiveCamera(34,1,.1,200);
{ const c=document.createElement('canvas');c.width=16;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#10182e');g.addColorStop(.55,'#2a2a4a');g.addColorStop(1,'#4a3a3a');x.fillStyle=g;x.fillRect(0,0,16,256);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;rScene.background=t;
  rScene.add(new THREE.HemisphereLight(0xdfe8ff,0x3a2a30,1.05)); const d=new THREE.DirectionalLight(0xfff0dc,1.35); d.position.set(4,8,6); rScene.add(d);
  const r2=new THREE.DirectionalLight(0x9fb8ff,.5); r2.position.set(-6,3,-4); rScene.add(r2);
  RP.stars=[];for(let i=0;i<60;i++){const s=glow(rScene,0xffffff,.08+Math.random()*.1,[(Math.random()-.5)*40,2+Math.random()*16,-14-Math.random()*10],.6);s.userData.p=Math.random()*6;RP.stars.push(s);} }
const RP_R=5.2; // รัศมีวงล้อเกาะ
function rpAngle(i){return (i-RP.idx)*Math.PI*2/RACE_ORDER.length;}
function openRace(){
  if(RP.open)return; RP.open=true; RP.arm=0; const el=$('#racePick'); el.hidden=false; document.body.classList.add('raceOpen'); rpRender();
  if(!RP.loading){RP.loading=true;let n=0;
    RACE_ORDER.forEach(k=>new THREE.GLTFLoader().load(RACES[k].glb,g=>{const o=g.scene;o.traverse(m=>{if(m.isMesh){m.castShadow=false;if(m.material&&ENV){m.material.envMap=ENV;m.material.envMapIntensity=.35;}}});
      const box=new THREE.Box3().setFromObject(o),s=2.6/Math.max(.01,box.getSize(new THREE.Vector3()).x);o.scale.setScalar(s);
      const w=new THREE.Group();w.add(o);w.userData.k=k;rScene.add(w);RP.isl[k]=w;
      const gl=glow(w,new THREE.Color(RACES[k].c).getHex(),5.5,[0,-.3,-.6],.28);w.userData.halo=gl;
      $('#rpLoad').textContent='กำลังโหลดดินแดน '+(++n)+'/4';if(n===4)$('#rpLoad').hidden=true;},undefined,()=>{$('#rpLoad').textContent='โหลดดินแดนไม่สำเร็จ ลองรีเฟรช';}));}
}
function closeRace(){RP.open=false;$('#racePick').hidden=true;document.body.classList.remove('raceOpen');}
function rpGo(d){RP.idx=(RP.idx+d+RACE_ORDER.length)%RACE_ORDER.length;RP.arm=0;rpRender();}
function rpRender(){
  const k=RACE_ORDER[RP.idx],R=RACES[k];
  $('#rpName').textContent=R.n; $('#rpName').style.color=R.c; $('#rpLore').textContent=R.lore;
  $('#rpSkill').textContent=R.icon+' '+R.skill; $('#rpSkill').style.color=R.c; $('#rpDesc').textContent=R.desc;
  document.querySelectorAll('#rpTabs button').forEach((b,i)=>b.classList.toggle('on',i===RP.idx));
  const ok=$('#rpOk'); ok.textContent=RP.arm?'แตะอีกครั้งเพื่อยืนยัน · เลือกแล้วเปลี่ยนไม่ได้':'เลือก '+R.n; ok.classList.toggle('arm',!!RP.arm); ok.style.setProperty('--rc',R.c);
}
function raceFrame(dt,T){
  const tgt=0; RP.rot+=(tgt-RP.rot)*Math.min(1,dt*5);
  RACE_ORDER.forEach((k,i)=>{const w=RP.isl[k];if(!w)return;const a=rpAngle(i);
    const cur=w.userData.a==null?a:w.userData.a+Math.atan2(Math.sin(a-w.userData.a),Math.cos(a-w.userData.a))*Math.min(1,dt*5);w.userData.a=cur;
    w.position.set(Math.sin(cur)*RP_R,1.1+Math.sin(T*1.1+i*1.7)*.15+(i===RP.idx?.25:0),Math.cos(cur)*RP_R-RP_R);
    w.rotation.y+=dt*(i===RP.idx?.35:.12); const sel=i===RP.idx, s=sel?1.15:.72; w.scale.setScalar(w.scale.x+(s-w.scale.x)*Math.min(1,dt*6));
    if(w.userData.halo)w.userData.halo.material.opacity=sel?.3+.08*Math.sin(T*2):.05;});
  RP.stars.forEach(s=>{s.material.opacity=.25+.35*Math.sin(T*1.3+s.userData.p);});
  const port=rCam.aspect<.9; rCam.position.set(0,port?2.4:2.1,port?12.5:9.2); rCam.lookAt(0,port?-.2:.3,-1.2);
  renderer.render(rScene,rCam);
}
function rpResize(){const r=renderer.domElement;rCam.aspect=r.clientWidth/Math.max(1,r.clientHeight);rCam.updateProjectionMatrix();}
addEventListener('resize',rpResize); setTimeout(rpResize,0);
$('#rpPrev').onclick=()=>rpGo(-1); $('#rpNext').onclick=()=>rpGo(1);
RACE_ORDER.forEach((k,i)=>{const b=document.createElement('button');b.textContent=RACES[k].icon;b.title=RACES[k].n;b.onclick=()=>{RP.idx=i;RP.arm=0;rpRender();};$('#rpTabs').append(b);});
{ let sx=null; $('#racePick').addEventListener('pointerdown',e=>{if(e.target.closest('button,.rpCard'))return;sx=e.clientX;});
  $('#racePick').addEventListener('pointerup',e=>{if(sx==null)return;const d=e.clientX-sx;sx=null;if(Math.abs(d)>40)rpGo(d<0?1:-1);}); }
$('#rpOk').onclick=async()=>{
  const k=RACE_ORDER[RP.idx];
  if(!RP.arm||Date.now()-RP.arm>6000){RP.arm=Date.now();rpRender();return;}
  RP.arm=0; const r=await act('set_race',{r:k}); if(!r){rpRender();return;}
  S.race=k; closeRace(); renderHUD(); toast('ยินดีต้อนรับสู่'+RACES[k].n+'! สกิลเผ่า "'+RACES[k].skill+'" จะช่วยทีมในสนามรบ');
};
