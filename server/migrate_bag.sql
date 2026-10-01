-- =====================================================================
-- ตำนานป่าอัมพร : ขยายคลังมอนสเตอร์ (กระเป๋า) ทีละ 10 ช่อง ด้วยอัมพร
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   ช่องเริ่มต้น 30 (_c('slots')) · players.bag_ext = จำนวนครั้งที่ขยาย (ครั้งละ +10 ช่อง) สูงสุด 5 ครั้ง (+50 → 80 ช่อง)
--   ราคาครั้งที่ k (เริ่ม 0) = 10 + 5×k อัมพร → 10, 15, 20, 25, 30 (รวม 100)
--   _slots(u) = ช่องจริงของผู้เล่น · ทุกฟังก์ชันที่เคยใช้ _c('slots') เปลี่ยนมาใช้ _slots(u) (เนื้อหาอื่นเหมือนเดิมทุกบรรทัด)
--   RPC buy_bag() ขยาย 1 ครั้ง คืน {slots, cost, state} · _state ส่ง bag_ext / bag_max / bag_cost เพิ่ม
-- =====================================================================
alter table public.players add column if not exists bag_ext int not null default 0;

create or replace function public._bag_c(k text) returns int language sql immutable as $$
  select case k when 'step' then 10 when 'max' then 5 when 'base_cost' then 10 when 'cost_inc' then 5 end $$;
create or replace function public._bag_cost(n int) returns int language sql immutable as $$
  select public._bag_c('base_cost') + public._bag_c('cost_inc') * n $$;
create or replace function public._slots(u uuid) returns int language sql stable security definer set search_path = '' as $$
  select public._c('slots') + public._bag_c('step') * coalesce((select bag_ext from public.players where user_id = u), 0) $$;

-- _state เพิ่มข้อมูลกระเป๋า (ห่อจากของเดิม ไม่แตะเนื้อหา)
create or replace function public._state_bag(u uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('bag_ext', coalesce(p.bag_ext,0), 'bag_max', public._bag_c('max'), 'bag_step', public._bag_c('step'),
    'bag_cost', case when coalesce(p.bag_ext,0) >= public._bag_c('max') then null else public._bag_cost(coalesce(p.bag_ext,0)) end)
  from public.players p where p.user_id = u $$;

create or replace function public._state(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'name', p.name, 'lv', p.lv, 'xp', p.xp, 'coins', p.coins, 'amber', p.amber,
      'energy', p.energy, 'energy_max', public._c('energy_max'),
      'energy_next', case when p.energy >= public._c('energy_max') then 0
                      else greatest(0, public._c('energy_sec') - floor(extract(epoch from now() - p.energy_at))::int) end,
      'energy_sec', public._c('energy_sec'),
      'amber_in', greatest(0, ceil(extract(epoch from p.amber_at - now()))::int),
      'daily_streak', p.daily_streak, 'daily_claimed', coalesce(p.daily_last = public._today(), false),
      'hatch_count', p.hatch_count, 'pity', p.pity, 'pity_max', public._c('pity_max'),
      'quests', p.quests, 'team', to_jsonb(p.team), 'slots', public._slots(u), 'bag', public._state_bag(u),
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int),
      'mail_new', public._mail_new(u), 'race', p.race),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; v_el text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._slots(u) then raise exception 'box_full'; end if;
  if kind = 'wild' then
    if p.coins < public._c('wild_cost') then raise exception 'not_enough_coins'; end if;
    update public.players set coins = coins - public._c('wild_cost') where user_id = u;
    w := array[0.83, 0.15, 0.02, 0.0];
  else
    if p.amber < public._c('gold_cost') then raise exception 'not_enough_amber'; end if;
    update public.players set amber = amber - public._c('gold_cost'), pity = pity + 1 where user_id = u;
    w := array[0.575, 0.32, 0.10, 0.005];
  end if;
  if r < w[4] then t := 4;
  elsif r < w[4] + w[3] then t := 3;
  elsif r < w[4] + w[3] + w[2] then t := 2;
  else t := 1; end if;
  if kind = 'gold' and t < 3 and p.pity + 1 >= public._c('pity_max') then t := 3; end if;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then v_sp := 'kazemaru'; t := 1; end if;
  if kind = 'gold' and t >= 3 then update public.players set pity = 0 where user_id = u; end if;
  -- สุ่มธาตุตามน้ำหนักในตาราง el_rates (ปกติเท่ากันทุกธาตุ · ช่วงอีเวนต์ปรับน้ำหนักได้)
  select e.el into v_el from public.el_rates e where e.w > 0 order by -ln(1 - random()) / e.w limit 1;
  insert into public.monsters (user_id, sp, lv, el) values (u, v_sp, 1, v_el) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  perform public._pull_log(u, v_sp, v_el);
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;

