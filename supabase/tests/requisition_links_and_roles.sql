-- Requisition links, role field limits, and read audit.
-- Rolls back. Run after migrations 14–16.

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
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '11111111-1111-4111-8111-111111111002'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', '11111111-1111-4111-8111-111111111003'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd5', '11111111-1111-4111-8111-111111111005'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111001')
on conflict (id) do nothing;

insert into public.generated_documents (id, patient_id, template_name, storage_path, created_by)
values (
  '44444444-4444-4444-8444-444444444099',
  '33333333-3333-4333-8333-333333333001',
  'Test requisition',
  '33333333-3333-4333-8333-333333333001/sample.pdf',
  '11111111-1111-4111-8111-111111111002'
);

do $$
begin
  if (select fax_enabled from public.clinic_settings where id = 1) is distinct from false then
    raise exception 'fax was not off by default';
  end if;
  if (select email_link_ttl_hours from public.clinic_settings where id = 1) is distinct from 72 then
    raise exception 'email link lifetime was not 72 hours';
  end if;
  raise notice 'fax is off and the email link lasts 72 hours';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111002', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"dddddddd-dddd-4ddd-8ddd-ddddddddddd2","app_metadata":{"portal_role":"admin"}}',
  true
);
set role authenticated;
select public.touch_session();

create temporary table link_result (body jsonb);
insert into link_result
select public.register_requisition_link(
  '44444444-4444-4444-8444-444444444099',
  'token-hash-one',
  'lab@example.com',
  'Requisition delivery',
  'Requisition record'
);
reset role;

do $$
declare
  link jsonb;
  opened jsonb;
begin
  select body into link from link_result;
  if link ->> 'ttl_hours' is distinct from '72' then
    raise exception 'link was not registered for 72 hours';
  end if;
  if not exists (
    select 1 from audit.events
    where action = 'Sent requisition link' and detail = 'lab@example.com' and record_id = 'BLM-100231'
  ) then
    raise exception 'the send was not audited with the recipient';
  end if;
  opened := public.redeem_requisition_link('token-hash-one');
  if opened ->> 'status' is distinct from 'ok' or (opened ->> 'ttl_seconds')::int > 900 then
    raise exception 'redeem did not return a short storage url: %', opened;
  end if;
  if not exists (
    select 1 from audit.events
    where action = 'Opened requisition link' and detail = 'lab@example.com'
  ) then
    raise exception 'the open was not audited';
  end if;
  raise notice 'send and open are audited';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111002', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"dddddddd-dddd-4ddd-8ddd-ddddddddddd2","app_metadata":{"portal_role":"admin"}}',
  true
);
set role authenticated;
select public.revoke_requisition_link((select (body ->> 'id')::uuid from link_result));
reset role;

do $$
declare
  opened jsonb;
begin
  opened := public.redeem_requisition_link('token-hash-one');
  if opened ->> 'status' is distinct from 'revoked' then
    raise exception 'revoked link still opened';
  end if;
  raise notice 'revoked link stays closed';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111005', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"dddddddd-dddd-4ddd-8ddd-ddddddddddd5","app_metadata":{"portal_role":"holistic"}}',
  true
);
set role authenticated;
select public.touch_session();
do $$
declare
  n integer;
  home jsonb;
begin
  select count(*) into n from public.generated_documents;
  if n <> 0 then
    raise exception 'holistic staff can see % requisition files', n;
  end if;
  perform public.note_staff_view('BLM-100231', 'Requisition');
  raise exception 'holistic staff viewed a requisition';
exception
  when others then
    if sqlerrm like '%Not permitted%' then
      raise notice 'holistic staff cannot open a requisition';
    else
      raise;
    end if;
end $$;
do $$
declare
  home jsonb;
begin
  home := public.staff_bootstrap();
  if exists (
    select 1 from jsonb_array_elements(home -> 'patients') p
    where coalesce(p ->> 'ahc', '') <> ''
  ) then
    raise exception 'holistic staff received a health number';
  end if;
  perform public.note_staff_view('BLM-100231', 'Client record');
  raise notice 'holistic staff see no health number';
end $$;
reset role;
do $$
begin
  if not exists (
    select 1 from audit.events
    where action = 'Viewed Client record' and record_id = 'BLM-100231' and ok
  ) then
    raise exception 'the client-record view was not audited';
  end if;
  raise notice 'the client-record view is audited';
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111001', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal2","session_id":"dddddddd-dddd-4ddd-8ddd-ddddddddddd1","app_metadata":{"portal_role":"owner"}}',
  true
);
set role authenticated;
select public.touch_session();
do $$
declare
  home jsonb;
begin
  home := public.staff_bootstrap();
  if jsonb_array_length(coalesce(home -> 'audit', '[]'::jsonb)) < 1 then
    raise exception 'the owner audit view was empty';
  end if;
  if jsonb_array_length(coalesce(home -> 'documents', '[]'::jsonb)) <> 0 then
    raise exception 'the owner received requisition files';
  end if;
  raise notice 'the owner audit view is populated and has no requisition files';
end $$;
reset role;

rollback;
