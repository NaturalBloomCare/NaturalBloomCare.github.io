-- Review fixes for one-time codes.
-- The pepper is not in this file. Production reads Vault secret "code_pepper".
-- A local rehearsal may set bloom.code_pepper for the test transaction only.

create or replace function private.code_pepper()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pepper text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    begin
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
        into pepper
        using 'code_pepper';
    exception
      when others then
        pepper := null;
    end;
  end if;
  if pepper is null or pepper = '' then
    pepper := nullif(current_setting('bloom.code_pepper', true), '');
  end if;
  if pepper is null then
    raise exception 'The code pepper is not configured';
  end if;
  return pepper;
end;
$$;

revoke all on function private.code_pepper() from public, anon, authenticated;

create or replace function private.hash_one_time_code(p_code text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return encode(extensions.hmac(coalesce(p_code, ''), private.code_pepper(), 'sha256'), 'hex');
exception
  when others then
    raise exception 'The code pepper is not configured';
end;
$$;

revoke all on function private.hash_one_time_code(text) from public, anon, authenticated;

drop function if exists public.request_secure_link_code(text, text);
drop function if exists public.confirm_requisition_code(text, text);
drop function if exists public.prepare_sign_in_code(uuid, uuid, text);

create or replace function public.request_secure_link_code(p_token_hash text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.secure_links%rowtype;
  legacy text;
  hashed text;
begin
  if coalesce(p_token_hash, '') = '' or coalesce(p_code, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  begin
    hashed := private.hash_one_time_code(p_code);
  exception
    when others then
      return jsonb_build_object('ok', false, 'status', 'not_configured');
  end;
  select * into link from public.secure_links where token_hash = p_token_hash for update;
  if not found or link.revoked_at is not null or link.expires_at < now() then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if link.locked_until is not null and link.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if link.code_requests >= 8 then
    update public.secure_links set locked_until = now() + interval '15 minutes' where id = link.id;
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if link.code_sent_at is not null and link.code_sent_at > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'status', 'throttled');
  end if;
  update public.secure_links
  set code_hash = hashed,
      code_expires_at = now() + interval '10 minutes',
      code_used_at = null,
      code_sent_at = now(),
      code_requests = code_requests + 1
  where id = link.id;
  select p.legacy_id into legacy
  from public.generated_documents g
  join public.patients p on p.id = g.patient_id
  where g.id = link.document_id;
  perform audit.write('Requested requisition code', coalesce(legacy, ''), 'Requisition PDF', true, null, left(link.recipient, 180));
  return jsonb_build_object('ok', true, 'status', 'ok', 'email', link.recipient, 'document_id', link.document_id);
end;
$$;

revoke all on function public.request_secure_link_code(text, text) from public, anon, authenticated;

create or replace function public.confirm_requisition_code(p_token_hash text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.secure_links%rowtype;
  doc public.generated_documents%rowtype;
  legacy text;
  remaining integer;
  attempts integer;
  hashed text;
begin
  if coalesce(p_token_hash, '') = '' or coalesce(p_code, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  begin
    hashed := private.hash_one_time_code(p_code);
  exception
    when others then
      return jsonb_build_object('ok', false, 'status', 'not_configured');
  end;
  select * into link from public.secure_links where token_hash = p_token_hash for update;
  if not found or link.revoked_at is not null or link.expires_at < now() then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if link.locked_until is not null and link.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if link.code_hash is null
     or link.code_used_at is not null
     or link.code_expires_at is null
     or link.code_expires_at < now()
     or link.code_hash is distinct from hashed
  then
    attempts := coalesce(link.failed_attempts, 0) + 1;
    update public.secure_links
    set failed_attempts = attempts,
        locked_until = case when attempts >= 5 then now() + interval '15 minutes' else locked_until end
    where id = link.id;
    select p.legacy_id into legacy
    from public.generated_documents g
    join public.patients p on p.id = g.patient_id
    where g.id = link.document_id;
    perform audit.write(
      case when attempts >= 5 then 'Requisition code locked' else 'Requisition code rejected' end,
      coalesce(legacy, ''),
      'Requisition PDF',
      false,
      null,
      left(link.recipient, 180)
    );
    return jsonb_build_object('ok', false, 'status', case when attempts >= 5 then 'locked' else 'rejected' end);
  end if;
  select * into doc from public.generated_documents where id = link.document_id;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  select legacy_id into legacy from public.patients where id = doc.patient_id;
  remaining := least(120, greatest(1, floor(extract(epoch from (link.expires_at - now())))::integer));
  update public.secure_links
  set code_hash = null,
      code_used_at = now(),
      confirmed_at = now(),
      last_opened_at = now()
  where id = link.id;
  perform audit.write('Opened requisition link', coalesce(legacy, ''), 'Requisition PDF', true, null, left(link.recipient, 180));
  return jsonb_build_object('ok', true, 'status', 'ok', 'storage_path', doc.storage_path, 'ttl_seconds', remaining, 'document_id', doc.id);
end;
$$;

revoke all on function public.confirm_requisition_code(text, text) from public, anon, authenticated;

create or replace function private.portal_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.on_access_list() and private.sign_in_code_ok() then coalesce(
      nullif(auth.jwt() -> 'app_metadata' ->> 'portal_role', ''),
      (select p.portal_role from public.profiles p where p.id = auth.uid())
    )
    else null
  end;
$$;

create or replace function public.prepare_sign_in_code(p_user_id uuid, p_session_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row private.sign_in_codes%rowtype;
  account_email text;
  hashed text;
begin
  if p_user_id is null or p_session_id is null or coalesce(p_code, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  begin
    hashed := private.hash_one_time_code(p_code);
  exception
    when others then
      return jsonb_build_object('ok', false, 'status', 'not_configured', 'message', 'Sign-in codes are not available until the code pepper is configured.');
  end;
  select lower(email) into account_email from auth.users where id = p_user_id;
  if account_email is null or account_email = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if not exists (
    select 1 from public.profiles p
    join private.portal_access a on lower(a.email) = account_email
    where p.id = p_user_id
      and a.status = 'active'
      and (
        (a.portal = 'client' and p.portal_role = 'client' and p.status = 'active')
        or (a.portal = 'staff' and a.staff_role = p.portal_role and p.status in ('active', 'invited'))
      )
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  select * into row from private.sign_in_codes where user_id = p_user_id for update;
  if row.locked_until is not null and row.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if row.sent_at is not null and row.sent_at > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'status', 'throttled');
  end if;
  if row.user_id is not null
     and row.window_started_at is not null
     and row.window_started_at > now() - interval '15 minutes'
     and row.sends_in_window >= 5
  then
    update private.sign_in_codes set locked_until = now() + interval '15 minutes' where user_id = p_user_id;
    perform audit.write('Sign-in code locked', '', 'Account', false, p_user_id, 'Too many code requests');
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;

  insert into private.sign_in_codes (
    user_id, session_id, code_hash, expires_at, used_at, sent_at, sends_in_window, window_started_at
  ) values (
    p_user_id, p_session_id, hashed, now() + interval '10 minutes', null, now(), 1, now()
  )
  on conflict (user_id) do update set
    session_id = excluded.session_id,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    used_at = null,
    sent_at = now(),
    sends_in_window = case
      when private.sign_in_codes.window_started_at is null
        or private.sign_in_codes.window_started_at <= now() - interval '15 minutes'
      then 1
      else private.sign_in_codes.sends_in_window + 1
    end,
    window_started_at = case
      when private.sign_in_codes.window_started_at is null
        or private.sign_in_codes.window_started_at <= now() - interval '15 minutes'
      then now()
      else private.sign_in_codes.window_started_at
    end;
  perform audit.write('Requested sign-in code', '', 'Account', true, p_user_id, 'code sent');
  return jsonb_build_object('ok', true, 'status', 'ok', 'email', account_email);
end;
$$;

revoke all on function public.prepare_sign_in_code(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.verify_sign_in_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row private.sign_in_codes%rowtype;
  sid uuid := private.session_id();
  hashed text;
  attempts integer;
begin
  if auth.uid() is null or sid is null then
    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', 'That code was not accepted.');
  end if;
  begin
    hashed := private.hash_one_time_code(coalesce(p_code, ''));
  exception
    when others then
      return jsonb_build_object('ok', false, 'status', 'not_configured', 'message', 'Sign-in codes are not available until the code pepper is configured.');
  end;
  select * into row from private.sign_in_codes where user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'rejected', 'message', 'That code was not accepted.');
  end if;
  if row.locked_until is not null and row.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked', 'message', 'Too many attempts. Try again later.');
  end if;
  if row.session_id is distinct from sid
     or row.code_hash is null
     or row.used_at is not null
     or row.expires_at is null
     or row.expires_at < now()
     or row.code_hash is distinct from hashed
  then
    attempts := row.failed_attempts + 1;
    update private.sign_in_codes
    set failed_attempts = attempts,
        locked_until = case when attempts >= 5 then now() + interval '15 minutes' else locked_until end
    where user_id = auth.uid();
    perform audit.write(
      case when attempts >= 5 then 'Sign-in code locked' else 'Sign-in code rejected' end,
      '',
      'Account',
      false,
      auth.uid(),
      case when attempts >= 5 then 'Too many attempts' else 'Not accepted' end
    );
    return jsonb_build_object(
      'ok', false,
      'status', case when attempts >= 5 then 'locked' else 'rejected' end,
      'message', case when attempts >= 5 then 'Too many attempts. Try again later.' else 'That code was not accepted.' end
    );
  end if;
  update private.sign_in_codes
  set code_hash = null, used_at = now(), failed_attempts = 0
  where user_id = auth.uid();
  insert into private.sign_in_code_passes (session_id, user_id, passed_at)
  values (sid, auth.uid(), now())
  on conflict (session_id) do update set passed_at = now(), user_id = excluded.user_id;
  perform audit.write('Sign-in code accepted', '', 'Account', true, auth.uid(), 'Email code');
  return jsonb_build_object('ok', true, 'status', 'ok', 'message', 'Code accepted.');
end;
$$;

revoke all on function public.verify_sign_in_code(text) from public, anon;
grant execute on function public.verify_sign_in_code(text) to authenticated;

create or replace function public.finish_invited_staff()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles%rowtype;
begin
  if auth.uid() is null or not private.sign_in_code_ok() or not private.assurance_ok() then
    return jsonb_build_object('ok', false, 'status', 'not_ready');
  end if;
  select * into prof from public.profiles where id = auth.uid();
  if not found or prof.portal_role not in ('owner', 'admin', 'holistic', 'medical') then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if prof.status = 'active' then
    return jsonb_build_object('ok', true, 'status', 'active');
  end if;
  if prof.status <> 'invited' or not exists (
    select 1 from private.portal_access a
    where lower(a.email) = lower(prof.email)
      and a.status = 'active'
      and a.portal = 'staff'
      and a.staff_role = prof.portal_role
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  update public.profiles
  set status = 'active', updated_at = now()
  where id = auth.uid() and status = 'invited';
  perform audit.write('Activated invited staff', coalesce(prof.legacy_id, ''), 'Staff account', true, auth.uid(), 'Email code and authenticator');
  return jsonb_build_object('ok', true, 'status', 'active');
end;
$$;

revoke all on function public.finish_invited_staff() from public, anon;
grant execute on function public.finish_invited_staff() to authenticated;

-- The password hook is not enabled on this plan. When it can be turned on,
-- an invited staff member may still sign in so they can enter the email code
-- and the authenticator. A deactivated account and an invited client cannot.
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
  account_role text;
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

  select status, portal_role into account_status, account_role from public.profiles where id = uid;
  if account_status = 'deactivated' then
    perform audit.write('Sign-in blocked', '', 'Account', false, uid, 'Deactivated');
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'This account has been deactivated. Contact the clinic owner if you need access.',
      'should_logout_user', true
    );
  end if;
  if account_status = 'invited' and account_role not in ('owner', 'admin', 'holistic', 'medical') then
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

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.request_secure_link_code(text, text) to service_role;
    grant execute on function public.confirm_requisition_code(text, text) to service_role;
    grant execute on function public.prepare_sign_in_code(uuid, uuid, text) to service_role;
  end if;
end $$;
