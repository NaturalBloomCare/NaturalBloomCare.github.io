-- Bloom Portals foundation.
-- Fictional testing data is loaded in a later migration. Do not put real PHI here.
-- Apply files in supabase/migrations in filename order.
-- This does not make the portal HIA or PIPA compliant.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create schema if not exists private;
create schema if not exists audit;

revoke all on schema private from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;
grant usage on schema private to postgres;
grant usage on schema audit to postgres;

-- ---------------------------------------------------------------------------
-- Helpers. These live in private so PostgREST does not expose them.
-- Authorization uses app_metadata (set by the database), never user_metadata.
-- ---------------------------------------------------------------------------

-- Created after public.profiles. See private.portal_role below.

create or replace function private.aal()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1');
$$;

create or replace function private.session_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

create table if not exists public.clinic_settings (
  id smallint primary key default 1 check (id = 1),
  environment text not null default 'testing' check (environment in ('testing', 'production')),
  display_name text not null default 'Bloom',
  legal_name text not null default 'Natural Bloom Care Inc.',
  address text not null default 'TODO: street address, Calgary, Alberta',
  phone text not null default 'TODO: clinic phone',
  fax text not null default 'TODO: clinic fax',
  email text not null default 'hello@naturalbloom.ca',
  privacy_officer text not null default 'TODO: Privacy Officer name',
  jane_portal_url text not null default '',
  idle_timeout_minutes integer not null default 15 check (idle_timeout_minutes between 5 and 60),
  new_client_days integer not null default 30 check (new_client_days between 1 and 365),
  signed_url_ttl_seconds integer not null default 120 check (signed_url_ttl_seconds between 30 and 300),
  updated_at timestamptz not null default now()
);

insert into public.clinic_settings (id) values (1) on conflict (id) do nothing;

create table if not exists private.session_touch (
  session_id uuid primary key,
  user_id uuid not null,
  last_seen timestamptz not null default now()
);

create or replace function private.session_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.session_touch t
    join auth.sessions s on s.id = t.session_id
    where t.session_id = private.session_id()
      and t.user_id = auth.uid()
      and s.user_id = auth.uid()
      and t.last_seen > now() - make_interval(mins => (
        select idle_timeout_minutes from public.clinic_settings where id = 1
      ))
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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  legacy_id text unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  portal_role text not null check (portal_role in ('owner', 'admin', 'holistic', 'medical', 'client')),
  title text not null default '',
  cred jsonb,
  status text not null default 'active' check (status in ('active', 'invited', 'deactivated')),
  revoked text[] not null default '{}',
  confidentiality text not null default '',
  mfa_label text not null default 'Not enrolled',
  is_testing boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.portal_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'portal_role', ''),
    (select p.portal_role from public.profiles p where p.id = auth.uid())
  );
$$;

