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
