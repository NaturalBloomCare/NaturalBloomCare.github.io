-- Bloom portal access list.
-- Only a person on this list can receive a token, and only for the portal and role named here.
-- This file does not create accounts. Clover applies the sheet after review.
-- The custom access token hook must be enabled in the dashboard or this check does not run.
-- Set a short JWT expiry so an inactivated row cuts off refresh quickly.

create table private.portal_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  phone text,
  portal text not null check (portal in ('staff', 'client')),
  staff_role text check (staff_role in ('owner', 'admin', 'medical', 'holistic')),
  status text not null check (status in ('active', 'inactive')),
  parent_guardian_email text,
  notes text,
  date_added date,
  date_removed date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_access_staff_role check ((portal = 'staff') = (staff_role is not null))
);

create unique index portal_access_email_lower_idx on private.portal_access (lower(email));

create or replace function private.portal_access_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(trim(new.email), '') = '' then
    raise exception 'An access-list email is required';
  end if;
  new.email := lower(trim(new.email));
  if new.parent_guardian_email is not null then
    new.parent_guardian_email := nullif(lower(trim(new.parent_guardian_email)), '');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.portal_access_normalize() from public, anon, authenticated;

drop trigger if exists portal_access_normalize on private.portal_access;
create trigger portal_access_normalize
before insert or update on private.portal_access
for each row execute function private.portal_access_normalize();

alter table private.portal_access enable row level security;
revoke all on table private.portal_access from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant select on table private.portal_access to supabase_auth_admin;
    execute 'drop policy if exists portal_access_auth_admin on private.portal_access';
    execute $policy$
      create policy portal_access_auth_admin
      on private.portal_access
      for select
      to supabase_auth_admin
      using (true)
    $policy$;
  end if;
end $$;

-- True when the signed-in user's profile matches one active access-list row.
create or replace function private.on_access_list()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    join private.portal_access a on lower(a.email) = lower(u.email)
    where u.id = auth.uid()
      and a.status = 'active'
      and (
        (a.portal = 'client' and p.portal_role = 'client')
        or (a.portal = 'staff' and a.staff_role = p.portal_role)
      )
  );
$$;

revoke all on function private.on_access_list() from public, anon, authenticated;

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
  );
$$;

create or replace function private.portal_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.on_access_list() then coalesce(
      nullif(auth.jwt() -> 'app_metadata' ->> 'portal_role', ''),
      (select p.portal_role from public.profiles p where p.id = auth.uid())
    )
    else null
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
  user_email text;
  access private.portal_access%rowtype;
  prof public.profiles%rowtype;
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

  if jsonb_typeof(claims -> 'app_metadata') is distinct from 'object' then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  end if;
  claims := jsonb_set(claims, '{app_metadata,portal_role}', to_jsonb(prof.portal_role), true);
  claims := jsonb_set(claims, '{app_metadata,account_status}', to_jsonb(prof.status), true);
  claims := jsonb_set(claims, '{app_metadata,portal}', to_jsonb(access.portal), true);
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

-- Hosted Auth has last_sign_in_at. The local rehearsal database may not.
create or replace function private.user_has_signed_in(p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  signed_in boolean := false;
begin
  if p_id is null then
    return false;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'last_sign_in_at'
  ) then
    execute 'select last_sign_in_at is not null from auth.users where id = $1'
      into signed_in using p_id;
  end if;
  return coalesce(signed_in, false);
end;
$$;

revoke all on function private.user_has_signed_in(uuid) from public, anon, authenticated;

