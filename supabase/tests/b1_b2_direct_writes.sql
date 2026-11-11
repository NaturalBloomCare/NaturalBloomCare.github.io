-- B1 and B2 must fail after 20261111180600_lock_direct_writes.sql.
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/b1_b2_direct_writes.sql
-- The script rolls back. A passing run prints the blocked notices and leaves no data change.

begin;

insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select lower(u.email), p.first_name || ' ' || p.last_name,
  case when p.portal_role = 'client' then 'client' else 'staff' end,
  case when p.portal_role = 'client' then null else p.portal_role end,
  'active', current_date
from public.profiles p
join auth.users u on u.id = p.id
where p.status = 'active'
  and not exists (select 1 from private.portal_access a where a.email = lower(u.email));

insert into auth.sessions (id, user_id) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', '11111111-1111-4111-8111-111111111005'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', '11111111-1111-4111-8111-111111111004')
on conflict (id) do nothing;

-- B1: a client must not be able to change her own portal_role.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222001', true);
set role authenticated;
do $$
begin
  update public.profiles
  set portal_role = 'admin', cred = '{"type":"NP","verified":true}'::jsonb
  where id = '22222222-2222-4222-8222-222222222001';
  raise exception 'B1 exploit succeeded';
exception
  when insufficient_privilege then
    raise notice 'B1 blocked: client cannot update profiles';
end $$;
reset role;

do $$
begin
  if (select portal_role from public.profiles where id = '22222222-2222-4222-8222-222222222001') <> 'client' then
    raise exception 'B1 changed the client role';
  end if;
end $$;

-- B2: a herbalist must not publish by writing the table, even naming herself as approver.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111005', true);
set role authenticated;
do $$
begin
  update public.wellness_plans
  set status = 'Published',
      approved_by = '11111111-1111-4111-8111-111111111005',
      published_by = '11111111-1111-4111-8111-111111111005',
      approved_at = now(),
      published_at = now()
  where legacy_id = 'WP-2';
  raise exception 'B2 direct update succeeded';
exception
  when insufficient_privilege then
    raise notice 'B2 blocked: herbalist cannot update wellness_plans';
end $$;
reset role;

-- The same herbalist must not publish through staff_commit.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111005', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"cccccccc-cccc-4ccc-8ccc-ccccccccccc5","app_metadata":{"portal_role":"holistic"}}',
  true
);
set role authenticated;
select public.touch_session();
do $$
begin
  perform public.staff_commit('{"wellness":[{"id":"WP-2","pid":"BLM-100283","type":"wellness","kind":"Wellness consult","status":"Published","body":{"w_discussed":"exploit"}}]}'::jsonb);
  raise exception 'B2 staff_commit publish succeeded';
exception
  when others then
    if sqlerrm ilike '%herbalist%' then
      raise notice 'B2 blocked: herbalist staff_commit cannot publish';
    else
      raise;
    end if;
end $$;
do $$
begin
  perform public.approve_wellness_plan('WP-2', 'Published');
  raise exception 'B2 herbalist RPC publish succeeded';
exception
  when others then
    if sqlerrm ilike '%Nurse Practitioner%' then
      raise notice 'B2 blocked: herbalist cannot call approve_wellness_plan';
    else
      raise;
    end if;
end $$;
reset role;

do $$
begin
  if (select status from public.wellness_plans where legacy_id = 'WP-2') = 'Published' then
    raise exception 'WP-2 was published by the herbalist';
  end if;
  if (select approved_by from public.wellness_plans where legacy_id = 'WP-2') is not null then
    raise exception 'WP-2 gained an approver from the herbalist';
  end if;
end $$;

-- The assigned Nurse Practitioner can publish, and the approver is her own user id.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111004', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"cccccccc-cccc-4ccc-8ccc-ccccccccccc4","app_metadata":{"portal_role":"medical"}}',
  true
);
set role authenticated;
select public.touch_session();
select public.approve_wellness_plan('WP-2', 'Published');
reset role;

do $$
begin
  if (select approved_by from public.wellness_plans where legacy_id = 'WP-2')
     is distinct from '11111111-1111-4111-8111-111111111004' then
    raise exception 'NP publish did not record the signed-in practitioner as approver';
  end if;
  if (select published_by from public.wellness_plans where legacy_id = 'WP-2')
     is distinct from '11111111-1111-4111-8111-111111111004' then
    raise exception 'NP publish did not record the signed-in practitioner as publisher';
  end if;
  if (select status from public.wellness_plans where legacy_id = 'WP-2') <> 'Published' then
    raise exception 'NP publish did not set Published';
  end if;
end $$;

rollback;