create or replace function private.profile_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- Mirrors the staff portal permission matrix. Clinical keys need verified
-- credentials. NP-only keys need a verified NP registration.
create or replace function private.role_scope(role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case role
    when 'owner' then array[
      'patients.directory','operations.view','reports.view','finance.view','team.manage',
      'templates.manage','portal.manage','settings.owner','audit.view','tasks.personal',
      'hub.view','hub.manage','profile.self']
    when 'admin' then array[
      'patients.directory','patients.edit','patients.reveal_ahc','requisitions.prepare',
      'tasks.admin','documents.delivery','tasks.personal','hub.view','profile.self']
    when 'holistic' then array[
      'patients.assigned','clinical.view','careplans.write','tasks.clinical',
      'tasks.personal','hub.view','profile.self']
    when 'medical' then array[
      'patients.assigned','clinical.view','forms.generate','requisitions.authorize',
      'results.enter','results.publish','careplans.write','careplans.publish',
      'tasks.clinical','tasks.personal','hub.view','profile.self']
    else array[]::text[]
  end;
$$;

create or replace function private.has_perm(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
  clinical boolean := perm in (
    'clinical.view','forms.generate','requisitions.authorize','results.enter',
    'results.publish','careplans.write','careplans.publish','tasks.clinical');
  np_only boolean := perm in (
    'forms.generate','requisitions.authorize','results.enter','results.publish','careplans.publish');
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.status <> 'active' then
    return false;
  end if;
  if not (perm = any (private.role_scope(p.portal_role))) then
    return false;
  end if;
  if perm = any (coalesce(p.revoked, '{}')) then
    return false;
  end if;
  if clinical and not coalesce((p.cred ->> 'verified')::boolean, false) then
    return false;
  end if;
  if np_only and not (
    coalesce(p.cred ->> 'type', '') = 'NP'
    and coalesce((p.cred ->> 'verified')::boolean, false)
  ) then
    return false;
  end if;
  return private.assurance_ok() and private.session_ok() and private.profile_active();
end;
$$;

-- ---------------------------------------------------------------------------
-- People and the minimum record needed to address a person.
-- Date of birth, contact details and PHN are not on the public table.
-- Diagnoses, history, labs, prescriptions and NP treatment plans are not stored.
-- ---------------------------------------------------------------------------

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  auth_user_id uuid unique references auth.users (id),
  first_name text not null,
  last_name text not null,
  preferred_name text not null default '',
  city text not null default '',
  province text not null default 'AB' check (province = 'AB'),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  joined_on date not null default current_date,
  np_profile_id uuid references public.profiles (id),
  hns_profile_id uuid references public.profiles (id),
  jane_chart_ref text not null default '',
  jane_state text not null default 'unlinked' check (jane_state in ('matched', 'update', 'unlinked')),
  sharing_wish text not null default '',
  guardian_patient_id uuid references public.patients (id),
  is_testing boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.patient_contact (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  dob date not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  postal_code text not null default ''
);

create table if not exists private.patient_identifiers (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  phn text not null
);

create or replace function private.my_patient()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.patients p where p.auth_user_id = auth.uid();
$$;

create or replace function private.can_see_patient(pid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.patients%rowtype;
  role text := private.portal_role();
begin
  if auth.uid() is null or not private.profile_active() then
    return false;
  end if;
  if not private.assurance_ok() or not private.session_ok() then
    return false;
  end if;
  select * into p from public.patients where id = pid;
  if not found then
    return false;
  end if;
  if role = 'client' then
    return p.auth_user_id = auth.uid();
  end if;
  if role = 'owner' then
    return private.has_perm('patients.directory');
  end if;
  if role = 'admin' then
    return private.has_perm('patients.directory');
  end if;
  if role in ('medical', 'holistic') then
    if not private.has_perm('patients.assigned') then
      return false;
    end if;
    if p.np_profile_id is distinct from auth.uid() and p.hns_profile_id is distinct from auth.uid() then
      return false;
    end if;
    if p.sharing_wish = 'medical-only' and role <> 'medical' then
      return false;
    end if;
    return true;
  end if;
  return false;
end;
$$;

-- has_perm already requires session and aal, and can_see_patient calls has_perm
-- for staff. Clients are checked above without has_perm.

create or replace function public.enforce_minor_guardian()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dob date;
  age_years integer;
  guardian_ok boolean;
begin
  select c.dob into dob from private.patient_contact c where c.patient_id = new.id;
  if dob is null then
    return new;
  end if;
  age_years := date_part('year', age(dob))::integer;
  if age_years < 18 then
    if new.guardian_patient_id is null then
      raise exception 'A client under 18 needs a parent who is an active client';
    end if;
    select exists (
      select 1
      from public.patients g
      join private.patient_contact gc on gc.patient_id = g.id
      where g.id = new.guardian_patient_id
        and g.status = 'Active'
        and date_part('year', age(gc.dob))::integer >= 18
    ) into guardian_ok;
    if not guardian_ok then
      raise exception 'A client under 18 needs a parent who is an active client';
    end if;
  end if;
  return new;
end;
$$;

-- The guardian check runs after contact details exist. Seed inserts the
-- patient, then contact, then updates the patient to fire this trigger.

create or replace function private.touch_minor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.patients set updated_at = now() where id = new.patient_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Operational records. No lab values, diagnoses, clinical notes or prescriptions.
-- ---------------------------------------------------------------------------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  time_label text not null,
  meridiem text not null check (meridiem in ('am', 'pm')),
  visit_label text not null,
  staff_ids uuid[] not null default '{}',
  state text not null,
  is_testing boolean not null default true
);

create table if not exists public.workspace_items (
  kind text not null,
  item_id text not null,
  body jsonb not null default '{}'::jsonb,
  patient_ref text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (kind, item_id)
);

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  template_name text not null,
  storage_path text not null,
  created_by uuid not null references public.profiles (id),
  released_to_patient boolean not null default false,
  created_at timestamptz not null default now(),
  is_testing boolean not null default true
);

create table if not exists public.disclosures (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  patient_id uuid references public.patients (id),
  disclosed_to text not null,
  purpose text not null,
  what_disclosed text not null,
  recorded_by uuid references public.profiles (id),
  channel text not null,
  status text not null,
  document_id uuid references public.generated_documents (id),
  is_testing boolean not null default true
);

create table if not exists public.incidents (
  id text primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id),
  kind text not null,
  happened_at text not null default '',
  patient_ref text not null default '',
  custodian_label text not null default '',
  status text not null default 'Risk-of-harm assessment needed',
  -- Free text is stored for the privacy officer. Do not copy it into logs.
  description text not null default ''
);

