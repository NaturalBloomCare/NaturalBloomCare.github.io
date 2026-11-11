-- Auth hooks. Creating these functions does not turn them on.
-- In the Supabase dashboard, Authentication → Hooks:
--   Password verification attempt → public.hook_password_verification_attempt
--   Custom access token → public.custom_access_token_hook
-- Until the password hook is enabled, lockout is not enforced inside GoTrue.
-- The portal still refuses deactivated and invited accounts once the hook is on.

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := nullif(event ->> 'user_id', '')::uuid;
  valid boolean := coalesce((event ->> 'valid')::boolean, false);
  attempts private.login_attempts%rowtype;
  account_status text;
  failed integer;
begin
  if uid is null then
    return jsonb_build_object('decision', 'continue');
  end if;

  select * into attempts from private.login_attempts where user_id = uid;
  if attempts.locked_until is not null and attempts.locked_until > now() then
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'This account is locked after too many sign-in attempts. Try again in 15 minutes.',
      'should_logout_user', false
    );
  end if;

  select status into account_status from public.profiles where id = uid;
  if account_status = 'deactivated' then
    perform audit.write('Sign-in blocked', '', 'Account', false, uid, 'Deactivated');
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'This account has been deactivated. Contact the clinic owner if you need access.',
      'should_logout_user', true
    );
  end if;
  if account_status = 'invited' then
    perform audit.write('Sign-in blocked', '', 'Account', false, uid, 'Invitation not accepted');
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'This invitation has not been accepted yet.',
      'should_logout_user', false
    );
  end if;

  if valid then
    delete from private.login_attempts where user_id = uid;
    return jsonb_build_object('decision', 'continue');
  end if;

  if attempts.user_id is null or attempts.window_started_at < now() - interval '15 minutes' then
    insert into private.login_attempts as a (user_id, failed_count, window_started_at, locked_until)
    values (uid, 1, now(), null)
    on conflict (user_id) do update
      set failed_count = 1, window_started_at = now(), locked_until = null;
    failed := 1;
  else
    update private.login_attempts
    set failed_count = failed_count + 1
    where user_id = uid
    returning failed_count into failed;
  end if;

  if failed >= 5 then
    update private.login_attempts set locked_until = now() + interval '15 minutes' where user_id = uid;
    perform audit.write('Sign-in locked', '', 'Account', false, uid, 'Five failed attempts');
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'This account is locked after too many sign-in attempts. Try again in 15 minutes.',
      'should_logout_user', true
    );
  end if;

  perform audit.write('Failed sign-in', '', 'Account', false, uid, 'Password not accepted');
  return jsonb_build_object('decision', 'continue');
end;
$$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  role text;
  account_status text;
begin
  select portal_role, status into role, account_status
  from public.profiles
  where id = nullif(event ->> 'user_id', '')::uuid;
  if role is not null then
    if jsonb_typeof(claims -> 'app_metadata') is distinct from 'object' then
      claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
    end if;
    claims := jsonb_set(claims, '{app_metadata,portal_role}', to_jsonb(role), true);
    claims := jsonb_set(claims, '{app_metadata,account_status}', to_jsonb(account_status), true);
  end if;
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

create or replace function private.invite_staff(
  p_email text,
  p_first text,
  p_last text,
  p_role text,
  p_title text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := gen_random_uuid();
  legacy text := 'u-' || substr(replace(uid::text, '-', ''), 1, 12);
begin
  if private.portal_role() <> 'owner' then
    raise exception 'Not permitted';
  end if;
  if p_role not in ('owner', 'admin', 'holistic', 'medical') then
    raise exception 'Unknown role';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'An account with that email already exists';
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid, 'authenticated', 'authenticated', lower(trim(p_email)),
    extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'portal_role', p_role),
    jsonb_build_object('first_name', p_first, 'last_name', p_last),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid,
    jsonb_build_object('sub', uid::text, 'email', lower(trim(p_email)), 'email_verified', false),
    'email', uid::text, now(), now(), now()
  );
  insert into public.profiles (
    id, legacy_id, first_name, last_name, email, portal_role, title, status, confidentiality, mfa_label
  ) values (
    uid, legacy, coalesce(p_first, ''), coalesce(p_last, ''), lower(trim(p_email)),
    p_role, coalesce(p_title, ''), 'invited', 'Required before first sign-in', 'Not enrolled'
  );
  perform audit.write('Invited staff', legacy, 'Staff account', true, auth.uid(), p_role);
end;
$$;

create or replace function public.release_document(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  legacy text;
begin
  perform public.touch_session();
  if private.portal_role() not in ('admin', 'medical', 'owner') or not private.assurance_ok() then
    raise exception 'Not permitted';
  end if;
  select patient_id into pid from public.generated_documents where id = p_id;
  if pid is null or not private.can_see_patient(pid) then
    raise exception 'Not permitted';
  end if;
  update public.generated_documents set released_to_patient = true where id = p_id;
  select legacy_id into legacy from public.patients where id = pid;
  perform audit.write('Released document to client portal', legacy, 'Document', true, auth.uid(), p_id::text);
end;
$$;

revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;
grant select, insert, update, delete on private.login_attempts to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

revoke all on function public.release_document(uuid) from public, anon;
grant execute on function public.release_document(uuid) to authenticated;

revoke all on function private.invite_staff(text, text, text, text, text) from public, anon, authenticated;

-- Boolean helpers are used inside RLS policies, so signed-in users must be
-- able to execute them. They return no row data. Write helpers stay closed.
grant usage on schema private to authenticated;
grant execute on function private.portal_role() to authenticated;
grant execute on function private.aal() to authenticated;
grant execute on function private.session_id() to authenticated;
grant execute on function private.session_ok() to authenticated;
grant execute on function private.assurance_ok() to authenticated;
grant execute on function private.profile_active() to authenticated;
grant execute on function private.has_perm(text) to authenticated;
grant execute on function private.my_patient() to authenticated;
grant execute on function private.can_see_patient(uuid) to authenticated;

revoke all on function private.upsert_item(text, text, jsonb, text) from public, anon, authenticated;
revoke all on function audit.write(text, text, text, boolean, uuid, text) from public, anon, authenticated;
revoke all on function audit.note_read(text, text) from public, anon, authenticated;
revoke all on function audit.stamp() from public, anon, authenticated;
revoke all on function audit.block_change() from public, anon, authenticated;
