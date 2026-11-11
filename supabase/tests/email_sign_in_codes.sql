-- Email sign-in codes. Rolls back.

begin;

insert into private.portal_access (email, full_name, portal, staff_role, status, date_added)
select 'amelia.hart@example.com', 'Amelia Hart', 'client', null, 'active', current_date
where not exists (select 1 from private.portal_access where email = 'amelia.hart@example.com');

insert into auth.sessions (id, user_id) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '22222222-2222-4222-8222-222222222001')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222001', true);
select set_config(
  'request.jwt.claims',
  '{"aal":"aal1","session_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1","app_metadata":{"portal_role":"client"}}',
  true
);
set role authenticated;
do $$
begin
  perform public.client_home();
  raise exception 'client home opened before the email code';
exception
  when others then
    if sqlerrm like '%Client access only%' or sqlerrm like '%email code%' or sqlerrm like '%Not permitted%' then
      raise notice 'data is refused before the email code';
    else
      raise;
    end if;
end $$;
reset role;

select public.prepare_sign_in_code(
  '22222222-2222-4222-8222-222222222001',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  encode(extensions.digest('654321', 'sha256'), 'hex')
);

set role authenticated;
do $$
declare
  result jsonb;
begin
  result := public.verify_sign_in_code('000000');
  if result ->> 'ok' is distinct from 'false' then
    raise exception 'a wrong code was accepted';
  end if;
  result := public.verify_sign_in_code('654321');
  if result ->> 'ok' is distinct from 'true' then
    raise exception 'the emailed code was refused: %', result;
  end if;
  result := public.verify_sign_in_code('654321');
  if result ->> 'ok' is distinct from 'false' then
    raise exception 'a used code was accepted again';
  end if;
  perform public.touch_session();
  perform public.client_home();
  raise notice 'the correct code is single-use and then the portal opens';
end $$;
reset role;

do $$
declare
  claims jsonb;
begin
  claims := public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-4222-8222-222222222001',
    'claims', jsonb_build_object(
      'session_id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      'app_metadata', '{}'::jsonb
    )
  ));
  if claims #>> '{claims,app_metadata,email_code_ok}' is distinct from 'true' then
    raise exception 'the token hook did not record the email code';
  end if;
  raise notice 'the token hook sets email_code_ok after the code';
end $$;

rollback;
