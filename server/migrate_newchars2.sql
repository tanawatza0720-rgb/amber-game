-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครระดับหายากใหม่ 3 ตัว (โมเดลสร้างเองด้วย Tripo)
--   เซย์โร (หมาป่านักดาบ ธาตุน้ำ) · โคฮาคุ (จิ้งจอกนักเวท ธาตุไฟ) · กาโรค (ออร์กถือขวาน ธาตุดิน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   เข้ากลุ่มสุ่มระดับ "หายาก" ของการฟักไข่ทุกแบบอัตโนมัติ (hatch_egg / hatch_god_egg สุ่มตาม species.rar)
--   ธาตุ: ฟักออกได้ครบ 6 ธาตุเหมือนตัวอื่น (el_rates) · _el_of ใช้เมื่อไม่ได้ระบุธาตุ (ตรงกับ EL_OF ใน gamedata.js)
--   pow = hp + atk×4 + def×3 + spd×2 (ตรงกับ base ใน battle_world.js / monbox.js)
-- =====================================================================
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('seiro','เซย์โร',2,40,null,0),
  ('kohaku','โคฮาคุ',2,40,null,0),
  ('garok','กาโรค',2,40,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = case sp when 'seiro' then 365 when 'kohaku' then 356 when 'garok' then 365 else pow end
where sp in ('seiro','kohaku','garok');

-- ธาตุประจำตัว (ว่าง = ธาตุนี้) · ตรงกับ EL_OF ใน gamedata.js
create or replace function public._el_of(e text, sp text) returns text language sql immutable as $$
  select coalesce(nullif(e, ''), case sp when 'kazemaru' then 'ลม' when 'kazekiri' then 'ลม' when 'yorugumo' then 'มืด' when 'morihime' then 'ดิน'
    when 'kuroga' then 'มืด' when 'hakuneko' then 'แสง' when 'amateru' then 'ไฟ'
    when 'seiro' then 'น้ำ' when 'kohaku' then 'ไฟ' when 'garok' then 'ดิน' end) $$;

select sp, name, rar, max_lv, pow from public.species order by rar, sp;
