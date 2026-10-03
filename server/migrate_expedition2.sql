-- =====================================================================
-- ตำนานป่าอัมพร : ส่งสำรวจ v2 (3 ต.ค. 2026) — โอกาสสำเร็จ + โอกาสตายไล่ตามระดับ
--   1) โอกาสสำเร็จของทั้งทีม ขึ้นกับ พลังทีมสำรวจ เทียบกับ พลังแนะนำของพื้นที่ (พื้นที่ยิ่งสูง ยิ่งต้องใช้พลังมาก)
--        สำเร็จ = 70% × (พลังทีม / พลังแนะนำ)^1.5   จำกัด 5–95%
--        สำเร็จ  → ได้เหรียญ/อัมพร ตัวที่รอดได้เลเวล
--        ล้มเหลว → ไม่ได้เหรียญ/อัมพร/เลเวล และโอกาสตายของทุกตัว ×1.5 (ยังได้วิญญาณจากตัวที่ตาย)
--   2) โอกาสตายรายตัว = ค่าพื้นที่ (die) × ตัวคูณระดับ × ตัวคูณพลังทีม × ตัวคูณพลังตัวเอง
--        ค่าพื้นที่ (ตัวทั่วไป พลังพอดี สำรวจสำเร็จ): 30% / 50% / 70% / 85%
--        ตัวคูณระดับ: ทั่วไป 1 · หายาก 0.55 · ตำนาน 0.30 · เทพเจ้า 0.12
--        เพดาน: ทั่วไป 90% · หายาก 70% · ตำนาน 50% · เทพเจ้า 25%   ·   ขั้นต่ำ: 8% / 4% / 2% / 1%
--        ตัวคูณพลังทีม = พลังแนะนำ / พลังทีม (จำกัด 0.35–1.6) · ตัวคูณพลังตัวเอง = (พลังเฉลี่ย / พลังตัวนั้น)^0.3 (จำกัด 0.7–1.5)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้) · ต้องรัน migrate_expedition.sql มาก่อนแล้ว
--   ทีมที่ออกสำรวจอยู่ตอนรัน จะใช้กติกาใหม่ตอนกดรับผล
-- =====================================================================

-- risk = ค่าเดิม (หน้าเกมรุ่นเก่ายังอ่านอยู่) · die = โอกาสตายของตัวทั่วไปเมื่อพลังพอดีและสำรวจสำเร็จ
create or replace function public._exp_zones() returns jsonb language sql immutable as $$
  select '[
    {"id":"meadow","name":"ทุ่งหญ้าชายป่า","rec":1200,"min":30,"risk":0.04,"die":0.30,"coins":600,"amber":5,"lv":1},
    {"id":"crystal","name":"ถ้ำคริสตัลเรืองแสง","rec":4000,"min":120,"risk":0.07,"die":0.50,"coins":2200,"amber":15,"lv":2},
    {"id":"ashen","name":"หุบเขาเถ้าถ่าน","rec":10000,"min":240,"risk":0.10,"die":0.70,"coins":5500,"amber":35,"lv":3},
    {"id":"skyruin","name":"ซากวิหารลอยฟ้า","rec":25000,"min":480,"risk":0.14,"die":0.85,"coins":12000,"amber":80,"lv":4}
  ]'::jsonb $$;

-- ค่ากติกา (ส่งให้หน้าเกมใช้คำนวณตัวเลขที่แสดง ให้ตรงกับเซิร์ฟเวอร์)
create or replace function public._exp_rule() returns jsonb language sql immutable as $$
  select '{"v":2, "win_k":0.7, "win_pow":1.5, "win_min":0.05, "win_max":0.95, "fail_k":1.5,
           "team_min":0.35, "team_max":1.6, "self_pow":0.3, "self_min":0.7, "self_max":1.5,
           "tier":{"1":1.0,"2":0.55,"3":0.30,"4":0.12},
           "cap":{"1":0.90,"2":0.70,"3":0.50,"4":0.25},
           "floor":{"1":0.08,"2":0.04,"3":0.02,"4":0.01}}'::jsonb $$;

-- โอกาสสำเร็จของทั้งทีม
create or replace function public._exp_win(z jsonb, party int) returns float8 language sql immutable as $$
  select least((r->>'win_max')::float8, greatest((r->>'win_min')::float8,
    (r->>'win_k')::float8 * power(greatest(party, 1)::float8 / (z->>'rec')::float8, (r->>'win_pow')::float8)))
  from (select public._exp_rule() r) q $$;

-- โอกาสตายของ 1 ตัว (rar = ระดับ 1–4 · failed = การสำรวจล้มเหลว)
create or replace function public._exp_die(z jsonb, party int, one int, avg_pow float8, rar int, failed boolean) returns float8 language sql immutable as $$
  select least((r->'cap'->>t)::float8, greatest((r->'floor'->>t)::float8,
    (z->>'die')::float8 * (r->'tier'->>t)::float8
    * least((r->>'team_max')::float8, greatest((r->>'team_min')::float8, (z->>'rec')::float8 / greatest(party, 1)))
    * least((r->>'self_max')::float8, greatest((r->>'self_min')::float8, power(avg_pow / greatest(one, 1), (r->>'self_pow')::float8)))
    * case when failed then (r->>'fail_k')::float8 else 1 end))
  from (select public._exp_rule() r, least(4, greatest(1, coalesce(rar, 1)))::text t) q $$;

