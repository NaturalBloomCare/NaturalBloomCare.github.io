-- Access-list rehearsals. The script rolls back and leaves no data change.
-- Run after 20261111181300_portal_access_list.sql:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/portal_access_list.sql

begin;

insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select lower(u.email), p.first_name || ' ' || p.last_name,
  case when p.portal_role = 'client' then 'client' else 'staff' end,
  case when p.portal_role = 'client' then null else p.portal_role end,
  case when p.status = 'active' then 'active' else 'inactive' end,
  current_date
from public.profiles p
join auth.users u on u.id = p.id
where not exists (
  select 1 from private.portal_access a where a.email = lower(u.email)
);

-- Case-insensitive storage.
insert into private.portal_access (email, portal, staff_role, status, date_added)
values ('Owner.Example@Example.com', 'staff', 'owner', 'active', current_date);
do $$
begin
  if (select email from private.portal_access where email = 'owner.example@example.com') is null then
    raise exception 'access list did not store a lower-case email';
  end if;
end $$;

-- Unlisted.
do $$
declare
  result jsonb;
begin
  delete from private.portal_access where email = 'amelia.hart@example.com';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'claims', jsonb_build_object('sub', '22222222-2222-4222-8222-222222222001')
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'unlisted account received a token';
  end if;
  if result #>> '{error,message}' not like '%not on the Bloom access list%' then
    raise exception 'unlisted refusal did not name the access list';
  end if;
  raise notice 'unlisted sign-in refused';
end $$;

insert into private.portal_access (email, portal, staff_role, status, date_added)
select 'amelia.hart@example.com', 'client', null, 'active', current_date
where not exists (
  select 1 from private.portal_access where email = 'amelia.hart@example.com'
);

-- Inactive.
do $$
declare
  result jsonb;
begin
  update private.portal_access set status = 'inactive', date_removed = current_date
  where email = 'amelia.hart@example.com';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'claims', '{}'::jsonb
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'inactive access row received a token';
  end if;
  raise notice 'inactive sign-in refused';
end $$;

-- Listed client, including a mixed-case auth email, and a second call after refresh.
do $$
declare
  result jsonb;
begin
  update private.portal_access set status = 'active', date_removed = null
  where email = 'amelia.hart@example.com';
  update auth.users set email = 'Amelia.Hart@example.com'
  where id = '22222222-2222-4222-8222-222222222001';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'claims', jsonb_build_object('app_metadata', jsonb_build_object('portal_role', 'client'))
  ));
  if result ? 'error' then
    raise exception 'listed client was refused: %', result;
  end if;
  if result #>> '{claims,app_metadata,portal}' is distinct from 'client'
     or result #>> '{claims,app_metadata,portal_role}' is distinct from 'client' then
    raise exception 'listed client claims were not set';
  end if;
  update private.portal_access set status = 'inactive' where email = 'amelia.hart@example.com';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'claims', '{}'::jsonb
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'refresh after inactivation still issued a token';
  end if;
  update auth.users set email = 'amelia.hart@example.com'
  where id = '22222222-2222-4222-8222-222222222001';
  update private.portal_access set status = 'active', date_removed = null
  where email = 'amelia.hart@example.com';
  raise notice 'listed client allowed, mixed-case email matched, refresh refused';
end $$;

-- Listed staff.
do $$
declare
  result jsonb;
begin
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '11111111-1111-4111-8111-111111111003',
    'claims', '{}'::jsonb
  ));
  if result ? 'error' then
    raise exception 'listed staff was refused: %', result;
  end if;
  if result #>> '{claims,app_metadata,portal}' is distinct from 'staff'
     or result #>> '{claims,app_metadata,portal_role}' is distinct from 'medical' then
    raise exception 'listed staff claims were not set';
  end if;
  raise notice 'listed staff allowed';
end $$;

-- Wrong portal, wrong role, deactivated profile.
do $$
declare
  result jsonb;
