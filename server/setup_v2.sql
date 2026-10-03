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
  ('amateru','อามาเทรุ',5,50,null,0),
  ('kuroga','คุโรกะ',5,50,null,0)
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
  pity         int  not null default 0,                   -- นับไข่ทองคำที่ยังไม่ได้ระดับเทพเจ้า
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
    when 'pity_max'     then 30    -- ไข่ทองคำครบ 30 ใบ การันตีระดับเทพเจ้า
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
      (u,'kazekiri',18),(u,'kazemaru',4),(u,'kazemaru',7),(u,'kazemaru',1),(u,'amateru',10),(u,'kuroga',10);
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
    v_sp := case when random() < 0.5 then 'amateru' else 'kuroga' end;
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

-- ---------- ของขวัญตัวละครใหม่: คุโรกะ Lv10 ให้ผู้เล่นเดิมที่ยังไม่มี (รันซ้ำได้ ไม่แจกซ้ำ) ----------
insert into public.monsters (user_id, sp, lv)
select p.user_id, 'kuroga', 10 from public.players p
where not exists (select 1 from public.monsters m where m.user_id = p.user_id and m.sp = 'kuroga')
  and (select count(*) from public.monsters m where m.user_id = p.user_id) < 30;


-- =====================================================================
-- ตำนานป่าอัมพร : ระบบ idle (ดันด่านอัตโนมัติ + รางวัลตอนไม่อยู่ + บอสทุก 10 ด่าน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--
-- กติกา
--  - ทีม 3 ตัวดันด่านเองทีละด่าน เซิร์ฟเวอร์ตัดสินจาก "พลังทีม" เทียบ "พลังที่ด่านต้องการ"
--  - ด่านที่ 10, 20, 30 ... เป็นด่านบอส ต้องกดสู้เองแบบผลัดกันเล่น
--  - ระหว่างไม่อยู่ ได้เหรียญ/ค่าประสบการณ์ตามด่านที่ผ่าน สะสมได้สูงสุด 8 ชั่วโมง
-- =====================================================================

-- พลังพื้นฐานของแต่ละสายพันธุ์ (hp + atk×4 + def×3 + spd×2) เพิ่ม 10% ต่อเลเวล
alter table public.species add column if not exists pow int not null default 200;
update public.species set pow = case sp when 'kazemaru' then 220 when 'kazekiri' then 361
  when 'amateru' then 383 when 'kuroga' then 402 else pow end;

alter table public.players add column if not exists stage   int not null default 0;          -- ด่านสูงสุดที่ผ่านแล้ว
alter table public.players add column if not exists idle_at timestamptz not null default now(); -- เก็บรางวัลสะสมครั้งล่าสุด
alter table public.players add column if not exists push_at timestamptz not null default now() - interval '1 hour';

create or replace function public._c(k text) returns int language sql immutable as $$
  select case k
    when 'energy_max'   then 60
    when 'energy_sec'   then 180   -- ฟื้นพลังงาน 1 หน่วยทุก 3 นาที
    when 'amber_sec'    then 600   -- ต้นอัมพรออกผลทุก 10 นาที
    when 'amber_yield'  then 5
    when 'slots'        then 30
    when 'wild_cost'    then 100   -- เหรียญ
    when 'gold_cost'    then 30    -- อัมพร
    when 'pity_max'     then 30    -- ไข่ทองคำครบ 30 ใบ การันตีระดับเทพเจ้า
    when 'energy_buy'   then 20    -- อัมพรต่อพลังงาน +30
    when 'idle_max'     then 28800 -- สะสมรางวัลได้สูงสุด 8 ชั่วโมง
    when 'idle_xp'      then 1     -- ค่าประสบการณ์ผู้เล่นต่อนาที
    when 'push_sec'     then 15    -- ดันด่านได้ไม่เร็วกว่าทุก 15 วินาที
    when 'boss_amber'   then 30    -- อัมพรจากชนะบอส
  end $$;

-- พลังที่ด่าน n ต้องการ: เริ่ม 1,400 เพิ่มด่านละ 4%
create or replace function public._req(n int) returns int language sql immutable as $$
  select round(1400 * power(1.04, greatest(n, 1) - 1))::int $$;
-- เหรียญต่อนาทีตามด่านที่ผ่านแล้ว
create or replace function public._rate_c(st int) returns int language sql immutable as $$
  select 5 + 2 * greatest(st, 0) $$;
-- พลังทีมปัจจุบัน
create or replace function public._power(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)))), 0)::int
  from public.players p
  join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
  join public.species s on s.sp = m.sp
  where p.user_id = u $$;

-- สถานะทั้งหมดที่หน้าเกมต้องใช้ (เพิ่มข้อมูล idle)
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
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int)),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

-- เก็บรางวัลสะสม (ต้องสะสมอย่างน้อย 1 นาที)
create or replace function public.idle_claim() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; sec int; c int; x int;
begin
  p := public._player(u);
  sec := least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int));
  if sec < 60 then raise exception 'not_ready'; end if;
  c := (sec * public._rate_c(p.stage)) / 60;
  x := (sec * public._c('idle_xp')) / 60;
  update public.players set coins = coins + c, xp = xp + x, idle_at = now(), updated_at = now() where user_id = u;
  update public.players set lv = lv + xp / 100, xp = xp % 100 where user_id = u and xp >= 100;
  return jsonb_build_object('coins', c, 'xp', x, 'sec', sec, 'state', public._state(u));
end $$;

-- ดันด่านถัดไป 1 ด่าน: เซิร์ฟเวอร์ตัดสินจากพลังทีม
create or replace function public.idle_push() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; tgt int; pw int; ok boolean;
begin
  p := public._player(u);
  tgt := p.stage + 1;
  if tgt % 10 = 0 then raise exception 'boss_gate'; end if;
  if now() - p.push_at < make_interval(secs => public._c('push_sec')) then raise exception 'too_fast'; end if;
  pw := public._power(u);
  ok := pw >= public._req(tgt);
  update public.players set push_at = now(), stage = case when ok then tgt else stage end, updated_at = now() where user_id = u;
  if ok then perform public._qadd(u, 'battle'); end if;
  return jsonb_build_object('won', ok, 'stage', tgt, 'power', pw, 'need', public._req(tgt), 'state', public._state(u));
end $$;

-- เริ่มสู้บอส (ด่านที่ 10, 20, ...)
create or replace function public.boss_start() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; tgt int; bid uuid;
begin
  p := public._player(u);
  tgt := p.stage + 1;
  if tgt % 10 <> 0 then raise exception 'no_boss'; end if;
  insert into public.battles (user_id, stage) values (u, 'B' || tgt) returning id into bid;
  return jsonb_build_object('battle_id', bid, 'stage', tgt, 'need', public._req(tgt), 'state', public._state(u));
end $$;

-- จบการสู้บอส: ต้องใช้เวลาอย่างน้อย 15 วินาที จบได้ครั้งเดียว
create or replace function public.boss_finish(battle_id uuid, won boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; b public.battles; tgt int; ok boolean; c int := 0; a int := 0;
begin
  p := public._player(u);
  select * into b from public.battles where id = battle_id and user_id = u for update;
  if not found then raise exception 'no_battle'; end if;
  if b.finished_at is not null then raise exception 'already_finished'; end if;
  if now() - b.started_at < interval '15 seconds' then raise exception 'too_fast'; end if;
  if now() - b.started_at > interval '2 hours' then raise exception 'expired'; end if;
  tgt := p.stage + 1;
  ok := coalesce(boss_finish.won, false) and b.stage = 'B' || tgt;
  update public.battles set finished_at = now(), won = ok where id = b.id;
  if ok then
    c := 200 * (tgt / 10); a := public._c('boss_amber');
    update public.players set stage = tgt, coins = coins + c, amber = amber + a, push_at = now(), updated_at = now() where user_id = u;
    perform public._qadd(u, 'battle');
  end if;
  return jsonb_build_object('won', ok, 'stage', tgt, 'coins', c, 'amber', a, 'state', public._state(u));
end $$;

-- ---------- สิทธิ์ ----------
revoke execute on function public._req(int), public._rate_c(int), public._power(uuid),
  public.idle_claim(), public.idle_push(), public.boss_start(), public.boss_finish(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.idle_claim(), public.idle_push(), public.boss_start(), public.boss_finish(uuid, boolean)
  to authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : ทีมได้สูงสุด 6 ตัว
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- =====================================================================
create or replace function public._player(u uuid) returns public.players
language plpgsql security definer set search_path = '' as $$
declare p public.players; n int; sec int := public._c('energy_sec');
begin
  select * into p from public.players where user_id = u for update;
  if not found then
    insert into public.players (user_id, name) values (u, 'นักฝึก#' || upper(substr(replace(u::text,'-',''),1,4))) returning * into p;
    -- มอนสเตอร์เริ่มต้น + มังกรของขวัญ
    insert into public.monsters (user_id, sp, lv) values
      (u,'kazekiri',18),(u,'kazemaru',4),(u,'kazemaru',7),(u,'kazemaru',1),(u,'amateru',10),(u,'kuroga',10);
    update public.players set team = (
      select array_agg(id order by ord) from (
        select id, case sp when 'kazekiri' then 1 when 'amateru' then 2 else 3 end*100 - lv as ord
        from public.monsters where user_id = u order by ord limit 6) t)
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


create or replace function public.set_team(ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  if ids is null or cardinality(ids) < 1 or cardinality(ids) > 6 then raise exception 'bad_team'; end if;
  if (select count(distinct x) from unnest(ids) x) <> cardinality(ids) then raise exception 'bad_team'; end if;
  if (select count(*) from public.monsters where user_id = u and id = any(ids)) <> cardinality(ids) then raise exception 'bad_team'; end if;
  update public.players set team = ids, updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;

-- เติมทีมผู้เล่นเดิมให้ครบ 6 ตัว (เลือกตัวที่เลเวลสูงสุดที่ยังไม่อยู่ในทีม) ครั้งเดียว
update public.players p set team = p.team || coalesce((
  select array_agg(id) from (select m.id from public.monsters m
    where m.user_id = p.user_id and not (m.id = any(p.team)) order by m.lv desc, m.id
    limit greatest(0, 6 - cardinality(p.team))) t), '{}')
where cardinality(p.team) < 6;

-- =====================================================================
-- ตำนานป่าอัมพร : ระดับมอนสเตอร์ใหม่ 4 ขั้น  ทั่วไป(1) < หายาก(2) < ตำนาน(3) < เทพเจ้า(4)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
-- =====================================================================
update public.species set rar = case sp
  when 'kazemaru' then 1   -- ทั่วไป
  when 'kazekiri' then 2   -- หายาก
  when 'kuroga'   then 3   -- ตำนาน
  when 'amateru'  then 4   -- เทพเจ้า
  else rar end;

-- ฟักไข่: สุ่มระดับก่อน แล้วสุ่มสายพันธุ์ในระดับนั้น (เพิ่มสายพันธุ์ใหม่ในตาราง species ได้เลย ไม่ต้องแก้ฟังก์ชัน)
--   ไข่ป่า   : ทั่วไป 82% · หายาก 13% · ตำนาน 4%  · เทพเจ้า 1%
--   ไข่ทองคำ : ทั่วไป 45% · หายาก 33% · ตำนาน 16% · เทพเจ้า 6%  (ครบ 30 ใบยังไม่ได้เทพเจ้า การันตีเทพเจ้า)
create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
  if kind = 'wild' then
    if p.coins < public._c('wild_cost') then raise exception 'not_enough_coins'; end if;
    update public.players set coins = coins - public._c('wild_cost') where user_id = u;
    w := array[0.82, 0.13, 0.04, 0.01];
  else
    if p.amber < public._c('gold_cost') then raise exception 'not_enough_amber'; end if;
    update public.players set amber = amber - public._c('gold_cost'), pity = pity + 1 where user_id = u;
    w := array[0.45, 0.33, 0.16, 0.06];
  end if;
  if kind = 'gold' and p.pity + 1 >= public._c('pity_max') then t := 4;
  elsif r < w[4] then t := 4;
  elsif r < w[4] + w[3] then t := 3;
  elsif r < w[4] + w[3] + w[2] then t := 2;
  else t := 1; end if;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then v_sp := 'kazemaru'; t := 1; end if;
  if kind = 'gold' and t = 4 then update public.players set pity = 0 where user_id = u; end if;
  insert into public.monsters (user_id, sp, lv) values (u, v_sp, 1) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;

-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครระดับตำนานใหม่ 2 ตัว (ฮาคุเนโกะ นักดาบแมวขาว · โมริฮิเมะ ธิดาหอกเอลฟ์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- เข้าไปอยู่ในกลุ่มสุ่มระดับ "ตำนาน" ของการฟักไข่อัตโนมัติ (hatch_egg สุ่มตาม species.rar)
-- =====================================================================
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('hakuneko','ฮาคุเนโกะ',3,50,null,0),
  ('morihime','โมริฮิเมะ',3,50,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = case sp when 'hakuneko' then 412 when 'morihime' then 404 else pow end
where sp in ('hakuneko','morihime');

-- โมริฮิเมะเป็นระดับหายาก (รันซ้ำได้)
update public.species set rar=2 where sp='morihime';

-- =====================================================================
-- ตำนานป่าอัมพร : ตัวละครใหม่ระดับหายาก  โยรุกุโมะ (จอมเวทแมงมุมราตรี)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
-- =====================================================================
-- เข้าไปอยู่ในกลุ่มสุ่มระดับ "หายาก" ของการฟักไข่อัตโนมัติ (hatch_egg สุ่มตาม species.rar)
insert into public.species (sp,name,rar,max_lv,evolve_to,evolve_cost) values
  ('yorugumo','โยรุกุโมะ',2,40,null,0)
on conflict (sp) do update set name=excluded.name, rar=excluded.rar, max_lv=excluded.max_lv;
update public.species set pow = 342 where sp = 'yorugumo';

-- =====================================================================
-- ตำนานป่าอัมพร : ปรับสมดุลค่าพลังตามระดับ + เรทไข่ใหม่
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   พลังพื้นฐาน (hp + atk*4 + def*3 + spd*2):
--   ทั่วไป ~220 · หายาก ~355-365 · ตำนาน ~470-480 · เทพเจ้า ~620
-- =====================================================================
update public.species set pow = case sp
  when 'kazemaru' then 220 when 'kazekiri' then 361 when 'yorugumo' then 354 when 'morihime' then 365
  when 'kuroga' then 470 when 'hakuneko' then 478 when 'amateru' then 623 else pow end;
update public.species set max_lv = 40 where sp = 'morihime';   -- ระดับหายากเลเวลสูงสุด 40 เท่ากันทุกตัว

-- ฟักไข่: สุ่มระดับก่อน แล้วสุ่มสายพันธุ์ในระดับนั้น
--   ไข่ป่า   : ทั่วไป 83% · หายาก 15%   · ตำนาน 2%     · เทพเจ้า 0%
--   ไข่ทองคำ : ทั่วไป 57.5% · หายาก 32% · ตำนาน 10%    · เทพเจ้า 0.5%
--   การันตี : ไข่ทองคำครบ 30 ใบที่ยังไม่ได้ระดับตำนานขึ้นไป ใบนั้นได้ตำนานแน่นอน
create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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
  insert into public.monsters (user_id, sp, lv) values (u, v_sp, 1) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;

-- =====================================================================
-- ตำนานป่าอัมพร : ระบบดาว (วิวัฒน์ด้วยตัวซ้ำ) + ปรับสเกลเทพเจ้า
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   เริ่ม 0 ดาว สูงสุด 6 ดาว · ใช้ตัวซ้ำสายพันธุ์เดียวกัน ดาวละ 1 ตัว ดาวที่ 3 และ 6 ใช้ 2 ตัว
--   ตัวที่ใช้เป็นวัตถุดิบต้องไม่อยู่ในทีม และจะหายไปจากคลัง · ดาวไม่เพิ่มค่าพลัง (เพิ่ม Lv สกิลฝั่งเกม)
-- =====================================================================
alter table public.monsters add column if not exists stars int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'monsters_stars_range') then
    alter table public.monsters add constraint monsters_stars_range check (stars between 0 and 6);
  end if; end $$;

-- เทพเจ้าแข็งแกร่งขึ้น (hp 190 / atk 74 / def 26 / spd 60)
update public.species set pow = 684 where sp = 'amateru';

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
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int)),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

create or replace function public.star_up(mon_id bigint, mat_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; m public.monsters; need int; n int;
begin
  p := public._player(u);
  select * into m from public.monsters where id = mon_id and user_id = u for update;
  if not found then raise exception 'no_monster'; end if;
  if m.stars >= 6 then raise exception 'max_stars'; end if;
  need := case when m.stars + 1 in (3, 6) then 2 else 1 end;
  if mat_ids is null or cardinality(mat_ids) <> need
     or (select count(distinct x) from unnest(mat_ids) x) <> need then raise exception 'bad_material'; end if;
  if mon_id = any(mat_ids) then raise exception 'same_monster'; end if;
  if mat_ids && p.team then raise exception 'material_in_team'; end if;
  select count(*) into n from public.monsters x
    where x.id = any(mat_ids) and x.user_id = u and x.sp = m.sp;
  if n <> need then raise exception 'not_same_species'; end if;
  -- ห้ามใช้ตัวที่ดาวมากกว่าตัวหลักเป็นวัตถุดิบ
  if exists (select 1 from public.monsters x where x.id = any(mat_ids) and x.user_id = u and x.stars > m.stars)
    then raise exception 'material_stronger'; end if;
  delete from public.monsters x where x.id = any(mat_ids) and x.user_id = u;
  update public.monsters set stars = stars + 1 where id = m.id;
  update public.players set updated_at = now() where user_id = u;
  return jsonb_build_object('stars', m.stars + 1, 'state', public._state(u));
end $$;
revoke execute on function public.star_up(bigint, bigint[]) from public, anon;
grant execute on function public.star_up(bigint, bigint[]) to authenticated;

-- =====================================================================
-- ตำนานป่าอัมพร : กล่องจดหมายแจกของ (ส่งถึงผู้เล่นทุกคน กดรับได้คนละ 1 ครั้ง)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่แจกซ้ำ)
-- ส่งจดหมายใหม่: insert into public.mail (code, title, body, amber, coins, expires_at) values (...);
-- =====================================================================
create table if not exists public.mail (
  id         bigint generated always as identity primary key,
  code       text unique,                      -- กันแทรกซ้ำเวลารันสคริปต์ซ้ำ
  title      text not null,
  body       text not null default '',
  amber      int  not null default 0 check (amber >= 0),
  coins      int  not null default 0 check (coins >= 0),
  starts_at  timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create table if not exists public.mail_claims (
  user_id    uuid   not null references public.players(user_id) on delete cascade,
  mail_id    bigint not null references public.mail(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, mail_id)
);
alter table public.mail enable row level security;
alter table public.mail_claims enable row level security;   -- ไม่มี policy = อ่าน/เขียนตรงไม่ได้ ต้องผ่านฟังก์ชันเท่านั้น

create or replace function public._mail_new(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.mail m
  where now() between m.starts_at and m.expires_at
    and not exists (select 1 from public.mail_claims c where c.user_id = u and c.mail_id = m.id)
$$;

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
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int),
      'mail_new', public._mail_new(u)),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

create or replace function public.mail_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'body', m.body, 'amber', m.amber, 'coins', m.coins,
            'expires_at', m.expires_at, 'claimed', c.mail_id is not null) order by m.id desc)
    from public.mail m left join public.mail_claims c on c.mail_id = m.id and c.user_id = u
    where now() between m.starts_at and m.expires_at), '[]'::jsonb);
