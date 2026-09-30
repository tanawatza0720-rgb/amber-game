-- =====================================================================
-- ตำนานป่าอัมพร : ปรับเรทไข่เทพ + ธาตุแสง/มืดหายากขึ้น 2 เท่า
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_stage_rewards.sql ก่อน
--   ไข่เทพ: เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2% · ไม่มีระดับทั่วไป
--   ทุกไข่: ธาตุแสง/มืดมีน้ำหนัก 0.5 (ธาตุอื่น 1) → ตัวแสง/มืดออกยากกว่าธาตุอื่น 2 เท่า (ไม่แสดงในหน้าเรท)
--   หมายเหตุอีเวนต์ธาตุ: จบอีเวนต์ให้คืนค่าเป็น  update public.el_rates set w = case when el in ('แสง','มืด') then 0.5 else 1 end;
-- =====================================================================
update public.el_rates set w = 0.5 where el in ('แสง', 'มืด');

create or replace function public.stage_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  return jsonb_build_object('stage', p.stage, 'god_eggs', p.god_eggs, 'god_eggs_sure', p.god_eggs_sure,
    'pending', coalesce((select jsonb_agg(public._stage_reward(g) order by g) from generate_series(5, p.stage, 5) g
                         where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = g)), '[]'::jsonb),
    'next', public._stage_reward(((p.stage / 5) + 1) * 5),
    'rates', jsonb_build_object('4', 0.008, '3', 0.15, '2', 0.842));
end $$;

-- ฟักไข่เทพ (ใช้ไข่การันตีก่อนถ้ามี)
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
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'sure', sure,
    'rar', (select rar from public.species where species.sp = v_sp), 'stage', public.stage_state(), 'state', public._state(u));
end $$;

