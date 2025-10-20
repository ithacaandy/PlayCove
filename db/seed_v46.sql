
-- PlayCove v4.6 seed data
-- Run in Supabase SQL editor. Make sure your schema and RLS are already in place.

-- Optional: avatars bucket
select storage.create_bucket('avatars') on conflict do nothing;
update storage.buckets set public = true where name = 'avatars';

create policy if not exists "auth users can upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy if not exists "public can read avatars"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

-- Create groups
insert into public.groups (name, description, owner_id, is_discoverable)
values
('Caroline Park Parents', 'Meetups for preschoolers and parents near Caroline.', '3aa8fc3a-b01a-4735-9f83-665589fce373', true),
('Downtown Play & Coffee Crew', 'Grab coffee while kids play at Ithaca Commons.', '3aa8fc3a-b01a-4735-9f83-665589fce373', true),
('Sunday Adventure Club', 'Weekend family hikes, crafts, and fun.', '3aa8fc3a-b01a-4735-9f83-665589fce373', true)
on conflict do nothing
returning id;

-- Make you a member/owner of your groups
insert into public.group_members (group_id, user_id, role, status)
select id, '3aa8fc3a-b01a-4735-9f83-665589fce373', 'owner', 'active' from public.groups g
where g.owner_id = '3aa8fc3a-b01a-4735-9f83-665589fce373'
on conflict do nothing;

-- Sample events (adjust columns if your schema differs)
with g as (
  select id, name from public.groups where owner_id = '3aa8fc3a-b01a-4735-9f83-665589fce373' order by created_at asc
)
insert into public.events
(group_id, title, details, date, start_time, end_time, venue, city, map_url, capacity, age_min, age_max, contact, is_hidden)
values
((select id from g limit 1), 'Play at Stewart Park', 'Bring sand toys and snacks.', current_date + interval '3 day', '10:00', '12:00', 'Stewart Park', 'Ithaca, NY', 'https://maps.google.com/?q=Stewart+Park+Ithaca', 10, 2, 6, 'parent@example.com', false),
((select id from g offset 1 limit 1), 'Coffee & Play Downtown', 'Meet at Gimme Coffee; commons play area after.', current_date + interval '5 day', '09:00', '11:00', 'Gimme Coffee', 'Ithaca, NY', 'https://maps.google.com/?q=Gimme+Coffee+Ithaca', 8, 3, 8, 'parent@example.com', false),
((select id from g offset 2 limit 1), 'Fall Trail Walk', 'Stroller-friendly, bring water.', current_date + interval '7 day', '13:00', '15:00', 'Buttermilk Falls SP', 'Ithaca, NY', 'https://maps.google.com/?q=Buttermilk+Falls+Ithaca', 12, 3, 10, 'parent@example.com', false)
on conflict do nothing;