begin
  update private.portal_access set portal = 'client', staff_role = null
  where email = 'iris.calloway@example.com';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '11111111-1111-4111-8111-111111111003',
    'claims', '{}'::jsonb
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'wrong portal received a token';
  end if;

  update private.portal_access set portal = 'staff', staff_role = 'owner'
  where email = 'iris.calloway@example.com';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '11111111-1111-4111-8111-111111111003',
    'claims', '{}'::jsonb
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'wrong staff role received a token';
  end if;

  update private.portal_access set staff_role = 'medical'
  where email = 'iris.calloway@example.com';
  update public.profiles set status = 'deactivated'
  where id = '11111111-1111-4111-8111-111111111003';
  result := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '11111111-1111-4111-8111-111111111003',
    'claims', '{}'::jsonb
  ));
  if (result #>> '{error,http_code}')::int is distinct from 403 then
    raise exception 'deactivated profile received a token';
  end if;
  update public.profiles set status = 'active'
  where id = '11111111-1111-4111-8111-111111111003';
  raise notice 'wrong portal, wrong role, and deactivated profile refused';
end $$;

-- The API cannot read or sync the list.
set role anon;
do $$
begin
  perform 1 from private.portal_access;
  raise exception 'anon read the access list';
exception
  when insufficient_privilege then
    raise notice 'anon cannot read the access list';
end $$;
reset role;

set role authenticated;
do $$
begin
  perform 1 from private.portal_access;
  raise exception 'authenticated read the access list';
exception
  when insufficient_privilege then
    raise notice 'authenticated cannot read the access list';
end $$;
do $$
begin
  perform private.apply_access_list('[]'::jsonb);
  raise exception 'authenticated synced the access list';
exception
  when insufficient_privilege then
    raise notice 'authenticated cannot sync the access list';
end $$;
reset role;

-- Sheet sync: a dropped row is inactivated, a role change follows the sheet,
-- and a staff profile that was never activated returns to invited.
do $$
declare
  before_status text;
begin
  perform private.apply_access_list(jsonb_build_array(
    jsonb_build_object('email', 'Iris.Calloway@example.com', 'full_name', 'Iris Calloway', 'portal', 'staff', 'staff_role', 'admin', 'status', 'Active'),
    jsonb_build_object('email', 'juniper.reyes@example.com', 'full_name', 'Juniper Reyes', 'portal', 'staff', 'staff_role', 'admin', 'status', 'active')
  ));
  if (select staff_role from private.portal_access where email = 'iris.calloway@example.com') is distinct from 'admin' then
    raise exception 'sheet did not change the staff role';
  end if;
  if (select portal_role from public.profiles where id = '11111111-1111-4111-8111-111111111003') is distinct from 'admin' then
    raise exception 'sheet did not update the profile role';
  end if;
  if (select status from private.portal_access where email = 'amelia.hart@example.com') is distinct from 'inactive' then
    raise exception 'a person missing from the sheet stayed active';
  end if;
  if (select status from public.profiles where id = '22222222-2222-4222-8222-222222222001') is distinct from 'deactivated' then
    raise exception 'a person missing from the sheet kept an active profile';
  end if;

  update public.profiles set status = 'deactivated'
  where email = 'juniper.reyes@example.com';
  update private.portal_access set status = 'inactive'
  where email = 'juniper.reyes@example.com';
  perform private.apply_access_list(jsonb_build_array(
    jsonb_build_object('email', 'juniper.reyes@example.com', 'portal', 'staff', 'staff_role', 'admin', 'status', 'active')
  ));
  select status into before_status from public.profiles where email = 'juniper.reyes@example.com';
  if before_status is distinct from 'invited' then
    raise exception 'a staff profile that had not been activated was restored as %', before_status;
  end if;
  raise notice 'sheet sync inactivates missing people and restores unactivated staff as invited';
end $$;

-- Owner invite requires an active staff row. The caller is the sample owner.
update private.portal_access
set status = 'active', portal = 'staff', staff_role = 'owner', date_removed = null
where email = 'rose.ashby@example.com';
update public.profiles
set status = 'active', portal_role = 'owner'
where id = '11111111-1111-4111-8111-111111111001';
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111001', true);
select set_config(
  'request.jwt.claims',
  '{"app_metadata":{"portal_role":"owner"}}',
  true
);
do $$
begin
  perform private.invite_staff('new.staff@example.com', 'New', 'Staff', 'admin', 'Coordinator');
  raise exception 'invite succeeded without an access-list row';
exception
  when others then
    if sqlerrm like '%Add this person to the access list first%' then
      raise notice 'invite without an access-list row was rejected';
    else
      raise;
    end if;
end $$;

insert into private.portal_access (email, portal, staff_role, status, date_added)
values ('new.staff@example.com', 'staff', 'admin', 'active', current_date);
select private.invite_staff('new.staff@example.com', 'New', 'Staff', 'admin', 'Coordinator');
do $$
begin
  if not exists (
    select 1 from public.profiles
    where email = 'new.staff@example.com' and portal_role = 'admin' and status = 'invited'
  ) then
    raise exception 'listed staff invite did not create an invited profile';
  end if;
  raise notice 'listed staff invite created an invited profile';
end $$;

rollback;
