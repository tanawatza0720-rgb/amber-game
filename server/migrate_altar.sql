-- =====================================================================
-- ตำนานป่าอัมพร : แท่นบูชาวิญญาณ + ร้านแลกวิญญาณ (1 ต.ค. 2026)
--   สังเวยตัวระดับทั่วไป (rar 1) ที่ไม่มีดาวและไม่อยู่ในทีม → วิญญาณ (Lv ต่ำกว่า 10 = 1 · Lv 10 ขึ้นไป = 2)
--   ร้านแลกวิญญาณ: 30 → ฟักไข่ทองคำ 1 ใบทันที (เหมือนจ่ายอัมพร นับ pity ด้วย) · 200 → ไข่เทพ 1 ใบ (เข้าคลังไข่เทพเดิม)
--   แลก 10 วิญญาณ → 25 อัมพร (soul_exchange) ยังใช้ได้เหมือนเดิม
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- =====================================================================

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

select public._altar_c('gold') gold, public._altar_c('god') god;
