-- =====================================================================
-- ตำนานป่าอัมพร : ส่งสำรวจ (Expedition)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   ส่งมอนสเตอร์ที่ไม่อยู่ในทีมออกไปสำรวจได้ครั้งละไม่เกิน 6 ตัว (1 การสำรวจต่อผู้เล่น)
--   ระหว่างสำรวจ ตัวที่ส่งไปจะออกจากคลัง (เก็บเป็นสำเนาไว้ในตาราง expeditions)
--   ตอนรับผล: แต่ละตัวมีโอกาสไม่กลับมา = ความเสี่ยงพื้นฐานของพื้นที่ × (พลังแนะนำ / พลังทีมสำรวจ)^1.3
--             × (พลังเฉลี่ย / พลังตัวนั้น)^0.3  จำกัด 1–60%
--   ตัวที่รอดกลับเข้าคลัง (ได้เลเวลเพิ่มตามพื้นที่) + เหรียญ/อัมพร · ตัวที่ไม่กลับมาหายถาวร แต่ได้ "วิญญาณ" ชดเชย
--   เรียกกลับก่อนเวลาได้: กลับครบทุกตัว ไม่ได้รางวัล · วิญญาณ 10 = อัมพร 25
-- =====================================================================
alter table public.players add column if not exists souls int not null default 0;

create table if not exists public.expeditions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  zone       text not null,
  mons       jsonb not null,            -- สำเนามอนสเตอร์ที่ส่งไป [{id,sp,lv,el,stars,pow}]
  power      int  not null,
  started_at timestamptz not null default now(),
  ends_at    timestamptz not null,
  done       boolean not null default false,
  result     jsonb
);
create index if not exists expeditions_user on public.expeditions(user_id, done);
alter table public.expeditions enable row level security;

-- พื้นที่สำรวจ: ชื่อ, พลังแนะนำ, นาที, ความเสี่ยงพื้นฐาน, เหรียญ, อัมพร, เลเวลที่ได้, พลังขั้นต่ำเพื่อปลดล็อก
create or replace function public._exp_zones() returns jsonb language sql immutable as $$
  select '[
    {"id":"meadow","name":"ทุ่งหญ้าชายป่า","rec":1200,"min":30,"risk":0.04,"coins":600,"amber":5,"lv":1},
    {"id":"crystal","name":"ถ้ำคริสตัลเรืองแสง","rec":4000,"min":120,"risk":0.07,"coins":2200,"amber":15,"lv":2},
    {"id":"ashen","name":"หุบเขาเถ้าถ่าน","rec":10000,"min":240,"risk":0.10,"coins":5500,"amber":35,"lv":3},
    {"id":"skyruin","name":"ซากวิหารลอยฟ้า","rec":25000,"min":480,"risk":0.14,"coins":12000,"amber":80,"lv":4}
  ]'::jsonb $$;
create or replace function public._exp_zone(z text) returns jsonb language sql immutable as $$
  select e from jsonb_array_elements(public._exp_zones()) e where e->>'id' = z $$;
-- พลังของมอนสเตอร์ 1 ตัว (สูตรเดียวกับ _power)
create or replace function public._mon_pow(v_sp text, v_lv int, v_st int) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(round(s.pow * (1 + 0.1 * (v_lv - 1)) * (1 + 0.05 * coalesce(v_st, 0))), 0)::int from public.species s where s.sp = v_sp $$;
-- โอกาสไม่กลับมาของแต่ละตัว
create or replace function public._exp_risk(z jsonb, party int, one int, avg_pow float8) returns float8 language sql immutable as $$
  select least(0.6, greatest(0.01,
    (z->>'risk')::float8 * power((z->>'rec')::float8 / greatest(party, 1), 1.3) * power(avg_pow / greatest(one, 1), 0.3))) $$;

create or replace function public.exp_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1;
  return jsonb_build_object('zones', public._exp_zones(), 'souls', p.souls,
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb), 'soul_rate', jsonb_build_object('souls', 10, 'amber', 25),
    'active', case when e.id is null then null else jsonb_build_object('id', e.id, 'zone', e.zone, 'mons', e.mons, 'power', e.power,
      'started_at', e.started_at, 'ends_at', e.ends_at, 'left', greatest(0, ceil(extract(epoch from e.ends_at - now())))::int) end);
end $$;

create or replace function public.exp_start(zone text, mon_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; z jsonb := public._exp_zone(zone); n int; snap jsonb; pw int; eid bigint;
begin
  p := public._player(u);
  if z is null then raise exception 'bad_zone'; end if;
  if exists (select 1 from public.expeditions where user_id = u and not done) then raise exception 'exp_busy'; end if;
  n := coalesce(cardinality(mon_ids), 0);
  if n < 1 or n > 6 or (select count(distinct x) from unnest(mon_ids) x) <> n then raise exception 'bad_party'; end if;
  if mon_ids && p.team then raise exception 'mon_in_team'; end if;
  select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'el', m.el, 'stars', m.stars,
           'pow', public._mon_pow(m.sp, m.lv, m.stars)) order by m.id), sum(public._mon_pow(m.sp, m.lv, m.stars))
    into snap, pw from public.monsters m where m.user_id = u and m.id = any(mon_ids);
  if jsonb_array_length(coalesce(snap, '[]'::jsonb)) <> n then raise exception 'no_monster'; end if;
  delete from public.monsters m where m.user_id = u and m.id = any(mon_ids);
  insert into public.expeditions (user_id, zone, mons, power, ends_at)
    values (u, zone, snap, pw, now() + make_interval(mins => (z->>'min')::int)) returning id into eid;
  update public.players set updated_at = now() where user_id = u;
  return jsonb_build_object('exp', public.exp_state(), 'state', public._state(u));
