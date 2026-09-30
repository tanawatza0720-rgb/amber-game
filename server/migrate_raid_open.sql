-- =====================================================================
-- ตำนานป่าอัมพร : บุกปล้นแบบสุ่ม (เกาะเล็กรอบบ้าน) + แจ้งเตือนโดนปล้น + เอาคืน
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_friend_raid.sql ก่อน
--   แตะเกาะเล็กรอบเกาะเรา → สุ่มบ้านผู้เล่นที่พลังใกล้เคียง (สุ่มได้วันละ 20 ครั้ง) → บุกปล้นได้เหมือนบ้านเพื่อน
--   คนที่โดนปล้น เข้าเกมมาจะเห็นป๊อปอัป "หวดมันคืนเลยมั้ยเพ่" → เอาคืนได้ 1 ครั้งต่อการโดนปล้น ภายใน 36 ชม.
--   การเอาคืนไม่นับโควตาปล้นรายวัน ไม่ติดโล่ และไม่ต้องเป็นเพื่อนกัน
-- =====================================================================
alter table public.friend_raids add column if not exists is_revenge boolean not null default false;
alter table public.friend_raids add column if not exists revenged boolean not null default false;
alter table public.friend_raids add column if not exists seen boolean not null default false;
create table if not exists public.raid_scouts (
  attacker uuid not null references auth.users(id) on delete cascade,
  defender uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  primary key (attacker, day, defender)
);
alter table public.raid_scouts enable row level security;

-- การโดนปล้นล่าสุดที่ยังเอาคืนได้ (คืน id ของการปล้นนั้น)
create or replace function public._can_revenge(u uuid, t uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select r.id from public.friend_raids r where r.attacker = t and r.defender = u and not r.revenged and not r.is_revenge
    and r.created_at > now() - interval '36 hours' order by r.id desc limit 1 $$;

create or replace function public._fraid_info(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'left', greatest(0, public._fraid_c('per_day')::int - (select count(*) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge))::int,
    'per_day', public._fraid_c('per_day')::int, 'n', public._fraid_c('n')::int, 'def_k', public._fraid_c('def_k'),
    'win_min', public._fraid_c('win_min'), 'win_max', public._fraid_c('win_max'), 'die_win', public._fraid_c('die_win'), 'die_lose', public._fraid_c('die_lose'),
    'raided', coalesce((select jsonb_agg(public._code(r.defender)) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge), '[]'::jsonb),
    'scouts_left', greatest(0, 20 - (select count(*) from public.raid_scouts s where s.attacker = u and s.day = public._today()))::int,
    'robbed', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'code', public._code(r.attacker), 'win', r.win, 'lost', r.lost, 'at', r.created_at, 'revenge', public._can_revenge(u, r.attacker) is not null) order by r.id desc)
                 from public.friend_raids r join public.players p on p.user_id = r.attacker where r.defender = u and r.day = public._today()), '[]'::jsonb),
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb)) $$;

-- ข้อมูลเกาะของผู้เล่นอื่นสำหรับหน้าบุก (รูปแบบเดียวกับ friend_visit)
create or replace function public._raid_payload(u uuid, t uuid, kind text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kind', kind, 'friend', public._fcard(t), 'team', to_jsonb(f.team), 'coins', 0,
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el, 'pow', public._mon_pow(m.sp, m.lv, m.stars)) order by m.id)
                 from public.monsters m where m.user_id = t), '[]'::jsonb),
    'visitors_today', 0, 'raid', public._fraid_info(u), 'revenge', public._can_revenge(u, t) is not null, 'state', public._state(u))
  from public.players f where f.user_id = t $$;

-- สุ่มบ้านเป้าหมาย (พลังใกล้เคียงเรา)
create or replace function public.raid_random() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; d date := public._today(); t uuid; mp int;
begin
  p := public._player(u);
  if (select count(*) from public.raid_scouts where attacker = u and day = d) >= 20 then raise exception 'raid_scout_limit'; end if;
  if (select count(*) from public.friend_raids where attacker = u and day = d and not is_revenge) >= public._fraid_c('per_day') then raise exception 'raid_limit'; end if;
  mp := greatest(public._power(u), 1);
  select c.user_id into t from (
    select x.user_id from public.players x
    where x.user_id <> u and x.updated_at > now() - interval '14 days'
      and exists (select 1 from public.monsters m where m.user_id = x.user_id)
      and (select count(*) from public.friend_raids r where r.defender = x.user_id and r.day = d and not r.is_revenge) < public._fraid_c('robbed_max')
      and not exists (select 1 from public.friend_raids r where r.attacker = u and r.defender = x.user_id and r.day = d)
      and not exists (select 1 from public.raid_scouts s where s.attacker = u and s.defender = x.user_id and s.day = d)
    order by random() limit 60) c
  order by abs(ln(greatest(public._power(c.user_id), 1)::float8 / mp)) + random() * 0.8 limit 1;
  if t is null then raise exception 'raid_no_one'; end if;
  insert into public.raid_scouts (attacker, defender, day) values (u, t, d) on conflict do nothing;
  return public._raid_payload(u, t, 'random');