-- Wellness plans are not clinical care plans and cannot hold lab interpretation.
create table if not exists public.wellness_plans (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid not null references public.patients (id) on delete cascade,
  responsible_clinician_id uuid not null references public.profiles (id),
  reviewer_id uuid references public.profiles (id),
  kind text not null,
  visit_on text not null default '',
  status text not null check (status in ('Draft', 'Ready for Review', 'Approved', 'Published', 'Retired')),
  version integer not null default 1 check (version >= 1),
  body jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id),
  modified_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  published_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz,
  is_testing boolean not null default true
);

create table if not exists public.wellness_plan_versions (
  id bigint generated always as identity primary key,
  plan_id uuid not null references public.wellness_plans (id) on delete cascade,
  version integer not null,
  status text not null,
  body jsonb not null,
  actor_id uuid,
  action text not null,
  at timestamptz not null default now()
);

create table if not exists public.library_articles (
  id text primary key,
  title text not null,
  topic text not null,
  kind text not null,
  minutes text not null,
  summary text not null,
  body_html text not null,
  recommended boolean not null default false,
  published boolean not null default true,
  image_path text not null default ''
);

create table if not exists public.reference_ranges (
  id text primary key,
  marker text not null,
  unit text not null,
  range_label text not null,
  note text not null,
  sort_order integer not null default 0
);

create table if not exists public.tracking_consents (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  granted boolean not null default false,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  kind text not null check (kind in ('sleep', 'steps', 'activity', 'hrv', 'heart_rate', 'weight', 'biometric')),
  recorded_on date not null default current_date,
  value numeric,
  unit text not null default '',
  note text not null default '',
  hidden boolean not null default false,
  deleted_at timestamptz,
  source text not null default 'patient-entered' check (source = 'patient-entered'),
  created_at timestamptz not null default now()
);

create table if not exists private.login_attempts (
  user_id uuid primary key,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

create table if not exists private.secure_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.generated_documents (id) on delete cascade,
  token_hash text not null unique,
  code_hash text,
  recipient text not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Append-only audit log. The row hash chains to the previous row.
-- ---------------------------------------------------------------------------

create table if not exists audit.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_role text not null default '',
  action text not null,
  record_id text not null default '',
  info_type text not null default '',
  ok boolean not null default true,
  prev_hash text,
  row_hash text
);

create index if not exists audit_events_at_idx on audit.events (at desc);
create index if not exists audit_events_record_idx on audit.events (record_id);