create or replace function private.apply_access_list(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  incoming text[];
  em text;
  listed_portal text;
  listed_role text;
  listed_status text;
  rec private.portal_access%rowtype;
  prof public.profiles%rowtype;
  next_status text;
  legacy text;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'The access list must be a list of rows';
  end if;

  select coalesce(array_agg(distinct lower(trim(x ->> 'email'))), '{}')
    into incoming
  from jsonb_array_elements(p_rows) x
  where coalesce(trim(x ->> 'email'), '') <> '';

  for rec in
    select * from private.portal_access a
    where a.status = 'active'
      and a.email <> all (incoming)
  loop
    update private.portal_access
    set status = 'inactive', date_removed = current_date
    where id = rec.id;
    update public.profiles
    set status = 'deactivated', updated_at = now()
    where lower(email) = rec.email
      and status is distinct from 'deactivated';
    select legacy_id into legacy from public.profiles where lower(email) = rec.email;
    perform audit.write(
      'Updated access list',
      coalesce(legacy, rec.id::text),
      'Account',
      false,
      auth.uid(),
      'inactive'
    );
  end loop;

  for item in select * from jsonb_array_elements(p_rows)
  loop
    em := lower(trim(item ->> 'email'));
    if em is null or em = '' then
      continue;
    end if;
    listed_portal := lower(trim(item ->> 'portal'));
    listed_role := nullif(lower(trim(coalesce(item ->> 'staff_role', ''))), '');
    if listed_portal not in ('staff', 'client') then
      raise exception 'Access list portal must be staff or client';
    end if;
    if lower(trim(coalesce(item ->> 'status', ''))) = 'active' then
      listed_status := 'active';
    else
      listed_status := 'inactive';
    end if;
    if listed_portal = 'client' then
      listed_role := null;
    elsif listed_role is null or listed_role not in ('owner', 'admin', 'medical', 'holistic') then
      raise exception 'A staff access row needs a role';
    end if;

    select * into rec from private.portal_access where email = em;
    if rec.id is null then
      insert into private.portal_access (
        email, full_name, phone, portal, staff_role, status,
        parent_guardian_email, notes, date_added, date_removed
      ) values (
        em,
        nullif(item ->> 'full_name', ''),
        nullif(item ->> 'phone', ''),
        listed_portal,
        listed_role,
        listed_status,
        nullif(item ->> 'parent_guardian_email', ''),
        nullif(item ->> 'notes', ''),
        coalesce(nullif(item ->> 'date_added', '')::date, current_date),
        case when listed_status = 'inactive' then current_date else null end
      )
      returning * into rec;
      select legacy_id into legacy from public.profiles where lower(email) = em;
      perform audit.write('Updated access list', coalesce(legacy, rec.id::text), 'Account', true, auth.uid(), listed_status);
    else
      update private.portal_access set
        full_name = nullif(item ->> 'full_name', ''),
        phone = nullif(item ->> 'phone', ''),
        portal = listed_portal,
        staff_role = listed_role,
        status = listed_status,
        parent_guardian_email = nullif(item ->> 'parent_guardian_email', ''),
        notes = nullif(item ->> 'notes', ''),
        date_added = coalesce(nullif(item ->> 'date_added', '')::date, date_added),
        date_removed = case
          when listed_status = 'inactive' then coalesce(date_removed, current_date)
          else null
        end
      where id = rec.id
        and (
          full_name is distinct from nullif(item ->> 'full_name', '')
          or phone is distinct from nullif(item ->> 'phone', '')
          or portal is distinct from listed_portal
          or staff_role is distinct from listed_role
          or status is distinct from listed_status
          or parent_guardian_email is distinct from nullif(lower(trim(coalesce(item ->> 'parent_guardian_email', ''))), '')
          or notes is distinct from nullif(item ->> 'notes', '')
        );
      if found then
        select legacy_id into legacy from public.profiles where lower(email) = em;
        perform audit.write(
          'Updated access list',
          coalesce(legacy, rec.id::text),
          'Account',
          listed_status = 'active',
          auth.uid(),
          case when listed_role is null then listed_status else listed_status || ' ' || listed_role end
        );
      end if;
    end if;

    select * into prof from public.profiles where lower(email) = em;
    if prof.id is not null then
      if listed_status = 'inactive' then
        next_status := 'deactivated';
      elsif listed_portal = 'client' then
        next_status := 'active';
      elsif prof.status = 'active' or private.user_has_signed_in(prof.id) then
        next_status := 'active';
      else
        next_status := 'invited';
      end if;
      if prof.status is distinct from next_status
         or (listed_portal = 'staff' and prof.portal_role is distinct from listed_role)
         or (listed_portal = 'client' and prof.portal_role is distinct from 'client')
      then
        update public.profiles set
          status = next_status,
          portal_role = case
            when listed_portal = 'staff' then listed_role
            else 'client'
          end,
          updated_at = now()
        where id = prof.id;
        perform audit.write(
          'Updated access list',
          coalesce(prof.legacy_id, ''),
          'Account',
          next_status <> 'deactivated',
          auth.uid(),
          'profile ' || next_status
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function private.apply_access_list(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function private.apply_access_list(jsonb) to service_role;
  end if;
end $$;

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
  em text := lower(trim(p_email));
begin
  if private.portal_role() <> 'owner' then
    raise exception 'Not permitted';
  end if;
  if p_role not in ('owner', 'admin', 'holistic', 'medical') then
    raise exception 'Unknown role';
  end if;
  if not exists (
    select 1 from private.portal_access a
    where a.email = em
      and a.portal = 'staff'
      and a.status = 'active'
      and a.staff_role = p_role
  ) then
    raise exception 'Add this person to the access list first';
  end if;
  if exists (select 1 from auth.users where lower(email) = em) then
    raise exception 'An account with that email already exists';
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid, 'authenticated', 'authenticated', em,
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
    jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', false),
    'email', uid::text, now(), now(), now()
  );
  insert into public.profiles (
    id, legacy_id, first_name, last_name, email, portal_role, title, status, confidentiality, mfa_label
  ) values (
    uid, legacy, coalesce(p_first, ''), coalesce(p_last, ''), em,
    p_role, coalesce(p_title, ''), 'invited', 'Required before first sign-in', 'Not enrolled'
  );
  perform audit.write('Invited staff', legacy, 'Staff account', true, auth.uid(), p_role);
end;
$$;

revoke all on function private.invite_staff(text, text, text, text, text) from public, anon, authenticated;
