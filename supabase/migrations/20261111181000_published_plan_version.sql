-- A published wellness plan stays as it was approved.
-- An NP edit creates or updates one draft row. It does not change the published body.

create or replace function public.block_published_wellness_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'Published'
     and (new.body is distinct from old.body or new.kind is distinct from old.kind) then
    raise exception 'A published wellness plan cannot be edited. Save the change as a new version.';
  end if;
  return new;
end;
$$;

revoke all on function public.block_published_wellness_edit() from public, anon, authenticated;

drop trigger if exists block_published_wellness_edit on public.wellness_plans;
create trigger block_published_wellness_edit
before update on public.wellness_plans
for each row execute function public.block_published_wellness_edit();

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
  draft_id uuid;
  revisions jsonb := '[]'::jsonb;
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
        -- A published row is immutable. A different body or kind becomes one open draft.
        if (select status from public.wellness_plans where id = wid) = 'Published' then
          if exists (
            select 1 from public.wellness_plans w
            where w.id = wid
              and (
                w.body is distinct from coalesce(item -> 'body', w.body)
                or w.kind is distinct from coalesce(item ->> 'kind', w.kind)
              )
          ) then
            select d.id into draft_id
            from public.wellness_plans d
            join public.wellness_plans w on w.id = wid
            where d.patient_id = w.patient_id
              and d.status in ('Draft', 'Ready for Review')
              and d.legacy_id like w.legacy_id || '-draft-%'
            order by d.created_at desc
            limit 1;
            if draft_id is not null then
              update public.wellness_plans set
                body = coalesce(item -> 'body', body),
                kind = coalesce(item ->> 'kind', kind),
                modified_by = auth.uid(),
                modified_at = now()
              where id = draft_id
                and (
                  body is distinct from coalesce(item -> 'body', body)
                  or kind is distinct from coalesce(item ->> 'kind', kind)
                );
            else
              insert into public.wellness_plans (
                legacy_id, patient_id, responsible_clinician_id, reviewer_id, kind, visit_on,
                status, version, body, created_by, modified_by
              )
              select
                w.legacy_id || '-draft-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
                w.patient_id,
                w.responsible_clinician_id,
                w.reviewer_id,
                coalesce(item ->> 'kind', w.kind),
                w.visit_on,
                'Draft',
                w.version + 1,
                coalesce(item -> 'body', w.body),
                auth.uid(),
                auth.uid()
              from public.wellness_plans w
              where w.id = wid
              returning legacy_id into legacy;
              revisions := revisions || jsonb_build_array(legacy);
            end if;
          end if;
        else
          update public.wellness_plans set
            body = coalesce(item -> 'body', body),
            kind = coalesce(item ->> 'kind', kind),
            modified_by = auth.uid(),
            modified_at = now()
          where id = wid and status <> 'Published';
        end if;
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
  return jsonb_build_object('ok', true, 'revisions', revisions);
end;
$$;



