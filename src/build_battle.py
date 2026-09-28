import re,os
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
# แผนที่ใหญ่มองจากไกล: ลดความละเอียดรูปทรงลง (ตัวเล็กบนจอ ไม่ต้องละเอียด)
tex=tex.replace("new THREE.SphereGeometry(1,32,24)","new THREE.SphereGeometry(1,14,10)")
for s0,s1 in [("new THREE.SphereGeometry(1,32,24)","new THREE.SphereGeometry(1,14,10)"),("new THREE.ConeGeometry(1,1,20)","new THREE.ConeGeometry(1,1,10)"),("new THREE.CylinderGeometry(1,1,1,20)","new THREE.CylinderGeometry(1,1,1,10)"),("seg||28,ps||0","Math.min(seg||28,14),ps||0")]:
    helpers=helpers.replace(s0,s1); tex=tex.replace(s0,s1)

helpers=helpers.replace('function particles(pos,color,n,speed,size,grav,opa){\n','function particles(pos,color,n,speed,size,grav,opa){\n  if(typeof FXK!=="undefined")n=Math.max(1,Math.round(n*FXK));\n',1)
# ไม่ใส่ไฟดวงเล็กที่ตาคาเซะมารุ (ไฟต่อตัวทำให้เครื่องช้ามากเมื่อมีหลายตัว)
helpers=helpers.replace("const eyeL=new THREE.PointLight(0x7fffe0,.5,.7,2); eyeL.position.set(0,1.0,.3); m.add(eyeL);","")
a="amp:0,base:sword.userData.base"
assert helpers.count(a)==1
helpers=helpers.replace(a,"amp:0,k:sword.userData.trailK||1,base:sword.userData.base")
a="const box=new THREE.Box3();m.traverse(o=>{if(o.isMesh&&!o.userData.outline)box.expandByObject(o);});"
assert helpers.count(a)==1
helpers=helpers.replace(a,"(m.userData.swords||[]).forEach(sw=>sw.traverse(o=>o.userData.noBox=true));const box=new THREE.Box3();m.traverse(o=>{if(o.isMesh&&!o.userData.outline&&!o.userData.noBox)box.expandByObject(o);});")
helpers=helpers.replace('m.position.y+=Math.abs(Math.sin(T*2.4))*.045;','m.position.y+=Math.abs(Math.sin(T*2.4))*.018;')
a='(evo?buildEvo:buildBaby)(m);'
assert helpers.count(a)==1
helpers=helpers.replace(a,'(evo?(USE_MESHY&&MESHY?(mm=>buildMeshyEvo(mm,evo)):buildEvo):buildBaby)(m);')
shell=open('battle_shell.html',encoding='utf-8').read()
out=shell.replace('/*__SHARED__*/',tex+"\n"+helpers).replace('/*__WORLD__*/',open('meshy_rig.js',encoding='utf-8').read()+'\n'+open('dragon.js',encoding='utf-8').read()+'\n'+open('spider.js',encoding='utf-8').read()+'\n'+open('battle_world.js',encoding='utf-8').read().replace('/*__MAP__*/',open('battle_map.js',encoding='utf-8').read())).replace('/*__UI__*/',open('battle_net.js',encoding='utf-8').read()+'\n'+open('battle_rt.js',encoding='utf-8').read()+'\n'+open('battle_ui.js',encoding='utf-8').read())
open('battle.html','w',encoding='utf-8').write(out)
open('battle.js','w',encoding='utf-8').write(re.findall(r'<script>(.*?)</script>',out,re.S)[-1])
loc=out.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','package/build/three.min.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js','package/examples/js/loaders/GLTFLoader.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js','package/examples/js/utils/SkeletonUtils.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js','package/examples/js/environments/RoomEnvironment.js').replace('<link rel="stylesheet" href="https://fonts.googleapis.com','<link rel="x" href="https://fonts.googleapis.com').replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',os.environ.get('SBJS','sb_local.js')).replace('https://spkzkwksjweszytkgokx.supabase.co',os.environ.get('SBURL','http://127.0.0.1:8766')).replace('href="index.html"','href="farm_local.html"')
open('battle_local.html','w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+loc+'</body></html>')
print(len(out))
