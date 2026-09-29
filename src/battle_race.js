/* ================= สกิลเผ่าในสนามรบ (ใช้อัตโนมัติตามคูลดาวน์) ================= */
let RACE=null, raceT=0, raceBuffT=0;
const raceAtkBonus=side=>side==='P'&&RACE==='human'&&raceBuffT>0?RACES.human.atk:0;
function raceReset(){const R=RACES[RACE];raceT=R?R.cd*.45:0;raceBuffT=0;raceChip();}
function raceChip(){const c=$('#raceChip');if(!c)return;const R=RACES[RACE];document.body.classList.toggle('hasRace',!!R);c.hidden=!R;if(!R)return;
  if(!c.dataset.r||c.dataset.r!==RACE){c.dataset.r=RACE;c.querySelector('.ic').textContent=R.icon;c.querySelector('b').textContent=R.skill;c.style.setProperty('--rc',R.c);}
  c.querySelector('i').style.width=Math.min(100,raceT/R.cd*100)+'%';}
function raceAttacker(P){const a=P.reduce((s,u)=>s+u.atk,0)/Math.max(1,P.length);return {atk:a,side:'P',pas:null,el:null,alive:true,w:{position:new THREE.Vector3(-40,0,0)}};}
function raceTick(dt){
  const R=RACES[RACE]; if(!R||!RT)return;
  if(raceBuffT>0)raceBuffT-=dt;
  const P=alive('P'),E=alive('E'); if(!P.length){return;}
  raceT+=dt; raceChip(); if(raceT<R.cd)return;
  if((RACE==='god'||RACE==='undead')&&!E.length)return;
  if(RACE==='beast'&&!P.some(u=>u.hp<u.maxHp))return;
  raceT=0; castRace(R,P,E);
}
function raceBanner(R){const k=$('#skname');k.textContent=R.icon+' '+R.skill;k.className='p race';k.hidden=false;setTimeout(()=>{if(k.textContent.indexOf(R.skill)>=0)k.hidden=true;},1100);}
async function castRace(R,P,E){
  raceBanner(R);
  if(RACE==='god'){const att=raceAttacker(P);
    for(let i=0;i<R.hits;i++){const L=alive('E');if(!L.length)break;const t=L[Math.floor(Math.random()*L.length)];
      lightning(t.w.position); setTimeout(()=>{if(t.alive)dealHit(att,t,{mult:R.mult});},90/SPEED); await wait(170);}}
  else if(RACE==='undead'){const att=raceAttacker(P);
    let best=E[0],bn=-1;E.forEach(a=>{const n=E.filter(b=>Math.hypot(a.w.position.x-b.w.position.x,a.w.position.z-b.w.position.z)<R.r).length;if(n>bn){bn=n;best=a;}});
    const c=best.w.position.clone().setY(0); await meteor(c);
    alive('E').filter(f=>Math.hypot(f.w.position.x-c.x,f.w.position.z-c.z)<R.r).forEach(f=>dealHit(att,f,{mult:R.mult,stun:R.stun}));}
  else if(RACE==='beast'){
    P.forEach(u=>{const h=Math.round(u.maxHp*R.heal);u.hp=Math.min(u.maxHp,u.hp+h);updateBar(u);popNum(u,'+'+h,'heal');
      particles(tmpV.copy(u.w.position).setY(.3),0x8ff0a4,14,1.2,.07,-.8,1);particles(tmpV.copy(u.w.position).setY(1),0xd8ffc8,8,.8,.05,-.6,1);});}
  else if(RACE==='human'){raceBuffT=R.dur;
    P.forEach(u=>{popNum(u,'ATK +'+Math.round(R.atk*100)+'%','info adv');particles(tmpV.copy(u.w.position).setY(1),0xffc050,16,1.4,.06,.2,.9);});
    shockRing(tmpV.copy(P[0].w.position).setY(.05),0xffc050);}
}
// สายฟ้า: เส้นหยักจากฟ้าลงเป้าหมาย + แสงวาบ
function lightning(p){
  const pts=[];let x=p.x,z=p.z;const top=18;for(let i=0;i<=10;i++){const y=top*(1-i/10);pts.push(new THREE.Vector3(x,y,z));x=p.x+(Math.random()-.5)*(i<10?1.4:0);z=p.z+(Math.random()-.5)*(i<10?1.4:0);}
  pts[pts.length-1].set(p.x,.2,p.z);
  const g=new THREE.Group();scene.add(g);const mats=[];
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=a.distanceTo(b);[[.09,0xffffff,1],[.28,0x9fd0ff,.45]].forEach(([r,c,o])=>{
    const m=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});mats.push([m,o]);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,5,1,true),m);s.position.copy(a).lerp(b,.5);s.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());g.add(s);});}
  const fl=glow(scene,0xcfe8ff,4,[p.x,1.2,p.z],1); shockRing(tmpV.copy(p).setY(.05),0xbfe0ff); particles(tmpV.copy(p).setY(.4),0xdff0ff,18,2.2,.06,.3,.7);
  shake=Math.max(shake,.12);
  if(typeof takeLight==='function'){const l=takeLight(0xbfe0ff,14);l.position.set(p.x,4,p.z);tween(.35,k=>{l.intensity=6*(1-k);}).then(()=>freeLight(l));}
  tween(.35,k=>{mats.forEach(([m,o])=>m.opacity=o*(1-k)*(Math.random()<.3?.4:1));fl.material.opacity=1-k;},t=>t).then(()=>{scene.remove(g);scene.remove(fl);g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});fl.material.dispose();});
}
// อุกกาบาต: ลูกไฟทมิฬพุ่งจากฟ้าเฉียงลงมา มีหางเปลว
async function meteor(c){
  const from=c.clone().add(new THREE.Vector3(9,20,-5)), to=c.clone().setY(.4);
  const core=glow(scene,0xd8b0ff,2.2,[from.x,from.y,from.z],1), halo=glow(scene,0x7a30d0,4.5,[from.x,from.y,from.z],.8);
  if(typeof firePal==='function')firePal({el:'มืด'});
  await tween(.65,k=>{const p=from.clone().lerp(to,k*k);core.position.copy(p);halo.position.copy(p);
    if(typeof fireSprite==='function'&&Math.random()<.9)fireSprite(p.clone(),new THREE.Vector3((Math.random()-.5)*.8,.6+Math.random(),(Math.random()-.5)*.8),.55,.9,{grav:-.2,grow:1.8});},t=>t);
  [core,halo].forEach(g=>{scene.remove(g);g.material.dispose();});
  shake=Math.max(shake,.32); shockRing(tmpV.copy(c).setY(.05),0xb070ff); shockRing(tmpV.copy(c).setY(.08),0x5a1ab8);
  if(typeof scorch==='function')scorch(c,2.2);
  particles(tmpV.copy(c).setY(.3),0xb070ff,40,3.2,.1,.4,.9); particles(tmpV.copy(c).setY(.2),0x2a1030,24,2,.3,-.2,.6);
  if(typeof fireSprite==='function')for(let i=0;i<18;i++){const a=Math.random()*6.28;fireSprite(c.clone().setY(.3),new THREE.Vector3(Math.cos(a)*(2+Math.random()*3),1.5+Math.random()*2.5,Math.sin(a)*(2+Math.random()*3)),.7,.8,{grav:.6,grow:1.6});}
  if(typeof takeLight==='function'){const l=takeLight(0xb070ff,14);l.position.set(c.x,2,c.z);tween(.5,k=>{l.intensity=5*(1-k);}).then(()=>freeLight(l));}
}
