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
