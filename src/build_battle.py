import re
k=open('kazemaru.html',encoding='utf-8').read()
js=re.findall(r'<script>(.*?)</script>',k,re.S)[-1]
def cut(a,b):
    i=js.index(a); j=js.index(b,i); return js[i:j]
tex=cut("/* ---------- พื้นผิวที่วาดขึ้นเอง ---------- */","/* ---------- ฉากป่าไผ่ยามค่ำ ---------- */")
helpers=cut("/* ---------- ตัวช่วยสร้างรูปทรง ---------- */","/* ================= สถานะ ================= */")
# expose rigs for walking
a="  applyPose(base);\n  const feet="
assert helpers.count(a)==1
helpers=helpers.replace(a,"  applyPose(base);\n  m.userData.rig={hips,torso,head,legs,arms,R,L,base};\n  const feet=")
b="  applyPose(base);\n  let blink=0;"
assert helpers.count(b)==1
helpers=helpers.replace(b,"  applyPose(base);\n  m.userData.rig={arms,R,L,base};\n  let blink=0;")
from trail_patch import patch
helpers=patch(helpers)
a="amp:0,base:sword.userData.base"
assert helpers.count(a)==1
helpers=helpers.replace(a,"amp:0,k:sword.userData.trailK||1,base:sword.userData.base")
a="const box=new THREE.Box3();m.traverse(o=>{if(o.isMesh&&!o.userData.outline)box.expandByObject(o);});"
assert helpers.count(a)==1
helpers=helpers.replace(a,"(m.userData.swords||[]).forEach(sw=>sw.traverse(o=>o.userData.noBox=true));const box=new THREE.Box3();m.traverse(o=>{if(o.isMesh&&!o.userData.outline&&!o.userData.noBox)box.expandByObject(o);});")
helpers=helpers.replace('m.position.y+=Math.abs(Math.sin(T*2.4))*.045;','m.position.y+=Math.abs(Math.sin(T*2.4))*.018;')
a='(evo?buildEvo:buildBaby)(m);'
assert helpers.count(a)==1
helpers=helpers.replace(a,'(evo?(USE_MESHY&&MESHY?buildMeshyEvo:buildEvo):buildBaby)(m);')
shell=open('battle_shell.html',encoding='utf-8').read()
out=shell.replace('/*__SHARED__*/',tex+"\n"+helpers).replace('/*__WORLD__*/',open('meshy_rig.js',encoding='utf-8').read()+'\n'+open('dragon.js',encoding='utf-8').read()+'\n'+open('battle_world.js',encoding='utf-8').read()).replace('/*__UI__*/',open('battle_ui.js',encoding='utf-8').read())
open('battle.html','w',encoding='utf-8').write(out)
open('battle.js','w',encoding='utf-8').write(re.findall(r'<script>(.*?)</script>',out,re.S)[-1])
loc=out.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','package/build/three.min.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js','package/examples/js/loaders/GLTFLoader.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js','package/examples/js/utils/SkeletonUtils.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js','package/examples/js/environments/RoomEnvironment.js').replace('<link rel="stylesheet" href="https://fonts.googleapis.com','<link rel="x" href="https://fonts.googleapis.com')
open('battle_local.html','w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+loc+'</body></html>')
print(len(out))