create or replace function audit.stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev text;
begin
  select e.row_hash into prev from audit.events e order by e.id desc limit 1;
  new.prev_hash := coalesce(prev, 'genesis');
  new.row_hash := encode(extensions.digest(
    new.prev_hash || '|' || coalesce(new.actor_id::text, '') || '|' ||
    new.action || '|' || new.record_id || '|' || coalesce(new.info_type, '') || '|' ||
    extract(epoch from new.at)::text,
    'sha256'
  ), 'hex');
  return new;
end;
$$;

create or replace function audit.block_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The audit log is append-only';
end;
$$;

drop trigger if exists audit_stamp on audit.events;
create trigger audit_stamp before insert on audit.events
for each row execute function audit.stamp();

drop trigger if exists audit_block on audit.events;
create trigger audit_block before update or delete on audit.events
for each row execute function audit.block_change();

create or replace function audit.write(
  p_action text,
  p_record_id text,
  p_info_type text,
  p_ok boolean,
  p_actor uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role text := '';
begin
  select portal_role into role from public.profiles where id = p_actor;
  insert into audit.events (actor_id, actor_role, action, record_id, info_type, ok)
  values (p_actor, coalesce(role, ''), left(coalesce(p_action, ''), 160), left(coalesce(p_record_id, ''), 120), left(coalesce(p_info_type, ''), 120), coalesce(p_ok, true));
end;
$$;

create or replace function audit.note_read(entity text, record_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform audit.write('Read ' || left(entity, 40), record_id, entity, true);
  return true;
end;
$$;

create or replace function audit.row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec_id text;
  row_json jsonb;
begin
  if tg_op = 'DELETE' then
    row_json := to_jsonb(old);
  else
    row_json := to_jsonb(new);
  end if;
  rec_id := coalesce(row_json ->> 'id', row_json ->> 'item_id', row_json ->> 'legacy_id', '');
  perform audit.write(tg_op || ' ' || tg_table_name, rec_id, tg_table_name, true);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Wellness body must stay non-clinical.
create or replace function public.reject_clinical_wellness()
returns trigger
language plpgsql
as $$
begin
  if new.body ? 'diagnoses'
     or new.body ? 'labs'
     or new.body ? 'prescriptions'
     or new.body ? 'clinical_notes'
     or new.body ? 'treatment_plan'
     or (jsonb_typeof(new.body -> 'bio') = 'array' and jsonb_array_length(new.body -> 'bio') > 0) then
    raise exception 'Clinical treatment content is delivered through Jane and is not stored in the portal';
  end if;
  if new.status = 'Published' and (new.approved_by is null or new.published_by is null) then
    raise exception 'A wellness plan needs NP approval before it is published';
  end if;
  return new;
end;
$$;

create or replace function public.version_wellness_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wellness_plan_versions (plan_id, version, status, body, actor_id, action)
  values (new.id, new.version, new.status, new.body, auth.uid(), tg_op);
  return new;
end;
$$;

drop trigger if exists wellness_guard on public.wellness_plans;
create trigger wellness_guard before insert or update on public.wellness_plans
for each row execute function public.reject_clinical_wellness();

drop trigger if exists wellness_version on public.wellness_plans;
create trigger wellness_version after insert or update on public.wellness_plans
for each row execute function public.version_wellness_plan();

drop trigger if exists minor_check on public.patients;
create trigger minor_check before update on public.patients
for each row execute function public.enforce_minor_guardian();

drop trigger if exists contact_minor on private.patient_contact;
create trigger contact_minor after insert or update on private.patient_contact
for each row execute function private.touch_minor();

-- Change triggers. Reads of health-adjacent rows go through note_read in RPCs,
-- because Postgres cannot attach a trigger to SELECT.
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients','appointments','generated_documents','disclosures','incidents',
    'wellness_plans','tracking_entries','tracking_consents','workspace_items'
  ]
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function audit.row_change()',
      t
    );
  end loop;
end $$;

create or replace function public.block_disclosure_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The disclosure log is append-only';
end;
$$;

drop trigger if exists disclosures_block on public.disclosures;
create trigger disclosures_block before update or delete on public.disclosures
for each row execute function public.block_disclosure_change();