end $$;

create or replace function public.claim_mail(mail_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); m public.mail;
begin
  perform public._player(u);
  select * into m from public.mail x where x.id = claim_mail.mail_id and now() between x.starts_at and x.expires_at;
  if not found then raise exception 'no_mail'; end if;
  insert into public.mail_claims (user_id, mail_id) values (u, m.id) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  update public.players set amber = amber + m.amber, coins = coins + m.coins, updated_at = now() where user_id = u;
  return jsonb_build_object('amber', m.amber, 'coins', m.coins, 'state', public._state(u));
end $$;
revoke execute on function public.mail_list(), public.claim_mail(bigint), public._mail_new(uuid) from public, anon;
grant execute on function public.mail_list(), public.claim_mail(bigint) to authenticated;

-- จดหมายฉบับแรก: แจก 300 อัมพรให้ผู้เล่นทุกคน (รับได้ 30 วัน)
insert into public.mail (code, title, body, amber, expires_at) values
  ('gift_300_amber_2026_09', 'ของขวัญจากป่าอัมพร', 'ขอบคุณที่ร่วมผจญภัยกับเรา รับ 300 อัมพรไปฟักไข่ทองคำได้เลย!', 300, now() + interval '30 days')
on conflict (code) do nothing;

-- =====================================================================
-- ตำนานป่าอัมพร : ธาตุต่อตัว (ตัวละครเดียวกันมีได้ทั้ง 6 ธาตุ)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   monsters.el = ธาตุของตัวนั้น (ว่าง = ธาตุประจำตัวของสายพันธุ์ เช่น ตัวที่ได้ก่อนมีระบบนี้)
--   ฟักไข่สุ่มธาตุตามน้ำหนักในตาราง el_rates (ค่าเริ่มต้นเท่ากันทุกธาตุ)
--   อีเวนต์ธาตุ เช่น เพิ่มโอกาสธาตุน้ำ 3 เท่า:  update public.el_rates set w = 3 where el = 'น้ำ';
--   จบอีเวนต์:                               update public.el_rates set w = 1;
-- =====================================================================
alter table public.monsters add column if not exists el text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'monsters_el_valid') then
    alter table public.monsters add constraint monsters_el_valid check (el is null or el in ('ดิน','น้ำ','ลม','ไฟ','แสง','มืด'));
  end if; end $$;

create table if not exists public.el_rates (
  el text primary key check (el in ('ดิน','น้ำ','ลม','ไฟ','แสง','มืด')),
  w  float8 not null default 1 check (w >= 0)
);
alter table public.el_rates enable row level security;
insert into public.el_rates (el, w) values ('ดิน',1),('น้ำ',1),('ลม',1),('ไฟ',1),('แสง',1),('มืด',1)
on conflict (el) do nothing;

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
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int),
      'mail_new', public._mail_new(u)),
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
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;

-- =====================================================================
-- ตำนานป่าอัมพร : เผ่า 4 เผ่า (เลือกครั้งเดียวตอนเริ่มเกม)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   god = เผ่าเทพ · undead = อันเดด · beast = กึ่งมนุษย์ · human = มนุษย์
--   สกิลเผ่าทำงานในสนามรบฝั่งเกม (ไม่เปลี่ยนพลังทีมของเซิร์ฟเวอร์)
-- =====================================================================
alter table public.players add column if not exists race text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_race_valid') then
    alter table public.players add constraint players_race_valid check (race is null or race in ('god','undead','beast','human'));
  end if; end $$;

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

create or replace function public.set_race(r text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  if r not in ('god','undead','beast','human') then raise exception 'bad_race'; end if;
  if p.race is not null then raise exception 'race_locked'; end if;
  update public.players set race = r, updated_at = now() where user_id = u;
  return jsonb_build_object('race', r, 'state', public._state(u));
end $$;
revoke execute on function public.set_race(text) from public, anon;
grant execute on function public.set_race(text) to authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : อันดับเผ่า (จำนวนสมาชิก + TOP 3 ของแต่ละเผ่า)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   จัดอันดับด้วยพลังทีม (สูตรเดียวกับ _power: pow × (1 + 0.1 × (lv-1)) ของตัวในทีม)
--   เสมอกัน -> ด่านสูงกว่าได้ก่อน · นับสมาชิกทุกคนที่เลือกเผ่าแล้ว · TOP 3 เฉพาะคนที่ตั้งชื่อแล้ว
--   คืนเฉพาะชื่อที่แสดงในเกม พลัง และด่าน (ไม่มีอีเมล/ไอดีบัญชี)
-- =====================================================================
create index if not exists players_race_idx on public.players (race) where race is not null;

create or replace function public.race_ranking() returns jsonb
language sql stable security definer set search_path = '' as $$
  with pw as (
    select p.user_id, p.race, p.name, p.named, p.stage,
           coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)))), 0)::int as power
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.race is not null
    group by p.user_id),
  rk as (
    select pw.*, row_number() over (partition by race order by power desc, stage desc, user_id) as n
    from pw where named)
  select jsonb_build_object(
    'races', (select jsonb_object_agg(r, jsonb_build_object(
                'members', (select count(*) from pw where pw.race = r),
                'top', coalesce((select jsonb_agg(jsonb_build_object('name', rk.name, 'power', rk.power, 'stage', rk.stage,
                                                                     'me', coalesce(rk.user_id = auth.uid(), false)) order by rk.n)
                                 from rk where rk.race = r and rk.n <= 3), '[]'::jsonb)))
              from unnest(array['god','undead','beast','human']) as r),
    'me', (select jsonb_build_object('race', rk.race, 'rank', rk.n, 'power', rk.power) from rk where rk.user_id = auth.uid()))
$$;
revoke execute on function public.race_ranking() from public, anon;
grant execute on function public.race_ranking() to authenticated;

select jsonb_pretty(public.race_ranking()) is not null as ok,
       (select count(*) from public.players where race is not null) as with_race;


-- =====================================================================
-- ตำนานป่าอัมพร : ดาวเพิ่มพลังรบ + ชื่อยาวไม่เกิน 12 ตัวอักษร
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   พลังรบของตัวละคร = pow × (1 + 0.1 × (lv-1)) × (1 + 0.05 × ดาว)   (6 ดาว = +30%)
--   ค่าสถานะในสนามรบไม่เปลี่ยน (ดาวไปเพิ่มเลเวลสกิล) แต่พลังรบ/ดันด่าน/อันดับเผ่า นับดาวด้วย
--   ตั้งชื่อใหม่ได้ 1–12 ตัวอักษร (ชื่อเดิมที่ยาวกว่านี้ยังอยู่ได้ จนกว่าจะเปลี่ยนชื่อ)
-- =====================================================================
create or replace function public._power(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0)))), 0)::int
  from public.players p
  join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
  join public.species s on s.sp = m.sp
  where p.user_id = u $$;

create or replace function public.set_name(new_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); n text := btrim(coalesce(new_name,''));
begin
  if char_length(n) < 1 or char_length(n) > 12 then raise exception 'bad_name'; end if;
  perform public._player(u);
  update public.players set name = n, named = true, updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;
revoke execute on function public.set_name(text) from public, anon;
grant execute on function public.set_name(text) to authenticated;

create or replace function public.race_ranking() returns jsonb
language sql stable security definer set search_path = '' as $$
  with pw as (
    select p.user_id, p.race, p.name, p.named, p.stage,
           coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0)))), 0)::int as power
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.race is not null
    group by p.user_id),
  rk as (
    select pw.*, row_number() over (partition by race order by power desc, stage desc, user_id) as n
    from pw where named)
  select jsonb_build_object(
    'races', (select jsonb_object_agg(r, jsonb_build_object(
                'members', (select count(*) from pw where pw.race = r),
                'top', coalesce((select jsonb_agg(jsonb_build_object('name', rk.name, 'power', rk.power, 'stage', rk.stage,
                                                                     'me', coalesce(rk.user_id = auth.uid(), false)) order by rk.n)
                                 from rk where rk.race = r and rk.n <= 3), '[]'::jsonb)))
              from unnest(array['god','undead','beast','human']) as r),
    'me', (select jsonb_build_object('race', rk.race, 'rank', rk.n, 'power', rk.power) from rk where rk.user_id = auth.uid()))
$$;
revoke execute on function public.race_ranking() from public, anon;
grant execute on function public.race_ranking() to authenticated;

select (select prosrc like '%0.05%' from pg_proc where proname = '_power') as power_ok,
       (select prosrc like '%> 12%' from pg_proc where proname = 'set_name') as name_ok,
       (select prosrc like '%0.05%' from pg_proc where proname = 'race_ranking') as rank_ok;


-- =====================================================================
-- ตำนานป่าอัมพร : การรุกรานของไฮดรา (บอสโลกทั้งเซิร์ฟเวอร์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--
-- กติกา
--   * ไฮดรามาทุกวันจันทร์ (เวลาไทย) และอยู่จนกว่าผู้เล่นทั้งเซิร์ฟเวอร์จะตีจนตาย
--     ถ้าตายแล้ว ตัวใหม่มาวันจันทร์ถัดไป · ครั้งแรกหลังรันสคริปต์นี้มาทันที
--   * พลังชีวิตคิดตอนเกิด: รวมพลังทีมของผู้เล่นที่เข้าเกมใน 14 วัน × ดาเมจเฉลี่ยต่อครั้ง × 5 ครั้ง/วัน × 3 วัน
--     (ถ้าทุกคนตีครบทุกวัน ~3 วันตาย · จริง ๆ มักนานกว่านั้น) ขั้นต่ำ 300,000
--   * ตีได้วันละ 5 ครั้ง (รีเซ็ตเที่ยงคืนเวลาไทย) ห่างกันอย่างน้อย 25 วินาที ต้องเลือกเผ่าแล้ว
--   * ดาเมจต่อครั้งเซิร์ฟเวอร์เป็นคนคิด = พลังทีม × สุ่ม 8–12 (หน้าเกมแค่เล่นฉากต่อสู้ให้ดู)
--   * ตายแล้วสุ่มรางวัลทันที น้ำหนักการสุ่ม = ดาเมจ^0.7 (ตีมากโอกาสมาก แต่มือใหม่ยังลุ้นได้จริง)
--     เผ่าที่ทำดาเมจรวมมากสุด น้ำหนัก ×1.15 · ทุกคนที่ร่วมตีได้รางวัลร่วมสนุก
--     รางวัลส่งเข้ากล่องจดหมายของแต่ละคน (จดหมายส่วนตัว)
-- ปรับตัวเลขได้ที่ฟังก์ชัน public._raid_c
-- =====================================================================

create or replace function public._raid_c(k text) returns numeric language sql immutable as $$
  select case k
    when 'hits_per_day' then 5
    when 'hit_gap_sec'  then 25
    when 'dmg_min'      then 8
    when 'dmg_max'      then 12
    when 'hp_days'      then 3
    when 'hp_min'       then 300000
    when 'weight_pow'   then 0.7
    when 'top_race_w'   then 1.15
    else null end $$;

-- จดหมายส่วนตัว (user_id ว่าง = ส่งถึงทุกคน)
alter table public.mail add column if not exists user_id uuid references public.players(user_id) on delete cascade;
create index if not exists mail_user_idx on public.mail (user_id) where user_id is not null;

create or replace function public._mail_new(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.mail m
  where now() between m.starts_at and m.expires_at and (m.user_id is null or m.user_id = u)
    and not exists (select 1 from public.mail_claims c where c.user_id = u and c.mail_id = m.id)
$$;

create or replace function public.mail_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'body', m.body, 'amber', m.amber, 'coins', m.coins,
            'expires_at', m.expires_at, 'claimed', c.mail_id is not null) order by m.id desc)
    from public.mail m left join public.mail_claims c on c.mail_id = m.id and c.user_id = u
    where now() between m.starts_at and m.expires_at and (m.user_id is null or m.user_id = u)), '[]'::jsonb);
end $$;

create or replace function public.claim_mail(mail_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); m public.mail;
begin
  perform public._player(u);
  select * into m from public.mail x where x.id = claim_mail.mail_id and now() between x.starts_at and x.expires_at
    and (x.user_id is null or x.user_id = u);
  if not found then raise exception 'no_mail'; end if;
  insert into public.mail_claims (user_id, mail_id) values (u, m.id) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  update public.players set amber = amber + m.amber, coins = coins + m.coins, updated_at = now() where user_id = u;
  return jsonb_build_object('amber', m.amber, 'coins', m.coins, 'state', public._state(u));
end $$;

-- ---------- ตาราง ----------
create table if not exists public.raids (
  id         bigint generated always as identity primary key,
  hp_max     bigint not null,
  hp         bigint not null check (hp >= 0),
  status     text   not null default 'active' check (status in ('active','dead')),
  spawned_at timestamptz not null default now(),
  killed_at  timestamptz,
  killer     uuid,
  top_race   text
);
create unique index if not exists raids_one_active on public.raids ((true)) where status = 'active';
create table if not exists public.raid_hits (
  raid_id  bigint not null references public.raids(id) on delete cascade,
  user_id  uuid   not null references public.players(user_id) on delete cascade,
  race     text   not null,
  dmg      bigint not null default 0,
  hits     int    not null default 0,
  day      date,
  day_hits int    not null default 0,
  last_at  timestamptz,
  primary key (raid_id, user_id)
);
create index if not exists raid_hits_race on public.raid_hits (raid_id, race);
create table if not exists public.raid_prizes (
  raid_id bigint not null references public.raids(id) on delete cascade,
  user_id uuid   not null references public.players(user_id) on delete cascade,
  tier    int    not null,            -- 1 ราชันผู้ปราบ · 2 วีรชน · 3 นักรบ · 9 ร่วมสนุก
  amber   int    not null,
  coins   int    not null,
  primary key (raid_id, user_id)
);
alter table public.raids enable row level security;
alter table public.raid_hits enable row level security;
alter table public.raid_prizes enable row level security;

-- วันจันทร์ 00:00 เวลาไทย ของสัปดาห์ที่มีเวลา t
create or replace function public._raid_monday(t timestamptz) returns timestamptz language sql stable as $$
  select (date_trunc('week', t at time zone 'Asia/Bangkok')) at time zone 'Asia/Bangkok' $$;

