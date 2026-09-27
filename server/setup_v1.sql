-- ตำนานป่าอัมพร : ตารางเก็บเซฟผู้เล่น
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งหมดนี้ > กด Run

create table if not exists public.player_saves (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ผู้เล่น' check (char_length(display_name) <= 40),
  best_wave    int  not null default 0 check (best_wave between 0 and 1000),
  last_wave    int  not null default 1 check (last_wave between 1 and 1000),
  updated_at   timestamptz not null default now()
);

-- เปิดระบบความปลอดภัยระดับแถว: ผู้เล่นแก้ได้เฉพาะเซฟของตัวเอง
alter table public.player_saves enable row level security;

-- ทุกคนอ่านได้ (ใช้แสดงตารางอันดับ มีแค่ชื่อและด่าน ไม่มีอีเมล)
drop policy if exists "read leaderboard" on public.player_saves;
create policy "read leaderboard" on public.player_saves
  for select using (true);

-- สร้างเซฟได้เฉพาะของตัวเอง
drop policy if exists "insert own save" on public.player_saves;
create policy "insert own save" on public.player_saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- แก้เซฟได้เฉพาะของตัวเอง
drop policy if exists "update own save" on public.player_saves;
create policy "update own save" on public.player_saves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- สิทธิ์การเข้าถึงตาราง
grant select on public.player_saves to anon, authenticated;
grant insert, update on public.player_saves to authenticated;

create index if not exists player_saves_best_idx on public.player_saves (best_wave desc);
