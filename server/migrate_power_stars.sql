-- =====================================================================
-- ตำนานป่าอัมพร : ดาวเพิ่มพลังรบ + ชื่อยาวไม่เกิน 12 ตัวอักษร
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   พลังรบของตัวละคร = pow × (1 + 0.1 × (lv-1)) × (1 + 0.05 × ดาว)   (6 ดาว = +30%)
--   ค่าสถานะในสนามรบไม่เปลี่ยน (ดาวไปเพิ่มเลเวลสกิล) แต่พลังรบ/ดันด่าน/อันดับเผ่า นับดาวด้วย
--   ตั้งชื่อใหม่ได้ 1–12 ตัวอักษร (ชื่อเดิมที่ยาวกว่านี้ยังอยู่ได้ จนกว่าจะเปลี่ยนชื่อ)
-- =====================================================================
create or replace function public._power(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(round(sum(s.pow * (1 + 0.1 * (m.lv - 1)) * (1 + 0.05 * coalesce(m.stars, 0)))), 0)::int
  from public.players p
  join public.monsters m on m.user_id = p.user_id and m.id = any(p.team)
  join public.species s on s.sp = m.sp
  where p.user_id = u $$;

create or replace function public.set_name(new_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); n text := btrim(coalesce(new_name,''));
begin
  if char_length(n) < 1 or char_length(n) > 12 then raise exception 'bad_name'; end if;
  perform public._player(u);
  update public.players set name = n, named = true, updated_at = now() where user_id = u;
  return jsonb_build_object('state', public._state(u));
end $$;
revoke execute on function public.set_name(text) from public, anon;
grant execute on function public.set_name(text) to authenticated;

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

select (select prosrc like '%0.05%' from pg_proc where proname = '_power') as power_ok,
       (select prosrc like '%> 12%' from pg_proc where proname = 'set_name') as name_ok,
       (select prosrc like '%0.05%' from pg_proc where proname = 'race_ranking') as rank_ok;
