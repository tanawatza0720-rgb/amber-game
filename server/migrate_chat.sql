-- =====================================================================
-- ตำนานป่าอัมพร : แชทโลก + แชทเผ่า + กล่องข้อเสนอแนะ (3 ต.ค. 2026)
--   แชท: ผู้เล่นที่ตั้งชื่อและเลือกเผ่าแล้วพิมพ์ได้ทุกคน · ข้อความยาวไม่เกิน 200 ตัวอักษร · เว้น 3 วิ/ข้อความ และไม่เกิน 12 ข้อความ/นาที
--         เก็บ 300 ข้อความล่าสุดต่อห้อง (โลก 1 ห้อง + เผ่าละ 1 ห้อง) · หน้าเกมดึงข้อความเป็นระยะ (chat_poll)
--   ข้อเสนอแนะ: เขียนและกดถูกใจ/ไม่ถูกใจได้เฉพาะบัญชีที่ผูกแล้ว (ไม่ใช่ผู้เยี่ยมชม) · 10–500 ตัวอักษร · วันละไม่เกิน 3 เรื่อง · ทุกคนอ่านได้
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--
-- คำสั่งสำหรับผู้ดูแล (รันใน SQL Editor):
--   ดูข้อเสนอแนะเรียงตามคะแนน:  select * from public.suggest_admin;
--   ตอบข้อเสนอแนะ:             update public.suggestions set reply = 'ข้อความตอบจากทีมงาน' where id = 12;
--   ซ่อนข้อเสนอแนะ:             update public.suggestions set hidden = true where id = 12;
--   ลบข้อความแชท:              delete from public.chat_msgs where id = 345;
--   ปิดปากผู้เล่น 1 วัน:          insert into public.chat_mutes (user_id, until, reason) select user_id, now() + interval '1 day', 'สแปม' from public.players where name = 'ชื่อผู้เล่น'
--                               on conflict (user_id) do update set until = excluded.until, reason = excluded.reason;
--   เลิกปิดปาก:                 delete from public.chat_mutes where user_id = (select user_id from public.players where name = 'ชื่อผู้เล่น');
-- =====================================================================

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

select (select count(*) from public.chat_msgs) as chat_msgs, (select count(*) from public.suggestions) as suggestions;