create or replace function public.block_version_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Plan versions are append-only';
end;
$$;

drop trigger if exists versions_block on public.wellness_plan_versions;
create trigger versions_block before update or delete on public.wellness_plan_versions
for each row execute function public.block_version_change();

create or replace function public.tracking_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.source := 'patient-entered';
  if private.portal_role() = 'client' then
    if new.patient_id is distinct from private.my_patient() then
      raise exception 'You can only change your own tracking';
    end if;
    if not exists (
      select 1 from public.tracking_consents c
      where c.patient_id = new.patient_id and c.granted
    ) then
      raise exception 'Tracking consent is required first';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tracking_guard on public.tracking_entries;
create trigger tracking_guard before insert or update on public.tracking_entries
for each row execute function public.tracking_guard();

-- ---------------------------------------------------------------------------
-- Row level security. Policies are restrictive where they must stack.
-- ---------------------------------------------------------------------------

alter table public.clinic_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.workspace_items enable row level security;
alter table public.generated_documents enable row level security;
alter table public.disclosures enable row level security;
alter table public.incidents enable row level security;
alter table public.wellness_plans enable row level security;
alter table public.wellness_plan_versions enable row level security;
alter table public.library_articles enable row level security;
alter table public.reference_ranges enable row level security;
alter table public.tracking_consents enable row level security;
alter table public.tracking_entries enable row level security;
alter table audit.events enable row level security;

alter table public.patients force row level security;
alter table public.tracking_entries force row level security;
alter table public.wellness_plans force row level security;
alter table public.generated_documents force row level security;
alter table public.disclosures force row level security;
alter table public.appointments force row level security;

-- Clinic-wide settings are readable by a signed-in user who has passed MFA
-- rules. They contain no patient information. The Jane URL may be blank.
create policy clinic_read on public.clinic_settings
for select to authenticated
using (private.assurance_ok() and private.session_ok() and private.profile_active());

create policy clinic_owner_write on public.clinic_settings
for update to authenticated
using (private.has_perm('settings.owner'))
with check (private.has_perm('settings.owner'));

create policy profiles_self_or_staff on public.profiles
for select to authenticated
using (
  private.assurance_ok() and private.session_ok() and private.profile_active()
  and (
    id = auth.uid()
    or (
      portal_role <> 'client'
      and private.portal_role() in ('owner', 'admin', 'medical', 'holistic')
    )
    or (
      portal_role = 'client'
      and private.portal_role() in ('admin', 'medical', 'holistic')
    )
  )
);

create policy profiles_owner_update on public.profiles
for update to authenticated
using (private.has_perm('team.manage') or id = auth.uid())
with check (private.has_perm('team.manage') or id = auth.uid());

create policy patients_select on public.patients
for select to authenticated
using (private.can_see_patient(id));

create policy patients_admin_update on public.patients
for update to authenticated
using (private.portal_role() = 'admin' and private.has_perm('patients.edit') and private.can_see_patient(id))
with check (private.portal_role() = 'admin' and private.has_perm('patients.edit'));

create policy appointments_select on public.appointments
for select to authenticated
using (private.can_see_patient(patient_id));

create policy documents_select on public.generated_documents
for select to authenticated
using (
  private.can_see_patient(patient_id)
  and (
    private.portal_role() <> 'client'
    or released_to_patient
  )
);

create policy disclosures_select on public.disclosures
for select to authenticated
using (
  private.portal_role() in ('owner', 'admin')
  and private.assurance_ok()
  and private.session_ok()
  and (patient_id is null or private.can_see_patient(patient_id) or private.portal_role() = 'owner')
);

-- Inserts of disclosures happen inside security definer functions.
create policy disclosures_staff_insert on public.disclosures
for insert to authenticated
with check (
  private.portal_role() in ('admin', 'medical', 'owner')
  and private.assurance_ok()
  and private.session_ok()
  and recorded_by = auth.uid()
);

