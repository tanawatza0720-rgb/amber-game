-- =====================================================================
-- ตำนานป่าอัมพร : ปรับสมดุลค่าพลังตามระดับ + เรทไข่ใหม่
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
--   พลังพื้นฐาน (hp + atk*4 + def*3 + spd*2):
--   ทั่วไป ~220 · หายาก ~355-365 · ตำนาน ~470-480 · เทพเจ้า ~620
-- =====================================================================
update public.species set pow = case sp
  when 'kazemaru' then 220 when 'kazekiri' then 361 when 'yorugumo' then 354 when 'morihime' then 365
  when 'kuroga' then 470 when 'hakuneko' then 478 when 'amateru' then 623 else pow end;
update public.species set max_lv = 40 where sp = 'morihime';   -- ระดับหายากเลเวลสูงสุด 40 เท่ากันทุกตัว

-- ฟักไข่: สุ่มระดับก่อน แล้วสุ่มสายพันธุ์ในระดับนั้น
--   ไข่ป่า   : ทั่วไป 83% · หายาก 15%   · ตำนาน 2%     · เทพเจ้า 0%
--   ไข่ทองคำ : ทั่วไป 57.5% · หายาก 32% · ตำนาน 10%    · เทพเจ้า 0.5%
--   การันตี : ไข่ทองคำครบ 30 ใบที่ยังไม่ได้ระดับตำนานขึ้นไป ใบนั้นได้ตำนานแน่นอน
create or replace function public.hatch_egg(kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); v_sp text; mid bigint; t int; w float8[];
begin
  p := public._player(u);
  if kind not in ('wild','gold') then raise exception 'bad_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
  if kind = 'wild' then
    if p.coins < public._c('wild_cost') then raise exception 'not_enough_coins'; end if;
    update public.players set coins = coins - public._c('wild_cost') where user_id = u;
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
  insert into public.monsters (user_id, sp, lv) values (u, v_sp, 1) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;
