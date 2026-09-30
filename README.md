# ตำนานป่าอัมพร

เกม RPG 3D บนมือถือ มีฟาร์มส่วนตัว ฟักไข่ เลี้ยงมอนสเตอร์ และต่อสู้แบบเรียลไทม์ + ดันด่านอัตโนมัติ (idle)

> รายละเอียดสำหรับนักพัฒนา/AI ที่มาช่วย ดู **[AGENTS.md](AGENTS.md)**

- เล่นได้ที่ https://amberlegend.com/amber-land/
- ด่านทดสอบการต่อสู้ 1-1 ถึง 1-3: https://amberlegend.com/amber-land/battle.html

## โครงสร้างไฟล์

| ที่อยู่ | คืออะไร |
|---|---|
| `index.html` | ตัวเกมหลัก (ฟาร์ม + คลังมอนสเตอร์) ไฟล์นี้สร้างจาก `src/` |
| `battle.html` | ด่านต่อสู้ ไฟล์นี้สร้างจาก `src/` |
| `kzr/` `krg/` `hkn/` `mrh/` `drg/` | โมเดล 3D (คาเซะคิริ + ท่าทาง Mixamo, คุโรกะ, ฮาคุเนโกะ, โมริฮิเมะ, มังกรอามาเทรุ) |
| `src/` | โค้ดต้นฉบับ แก้ที่นี่แล้วค่อย build |
| `server/setup_v2.sql` | ตาราง กฎสิทธิ์ และฟังก์ชันเกมบน Supabase |
| `server/คู่มือเซิร์ฟเวอร์_v2.md` | วิธีตั้งค่า Supabase และกติกาเกมฝั่งเซิร์ฟเวอร์ |
| `legacy/` | เกมเวอร์ชันแรก (เก็บไว้ดูเฉย ๆ) |
| `privacy.html` | นโยบายความเป็นส่วนตัว |

## การ build

```bash
cd src
python3 build_farm.py   && cp farm.html   ../index.html
python3 build_battle.py && cp battle.html ../battle.html
```

## ระบบเซิร์ฟเวอร์

เหรียญ อัมพร พลังงาน ผลสุ่มไข่ เลเวล และรางวัลทั้งหมด ให้ Supabase เป็นผู้ตัดสิน (ดู `server/`) หน้าเว็บมีแค่ Publishable key ห้ามใส่ Secret key ลงในโค้ดเด็ดขาด

## ทำงานร่วมกัน

1. เจ้าของ repo เพิ่มเพื่อนที่ **Settings → Collaborators**
2. แต่ละคนแตก branch ใหม่ แก้ แล้วเปิด Pull Request เข้า `main`
3. พอรวมเข้า `main` แล้ว GitHub Pages จะอัปเดตเว็บให้เองภายในไม่กี่นาที
