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
    when 'pity_max'     then 30    -- ไข่ทองคำครบ 30 ใบ การันตี ★5
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
