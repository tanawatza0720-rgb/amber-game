-- =====================================================================
-- ตำนานป่าอัมพร : ไข่ป่าเปลี่ยนจาก 100 เหรียญ เป็น 10 อัมพร (3 ต.ค. 2026 · แก้ด่วน)
--   เหตุผล: เหรียญจากดันด่านมีมากจนซื้อไข่ป่าได้วันละหลายร้อยใบ (ตำนาน 2%/ใบ) = ปั๊มตัวตำนานได้ไม่จำกัด
--   อัตราออกของไข่ป่าเท่าเดิม (ทั่วไป 83% · หายาก 15% · ตำนาน 2%) · ไข่ทองคำ 30 อัมพรเท่าเดิม
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
-- =====================================================================
create or replace function public._wild_amber() returns int language sql immutable as $$ select 10 $$;

create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; v_el text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._slots(u) then raise exception 'box_full'; end if;
  if kind = 'wild' then
    -- ไข่ป่าใช้อัมพร (เดิมใช้เหรียญ 100 → ปั๊มตำนานจากเหรียญดันด่านได้ไม่จำกัด)
    if p.amber < public._wild_amber() then raise exception 'not_enough_amber'; end if;
    update public.players set amber = amber - public._wild_amber() where user_id = u;
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

create or replace function public.hatch_eggs(kind text, n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r jsonb; list jsonb := '[]'::jsonb; i int; cost int;
begin
  p := public._player(u);
  if kind not in ('wild', 'gold') then raise exception 'bad_egg'; end if;
  if n not in (1, 10) then raise exception 'bad_count'; end if;
  if (select count(*) from public.monsters where user_id = u) + n > public._slots(u) then raise exception 'box_full'; end if;
  cost := n * case kind when 'wild' then public._wild_amber() else public._c('gold_cost') end;
  if p.amber < cost then raise exception 'not_enough_amber'; end if;
  for i in 1..n loop
    r := public.hatch_egg(kind);
    list := list || jsonb_build_array(jsonb_build_object('mon', r->'mon', 'rar', r->'rar'));
  end loop;
  return jsonb_build_object('list', list, 'state', public._state(u));
end $$;

revoke execute on function public._wild_amber() from public, anon, authenticated;
revoke execute on function public.hatch_egg(text), public.hatch_eggs(text, int) from public, anon;
grant execute on function public.hatch_egg(text), public.hatch_eggs(text, int) to authenticated;

select public._wild_amber() as wild_egg_amber, public._c('gold_cost') as gold_egg_amber;