end $$;

-- เรียกกลับก่อนเวลา: ทุกตัวกลับมาครบ ไม่ได้รางวัล
create or replace function public.exp_recall() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions; m jsonb;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1 for update;
  if e.id is null then raise exception 'no_exp'; end if;
  if now() >= e.ends_at then raise exception 'exp_finished'; end if;
  for m in select * from jsonb_array_elements(e.mons) loop
    insert into public.monsters (user_id, sp, lv, el, stars) values (u, m->>'sp', (m->>'lv')::int, m->>'el', coalesce((m->>'stars')::int, 0));
  end loop;
  update public.expeditions set done = true, result = jsonb_build_object('recalled', true) where id = e.id;
  return jsonb_build_object('exp', public.exp_state(), 'state', public._state(u));
end $$;

-- รับผลการสำรวจ (สุ่มผลที่เซิร์ฟเวอร์ครั้งเดียว)
create or replace function public.exp_claim() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions; z jsonb; m jsonb; n int; avg_pow float8; risk float8;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; nlv int; mx int; v_souls int := 0; s int; v_coins int; v_amber int; k float8; res jsonb;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1 for update;
  if e.id is null then raise exception 'no_exp'; end if;
  if now() < e.ends_at then raise exception 'exp_not_done'; end if;
  z := public._exp_zone(e.zone); n := jsonb_array_length(e.mons); avg_pow := e.power::float8 / greatest(n, 1);
  for m in select * from jsonb_array_elements(e.mons) loop
    risk := public._exp_risk(z, e.power, (m->>'pow')::int, avg_pow);
    if random() < risk then
      s := 2 * (select rar from public.species where sp = m->>'sp') + 3 * coalesce((m->>'stars')::int, 0) + (m->>'lv')::int / 5;
      v_souls := v_souls + s; dead := dead || jsonb_build_array(m || jsonb_build_object('souls', s, 'risk', round(risk::numeric, 3)));
    else
      select max_lv into mx from public.species where sp = m->>'sp';
      nlv := least(coalesce(mx, 100), (m->>'lv')::int + (z->>'lv')::int);
      insert into public.monsters (user_id, sp, lv, el, stars) values (u, m->>'sp', nlv, m->>'el', coalesce((m->>'stars')::int, 0));
      alive := alive || jsonb_build_array(m || jsonb_build_object('lv_new', nlv, 'risk', round(risk::numeric, 3)));
    end if;
  end loop;
  k := 0.5 + 0.5 * jsonb_array_length(alive)::float8 / greatest(n, 1);
  v_coins := round((z->>'coins')::int * k * (0.5 + 0.5 * least(1.0, n / 6.0)));
  v_amber := round((z->>'amber')::int * k * (0.5 + 0.5 * least(1.0, n / 6.0)));
  update public.players set coins = coins + v_coins, amber = amber + v_amber, souls = souls + v_souls, updated_at = now() where user_id = u;
  res := jsonb_build_object('zone', e.zone, 'alive', alive, 'dead', dead, 'coins', v_coins, 'amber', v_amber, 'souls', v_souls);
  update public.expeditions set done = true, result = res where id = e.id;
  return jsonb_build_object('result', res, 'exp', public.exp_state(), 'state', public._state(u));
end $$;

-- แลกวิญญาณเป็นอัมพร (ชุดละ 10 วิญญาณ = 25 อัมพร)
create or replace function public.soul_exchange(sets int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  if sets is null or sets < 1 or sets > 100 then raise exception 'bad_amount'; end if;
  if p.souls < sets * 10 then raise exception 'not_enough_souls'; end if;
  update public.players set souls = souls - sets * 10, amber = amber + sets * 25, updated_at = now() where user_id = u;
  return jsonb_build_object('exp', public.exp_state(), 'state', public._state(u));
end $$;

revoke execute on function public._exp_zones(), public._exp_zone(text), public._mon_pow(text, int, int), public._exp_risk(jsonb, int, int, float8)
  from public, anon, authenticated;
revoke execute on function public.exp_state(), public.exp_start(text, bigint[]), public.exp_recall(), public.exp_claim(), public.soul_exchange(int) from public, anon;
grant execute on function public.exp_state(), public.exp_start(text, bigint[]), public.exp_recall(), public.exp_claim(), public.soul_exchange(int) to authenticated;
