-- =====================================================================
-- ตำนานป่าอัมพร : ระบบเซิร์ฟเวอร์ (เวอร์ชัน 2)
-- เซิร์ฟเวอร์เป็นผู้ตัดสิน เหรียญ อัมพร พลังงาน ผลสุ่มไข่ เลเวล วิวัฒนาการ ทีม รางวัล
-- ผู้เล่นอ่านข้อมูลของตัวเองได้อย่างเดียว แก้ไขได้ผ่านฟังก์ชันด้านล่างเท่านั้น
--
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run
-- รันซ้ำได้ ไม่ลบข้อมูลผู้เล่นเดิม
-- =====================================================================

-- ---------- ข้อมูลสายพันธุ์ (ทุกคนอ่านได้) ----------
create table if not exists public.species (
  sp         text primary key,
  name       text not null,
  rar        int  not null check (rar between 1 and 5),
  max_lv     int  not null check (max_lv between 1 and 100),
  evolve_to  text references public.species(sp),
  evolve_cost int not null default 0
);
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('kazekiri','คาเซะคิริ',4,40,null,0),
  ('amateru','อามาเทรุ',5,50,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('kazemaru','คาเซะมารุ',3,20,'kazekiri',300)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv, evolve_to=excluded.evolve_to, evolve_cost=excluded.evolve_cost;

-- ---------- ผู้เล่น ----------
create table if not exists public.players (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  name         text not null default 'ผู้เล่น' check (char_length(name) between 1 and 24),
  lv           int  not null default 1  check (lv between 1 and 999),
  xp           int  not null default 0  check (xp >= 0),
  coins        int  not null default 1200 check (coins >= 0),
  amber        int  not null default 50   check (amber >= 0),
  energy       int  not null default 45   check (energy >= 0),
  energy_at    timestamptz not null default now(),
  amber_at     timestamptz not null default now(),       -- เวลาที่ต้นอัมพรพร้อมเก็บครั้งถัดไป
  daily_streak int  not null default 0,
  daily_last   date,
  hatch_count  int  not null default 0,
  pity         int  not null default 0,                   -- นับไข่ทองคำที่ยังไม่ได้ ★5
  quest_day    date,
  quests       jsonb not null default '{}'::jsonb,
  team         bigint[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- มอนสเตอร์ของผู้เล่น ----------
create table if not exists public.monsters (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sp         text not null references public.species(sp),
  lv         int  not null default 1 check (lv between 1 and 100),
  created_at timestamptz not null default now()
);
-- ผู้เล่นตั้งชื่อเองแล้วหรือยัง (ใช้แสดงหน้าต้อนรับครั้งแรก)
alter table public.players add column if not exists named boolean not null default false;

create index if not exists monsters_user_idx on public.monsters (user_id);

-- ---------- การต่อสู้ (ใบเริ่ม-จบด่าน กันส่งผลชนะปลอม) ----------
create table if not exists public.battles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stage       text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  won         boolean
);
create index if not exists battles_user_idx on public.battles (user_id, started_at desc);

-- ---------- สิทธิ์: อ่านได้เฉพาะของตัวเอง ห้ามเขียนตรง ----------
alter table public.species  enable row level security;
alter table public.players  enable row level security;
alter table public.monsters enable row level security;
alter table public.battles  enable row level security;

drop policy if exists "species readable" on public.species;
create policy "species readable" on public.species for select using (true);
drop policy if exists "read own player" on public.players;
create policy "read own player" on public.players for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "read own monsters" on public.monsters;
create policy "read own monsters" on public.monsters for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "read own battles" on public.battles;
create policy "read own battles" on public.battles for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.species, public.players, public.monsters, public.battles from anon, authenticated;
grant select on public.species to anon, authenticated;
grant select on public.players, public.monsters, public.battles to authenticated;

-- =====================================================================
-- ค่าคงที่ของเกม
-- =====================================================================
create or replace function public._c(k text) returns int language sql immutable as $$
  select case k
    when 'energy_max'   then 60
    when 'energy_sec'   then 180   -- ฟื้นพลังงาน 1 หน่วยทุก 3 นาที
    when 'amber_sec'    then 600   -- ต้นอัมพรออกผลทุก 10 นาที
    when 'amber_yield'  then 5
    when 'slots'        then 30
    when 'wild_cost'    then 100   -- เหรียญ
    when 'gold_cost'    then 30    -- อัมพร
    when 'pity_max'     then 30    -- ไข่ทองคำครบ 30 ใบ การันตี ★5
    when 'energy_buy'   then 20    -- อัมพรต่อพลังงาน +30
  end $$;

create or replace function public._today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Bangkok')::date $$;

-- ผู้ใช้ปัจจุบัน (ต้องล็อกอิน)
create or replace function public._uid() returns uuid language plpgsql stable set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  return u;
end $$;

-- ล็อกแถวผู้เล่น + สร้างใหม่ถ้ายังไม่มี + ฟื้นพลังงาน + รีเซ็ตภารกิจรายวัน
create or replace function public._player(u uuid) returns public.players
language plpgsql security definer set search_path = '' as $$
declare p public.players; n int; sec int := public._c('energy_sec');
begin
  select * into p from public.players where user_id = u for update;
  if not found then
    insert into public.players (user_id, name) values (u, 'นักฝึก#' || upper(substr(replace(u::text,'-',''),1,4))) returning * into p;
    -- มอนสเตอร์เริ่มต้น + มังกรของขวัญ
    insert into public.monsters (user_id, sp, lv) values
      (u,'kazekiri',18),(u,'kazemaru',4),(u,'kazemaru',7),(u,'kazemaru',1),(u,'amateru',10);
    update public.players set team = (
      select array_agg(id order by ord) from (
        select id, case sp when 'kazekiri' then 1 when 'amateru' then 2 else 3 end*100 - lv as ord
        from public.monsters where user_id = u order by ord limit 3) t)
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
end $$;

create or replace function public._qadd(u uuid, k text, n int default 1) returns void
language sql security definer set search_path = '' as $$
  update public.players set quests = jsonb_set(quests, array[k], to_jsonb(coalesce((quests->>k)::int,0) + n)) where user_id = u;
$$;

-- สถานะทั้งหมดที่หน้าเกมต้องใช้
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
      'quests', p.quests, 'team', to_jsonb(p.team), 'slots', public._c('slots'),
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8))),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

