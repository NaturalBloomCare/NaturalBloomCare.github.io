-- Review cases for email codes. Rolls back.
-- The pepper string below is a rehearsal fixture, not a production secret.

begin;

select set_config('bloom.code_pepper', 'rehearsal-pepper-not-a-secret', true);

insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select 'juniper.reyes@example.com', 'Juniper Reyes', 'staff', 'admin', 'inactive', current_date
where not exists (select 1 from private.portal_access where email = 'juniper.reyes@example.com');
update private.portal_access
set status = 'inactive', portal = 'staff', staff_role = 'admin'
where email = 'juniper.reyes@example.com';
insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select 'hazel.moore@example.com', 'Hazel Moore', 'staff', 'admin', 'active', current_date
where not exists (select 1 from private.portal_access where email = 'hazel.moore@example.com');
insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select 'amelia.hart@example.com', 'Amelia Hart', 'client', null, 'active', current_date
where not exists (select 1 from private.portal_access where email = 'amelia.hart@example.com');

update public.profiles
set status = 'invited', portal_role = 'admin'
where id = '11111111-1111-4111-8111-111111111006';

insert into auth.sessions (id, user_id) values
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '11111111-1111-4111-8111-111111111006'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '22222222-2222-4222-8222-222222222001')
on conflict (id) do nothing;

do $$
declare
  decision jsonb;
begin
  decision := public.hook_password_verification_attempt(jsonb_build_object(
    'user_id', '11111111-1111-4111-8111-111111111006',
    'valid', true
  ));
  if decision ->> 'decision' is distinct from 'continue' then
    raise exception 'invited staff were blocked before the email code: %', decision;
  end if;
  update public.profiles set status = 'invited' where id = '22222222-2222-4222-8222-222222222001';
  decision := public.hook_password_verification_attempt(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'valid', true
  ));
  if decision ->> 'decision' is distinct from 'reject' then
    raise exception 'an invited client was allowed through the password hook';
  end if;
  update public.profiles set status = 'active' where id = '22222222-2222-4222-8222-222222222001';
  raise notice 'invited staff may start sign-in; an invited client may not';
end $$;

do $$
declare
  result jsonb;
begin
  result := public.prepare_sign_in_code(
    '11111111-1111-4111-8111-111111111006',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '135790'
  );
  if result ->> 'status' is distinct from 'invalid' then
    raise exception 'an inactive access-list row received a code: %', result;
  end if;
  update private.portal_access set status = 'active' where email = 'juniper.reyes@example.com';
  result := public.prepare_sign_in_code(
    '11111111-1111-4111-8111-111111111007',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '135790'
  );
  if result ->> 'status' is distinct from 'invalid' then
    raise exception 'a deactivated profile received a code: %', result;
  end if;
  result := public.prepare_sign_in_code(
    '11111111-1111-4111-8111-111111111006',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '135790'
  );
  if result ->> 'ok' is distinct from 'true' then
    raise exception 'invited staff on the access list did not receive a code: %', result;
  end if;
  if (select code_hash from private.sign_in_codes where user_id = '11111111-1111-4111-8111-111111111006')
     is not distinct from encode(extensions.digest('135790', 'sha256'), 'hex') then
    raise exception 'the stored code is plain SHA-256';
  end if;
  raise notice 'invited staff get a code only while the access list is active, and the hash is not SHA-256';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111006', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal1","session_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","app_metadata":{"portal_role":"admin"}}',
  true
);
set role authenticated;
do $$
declare
  result jsonb;
begin
  if private.portal_role() is not null then
    raise exception 'portal_role was visible before the email code';
  end if;
  result := public.verify_sign_in_code('135790');
  if result ->> 'ok' is distinct from 'true' then
    raise exception 'invited staff code was refused: %', result;
  end if;
  if private.portal_role() is distinct from 'admin' then
    raise exception 'portal_role stayed closed after the email code';
  end if;
  result := public.finish_invited_staff();
  if result ->> 'status' is distinct from 'not_ready' then
    raise exception 'invited staff became active before the authenticator: %', result;
  end if;
  raise notice 'portal_role waits for the email code, and activation waits for the authenticator';
end $$;
reset role;
do $$
begin
  if (select status from public.profiles where id = '11111111-1111-4111-8111-111111111006') is distinct from 'invited' then
    raise exception 'the profile was activated too early';
  end if;
end $$;