-- ไฮดราตัวปัจจุบัน (เกิดตัวใหม่ถ้าถึงเวลา) · คืน null ถ้ายังไม่ถึงวันจันทร์
create or replace function public._raid_current() returns public.raids
language plpgsql security definer set search_path = '' as $$
declare r public.raids; last public.raids; hpv bigint;
begin
  select * into r from public.raids where status = 'active' limit 1;
  if found then return r; end if;
  select * into last from public.raids order by id desc limit 1;
  if found and now() < public._raid_monday(last.killed_at) + interval '7 days' then return null; end if;
  -- พลังชีวิตตามจำนวนผู้เล่นที่ยังเล่นอยู่และพลังทีมของพวกเขา
  select coalesce(sum(pw), 0) into hpv from (
    select coalesce(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0))), 0) as pw
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.updated_at > now() - interval '14 days' and p.race is not null
    group by p.user_id) x;
  hpv := greatest(public._raid_c('hp_min'),
                  round(hpv * (public._raid_c('dmg_min') + public._raid_c('dmg_max')) / 2 * public._raid_c('hits_per_day') * public._raid_c('hp_days')))::bigint;
  begin
    insert into public.raids (hp_max, hp) values (hpv, hpv) returning * into r;
  exception when unique_violation then
    select * into r from public.raids where status = 'active' limit 1;
  end;
  return r;
end $$;

-- แจกรางวัล (เรียกครั้งเดียวตอนไฮดราตาย)
create or replace function public._raid_award(rid bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare topr text; row record; n int := 0; t int; a int; c int; ttl text;
begin
  select race into topr from public.raid_hits where raid_id = rid group by race order by sum(dmg) desc limit 1;
  update public.raids set top_race = topr where id = rid;
  for row in
    select h.user_id, h.race,
           -ln(1 - random()) / (power(h.dmg::numeric, public._raid_c('weight_pow')) * case when h.race = topr then public._raid_c('top_race_w') else 1 end) as k
    from public.raid_hits h where h.raid_id = rid and h.dmg > 0 order by 3
  loop
    n := n + 1;
    t := case when n = 1 then 1 when n <= 6 then 2 when n <= 21 then 3 else 9 end;
    a := case t when 1 then 3000 when 2 then 1000 when 3 then 400 else 100 end;
    c := case t when 1 then 20000 when 2 then 8000 when 3 then 4000 else 2000 end;
    ttl := case t when 1 then '👑 ราชันผู้ปราบไฮดรา' when 2 then '🏅 วีรชนปราบไฮดรา' when 3 then '⚔️ นักรบปราบไฮดรา' else '🎁 รางวัลร่วมปราบไฮดรา' end;
    insert into public.raid_prizes (raid_id, user_id, tier, amber, coins) values (rid, row.user_id, t, a, c) on conflict do nothing;
    insert into public.mail (code, title, body, amber, coins, user_id, expires_at)
    values ('raid_' || rid || '_' || row.user_id, ttl,
            'ไฮดราถูกปราบแล้ว! ขอบคุณที่ร่วมต่อสู้ รางวัลสุ่มตามดาเมจที่คุณทำ' ||
            case when row.race = topr then ' (เผ่าของคุณทำดาเมจรวมสูงสุด ได้โอกาสเพิ่ม)' else '' end,
            a, c, row.user_id, now() + interval '30 days')
    on conflict (code) do nothing;
  end loop;
end $$;

-- สถานะการรุกราน
create or replace function public.raid_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r public.raids; last public.raids; me public.raid_hits; rid bigint;
begin
  p := public._player(u);
  r := public._raid_current();
  rid := coalesce(r.id, (select id from public.raids order by id desc limit 1));
  if r.id is null then select * into last from public.raids where id = rid; end if;
  select * into me from public.raid_hits where raid_id = rid and user_id = u;
  return jsonb_build_object(
    'active', r.id is not null,
    'raid', case when rid is null then null else (select jsonb_build_object('id', x.id, 'hp', x.hp, 'hp_max', x.hp_max, 'status', x.status,
               'spawned_at', x.spawned_at, 'killed_at', x.killed_at, 'top_race', x.top_race) from public.raids x where x.id = rid) end,
    'next_at', case when r.id is null and last.id is not null then public._raid_monday(last.killed_at) + interval '7 days' end,
    'races', coalesce((select jsonb_object_agg(race, jsonb_build_object('dmg', d, 'n', c))
                       from (select race, sum(dmg) d, count(*) c from public.raid_hits where raid_id = rid group by race) z), '{}'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', pl.name, 'race', h.race, 'dmg', h.dmg, 'me', h.user_id = u) order by h.dmg desc)
                     from (select * from public.raid_hits where raid_id = rid order by dmg desc limit 5) h join public.players pl on pl.user_id = h.user_id), '[]'::jsonb),
    'fighters', (select count(*) from public.raid_hits where raid_id = rid),
    'me', jsonb_build_object('dmg', coalesce(me.dmg, 0), 'hits', coalesce(me.hits, 0), 'race', p.race,
            'left', case when r.id is null then 0 else public._raid_c('hits_per_day') - case when me.day = public._today() then me.day_hits else 0 end end,
            'wait', case when me.last_at is null then 0 else greatest(0, ceil(public._raid_c('hit_gap_sec') - extract(epoch from now() - me.last_at)))::int end,
            'rank', case when me.dmg > 0 then (select count(*) + 1 from public.raid_hits where raid_id = rid and dmg > me.dmg) end,
            'prize', (select jsonb_build_object('tier', z.tier, 'amber', z.amber, 'coins', z.coins) from public.raid_prizes z where z.raid_id = rid and z.user_id = u)),
    'rules', jsonb_build_object('hits_per_day', public._raid_c('hits_per_day'), 'top_race_w', public._raid_c('top_race_w')));
end $$;

-- โจมตี 1 ครั้ง: เซิร์ฟเวอร์คิดดาเมจ แล้วหน้าเกมเล่นฉากต่อสู้ตามผลนี้
create or replace function public.raid_attack() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r public.raids; me public.raid_hits; pw int; d bigint; hp0 bigint; hp1 bigint; killed boolean := false; today date := public._today();
begin
  p := public._player(u);
  if p.race is null then raise exception 'no_race'; end if;
  r := public._raid_current();
  if r.id is null or r.status <> 'active' then raise exception 'no_raid'; end if;
  select * into me from public.raid_hits where raid_id = r.id and user_id = u for update;
  if found then
    if me.day = today and me.day_hits >= public._raid_c('hits_per_day') then raise exception 'raid_no_hits'; end if;
    if me.last_at > now() - make_interval(secs => public._raid_c('hit_gap_sec')) then raise exception 'too_fast'; end if;
  end if;
  pw := public._power(u);
  if pw <= 0 then raise exception 'bad_team'; end if;
  d := round(pw * (public._raid_c('dmg_min') + random() * (public._raid_c('dmg_max') - public._raid_c('dmg_min'))))::bigint;
  select hp into hp0 from public.raids where id = r.id and status = 'active' for update;   -- ล็อกแถว: ตีพร้อมกันหลายคนก็ถูกต้อง
  if not found or hp0 <= 0 then raise exception 'no_raid'; end if;
  d := least(d, hp0);                       -- ตีเกินเลือดที่เหลือ นับเท่าที่เหลือ
  hp1 := hp0 - d;
  update public.raids set hp = hp1 where id = r.id;
  insert into public.raid_hits (raid_id, user_id, race, dmg, hits, day, day_hits, last_at)
  values (r.id, u, p.race, d, 1, today, 1, now())
  on conflict (raid_id, user_id) do update set dmg = raid_hits.dmg + excluded.dmg, hits = raid_hits.hits + 1, race = excluded.race,
    day_hits = case when raid_hits.day = today then raid_hits.day_hits + 1 else 1 end, day = today, last_at = now();
  if hp1 = 0 then
    update public.raids set status = 'dead', killed_at = now(), killer = u where id = r.id and status = 'active';
    if found then killed := true; perform public._raid_award(r.id); end if;
  end if;
  perform public._qadd(u, 'battle');
  return jsonb_build_object('dmg', d, 'hp_before', hp0, 'hp_after', hp1, 'hp_max', r.hp_max, 'killed', killed, 'power', pw, 'raid', public.raid_state());
end $$;

revoke execute on function public.raid_state(), public.raid_attack() from public, anon;
grant execute on function public.raid_state(), public.raid_attack() to authenticated;
revoke execute on function public._raid_current(), public._raid_award(bigint) from public, anon, authenticated;

select (select count(*) from information_schema.tables where table_name in ('raids','raid_hits','raid_prizes')) as tables,
       (select count(*) from information_schema.columns where table_name = 'mail' and column_name = 'user_id') as mail_user,
       (select count(*) from pg_proc where proname in ('raid_state','raid_attack','_raid_current','_raid_award')) as fns;

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

-- =====================================================================
-- ตำนานป่าอัมพร : เพื่อน + เยี่ยมบ้านเพื่อน
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   เพิ่มเพื่อนด้วยรหัสผู้เล่น 8 ตัว (แสดงในโปรไฟล์) → อีกฝ่ายกดรับ → เป็นเพื่อนกัน (สูงสุด 30 คน)
--   เยี่ยมบ้านเพื่อน: ดูเกาะ มอนสเตอร์ และทีมของเพื่อน · เยี่ยมครั้งแรกของวันต่อเพื่อน 1 คน ได้ 50 เหรียญ (วันละไม่เกิน 5 คน)
-- =====================================================================
create table if not exists public.friend_links (
  a            uuid not null references auth.users(id) on delete cascade,   -- a < b เสมอ
  b            uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null,
  accepted     boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index if not exists friend_links_b on public.friend_links(b);
alter table public.friend_links enable row level security;

create table if not exists public.friend_visits (
  user_id   uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  day       date not null,
  primary key (user_id, friend_id, day)
);
create index if not exists friend_visits_friend on public.friend_visits(friend_id, day);
alter table public.friend_visits enable row level security;

create or replace function public._code(u uuid) returns text language sql immutable as $$
  select upper(substr(replace(u::text, '-', ''), 1, 8)) $$;
create or replace function public._by_code(c text) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.user_id from public.players p
  where public._code(p.user_id) = upper(regexp_replace(coalesce(c, ''), '[^0-9A-Fa-f]', '', 'g')) limit 1 $$;
create or replace function public._fcard(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code', public._code(p.user_id), 'name', p.name, 'lv', p.lv, 'race', p.race, 'stage', p.stage,
    'power', public._power(p.user_id), 'seen', p.updated_at) from public.players p where p.user_id = u $$;

create or replace function public.friend_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; d date := public._today();
begin
  p := public._player(u);
  return jsonb_build_object(
    'me', public._code(u), 'max', 30, 'visit_max', 5, 'visit_coins', 50,
    'friends', coalesce((select jsonb_agg(public._fcard(o) || jsonb_build_object('visited', exists(select 1 from public.friend_visits v where v.user_id = u and v.friend_id = o and v.day = d))
                 order by (select updated_at from public.players where user_id = o) desc)
               from (select case when l.a = u then l.b else l.a end o from public.friend_links l where (l.a = u or l.b = u) and l.accepted) t), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(public._fcard(l.requested_by)) from public.friend_links l
               where (l.a = u or l.b = u) and not l.accepted and l.requested_by <> u), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(public._fcard(case when l.a = u then l.b else l.a end)) from public.friend_links l
               where (l.a = u or l.b = u) and not l.accepted and l.requested_by = u), '[]'::jsonb),
    'visits_today', (select count(*) from public.friend_visits v where v.user_id = u and v.day = d),
    'visitors_today', (select count(*) from public.friend_visits v where v.friend_id = u and v.day = d));
end $$;

create or replace function public.friend_request(code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code); x uuid; y uuid; l public.friend_links;
begin
  p := public._player(u);
  if t is null then raise exception 'friend_not_found'; end if;
  if t = u then raise exception 'friend_self'; end if;
  x := least(u, t); y := greatest(u, t);
  select * into l from public.friend_links where a = x and b = y for update;
  if found then
    if l.accepted then raise exception 'friend_already'; end if;
    if l.requested_by = u then raise exception 'friend_pending'; end if;
    -- อีกฝ่ายขอมาก่อนแล้ว: รับเป็นเพื่อนทันที
    if (select count(*) from public.friend_links where (a = u or b = u) and accepted) >= 30 then raise exception 'friend_limit'; end if;
    update public.friend_links set accepted = true where a = x and b = y;
    return jsonb_build_object('added', true, 'friend', public._fcard(t), 'list', public.friend_list());
  end if;
  if (select count(*) from public.friend_links where (a = u or b = u) and accepted) >= 30 then raise exception 'friend_limit'; end if;
  if (select count(*) from public.friend_links where requested_by = u and not accepted) >= 30 then raise exception 'friend_limit'; end if;
  insert into public.friend_links (a, b, requested_by) values (x, y, u);
  return jsonb_build_object('added', false, 'friend', public._fcard(t), 'list', public.friend_list());
end $$;

create or replace function public.friend_respond(code text, accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code);
begin
  p := public._player(u);
  if t is null or not exists (select 1 from public.friend_links where a = least(u, t) and b = greatest(u, t) and not accepted and requested_by = t)
    then raise exception 'friend_no_request'; end if;
  if accept then
    if (select count(*) from public.friend_links where (a = u or b = u) and accepted) >= 30 then raise exception 'friend_limit'; end if;
    update public.friend_links set accepted = true where a = least(u, t) and b = greatest(u, t);
  else
    delete from public.friend_links where a = least(u, t) and b = greatest(u, t);
  end if;
  return public.friend_list();
end $$;

-- ลบเพื่อน / ยกเลิกคำขอที่ส่งไป
create or replace function public.friend_remove(code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t uuid := public._by_code(code);
begin
  p := public._player(u);
  if t is not null then delete from public.friend_links where a = least(u, t) and b = greatest(u, t); end if;
  return public.friend_list();
end $$;

-- เยี่ยมบ้านเพื่อน: ข้อมูลเกาะ + มอนสเตอร์ของเพื่อน · ครั้งแรกของวันได้เหรียญ
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
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el) order by m.id)
                 from public.monsters m where m.user_id = t), '[]'::jsonb),
    'visitors_today', (select count(*) from public.friend_visits v where v.friend_id = t and v.day = d),
    'state', public._state(u));
end $$;

revoke execute on function public._code(uuid), public._by_code(text), public._fcard(uuid) from public, anon, authenticated;
revoke execute on function public.friend_list(), public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text), public.friend_visit(text) from public, anon;
grant execute on function public.friend_list(), public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text), public.friend_visit(text) to authenticated;

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

-- =====================================================================
-- ตำนานป่าอัมพร : บุกปล้น — โอกาสสูญเสียลดหลั่นตามระดับของตัวที่ส่งไป
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_raid_capture.sql ก่อน
--   โอกาสไม่กลับมา = ค่าพื้นฐาน (ชนะ 5% / แพ้ 25%) × ตัวคูณตามระดับ: 1 = ×1 · 2 = ×0.7 · 3 = ×0.45 · 4 (เทพ) = ×0.2
-- =====================================================================
create or replace function public._fraid_diek() returns jsonb language sql immutable as $$
  select '{"1":1,"2":0.7,"3":0.45,"4":0.2,"5":0.15}'::jsonb $$;

create or replace function public._fraid_info(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'left', greatest(0, public._fraid_c('per_day')::int - (select count(*) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge))::int,
    'per_day', public._fraid_c('per_day')::int, 'n', public._fraid_c('n')::int, 'def_k', public._fraid_c('def_k'),
    'win_min', public._fraid_c('win_min'), 'cap', public._fraid_cap(), 'die_k', public._fraid_diek(), 'loot_k', public._fraid_c('loot_k'), 'win_max', public._fraid_c('win_max'), 'die_win', public._fraid_c('die_win'), 'die_lose', public._fraid_c('die_lose'),
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
    if random() < die * coalesce((public._fraid_diek() ->> (select rar from public.species where sp = m.sp)::text)::float8, 1) then
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

revoke execute on function public._fraid_diek() from public, anon, authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : รางวัลทุก 5 ด่าน (อัมพร + ไข่เทพ)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   ผ่านด่าน 5, 10, 15, ... รับได้ครั้งละ: อัมพร 30 + 10 × (บท − 1) (ด่านบอส x-10 ได้ ×2) + ไข่เทพ 1 ใบ
--   ไข่เทพ: เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2% (ไม่มีระดับทั่วไป) · ด่าน 50, 100, 150, ... ได้ "ไข่เทพการันตี" (ได้ตัวเทพแน่นอน)
--   ผู้เล่นที่ผ่านด่านไปก่อนแล้ว รับย้อนหลังได้ทุกขั้น
-- =====================================================================
alter table public.players add column if not exists god_eggs int not null default 0;
alter table public.players add column if not exists god_eggs_sure int not null default 0;
create table if not exists public.stage_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  n       int  not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, n)
);
alter table public.stage_claims enable row level security;

