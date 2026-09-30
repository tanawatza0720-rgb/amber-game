-- =====================================================================
-- ตำนานป่าอัมพร : ยกเลิกจดหมายของขวัญ 300 + 3000 อัมพร (ให้ทุกคนเริ่มที่อัมพร 600 เท่ากัน)
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > Run  (รันซ้ำได้ — ทำงานเฉพาะครั้งแรกที่จดหมายยังไม่หมดอายุ)
--   1) หักอัมพรคืนจากผู้เล่นที่กดรับจดหมาย 2 ฉบับนี้หลังรีเซ็ต (ไม่ต่ำกว่า 0)
--   2) ตั้งจดหมาย 2 ฉบับนี้ให้หมดอายุทันที (ไม่ลบ)
-- =====================================================================
do $$ begin
  if exists (select 1 from public.mail where code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09') and expires_at > now()) then
    update public.players p set amber = greatest(0, p.amber - x.amt), updated_at = now()
      from (select c.user_id, sum(m.amber) amt from public.mail_claims c join public.mail m on m.id = c.mail_id
            where m.code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09') group by c.user_id) x
      where p.user_id = x.user_id;
    update public.mail set expires_at = now() where code in ('gift_300_amber_2026_09','gift_3000_amber_2026_09');
  end if;
end $$;
