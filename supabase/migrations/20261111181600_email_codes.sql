-- One-time codes for requisition links and for sign-in.
-- A password session cannot read data until this database has recorded a
-- code for that session. The access-token hook copies that fact into the
-- token on refresh. This file does not claim compliance with any privacy law.

alter table public.secure_links
  add column if not exists code_expires_at timestamptz,
  add column if not exists code_used_at timestamptz;

create or replace function public.request_secure_link_code(p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.secure_links%rowtype;
  legacy text;
begin
  if coalesce(p_token_hash, '') = '' or coalesce(p_code_hash, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
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
  set code_hash = p_code_hash,
      code_expires_at = now() + interval '10 minutes',
      code_used_at = null,
      code_sent_at = now(),
      code_requests = code_requests + 1,
      failed_attempts = 0
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

create or replace function public.confirm_requisition_code(p_token_hash text, p_code_hash text)
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
begin
  if coalesce(p_token_hash, '') = '' or coalesce(p_code_hash, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
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
     or link.code_hash is distinct from p_code_hash
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
  remaining := greatest(60, least(900, floor(extract(epoch from (link.expires_at - now())))::integer));
  update public.secure_links
  set code_hash = null, code_used_at = now(), last_opened_at = now(), failed_attempts = 0
  where id = link.id;
  perform audit.write('Opened requisition link', coalesce(legacy, ''), 'Requisition PDF', true, null, left(link.recipient, 180));
  return jsonb_build_object('ok', true, 'status', 'ok', 'storage_path', doc.storage_path, 'ttl_seconds', remaining, 'document_id', doc.id);
end;
$$;

revoke all on function public.confirm_requisition_code(text, text) from public, anon, authenticated;

-- Direct redemption without a code no longer opens a document.
create or replace function public.redeem_requisition_link(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return jsonb_build_object('ok', false, 'status', 'code_required');
end;
$$;

revoke all on function public.redeem_requisition_link(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.request_secure_link_code(text, text) to service_role;
    grant execute on function public.confirm_requisition_code(text, text) to service_role;
    grant execute on function public.redeem_requisition_link(text) to service_role;
  end if;
end $$;

create table private.sign_in_codes (
  user_id uuid primary key,
  session_id uuid not null,
  code_hash text,
  expires_at timestamptz,
  used_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  sent_at timestamptz,
  sends_in_window integer not null default 0,
  window_started_at timestamptz
);

create table private.sign_in_code_passes (
  session_id uuid primary key,
  user_id uuid not null,
  passed_at timestamptz not null default now()
);

alter table private.sign_in_codes enable row level security;
alter table private.sign_in_code_passes enable row level security;
revoke all on private.sign_in_codes from public, anon, authenticated;
revoke all on private.sign_in_code_passes from public, anon, authenticated;

create or replace function private.sign_in_code_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.sign_in_code_passes p
    where p.session_id = private.session_id()
      and p.user_id = auth.uid()
  );
$$;

revoke all on function private.sign_in_code_ok() from public, anon, authenticated;

create or replace function private.profile_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and private.on_access_list()
      and private.sign_in_code_ok()
  );
$$;

create or replace function private.assurance_ok()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role text := private.portal_role();
  factors integer := 0;
begin
  if not private.sign_in_code_ok() then
    return false;
  end if;
  if role in ('owner', 'admin', 'holistic', 'medical') then
    return private.aal() = 'aal2';
  end if;
  if role = 'client' then
    select count(*) into factors
    from auth.mfa_factors
    where user_id = auth.uid() and status = 'verified';
    if factors > 0 then
      return private.aal() = 'aal2';
    end if;
    return true;
  end if;
  return false;
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
  uid uuid := nullif(event ->> 'user_id', '')::uuid;
  sid uuid := nullif(claims ->> 'session_id', '')::uuid;
  user_email text;
  access private.portal_access%rowtype;
  prof public.profiles%rowtype;
  code_ok boolean := false;
begin
  select lower(u.email) into user_email from auth.users u where u.id = uid;
  select * into access from private.portal_access a where lower(a.email) = user_email;
  select * into prof from public.profiles where id = uid;

  if access.id is null
     or access.status <> 'active'
     or prof.id is null
     or prof.status = 'deactivated'
     or (access.portal = 'client' and prof.portal_role is distinct from 'client')
     or (access.portal = 'staff' and prof.portal_role is distinct from access.staff_role)
  then
    perform audit.write('Sign-in blocked', '', 'Account', false, uid, 'Not on access list');
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This account is not on the Bloom access list. Contact the clinic.'
      )
    );
  end if;

  if sid is not null then
    select exists (
      select 1 from private.sign_in_code_passes p
      where p.session_id = sid and p.user_id = uid
    ) into code_ok;
  end if;

  if jsonb_typeof(claims -> 'app_metadata') is distinct from 'object' then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  end if;
  claims := jsonb_set(claims, '{app_metadata,portal_role}', to_jsonb(prof.portal_role), true);
  claims := jsonb_set(claims, '{app_metadata,account_status}', to_jsonb(prof.status), true);
  claims := jsonb_set(claims, '{app_metadata,portal}', to_jsonb(access.portal), true);
  claims := jsonb_set(claims, '{app_metadata,email_code_ok}', to_jsonb(coalesce(code_ok, false)), true);
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
  end if;
end $$;

create or replace function public.prepare_sign_in_code(p_user_id uuid, p_session_id uuid, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row private.sign_in_codes%rowtype;
  account_email text;
begin
  if p_user_id is null or p_session_id is null or coalesce(p_code_hash, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  select lower(email) into account_email from auth.users where id = p_user_id;
  if account_email is null or account_email = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if not exists (
    select 1 from public.profiles p
    join private.portal_access a on lower(a.email) = account_email
    where p.id = p_user_id
      and p.status = 'active'
      and a.status = 'active'
      and (
        (a.portal = 'client' and p.portal_role = 'client')
        or (a.portal = 'staff' and a.staff_role = p.portal_role)
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
    user_id, session_id, code_hash, expires_at, used_at, failed_attempts, sent_at, sends_in_window, window_started_at
  ) values (
    p_user_id, p_session_id, p_code_hash, now() + interval '10 minutes', null, 0, now(), 1, now()
  )
  on conflict (user_id) do update set
    session_id = excluded.session_id,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    used_at = null,
    failed_attempts = 0,
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

create or replace function public.clear_sign_in_code(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.sign_in_codes
  set code_hash = null,
      expires_at = null,
      sent_at = null,
      sends_in_window = greatest(sends_in_window - 1, 0)
  where user_id = p_user_id;
end;
$$;

revoke all on function public.clear_sign_in_code(uuid) from public, anon, authenticated;

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
  select * into row from private.sign_in_codes where user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'rejected', 'message', 'That code was not accepted.');
  end if;
  if row.locked_until is not null and row.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked', 'message', 'Too many attempts. Try again later.');
  end if;
  hashed := encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex');
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

create or replace function public.sign_in_code_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', private.sign_in_code_ok());
end;
$$;

revoke all on function public.sign_in_code_status() from public, anon;
grant execute on function public.sign_in_code_status() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.prepare_sign_in_code(uuid, uuid, text) to service_role;
    grant execute on function public.clear_sign_in_code(uuid) to service_role;
  end if;
end $$;