create or replace function public.friend_raid(code text, target bigint, mon_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); d date := public._today();
  tm public.monsters; dp int; ap int; win_p float8; win boolean; m record; die float8; s int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; v_souls int := 0; loot int := 0; amb int := 0; lost int := 0; fcoins int; dead_ids bigint[] := '{}'; rev bigint; tel text; pd float8; cap_p float8 := 0; cap_id bigint; cap jsonb;
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
  -- แพ้ทางธาตุ: พลังแต่ละตัว × (ตัวคูณที่เราตีเป้า ÷ ตัวคูณที่เป้าตีเรา)
  tel := public._el_of(tm.el, tm.sp);
  select round(sum(public._mon_pow(x.sp, x.lv, x.stars) * public._el_mul(public._el_of(x.el, x.sp), tel) / public._el_mul(tel, public._el_of(x.el, x.sp)))) into ap
    from public.monsters x where x.user_id = u and x.id = any(mon_ids);
  win_p := least(public._fraid_c('win_max'), greatest(public._fraid_c('win_min'), ap::float8 / greatest(ap + dp, 1)));
  win := random() < win_p;
  -- ชนะ = ไม่เสียตัว · แพ้ = แต่ละตัวมีโอกาสไม่กลับมา ตามระดับ เลเวล และดาว (ตัวแข็งแรงรอดง่ายกว่าหลายเท่า)
  die := case when win then 0 else public._fraid_c('die_lose') end;
  for m in select x.* from public.monsters x where x.user_id = u and x.id = any(mon_ids) order by x.id loop
    pd := die * coalesce((public._fraid_diek() ->> (select rar from public.species where sp = m.sp)::text)::float8, 1)
          / (1 + m.lv / 25.0) * power(0.85, coalesce(m.stars, 0));
    if not win and random() < pd then
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
      if (select count(*) from public.monsters where user_id = u) < public._slots(u) then
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

create or replace function public.hatch_god_egg() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); t int; v_sp text; v_el text; mid bigint; sure boolean;
begin
  p := public._player(u);
  if p.god_eggs + p.god_eggs_sure < 1 then raise exception 'no_god_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._slots(u) then raise exception 'box_full'; end if;
  sure := p.god_eggs_sure > 0;
  if sure then update public.players set god_eggs_sure = god_eggs_sure - 1 where user_id = u; t := 4;
  else
    update public.players set god_eggs = god_eggs - 1 where user_id = u;
    t := case when r < 0.008 then 4 when r < 0.158 then 3 else 2 end;
  end if;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then select s.sp into v_sp from public.species s where s.rar <= t order by s.rar desc, random() limit 1; end if;
  select e.el into v_el from public.el_rates e where e.w > 0 order by -ln(1 - random()) / e.w limit 1;
  insert into public.monsters (user_id, sp, lv, el) values (u, v_sp, 1, v_el) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._pull_log(u, v_sp, v_el);
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'sure', sure,
    'rar', (select rar from public.species where species.sp = v_sp), 'stage', public.stage_state(), 'state', public._state(u));
end $$;

create or replace function public.hatch_eggs(kind text, n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r jsonb; list jsonb := '[]'::jsonb; i int; cost int;
begin
  p := public._player(u);
  if kind not in ('wild', 'gold') then raise exception 'bad_egg'; end if;
  if n not in (1, 10) then raise exception 'bad_count'; end if;
  if (select count(*) from public.monsters where user_id = u) + n > public._slots(u) then raise exception 'box_full'; end if;
  cost := n * public._c(case kind when 'wild' then 'wild_cost' else 'gold_cost' end)::int;
  if kind = 'wild' and p.coins < cost then raise exception 'not_enough_coins'; end if;
  if kind = 'gold' and p.amber < cost then raise exception 'not_enough_amber'; end if;
  for i in 1..n loop
    r := public.hatch_egg(kind);
    list := list || jsonb_build_array(jsonb_build_object('mon', r->'mon', 'rar', r->'rar'));
  end loop;
  return jsonb_build_object('list', list, 'state', public._state(u));
end $$;

-- ขยายกระเป๋า 1 ครั้ง (+10 ช่อง)
create or replace function public.buy_bag() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; c int;
begin
  p := public._player(u);
  select * into p from public.players where user_id = u for update;
  if p.bag_ext >= public._bag_c('max') then raise exception 'bag_max'; end if;
  c := public._bag_cost(p.bag_ext);
  if p.amber < c then raise exception 'not_enough_amber'; end if;
  update public.players set amber = amber - c, bag_ext = bag_ext + 1, updated_at = now() where user_id = u;
  return jsonb_build_object('slots', public._slots(u), 'cost', c, 'state', public._state(u));
end $$;

revoke execute on function public._slots(uuid), public._state_bag(uuid) from public, anon, authenticated;
revoke execute on function public.buy_bag() from public, anon;
grant execute on function public.buy_bag() to authenticated;