create policy incidents_select on public.incidents
for select to authenticated
using (
  private.assurance_ok() and private.session_ok() and private.profile_active()
  and (
    private.portal_role() = 'owner'
    or actor_id = auth.uid()
  )
);

create policy incidents_insert on public.incidents
for insert to authenticated
with check (
  private.assurance_ok() and private.session_ok() and private.profile_active()
  and actor_id = auth.uid()
  and private.portal_role() in ('owner', 'admin', 'medical', 'holistic')
);

-- workspace_items is reached only through security-definer RPCs.
-- RLS stays on with no permissive policy, so a stray grant cannot dump every note.

create policy wellness_read on public.wellness_plans
for select to authenticated
using (
  private.can_see_patient(patient_id)
  and (
    private.portal_role() <> 'client'
    or status = 'Published'
  )
);

-- Patients cannot insert or update clinician-authored plans.
create policy wellness_staff_write on public.wellness_plans
for insert to authenticated
with check (
  private.portal_role() in ('holistic', 'medical')
  and private.has_perm('careplans.write')
  and private.can_see_patient(patient_id)
  and responsible_clinician_id = auth.uid()
);

create policy wellness_staff_update on public.wellness_plans
for update to authenticated
using (
  private.portal_role() in ('holistic', 'medical')
  and private.can_see_patient(patient_id)
  and (
    (private.portal_role() = 'holistic' and responsible_clinician_id = auth.uid() and status <> 'Published')
    or (private.portal_role() = 'medical' and private.has_perm('careplans.publish'))
  )
)
with check (
  private.portal_role() in ('holistic', 'medical')
  and private.can_see_patient(patient_id)
);

create policy wellness_versions_read on public.wellness_plan_versions
for select to authenticated
using (
  exists (
    select 1 from public.wellness_plans w
    where w.id = plan_id and private.can_see_patient(w.patient_id) and private.portal_role() <> 'client'
  )
);

create policy library_read on public.library_articles
for select to authenticated
using (
  published
  and private.assurance_ok()
  and private.session_ok()
  and private.profile_active()
);

create policy ranges_read on public.reference_ranges
for select to authenticated
using (private.assurance_ok() and private.session_ok() and private.profile_active());

create policy consent_rw on public.tracking_consents
for all to authenticated
using (patient_id = private.my_patient() and private.assurance_ok() and private.session_ok())
with check (patient_id = private.my_patient() and private.assurance_ok() and private.session_ok());

create policy tracking_patient on public.tracking_entries
for all to authenticated
using (
  patient_id = private.my_patient()
  and private.assurance_ok()
  and private.session_ok()
  and deleted_at is null
)
with check (
  patient_id = private.my_patient()
  and private.assurance_ok()
  and private.session_ok()
  and source = 'patient-entered'
);

create policy tracking_care_team_read on public.tracking_entries
for select to authenticated
using (
  private.portal_role() in ('medical', 'holistic')
  and private.can_see_patient(patient_id)
  and hidden = false
  and deleted_at is null
  and exists (
    select 1 from public.tracking_consents c
    where c.patient_id = tracking_entries.patient_id and c.granted
  )
);

-- Audit rows are not world-readable. Owners read them through an RPC.
create policy audit_none on audit.events
for select to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- Grants. Default Supabase grants are revoked, then the minimum is restored.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema audit from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select on public.clinic_settings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.patients to authenticated;
grant select on public.appointments to authenticated;
grant select on public.generated_documents to authenticated;
grant select, insert on public.disclosures to authenticated;
grant select, insert on public.incidents to authenticated;
grant select, insert, update on public.wellness_plans to authenticated;
grant select on public.wellness_plan_versions to authenticated;
grant select on public.library_articles to authenticated;
grant select on public.reference_ranges to authenticated;
grant select, insert, update on public.tracking_consents to authenticated;
grant select, insert, update on public.tracking_entries to authenticated;

grant usage on schema audit to postgres;

-- No sequence grants for disclosures identity to authenticated: inserts from
-- the API that omit id still need the sequence. Grant it.
grant usage, select on all sequences in schema public to authenticated;
