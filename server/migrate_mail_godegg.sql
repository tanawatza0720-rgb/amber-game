-- =====================================================================
-- ตำนานป่าอัมพร : จดหมายแจกไข่เทพได้ + จดหมายขออภัยเรื่องระบบส่งสำรวจ (3 ต.ค. 2026)
--   1) ตาราง mail เพิ่มช่อง god_eggs (จำนวนไข่เทพที่แนบ) · mail_list / claim_mail รองรับ
--   2) ส่งจดหมายถึงผู้เล่นทุกคน: อัมพร 300 + ไข่เทพ 1 ใบ (กดรับได้คนละ 1 ครั้ง ภายใน 14 วัน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ จดหมายไม่ซ้ำเพราะมี code)
--   ส่งจดหมายแจกไข่เทพครั้งต่อไป: insert into public.mail (code, title, body, amber, coins, god_eggs, expires_at) values (...)
-- =====================================================================
alter table public.mail add column if not exists god_eggs int not null default 0 check (god_eggs >= 0);

create or replace function public.mail_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid();
begin
  perform public._player(u);
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'body', m.body, 'amber', m.amber, 'coins', m.coins, 'god_eggs', m.god_eggs,
            'expires_at', m.expires_at, 'claimed', c.mail_id is not null) order by m.id desc)
    from public.mail m left join public.mail_claims c on c.mail_id = m.id and c.user_id = u
    where now() between m.starts_at and m.expires_at and (m.user_id is null or m.user_id = u)), '[]'::jsonb);
end $$;

create or replace function public.claim_mail(mail_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := public._uid(); m public.mail;
begin
  perform public._player(u);
  select * into m from public.mail x where x.id = claim_mail.mail_id and now() between x.starts_at and x.expires_at
    and (x.user_id is null or x.user_id = u);
  if not found then raise exception 'no_mail'; end if;
  insert into public.mail_claims (user_id, mail_id) values (u, m.id) on conflict do nothing;
  if not found then raise exception 'already_claimed'; end if;
  update public.players set amber = amber + m.amber, coins = coins + m.coins, god_eggs = god_eggs + m.god_eggs, updated_at = now() where user_id = u;
  return jsonb_build_object('amber', m.amber, 'coins', m.coins, 'god_eggs', m.god_eggs, 'state', public._state(u));
end $$;

revoke execute on function public.mail_list(), public.claim_mail(bigint) from public, anon;
grant execute on function public.mail_list(), public.claim_mail(bigint) to authenticated;

-- จดหมายขออภัย (ถึงผู้เล่นทุกคน)
insert into public.mail (code, title, body, amber, coins, god_eggs, expires_at) values
  ('sorry_expedition_20261003', 'ขออภัยเรื่องระบบส่งสำรวจ 🙏',
   'เรียนนักผจญภัยทุกท่าน ทีมงานขออภัยที่ระบบส่งสำรวจมีข้อผิดพลาด ทั้งเรื่องโอกาสสำเร็จและโอกาสที่มอนสเตอร์จะไม่กลับมา ตอนนี้แก้ไขและปรับรางวัลใหม่เรียบร้อยแล้ว ขอมอบอัมพร 300 และไข่เทพ 1 ใบเป็นการชดเชย ขอบคุณที่ร่วมผจญภัยไปด้วยกันครับ — ทีมงานตำนานป่าอัมพร',
   300, 0, 1, now() + interval '14 days')
on conflict (code) do nothing;

select id, code, title, amber, god_eggs, expires_at from public.mail where code = 'sorry_expedition_20261003';
