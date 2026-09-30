-- =====================================================================
-- ตำนานป่าอัมพร : บุกปล้นบ้านเพื่อน
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_friends.sql ก่อน
--   เลือกมอนสเตอร์ในฟาร์มเพื่อน 1 ตัวเป็นเป้า แล้วส่งมอนสเตอร์ของเรา 4 ตัวเข้าตี
--   โอกาสชนะ = พลังเรา / (พลังเรา + พลังเป้า × 3)  จำกัด 10–90%
--   ตัวที่ส่งไปมีโอกาสไม่กลับมา: ชนะ 5% / แพ้ 25% ต่อตัว (หายถาวร ได้วิญญาณชดเชยเหมือนส่งสำรวจ)
--   ชนะ: ได้เหรียญ = พลังเป้า × 0.8 (+ อัมพรโบนัสบางครั้ง) · เพื่อนเสียเหรียญครึ่งหนึ่งของที่เราได้ (ไม่เกิน 5% ที่มี)
--   จำกัด: ปล้นเพื่อนคนเดิมได้วันละ 1 ครั้ง · ปล้นได้วันละ 5 ครั้ง · แต่ละคนโดนปล้นได้วันละ 3 ครั้ง
-- =====================================================================
create table if not exists public.friend_raids (
  id         bigint generated always as identity primary key,
  attacker   uuid not null references auth.users(id) on delete cascade,
  defender   uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  win        boolean not null,
  coins      int not null default 0,
  lost       int not null default 0,     -- เหรียญที่ฝั่งถูกปล้นเสีย
  created_at timestamptz not null default now()
);
create index if not exists friend_raids_att on public.friend_raids(attacker, day);
create index if not exists friend_raids_def on public.friend_raids(defender, day);
alter table public.friend_raids enable row level security;

create or replace function public._fraid_c(k text) returns float8 language sql immutable as $$
  select case k when 'n' then 4 when 'def_k' then 3 when 'win_min' then 0.10 when 'win_max' then 0.90
    when 'die_win' then 0.05 when 'die_lose' then 0.25 when 'loot_k' then 0.8 when 'per_day' then 5 when 'robbed_max' then 3 end $$;

-- ข้อมูลการปล้นของผู้เล่น (ใช้แสดงในหน้าเพื่อน/ตอนเยี่ยม)
create or replace function public._fraid_info(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'left', greatest(0, public._fraid_c('per_day')::int - (select count(*) from public.friend_raids r where r.attacker = u and r.day = public._today()))::int,
    'per_day', public._fraid_c('per_day')::int, 'n', public._fraid_c('n')::int, 'def_k', public._fraid_c('def_k'),
    'win_min', public._fraid_c('win_min'), 'win_max', public._fraid_c('win_max'), 'die_win', public._fraid_c('die_win'), 'die_lose', public._fraid_c('die_lose'),
    'raided', coalesce((select jsonb_agg(public._code(r.defender)) from public.friend_raids r where r.attacker = u and r.day = public._today()), '[]'::jsonb),
    'robbed', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'code', public._code(r.attacker), 'win', r.win, 'lost', r.lost, 'at', r.created_at) order by r.id desc)
                 from public.friend_raids r join public.players p on p.user_id = r.attacker where r.defender = u and r.day = public._today()), '[]'::jsonb),
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb)) $$;

create or replace function public.friend_raid_info() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin p := public._player(u); return public._fraid_info(u); end $$;

