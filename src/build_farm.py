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
helpers=helpers.replace("const eyeL=new THREE.PointLight(0x7fffe0,.5,.7,2); eyeL.position.set(0,1.0,.3); m.add(eyeL);","")
a='(evo?buildEvo:buildBaby)(m);'
assert helpers.count(a)==1
helpers=helpers.replace(a,'(evo?(USE_MESHY&&MESHY?(mm=>buildMeshyEvo(mm,evo)):buildEvo):buildBaby)(m);')
shell=open('farm_shell.html',encoding='utf-8').read()
out=shell.replace('/*__SHARED__*/',tex+"\n"+helpers).replace('/*__WORLD__*/',open('gamedata.js',encoding='utf-8').read()+'\n'+open('net.js',encoding='utf-8').read()+'\n'+open('meshy_rig.js',encoding='utf-8').read()+'\n'+open('dragon.js',encoding='utf-8').read()+'\n'+open('spider.js',encoding='utf-8').read()+'\n'+open('hydra.js',encoding='utf-8').read()+'\n'+open('farm_world.js',encoding='utf-8').read()+'\n'+open('farm_race.js',encoding='utf-8').read()).replace('/*__UI__*/',open('farm_ui.js',encoding='utf-8').read()+'\n'+open('race_pick.js',encoding='utf-8').read()+'\n'+open('farm_raid.js',encoding='utf-8').read()+'\n'+open('farm_exp.js',encoding='utf-8').read()+'\n'+open('farm_friends.js',encoding='utf-8').read()+'\n'+open('farm_fraid.js',encoding='utf-8').read()+'\n'+open('farm_pulls.js',encoding='utf-8').read()+'\n'+open('farm_stage.js',encoding='utf-8').read()+'\n'+open('farm_news.js',encoding='utf-8').read()+'\n'+open('farm_guide.js',encoding='utf-8').read()).replace('/*__BOX__*/',open('monbox.js',encoding='utf-8').read())
open('farm.html','w',encoding='utf-8').write(out)
open('farm.js','w',encoding='utf-8').write(re.findall(r'<script>(.*?)</script>',out,re.S)[-1])
import os
SBJS=os.environ.get('SBJS','sb_local.js')
loc=out.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','package/build/three.min.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js','package/examples/js/loaders/GLTFLoader.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js','package/examples/js/utils/SkeletonUtils.js').replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js','package/examples/js/environments/RoomEnvironment.js').replace('<link rel="stylesheet" href="https://fonts.googleapis.com','<link rel="x" href="https://fonts.googleapis.com').replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',SBJS).replace('https://spkzkwksjweszytkgokx.supabase.co',os.environ.get('SBURL','http://127.0.0.1:8766')).replace("location.href='battle.html'","location.href='battle_local.html'")
open('farm_local.html','w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"></head><body>'+loc+'</body></html>')
print(len(out))
