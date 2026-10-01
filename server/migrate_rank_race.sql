-- =====================================================================
-- ตำนานป่าอัมพร : อันดับเผ่าเน้นพลังรวมของเผ่า (แทนการเทียบพลังรายคน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   race_ranking() เพิ่มต่อเผ่า: power (พลังรวมสมาชิกทุกคน) · place (ลำดับเผ่า 1–4 ตามพลังรวม)
--   me เพิ่ม: share (สัดส่วนพลังของเราในเผ่า 0–1) · ข้อมูลเดิมยังส่งครบ (หน้าเว็บเก่าไม่พัง)
-- =====================================================================
create or replace function public.race_ranking() returns jsonb
language sql stable security definer set search_path = '' as $$
  with pw as (
    select p.user_id, p.race, p.name, p.named, p.stage,
           coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0)))), 0)::int as power
    from public.players p
    left join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
    left join public.species s on s.sp = m.sp
    where p.race is not null
    group by p.user_id),
  rk as (
    select pw.*, row_number() over (partition by race order by power desc, stage desc, user_id) as n
    from pw where named),
  tot as (
    select r, coalesce((select sum(pw.power) from pw where pw.race = r), 0)::bigint as power
    from unnest(array['god','undead','beast','human']) as r),
  pl as (select r, power, row_number() over (order by power desc, r) as place from tot)
  select jsonb_build_object(
    'races', (select jsonb_object_agg(pl.r, jsonb_build_object(
                'members', (select count(*) from pw where pw.race = pl.r),
                'power', pl.power, 'place', pl.place,
                'top', coalesce((select jsonb_agg(jsonb_build_object('name', rk.name, 'power', rk.power, 'stage', rk.stage,
                                                                     'me', coalesce(rk.user_id = auth.uid(), false)) order by rk.n)
                                 from rk where rk.race = pl.r and rk.n <= 3), '[]'::jsonb)))
              from pl),
    'me', (select jsonb_build_object('race', pw.race, 'rank', (select rk.n from rk where rk.user_id = pw.user_id), 'power', pw.power,
                    'share', case when t.power > 0 then round(pw.power::numeric / t.power, 4) else 0 end)
           from pw join tot t on t.r = pw.race where pw.user_id = auth.uid()))
$$;
revoke execute on function public.race_ranking() from public, anon;
grant execute on function public.race_ranking() to authenticated;
