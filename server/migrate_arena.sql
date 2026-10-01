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
