-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครใหม่ระดับหายาก  โยรุกุโมะ (จอมเวทแมงมุมราตรี)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
-- =====================================================================
-- เข้าไปอยู่ในกลุ่มสุ่มระดับ "หายาก" ของการฟักไข่อัตโนมัติ (hatch_egg สุ่มตาม species.rar)
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('yorugumo','โยรุกุโมะ',2,40,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = 342 where sp = 'yorugumo';
