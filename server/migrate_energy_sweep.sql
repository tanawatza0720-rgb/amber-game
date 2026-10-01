-- =====================================================================
-- ตำนานป่าอัมพร : กวาดด่านด้วยพลังงาน ⚡ (ให้พลังงานมีประโยชน์)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   sweep_claim(n): ใช้ 10 ⚡ ต่อครั้ง (n = 1–6 ครั้งในการกดเดียว) ได้รางวัลเท่ากับดันด่าน idle 30 นาทีต่อครั้ง
--   อัตราเดียวกับ idle_claim: เหรียญ = วินาที × _rate_c(ด่าน) / 60 · EXP = วินาที × idle_xp / 60
--   10 ⚡ = รางวัล 30 นาที (อัตรา 1:3 ตามที่เจ้าของกำหนด) · พลังงานฟื้น 1 ⚡ ทุก 3 นาที · ไม่แตะรางวัล idle ที่สะสมอยู่
-- =====================================================================
create or replace function public._sweep_c(k text) returns int language sql immutable as $$
  select case k when 'cost' then 10 when 'sec' then 1800 when 'max_n' then 6 end $$;

create or replace function public.sweep_claim(n int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; cost int; sec int; c int; x int;
begin
  if n is null or n < 1 or n > public._sweep_c('max_n') then raise exception 'bad_count'; end if;
  p := public._player(u);
  cost := n * public._sweep_c('cost');
  if p.energy < cost then raise exception 'not_enough_energy'; end if;
  sec := n * public._sweep_c('sec');
  c := (sec * public._rate_c(p.stage)) / 60;
  x := (sec * public._c('idle_xp')) / 60;
  update public.players set energy = energy - cost,
    energy_at = case when energy >= public._c('energy_max') then now() else energy_at end,
    coins = coins + c, xp = xp + x, updated_at = now() where user_id = u;
  update public.players set lv = lv + xp / 100, xp = xp % 100 where user_id = u and xp >= 100;
  return jsonb_build_object('n', n, 'coins', c, 'xp', x, 'sec', sec, 'energy_used', cost, 'state', public._state(u));
end $$;
revoke execute on function public.sweep_claim(int) from public, anon;
grant execute on function public.sweep_claim(int) to authenticated;
