-- Two fictional clients, audit restrictions, and published-plan immutability.
-- Run after migrations 8–12:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/two_client_isolation.sql
-- The script rolls back. A passing run prints the notices and leaves no data change.

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

do $$
declare
  users integer;
  distinct_secrets integer;
  first_hash text;
  second_prev text;
  gate jsonb;
begin
  if exists (
    select 1 from private.patient_identifiers where phn !~ '^00000-[0-9]{4}$'
  ) then
    raise exception 'sample health numbers were not replaced';
  end if;
  if (select auth_user_id from public.patients where legacy_id = 'BLM-100244')
     is distinct from '22222222-2222-4222-8222-222222222002'::uuid then
    raise exception 'the second fictional client is not linked to a login';
  end if;
  select count(*), count(distinct encrypted_password)
    into users, distinct_secrets
  from auth.users
  where email like '%@example.com';
  if users < 9 or distinct_secrets <> users then
    raise exception 'fictional passwords were not replaced with distinct random secrets';
  end if;

  perform audit.write('Opened client portal', 'chain-a', 'Test', true, null, 'one');
  perform audit.write('Opened client portal', 'chain-b', 'Test', true, null, 'two');
  select row_hash into first_hash from audit.events where record_id = 'chain-a' order by id desc limit 1;
  select prev_hash into second_prev from audit.events where record_id = 'chain-b' order by id desc limit 1;
  if second_prev is distinct from first_hash then
    raise exception 'audit hash chain did not continue from the previous row';
  end if;

  insert into public.generated_documents (id, patient_id, template_name, storage_path, created_by)
  values (
    '44444444-4444-4444-8444-444444444001',
    '33333333-3333-4333-8333-333333333001',
    'Test form',
    '33333333-3333-4333-8333-333333333001/sample.pdf',
    '11111111-1111-4111-8111-111111111003'
  );
  insert into public.secure_links (id, document_id, token_hash, recipient, expires_at)
  values (
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444001',
    'hash-one',
    'person@example.com',
    now() + interval '1 day'
  );
  gate := public.request_secure_link_code('hash-one', 'codehash1');
  if gate ->> 'status' is distinct from 'ok' then
    raise exception 'the first confirmation code was not accepted';
  end if;
  perform public.release_secure_link_code('hash-one');
  if (select code_requests from public.secure_links where token_hash = 'hash-one') <> 0 then
    raise exception 'a failed email send still counted toward the code limit';
  end if;
  gate := public.request_secure_link_code('hash-one', 'codehash2');
  if gate ->> 'status' is distinct from 'ok' then
    raise exception 'a code could not be requested again after a failed send';
  end if;
  gate := public.request_secure_link_code('hash-one', 'codehash3');
  if gate ->> 'status' is distinct from 'throttled' then
    raise exception 'a second confirmation code was not throttled';
  end if;

  insert into public.tracking_entries (patient_id, kind, recorded_on, value, unit, note)
  values (
    '33333333-3333-4333-8333-333333333001',
    'sleep', current_date, 7.5, 'h', 'fictional'
  );
  raise notice 'seed secrets replaced, hash chain continued, code request throttled';
end $$;

insert into auth.sessions (id, user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc01', '22222222-2222-4222-8222-222222222001'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc02', '22222222-2222-4222-8222-222222222002'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc03', '11111111-1111-4111-8111-111111111003')
on conflict (id) do nothing;

insert into private.sign_in_code_passes (session_id, user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc01', '22222222-2222-4222-8222-222222222001'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc02', '22222222-2222-4222-8222-222222222002'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc03', '11111111-1111-4111-8111-111111111003')
on conflict (session_id) do nothing;

set role authenticated;
do $$
begin
  perform public.request_secure_link_code('hash-one', 'codehash3');
  raise exception 'a signed-in browser called the code function';
exception
  when insufficient_privilege then
    raise notice 'browsers cannot request a secure-link code directly';
end $$;
do $$
declare
  n integer;
begin
  select count(*) into n from audit.chain;
  if n <> 0 then
    raise exception 'the API read the audit chain';
  end if;
  raise notice 'the API cannot see the audit chain head';
exception
  when insufficient_privilege then
    raise notice 'the API cannot see the audit chain head';
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222001', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal1","session_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","app_metadata":{"portal_role":"client"}}',
  true
);
set role authenticated;
do $$
declare
  home jsonb;
  seen integer;
begin
  home := public.client_home();
  if home #>> '{profile,legacy}' is distinct from 'BLM-100231' then
    raise exception 'Amelia home is not her own record';
  end if;
  if home::text like '%BLM-100244%' or home::text like '%Noah%' then
    raise exception 'Amelia home includes the other client';
  end if;
  if jsonb_array_length(coalesce(home -> 'wellness', '[]'::jsonb)) < 1 then
    raise exception 'Amelia cannot see her published wellness plan';
  end if;
  select count(*) into seen from public.patients;
  if seen <> 1 then
    raise exception 'Amelia can see % patient rows', seen;
  end if;
  select count(*) into seen
  from public.wellness_plans
  where patient_id <> '33333333-3333-4333-8333-333333333001';
  if seen <> 0 then
    raise exception 'Amelia can see another client''s wellness plan';
  end if;
  select count(*) into seen from public.tracking_entries;
  if seen <> 1 then
    raise exception 'Amelia cannot see her own tracking entry';
  end if;
  raise notice 'Amelia sees only her own portal';
end $$;
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222002', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal1","session_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc02","app_metadata":{"portal_role":"client"}}',
  true
);
set role authenticated;
do $$
declare
  home jsonb;
  seen integer;
  changed integer;
