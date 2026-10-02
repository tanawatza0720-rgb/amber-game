-- =====================================================================
-- ตำนานป่าอัมพร : รวมร่าง (แทนปุ่ม "เปลี่ยนร่าง" เดิม · 2 ต.ค. 2026)
--   ใช้มอนสเตอร์ 2 ตัวที่ "ระดับเดียวกัน + เลเวลเต็ม + ดาวเต็ม (6 ดาว)" รวมกันเป็นตัวใหม่ 1 ตัว (สุ่มสายพันธุ์ + ธาตุ · Lv 1 · 0 ดาว)
--     ทั่วไป + ทั่วไป  → หายาก 100%
--     หายาก + หายาก → ตำนาน 90% · หายาก 10%
--   ทั้งสองตัวหายไป · ถ้าตัวใดอยู่ในทีม ตัวใหม่เข้าทีมแทนในช่องนั้น · ได้ตำนานแล้วขึ้นประกาศวิ่งเหมือนฟักไข่
--   เปลี่ยนร่างแบบเดิม (evolve_monster) ปิดใช้งาน
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- =====================================================================

-- โอกาสได้ระดับสูงขึ้น 1 ขั้น เมื่อรวมร่างตัวระดับ r (ที่เหลือ = ได้ระดับเดิม)
create or replace function public._fuse_up(r int) returns float8 language sql immutable as $$
  select case r when 1 then 1.0 when 2 then 0.9 end::float8 $$;

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

revoke execute on function public._fuse_up(int) from public, anon, authenticated;
revoke execute on function public.fuse_monsters(bigint, bigint) from public, anon;
grant execute on function public.fuse_monsters(bigint, bigint) to authenticated;

select public._fuse_up(1) as common_to_rare, public._fuse_up(2) as rare_to_legend;
