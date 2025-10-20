-- PlayCove v4.9 seed script
-- Adds sample groups & events for a second test user.

do $$
declare
  new_user uuid := 'SECOND_USER_UUID_HERE';  -- replace with your new user's UUID
  main_user uuid := 'd032a1a2-e77c-4f4a-8e8d-bde586bee5a0'; -- Andy's main user UUID

  g1 uuid;
  g2 uuid;
  g3 uuid;
  e1 uuid;
  e2 uuid;
  e3 uuid;
  e4 uuid;
begin
  if not exists (select 1 from auth.users where id = new_user) then
    raise exception 'User % not found. Sign up first.', new_user;
  end if;

  insert into public.groups (name, description, owner_id, is_discoverable)
  values
    ('Cayuga Lake Littles', 'Waterfront meetups for toddlers & preschoolers.', new_user, true),
    ('South Hill Park Crew', 'Slides, scooters, and sandbox mornings.', new_user, true),
    ('Downtown Storytime Squad', 'Library storytime + playground afterwards.', new_user, true)
  returning id into g1, g2, g3;

  insert into public.group_members (group_id, user_id, role, status)
  values
    (g1, new_user, 'owner', 'active'),
    (g2, new_user, 'owner', 'active'),
    (g3, new_user, 'owner', 'active');

  insert into public.events
    (group_id, owner_id, title, description,
     date_iso, start_time, end_time,
     location_name, city, map_url,
     age_min, age_max, capacity,
     tags, visibility, contact, is_hidden)
  values
    (g1, new_user, 'Lakeside Sandbox', 'Bring beach toys & snacks.',
      (current_date + interval '2 day')::date, '10:00', '12:00',
      'Stewart Park (Sandbox)', 'Ithaca, NY',
      'https://maps.google.com/?q=Stewart+Park+Ithaca',
      2, 6, 10, array['outdoors','sandbox','toddler']::text[], 'group', 'host@example.com', false),
    (g1, new_user, 'Scooter Loop', 'Flat path for scooters & balance bikes.',
      (current_date + interval '5 day')::date, '15:30', '16:30',
      'Cayuga Waterfront Trail', 'Ithaca, NY',
      'https://maps.google.com/?q=Cayuga+Waterfront+Trail',
      3, 7, 12, array['outdoors','scooters']::text[], 'group', 'host@example.com', false),
    (g2, new_user, 'Slides & Snacks', 'Meet at the big slide; snacks on the benches.',
      (current_date + interval '3 day')::date, '09:30', '11:00',
      'South Hill Rec Park', 'Ithaca, NY',
      'https://maps.google.com/?q=South+Hill+Recreation+Way',
      2, 8, 12, array['park','snacks']::text[], 'group', 'host@example.com', false),
    (g3, new_user, 'Library Storytime + Commons', 'Storytime, then bubbles at the playground.',
      (current_date + interval '4 day')::date, '10:30', '12:00',
      'Tompkins County Public Library', 'Ithaca, NY',
      'https://maps.google.com/?q=TCPL+Ithaca',
      2, 6, 16, array['indoors','books','playground']::text[], 'group', 'host@example.com', false);

  insert into public.group_members (group_id, user_id, role, status)
  values (g1, main_user, 'member', 'active')
  on conflict do nothing;

  raise notice 'Seeded groups and events for user %', new_user;
end
$$;
