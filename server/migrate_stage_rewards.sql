-- =====================================================================
-- ตำนานป่าอัมพร : รางวัลทุก 5 ด่าน (อัมพร + ไข่เทพ)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   ผ่านด่าน 5, 10, 15, ... รับได้ครั้งละ: อัมพร 30 + 10 × (บท − 1) (ด่านบอส x-10 ได้ ×2) + ไข่เทพ 1 ใบ
--   ไข่เทพ: เทพเจ้า 0.8% · ตำนาน 15% · หายาก 84.2% (ไม่มีระดับทั่วไป) · ด่าน 50, 100, 150, ... ได้ "ไข่เทพการันตี" (ได้ตัวเทพแน่นอน)
--   ผู้เล่นที่ผ่านด่านไปก่อนแล้ว รับย้อนหลังได้ทุกขั้น
-- =====================================================================
alter table public.players add column if not exists god_eggs int not null default 0;
alter table public.players add column if not exists god_eggs_sure int not null default 0;
create table if not exists public.stage_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  n       int  not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, n)
);
alter table public.stage_claims enable row level security;

create or replace function public._stage_reward(n int) returns jsonb language sql immutable as $$
  select jsonb_build_object('n', n, 'amber', (30 + 10 * (ceil(n / 10.0)::int - 1)) * case when n % 10 = 0 then 2 else 1 end,
    'egg', 1, 'sure', n % 50 = 0, 'boss', n % 10 = 0) $$;

create or replace function public.stage_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players;
begin
  p := public._player(u);
  return jsonb_build_object('stage', p.stage, 'god_eggs', p.god_eggs, 'god_eggs_sure', p.god_eggs_sure,
    'pending', coalesce((select jsonb_agg(public._stage_reward(g) order by g) from generate_series(5, p.stage, 5) g
                         where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = g)), '[]'::jsonb),
    'next', public._stage_reward(((p.stage / 5) + 1) * 5),
    'rates', jsonb_build_object('4', 0.008, '3', 0.15, '2', 0.842));
end $$;

-- รับรางวัลขั้นที่ค้างทั้งหมด
create or replace function public.claim_stage_rewards() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; g int; r jsonb; a int := 0; e int := 0; s int := 0; list jsonb := '[]'::jsonb;
begin
  p := public._player(u);
  for g in select x from generate_series(5, p.stage, 5) x
           where not exists (select 1 from public.stage_claims c where c.user_id = u and c.n = x) loop
    r := public._stage_reward(g);
    insert into public.stage_claims (user_id, n) values (u, g) on conflict do nothing;
    if found then
      a := a + (r->>'amber')::int;
      if (r->>'sure')::boolean then s := s + 1; else e := e + 1; end if;
      list := list || jsonb_build_array(r);
    end if;
  end loop;
  if jsonb_array_length(list) = 0 then raise exception 'no_stage_reward'; end if;
  update public.players set amber = amber + a, god_eggs = god_eggs + e, god_eggs_sure = god_eggs_sure + s, updated_at = now() where user_id = u;
  return jsonb_build_object('claimed', list, 'amber', a, 'eggs', e, 'sure', s, 'stage', public.stage_state(), 'state', public._state(u));
end $$;

-- ฟักไข่เทพ (ใช้ไข่การันตีก่อนถ้ามี)
create or replace function public.hatch_god_egg() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); p public.players; r float8 := random(); t int; v_sp text; v_el text; mid bigint; sure boolean;
begin
  p := public._player(u);
  if p.god_eggs + p.god_eggs_sure < 1 then raise exception 'no_god_egg'; end if;
  if (select count(*) from public.monsters where user_id = u) >= public._c('slots') then raise exception 'box_full'; end if;
  sure := p.god_eggs_sure > 0;
  if sure then update public.players set god_eggs_sure = god_eggs_sure - 1 where user_id = u; t := 4;
  else
    update public.players set god_eggs = god_eggs - 1 where user_id = u;
    t := case when r < 0.008 then 4 when r < 0.158 then 3 else 2 end;
  end if;
  select s.sp into v_sp from public.species s where s.rar = t order by random() limit 1;
  if v_sp is null then select s.sp into v_sp from public.species s where s.rar <= t order by s.rar desc, random() limit 1; end if;
  select e.el into v_el from public.el_rates e where e.w > 0 order by -ln(1 - random()) / e.w limit 1;
  insert into public.monsters (user_id, sp, lv, el) values (u, v_sp, 1, v_el) returning id into mid;
  update public.players set hatch_count = hatch_count + 1, updated_at = now() where user_id = u;
  return jsonb_build_object('mon', jsonb_build_object('id', mid, 'sp', v_sp, 'lv', 1, 'el', v_el), 'sure', sure,
    'rar', (select rar from public.species where species.sp = v_sp), 'stage', public.stage_state(), 'state', public._state(u));
end $$;

revoke execute on function public._stage_reward(int) from public, anon, authenticated;
revoke execute on function public.stage_state(), public.claim_stage_rewards(), public.hatch_god_egg() from public, anon;
grant execute on function public.stage_state(), public.claim_stage_rewards(), public.hatch_god_egg() to authenticated;
