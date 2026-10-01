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
--   - รางวัลผ่านชั้น (ครั้งแรกของสัปดาห์): เหรียญ 200 + 80×ชั้น · ชั้นบอสได้อัมพร 30/50/80/120/200
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
    'amber', case f when 10 then 30 when 20 then 50 when 30 then 80 when 40 then 120 when 50 then 200 else 0 end,
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