end $$;

-- เข้าเกาะเพื่อบุก (เพื่อน / บ้านที่สุ่มได้วันนี้ / เอาคืน)
create or replace function public.raid_visit(code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today();
begin
  p := public._player(u);
  if t is null then raise exception 'friend_not_found'; end if;
  if public._can_revenge(u, t) is null
     and not exists (select 1 from public.friend_links where a = least(u, t) and b = greatest(u, t) and accepted)
     and not exists (select 1 from public.raid_scouts where attacker = u and defender = t and day = d) then raise exception 'raid_no_access'; end if;
  return public._raid_payload(u, t, case when public._can_revenge(u, t) is not null then 'revenge' else 'visit' end);
end $$;

-- แจ้งเตือนการโดนปล้นที่ยังไม่เคยเห็น (เรียกแล้วถือว่าเห็นแล้ว)
create or replace function public.raid_inbox() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; res jsonb;
begin
  p := public._player(u);
  select coalesce(jsonb_agg(jsonb_build_object('code', public._code(r.attacker), 'name', a.name, 'race', a.race, 'lv', a.lv, 'power', public._power(r.attacker),
      'win', r.win, 'lost', r.lost, 'at', r.created_at, 'is_revenge', r.is_revenge, 'revenge', public._can_revenge(u, r.attacker) is not null) order by r.id desc), '[]'::jsonb)
    into res from public.friend_raids r join public.players a on a.user_id = r.attacker
    where r.defender = u and not r.seen and r.created_at > now() - interval '3 days';
  update public.friend_raids set seen = true where defender = u and not seen;
  return jsonb_build_object('raids', res);
end $$;

create or replace function public.friend_raid(code text, target bigint, mon_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today();
  tm public.monsters; dp int; ap int; win_p float8; win boolean; m record; die float8; s int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; v_souls int := 0; loot int := 0; amb int := 0; lost int := 0; fcoins int; dead_ids bigint[] := '{}'; rev bigint;
begin
  p := public._player(u);
  if t is null then raise exception 'friend_not_friend'; end if;
  rev := public._can_revenge(u, t);
  if rev is null then
    if not exists (select 1 from public.friend_links where a = least(u, t) and b = greatest(u, t) and accepted)
       and not exists (select 1 from public.raid_scouts where attacker = u and defender = t and day = d) then raise exception 'raid_no_access'; end if;
    if exists (select 1 from public.friend_raids where attacker = u and defender = t and day = d and not is_revenge) then raise exception 'raid_friend_today'; end if;
    if (select count(*) from public.friend_raids where attacker = u and day = d and not is_revenge) >= public._fraid_c('per_day') then raise exception 'raid_limit'; end if;
    if (select count(*) from public.friend_raids where defender = t and day = d and not is_revenge) >= public._fraid_c('robbed_max') then raise exception 'raid_shield'; end if;
  end if;
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
  insert into public.friend_raids (attacker, defender, day, win, coins, lost, is_revenge) values (u, t, d, win, loot, lost, rev is not null);
  if rev is not null then update public.friend_raids set revenged = true where id = rev; end if;
  return jsonb_build_object('win', win, 'win_p', round(win_p::numeric, 3), 'die', die, 'alive', alive, 'dead', dead, 'souls', v_souls,
    'coins', loot, 'amber', amb, 'revenge', rev is not null, 'lost', lost, 'target', jsonb_build_object('id', tm.id, 'sp', tm.sp, 'lv', tm.lv, 'stars', tm.stars, 'el', tm.el),
    'info', public._fraid_info(u), 'state', public._state(u));
end $$;

revoke execute on function public._can_revenge(uuid, uuid), public._raid_payload(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.raid_random(), public.raid_visit(text), public.raid_inbox() from public, anon;
grant execute on function public.raid_random(), public.raid_visit(text), public.raid_inbox() to authenticated;
