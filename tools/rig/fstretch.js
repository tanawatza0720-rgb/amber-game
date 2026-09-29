const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:600,height:400}});
await p.goto('http://127.0.0.1:8765/battle_dbg2.html');await p.waitForFunction(()=>window.__B,null,{timeout:240000});
await p.evaluate(()=>{const M=window.__B.MXA();const nb=M.bones.length;const q=new Float32Array(nb*4*2);for(let i=0;i<nb*2;i++)q[i*4+3]=1;M.clips.tpose={q,n:2,hp:new Float32Array(6)};});
const clip=process.argv[2]||'tpose';
const r=await p.evaluate(async(clip)=>{const B=window.__B;B.UNITS().slice().forEach(u=>B.removeUnit(u));
  const u=B.makeUnit('P',{sp:'morihime',lv:10},0);u.inner.userData.play(clip,{loop:true,fade:.01});
  await new Promise(r=>setTimeout(r,1500));
  let sm=null;u.w.traverse(o=>{if(o.isSkinnedMesh&&!sm)sm=o;});sm.updateMatrixWorld(true);sm.skeleton.update();
  const P=sm.geometry.attributes.position,n=P.count,out=new Float32Array(n*3),v=new THREE.Vector3();
  const inv=new THREE.Matrix4().copy(sm.matrixWorld).invert();
  for(let i=0;i<n;i++){v.fromBufferAttribute(P,i);sm.boneTransform(i,v);out[i*3]=v.x;out[i*3+1]=v.y;out[i*3+2]=v.z;}
  return Array.from(out);},clip);
fs.writeFileSync('posed_'+clip+'.json',JSON.stringify(r));await b.close();})();
