// แปลงท่าจาก Mixamo เป็นข้อมูล delta ใน model-space สำหรับ retarget
const T=require('./package/build/three.min.js');
const fs=require('fs');
const BONES=['Hips','Spine','Spine1','Spine2','Neck','Head','RightShoulder','RightArm','RightForeArm','RightHand','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightUpLeg','RightLeg','RightFoot','RightToeBase','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase'];
const CHILD={Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head',Head:'HeadTop_End',RightShoulder:'RightArm',RightArm:'RightForeArm',RightForeArm:'RightHand',RightHand:'RightHandMiddle1',LeftShoulder:'LeftArm',LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',LeftHand:'LeftHandMiddle1',RightUpLeg:'RightLeg',RightLeg:'RightFoot',RightFoot:'RightToeBase',RightToeBase:'RightToe_End',LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',LeftFoot:'LeftToeBase',LeftToeBase:'LeftToe_End'};
const CLIPS=['idle','slash','slash2','combo','leap','hit','death','victory','run','walk','dizzy','powerup','spin','power','jumpatk','dodge','battlecry'];
function readGlb(f){const b=fs.readFileSync(f);const l=b.readUInt32LE(12);const j=JSON.parse(b.slice(20,20+l).toString());const binStart=20+l+8;const bin=b.slice(binStart);return {j,bin};}
function acc(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView];const n={SCALAR:1,VEC3:3,VEC4:4}[a.type];const off=(bv.byteOffset||0)+(a.byteOffset||0);const arr=new Float32Array(a.count*n);for(let k=0;k<a.count*n;k++)arr[k]=g.bin.readFloatLE(off+k*4);return {arr,n,count:a.count};}
const out={fps:30,bones:BONES,clips:{},restDir:{},hipsY:0};
const nm=s=>s.replace(/^mixamorig:/,'');
for(const c of CLIPS){
  const g=readGlb('mx/kz_'+c+'.glb'); const nodes=g.j.nodes;
  const byName={}; nodes.forEach((n,i)=>byName[nm(n.name)]=i);
  const parent=new Array(nodes.length).fill(-1); nodes.forEach((n,i)=>(n.children||[]).forEach(ch=>parent[ch]=i));
  const restT=nodes.map(n=>new T.Vector3(...(n.translation||[0,0,0]))), restR=nodes.map(n=>new T.Quaternion(...(n.rotation||[0,0,0,1])));
  const an=g.j.animations[0]; const tr={};
  let dur=0;
  an.channels.forEach(ch=>{const s=an.samplers[ch.sampler];const inp=acc(g,s.input),o=acc(g,s.output);dur=Math.max(dur,inp.arr[inp.count-1]);(tr[ch.target.node]=tr[ch.target.node]||{})[ch.target.path]={t:inp.arr,v:o.arr,n:o.n};});
  const sample=(track,time,out)=>{const t=track.t;let i=0;while(i<t.length-2&&t[i+1]<time)i++;const a=t[i],b=t[Math.min(i+1,t.length-1)];const f=b>a?Math.min(1,Math.max(0,(time-a)/(b-a))):0;const n=track.n,v=track.v;
    if(n===4){const q1=new T.Quaternion(v[i*4],v[i*4+1],v[i*4+2],v[i*4+3]),j=Math.min(i+1,t.length-1),q2=new T.Quaternion(v[j*4],v[j*4+1],v[j*4+2],v[j*4+3]);return out.copy(q1).slerp(q2,f);}
    const j=Math.min(i+1,t.length-1);return out.set(v[i*3]+(v[j*3]-v[i*3])*f,v[i*3+1]+(v[j*3+1]-v[i*3+1])*f,v[i*3+2]+(v[j*3+2]-v[i*3+2])*f);};
  const world=(localR,localT)=>{const W=[],P=[];const order=[];const visit=i=>{order.push(i);(nodes[i].children||[]).forEach(visit);};visit(0);
    order.forEach(i=>{const p=parent[i];if(p<0){W[i]=localR[i].clone();P[i]=localT[i].clone();}else{W[i]=W[p].clone().multiply(localR[i]);P[i]=localT[i].clone().applyQuaternion(W[p]).add(P[p]);}});return {W,P};};
  const rest=world(restR,restT);
  if(!out.hipsY){out.hipsY=rest.P[byName.Hips].y;BONES.forEach(b=>{const d=rest.P[byName[CHILD[b]]].clone().sub(rest.P[byName[b]]).normalize();out.restDir[b]=[d.x,d.y,d.z].map(x=>+x.toFixed(4));});}
  const N=Math.round(dur*30)+1, q=[], hp=[], hand=[];
  for(let f=0;f<N;f++){const time=Math.min(dur,f/30);
    const lr=restR.map((r,i)=>tr[i]&&tr[i].rotation?sample(tr[i].rotation,time,new T.Quaternion()):r.clone());
    const lt=restT.map((r,i)=>tr[i]&&tr[i].translation?sample(tr[i].translation,time,new T.Vector3()):r.clone());
    const w=world(lr,lt);
    BONES.forEach(b=>{const i=byName[b];const D=w.W[i].clone().multiply(rest.W[i].clone().invert());q.push(...[D.x,D.y,D.z,D.w].map(x=>+x.toFixed(4)));});
    const h=w.P[byName.Hips].clone().sub(rest.P[byName.Hips]);hp.push(...[h.x,h.y,h.z].map(x=>+x.toFixed(4)));
    hand.push(w.P[byName.RightHand].clone());
  }
  // หาจังหวะดาบโดน = ความเร็วมือขวาสูงสุด
  const sp=hand.map((p,i)=>i?p.distanceTo(hand[i-1])*30:0);
  const peaks=[];for(let i=2;i<sp.length-2;i++){if(sp[i]>=sp[i-1]&&sp[i]>=sp[i+1]&&sp[i]>1.2)peaks.push([i,sp[i]]);}
  peaks.sort((a,b)=>b[1]-a[1]);const hits=[];for(const [i] of peaks){if(hits.every(h=>Math.abs(h-i)>8))hits.push(i);if(hits.length>=3)break;}hits.sort((a,b)=>a-b);
  out.clips[c]={n:N,q,hp,main:peaks[0]?+(peaks[0][0]/30).toFixed(3):0,hits:hits.map(i=>+(i/30).toFixed(3)),peak:+(peaks[0]?peaks[0][1]:0).toFixed(2)};
  console.log(c,'frames',N,'dur',dur.toFixed(2),'hits',out.clips[c].hits.join(','),'peak',out.clips[c].peak);
}
fs.mkdirSync('kzr',{recursive:true});
fs.writeFileSync('kzr/kazekiri_anims.json',JSON.stringify(out));
console.log('bytes',fs.statSync('kzr/kazekiri_anims.json').size,'hipsY',out.hipsY);
