-- =====================================================================
-- ตำนานป่าอัมพร : เผ่า 4 เผ่า (เลือกครั้งเดียวตอนเริ่มเกม)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   god = เผ่าเทพ · undead = อันเดด · beast = กึ่งมนุษย์ · human = มนุษย์
--   สกิลเผ่าทำงานในสนามรบฝั่งเกม (ไม่เปลี่ยนพลังทีมของเซิร์ฟเวอร์)
-- =====================================================================
alter table public.players add column if not exists race text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_race_valid') then
    alter table public.players add constraint players_race_valid check (race is null or race in ('god','undead','beast','human'));
  end if; end $$;

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
      'push_in', greatest(0, ceil(public._c('push_sec') - extract(epoch from now() - p.push_at))::int),
      'mail_new', public._mail_new(u), 'race', p.race),
    'monsters', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sp', m.sp, 'lv', m.lv, 'stars', m.stars, 'el', m.el) order by m.id)
                          from public.monsters m where m.user_id = p.user_id), '[]'::jsonb))
  from public.players p where p.user_id = u
$$;

create or replace function public.set_race(r text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  if r not in ('god','undead','beast','human') then raise exception 'bad_race'; end if;
  if p.race is not null then raise exception 'race_locked'; end if;
  update public.players set race = r, updated_at = now() where user_id = u;
  return jsonb_build_object('race', r, 'state', public._state(u));
end $$;
revoke execute on function public.set_race(text) from public, anon;
grant execute on function public.set_race(text) to authenticated;