create or replace function public.friend_raid(code text, target bigint, mon_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today();
  tm public.monsters; dp int; ap int; win_p float8; win boolean; m record; die float8; s int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; v_souls int := 0; loot int := 0; amb int := 0; lost int := 0; fcoins int; dead_ids bigint[] := '{}';
begin
  p := public._player(u);
  if t is null or not exists (select 1 from public.friend_links where a = least(u, t) and b = greatest(u, t) and accepted) then raise exception 'friend_not_friend'; end if;
  if exists (select 1 from public.friend_raids where attacker = u and defender = t and day = d) then raise exception 'raid_friend_today'; end if;
  if (select count(*) from public.friend_raids where attacker = u and day = d) >= public._fraid_c('per_day') then raise exception 'raid_limit'; end if;
  if (select count(*) from public.friend_raids where defender = t and day = d) >= public._fraid_c('robbed_max') then raise exception 'raid_shield'; end if;
  select * into tm from public.monsters where id = target and user_id = t;
  if not found then raise exception 'raid_no_target'; end if;
  if coalesce(cardinality(mon_ids), 0) <> public._fraid_c('n')::int or (select count(distinct x) from unnest(mon_ids) x) <> public._fraid_c('n')::int then raise exception 'raid_bad_party'; end if;
  if (select count(*) from public.monsters where user_id = u and id = any(mon_ids)) <> public._fraid_c('n')::int then raise exception 'no_monster'; end if;
  dp := round(public._mon_pow(tm.sp, tm.lv, tm.stars) * public._fraid_c('def_k'));
  select sum(public._mon_pow(x.sp, x.lv, x.stars)) into ap from public.monsters x where x.user_id = u and x.id = any(mon_ids);
  win_p := least(public._fraid_c('win_max'), greatest(public._fraid_c('win_min'), ap::float8 / greatest(ap + dp, 1)));
  win := random() < win_p;
  die := case when win then public._fraid_c('die_win') else public._fraid_c('die_lose') end;
  for m in select x.* from public.monsters x where x.user_id = u and x.id = any(mon_ids) order by x.id loop
    if random() < die then
      s := 2 * (select rar from public.species where sp = m.sp) + 3 * coalesce(m.stars, 0) + m.lv / 5;
      v_souls := v_souls + s; dead_ids := dead_ids || m.id;
      dead := dead || jsonb_build_array(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el, 'souls', s));
    else
      alive := alive || jsonb_build_array(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el));
    end if;
  end loop;
  if cardinality(dead_ids) > 0 then
    delete from public.monsters where user_id = u and id = any(dead_ids);
    update public.players set team = array(select x from unnest(team) x where not (x = any(dead_ids))) where user_id = u;
  end if;
  if win then
    loot := round(public._mon_pow(tm.sp, tm.lv, tm.stars) * public._fraid_c('loot_k'));
    if random() < 0.25 then amb := 5 + floor(random() * 11)::int; end if;
    select coins into fcoins from public.players where user_id = t for update;
    lost := least(loot / 2, floor(coalesce(fcoins, 0) * 0.05)::int);
    update public.players set coins = coins - lost where user_id = t;
  end if;
  update public.players set coins = coins + loot, amber = amber + amb, souls = souls + v_souls, updated_at = now() where user_id = u;
  insert into public.friend_raids (attacker, defender, day, win, coins, lost) values (u, t, d, win, loot, lost);
  return jsonb_build_object('win', win, 'win_p', round(win_p::numeric, 3), 'die', die, 'alive', alive, 'dead', dead, 'souls', v_souls,
    'coins', loot, 'amber', amb, 'lost', lost, 'target', jsonb_build_object('id', tm.id, 'sp', tm.sp, 'lv', tm.lv, 'stars', tm.stars, 'el', tm.el),
    'info', public._fraid_info(u), 'state', public._state(u));
end $$;

-- เยี่ยมบ้าน: ส่งพลังของมอนสเตอร์เพื่อน + ข้อมูลการปล้นกลับไปด้วย
create or replace function public.friend_visit(code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today(); f public.players; got int := 0;
begin
  p := public._player(u);
  if t is null or not exists (select 1 from public.friend_links where a = least(u, t) and b = greatest(u, t) and accepted)
    then raise exception 'friend_not_friend'; end if;
  select * into f from public.players where user_id = t;
  if not exists (select 1 from public.friend_visits where user_id = u and friend_id = t and day = d) then
    insert into public.friend_visits (user_id, friend_id, day) values (u, t, d);
    if (select count(*) from public.friend_visits where user_id = u and day = d) <= 5 then
      got := 50; update public.players set coins = coins + got, updated_at = now() where user_id = u;
    end if;
  end if;
  return jsonb_build_object('friend', public._fcard(t), 'team', to_jsonb(f.team), 'coins', got,
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el, 'pow', public._mon_pow(m.sp, m.lv, m.stars)) order by m.id)
                 from public.monsters m where m.user_id = t), '[]'::jsonb),
    'visitors_today', (select count(*) from public.friend_visits v where v.friend_id = t and v.day = d),
    'raid', public._fraid_info(u), 'state', public._state(u));
end $$;

revoke execute on function public._fraid_c(text), public._fraid_info(uuid) from public, anon, authenticated;
revoke execute on function public.friend_raid_info(), public.friend_raid(text, bigint, bigint[]) from public, anon;
grant execute on function public.friend_raid_info(), public.friend_raid(text, bigint, bigint[]) to authenticated;