create or replace function public._stage_reward(n int) returns jsonb language sql immutable as $$
  select jsonb_build_object('n', n, 'amber', (30 + 10 * (ceil(n / 10.0)::int - 1)) * case when n % 10 = 0 then 2 else 1 end,
    'egg', 1, 'sure', n % 50 = 0, 'boss', n % 10 = 0) $$;

create or replace function public.stage_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  return jsonb_build_object('stage', p.stage, 'god_eggs', p.god_eggs, 'god_eggs_sure', p.god_eggs_sure,
    'pending', coalesce((select jsonb_agg(public._stage_reward(g) order by g) from generate_series(5, p.stage, 5) g
                         where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = g)), '[]'::jsonb),
    'next', public._stage_reward(((p.stage / 5) + 1) * 5),
    'rates', jsonb_build_object('4', 0.008, '3', 0.15, '2', 0.842));
end $$;

-- รับรางวัลขั้นที่ค้างทั้งหมด
create or replace function public.claim_stage_rewards() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; g int; r jsonb; a int := 0; e int := 0; s int := 0; list jsonb := '[]'::jsonb;
begin
  p := public._player(u);
  for g in select x from generate_series(5, p.stage, 5) x
           where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = x) loop
    r := public._stage_reward(g);
    insert into public.stage_claims (user_id, n) values (u, g) on conflict do nothing;
    if found then
      a := a + (r->>'amber')::int;
      if (r->>'sure')::boolean then s := s + 1; else e := e + 1; end if;
      list := list || jsonb_build_array(r);
    end if;
  end loop;
  if jsonb_array_length(list) = 0 then raise exception 'no_stage_reward'; end if;
  update public.players set amber = amber + a, god_eggs = god_eggs + e, god_eggs_sure = god_eggs_sure + s, updated_at = now() where user_id = u;
  return jsonb_build_object('claimed', list, 'amber', a, 'eggs', e, 'sure', s, 'stage', public.stage_state(), 'state', public._state(u));
end $$;

-- ฟักไข่เทพ (ใช้ไข่การันตีก่อนถ้ามี)
create or replace function public.hatch_god_egg() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); t int; v_sp text; v_el text; mid bigint; sure boolean;
begin
  p := public._player(u);
  if p.god_eggs + p.god_eggs_sure < 1 then raise exception 'no_god_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'sure', sure,
    'rar', (select rar from public.species where species.sp = v_sp), 'stage', public.stage_state(), 'state', public._state(u));
end $$;

revoke execute on function public._stage_reward(int) from public, anon, authenticated;
revoke execute on function public.stage_state(), public.claim_stage_rewards(), public.hatch_god_egg() from public, anon;
grant execute on function public.stage_state(), public.claim_stage_rewards(), public.hatch_god_egg() to authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : ปรับเรทไข่เทพ + ธาตุแสง/มืดหายากขึ้น 2 เท่า
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_stage_rewards.sql ก่อน
--   ไข่เทพ: เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2% · ไม่มีระดับทั่วไป
--   ทุกไข่: ธาตุแสง/มืดมีน้ำหนัก 0.5 (ธาตุอื่น 1) → ตัวแสง/มืดออกยากกว่าธาตุอื่น 2 เท่า (ไม่แสดงในหน้าเรท)
--   หมายเหตุอีเวนต์ธาตุ: จบอีเวนต์ให้คืนค่าเป็น  update public.el_rates set w = case when el in ('แสง','มืด') then 0.5 else 1 end;
-- =====================================================================
update public.el_rates set w = 0.5 where el in ('แสง', 'มืด');

create or replace function public.stage_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  return jsonb_build_object('stage', p.stage, 'god_eggs', p.god_eggs, 'god_eggs_sure', p.god_eggs_sure,
    'pending', coalesce((select jsonb_agg(public._stage_reward(g) order by g) from generate_series(5, p.stage, 5) g
                         where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = g)), '[]'::jsonb),
    'next', public._stage_reward(((p.stage / 5) + 1) * 5),
    'rates', jsonb_build_object('4', 0.008, '3', 0.15, '2', 0.842));
end $$;

-- ฟักไข่เทพ (ใช้ไข่การันตีก่อนถ้ามี)
create or replace function public.hatch_god_egg() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); t int; v_sp text; v_el text; mid bigint; sure boolean;
begin
  p := public._player(u);
  if p.god_eggs + p.god_eggs_sure < 1 then raise exception 'no_god_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'sure', sure,
    'rar', (select rar from public.species where species.sp = v_sp), 'stage', public.stage_state(), 'state', public._state(u));
end $$;



-- =====================================================================
-- ตำนานป่าอัมพร : บุกปล้น — ชนะไม่เสียตัว · แพ้ถ่วงน้ำหนักตามระดับ/เลเวล/ดาว · คิดแพ้ทางธาตุในโอกาสชนะ
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_raid_tierloss.sql ก่อน
--   ชนะ: ตัวที่ส่งไปกลับมาครบทุกตัว
--   แพ้: โอกาสไม่กลับมารายตัว = 30% × ระดับ (ทั่วไป ×1 · หายาก ×0.45 · ตำนาน ×0.2 · เทพเจ้า ×0.08) ÷ (1 + เลเวล/25) × 0.85^ดาว
--        เช่น ทั่วไป Lv1 ≈ 29% · หายาก Lv20 ≈ 7.5% · ตำนาน Lv30 ★2 ≈ 2% · เทพเจ้า Lv50 ★3 ≈ 0.5%
--   ธาตุ: พลังบุกแต่ละตัว × (ตัวคูณธาตุที่เราตีเป้า ÷ ตัวคูณที่เป้าตีเรา) เช่น น้ำตีไฟ ×1.63 · ไฟตีน้ำ ×0.62 (ตารางเดียวกับในสนามรบ)
-- =====================================================================
create or replace function public._fraid_c(k text) returns float8 language sql immutable as $$
  select case k when 'n' then 4 when 'def_k' then 3 when 'win_min' then 0.10 when 'win_max' then 0.90
    when 'die_win' then 0 when 'die_lose' then 0.30 when 'loot_k' then 1.2 when 'per_day' then 5 when 'robbed_max' then 3 end $$;
create or replace function public._fraid_diek() returns jsonb language sql immutable as $$
  select '{"1":1,"2":0.45,"3":0.2,"4":0.08,"5":0.06}'::jsonb $$;

-- ธาตุของมอนสเตอร์ (ว่าง = ธาตุประจำตัว) · ตรงกับ EL_OF ใน gamedata.js
create or replace function public._el_of(e text, sp text) returns text language sql immutable as $$
  select coalesce(nullif(e, ''), case sp when 'kazemaru' then 'ลม' when 'kazekiri' then 'ลม' when 'yorugumo' then 'มืด' when 'morihime' then 'ดิน'
    when 'kuroga' then 'มืด' when 'hakuneko' then 'แสง' when 'amateru' then 'ไฟ' end) $$;
-- ตัวคูณธาตุ ตรงกับ elMul ใน gamedata.js: น้ำ > ไฟ > ลม > ดิน > น้ำ ×1.3 / ×0.8 · แสง↔มืด ×1.5 · แสง/มืด ตีธาตุพื้นฐาน ×1.15 · โดนตี ×0.9
create or replace function public._el_mul(a text, d text) returns float8 language plpgsql immutable as $$
declare c text[] := array['น้ำ','ไฟ','ลม','ดิน']; ia int := array_position(c, a); id int := array_position(c, d);
begin
  if a is null or d is null or a = d then return 1; end if;
  if ia is not null and id is not null then
    if ia % 4 + 1 = id then return 1.3; end if;
    if id % 4 + 1 = ia then return 0.8; end if;
    return 1;
  end if;
  if ia is null and id is null then return 1.5; end if;
  if ia is null then return 1.15; end if;
  return 0.9;
end $$;

create or replace function public._fraid_info(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'left', greatest(0, public._fraid_c('per_day')::int - (select count(*) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge))::int,
    'per_day', public._fraid_c('per_day')::int, 'n', public._fraid_c('n')::int, 'def_k', public._fraid_c('def_k'),
    'win_min', public._fraid_c('win_min'), 'cap', public._fraid_cap(), 'die_k', public._fraid_diek(), 'die_lv', 25, 'die_star', 0.85, 'el_on', true, 'loot_k', public._fraid_c('loot_k'), 'win_max', public._fraid_c('win_max'), 'die_win', public._fraid_c('die_win'), 'die_lose', public._fraid_c('die_lose'),
    'raided', coalesce((select jsonb_agg(public._code(r.defender)) from public.friend_raids r where r.attacker = u and r.day = public._today() and not r.is_revenge), '[]'::jsonb),
    'scouts_left', greatest(0, 20 - (select count(*) from public.raid_scouts s where s.attacker = u and s.day = public._today()))::int,
    'robbed', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'code', public._code(r.attacker), 'win', r.win, 'lost', r.lost, 'at', r.created_at, 'revenge', public._can_revenge(u, r.attacker) is not null) order by r.id desc)
                 from public.friend_raids r join public.players p on p.user_id = r.attacker where r.defender = u and r.day = public._today()), '[]'::jsonb),
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb)) $$;

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

revoke execute on function public._fraid_diek(), public._el_of(text, text), public._el_mul(text, text) from public, anon, authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : ปิดช่องโหว่ 2 ข้อ
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   1) ด่านบอส: เซิร์ฟเวอร์ไม่เชื่อ "ชนะ" จากเครื่องผู้เล่นอย่างเดียวแล้ว
--      ต้องมีพลังทีม ≥ 70% ของพลังที่ด่านต้องการ (เผื่อฝีมือผู้เล่นไว้ 30%) ถึงจะนับว่าชนะ
--   2) ตาราง player_saves (ระบบเซฟเวอร์ชันแรก ไม่ได้ใช้แล้ว): ปิดไม่ให้ใครอ่าน/เขียนจากหน้าเว็บ (ข้อมูลยังอยู่ ไม่ลบ)
-- =====================================================================
create or replace function public.boss_finish(battle_id uuid, won boolean)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare u uuid := public._uid(); p public.players; b public.battles; tgt int; ok boolean; c int := 0; a int := 0; pw int; need int; weak boolean := false;
begin
  p := public._player(u);
  select * into b from public.battles where id = battle_id and user_id = u for update;
  if not found then raise exception 'no_battle'; end if;
  if b.finished_at is not null then raise exception 'already_finished'; end if;
  if now() - b.started_at < interval '15 seconds' then raise exception 'too_fast'; end if;
  if now() - b.started_at > interval '2 hours' then raise exception 'expired'; end if;
  tgt := p.stage + 1;
  pw := public._power(u); need := public._req(tgt);
  ok := coalesce(boss_finish.won, false) and b.stage = 'B' || tgt;
  -- กันโกง: ทีมต้องแข็งพอในระดับหนึ่ง ไม่อย่างนั้นถือว่าแพ้
  if ok and pw < need * 0.7 then ok := false; weak := true; end if;
  update public.battles set finished_at = now(), won = ok where id = b.id;
  if ok then
    c := 200 * (tgt / 10); a := public._c('boss_amber');
    update public.players set stage = tgt, coins = coins + c, amber = amber + a, push_at = now(), updated_at = now() where user_id = u;
    perform public._qadd(u, 'battle');
  end if;
  return jsonb_build_object('won', ok, 'weak', weak, 'power', pw, 'need', need, 'min_power', ceil(need * 0.7)::int,
    'stage', tgt, 'coins', c, 'amber', a, 'state', public._state(u));
end $function$;

do $$ begin
  if to_regclass('public.player_saves') is not null then
    drop policy if exists "read leaderboard" on public.player_saves;
    drop policy if exists "insert own save" on public.player_saves;
    drop policy if exists "update own save" on public.player_saves;
    revoke all on public.player_saves from anon, authenticated;
  end if;
end $$;


-- ===== ตัวเริ่มต้นชุดใหม่ (จาก migrate_season_reset.sql ส่วนที่ 1; ส่วนรีเซ็ตไม่ได้ใส่ในไฟล์ติดตั้ง) =====
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



-- =====================================================================
-- ตำนานป่าอัมพร : ฟักไข่ทีละ 10 ใบ + อัมพรเริ่มต้น 600
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ — ส่วนเติมอัมพรจะไม่เติมซ้ำ)
--   hatch_eggs(kind, n): n = 1 หรือ 10 · เช็กเงินและช่องเก็บครบก่อน แล้วฟักทีละใบด้วย hatch_egg เดิม (เรทและการันตีเหมือนเดิม)
--   ผู้เล่นใหม่เริ่มต้นด้วยอัมพร 600 · ผู้เล่นที่สมัครหลังรีเซ็ต 30 ก.ย. 2026 ได้เติมให้ครบ 600
-- =====================================================================
alter table public.players alter column amber set default 600;
alter table public.players add column if not exists amber600 boolean not null default false;
-- ผู้เล่นที่สร้างหลังรีเซ็ตแต่ก่อนแก้ค่าเริ่มต้น ได้อัมพรเพิ่ม 550 ครั้งเดียว (ทำเครื่องหมายไว้ ไม่เติมซ้ำ)
update public.players set amber = amber + 550, amber600 = true where created_at >= '2026-09-30 00:00+07' and not amber600;
update public.players set amber600 = true where not amber600;
alter table public.players alter column amber600 set default true;

