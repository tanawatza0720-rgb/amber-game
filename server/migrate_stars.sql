-- =====================================================================
-- ตำนานป่าอัมพร : ระบบดาว (วิวัฒน์ด้วยตัวซ้ำ) + ปรับสเกลเทพเจ้า
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   เริ่ม 0 ดาว สูงสุด 6 ดาว · ใช้ตัวซ้ำสายพันธุ์เดียวกัน ดาวละ 1 ตัว ดาวที่ 3 และ 6 ใช้ 2 ตัว
--   ตัวที่ใช้เป็นวัตถุดิบต้องไม่อยู่ในทีม และจะหายไปจากคลัง · ดาวไม่เพิ่มค่าพลัง (เพิ่ม Lv สกิลฝั่งเกม)
-- =====================================================================
alter table public.monsters add column if not exists stars int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'monsters_stars_range') then
    alter table public.monsters add constraint monsters_stars_range check (stars between 0 and 6);
  end if; end $$;

-- เทพเจ้าแข็งแกร่งขึ้น (hp 190 / atk 74 / def 26 / spd 60)
update public.species set pow = 684 where sp = 'amateru';

create or replace function public._state(u uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'name', p.name, 'lv', p.lv, 'xp', p.xp, 'coins', p.coins, 'amber', p.amber,
      'energy', p.energy, 'energy_max', public._c('energy_max'),
      'energy_next', case when p.energy >= public._c('energy_max') then 0
                      else greatest(0, public._c('energy_sec') - floor(extract(epoch from now() - p.energy_at))::int) end,
      'energy_sec', public._c('energy_sec'),
      'amber_in', greatest(0, ceil(extract(epoch from p.amber_at - now()))::int),
      'daily_streak', p.daily_streak, 'daily_claimed', coalesce(p.daily_last = public._today(), false),
      'hatch_count', p.hatch_count, 'pity', p.pity, 'pity_max', public._c('pity_max'),
      'quests', p.quests, 'team', to_jsonb(p.team), 'slots', public._c('slots'),
      'named', p.named, 'uid', upper(substr(replace(p.user_id::text,'-',''),1,8)),
      'stage', p.stage, 'power', public._power(u), 'need', public._req(p.stage + 1),
      'boss', (p.stage + 1) % 10 = 0,
      'idle_sec', least(public._c('idle_max'), greatest(0, floor(extract(epoch from now() - p.idle_at))::int)),
      'idle_max', public._c('idle_max'), 'rate_c', public._rate_c(p.stage), 'rate_x', public._c('idle_xp'),
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int)),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

create or replace function public.star_up(mon_id bigint, mat_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; m public.monsters; need int; n int;
begin
  p := public._player(u);
  select * into m from public.monsters where id = mon_id and user_id = u for update;
  if not found then raise exception 'no_monster'; end if;
  if m.stars >= 6 then raise exception 'max_stars'; end if;
  need := case when m.stars + 1 in (3, 6) then 2 else 1 end;
  if mat_ids is null or cardinality(mat_ids) <> need
     or (select count(distinct x) from unnest(mat_ids) x) <> need then raise exception 'bad_material'; end if;
  if mon_id = any(mat_ids) then raise exception 'same_monster'; end if;
  if mat_ids && p.team then raise exception 'material_in_team'; end if;
  select count(*) into n from public.monsters x
    where x.id = any(mat_ids) and x.user_id = u and x.sp = m.sp;
  if n <> need then raise exception 'not_same_species'; end if;
  -- ห้ามใช้ตัวที่ดาวมากกว่าตัวหลักเป็นวัตถุดิบ
  if exists (select 1 from public.monsters x where x.id = any(mat_ids) and x.user_id = u and x.stars > m.stars)
    then raise exception 'material_stronger'; end if;
  delete from public.monsters x where x.id = any(mat_ids) and x.user_id = u;
  update public.monsters set stars = stars + 1 where id = m.id;
  update public.players set updated_at = now() where user_id = u;
  return jsonb_build_object('stars', m.stars + 1, 'state', public._state(u));
end $$;
revoke execute on function public.star_up(bigint, bigint[]) from public, anon;
grant execute on function public.star_up(bigint, bigint[]) to authenticated;
