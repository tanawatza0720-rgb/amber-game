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
