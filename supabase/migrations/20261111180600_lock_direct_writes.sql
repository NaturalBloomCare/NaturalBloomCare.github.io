-- Closes two blockers found in the rehearsal of migrations 1-6 and hardens function privileges.
-- The portals only write through SECURITY DEFINER RPCs (staff_commit, approve_wellness_plan, ...)
-- and the storage upload, so removing direct table writes does not change any screen.

-- B1: any signed-in user could UPDATE their own public.profiles row (portal_role, cred, status, revoked).
revoke update on public.profiles from authenticated;
-- (the owner edits staff through staff_commit, which is SECURITY DEFINER and keeps working)

-- B2: holistic/medical users could INSERT/UPDATE wellness_plans directly and mark a plan Published with
--     themselves as approver. Writes must go through staff_commit or approve_wellness_plan.
revoke insert, update on public.wellness_plans from authenticated;

-- Admin edits to patients also go through staff_commit (jane link) or are not offered in the UI.
revoke update on public.patients from authenticated;

-- Hardening: SECURITY DEFINER RPCs should not be executable by anon or PUBLIC.
revoke execute on function public.staff_bootstrap() from public, anon;
revoke execute on function public.staff_commit(jsonb) from public, anon;
revoke execute on function public.reveal_phn(text, text) from public, anon;
revoke execute on function public.register_generated_document(text, text, text) from public, anon;
revoke execute on function public.client_home() from public, anon;
revoke execute on function public.set_tracking_consent(boolean) from public, anon;
revoke execute on function public.save_tracking_entry(text, date, numeric, text, text) from public, anon;
revoke execute on function public.hide_tracking_entry(uuid, boolean) from public, anon;
revoke execute on function public.delete_tracking_entry(uuid) from public, anon;
revoke execute on function public.security_summary() from public, anon;

-- A herbalist may only leave a plan as Draft or Ready for Review.
-- Approved and Published require the signed-in user to be a verified NP, and that user must be the approver.
create or replace function public.reject_clinical_wellness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_np boolean := false;
begin
  if new.body ? 'diagnoses'
     or new.body ? 'labs'
     or new.body ? 'prescriptions'
     or new.body ? 'clinical_notes'
     or new.body ? 'treatment_plan'
     or (jsonb_typeof(new.body -> 'bio') = 'array' and jsonb_array_length(new.body -> 'bio') > 0) then
    raise exception 'Clinical treatment content is delivered through Jane and is not stored in the portal';
  end if;

  select p.portal_role,
         coalesce(p.cred ->> 'type', '') = 'NP'
           and coalesce((p.cred ->> 'verified')::boolean, false)
    into caller_role, caller_np
  from public.profiles p
  where p.id = auth.uid();

  if caller_role = 'holistic' then
    if new.status not in ('Draft', 'Ready for Review') then
      raise exception 'A herbalist can only save a wellness plan as Draft or Ready for Review';
    end if;
    if tg_op = 'UPDATE' and (
      new.approved_by is distinct from old.approved_by
      or new.published_by is distinct from old.published_by
    ) then
      raise exception 'A herbalist cannot approve or publish a wellness plan';
    end if;
  end if;

  if new.status in ('Approved', 'Published') and (
    tg_op = 'INSERT'
    or old.status is distinct from new.status
    or old.approved_by is distinct from new.approved_by
    or old.published_by is distinct from new.published_by
  ) then
    if not caller_np or caller_role is distinct from 'medical' or auth.uid() is null then
      raise exception 'Only a Nurse Practitioner can approve or publish a wellness plan';
    end if;
    if new.approved_by is distinct from auth.uid() then
      raise exception 'The approver must be the Nurse Practitioner who is signed in';
    end if;
    if new.status = 'Published' and new.published_by is distinct from auth.uid() then
      raise exception 'The publisher must be the Nurse Practitioner who is signed in';
    end if;
  end if;

  return new;
end;
$$;

