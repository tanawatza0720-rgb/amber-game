-- =====================================================================
-- ตำนานป่าอัมพร : รีเซ็ตเซิร์ฟเวอร์ (เปิดฤดูกาลใหม่) + ตัวเริ่มต้นชุดใหม่
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run
--   1) ผู้เล่นใหม่ได้ตัวเริ่มต้น 3 ตัว: คุโรกะ ธาตุไฟ · คาเซะคิริ ธาตุน้ำ · โมริฮิเมะ ธาตุลม (Lv5 ทุกตัว)
--   2) สำรองข้อมูลผู้เล่นทั้งหมดไว้ใน schema backup_20260930 ก่อน (กู้คืนได้)
--   3) ล้างความคืบหน้าผู้เล่นทุกคน: บัญชีล็อกอินยังอยู่ พอเข้าเกมครั้งถัดไปจะเริ่มใหม่ (เลือกเผ่าใหม่ ได้ตัวเริ่มต้นชุดใหม่)
--      ไฮดรา: เลือดกลับเต็ม ล้างคะแนนความเสียหาย · จดหมายส่วนตัวถูกล้าง (จดหมายประกาศรวมยังอยู่)
-- ⚠ ส่วนที่ 2–3 ห้ามรันซ้ำโดยไม่ตั้งใจ (รันซ้ำ = ล้างอีกรอบ ส่วนสำรองจะถูกเขียนทับ)
-- =====================================================================

-- ---------- 1) ตัวเริ่มต้นชุดใหม่ ----------
create or replace function public._player(u uuid) returns public.players
language plpgsql security definer set search_path = '' as $function$
declare p public.players; n int; sec int := public._c('energy_sec');
begin
  select * into p from public.players where user_id = u for update;
  if not found then
    insert into public.players (user_id, name) values (u, 'นักฝึก#' || upper(substr(replace(u::text,'-',''),1,4))) returning * into p;
    -- มอนสเตอร์เริ่มต้น: คุโรกะ ไฟ · คาเซะคิริ น้ำ · โมริฮิเมะ ลม
    insert into public.monsters (user_id, sp, lv, el) values
      (u, 'kuroga', 5, 'ไฟ'), (u, 'kazekiri', 5, 'น้ำ'), (u, 'morihime', 5, 'ลม');
    update public.players set team = (
      select array_agg(id order by ord) from (
        select id, case sp when 'kuroga' then 1 when 'kazekiri' then 2 else 3 end as ord
        from public.monsters where user_id = u) t)
    where user_id = u returning * into p;
  end if;
  -- ฟื้นพลังงานตามเวลาที่ผ่านไป
  if p.energy >= public._c('energy_max') then
    p.energy_at := now();
  else
    n := floor(extract(epoch from now() - p.energy_at) / sec);
    if n > 0 then
      p.energy := least(public._c('energy_max'), p.energy + n);
      p.energy_at := case when p.energy >= public._c('energy_max') then now() else p.energy_at + make_interval(secs => n * sec) end;
    end if;
  end if;
  -- ภารกิจรายวัน
  if p.quest_day is distinct from public._today() then
    p.quest_day := public._today(); p.quests := '{}'::jsonb;
  end if;
  update public.players set energy = p.energy, energy_at = p.energy_at, quest_day = p.quest_day, quests = p.quests
    where user_id = u;
  return p;
end $function$;

-- ---------- 2) สำรองข้อมูล ----------
create schema if not exists backup_20260930;
revoke all on schema backup_20260930 from public, anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['players','monsters','battles','expeditions','friend_links','friend_raids','friend_visits',
                           'mail','mail_claims','raid_hits','raid_prizes','raid_scouts','raids','stage_claims'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop table if exists backup_20260930.%I', t);
      execute format('create table backup_20260930.%I as table public.%I', t, t);
    end if;
  end loop;
end $$;

-- ---------- 3) ล้างความคืบหน้า ----------
do $$
begin
  -- ตรวจว่าสำรองครบก่อนล้าง
  if (select count(*) from backup_20260930.players) <> (select count(*) from public.players)
     or (select count(*) from backup_20260930.monsters) <> (select count(*) from public.monsters) then
    raise exception 'backup_mismatch';
  end if;
  delete from public.friend_raids;
  delete from public.friend_visits;
  delete from public.friend_links;
  delete from public.raid_scouts;
  delete from public.expeditions;
  delete from public.stage_claims;
  delete from public.mail_claims;
  delete from public.mail where user_id is not null;
  delete from public.raid_prizes;
  delete from public.raid_hits;
  update public.raids set hp = hp_max where status = 'active';
  delete from public.battles;
  delete from public.monsters;
  delete from public.players;
end $$;
