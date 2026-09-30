-- =====================================================================
-- ตำนานป่าอัมพร : ฟักไข่ทีละ 10 ใบ + อัมพรเริ่มต้น 600
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ — ส่วนเติมอัมพรจะไม่เติมซ้ำ)
--   hatch_eggs(kind, n): n = 1 หรือ 10 · เช็กเงินและช่องเก็บครบก่อน แล้วฟักทีละใบด้วย hatch_egg เดิม (เรทและการันตีเหมือนเดิม)
--   ผู้เล่นใหม่เริ่มต้นด้วยอัมพร 600 · ผู้เล่นที่สมัครหลังรีเซ็ต 30 ก.ย. 2026 ได้เติมให้ครบ 600
-- =====================================================================
alter table public.players alter column amber set default 600;
alter table public.players add column if not exists amber600 boolean not null default false;
-- ผู้เล่นที่สร้างหลังรีเซ็ตแต่ก่อนแก้ค่าเริ่มต้น ได้อัมพรเพิ่ม 550 ครั้งเดียว (ทำเครื่องหมายไว้ ไม่เติมซ้ำ)
update public.players set amber = amber + 550, amber600 = true where created_at >= '2026-09-30 00:00+07' and not amber600;
update public.players set amber600 = true where not amber600;
alter table public.players alter column amber600 set default true;

create or replace function public.hatch_eggs(kind text, n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r jsonb; list jsonb := '[]'::jsonb; i int; cost int;
begin
  p := public._player(u);
  if kind not in ('wild', 'gold') then raise exception 'bad_egg'; end if;
  if n not in (1, 10) then raise exception 'bad_count'; end if;
  if (select count(*) from public.monsters where user_id = u) + n > public._c('slots') then raise exception 'box_full'; end if;
  cost := n * public._c(case kind when 'wild' then 'wild_cost' else 'gold_cost' end)::int;
  if kind = 'wild' and p.coins < cost then raise exception 'not_enough_coins'; end if;
  if kind = 'gold' and p.amber < cost then raise exception 'not_enough_amber'; end if;
  for i in 1..n loop
    r := public.hatch_egg(kind);
    list := list || jsonb_build_array(jsonb_build_object('mon', r->'mon', 'rar', r->'rar'));
  end loop;
  return jsonb_build_object('list', list, 'state', public._state(u));
end $$;
revoke execute on function public.hatch_eggs(text, int) from public, anon;
grant execute on function public.hatch_eggs(text, int) to authenticated;
