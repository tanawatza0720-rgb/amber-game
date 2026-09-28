-- =====================================================================
-- ตำนานป่าอัมพร : ระดับมอนสเตอร์ใหม่ 4 ขั้น  ทั่วไป(1) < หายาก(2) < ตำนาน(3) < เทพเจ้า(4)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ ไม่ลบข้อมูล)
-- =====================================================================
update public.species set rar = case sp
  when 'kazemaru' then 1   -- ทั่วไป
  when 'kazekiri' then 2   -- หายาก
  when 'kuroga'   then 3   -- ตำนาน
  when 'amateru'  then 4   -- เทพเจ้า
  else rar end;

-- ฟักไข่: สุ่มระดับก่อน แล้วสุ่มสายพันธุ์ในระดับนั้น (เพิ่มสายพันธุ์ใหม่ในตาราง species ได้เลย ไม่ต้องแก้ฟังก์ชัน)
--   ไข่ป่า   : ทั่วไป 82% · หายาก 13% · ตำนาน 4%  · เทพเจ้า 1%
--   ไข่ทองคำ : ทั่วไป 45% · หายาก 33% · ตำนาน 16% · เทพเจ้า 6%  (ครบ 30 ใบยังไม่ได้เทพเจ้า การันตีเทพเจ้า)
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
    w := array[0.82, 0.13, 0.04, 0.01];
  else
    if p.amber < public._c('gold_cost') then raise exception 'not_enough_amber'; end if;
    update public.players set amber = amber - public._c('gold_cost'), pity = pity + 1 where user_id = u;
    w := array[0.45, 0.33, 0.16, 0.06];
  end if;
  if kind = 'gold' and p.pity + 1 >= public._c('pity_max') then t := 4;
  elsif r < w[4] then t := 4;
  elsif r < w[4] + w[3] then t := 3;
  elsif r < w[4] + w[3] + w[2] then t := 2;
  else t := 1; end if;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then v_sp := 'kazemaru'; t := 1; end if;
  if kind = 'gold' and t = 4 then update public.players set pity = 0 where user_id = u; end if;
  insert into public.monsters (user_id, sp, lv) values (u, v_sp, 1) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  perform public._qadd(u, 'hatch');
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1),
                            'rar', (select rar from public.species where species.sp = v_sp),
                            'state', public._state(u));
end $$;
revoke execute on function public.hatch_egg(text) from public, anon;
grant execute on function public.hatch_egg(text) to authenticated;