-- =====================================================================
-- ฟังก์ชันที่หน้าเกมเรียก (RPC)
-- =====================================================================

-- โหลดเกม (สร้างผู้เล่นใหม่อัตโนมัติ)
create or replace function public.game_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  return public._state(u);
end $$;

-- เปลี่ยนชื่อ
create or replace function public.set_name(new_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); n text := btrim(coalesce(new_name,''));
begin
  if char_length(n) < 1 or char_length(n) > 24 then raise exception 'bad_name'; end if;
  perform public._player(u);
  update public.players set name = n, named = true, updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;

-- ฟักไข่: kind = 'wild' (100 เหรียญ) หรือ 'gold' (30 อัมพร)
create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; mid bigint; chance float8;
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
  if kind = 'wild' then
    if p.coins < public._c('wild_cost') then raise exception 'not_enough_coins'; end if;
    update public.players set coins = coins - public._c('wild_cost') where user_id = u;
    chance := 0.02;
  else
    if p.amber < public._c('gold_cost') then raise exception 'not_enough_amber'; end if;
    update public.players set amber = amber - public._c('gold_cost'), pity = pity + 1 where user_id = u;
    chance := 0.08;
  end if;
  if r < chance or (kind = 'gold' and p.pity + 1 >= public._c('pity_max')) then
    v_sp := 'amateru';
    if kind = 'gold' then update public.players set pity = 0 where user_id = u; end if;
  else
    v_sp := 'kazemaru';
  end if;
  insert into public.monsters (user_id, sp, lv) values (u, v_sp, 1) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;

