-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครใหม่ 4 ตัว (โมเดลสร้างเองด้วย Tripo · 1 ต.ค. 2026)
--   เทพเจ้า: ซาราเอล (เทพสงครามปีกโลหิต ตีใกล้ แสง)
--   ตำนาน: อนุบิส (เทพแห่งความตาย เวทระยะไกล มืด) · มอร์ธา (แม่ชีผู้เฝ้าสุสาน สายฮีล น้ำ)
--   หายาก: ไพรวัลย์ (ปราชญ์เฒ่าพงไพร สายฮีล ลม)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   เข้ากลุ่มสุ่มตาม species.rar ของการฟักไข่ทุกแบบอัตโนมัติ (เทพเจ้าตอนนี้ 2 ตัว: อามาเทรุ ซาราเอล)
--   pow = hp + atk×4 + def×3 + spd×2 (ตรงกับ base ใน battle_world.js / monbox.js)
-- =====================================================================
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('sarael','ซาราเอล',4,50,null,0),
  ('anubis','อนุบิส',3,50,null,0),
  ('phraiwan','ไพรวัลย์',2,40,null,0),
  ('mortha','มอร์ธา',3,50,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = case sp when 'sarael' then 688 when 'anubis' then 473 when 'phraiwan' then 358 when 'mortha' then 472 else pow end
where sp in ('sarael','anubis','phraiwan','mortha');

-- ธาตุประจำตัว (ว่าง = ธาตุนี้) · ตรงกับ EL_OF ใน gamedata.js
create or replace function public._el_of(e text, sp text) returns text language sql immutable as $$
  select coalesce(nullif(e, ''), case sp when 'kazemaru' then 'ลม' when 'kazekiri' then 'ลม' when 'yorugumo' then 'มืด' when 'morihime' then 'ดิน'
    when 'kuroga' then 'มืด' when 'hakuneko' then 'แสง' when 'amateru' then 'ไฟ'
    when 'seiro' then 'น้ำ' when 'kohaku' then 'ไฟ' when 'garok' then 'ดิน'
    when 'sarael' then 'แสง' when 'anubis' then 'มืด' when 'phraiwan' then 'ลม' when 'mortha' then 'น้ำ' end) $$;

select sp, name, rar, max_lv, pow from public.species order by rar, sp;