create or replace function public.hatch_eggs(kind text, n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r jsonb; list jsonb := '[]'::jsonb; i int; cost int;
begin
  p := public._player(u);
  if kind not in ('wild', 'gold') then raise exception 'bad_egg'; end if;
  if n not in (1, 10) then raise exception 'bad_count'; end if;
  if (select count(*) from public.monsters where user_id = u) + n > public._c('slots') then raise exception 'box_full'; end if;
  cost := n * public._c(case kind when 'wild' then 'wild_cost' else 'gold_cost' end)::int;
  if kind = 'wild' and p.coins < cost then raise exception 'not_enough_coins'; end if;
  if kind = 'gold' and p.amber < cost then raise exception 'not_enough_amber'; end if;
  for i in 1..n loop
    r := public.hatch_egg(kind);
    list := list || jsonb_build_array(jsonb_build_object('mon', r->'mon', 'rar', r->'rar'));
  end loop;
  return jsonb_build_object('list', list, 'state', public._state(u));
end $$;
revoke execute on function public.hatch_eggs(text, int) from public, anon;
grant execute on function public.hatch_eggs(text, int) to authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : ยกเลิกจดหมายของขวัญ 300 + 3000 อัมพร (ให้ทุกคนเริ่มที่อัมพร 600 เท่ากัน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ — ทำงานเฉพาะครั้งแรกที่จดหมายยังไม่หมดอายุ)
--   1) หักอัมพรคืนจากผู้เล่นที่กดรับจดหมาย 2 ฉบับนี้หลังรีเซ็ต (ไม่ต่ำกว่า 0)
--   2) ตั้งจดหมาย 2 ฉบับนี้ให้หมดอายุทันที (ไม่ลบ)
-- =====================================================================
do $$ begin
  if exists (select 1 from public.mail where code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09') and expires_at > now()) then
    update public.players p set amber = greatest(0, p.amber - x.amt), updated_at = now()
      from (select c.user_id, sum(m.amber) amt from public.mail_claims c join public.mail m on m.id = c.mail_id
            where m.code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09') group by c.user_id) x
      where p.user_id = x.user_id;
    update public.mail set expires_at = now() where code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09');
  end if;
end $$;


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


-- =====================================================================
-- ตำนานป่าอัมพร : ประกาศวิ่งเมื่อมีคนเปิดได้ระดับตำนานขึ้นไป + กดประกาศเพื่อไปบุกปล้น
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_raid_open.sql ก่อน
--   ฟักไข่ (hatch_egg / hatch_eggs / hatch_god_egg) ได้ระดับ ≥ 3 → บันทึกลงตาราง pulls (เก็บ 3 วัน)
--   pulls_recent(): 10 รายการล่าสุดใน 24 ชม. (ชื่อ เผ่า ตัว ระดับ ธาตุ เวลา · me = ของเราเอง)
--   pull_raid(pid): เพิ่มบ้านเจ้าของประกาศเป็น "บ้านที่สุ่มเจอวันนี้" (raid_scouts) แล้วเข้าเกาะเพื่อบุก
--     นับเป็นการสุ่มบ้าน 1 ครั้ง (รวม 20 ครั้ง/วัน) · กติกาปล้นอื่นเหมือนเดิม (โควตา 5/วัน, โล่ 3/วัน, เพื่อนคนเดิมวันละครั้ง)
-- =====================================================================
create table if not exists public.pulls (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sp         text not null,
  rar        int  not null,
  el         text,
  created_at timestamptz not null default now()
);
create index if not exists pulls_created_idx on public.pulls (created_at desc);
alter table public.pulls enable row level security;

-- บันทึกการเปิดได้ของดี (เรียกจากฟังก์ชันฟักไข่) · ลบรายการเก่ากว่า 3 วันไปด้วย
create or replace function public._pull_log(u uuid, v_sp text, v_el text) returns void
language plpgsql security definer set search_path = '' as $$
declare t int := (select rar from public.species where sp = v_sp);
begin
  if coalesce(t, 0) < 3 then return; end if;
  insert into public.pulls (user_id, sp, rar, el) values (u, v_sp, t, v_el);
  delete from public.pulls where created_at < now() - interval '3 days';
end $$;

-- ฟักไข่ (เหมือนเดิมทุกอย่าง + บันทึกประกาศ)
create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; v_el text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;

-- ฟักไข่เทพ (เหมือนเดิมทุกอย่าง + บันทึกประกาศ)
create or replace function public.hatch_god_egg() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); t int; v_sp text; v_el text; mid bigint; sure boolean;
begin
  p := public._player(u);
  if p.god_eggs + p.god_eggs_sure < 1 then raise exception 'no_god_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
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

-- 10 ประกาศล่าสุดใน 24 ชม. (เฉพาะผู้เล่นที่ตั้งชื่อและเลือกเผ่าแล้ว · ไม่ส่งไอดี)
create or replace function public.pulls_recent() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('list', coalesce((select jsonb_agg(x order by x.id desc) from (
    select q.id, p.name, p.race, q.sp, q.rar, q.el, q.created_at as at, q.user_id = public._uid() as me
      from public.pulls q join public.players p on p.user_id = q.user_id
     where q.created_at > now() - interval '24 hours' and p.name is not null and p.name <> '' and p.race is not null
     order by q.id desc limit 10) x), '[]'::jsonb)) $$;

-- กดประกาศ → ได้สิทธิ์บุกบ้านนั้นวันนี้ แล้วเข้าเกาะ
create or replace function public.pull_raid(pid bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; d date := public._today(); t uuid;
begin
  p := public._player(u);
  select q.user_id into t from public.pulls q where q.id = pid and q.created_at > now() - interval '24 hours';
  if t is null then raise exception 'pull_expired'; end if;
  if t = u then raise exception 'friend_self'; end if;
  if not exists (select 1 from public.raid_scouts where attacker = u and defender = t and day = d) then
    if (select count(*) from public.raid_scouts where attacker = u and day = d) >= 20 then raise exception 'raid_scout_limit'; end if;
    insert into public.raid_scouts (attacker, defender, day) values (u, t, d) on conflict do nothing;
  end if;
  return public._raid_payload(u, t, 'pull');
end $$;

revoke execute on function public._pull_log(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.pulls_recent(), public.pull_raid(bigint) from public, anon;
grant execute on function public.pulls_recent(), public.pull_raid(bigint) to authenticated;


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


-- =====================================================================
-- ตำนานป่าอัมพร : อันดับเผ่าเน้นพลังรวมของเผ่า (แทนการเทียบพลังรายคน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   race_ranking() เพิ่มต่อเผ่า: power (พลังรวมสมาชิกทุกคน) · place (ลำดับเผ่า 1–4 ตามพลังรวม)
--   me เพิ่ม: share (สัดส่วนพลังของเราในเผ่า 0–1) · ข้อมูลเดิมยังส่งครบ (หน้าเว็บเก่าไม่พัง)
-- =====================================================================
create or replace function public.race_ranking() returns jsonb
language sql stable security definer set search_path = '' as $$
  with pw as (
    select p.user_id, p.race, p.name, p.named, p.stage,
           coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0)))), 0)::int as power
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.race is not null
    group by p.user_id),
  rk as (
    select pw.*, row_number() over (partition by race order by power desc, stage desc, user_id) as n
    from pw where named),
  tot as (
    select r, coalesce((select sum(pw.power) from pw where pw.race = r), 0)::bigint as power
    from unnest(array['god','undead','beast','human']) as r),
  pl as (select r, power, row_number() over (order by power desc, r) as place from tot)
  select jsonb_build_object(
    'races', (select jsonb_object_agg(pl.r, jsonb_build_object(
                'members', (select count(*) from pw where pw.race = pl.r),
                'power', pl.power, 'place', pl.place,
                'top', coalesce((select jsonb_agg(jsonb_build_object('name', rk.name, 'power', rk.power, 'stage', rk.stage,
                                                                     'me', coalesce(rk.user_id = auth.uid(), false)) order by rk.n)
                                 from rk where rk.race = pl.r and rk.n <= 3), '[]'::jsonb)))
              from pl),
    'me', (select jsonb_build_object('race', pw.race, 'rank', (select rk.n from rk where rk.user_id = pw.user_id), 'power', pw.power,
                    'share', case when t.power > 0 then round(pw.power::numeric / t.power, 4) else 0 end)
           from pw join tot t on t.r = pw.race where pw.user_id = auth.uid()))
$$;
revoke execute on function public.race_ranking() from public, anon;
grant execute on function public.race_ranking() to authenticated;


-- =====================================================================
-- ตำนานป่าอัมพร : กวาดด่านด้วยพลังงาน ⚡ (ให้พลังงานมีประโยชน์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   sweep_claim(n): ใช้ 10 ⚡ ต่อครั้ง (n = 1–6 ครั้งในการกดเดียว) ได้รางวัลเท่ากับดันด่าน idle 30 นาทีต่อครั้ง
--   อัตราเดียวกับ idle_claim: เหรียญ = วินาที × _rate_c(ด่าน) / 60 · EXP = วินาที × idle_xp / 60
--   10 ⚡ = รางวัล 30 นาที (อัตรา 1:3 ตามที่เจ้าของกำหนด) · พลังงานฟื้น 1 ⚡ ทุก 3 นาที · ไม่แตะรางวัล idle ที่สะสมอยู่
-- =====================================================================
create or replace function public._sweep_c(k text) returns int language sql immutable as $$
  select case k when 'cost' then 10 when 'sec' then 1800 when 'max_n' then 6 end $$;

create or replace function public.sweep_claim(n int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; cost int; sec int; c int; x int;
begin
  if n is null or n < 1 or n > public._sweep_c('max_n') then raise exception 'bad_count'; end if;
  p := public._player(u);
  cost := n * public._sweep_c('cost');
  if p.energy < cost then raise exception 'not_enough_energy'; end if;
  sec := n * public._sweep_c('sec');
  c := (sec * public._rate_c(p.stage)) / 60;
  x := (sec * public._c('idle_xp')) / 60;
  update public.players set energy = energy - cost,
    energy_at = case when energy >= public._c('energy_max') then now() else energy_at end,
    coins = coins + c, xp = xp + x, updated_at = now() where user_id = u;
  update public.players set lv = lv + xp / 100, xp = xp % 100 where user_id = u and xp >= 100;
  return jsonb_build_object('n', n, 'coins', c, 'xp', x, 'sec', sec, 'energy_used', cost, 'state', public._state(u));
end $$;
revoke execute on function public.sweep_claim(int) from public, anon;
grant execute on function public.sweep_claim(int) to authenticated;


-- ===== ขุมนรก 50 ชั้น (migrate_abyss.sql) =====
-- =====================================================================
-- ตำนานป่าอัมพร : ดันเจี้ยนขุมนรก 50 ชั้น (รีเซ็ตทุกสัปดาห์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   - รีเซ็ตทุกคืนวันอาทิตย์ เที่ยงคืนเวลาไทย (= วันจันทร์ 00:00 Asia/Bangkok) ทุกคนเริ่มชั้น 1 ใหม่พร้อมกัน
--   - เข้าร่วมครั้งแรกของสัปดาห์ (abyss_start) สุ่ม "พรประจำสัปดาห์" 1 อย่าง +10% ใช้ได้ทั้งสัปดาห์
--       atk โจมตี · hp เลือด · def ป้องกัน · spd ความเร็ว · el:<ธาตุ> ตัวละครธาตุนั้น โจมตี+เลือด
--   - ชั้น f ต้องการพลัง _abyss_need(f) = 1,300 × 1.06^(f-1) (ชั้นบอส 10/20/30/40/50 ×1.15)
--       ชั้น 1 = 1.3k · 10 ≈ 2.5k · 20 ≈ 4.5k · 30 ≈ 8.1k · 40 ≈ 14.5k · 50 ≈ 26k
--       (ทีมเริ่มต้น ~1.7k ผ่านได้ราว 8–9 ชั้น · ชั้น 50 ต้องทีมระดับท็อปเกือบเต็ม)
--     ผลแพ้ชนะมาจากการต่อสู้จริงในเครื่อง แต่เซิร์ฟเวอร์กันโกง: พลังทีม × 1.05 ต้อง ≥ 85% ของพลังที่ชั้นต้องการ
--     และต้องสู้อย่างน้อย 15 วินาที (เหมือนด่านบอส) · ไต่ได้ทีละชั้นเท่านั้น
--   - รางวัลผ่านชั้น (ครั้งแรกของสัปดาห์): เหรียญ 200 + 80×ชั้น + อัมพร 2 ทุกชั้น · ชั้นบอสได้อัมพรเพิ่ม 30/50/80/120/200
--     ชั้น 50 ได้ "กล่องลึกลับ" เพิ่ม: อัมพร 150 + ไข่เทพ 1 ใบ (25% เป็นไข่เทพการันตี) — หน้าเกมไม่บอกล่วงหน้า
-- =====================================================================
create table if not exists public.abyss_runs (
  user_id    uuid not null references public.players(user_id) on delete cascade,
  week       date not null,                         -- วันจันทร์ของสัปดาห์ (เวลาไทย)
  floor      int  not null default 0 check (floor between 0 and 50),   -- ชั้นสูงสุดที่ผ่านในสัปดาห์นี้
  bless      text not null,
  box        text,                                  -- ของในกล่องลึกลับ (เมื่อผ่านชั้น 50)
  reached_at timestamptz not null default now(),    -- เวลาที่ไปถึงชั้นปัจจุบัน (ใช้ตัดสินอันดับเมื่อชั้นเท่ากัน)
  created_at timestamptz not null default now(),
  primary key (user_id, week)
);
create index if not exists abyss_runs_week_idx on public.abyss_runs (week, floor desc, reached_at);
alter table public.abyss_runs enable row level security;   -- ไม่มี policy = เข้าถึงผ่านฟังก์ชันเท่านั้น

create or replace function public._abyss_week() returns date language sql stable as $$
  select date_trunc('week', now() at time zone 'Asia/Bangkok')::date $$;
create or replace function public._abyss_reset_at() returns timestamptz language sql stable as $$
  select ((public._abyss_week() + 7)::timestamp at time zone 'Asia/Bangkok') $$;
create or replace function public._abyss_need(f int) returns int language sql immutable as $$
  select round(1300 * power(1.06, greatest(f, 1) - 1) * case when f % 10 = 0 then 1.15 else 1 end)::int $$;
create or replace function public._abyss_reward(f int) returns jsonb language sql immutable as $$
  select jsonb_build_object('f', f, 'need', public._abyss_need(f), 'boss', f % 10 = 0,
    'coins', 200 + 80 * f,
    'amber', 2 + case f when 10 then 30 when 20 then 50 when 30 then 80 when 40 then 120 when 50 then 200 else 0 end,
    'box', f = 50) $$;

-- สถานะขุมนรกของผู้เล่น + รางวัลทุกชั้น + อันดับสัปดาห์นี้
create or replace function public.abyss_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); wk date := public._abyss_week(); r public.abyss_runs; f int; top jsonb; me int;
begin
  perform public._player(u);
  select * into r from public.abyss_runs where user_id = u and week = wk;
  f := coalesce(r.floor, 0);
  select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'race', p.race, 'floor', a.floor, 'me', a.user_id = u) order by a.floor desc, a.reached_at), '[]'::jsonb)
    into top
    from (select * from public.abyss_runs where week = wk and floor > 0 order by floor desc, reached_at limit 10) a
    join public.players p on p.user_id = a.user_id;
  if r.floor > 0 then
    select count(*) + 1 into me from public.abyss_runs x
      where x.week = wk and (x.floor > r.floor or (x.floor = r.floor and x.reached_at < r.reached_at));
  end if;
  return jsonb_build_object(
    'week', wk, 'reset_in', greatest(0, floor(extract(epoch from public._abyss_reset_at() - now()))::int),
    'joined', r.user_id is not null, 'floor', f, 'bless', r.bless, 'box', r.box,
    'power', public._power(u), 'next', case when f < 50 then f + 1 end,
    'need_next', case when f < 50 then public._abyss_need(f + 1) end,
    'floors', (select jsonb_agg(public._abyss_reward(g) order by g) from generate_series(1, 50) g),
    'top', top, 'rank', me,
    'players', (select count(*) from public.abyss_runs where week = wk and floor > 0));
end $$;

-- เริ่มสู้ชั้นถัดไป (เข้าร่วมครั้งแรกของสัปดาห์ = สุ่มพร)
create or replace function public.abyss_start() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); wk date := public._abyss_week(); r public.abyss_runs; f int; bid uuid; fresh boolean := false;
begin
  perform public._player(u);
  insert into public.abyss_runs (user_id, week, bless)
    values (u, wk, (array['atk','hp','def','spd','el:ลม','el:ดิน','el:น้ำ','el:ไฟ','el:มืด','el:แสง'])[1 + floor(random() * 10)::int])
    on conflict (user_id, week) do nothing;
  fresh := found;
  select * into r from public.abyss_runs where user_id = u and week = wk;
  if r.floor >= 50 then raise exception 'abyss_done'; end if;
  f := r.floor + 1;
  insert into public.battles (user_id, stage) values (u, 'A' || f || '@' || wk) returning id into bid;
  return jsonb_build_object('battle_id', bid, 'floor', f, 'need', public._abyss_need(f), 'bless', r.bless, 'fresh', fresh,
    'power', public._power(u), 'reward', public._abyss_reward(f), 'reset_in', greatest(0, floor(extract(epoch from public._abyss_reset_at() - now()))::int),
    'state', public._state(u));
end $$;

-- จบการสู้: ต้องสู้อย่างน้อย 15 วินาที จบได้ครั้งเดียว ต้องเป็นสัปดาห์เดียวกับตอนเริ่ม
create or replace function public.abyss_finish(battle_id uuid, won boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); wk date := public._abyss_week(); b public.battles; r public.abyss_runs; f int; ok boolean; weak boolean := false;
  pw int; need int; rw jsonb; c int := 0; a int := 0; bx jsonb; sure boolean;
begin
  perform public._player(u);
  select * into b from public.battles where id = battle_id and user_id = u for update;
  if not found then raise exception 'no_battle'; end if;
  if b.finished_at is not null then raise exception 'already_finished'; end if;
  if now() - b.started_at < interval '15 seconds' then raise exception 'too_fast'; end if;
  if now() - b.started_at > interval '2 hours' then raise exception 'expired'; end if;
  select * into r from public.abyss_runs where user_id = u and week = wk for update;
  if not found then raise exception 'expired'; end if;           -- ข้ามสัปดาห์ระหว่างสู้
  f := r.floor + 1;
  ok := coalesce(abyss_finish.won, false) and b.stage = 'A' || f || '@' || wk;
  pw := public._power(u); need := public._abyss_need(f);
  if ok and pw * 1.05 < need * 0.85 then ok := false; weak := true; end if;
  update public.battles set finished_at = now(), won = ok where id = b.id;
  if ok then
    rw := public._abyss_reward(f); c := (rw->>'coins')::int; a := (rw->>'amber')::int;
    if f = 50 and r.box is null then
      sure := random() < 0.25;
      bx := jsonb_build_object('amber', 150, 'egg', case when sure then 'sure' else 'god' end);
      a := a + 150;
      update public.players set god_eggs = god_eggs + case when sure then 0 else 1 end,
        god_eggs_sure = god_eggs_sure + case when sure then 1 else 0 end where user_id = u;
    end if;
    update public.abyss_runs set floor = f, reached_at = now(), box = coalesce(bx::text, box) where user_id = u and week = wk;
    update public.players set coins = coins + c, amber = amber + a, updated_at = now() where user_id = u;
    perform public._qadd(u, 'battle');
  end if;
  return jsonb_build_object('won', ok, 'weak', weak, 'power', pw, 'need', need, 'min_power', ceil(need * 0.85 / 1.05)::int,
    'floor', f, 'coins', c, 'amber', a, 'box', bx,
    'next', case when ok and f < 50 then f + 1 when not ok then f end,
    'need_next', case when ok and f < 50 then public._abyss_need(f + 1) when not ok then need end,
    'state', public._state(u));
end $$;

revoke execute on function public._abyss_week(), public._abyss_reset_at(), public._abyss_need(int), public._abyss_reward(int)
  from public, anon, authenticated;
revoke execute on function public.abyss_state(), public.abyss_start(), public.abyss_finish(uuid, boolean) from public, anon;
grant execute on function public.abyss_state(), public.abyss_start(), public.abyss_finish(uuid, boolean) to authenticated;

