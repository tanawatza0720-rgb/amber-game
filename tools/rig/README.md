# เครื่องมือ rig ตัวละครมนุษย์ (ฮาคุเนโกะ / โมริฮิเมะ)

1. `selfrig2.py <name> body.glb weapon.glb joints.json outdir key` วางกระดูก Mixamo ตามจุดใน joints.json แล้วคำนวณน้ำหนักผิว (heat diffusion ระยะแบบหารรัศมีกระดูก)
   - `CLOTH=tex.jpg` ผ้าสีขาวตามสีพื้นผิว และส่วนที่ไกลจากกระดูกเกิน `FAR_K` (1.6) ตามลำตัว/สะโพกแทนแขนขา ผมตามหัว/คอ
   - `CUT=.5` ตัดหน้าที่เชื่อมปลายแขนกับลำตัว
2. `node fstretch.js <clip>` (ต้องเปิด battle_dbg2.html ที่มี `__B.MXA`) เก็บตำแหน่งผิวหลังขยับท่า เป็น posed_<clip>.json
3. `cutfaces.py rig.json out.json posed_*.json` ลบหน้าที่ยืดเป็นแผ่นใย (ยกเว้นผ้าสีขาว)

โมริฮิเมะ: `CUT=.5 CLOTH=elf/tex.jpg python3 selfrig2.py elf elf/body.glb elf/wpn.glb elf_joints.json out morihime` แล้ว cutfaces จากท่า tpose, slash, combo, run, battlecry, jumpatk

## เพิ่มโซ่กระดูกปีก (ซาราเอล)
`python3 wingchain.py ../../srl/sarael_rig.json` — ใช้กับ rig ที่มีกระดูกปีกข้างละ 1 ชิ้น (`WingL`/`WingR` จาก `EXTRA`) แตกเป็นแกนปีก 4 ท่อน + เส้นเปลว 8 + ยอดปีก ต่อข้าง แบ่งน้ำหนักตามตำแหน่ง เกลี่ยรอยต่อปีก–ลำตัว (`HOPS`/`ITER` ปรับได้ทาง env) · ตำแหน่งกระดูกอยู่ในหัวไฟล์ (วัดจากโมเดลซาราเอล ถ้าใช้กับตัวอื่นต้องวัดใหม่) · รันซ้ำบนไฟล์เดิมไม่ได้
