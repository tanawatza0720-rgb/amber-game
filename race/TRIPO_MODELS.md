# โมเดลดินแดนเผ่าพันธุ์จาก Tripo

สร้างด้วย Tripo H3.1 เมื่อ 2026-09-29 เพื่อเป็นตัวอย่างหน้าเลือกเผ่า ใช้เครดิต 55 ต่อโมเดล รวม 220 เครดิต

| เผ่า | ไฟล์ 3 มิติ | โมเดล Tripo | ภาพตัวอย่าง |
|---|---|---|---|
| มนุษย์ | `human-city-island.glb` | https://studio.tripo3d.ai/workspace/generate/4bb9d7c8-c464-4392-9263-b723ed7ea8ce | `tripo-human.webp` |
| อันเดด | `undead-necropolis-island.glb` | https://studio.tripo3d.ai/workspace/generate/80618fa5-d162-47fe-84e2-f5e0df022e01 | `tripo-undead.webp` |
| กึ่งมนุษย์ | `half-human-forest-island.glb` | https://studio.tripo3d.ai/workspace/generate/a0a74797-c199-4458-ac83-f889b69b340f | `tripo-half-human.webp` |
| เทพเจ้า | `gods-sky-island.glb` | https://studio.tripo3d.ai/workspace/generate/ee32ad78-0947-4927-aa36-86a4ef0e540c | `tripo-gods.webp` |

ตัวอย่างสำหรับตรวจงาน: `tripo-preview.html` ภาพประกอบเป็นภาพจากโมเดลที่สร้างแล้ว ส่วนโมเดล 3 มิติหมุนดูได้จากลิงก์ Tripo ในหน้า

ไฟล์ GLB ทั้งสี่เป็นโมเดลรายละเอียดสูงสำหรับงานออกแบบ สามารถเปิดด้วยโปรแกรมที่รองรับ glTF 2.0 และ `EXT_meshopt_compression` เช่น Blender รุ่นใหม่ โมเดลยังไม่ได้ลดจำนวนโพลีกอนหรือปรับขนาดสำหรับใช้ในเกมบนมือถือ

## การใช้ในเกม (อัปเดต 2026-09-29)

- เกาะทั้ง 4 ไฟล์ด้านบนใช้เป็น **ตัวเกาะหลักของฟาร์ม** ตามเผ่าที่ผู้เล่นเลือก (`src/farm_race.js` → `loadRaceIsland`)
  - ฐานหิน/ขอบเกาะ: ขยายให้กว้างกว่าพื้นฟาร์ม (FARM_R=26) และตัดส่วนเหนือพื้นทิ้งด้วย clipping plane
  - วิหาร/ปราสาท/ต้นไม้ใหญ่ของเผ่า: ย่อลงตั้งที่ลานหลังเกาะ (`CASTLE` ใน farm_world.js)
  - `GY` = ระดับพื้นของแต่ละโมเดล (สัดส่วนความสูงจากก้นโมเดล)

## รูปปั้นประจำเผ่า (Tripo H3.1 · 55 เครดิต/ชิ้น · รวม 220)

| เผ่า | ไฟล์ | โมเดล Tripo |
|---|---|---|
| เทพเจ้า | `statue-god.glb` เทวดาปีกทองบนเสาหินอ่อน | https://studio.tripo3d.ai/workspace/generate/600a27b6-8d52-4fc4-a315-cfa95a316549 |
| อันเดด | `statue-undead.glb` เสาโอเบลิสก์อักษรม่วง | https://studio.tripo3d.ai/workspace/generate/25ec79ef-f26a-4895-a694-f53d05b72aa7 |
| กึ่งมนุษย์ | `statue-beast.glb` เสาโทเท็มไม้ | https://studio.tripo3d.ai/workspace/generate/e8305e39-736d-412b-9938-c51a36cf8ef0 |
| มนุษย์ | `statue-human.glb` รูปปั้นอัศวิน | https://studio.tripo3d.ai/workspace/generate/f47d5b1a-032c-456e-b3bd-ea72ef7aa95a |

ลดโพลีกอนจาก ~2 ล้าน เหลือ ~16,000 สามเหลี่ยม (meshoptimizer simplifyWithAttributes + Permissive, ถนอม UV) texture 512 JPEG · ไฟล์ละ ~0.5 MB
