-- =====================================================================
-- ตำนานป่าอัมพร : ผู้เล่นจำลอง (บอท) 10 คน ฝีมือระดับกลาง
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ — สร้างเฉพาะคนที่ยังไม่มี)
--   - บัญชีบอทล็อกอินไม่ได้ (ไม่มีอีเมล/รหัสผ่าน) · รายชื่ออยู่ในตาราง public.bots (ผู้เล่นมองไม่เห็นตารางนี้)
--   - ขึ้นอันดับเผ่า · โดนสุ่มบุกปล้นได้ · เยี่ยมบ้าน/แอดเพื่อนได้ (บอทกดรับเพื่อนเอง)
--   - _bots_tick(): ให้บอท "เล่น" ต่อเอง เช่น อัปเลเวลมอนสเตอร์ ดันด่าน เก็บเหรียญ (เรียกทุกชั่วโมงผ่าน pg_cron ถ้ามี)
--   - ลบบอททั้งหมด (ถ้าไม่ต้องการแล้ว): delete from auth.users where id in (select user_id from public.bots);
-- =====================================================================
create table if not exists public.bots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bots enable row level security;

do $$
declare b record; u uuid; i int; sp text; ids bigint[]; el text; mid bigint;
  pool text[] := array['kazemaru','kazemaru','kazemaru','kazekiri','kazekiri','yorugumo','morihime','kuroga','hakuneko'];
begin
  for b in select * from (values
      ('ต้นกล้า_99',   'human',  14, 9),
      ('MaxPower',     'god',    22, 12),
      ('น้องมะปราง',   'beast',  11, 7),
      ('เจ้าป่าขาโหด', 'undead', 18, 11),
      ('ploy.ch',      'god',    9,  6),
      ('SirBoss',      'human',  26, 14),
      ('หมูกระทะ',     'beast',  16, 9),
      ('NongBeam',     'undead', 13, 8),
      ('ไอ้ต้น88',     'human',  20, 10),
      ('Kaito_TH',     'god',    24, 13)
    ) v(name, race, stage, plv) loop
    if exists (select 1 from public.players p join public.bots x on x.user_id = p.user_id where p.name = b.name) then continue; end if;
    u := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '{"provider":"anonymous","providers":["anonymous"]}'::jsonb, '{}'::jsonb, true,
              now() - (random() * interval '90 minutes'), now());
    insert into public.bots (user_id) values (u);
    insert into public.players (user_id, name, named, race, stage, lv, coins, amber, daily_streak, hatch_count, created_at, updated_at)
      values (u, b.name, true, b.race, b.stage, b.plv, 1500 + floor(random() * 5000)::int, 100 + floor(random() * 400)::int, 1,
              4 + floor(random() * 12)::int, now() - (random() * interval '90 minutes'), now() - (random() * interval '20 minutes'));
    -- ตัวเริ่มต้นเหมือนผู้เล่นจริง + ตัวที่ฟักได้ 2–4 ตัว (เลเวลกลาง ๆ ตามด่าน)
    insert into public.monsters (user_id, sp, lv, el) values
      (u, 'kuroga', least(40, 5 + b.stage / 2 + floor(random() * 4)::int), 'ไฟ'),
      (u, 'kazekiri', least(40, 4 + b.stage / 2 + floor(random() * 4)::int), 'น้ำ'),
      (u, 'morihime', least(40, 4 + b.stage / 2 + floor(random() * 4)::int), 'ลม');
    for i in 1..(2 + floor(random() * 3)::int) loop
      sp := pool[1 + floor(random() * array_length(pool, 1))::int];
      select e.el into el from public.el_rates e where e.w > 0 order by -ln(1 - random()) / e.w limit 1;
      insert into public.monsters (user_id, sp, lv, el, stars)
        values (u, sp, greatest(1, least(40, 2 + b.stage / 2 + floor(random() * 6)::int - 3)), el, case when random() < 0.25 then 1 else 0 end);
    end loop;
    update public.players set team = (select array_agg(id) from (select m.id from public.monsters m where m.user_id = u
        order by public._mon_pow(m.sp, m.lv, m.stars) desc limit 6) t) where user_id = u;
  end loop;
end $$;

-- บอท "เล่นเกม" เอง: เรียกทุกชั่วโมง
create or replace function public._bots_tick() returns int
language plpgsql security definer set search_path = '' as $$
declare bt record; m bigint; n int := 0; pw int;
begin
  for bt in select p.* from public.players p join public.bots x on x.user_id = p.user_id loop
    -- ดูเหมือนออนไลน์เป็นช่วง ๆ
    if random() < 0.6 then
      update public.players set updated_at = now() - (random() * interval '30 minutes'),
        coins = coins + 80 + floor(random() * 220)::int, amber = amber + floor(random() * 6)::int where user_id = bt.user_id;
    end if;
    -- อัปเลเวลมอนสเตอร์ในทีม 1 ตัว (ไม่เกิน Lv40)
    if random() < 0.35 then
      select id into m from public.monsters where user_id = bt.user_id and id = any(bt.team) and lv < 40 order by random() limit 1;
      if m is not null then update public.monsters set lv = lv + 1 where id = m; end if;
    end if;
    -- ดันด่านเมื่อพลังถึง (บอทหยุดที่ด่าน 60 ให้อยู่ระดับกลาง)
    if random() < 0.4 and bt.stage < 60 then
      pw := public._power(bt.user_id);
      if pw >= public._req(bt.stage + 1) * (case when (bt.stage + 1) % 10 = 0 then 1.1 else 1 end) then
        update public.players set stage = stage + 1, lv = least(99, lv + case when random() < 0.3 then 1 else 0 end) where user_id = bt.user_id;
      end if;
    end if;
    -- รับคำขอเป็นเพื่อนที่ค้างอยู่
    update public.friend_links set accepted = true
      where not accepted and requested_by <> bt.user_id and (a = bt.user_id or b = bt.user_id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public._bots_tick() from public, anon, authenticated;

-- ตั้งให้รันทุกชั่วโมง (ถ้าโปรเจกต์มี pg_cron) · ไม่มีก็ข้าม
do $$ begin
  begin
    create extension if not exists pg_cron;
  exception when others then raise notice 'pg_cron not available: %', sqlerrm; end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'amber_bots_tick';
    perform cron.schedule('amber_bots_tick', '17 * * * *', 'select public._bots_tick()');
  end if;
end $$;
select public._bots_tick();