select g as floor, public._abyss_need(g) as need, public._abyss_reward(g)->>'coins' as coins, public._abyss_reward(g)->>'amber' as amber
from generate_series(1, 50) g where g in (1, 5, 10, 20, 30, 40, 49, 50);


-- ===== สงครามแห่งการช่วงชิง (migrate_arena.sql) =====
-- =====================================================================
-- ตำนานป่าอัมพร : สงครามแห่งการช่วงชิง (PVP แบบไม่เรียลไทม์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   - บุกได้วันละ 5 ครั้ง (เวลาไทย) · เลือกเป้า 3 ระดับ: ง่าย / สูสี / ยาก (สุ่มจากพลังใกล้เคียงเรา)
--     ทีมป้องกัน = ทีมปัจจุบันของเจ้าของ · ไม่มีคนพลังใกล้เคียง → "กองรักษาการณ์" ที่ระบบสร้างให้พอดีกับเรา
--   - ทีมเพื่อนสมทบ 2 ทีม สุ่มจากผู้เล่นอื่น (มือใหม่ได้ทีมที่แข็งกว่าเรา ~1.2–1.3 เท่า)
--   - เซิร์ฟเวอร์ตัดสินผล: ฝั่งบุก A = เรา×(1+พร) + เพื่อน 2 ทีม · ฝั่งป้องกัน D = ป้องกัน×(1+พร)×2.7 (ศิลา/ดินแดน/คืนชีพ)
--       โอกาสชนะ = A³/(A³+D³) จำกัด 5–95%  (คู่สูสี ≈ 58%, ง่าย ≈ 75%, ยาก ≈ 35%) · พร (ขุมนรกสัปดาห์นี้) = +5% พลัง
--   - แต้มประลอง: เริ่ม 1,000 · ชนะ +10/+20/+32 แพ้ −8/−6/−4 (ง่าย/สูสี/ยาก) · ป้องกันสำเร็จ +5 ถูกตีแตก −3
--   - รางวัลต่อครั้ง: ชนะ 300 เหรียญ + 5 อัมพร · แพ้ 100 เหรียญ · เจ้าของทีมเพื่อน +60 เหรียญ · ป้องกันสำเร็จ +150 เหรียญ (ค่าคุ้มครอง)
--   - รีเซ็ตทุกคืนวันอาทิตย์เที่ยงคืน (สัปดาห์เดียวกับขุมนรก _abyss_week) → รางวัลตามอันดับแต้มเข้าจดหมาย
--       ที่ 1: 300 · 2: 200 · 3: 150 · 4–10: 60 · ทุกคนที่ได้บุก ≥1 ครั้ง: 20 อัมพร · แต้มส่วนเกิน 1,000 ลดครึ่ง
--   ต้องมี migrate_abyss.sql ก่อน (ใช้ _abyss_week / abyss_runs)
-- =====================================================================
create or replace function public._arena_c(k text) returns float8 language sql immutable as $$
  select case k when 'per_day' then 5 when 'home_k' then 2.7 when 'bless_k' then 0.05 when 'start' then 1000
    when 'win_coins' then 300 when 'win_amber' then 5 when 'lose_coins' then 100 when 'ally_coins' then 60 when 'def_coins' then 150
    when 'def_win' then 5 when 'def_lose' then -3 when 'refresh_day' then 10 end $$;

-- แต้มประจำสัปดาห์ (หนึ่งแถวต่อคนต่อสัปดาห์)
create table if not exists public.arena_stats (
  user_id  uuid not null references public.players(user_id) on delete cascade,
  week     date not null,
  pts      int  not null default 1000,
  wins     int  not null default 0, losses int not null default 0, hard_wins int not null default 0,
  def_ok   int  not null default 0, def_fail int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
create index if not exists arena_stats_rank_idx on public.arena_stats (week, pts desc);
-- เป้าที่เสนอให้ (3 ช่อง) — บุกได้เฉพาะเป้าที่เซิร์ฟเวอร์เสนอ
create table if not exists public.arena_offers (
  user_id uuid primary key references public.players(user_id) on delete cascade,
  offers  jsonb not null,
  made_at timestamptz not null default now(),
  refresh_day date, refreshes int not null default 0
);
-- บันทึกการต่อสู้ (ใช้นับครั้งต่อวัน + ประวัติการถูกบุก)
create table if not exists public.arena_battles (
  id        bigint generated always as identity primary key,
  attacker  uuid not null references public.players(user_id) on delete cascade,
  defender  uuid references public.players(user_id) on delete set null,   -- null = กองรักษาการณ์
  def_name  text not null,
  allies    uuid[] not null default '{}',
  diff      text not null,
  chance    float8 not null,
  won       boolean not null,
  pts       int not null,
  def_pts   int not null default 0,
  day       date not null,
  week      date not null,
  created_at timestamptz not null default now()
);
create index if not exists arena_battles_att_idx on public.arena_battles (attacker, day);
create index if not exists arena_battles_def_idx on public.arena_battles (defender, created_at desc);
create table if not exists public.arena_weeks (week date primary key, settled_at timestamptz not null default now());
alter table public.arena_stats enable row level security;
alter table public.arena_offers enable row level security;
alter table public.arena_battles enable row level security;
alter table public.arena_weeks enable row level security;

-- แถวของสัปดาห์นี้ (สร้างใหม่พร้อมแต้มยกมา: ส่วนเกิน 1,000 ลดครึ่ง)
create or replace function public._arena_row(u uuid) returns public.arena_stats
language plpgsql security definer set search_path = '' as $$
declare wk date := public._abyss_week(); r public.arena_stats; prev int;
begin
  select * into r from public.arena_stats where user_id = u and week = wk;
  if found then return r; end if;
  select pts into prev from public.arena_stats where user_id = u and week < wk order by week desc limit 1;
  insert into public.arena_stats (user_id, week, pts) values (u, wk, 1000 + greatest(0, coalesce(prev, 1000) - 1000) / 2)
    on conflict (user_id, week) do nothing;
  select * into r from public.arena_stats where user_id = u and week = wk;
  return r;
end $$;

-- ปิดสัปดาห์ที่ผ่านมา: แจกรางวัลตามอันดับแต้มเข้าจดหมาย (ทำครั้งเดียวต่อสัปดาห์ เรียกเองตอนมีคนเข้าลาน)
create or replace function public._arena_settle() returns void
language plpgsql security definer set search_path = '' as $$
declare wk date := public._abyss_week(); w date; row record; n int; a int; ttl text;
begin
  for w in select distinct s.week from public.arena_stats s
           where s.week < wk and not exists (select 1 from public.arena_weeks x where x.week = s.week) order by 1 loop
    perform pg_advisory_xact_lock(hashtext('arena_settle_' || w));
    if exists (select 1 from public.arena_weeks x where x.week = w) then continue; end if;
    insert into public.arena_weeks (week) values (w);
    n := 0;
    for row in select s.user_id, s.pts from public.arena_stats s where s.week = w and s.wins + s.losses > 0
               order by s.pts desc, s.wins desc, s.updated_at loop
      n := n + 1;
      a := case when n = 1 then 300 when n = 2 then 200 when n = 3 then 150 when n <= 10 then 60 else 20 end;
      ttl := case when n = 1 then '🥇 แชมป์สงครามแห่งการช่วงชิง' when n = 2 then '🥈 รองแชมป์สงครามแห่งการช่วงชิง'
                  when n = 3 then '🥉 อันดับ 3 สงครามแห่งการช่วงชิง' when n <= 10 then '⚔️ 10 อันดับแรก สงครามแห่งการช่วงชิง'
                  else '🎁 รางวัลร่วมสงครามแห่งการช่วงชิง' end;
      insert into public.mail (code, title, body, amber, coins, user_id, expires_at)
      values ('arena_' || w || '_' || row.user_id, ttl,
              'สัปดาห์ที่แล้วคุณได้อันดับ ' || n || ' ด้วยแต้มประลอง ' || row.pts || ' แต้ม ขอบคุณที่ร่วมช่วงชิง!',
              a, 0, row.user_id, now() + interval '30 days')
      on conflict (code) do nothing;
    end loop;
  end loop;
end $$;

-- พร (ขุมนรกสัปดาห์นี้) ของผู้เล่น
create or replace function public._arena_bless(u uuid) returns text language sql stable security definer set search_path = '' as $$
  select bless from public.abyss_runs where user_id = u and week = public._abyss_week() $$;

-- ทีมของผู้เล่น (ใช้แสดงและเล่นฉาก)
create or replace function public._arena_team(u uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('sp', m.sp, 'lv', m.lv, 'stars', coalesce(m.stars, 0), 'el', m.el,
           'pow', public._mon_pow(m.sp, m.lv, m.stars)) order by array_position(p.team, m.id)), '[]'::jsonb)
  from public.players p join public.monsters m on m.user_id = p.user_id and m.id = any(p.team) where p.user_id = u $$;

-- กองรักษาการณ์ / ทหารรับจ้าง: ทีม 6 ตัวที่ระบบสร้างให้พลังรวมราว tp
create or replace function public._arena_npc(tp int, salt int) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pool text[] := array['kuroga','kazekiri','morihime','seiro','kohaku','garok','yorugumo','hakuneko']; res jsonb := '[]'::jsonb;
  i int; n int := 6; v_sp text; v_pw int; v_lv int; v_st int; hi text[] := array['kuroga','hakuneko','amateru']; els text[] := array['ลม','ดิน','น้ำ','ไฟ','มืด','แสง'];
begin
  if tp < 6 * 220 then n := greatest(3, least(6, floor(tp / 220.0)::int)); end if;   -- พลังต่ำ: คาเซะมารุ และจำนวนน้อยลง
  for i in 1..n loop
    v_sp := case when tp / n < 360 then 'kazemaru' when tp / n > 2000 then hi[1 + ((salt + i) % 3)] else pool[1 + ((salt + i * 3) % array_length(pool, 1))] end;
    select s.pow into v_pw from public.species s where s.sp = v_sp;
    if v_pw is null then continue; end if;
    v_lv := least(50, greatest(1, round(1 + 10 * (tp::float8 / n / v_pw - 1))::int));
    v_st := case when v_lv < 50 then 0 else least(6, greatest(0, ceil((tp::float8 / n / (v_pw * 5.9) - 1) / 0.05)::int)) end;
    res := res || jsonb_build_array(jsonb_build_object('sp', v_sp, 'lv', v_lv, 'stars', v_st, 'el', els[1 + ((salt + i) % 6)], 'pow', public._mon_pow(v_sp, v_lv, v_st)));
  end loop;
  return res;
end $$;
-- พลังรวมของทีม (jsonb จาก _arena_team / _arena_npc)
create or replace function public._arena_tpow(team jsonb) returns int language sql immutable as $$
  select coalesce(sum((e->>'pow')::int), 0)::int from jsonb_array_elements(team) e $$;

-- สร้างเป้า 3 ช่อง (ง่าย/สูสี/ยาก) จากพลังของเรา
create or replace function public._arena_make_offers(u uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mp int := greatest(public._power(u), 1); d date := public._today(); res jsonb := '[]'::jsonb; used uuid[] := array[u];
  slot record; t uuid; tm jsonb; fake text[] := array['กองรักษาการณ์ศิลา','ทหารเฝ้าลาน','ผู้พิทักษ์ซากสนาม','กองโจรช่วงชิง','อัศวินพเนจร'];
  races text[] := array['god','undead','beast','human'];
begin
  for slot in select * from (values ('easy', 0.72, 0.55, 0.88), ('close', 1.0, 0.86, 1.16), ('hard', 1.35, 1.12, 1.7)) v(diff, c, lo, hi) loop
    t := null;
    select x.user_id into t from (
      select p.user_id, public._power(p.user_id) pw from public.players p
      where p.user_id <> all(used) and p.named and p.race is not null and coalesce(array_length(p.team, 1), 0) > 0
        and p.updated_at > now() - interval '21 days'
        and not exists (select 1 from public.arena_battles b where b.attacker = u and b.defender = p.user_id and b.day = d)
      order by random() limit 80) x
    where x.pw between mp * slot.lo and mp * slot.hi
    order by abs(ln(x.pw::float8 / (mp * slot.c))) + random() * 0.15 limit 1;
    if t is not null then
      used := used || t;
      res := res || jsonb_build_array((select jsonb_build_object('diff', slot.diff, 'uid', t, 'name', p.name, 'race', p.race,
        'power', public._power(t), 'bless', public._arena_bless(t), 'team', public._arena_team(t)) from public.players p where p.user_id = t));
    else
      tm := public._arena_npc(round(mp * slot.c)::int, floor(random() * 1000)::int);
      res := res || jsonb_build_array(jsonb_build_object('diff', slot.diff, 'uid', null,
        'name', fake[1 + floor(random() * array_length(fake, 1))::int], 'race', races[1 + floor(random() * 4)::int],
        'power', public._arena_tpow(tm), 'bless', null, 'team', tm));
    end if;
  end loop;
  insert into public.arena_offers (user_id, offers, made_at) values (u, res, now())
    on conflict (user_id) do update set offers = excluded.offers, made_at = now();
  return res;
end $$;

-- โอกาสชนะ (ใช้ทั้งตอนแสดงและตอนตัดสิน)
create or replace function public._arena_chance(a float8, d float8) returns float8 language sql immutable as $$
  select least(0.95, greatest(0.05, power(a, 3) / (power(a, 3) + power(greatest(d, 1), 3)))) $$;
create or replace function public._arena_pts(diff text, won boolean) returns int language sql immutable as $$
  select case when won then case diff when 'easy' then 10 when 'close' then 20 else 32 end
              else case diff when 'easy' then -8 when 'close' then -6 else -4 end end $$;

-- สถานะลาน: แต้ม อันดับ ครั้งที่เหลือ เป้า 3 ช่อง ประวัติการถูกบุก
create or replace function public.arena_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); wk date := public._abyss_week(); d date := public._today(); r public.arena_stats; o public.arena_offers;
  offers jsonb; used int; mp int; me int; mb text;
begin
  perform public._player(u);
  perform public._arena_settle();
  r := public._arena_row(u);
  select * into o from public.arena_offers where user_id = u;
  offers := case when o.user_id is null or now() - o.made_at > interval '6 hours' then public._arena_make_offers(u) else o.offers end;
  used := (select count(*) from public.arena_battles where attacker = u and day = d);
  mp := public._power(u); mb := public._arena_bless(u);
  select count(*) + 1 into me from public.arena_stats x where x.week = wk and x.wins + x.losses + x.def_ok + x.def_fail > 0
    and (x.pts > r.pts or (x.pts = r.pts and x.user_id < u));
  return jsonb_build_object(
    'week', wk, 'reset_in', greatest(0, floor(extract(epoch from public._abyss_reset_at() - now()))::int),
    'pts', r.pts, 'wins', r.wins, 'losses', r.losses, 'def_ok', r.def_ok, 'def_fail', r.def_fail,
    'rank', case when r.wins + r.losses + r.def_ok + r.def_fail > 0 then me end,
    'left', greatest(0, public._arena_c('per_day')::int - used), 'per_day', public._arena_c('per_day')::int,
    'power', mp, 'bless', mb, 'home_k', public._arena_c('home_k'),
    'refresh_left', greatest(0, public._arena_c('refresh_day')::int - case when o.refresh_day = d then o.refreshes else 0 end),
    'offers', (select jsonb_agg(x - 'uid' || jsonb_build_object('slot', i - 1,
                 'chance', round(public._arena_chance(mp * (1 + case when mb is null then 0 else public._arena_c('bless_k') end) + 2 * mp * case when mp < 2500 then 1.25 else 1 end,
                   (x->>'power')::float8 * (1 + case when x->>'bless' is null then 0 else public._arena_c('bless_k') end) * public._arena_c('home_k'))::numeric, 2),
                 'win_pts', public._arena_pts(x->>'diff', true), 'lose_pts', public._arena_pts(x->>'diff', false)) order by i)
               from jsonb_array_elements(offers) with ordinality e(x, i)),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'race', p.race, 'pts', s.pts, 'wins', s.wins, 'def_ok', s.def_ok, 'me', s.user_id = u)
                       order by s.pts desc, s.user_id)
                     from (select * from public.arena_stats where week = wk and wins + losses + def_ok + def_fail > 0 order by pts desc, user_id limit 10) s
                     join public.players p on p.user_id = s.user_id), '[]'::jsonb),
    'players', (select count(*) from public.arena_stats where week = wk and wins + losses + def_ok + def_fail > 0),
    'defense', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'race', p.race, 'held', not b.won, 'pts', b.def_pts, 'at', b.created_at) order by b.created_at desc)
                         from (select * from public.arena_battles where defender = u order by created_at desc limit 8) b
                         join public.players p on p.user_id = b.attacker), '[]'::jsonb));
end $$;

