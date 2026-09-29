-- =====================================================================
-- ตำนานป่าอัมพร : อันดับเผ่า (จำนวนสมาชิก + TOP 3 ของแต่ละเผ่า)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   จัดอันดับด้วยพลังทีม (สูตรเดียวกับ _power: pow × (1 + 0.1 × (lv-1)) ของตัวในทีม)
--   เสมอกัน -> ด่านสูงกว่าได้ก่อน · นับสมาชิกทุกคนที่เลือกเผ่าแล้ว · TOP 3 เฉพาะคนที่ตั้งชื่อแล้ว
--   คืนเฉพาะชื่อที่แสดงในเกม พลัง และด่าน (ไม่มีอีเมล/ไอดีบัญชี)
-- =====================================================================
create index if not exists players_race_idx on public.players (race) where race is not null;

create or replace function public.race_ranking() returns jsonb
language sql stable security definer set search_path = '' as $$
  with pw as (
    select p.user_id, p.race, p.name, p.named, p.stage,
           coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)))), 0)::int as power
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.race is not null
    group by p.user_id),
  rk as (
    select pw.*, row_number() over (partition by race order by power desc, stage desc, user_id) as n
    from pw where named)
  select jsonb_build_object(
    'races', (select jsonb_object_agg(r, jsonb_build_object(
                'members', (select count(*) from pw where pw.race = r),
                'top', coalesce((select jsonb_agg(jsonb_build_object('name', rk.name, 'power', rk.power, 'stage', rk.stage,
                                                                     'me', coalesce(rk.user_id = auth.uid(), false)) order by rk.n)
                                 from rk where rk.race = r and rk.n <= 3), '[]'::jsonb)))
              from unnest(array['god','undead','beast','human']) as r),
    'me', (select jsonb_build_object('race', rk.race, 'rank', rk.n, 'power', rk.power) from rk where rk.user_id = auth.uid()))
$$;
revoke execute on function public.race_ranking() from public, anon;
grant execute on function public.race_ranking() to authenticated;

select jsonb_pretty(public.race_ranking()) is not null as ok,
       (select count(*) from public.players where race is not null) as with_race;
