-- =====================================================================
-- ตำนานป่าอัมพร : ปิดช่องโหว่ 2 ข้อ
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้)
--   1) ด่านบอส: เซิร์ฟเวอร์ไม่เชื่อ "ชนะ" จากเครื่องผู้เล่นอย่างเดียวแล้ว
--      ต้องมีพลังทีม ≥ 70% ของพลังที่ด่านต้องการ (เผื่อฝีมือผู้เล่นไว้ 30%) ถึงจะนับว่าชนะ
--   2) ตาราง player_saves (ระบบเซฟเวอร์ชันแรก ไม่ได้ใช้แล้ว): ปิดไม่ให้ใครอ่าน/เขียนจากหน้าเว็บ (ข้อมูลยังอยู่ ไม่ลบ)
-- =====================================================================
create or replace function public.boss_finish(battle_id uuid, won boolean)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare u uuid := public._uid(); p public.players; b public.battles; tgt int; ok boolean; c int := 0; a int := 0; pw int; need int; weak boolean := false;
begin
  p := public._player(u);
  select * into b from public.battles where id = battle_id and user_id = u for update;
  if not found then raise exception 'no_battle'; end if;
  if b.finished_at is not null then raise exception 'already_finished'; end if;
  if now() - b.started_at < interval '15 seconds' then raise exception 'too_fast'; end if;
  if now() - b.started_at > interval '2 hours' then raise exception 'expired'; end if;
  tgt := p.stage + 1;
  pw := public._power(u); need := public._req(tgt);
  ok := coalesce(boss_finish.won, false) and b.stage = 'B' || tgt;
  -- กันโกง: ทีมต้องแข็งพอในระดับหนึ่ง ไม่อย่างนั้นถือว่าแพ้
  if ok and pw < need * 0.7 then ok := false; weak := true; end if;
  update public.battles set finished_at = now(), won = ok where id = b.id;
  if ok then
    c := 200 * (tgt / 10); a := public._c('boss_amber');
    update public.players set stage = tgt, coins = coins + c, amber = amber + a, push_at = now(), updated_at = now() where user_id = u;
    perform public._qadd(u, 'battle');
  end if;
  return jsonb_build_object('won', ok, 'weak', weak, 'power', pw, 'need', need, 'min_power', ceil(need * 0.7)::int,
    'stage', tgt, 'coins', c, 'amber', a, 'state', public._state(u));
end $function$;

do $$ begin
  if to_regclass('public.player_saves') is not null then
    drop policy if exists "read leaderboard" on public.player_saves;
    drop policy if exists "insert own save" on public.player_saves;
    drop policy if exists "update own save" on public.player_saves;
    revoke all on public.player_saves from anon, authenticated;
  end if;
end $$;