-- สุ่มเป้าใหม่ (วันละ 10 ครั้ง)
create or replace function public.arena_refresh() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); d date := public._today(); o public.arena_offers;
begin
  perform public._player(u);
  select * into o from public.arena_offers where user_id = u for update;
  if found and o.refresh_day = d and o.refreshes >= public._arena_c('refresh_day') then raise exception 'arena_refresh_limit'; end if;
  perform public._arena_make_offers(u);
  update public.arena_offers set refreshes = case when refresh_day = d then refreshes + 1 else 1 end, refresh_day = d where user_id = u;
  return public.arena_state();
end $$;

-- บุก: เลือกเป้าช่อง slot (0=ง่าย 1=สูสี 2=ยาก) · เซิร์ฟเวอร์สุ่มทีมเพื่อน 2 ทีม แล้วตัดสินผล
create or replace function public.arena_attack(slot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); wk date := public._abyss_week(); d date := public._today(); p public.players; o public.arena_offers; t jsonb;
  mp int; mb text; tgt uuid; dp int; db text; allies jsonb := '[]'::jsonb; ally_ids uuid[] := '{}'; k float8; a float8; dd float8; ch float8;
  v_pts int; v_dpts int := 0; v_coins int; v_amber int := 0; v_diff text; v_won boolean; x record; used_races text[] := '{}'; races text[] := array['god','undead','beast','human'];
  i int; ar text; apw int; tm jsonb;
begin
  p := public._player(u);
  if p.race is null then raise exception 'no_race'; end if;
  if coalesce(array_length(p.team, 1), 0) = 0 then raise exception 'bad_team'; end if;
  perform pg_advisory_xact_lock(hashtext('arena_' || u));
  if (select count(*) from public.arena_battles where attacker = u and day = d) >= public._arena_c('per_day') then raise exception 'arena_limit'; end if;
  select * into o from public.arena_offers where user_id = u for update;
  if not found or slot is null or slot < 0 or slot > 2 or now() - o.made_at > interval '6 hours' then raise exception 'arena_offer'; end if;
  t := o.offers -> slot; v_diff := t->>'diff';
  tgt := nullif(t->>'uid', '')::uuid;
  if tgt is not null and not exists (select 1 from public.players where user_id = tgt) then tgt := null; end if;
  -- ฝั่งป้องกัน (ผู้เล่นจริงใช้ทีม/พลังตอนนี้)
  if tgt is not null then dp := public._power(tgt); db := public._arena_bless(tgt); t := t || jsonb_build_object('team', public._arena_team(tgt), 'power', dp, 'bless', db);
  else dp := (t->>'power')::int; db := null; end if;
  mp := greatest(public._power(u), 1); mb := public._arena_bless(u);
  k := case when mp < 2500 then 1.25 else 1 end;                         -- มือใหม่ได้ทีมเพื่อนแข็งกว่า
  used_races := array[p.race];
  for i in 1..2 loop
    select q.user_id, q.race, q.pw into x from (
      select pl.user_id, pl.race, public._power(pl.user_id) pw from public.players pl
      where pl.user_id <> u and pl.user_id is distinct from tgt and pl.user_id <> all(ally_ids)
        and pl.named and pl.race is not null and coalesce(array_length(pl.team, 1), 0) > 0 and pl.updated_at > now() - interval '21 days'
      order by random() limit 80) q
    where q.pw between mp * k * 0.75 and mp * k * 1.35
    order by abs(ln(q.pw::float8 / (mp * k))) + case when q.race = any(used_races) then 0.4 else 0 end + random() * 0.2 limit 1;
    if x.user_id is not null then
      ally_ids := ally_ids || x.user_id; used_races := used_races || x.race;
      allies := allies || jsonb_build_array((select jsonb_build_object('name', pl.name, 'race', pl.race, 'power', x.pw, 'team', public._arena_team(x.user_id))
                                             from public.players pl where pl.user_id = x.user_id));
    else
      select r into ar from unnest(races) r where r <> all(used_races) order by random() limit 1; ar := coalesce(ar, races[1 + floor(random() * 4)::int]);
      used_races := used_races || ar; apw := round(mp * k)::int;
      tm := public._arena_npc(apw, floor(random() * 1000)::int);
      allies := allies || jsonb_build_array(jsonb_build_object('name', 'ทหารรับจ้าง', 'race', ar, 'power', public._arena_tpow(tm), 'team', tm));
    end if;
    x := null;
  end loop;
  a := mp * (1 + case when mb is null then 0 else public._arena_c('bless_k') end)
       + coalesce((select sum((e->>'power')::float8) from jsonb_array_elements(allies) e), 0);
  dd := dp * (1 + case when db is null then 0 else public._arena_c('bless_k') end) * public._arena_c('home_k');
  ch := public._arena_chance(a, dd);
  v_won := random() < ch;
  v_pts := public._arena_pts(v_diff, v_won);
  if tgt is not null then v_dpts := case when v_won then public._arena_c('def_lose')::int else public._arena_c('def_win')::int end; end if;
  v_coins := case when v_won then public._arena_c('win_coins')::int else public._arena_c('lose_coins')::int end;
  if v_won then v_amber := public._arena_c('win_amber')::int; end if;
  insert into public.arena_battles (attacker, defender, def_name, allies, diff, chance, won, pts, def_pts, day, week)
    values (u, tgt, t->>'name', ally_ids, v_diff, ch, v_won, v_pts, v_dpts, d, wk);
  perform public._arena_row(u);
  update public.arena_stats set pts = greatest(0, pts + v_pts), wins = wins + v_won::int, losses = losses + (not v_won)::int,
    hard_wins = hard_wins + (v_won and v_diff = 'hard')::int, updated_at = now() where user_id = u and week = wk;
  update public.players set coins = coins + v_coins, amber = amber + v_amber, updated_at = now() where user_id = u;
  if tgt is not null then
    perform public._arena_row(tgt);
    update public.arena_stats set pts = greatest(0, pts + v_dpts), def_ok = def_ok + (not v_won)::int, def_fail = def_fail + v_won::int, updated_at = now()
      where user_id = tgt and week = wk;
    if not v_won then update public.players set coins = coins + public._arena_c('def_coins')::int where user_id = tgt; end if;
  end if;
  if array_length(ally_ids, 1) > 0 then update public.players set coins = coins + public._arena_c('ally_coins')::int where user_id = any(ally_ids); end if;
  perform public._qadd(u, 'battle');
  perform public._arena_make_offers(u);                                      -- เป้าชุดใหม่หลังบุก
  return jsonb_build_object('won', v_won, 'chance', round(ch::numeric, 3), 'diff', v_diff, 'pts', v_pts, 'coins', v_coins, 'amber', v_amber,
    'me', jsonb_build_object('name', p.name, 'race', p.race, 'power', mp, 'bless', mb, 'team', public._arena_team(u)),
    'defender', (t - 'uid') || jsonb_build_object('npc', tgt is null), 'allies', allies,
    'arena', public.arena_state(), 'state', public._state(u));
end $$;

revoke execute on function public._arena_c(text), public._arena_row(uuid), public._arena_settle(), public._arena_bless(uuid), public._arena_team(uuid),
  public._arena_npc(int, int), public._arena_tpow(jsonb), public._arena_make_offers(uuid), public._arena_chance(float8, float8), public._arena_pts(text, boolean)
  from public, anon, authenticated;
revoke execute on function public.arena_state(), public.arena_refresh(), public.arena_attack(int) from public, anon;
grant execute on function public.arena_state(), public.arena_refresh(), public.arena_attack(int) to authenticated;

-- ===== ตัวละครใหม่ 4 ตัว: ซาราเอล อนุบิส ไพรวัลย์ มอร์ธา (migrate_newchars3.sql) =====
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


-- ===== แท่นบูชาวิญญาณ + ร้านแลกวิญญาณ (migrate_altar.sql) =====
create or replace function public._altar_c(k text) returns int language sql immutable as $$
  select case k when 'gold' then 30 when 'god' then 200 when 'batch' then 200 when 'lv2' then 10 end $$;
create or replace function public._soul_of(lv int) returns int language sql immutable as $$
  select case when lv >= public._altar_c('lv2') then 2 else 1 end $$;

-- ข้อมูลหน้าแท่นบูชา: วิญญาณที่มี + ราคา
create or replace function public.altar_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  return jsonb_build_object('souls', p.souls, 'gold', public._altar_c('gold'), 'god', public._altar_c('god'),
    'batch', public._altar_c('batch'), 'lv2', public._altar_c('lv2'), 'exchange', jsonb_build_object('souls', 10, 'amber', 25),
    'god_eggs', p.god_eggs + p.god_eggs_sure);
end $$;

-- สังเวย: ทุกตัวต้องเป็นของเรา ระดับทั่วไป ไม่มีดาว ไม่อยู่ในทีม (ไม่งั้นยกเลิกทั้งชุด)
create or replace function public.soul_sacrifice(ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; n int; ok int; gain int;
begin
  p := public._player(u);
  select count(distinct x) into n from unnest(ids) x;
  if n < 1 or n > public._altar_c('batch') then raise exception 'altar_count'; end if;
  if ids && p.team then raise exception 'altar_team'; end if;
  select count(*), coalesce(sum(public._soul_of(m.lv)), 0) into ok, gain
    from public.monsters m join public.species s on s.sp = m.sp
   where m.user_id = u and m.id = any(ids) and s.rar = 1 and coalesce(m.stars, 0) = 0;
  if ok <> n then raise exception 'altar_bad'; end if;
  delete from public.monsters m where m.user_id = u and m.id = any(ids);
  update public.players set souls = souls + gain, updated_at = now() where user_id = u;
  return jsonb_build_object('count', n, 'gain', gain, 'souls', p.souls + gain, 'state', public._state(u));
end $$;

-- ร้านแลกวิญญาณ: 'gold' = ฟักไข่ทองคำทันที · 'god' = ไข่เทพ +1
create or replace function public.soul_buy(item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; cost int; res jsonb;
begin
  p := public._player(u);
  if item not in ('gold', 'god') then raise exception 'bad_item'; end if;
  cost := public._altar_c(item);
  if p.souls < cost then raise exception 'not_enough_souls'; end if;
  update public.players set souls = souls - cost, updated_at = now() where user_id = u;
  if item = 'gold' then
    -- ใช้ฟังก์ชันฟักไข่ทองคำเดิมทั้งชุด (อัตรา/pity/ประกาศ) โดยเติมอัมพรเท่าราคาไข่ให้ก่อนแล้วฟักหักคืนในธุรกรรมเดียว
    update public.players set amber = amber + public._c('gold_cost') where user_id = u;
    res := public.hatch_egg('gold');
  else
    update public.players set god_eggs = god_eggs + 1 where user_id = u;
    res := jsonb_build_object('god_eggs', p.god_eggs + p.god_eggs_sure + 1, 'state', public._state(u));
  end if;
  return res || jsonb_build_object('item', item, 'souls', p.souls - cost);
end $$;

revoke execute on function public._altar_c(text), public._soul_of(int) from public, anon, authenticated;
revoke execute on function public.altar_state(), public.soul_sacrifice(bigint[]), public.soul_buy(text) from public, anon;
grant execute on function public.altar_state(), public.soul_sacrifice(bigint[]), public.soul_buy(text) to authenticated;

-- ===== รวมร่าง แทนเปลี่ยนร่าง (migrate_fusion.sql) =====
-- โอกาสได้ระดับสูงขึ้น 1 ขั้น เมื่อรวมร่างตัวระดับ r (ที่เหลือ = ได้ระดับเดิม)
create or replace function public._fuse_up(r int) returns float8 language sql immutable as $$
  select case r when 1 then 1.0 when 2 then 0.1 end::float8 $$;

create or replace function public.fuse_monsters(a bigint, b bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; n int; r1 int; r2 int; t int; v_sp text; v_el text; mid bigint; tm bigint[];
begin
  p := public._player(u);
  if a is null or b is null or a = b then raise exception 'same_monster'; end if;
  perform 1 from public.monsters m where m.user_id = u and m.id in (a, b) order by m.id for update;
  select count(*), min(s.rar), max(s.rar) into n, r1, r2
    from public.monsters m join public.species s on s.sp = m.sp where m.user_id = u and m.id in (a, b);
  if n <> 2 then raise exception 'no_monster'; end if;
  if r1 <> r2 or public._fuse_up(r1) is null then raise exception 'fuse_tier'; end if;
  if exists (select 1 from public.monsters m join public.species s on s.sp = m.sp
              where m.user_id = u and m.id in (a, b) and m.lv < s.max_lv) then raise exception 'fuse_level'; end if;
  if exists (select 1 from public.monsters m where m.user_id = u and m.id in (a, b) and coalesce(m.stars, 0) < 6) then raise exception 'fuse_stars'; end if;

  t := case when random() < public._fuse_up(r1) then r1 + 1 else r1 end;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then raise exception 'fuse_tier'; end if;
  select e.el into v_el from public.el_rates e where e.w > 0 order by -ln(1 - random()) / e.w limit 1;

  delete from public.monsters m where m.user_id = u and m.id in (a, b);
  insert into public.monsters (user_id, sp, lv, el) values (u, v_sp, 1, v_el) returning id into mid;
  -- ทีม: ตัวใหม่เข้าแทนช่องของตัวที่อยู่ในทีม (ถ้าอยู่ทั้งคู่ เหลือช่องเดียว)
  tm := p.team;
  if a = any(tm) then tm := array_remove(array_replace(tm, a, mid), b);
  elsif b = any(tm) then tm := array_replace(tm, b, mid); end if;
  update public.players set team = tm, updated_at = now() where user_id = u;
  perform public._pull_log(u, v_sp, v_el);
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'rar', t, 'from', r1, 'state', public._state(u));
end $$;

-- เปลี่ยนร่างแบบเดิม: ปิด (ใช้รวมร่างแทน)
create or replace function public.evolve_monster(mon_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'evolve_closed';
end $$;


-- ===== ส่งสำรวจ v2: โอกาสสำเร็จ + โอกาสตายไล่ตามระดับ (migrate_expedition2.sql) =====
-- risk = ค่าเดิม (หน้าเกมรุ่นเก่ายังอ่านอยู่) · die = โอกาสตายของตัวทั่วไปเมื่อพลังพอดีและสำรวจสำเร็จ
create or replace function public._exp_zones() returns jsonb language sql immutable as $$
  select '[
    {"id":"meadow","name":"ทุ่งหญ้าชายป่า","rec":1200,"min":30,"risk":0.04,"die":0.30,"coins":600,"amber":4,"lv":1,"gold_p":0,"god_p":0},
    {"id":"crystal","name":"ถ้ำคริสตัลเรืองแสง","rec":4000,"min":120,"risk":0.07,"die":0.50,"coins":3000,"amber":20,"lv":2,"gold_p":0,"god_p":0},
    {"id":"ashen","name":"หุบเขาเถ้าถ่าน","rec":10000,"min":240,"risk":0.10,"die":0.70,"coins":8000,"amber":50,"lv":3,"gold_p":0.15,"god_p":0},
    {"id":"skyruin","name":"ซากวิหารลอยฟ้า","rec":25000,"min":480,"risk":0.14,"die":0.85,"coins":20000,"amber":120,"lv":4,"gold_p":0.25,"god_p":0.01}
  ]'::jsonb $$;

-- ค่ากติกา (ส่งให้หน้าเกมใช้คำนวณตัวเลขที่แสดง ให้ตรงกับเซิร์ฟเวอร์)
create or replace function public._exp_rule() returns jsonb language sql immutable as $$
  select '{"v":2, "win_k":0.7, "win_pow":1.5, "win_min":0.05, "win_max":0.95, "fail_k":1.5, "fail_coins":0.25,
           "team_min":0.35, "team_max":1.6, "self_pow":0.3, "self_min":0.7, "self_max":1.5,
           "tier":{"1":1.0,"2":0.55,"3":0.30,"4":0.12},
           "cap":{"1":0.90,"2":0.70,"3":0.50,"4":0.25},
           "floor":{"1":0.08,"2":0.04,"3":0.02,"4":0.01}}'::jsonb $$;

-- โอกาสสำเร็จของทั้งทีม
create or replace function public._exp_win(z jsonb, party int) returns float8 language sql immutable as $$
  select least((r->>'win_max')::float8, greatest((r->>'win_min')::float8,
    (r->>'win_k')::float8 * power(greatest(party, 1)::float8 / (z->>'rec')::float8, (r->>'win_pow')::float8)))
  from (select public._exp_rule() r) q $$;

-- โอกาสตายของ 1 ตัว (rar = ระดับ 1–4 · failed = การสำรวจล้มเหลว)
create or replace function public._exp_die(z jsonb, party int, one int, avg_pow float8, rar int, failed boolean) returns float8 language sql immutable as $$
  select least((r->'cap'->>t)::float8, greatest((r->'floor'->>t)::float8,
    (z->>'die')::float8 * (r->'tier'->>t)::float8
    * least((r->>'team_max')::float8, greatest((r->>'team_min')::float8, (z->>'rec')::float8 / greatest(party, 1)))
    * least((r->>'self_max')::float8, greatest((r->>'self_min')::float8, power(avg_pow / greatest(one, 1), (r->>'self_pow')::float8)))
    * case when failed then (r->>'fail_k')::float8 else 1 end))
  from (select public._exp_rule() r, least(4, greatest(1, coalesce(rar, 1)))::text t) q $$;

create or replace function public.exp_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1;
  return jsonb_build_object('zones', public._exp_zones(), 'rule', public._exp_rule(), 'souls', p.souls,
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb), 'soul_rate', jsonb_build_object('souls', 10, 'amber', 25),
    'active', case when e.id is null then null else jsonb_build_object('id', e.id, 'zone', e.zone, 'mons', e.mons, 'power', e.power,
      'win', round(public._exp_win(public._exp_zone(e.zone), e.power)::numeric, 3),
      'started_at', e.started_at, 'ends_at', e.ends_at, 'left', greatest(0, ceil(extract(epoch from e.ends_at - now())))::int) end);
