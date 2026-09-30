-- =====================================================================
-- ตำนานป่าอัมพร : บุกปล้น — โอกาสได้ตัวที่ตีมาเป็นของเรา + เหรียญมากขึ้น
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_raid_open.sql ก่อน
--   ชนะแล้วมีโอกาสได้มอนสเตอร์ตัวที่ตีมาเป็นของเรา (ได้สำเนาเลเวลเท่ากัน ดาวเริ่มที่ 0 · เจ้าของเดิมไม่เสียตัว · คลังเต็มไม่ได้)
--   ระดับ 1 = 15% · ระดับ 2 = 8% · ระดับ 3 = 4% · ระดับ 4 (เทพ) = 1.5%
--   เหรียญเมื่อชนะ = พลังเป้า × 1.2 (เดิม 0.8) · ฝั่งโดนปล้นเสีย 1/3 ของที่เราได้ (ไม่เกิน 5% ที่มี)
-- =====================================================================
create or replace function public._fraid_c(k text) returns float8 language sql immutable as $$
  select case k when 'n' then 4 when 'def_k' then 3 when 'win_min' then 0.10 when 'win_max' then 0.90
    when 'die_win' then 0.05 when 'die_lose' then 0.25 when 'loot_k' then 1.2 when 'per_day' then 5 when 'robbed_max' then 3 end $$;
create or replace function public._fraid_cap() returns jsonb language sql immutable as $$
  select '{"1":0.15,"2":0.08,"3":0.04,"4":0.015,"5":0.01}'::jsonb $$;

create or replace function public._fraid_info(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'left', greatest(0, public._fraid_c('per_day')::int - (select count(*) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge))::int,
    'per_day', public._fraid_c('per_day')::int, 'n', public._fraid_c('n')::int, 'def_k', public._fraid_c('def_k'),
    'win_min', public._fraid_c('win_min'), 'cap', public._fraid_cap(), 'loot_k', public._fraid_c('loot_k'), 'win_max', public._fraid_c('win_max'), 'die_win', public._fraid_c('die_win'), 'die_lose', public._fraid_c('die_lose'),
    'raided', coalesce((select jsonb_agg(public._code(r.defender)) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge), '[]'::jsonb),
    'scouts_left', greatest(0, 20 - (select count(*) from public.raid_scouts s where s.attacker = u and s.day = public._today()))::int,
    'robbed', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'code', public._code(r.attacker), 'win', r.win, 'lost', r.lost, 'at', r.created_at, 'revenge', public._can_revenge(u, r.attacker) is not null) order by r.id desc)
                 from public.friend_raids r join public.players p on p.user_id = r.attacker where r.defender = u and r.day = public._today()), '[]'::jsonb),
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb)) $$;

create or replace function public.friend_raid(code text, target bigint, mon_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today();
  tm public.monsters; dp int; ap int; win_p float8; win boolean; m record; die float8; s int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; v_souls int := 0; loot int := 0; amb int := 0; lost int := 0; fcoins int; dead_ids bigint[] := '{}'; rev bigint; cap_p float8 := 0; cap_id bigint; cap jsonb;
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
    lost := least(loot / 3, floor(coalesce(fcoins, 0) * 0.05)::int);
    update public.players set coins = coins - lost where user_id = t;
    -- โอกาสได้ตัวที่ตีมาเป็นของเรา (สำเนา ดาวเริ่มใหม่ เจ้าของเดิมไม่เสียตัว) ตามระดับ · คลังเต็มไม่ได้
    cap_p := coalesce((public._fraid_cap() ->> (select rar from public.species where sp = tm.sp)::text)::float8, 0);
    if random() < cap_p then
      if (select count(*) from public.monsters where user_id = u) < public._c('slots') then
        insert into public.monsters (user_id, sp, lv, el, stars) values (u, tm.sp, tm.lv, tm.el, 0) returning id into cap_id;
        cap := jsonb_build_object('id', cap_id, 'sp', tm.sp, 'lv', tm.lv, 'el', tm.el, 'stars', 0);
      else
        cap := jsonb_build_object('full', true, 'sp', tm.sp, 'lv', tm.lv);
      end if;
    end if;
  end if;
  update public.players set coins = coins + loot, amber = amber + amb, souls = souls + v_souls, updated_at = now() where user_id = u;
  insert into public.friend_raids (attacker, defender, day, win, coins, lost, is_revenge) values (u, t, d, win, loot, lost, rev is not null);
  if rev is not null then update public.friend_raids set revenged = true where id = rev; end if;
  return jsonb_build_object('win', win, 'win_p', round(win_p::numeric, 3), 'die', die, 'alive', alive, 'dead', dead, 'souls', v_souls,
    'coins', loot, 'amber', amb, 'revenge', rev is not null, 'captured', cap, 'cap_p', cap_p, 'lost', lost, 'target', jsonb_build_object('id', tm.id, 'sp', tm.sp, 'lv', tm.lv, 'stars', tm.stars, 'el', tm.el),
    'info', public._fraid_info(u), 'state', public._state(u));
end $$;

revoke execute on function public._fraid_cap() from public, anon, authenticated;
