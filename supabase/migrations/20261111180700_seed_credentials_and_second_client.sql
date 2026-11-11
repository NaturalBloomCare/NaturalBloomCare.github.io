-- Replace fictional sign-in secrets and add a second client login.
-- Applied migrations are left unchanged. This file does not contain a password.
-- The clinic sets a test password privately through the password-reset page.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222002',
  'authenticated',
  'authenticated',
  'noah.b@example.com',
  extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'portal_role', 'client'),
  jsonb_build_object('first_name', 'Noah', 'last_name', 'Belanger'),
  now(), now(), '', '', '', ''
where not exists (
  select 1 from auth.users where id = '22222222-2222-4222-8222-222222222002'
);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  '22222222-2222-4222-8222-222222222002',
  jsonb_build_object('sub', '22222222-2222-4222-8222-222222222002', 'email', 'noah.b@example.com', 'email_verified', true),
  'email',
  '22222222-2222-4222-8222-222222222002',
  now(), now(), now()
where not exists (
  select 1 from auth.identities
  where user_id = '22222222-2222-4222-8222-222222222002' and provider = 'email'
);

insert into public.profiles (
  id, legacy_id, first_name, last_name, email, portal_role, title, status, confidentiality, mfa_label
)
select
  '22222222-2222-4222-8222-222222222002',
  'c-noah',
  'Noah',
  'Belanger',
  'noah.b@example.com',
  'client',
  '',
  'active',
  '',
  'Not enrolled'
where not exists (
  select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222002'
);

update public.patients
set auth_user_id = '22222222-2222-4222-8222-222222222002'
where legacy_id = 'BLM-100244'
  and auth_user_id is null;

-- Every fictional account gets a fresh random secret. It cannot be used to sign in.
update auth.users
set encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
    updated_at = now()
where email like '%@example.com';

with numbered as (
  select i.patient_id, row_number() over (order by p.legacy_id) as n
  from private.patient_identifiers i
  join public.patients p on p.id = i.patient_id
)
update private.patient_identifiers i
set phn = '00000-' || lpad(numbered.n::text, 4, '0')
from numbered
where i.patient_id = numbered.patient_id;