-- อัปเลเวล: ค่าใช้จ่าย 60 × เลเวลปัจจุบัน
create or replace function public.level_up(mon_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; m public.monsters; mx int; cost int;
begin
  p := public._player(u);
  select * into m from public.monsters where id = mon_id and user_id = u for update;
  if not found then raise exception 'no_monster'; end if;
  select max_lv into mx from public.species where sp = m.sp;
  if m.lv >= mx then raise exception 'max_level'; end if;
  cost := 60 * m.lv;
  if p.coins < cost then raise exception 'not_enough_coins'; end if;
  update public.players set coins = coins - cost, updated_at = now() where user_id = u;
  update public.monsters set lv = lv + 1 where id = m.id;
  return jsonb_build_object('lv', m.lv + 1, 'state', public._state(u));
end $$;

-- วิวัฒนาการ: ต้องเลเวลเต็ม
create or replace function public.evolve_monster(mon_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; m public.monsters; s public.species;
begin
  p := public._player(u);
  select * into m from public.monsters where id = mon_id and user_id = u for update;
  if not found then raise exception 'no_monster'; end if;
  select * into s from public.species where sp = m.sp;
  if s.evolve_to is null then raise exception 'cannot_evolve'; end if;
  if m.lv < s.max_lv then raise exception 'level_too_low'; end if;
  if p.coins < s.evolve_cost then raise exception 'not_enough_coins'; end if;
  update public.players set coins = coins - s.evolve_cost, updated_at = now() where user_id = u;
  update public.monsters set sp = s.evolve_to, lv = 1 where id = m.id;
  return jsonb_build_object('sp', s.evolve_to, 'state', public._state(u));
end $$;

-- จัดทีม 1-3 ตัว (ต้องเป็นมอนของตัวเอง ไม่ซ้ำ)
create or replace function public.set_team(ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  if ids is null or cardinality(ids) < 1 or cardinality(ids) > 3 then raise exception 'bad_team'; end if;
  if (select count(distinct x) from unnest(ids) x) <> cardinality(ids) then raise exception 'bad_team'; end if;
  if (select count(*) from public.monsters where user_id = u and id = any(ids)) <> cardinality(ids) then raise exception 'bad_team'; end if;
  update public.players set team = ids, updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;

-- รางวัลเข้าเกมรายวัน (รอบ 7 วัน)
create or replace function public.claim_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; d date := public._today(); streak int; day int; kind text; amt int;
begin
  p := public._player(u);
  if p.daily_last = d then raise exception 'already_claimed'; end if;
  streak := case when p.daily_last = d - 1 then p.daily_streak + 1 else 1 end;
  day := ((streak - 1) % 7) + 1;
  select k, a into kind, amt from (values (1,'coins',200),(2,'amber',5),(3,'coins',300),(4,'coins',400),(5,'amber',10),(6,'coins',500),(7,'amber',30)) v(i,k,a) where i = day;
  if kind = 'coins' then update public.players set coins = coins + amt where user_id = u;
  else update public.players set amber = amber + amt where user_id = u; end if;
  update public.players set daily_streak = streak, daily_last = d, updated_at = now() where user_id = u;
  return jsonb_build_object('day', day, 'kind', kind, 'amount', amt, 'state', public._state(u));
end $$;

-- เก็บอัมพรจากต้นไม้
create or replace function public.collect_amber() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  if now() < p.amber_at then raise exception 'not_ready'; end if;
  update public.players set amber = amber + public._c('amber_yield'),
    amber_at = now() + make_interval(secs => public._c('amber_sec')), updated_at = now() where user_id = u;
  perform public._qadd(u, 'amber');
  return jsonb_build_object('amount', public._c('amber_yield'), 'state', public._state(u));
end $$;

-- รับรางวัลภารกิจ
create or replace function public.claim_quest(q text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; need int; kind text; amt int;
begin
  p := public._player(u);
  select n, k, a into need, kind, amt from (values ('hatch',1,'coins',100),('battle',3,'amber',10),('amber',1,'coins',150)) v(id,n,k,a) where id = q;
  if need is null then raise exception 'bad_quest'; end if;
  if coalesce((p.quests->>(q||'C'))::boolean, false) then raise exception 'already_claimed'; end if;
  if coalesce((p.quests->>q)::int, 0) < need then raise exception 'quest_not_done'; end if;
  if kind = 'coins' then update public.players set coins = coins + amt where user_id = u;
  else update public.players set amber = amber + amt where user_id = u; end if;
  update public.players set quests = quests || jsonb_build_object(q||'C', true), updated_at = now() where user_id = u;
  return jsonb_build_object('kind', kind, 'amount', amt, 'state', public._state(u));
end $$;

-- ร้านค้า: เติมพลังงาน +30 ด้วยอัมพร
create or replace function public.buy_energy() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  if p.amber < public._c('energy_buy') then raise exception 'not_enough_amber'; end if;
  update public.players set amber = amber - public._c('energy_buy'), energy = least(99, energy + 30), updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;

-- เริ่มด่าน: หักพลังงาน ออกใบเริ่มด่าน
create or replace function public.battle_start(stage text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; cost int := 6; bid uuid;
begin
  p := public._player(u);
  if stage not in ('1-1','1-2','1-3') then raise exception 'bad_stage'; end if;
  if p.energy < cost then raise exception 'not_enough_energy'; end if;
  update public.players set energy = energy - cost,
    energy_at = case when energy >= public._c('energy_max') then now() else energy_at end, updated_at = now() where user_id = u;
  insert into public.battles (user_id, stage) values (u, stage) returning id into bid;
  return jsonb_build_object('battle_id', bid, 'state', public._state(u));
end $$;

-- จบด่าน: ต้องใช้เวลาอย่างน้อย 15 วินาที และจบได้ครั้งเดียว
create or replace function public.battle_finish(battle_id uuid, won boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); b public.battles; v_reward int := 0; v_xp int := 0;
begin
  perform public._player(u);
  select * into b from public.battles where id = battle_id and user_id = u for update;
  if not found then raise exception 'no_battle'; end if;
  if b.finished_at is not null then raise exception 'already_finished'; end if;
  if now() - b.started_at < interval '15 seconds' then raise exception 'too_fast'; end if;
  if now() - b.started_at > interval '2 hours' then raise exception 'expired'; end if;
  update public.battles set finished_at = now(), won = coalesce(battle_finish.won, false) where id = b.id;
  if coalesce(battle_finish.won, false) then
    v_reward := case b.stage when '1-1' then 80 when '1-2' then 100 else 150 end;
    v_xp := 10;
    update public.players set coins = coins + v_reward, xp = xp + v_xp, updated_at = now() where user_id = u;
    update public.players set lv = lv + xp / 100, xp = xp % 100 where user_id = u and xp >= 100;
    perform public._qadd(u, 'battle');
  end if;
  return jsonb_build_object('coins', v_reward, 'xp', v_xp, 'state', public._state(u));
end $$;

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.game_state(), public.set_name(text), public.hatch_egg(text), public.level_up(bigint),
  public.evolve_monster(bigint), public.set_team(bigint[]), public.claim_daily(), public.collect_amber(),
  public.claim_quest(text), public.buy_energy(), public.battle_start(text), public.battle_finish(uuid, boolean)
  to authenticated;
-- ฟังก์ชันภายใน (ขึ้นต้นด้วย _) เรียกจากหน้าเว็บไม่ได้