create or replace function public.exp_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1;
  return jsonb_build_object('zones', public._exp_zones(), 'rule', public._exp_rule(), 'souls', p.souls,
    'mpow', coalesce((select jsonb_object_agg(m.id::text, public._mon_pow(m.sp, m.lv, m.stars)) from public.monsters m where m.user_id = u), '{}'::jsonb), 'soul_rate', jsonb_build_object('souls', 10, 'amber', 25),
    'active', case when e.id is null then null else jsonb_build_object('id', e.id, 'zone', e.zone, 'mons', e.mons, 'power', e.power,
      'win', round(public._exp_win(public._exp_zone(e.zone), e.power)::numeric, 3),
      'started_at', e.started_at, 'ends_at', e.ends_at, 'left', greatest(0, ceil(extract(epoch from e.ends_at - now())))::int) end);
end $$;

-- รับผลการสำรวจ (สุ่มผลที่เซิร์ฟเวอร์ครั้งเดียว): สุ่มสำเร็จ/ล้มเหลวก่อน แล้วสุ่มการรอดรายตัว
create or replace function public.exp_claim() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; e public.expeditions; z jsonb; m jsonb; n int; avg_pow float8; risk float8; win_p float8; ok boolean; rr int;
  alive jsonb := '[]'::jsonb; dead jsonb := '[]'::jsonb; nlv int; mx int; v_souls int := 0; s int; v_coins int := 0; v_amber int := 0; k float8; res jsonb;
begin
  p := public._player(u);
  select * into e from public.expeditions where user_id = u and not done order by id desc limit 1 for update;
  if e.id is null then raise exception 'no_exp'; end if;
  if now() < e.ends_at then raise exception 'exp_not_done'; end if;
  z := public._exp_zone(e.zone); n := jsonb_array_length(e.mons); avg_pow := e.power::float8 / greatest(n, 1);
  win_p := public._exp_win(z, e.power); ok := random() < win_p;
  for m in select * from jsonb_array_elements(e.mons) loop
    select sp.rar, sp.max_lv into rr, mx from public.species sp where sp.sp = m->>'sp';
    risk := public._exp_die(z, e.power, (m->>'pow')::int, avg_pow, rr, not ok);
    if random() < risk then
      s := 2 * coalesce(rr, 1) + 3 * coalesce((m->>'stars')::int, 0) + (m->>'lv')::int / 5;
      v_souls := v_souls + s; dead := dead || jsonb_build_array(m || jsonb_build_object('souls', s, 'risk', round(risk::numeric, 3)));
    else
      nlv := case when ok then least(coalesce(mx, 100), (m->>'lv')::int + (z->>'lv')::int) else (m->>'lv')::int end;
      insert into public.monsters (user_id, sp, lv, el, stars) values (u, m->>'sp', nlv, m->>'el', coalesce((m->>'stars')::int, 0));
      alive := alive || jsonb_build_array(m || jsonb_build_object('lv_new', nlv, 'risk', round(risk::numeric, 3)));
    end if;
  end loop;
  if ok then
    k := 0.5 + 0.5 * jsonb_array_length(alive)::float8 / greatest(n, 1);
    v_coins := round((z->>'coins')::int * k * (0.5 + 0.5 * least(1.0, n / 6.0)));
    v_amber := round((z->>'amber')::int * k * (0.5 + 0.5 * least(1.0, n / 6.0)));
  end if;
  update public.players set coins = coins + v_coins, amber = amber + v_amber, souls = souls + v_souls, updated_at = now() where user_id = u;
  res := jsonb_build_object('zone', e.zone, 'ok', ok, 'win', round(win_p::numeric, 3), 'alive', alive, 'dead', dead, 'coins', v_coins, 'amber', v_amber, 'souls', v_souls);
  update public.expeditions set done = true, result = res where id = e.id;
  return jsonb_build_object('result', res, 'exp', public.exp_state(), 'state', public._state(u));
end $$;

revoke execute on function public._exp_zones(), public._exp_rule(), public._exp_win(jsonb, int), public._exp_die(jsonb, int, int, float8, int, boolean)
  from public, anon, authenticated;
revoke execute on function public.exp_state(), public.exp_claim() from public, anon;
grant execute on function public.exp_state(), public.exp_claim() to authenticated;

-- ตารางตรวจ: โอกาสตายเมื่อพลังทีมพอดีกับที่แนะนำ เรียง ทั่วไป · หายาก · ตำนาน · เทพเจ้า (ตัวเลขคู่ = สำเร็จ/ล้มเหลว)
select z->>'name' as "พื้นที่", round(100 * public._exp_win(z, (z->>'rec')::int)) || '%' as "สำเร็จ (พลังพอดี)",
  (select string_agg(round(100 * public._exp_die(z, (z->>'rec')::int, 100, 100, t, false)) || '/' || round(100 * public._exp_die(z, (z->>'rec')::int, 100, 100, t, true)), '  ·  ' order by t)
     from generate_series(1, 4) t) as "ตาย% ตามระดับ 1-4"
from jsonb_array_elements(public._exp_zones()) z;