begin
  home := public.client_home();
  if home #>> '{profile,legacy}' is distinct from 'BLM-100244' then
    raise exception 'Noah home is not his own record';
  end if;
  if home::text like '%BLM-100231%' or home::text like '%WP-1%' or home::text like '%Amelia%' then
    raise exception 'Noah home includes Amelia''s record';
  end if;
  if jsonb_array_length(coalesce(home -> 'wellness', '[]'::jsonb)) <> 0 then
    raise exception 'Noah can see a wellness plan that is not his';
  end if;
  select count(*) into seen from public.patients;
  if seen <> 1 then
    raise exception 'Noah can see % patient rows', seen;
  end if;
  select count(*) into seen from public.wellness_plans;
  if seen <> 0 then
    raise exception 'Noah can see a wellness plan';
  end if;
  select count(*) into seen from public.tracking_entries;
  if seen <> 0 then
    raise exception 'Noah can see Amelia''s tracking';
  end if;
  update public.tracking_entries set value = 1;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'Noah changed another client''s tracking';
  end if;
  perform public.log_audit('Revealed health care number', 'BLM-100244', 'PHN', true, 'forged');
  raise exception 'a client forged an audit row';
exception
  when others then
    if sqlerrm ilike '%Not permitted%' or sqlerrm ilike '%recorded by the server%' then
      raise notice 'Noah sees only his own portal and cannot forge an audit row';
    else
      raise;
    end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111003', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc03","app_metadata":{"portal_role":"medical"}}',
  true
);
set role authenticated;
select public.touch_session();
do $$
declare
  original jsonb;
  drafts integer;
begin
  perform public.log_audit('Deactivated staff', '', 'Staff account', true, 'forged');
  raise exception 'staff forged a privileged audit row';
exception
  when others then
    if sqlerrm ilike '%recorded by the server%' then
      raise notice 'privileged audit actions are rejected';
    else
      raise;
    end if;
end $$;
do $$
begin
  perform public.log_audit('Viewed record', 'BLM-100244', 'Chart', true, 'forged');
  raise exception 'staff logged a patient they cannot see';
exception
  when others then
    if sqlerrm ilike '%Not permitted%' then
      raise notice 'audit notes cannot name an unassigned patient';
    else
      raise;
    end if;
end $$;
do $$
declare
  original jsonb;
  drafts integer;
  note text;
begin
  select body into original from public.wellness_plans where legacy_id = 'WP-1';
  perform public.staff_commit(jsonb_build_object(
    'wellness', jsonb_build_array(jsonb_build_object(
      'id', 'WP-1',
      'pid', 'BLM-100231',
      'type', 'wellness',
      'kind', 'Wellness consult',
      'status', 'Draft',
      'body', jsonb_build_object('w_discussed', 'A general sleep note for the revision.')
    ))
  ));
  if (select status from public.wellness_plans where legacy_id = 'WP-1') is distinct from 'Published' then
    raise exception 'the published plan status changed';
  end if;
  if (select body from public.wellness_plans where legacy_id = 'WP-1') is distinct from original then
    raise exception 'the published plan body changed';
  end if;
  select count(*) into drafts from public.wellness_plans where legacy_id like 'WP-1-draft-%';
  if drafts <> 1 then
    raise exception 'expected one new draft, found %', drafts;
  end if;

  perform public.staff_commit(jsonb_build_object(
    'wellness', jsonb_build_array(jsonb_build_object(
      'id', 'WP-1',
      'pid', 'BLM-100231',
      'type', 'wellness',
      'kind', 'Wellness consult',
      'status', 'Draft',
      'body', jsonb_build_object('w_discussed', 'A general sleep note for the revision.')
    ))
  ));
  select count(*) into drafts from public.wellness_plans where legacy_id like 'WP-1-draft-%';
  if drafts <> 1 then
    raise exception 'the same edit created another draft';
  end if;

  perform public.staff_commit(jsonb_build_object(
    'wellness', jsonb_build_array(jsonb_build_object(
      'id', 'WP-1',
      'pid', 'BLM-100231',
      'type', 'wellness',
      'kind', 'Wellness consult',
      'status', 'Draft',
      'body', jsonb_build_object('w_discussed', 'A second general note.')
    ))
  ));
  select count(*) into drafts from public.wellness_plans where legacy_id like 'WP-1-draft-%';
  if drafts <> 1 then
    raise exception 'a further edit did not stay on the open draft';
  end if;
  select body ->> 'w_discussed' into note
  from public.wellness_plans
  where legacy_id like 'WP-1-draft-%';
  if note is distinct from 'A second general note.' then
    raise exception 'the open draft was not updated';
  end if;
  if (select body from public.wellness_plans where legacy_id = 'WP-1') is distinct from original then
    raise exception 'the published plan body changed after the revision';
  end if;
  raise notice 'a published plan stays intact and the edit is a new version';
end $$;
reset role;

do $$
begin
  update public.wellness_plans
  set body = '{"w_discussed":"direct edit"}'::jsonb
  where legacy_id = 'WP-1';
  raise exception 'a direct edit of a published plan succeeded';
exception
  when others then
    if sqlerrm ilike '%new version%' then
      raise notice 'a published body cannot be overwritten';
    else
      raise;
    end if;
end $$;

rollback;