-- Hardening: pin search_path on the four trigger helpers that lacked it.
alter function public.reject_clinical_wellness() set search_path = '';
alter function public.block_disclosure_change() set search_path = '';
alter function public.block_version_change() set search_path = '';
alter function audit.block_change() set search_path = '';

create or replace function public.staff_commit(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  item jsonb;
  legacy text;
  pid uuid;
  wid uuid;
begin
  perform public.touch_session();
  select * into me from public.profiles where id = auth.uid();
  if not found or me.status <> 'active' or me.portal_role not in ('owner', 'admin', 'holistic', 'medical') then
    raise exception 'Staff access only';
  end if;
  if not private.assurance_ok() then
    raise exception 'A verified second factor is required';
  end if;

  if me.portal_role = 'owner' and payload ? 'clinic' then
    update public.clinic_settings set
      display_name = coalesce(payload #>> '{clinic,name}', display_name),
      legal_name = coalesce(payload #>> '{clinic,legal}', legal_name),
      address = coalesce(payload #>> '{clinic,address}', address),
      phone = coalesce(payload #>> '{clinic,phone}', phone),
      fax = coalesce(payload #>> '{clinic,fax}', fax),
      email = coalesce(payload #>> '{clinic,email}', email),
      privacy_officer = coalesce(payload #>> '{clinic,privacy}', privacy_officer),
      jane_portal_url = coalesce(payload #>> '{clinic,janeUrl}', jane_portal_url),
      idle_timeout_minutes = coalesce((payload ->> 'timeout')::integer, idle_timeout_minutes),
      new_client_days = coalesce((payload ->> 'newDays')::integer, new_client_days),
      updated_at = now()
    where id = 1;
    perform audit.write('Updated clinic information', '', 'Clinic settings', true);
  end if;

  if me.portal_role = 'owner' and jsonb_typeof(payload -> 'staff') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'staff')
    loop
      update public.profiles set
        status = coalesce(item ->> 'status', status),
        revoked = coalesce(
          (select array_agg(value) from jsonb_array_elements_text(coalesce(item -> 'revoked', '[]'::jsonb)) as t(value)),
          '{}'
        ),
        confidentiality = coalesce(item ->> 'conf', confidentiality),
        mfa_label = coalesce(item ->> 'mfa', mfa_label),
        title = coalesce(item ->> 'title', title),
        updated_at = now()
      where legacy_id = item ->> 'id' and portal_role <> 'client';
      if not found and coalesce(item ->> 'status', '') = 'invited' and item ->> 'email' is not null then
        perform private.invite_staff(
          item ->> 'email',
          item ->> 'first',
          item ->> 'last',
          item ->> 'role',
          coalesce(item ->> 'title', '')
        );
      end if;
    end loop;
  elsif payload ? 'staff' then
    -- A staff member may update only their own confidentiality acknowledgement.
    for item in select * from jsonb_array_elements(payload -> 'staff')
    loop
      if item ->> 'id' = me.legacy_id then
        update public.profiles set
          confidentiality = coalesce(item ->> 'conf', confidentiality),
          mfa_label = coalesce(item ->> 'mfa', mfa_label),
          updated_at = now()
        where id = auth.uid();
      end if;
    end loop;
  end if;

  if me.portal_role = 'admin' and jsonb_typeof(payload -> 'reqs') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'reqs')
    loop
      perform private.upsert_item('req', item ->> 'id', item, item ->> 'pid');
    end loop;
  elsif me.portal_role = 'medical' and jsonb_typeof(payload -> 'reqs') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'reqs')
    loop
      if item ->> 'np' = me.legacy_id then
        perform private.upsert_item('req', item ->> 'id', item, item ->> 'pid');
      end if;
    end loop;
  end if;

  if me.portal_role = 'admin' and jsonb_typeof(payload -> 'tasks') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'tasks')
    loop
      perform private.upsert_item('task', item ->> 'id', item, coalesce(item ->> 'pid', ''));
    end loop;
  end if;

  if jsonb_typeof(payload -> 'ctasks') = 'array' and me.portal_role in ('medical', 'holistic', 'admin') then
    for item in select * from jsonb_array_elements(payload -> 'ctasks')
    loop
      if item ->> 'who' = me.legacy_id or me.portal_role = 'admin' then
        perform private.upsert_item('ctask', item ->> 'id', item, coalesce(item ->> 'pid', ''));
      end if;
    end loop;
  end if;

  if jsonb_typeof(payload -> 'notes') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'notes')
    loop
      if me.portal_role = 'owner'
         or item ->> 'from' = me.legacy_id
         or item ->> 'to' = me.legacy_id then
        perform private.upsert_item('note', item ->> 'id', item, coalesce(item ->> 'pid', ''));
      end if;
    end loop;
  end if;

  if me.portal_role = 'owner' and jsonb_typeof(payload -> 'templates') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'templates')
    loop
      perform private.upsert_item('template', item ->> 'id', item, '');
    end loop;
  end if;

  if me.portal_role = 'owner' and jsonb_typeof(payload -> 'library') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'library')
    loop
      update public.library_articles
      set published = coalesce((item ->> 'on')::boolean, published)
      where id = item ->> 'id';
    end loop;
  end if;

  if me.portal_role = 'owner' and payload ? 'hub' then
    perform private.upsert_item('hub', 'state', payload -> 'hub', '');
  end if;
  if me.portal_role = 'owner' and payload ? 'vac' then
    perform private.upsert_item('vac', 'state', payload -> 'vac', '');
  elsif payload ? 'vac' then
    -- Non-owners may append their own request; the stored document is replaced
    -- only when the owner saves. Their new request is merged below.
    if jsonb_typeof(payload #> '{vac,requests}') = 'array' then
      for item in select * from jsonb_array_elements(payload #> '{vac,requests}')
      loop
        if item ->> 'uid' = me.legacy_id then
          perform private.upsert_item('vac_request', item ->> 'id', item, '');
        end if;
      end loop;
    end if;
  end if;

  if me.portal_role = 'owner' and payload ? 'compliance' then
    perform private.upsert_item('compliance', 'state', payload -> 'compliance', '');
  end if;

  if me.portal_role = 'admin' and jsonb_typeof(payload -> 'jane') = 'object' then
    for legacy, item in select * from jsonb_each(payload -> 'jane')
    loop
      update public.patients set jane_state = item #>> '{}', updated_at = now()
      where legacy_id = legacy and jane_state is distinct from (item #>> '{}');
    end loop;
  end if;

  if jsonb_typeof(payload -> 'wellness') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'wellness')
    loop
      if coalesce(item ->> 'type', 'wellness') <> 'wellness' then
        continue;
      end if;
      select id into pid from public.patients where legacy_id = item ->> 'pid';
      if pid is null or not private.can_see_patient(pid) then
        continue;
      end if;
      select id into wid from public.wellness_plans where legacy_id = item ->> 'id';
      if me.portal_role = 'holistic'
         and coalesce(item ->> 'status', 'Draft') not in ('Draft', 'Ready for Review') then
        raise exception 'A herbalist can only save a wellness plan as Draft or Ready for Review';
      end if;
      if wid is null and me.portal_role = 'holistic' then
        insert into public.wellness_plans (
          legacy_id, patient_id, responsible_clinician_id, reviewer_id, kind, visit_on,
          status, version, body, created_by, modified_by
        ) values (
          item ->> 'id', pid, auth.uid(),
          (select np_profile_id from public.patients where id = pid),
          coalesce(item ->> 'kind', 'Wellness consult'),
          coalesce(item ->> 'date', ''),
          coalesce(item ->> 'status', 'Draft'), 1,
          coalesce(item -> 'body', '{}'::jsonb),
          auth.uid(), auth.uid()
        );
      elsif wid is not null and me.portal_role = 'holistic' then
        update public.wellness_plans set
          body = coalesce(item -> 'body', body),
          kind = coalesce(item ->> 'kind', kind),
          status = coalesce(item ->> 'status', status),
          modified_by = auth.uid(),
          modified_at = now(),
          version = version + 1
        where id = wid and responsible_clinician_id = auth.uid() and status <> 'Published';
      elsif wid is not null and me.portal_role = 'medical' and private.has_perm('careplans.write') then
        -- Approval and publication are not done here. The Nurse Practitioner calls approve_wellness_plan.
        update public.wellness_plans set
          body = coalesce(item -> 'body', body),
          kind = coalesce(item ->> 'kind', kind),
          modified_by = auth.uid(),
          modified_at = now()
        where id = wid;
      end if;
    end loop;
  end if;

  if jsonb_typeof(payload -> 'incidents') = 'array' then
    for item in select * from jsonb_array_elements(payload -> 'incidents')
    loop
      insert into public.incidents (id, actor_id, kind, happened_at, patient_ref, custodian_label, status, description)
      values (
        item ->> 'id', auth.uid(), coalesce(item ->> 'kind', 'Concern'),
        coalesce(item ->> 'when', ''), coalesce(item ->> 'pid', ''),
        coalesce(item ->> 'cust', ''), coalesce(item ->> 'status', 'Risk-of-harm assessment needed'),
        left(coalesce(item ->> 'description', ''), 2000)
      )
      on conflict (id) do nothing;
    end loop;
  end if;

  perform audit.write('Saved staff workspace', '', 'Workspace', true);
  return jsonb_build_object('ok', true);
end;
$$;



create or replace function public.approve_wellness_plan(p_legacy_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  plan public.wellness_plans%rowtype;
begin
  perform public.touch_session();
  select * into me from public.profiles where id = auth.uid();
  if not found
     or me.status <> 'active'
     or me.portal_role is distinct from 'medical'
     or coalesce(me.cred ->> 'type', '') is distinct from 'NP'
     or coalesce((me.cred ->> 'verified')::boolean, false) is not true
     or not private.has_perm('careplans.publish')
     or not private.assurance_ok() then
    raise exception 'Only a Nurse Practitioner can approve or publish a wellness plan';
  end if;
  if p_status not in ('Approved', 'Published') then
    raise exception 'Status must be Approved or Published';
  end if;
  select * into plan from public.wellness_plans where legacy_id = p_legacy_id;
  if not found or not private.can_see_patient(plan.patient_id) then
    raise exception 'Not permitted';
  end if;
  update public.wellness_plans set
    status = p_status,
    reviewer_id = auth.uid(),
    approved_by = auth.uid(),
    approved_at = coalesce(approved_at, now()),
    published_by = case when p_status = 'Published' then auth.uid() else published_by end,
    published_at = case when p_status = 'Published' then coalesce(published_at, now()) else published_at end,
    modified_by = auth.uid(),
    modified_at = now(),
    version = version + 1
  where id = plan.id;
  perform audit.write(
    case when p_status = 'Published' then 'Published wellness plan' else 'Approved wellness plan' end,
    p_legacy_id,
    'Wellness plan',
    true
  );
end;
$$;

revoke all on function public.approve_wellness_plan(text, text) from public, anon;
grant execute on function public.approve_wellness_plan(text, text) to authenticated;

-- Defense in depth: API roles cannot read the private tables even if a grant is added later.
alter table private.patient_contact enable row level security;
alter table private.patient_identifiers enable row level security;
alter table private.login_attempts enable row level security;
alter table private.session_touch enable row level security;
revoke all on table private.patient_contact from anon, authenticated;
revoke all on table private.patient_identifiers from anon, authenticated;
revoke all on table private.login_attempts from anon, authenticated;
revoke all on table private.session_touch from anon, authenticated;

alter table public.secure_links
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;