select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","app_metadata":{"portal_role":"admin"}}',
  true
);
set role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.finish_invited_staff();
  if result ->> 'status' is distinct from 'active' then
    raise exception 'email code plus authenticator did not activate invited staff: %', result;
  end if;
  raise notice 'invited staff become active after the email code and the authenticator';
end $$;
reset role;
do $$
begin
  if (select status from public.profiles where id = '11111111-1111-4111-8111-111111111006') is distinct from 'active' then
    raise exception 'the profile stayed invited';
  end if;
end $$;

select public.prepare_sign_in_code(
  '22222222-2222-4222-8222-222222222001',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  '111111'
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222001', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal1","session_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2","app_metadata":{"portal_role":"client"}}',
  true
);
set role authenticated;
do $$
declare
  n integer;
  result jsonb;
begin
  for n in 1..4 loop
    result := public.verify_sign_in_code('000000');
    if result ->> 'status' is distinct from 'rejected' then
      raise exception 'failure % did not stay a rejection: %', n, result;
    end if;
  end loop;
end $$;
reset role;
update private.sign_in_codes
set sent_at = now() - interval '2 minutes'
where user_id = '22222222-2222-4222-8222-222222222001';
select public.prepare_sign_in_code(
  '22222222-2222-4222-8222-222222222001',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  '222222'
);
do $$
declare
  attempts integer;
  result jsonb;
begin
  select failed_attempts into attempts from private.sign_in_codes
  where user_id = '22222222-2222-4222-8222-222222222001';
  if attempts is distinct from 4 then
    raise exception 'a new sign-in code reset the failure count to %', attempts;
  end if;
  raise notice 'a new sign-in code keeps the failure count';
end $$;
set role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.verify_sign_in_code('000000');
  if result ->> 'status' is distinct from 'locked' then
    raise exception 'the fifth failure did not lock: %', result;
  end if;
end $$;
reset role;
do $$
declare
  result jsonb;
  attempts integer;
begin
  update private.sign_in_codes
  set sent_at = now() - interval '2 minutes'
  where user_id = '22222222-2222-4222-8222-222222222001';
  result := public.prepare_sign_in_code(
    '22222222-2222-4222-8222-222222222001',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '333333'
  );
  if result ->> 'status' is distinct from 'locked' then
    raise exception 'a locked sign-in accepted another code: %', result;
  end if;
  select failed_attempts into attempts from private.sign_in_codes
  where user_id = '22222222-2222-4222-8222-222222222001';
  if attempts is distinct from 5 then
    raise exception 'the lock window changed the failure count to %', attempts;
  end if;
  raise notice 'a locked sign-in does not clear failures or send another code';
end $$;

insert into public.generated_documents (id, patient_id, template_name, storage_path, created_by)
values (
  '44444444-4444-4444-8444-444444444099',
  '33333333-3333-4333-8333-333333333001',
  'Lab requisition',
  'patients/review/file.pdf',
  '11111111-1111-4111-8111-111111111002'
);
insert into public.secure_links (document_id, token_hash, recipient, expires_at)
values (
  '44444444-4444-4444-8444-444444444099',
  'review-token',
  'lab@example.com',
  now() + interval '2 days'
);
select public.request_secure_link_code('review-token', '444444');
do $$
declare
  n integer;
  result jsonb;
  attempts integer;
begin
  for n in 1..4 loop
    result := public.confirm_requisition_code('review-token', '000000');
    if result ->> 'status' is distinct from 'rejected' then
      raise exception 'requisition failure % was %', n, result;
    end if;
  end loop;
  update public.secure_links set code_sent_at = now() - interval '2 minutes' where token_hash = 'review-token';
  perform public.request_secure_link_code('review-token', '555555');
  select failed_attempts into attempts from public.secure_links where token_hash = 'review-token';
  if attempts is distinct from 4 then
    raise exception 'a new requisition code reset failures to %', attempts;
  end if;
  result := public.confirm_requisition_code('review-token', '000000');
  if result ->> 'status' is distinct from 'locked' then
    raise exception 'the fifth requisition failure did not lock: %', result;
  end if;
  raise notice 'a new requisition code keeps the failure count';
end $$;

select set_config('bloom.code_pepper', '', true);
do $$
declare
  result jsonb;
begin
  result := public.prepare_sign_in_code(
    '22222222-2222-4222-8222-222222222001',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '999999'
  );
  if result ->> 'status' is distinct from 'not_configured' then
    raise exception 'a missing pepper still issued a code: %', result;
  end if;
  raise notice 'codes fail closed when the pepper is missing';
end $$;

rollback;