end $$;

-- รับผลการสำรวจ (สุ่มผลที่เซิร์ฟเวอร์ครั้งเดียว): สุ่มสำเร็จ/ล้มเหลวก่อน แล้วสุ่มการรอดรายตัว
create or replace function public.exp_claim() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions; z jsonb; m jsonb; n int; avg_pow float8; risk float8; win_p float8; ok boolean; rr int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; nlv int; mx int; v_souls int := 0; s int; v_coins int := 0; v_amber int := 0; k float8; res jsonb;
  drops jsonb := '[]'::jsonb; h jsonb;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1 for update;
  if e.id is null then raise exception 'no_exp'; end if;
  if now() < e.ends_at then raise exception 'exp_not_done'; end if;
  z := public._exp_zone(e.zone); n := jsonb_array_length(e.mons); avg_pow := e.power::float8 / greatest(n, 1);
  win_p := public._exp_win(z, e.power); ok := random() < win_p;
  for m in select * from jsonb_array_elements(e.mons) loop
    select sp.rar, sp.max_lv into rr, mx from public.species sp where sp.sp = m->>'sp';
    risk := public._exp_die(z, e.power, (m->>'pow')::int, avg_pow, rr, not ok);
    if random() < risk then
      s := 2 * coalesce(rr, 1) + 3 * coalesce((m->>'stars')::int, 0) + (m->>'lv')::int / 5;
      v_souls := v_souls + s; dead := dead || jsonb_build_array(m || jsonb_build_object('souls', s, 'risk', round(risk::numeric, 3)));
    else
      nlv := case when ok then least(coalesce(mx, 100), (m->>'lv')::int + (z->>'lv')::int) else (m->>'lv')::int end;
      insert into public.monsters (user_id, sp, lv, el, stars) values (u, m->>'sp', nlv, m->>'el', coalesce((m->>'stars')::int, 0));
      alive := alive || jsonb_build_array(m || jsonb_build_object('lv_new', nlv, 'risk', round(risk::numeric, 3)));
    end if;
  end loop;
  k := (0.5 + 0.5 * jsonb_array_length(alive)::float8 / greatest(n, 1)) * (0.5 + 0.5 * least(1.0, n / 6.0));
  if ok then
    v_coins := round((z->>'coins')::int * k);
    v_amber := round((z->>'amber')::int * k);
  else
    v_coins := round((z->>'coins')::int * k * (public._exp_rule()->>'fail_coins')::float8);   -- เหรียญปลอบใจ
  end if;
  update public.players set coins = coins + v_coins, amber = amber + v_amber, souls = souls + v_souls, updated_at = now() where user_id = u;
  -- ของลุ้น (เฉพาะเมื่อสำเร็จ · สุ่มแยกกัน)
  if ok and random() < coalesce((z->>'god_p')::float8, 0) then
    update public.players set god_eggs = god_eggs + 1 where user_id = u;
    drops := drops || jsonb_build_array(jsonb_build_object('kind', 'god'));
  end if;
  if ok and random() < coalesce((z->>'gold_p')::float8, 0) then
    if (select count(*) from public.monsters where user_id = u) < public._slots(u) then
      -- ฟักด้วยฟังก์ชันไข่ทองคำเดิมทั้งชุด: เติมอัมพรเท่าราคาไข่แล้วให้ hatch_egg หักคืน (ธุรกรรมเดียว)
      update public.players set amber = amber + public._c('gold_cost') where user_id = u;
      h := public.hatch_egg('gold');
      drops := drops || jsonb_build_array(jsonb_build_object('kind', 'gold', 'mon', h->'mon', 'rar', h->'rar'));
    else
      update public.players set amber = amber + public._c('gold_cost') where user_id = u;
      drops := drops || jsonb_build_array(jsonb_build_object('kind', 'gold_amber', 'amber', public._c('gold_cost')));
    end if;
  end if;
  res := jsonb_build_object('zone', e.zone, 'ok', ok, 'win', round(win_p::numeric, 3), 'alive', alive, 'dead', dead, 'coins', v_coins, 'amber', v_amber, 'souls', v_souls, 'drops', drops);
  update public.expeditions set done = true, result = res where id = e.id;
  return jsonb_build_object('result', res, 'exp', public.exp_state(), 'state', public._state(u));
end $$;

revoke execute on function public._exp_zones(), public._exp_rule(), public._exp_win(jsonb, int), public._exp_die(jsonb, int, int, float8, int, boolean)
  from public, anon, authenticated;
revoke execute on function public.exp_state(), public.exp_claim() from public, anon;
grant execute on function public.exp_state(), public.exp_claim() to authenticated;


-- ===== จดหมายแจกไข่เทพได้ (migrate_mail_godegg.sql) =====
alter table public.mail add column if not exists god_eggs int not null default 0 check (god_eggs >= 0);

create or replace function public.mail_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'body', m.body, 'amber', m.amber, 'coins', m.coins, 'god_eggs', m.god_eggs,
            'expires_at', m.expires_at, 'claimed', c.mail_id is not null) order by m.id desc)
    from public.mail m left join public.mail_claims c on c.mail_id = m.id and c.user_id = u
    where now() between m.starts_at and m.expires_at and (m.user_id is null or m.user_id = u)), '[]'::jsonb);
end $$;

create or replace function public.claim_mail(mail_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); m public.mail;
begin
  perform public._player(u);
  select * into m from public.mail x where x.id = claim_mail.mail_id and now() between x.starts_at and x.expires_at
    and (x.user_id is null or x.user_id = u);
  if not found then raise exception 'no_mail'; end if;
  insert into public.mail_claims (user_id, mail_id) values (u, m.id) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  update public.players set amber = amber + m.amber, coins = coins + m.coins, god_eggs = god_eggs + m.god_eggs, updated_at = now() where user_id = u;
  return jsonb_build_object('amber', m.amber, 'coins', m.coins, 'god_eggs', m.god_eggs, 'state', public._state(u));
end $$;

revoke execute on function public.mail_list(), public.claim_mail(bigint) from public, anon;
grant execute on function public.mail_list(), public.claim_mail(bigint) to authenticated;


-- ===== แชทโลก + แชทเผ่า + ข้อเสนอแนะ (migrate_chat.sql) =====
-- ---------- ตาราง ----------
create table if not exists public.chat_msgs (
  id         bigint generated always as identity primary key,
  ch         text not null check (ch in ('world','god','undead','beast','human')),
  user_id    uuid not null references public.players(user_id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_msgs_ch on public.chat_msgs (ch, id desc);
create index if not exists chat_msgs_user on public.chat_msgs (user_id, id desc);
create table if not exists public.chat_mutes (
  user_id uuid primary key references public.players(user_id) on delete cascade,
  until   timestamptz not null,
  reason  text
);
create table if not exists public.suggestions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.players(user_id) on delete cascade,
  body       text not null,
  reply      text,                                   -- คำตอบจากทีมงาน (ใส่เองใน SQL Editor)
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists suggestions_user on public.suggestions (user_id, created_at desc);
create table if not exists public.suggestion_votes (
  sid     bigint not null references public.suggestions(id) on delete cascade,
  user_id uuid   not null references public.players(user_id) on delete cascade,
  v       smallint not null check (v in (1, -1)),
  primary key (sid, user_id)
);
alter table public.chat_msgs        enable row level security;   -- ไม่มี policy = เข้าถึงผ่านฟังก์ชันเท่านั้น
alter table public.chat_mutes       enable row level security;
alter table public.suggestions      enable row level security;
alter table public.suggestion_votes enable row level security;
revoke all on public.chat_msgs, public.chat_mutes, public.suggestions, public.suggestion_votes from anon, authenticated;

-- ---------- ค่าคงที่ + ตัวช่วย ----------
create or replace function public._chat_c(k text) returns int language sql immutable as $$
  select case k when 'len' then 200 when 'gap' then 3 when 'per_min' then 12 when 'keep' then 300 when 'page' then 50
                when 'sg_min' then 10 when 'sg_max' then 500 when 'sg_day' then 3 when 'sg_page' then 100 end $$;
-- บัญชีที่ผูกแล้ว (ไม่ใช่ผู้เยี่ยมชม)
create or replace function public._linked(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not coalesce(a.is_anonymous, false) from auth.users a where a.id = u), false) $$;
-- ทำความสะอาดข้อความ: ตัดอักขระควบคุม ยุบช่องว่าง/ขึ้นบรรทัดซ้ำ
create or replace function public._clean_text(t text, keep_nl boolean) returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''), E'[\\x00-\\x08\\x0B-\\x1F\\x7F]', '', 'g'),
    case when keep_nl then E'[ \\t]+' else E'\\s+' end, ' ', 'g'), E'\\n{3,}', E'\n\n', 'g')) $$;
create or replace function public._chat_rows(v_ch text, after bigint, u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.id), '[]'::jsonb) from (
    select m.id, p.name, p.race, m.body, m.created_at as at, m.user_id = u as me
      from public.chat_msgs m join public.players p on p.user_id = m.user_id
     where m.ch = v_ch and m.id > coalesce(after, 0)
     order by m.id desc limit public._chat_c('page')) x $$;

-- ---------- แชท ----------
-- ดึงข้อความใหม่ของทั้งสองห้องในครั้งเดียว (w, r = id ล่าสุดที่หน้าเกมมีแล้ว · 0 = ขอ 50 ข้อความล่าสุด)
create or replace function public.chat_poll(w bigint, r bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; mu timestamptz;
begin
  p := public._player(u);
  select until into mu from public.chat_mutes where user_id = u and until > now();
  return jsonb_build_object('world', public._chat_rows('world', w, u),
    'race', case when p.race is null then '[]'::jsonb else public._chat_rows(p.race, r, u) end,
    'race_key', p.race, 'muted_until', mu, 'len', public._chat_c('len'), 'gap', public._chat_c('gap'));
end $$;

create or replace function public.chat_send(ch text, body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t text := public._clean_text(body, false); v_ch text; mid bigint; cut bigint;
begin
  p := public._player(u);
  if not p.named or p.race is null then raise exception 'chat_need_name'; end if;
  if ch not in ('world', 'race') then raise exception 'bad_channel'; end if;
  if char_length(t) < 1 or char_length(t) > public._chat_c('len') then raise exception 'chat_len'; end if;
  if exists (select 1 from public.chat_mutes m where m.user_id = u and m.until > now()) then raise exception 'chat_muted'; end if;
  if exists (select 1 from public.chat_msgs m where m.user_id = u and m.created_at > now() - make_interval(secs => public._chat_c('gap')))
     or (select count(*) from public.chat_msgs m where m.user_id = u and m.created_at > now() - interval '1 minute') >= public._chat_c('per_min')
    then raise exception 'chat_fast'; end if;
  v_ch := case when ch = 'world' then 'world' else p.race end;
  insert into public.chat_msgs (ch, user_id, body) values (v_ch, u, t) returning id into mid;
  -- เก็บเฉพาะข้อความล่าสุดของห้อง
  select m.id into cut from public.chat_msgs m where m.ch = v_ch order by m.id desc offset public._chat_c('keep') limit 1;
  if cut is not null then delete from public.chat_msgs m where m.ch = v_ch and m.id <= cut; end if;
  return jsonb_build_object('id', mid);
end $$;

-- ---------- ข้อเสนอแนะ ----------
create or replace function public.suggest_list(sort text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; res jsonb;
begin
  p := public._player(u);
  select coalesce(jsonb_agg(to_jsonb(x) - 'score' order by case when sort = 'new' then 0 else x.score end desc, x.id desc), '[]'::jsonb) into res from (
    select s.id, pl.name, pl.race, s.body, s.reply, s.created_at as at, s.user_id = u as mine,
           coalesce(v.up, 0) as up, coalesce(v.down, 0) as down, coalesce(v.up, 0) - coalesce(v.down, 0) as score,
           coalesce((select mv.v from public.suggestion_votes mv where mv.sid = s.id and mv.user_id = u), 0) as my
      from public.suggestions s join public.players pl on pl.user_id = s.user_id
      left join lateral (select count(*) filter (where sv.v = 1) as up, count(*) filter (where sv.v = -1) as down
                           from public.suggestion_votes sv where sv.sid = s.id) v on true
     where not s.hidden
     order by case when sort = 'new' then 0 else coalesce(v.up, 0) - coalesce(v.down, 0) end desc, s.id desc
     limit public._chat_c('sg_page')) x;
  return jsonb_build_object('list', res, 'linked', public._linked(u), 'min', public._chat_c('sg_min'), 'max', public._chat_c('sg_max'),
    'left_today', greatest(0, public._chat_c('sg_day') - (select count(*) from public.suggestions s where s.user_id = u and s.created_at > now() - interval '1 day'))::int);
end $$;

create or replace function public.suggest_post(body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; t text := public._clean_text(body, true);
begin
  p := public._player(u);
  if not public._linked(u) then raise exception 'need_link'; end if;
  if not p.named then raise exception 'chat_need_name'; end if;
  if char_length(t) < public._chat_c('sg_min') or char_length(t) > public._chat_c('sg_max') then raise exception 'suggest_len'; end if;
  if (select count(*) from public.suggestions s where s.user_id = u and s.created_at > now() - interval '1 day') >= public._chat_c('sg_day')
    then raise exception 'suggest_limit'; end if;
  insert into public.suggestions (user_id, body) values (u, t);
  return public.suggest_list('new');
end $$;

-- vote = 1 ถูกใจ · -1 ไม่ถูกใจ · 0 ยกเลิก
create or replace function public.suggest_vote(p_id bigint, vote int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); s public.suggestions;
begin
  perform public._player(u);
  if not public._linked(u) then raise exception 'need_link'; end if;
  if vote is null or vote not in (1, -1, 0) then raise exception 'bad_vote'; end if;
  select * into s from public.suggestions x where x.id = p_id and not x.hidden;
  if not found then raise exception 'no_suggest'; end if;
  if s.user_id = u then raise exception 'suggest_own'; end if;
  if vote = 0 then delete from public.suggestion_votes sv where sv.sid = s.id and sv.user_id = u;
  else insert into public.suggestion_votes (sid, user_id, v) values (s.id, u, vote)
       on conflict (sid, user_id) do update set v = excluded.v; end if;
  return jsonb_build_object('id', s.id, 'my', vote,
    'up', (select count(*) from public.suggestion_votes sv where sv.sid = s.id and sv.v = 1),
    'down', (select count(*) from public.suggestion_votes sv where sv.sid = s.id and sv.v = -1));
end $$;

-- เจ้าของลบข้อเสนอแนะของตัวเองได้
create or replace function public.suggest_delete(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  delete from public.suggestions s where s.id = p_id and s.user_id = u;
  if not found then raise exception 'no_suggest'; end if;
  return jsonb_build_object('id', p_id);
end $$;

-- สำหรับผู้ดูแล: ข้อเสนอแนะเรียงตามคะแนน (ดูได้เฉพาะใน SQL Editor)
create or replace view public.suggest_admin with (security_invoker = true) as
  select q.* from (
    select s.id, p.name, s.body, s.reply, s.hidden, s.created_at,
           (select count(*) from public.suggestion_votes v where v.sid = s.id and v.v = 1)  as up,
           (select count(*) from public.suggestion_votes v where v.sid = s.id and v.v = -1) as down
      from public.suggestions s join public.players p on p.user_id = s.user_id) q
   order by q.up - q.down desc, q.id desc;
revoke all on public.suggest_admin from anon, authenticated;

revoke execute on function public._chat_c(text), public._linked(uuid), public._clean_text(text, boolean), public._chat_rows(text, bigint, uuid) from public, anon, authenticated;
revoke execute on function public.chat_poll(bigint, bigint), public.chat_send(text, text), public.suggest_list(text), public.suggest_post(text),
  public.suggest_vote(bigint, int), public.suggest_delete(bigint) from public, anon;
grant execute on function public.chat_poll(bigint, bigint), public.chat_send(text, text), public.suggest_list(text), public.suggest_post(text),
  public.suggest_vote(bigint, int), public.suggest_delete(bigint) to authenticated;

