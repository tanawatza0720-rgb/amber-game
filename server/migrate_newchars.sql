-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครระดับตำนานใหม่ 2 ตัว (ฮาคุเนโกะ นักดาบแมวขาว · โมริฮิเมะ ธิดาหอกเอลฟ์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- เข้าไปอยู่ในกลุ่มสุ่มระดับ "ตำนาน" ของการฟักไข่อัตโนมัติ (hatch_egg สุ่มตาม species.rar)
-- =====================================================================
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('hakuneko','ฮาคุเนโกะ',3,50,null,0),
  ('morihime','โมริฮิเมะ',3,50,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = case sp when 'hakuneko' then 412 when 'morihime' then 404 else pow end
where sp in ('hakuneko','morihime');
