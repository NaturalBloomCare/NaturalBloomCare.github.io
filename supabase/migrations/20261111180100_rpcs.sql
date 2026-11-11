-- Callable functions. Each one checks the caller. Trigger helpers are not callable
-- from the API.

alter table audit.events add column if not exists detail text not null default '';

drop function if exists audit.write(text, text, text, boolean, uuid);

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
    coalesce(new.action, '') || '|' || coalesce(new.record_id, '') || '|' ||
    coalesce(new.info_type, '') || '|' || coalesce(new.detail, '') || '|' ||
    extract(epoch from new.at)::text,
    'sha256'
  ), 'hex');
  return new;
end;
$$;

create or replace function audit.write(
  p_action text,
  p_record_id text,
  p_info_type text,
  p_ok boolean,
  p_actor uuid default auth.uid(),
  p_detail text default ''
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
  insert into audit.events (actor_id, actor_role, action, record_id, info_type, ok, detail)
  values (
    p_actor,
    coalesce(role, ''),
    left(coalesce(p_action, ''), 160),
    left(coalesce(p_record_id, ''), 120),
    left(coalesce(p_info_type, ''), 120),
    coalesce(p_ok, true),
    left(coalesce(p_detail, ''), 180)
  );
end;
$$;

create or replace function public.touch_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid := private.session_id();
  mins integer;
  seen timestamptz;
begin
  if auth.uid() is null or sid is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from auth.sessions s where s.id = sid and s.user_id = auth.uid()) then
    raise exception 'Session is no longer valid';
  end if;
  select idle_timeout_minutes into mins from public.clinic_settings where id = 1;
  select last_seen into seen from private.session_touch where session_id = sid;
  if seen is not null and seen <= now() - make_interval(mins => mins) then
    raise exception 'Session expired after inactivity';
  end if;
  insert into private.session_touch (session_id, user_id, last_seen)
  values (sid, auth.uid(), now())
  on conflict (session_id) do update set last_seen = now(), user_id = excluded.user_id;
end;
$$;

create or replace function public.log_audit(
  p_action text,
  p_record_id text default '',
  p_info_type text default '',
  p_ok boolean default true,
  p_detail text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.touch_session();
  if not private.profile_active() then
    raise exception 'Account is not active';
  end if;
  if not private.assurance_ok() then
    raise exception 'A verified second factor is required';
  end if;
  perform audit.write(p_action, p_record_id, p_info_type, p_ok, auth.uid(), p_detail);
end;
$$;

create or replace function public.reveal_phn(p_legacy_id text, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  full text;
begin
  perform public.touch_session();
  if not private.has_perm('patients.reveal_ahc') then
    perform audit.write('Request denied', p_legacy_id, 'Health care number', false, auth.uid(), 'Reveal refused');
    raise exception 'Not permitted';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception 'A short reason is required';
  end if;
  select id into pid from public.patients where legacy_id = p_legacy_id;
  if pid is null or not private.can_see_patient(pid) then
    raise exception 'Not permitted';
  end if;
  select phn into full from private.patient_identifiers where patient_id = pid;
  perform audit.write('Revealed health care number', p_legacy_id, 'Health care number', true, auth.uid(), left(p_reason, 180));
  return full;
end;
$$;

create or replace function private.legacy_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select legacy_id from public.profiles where id = uid;
$$;

create or replace function public.staff_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  result jsonb;
begin
  perform public.touch_session();
  select * into me from public.profiles where id = auth.uid();
  if not found or me.status <> 'active' or me.portal_role not in ('owner', 'admin', 'holistic', 'medical') then
    raise exception 'Staff access only';
  end if;
  if not private.assurance_ok() then
    raise exception 'A verified second factor is required';
  end if;
  perform audit.write('Opened staff workspace', '', 'Workspace', true, auth.uid(), me.portal_role);

  result := jsonb_build_object(
    'me', me.legacy_id,
    'role', me.portal_role,
    'environment', (select environment from public.clinic_settings where id = 1),
    'timeout', (select idle_timeout_minutes from public.clinic_settings where id = 1),
    'newDays', (select new_client_days from public.clinic_settings where id = 1),
    'clinic', (
      select jsonb_build_object(
        'name', display_name,
        'legal', legal_name,
        'tagline', 'Integrative virtual clinic',
        'address', address,
        'phone', phone,
        'fax', fax,
        'email', email,
        'privacy', privacy_officer,
        'janeUrl', jane_portal_url
      ) from public.clinic_settings where id = 1
    ),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.legacy_id,
        'uuid', s.id,
        'first', s.first_name,
        'last', s.last_name,
        'email', s.email,
        'role', s.portal_role,
        'title', s.title,
        'cred', s.cred,
        'status', s.status,
        'mfa', s.mfa_label,
        'seen', '',
        'conf', s.confidentiality,
        'revoked', to_jsonb(s.revoked)
      ) order by s.first_name)
      from public.profiles s
      where s.portal_role <> 'client'
    ), '[]'::jsonb),
    'patients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.legacy_id,
        'uuid', p.id,
        'joinedDays', (current_date - p.joined_on),
        'first', p.first_name,
        'last', p.last_name,
        'pref', p.preferred_name,
        'dob', case when me.portal_role = 'owner' then '' else to_char(c.dob, 'YYYY-MM-DD') end,
        'ahc', case
          when me.portal_role = 'owner' then ''
          else '00000-' || right(coalesce(i.phn, '0000'), 4)
        end,
        'email', case when me.portal_role = 'owner' then '' else c.email end,
        'phone', case when me.portal_role = 'owner' then '' else c.phone end,
        'addr', case when me.portal_role = 'owner' then '' else c.address end,
        'city', p.city,
        'status', p.status,
        'np', np.legacy_id,
        'hns', hns.legacy_id,
        'jane', p.jane_chart_ref,
        'janeState', p.jane_state,
        'since', to_char(p.joined_on, 'Mon YYYY'),
        'wish', p.sharing_wish,
        'clin', jsonb_build_object(
          'panel', 'Held in Jane',
          'results', 'In Jane',
          'plan', 'In Jane',
          'next', coalesce((
            select a.time_label || ' ' || a.meridiem || ' · ' || a.visit_label
            from public.appointments a
            where a.patient_id = p.id
            order by a.time_label
            limit 1
          ), 'None booked')
        )
      ) order by p.legacy_id)
      from public.patients p
      join private.patient_contact c on c.patient_id = p.id
      left join private.patient_identifiers i on i.patient_id = p.id
      left join public.profiles np on np.id = p.np_profile_id
      left join public.profiles hns on hns.id = p.hns_profile_id
      where private.can_see_patient(p.id)
    ), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'time', a.time_label,
        'ap', a.meridiem,
        'pid', p.legacy_id,
        'type', a.visit_label,
        'staff', (
          select coalesce(jsonb_agg(sp.legacy_id), '[]'::jsonb)
          from public.profiles sp
          where sp.id = any (a.staff_ids)
        ),
        'state', a.state
      ))
      from public.appointments a
      join public.patients p on p.id = a.patient_id
      where private.can_see_patient(p.id)
    ), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.legacy_id,
        'uuid', w.id,
        'pid', p.legacy_id,
        'by', author.legacy_id,
        'reviewer', reviewer.legacy_id,
        'kind', w.kind,
        'date', w.visit_on,
        'status', w.status,
        'ver', w.version,
        'type', 'wellness'
      ))
      from public.wellness_plans w
      join public.patients p on p.id = w.patient_id
      join public.profiles author on author.id = w.responsible_clinician_id
      left join public.profiles reviewer on reviewer.id = w.reviewer_id
      where private.can_see_patient(p.id)
    ), '[]'::jsonb),
    'drafts', coalesce((
      select jsonb_object_agg(w.legacy_id, w.body)
      from public.wellness_plans w
      join public.patients p on p.id = w.patient_id
      where private.can_see_patient(p.id)
    ), '{}'::jsonb),
    'reqs', coalesce((
      select jsonb_agg(wi.body order by wi.item_id)
      from public.workspace_items wi
      where wi.kind = 'req'
        and (
          me.portal_role in ('admin', 'owner')
          or (me.portal_role = 'medical' and wi.body ->> 'np' = me.legacy_id)
        )
    ), '[]'::jsonb),
    'tasks', case when me.portal_role in ('admin', 'owner') then coalesce((
      select jsonb_agg(wi.body) from public.workspace_items wi where wi.kind = 'task'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'ctasks', coalesce((
      select jsonb_agg(wi.body) from public.workspace_items wi
      where wi.kind = 'ctask'
        and (me.portal_role = 'owner' or wi.body ->> 'who' = me.legacy_id)
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(wi.body) from public.workspace_items wi
      where wi.kind = 'note'
        and (
          me.portal_role = 'owner'
          or (
            coalesce((wi.body ->> 'private')::boolean, false) = false
            and coalesce((wi.body ->> 'withdrawn')::boolean, false) = false
          )
          or wi.body ->> 'from' = me.legacy_id
          or wi.body ->> 'to' = me.legacy_id
        )
    ), '[]'::jsonb),
    'templates', coalesce((select jsonb_agg(wi.body) from public.workspace_items wi where wi.kind = 'template'), '[]'::jsonb),
    'library', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'kind', a.kind, 'on', a.published
      ) order by a.title)
      from public.library_articles a
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(wi.body) from public.workspace_items wi where wi.kind = 'delivery'
    ), '[]'::jsonb),
    'disclosures', coalesce((
      select jsonb_agg(jsonb_build_object(
        't', d.at,
        'pid', p.legacy_id,
        'to', d.disclosed_to,
        'purpose', d.purpose,
        'what', d.what_disclosed,
        'by', actor.legacy_id
      ) order by d.at)
      from public.disclosures d
      left join public.patients p on p.id = d.patient_id
      left join public.profiles actor on actor.id = d.recorded_by
      where me.portal_role in ('owner', 'admin')
    ), '[]'::jsonb),
    'hub', coalesce((
      select wi.body from public.workspace_items wi where wi.kind = 'hub' and wi.item_id = 'state'
    ), jsonb_build_object('policyUrl', '', 'posts', '[]'::jsonb, 'reads', '{}'::jsonb)),
    'vac', (
      select jsonb_set(
        coalesce(
          (select wi.body from public.workspace_items wi where wi.kind = 'vac' and wi.item_id = 'state'),
          jsonb_build_object('allow', '{}'::jsonb, 'used', '{}'::jsonb, 'requests', '[]'::jsonb)
        ),
        '{requests}',
        (
          select coalesce(jsonb_agg(distinct r.body), '[]'::jsonb)
          from (
            select jsonb_array_elements(
              coalesce((select body -> 'requests' from public.workspace_items where kind = 'vac' and item_id = 'state'), '[]'::jsonb)
            ) as body
            union all
            select body from public.workspace_items where kind = 'vac_request'
          ) r
        )
      )
    ),
    'incidents', case when me.portal_role = 'owner' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 't', n.at, 'uid', actor.legacy_id, 'kind', n.kind,
        'when', n.happened_at, 'pid', n.patient_ref, 'cust', n.custodian_label, 'status', n.status
      ))
      from public.incidents n
      left join public.profiles actor on actor.id = n.actor_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'compliance', coalesce((
      select wi.body from public.workspace_items wi where wi.kind = 'compliance' and wi.item_id = 'state'
    ), '{}'::jsonb),
    'audit', case when me.portal_role = 'owner' then coalesce((
      select jsonb_agg(jsonb_build_object(
        't', e.at,
        'uid', actor.legacy_id,
        'role', e.actor_role,
        'action', e.action,
        'target', e.detail,
        'ok', e.ok,
        'pid', e.record_id,
        'info', e.info_type
      ) order by e.at)
      from (
        select * from audit.events order by id desc limit 400
      ) e
      left join public.profiles actor on actor.id = e.actor_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'pid', p.legacy_id,
        'name', g.template_name,
        'at', g.created_at,
        'released', g.released_to_patient
      ) order by g.created_at desc)
      from public.generated_documents g
      join public.patients p on p.id = g.patient_id
      where private.can_see_patient(p.id)
    ), '[]'::jsonb)
  );
  return result;
end;
$$;

create or replace function private.upsert_item(p_kind text, p_id text, p_body jsonb, p_patient text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_items (kind, item_id, body, patient_ref, updated_at, updated_by)
  values (p_kind, p_id, p_body, coalesce(p_patient, ''), now(), auth.uid())
  on conflict (kind, item_id) do update
    set body = excluded.body,
        patient_ref = excluded.patient_ref,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

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
      if wid is null and me.portal_role = 'holistic' then
        insert into public.wellness_plans (
          legacy_id, patient_id, responsible_clinician_id, reviewer_id, kind, visit_on,
          status, version, body, created_by, modified_by
        ) values (
          item ->> 'id', pid, auth.uid(),
          (select np_profile_id from public.patients where id = pid),
          coalesce(item ->> 'kind', 'Wellness consult'),
          coalesce(item ->> 'date', ''),
          'Draft', 1,
          coalesce(item -> 'body', '{}'::jsonb),
          auth.uid(), auth.uid()
        );
      elsif wid is not null and me.portal_role = 'holistic' then
        update public.wellness_plans set
          body = coalesce(item -> 'body', body),
          kind = coalesce(item ->> 'kind', kind),
          status = case when status = 'Published' then status else coalesce(item ->> 'status', status) end,
          modified_by = auth.uid(),
          modified_at = now(),
          version = version + 1
        where id = wid and responsible_clinician_id = auth.uid() and status <> 'Published';
      elsif wid is not null and me.portal_role = 'medical' and private.has_perm('careplans.publish') then
        update public.wellness_plans set
          status = coalesce(item ->> 'status', status),
          reviewer_id = auth.uid(),
          approved_by = case when item ->> 'status' in ('Approved', 'Published') then auth.uid() else approved_by end,
          approved_at = case when item ->> 'status' in ('Approved', 'Published') then now() else approved_at end,
          published_by = case when item ->> 'status' = 'Published' then auth.uid() else published_by end,
          published_at = case when item ->> 'status' = 'Published' then now() else published_at end,
          modified_by = auth.uid(),
          modified_at = now(),
          version = version + 1
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

create or replace function public.register_generated_document(
  p_patient_legacy text,
  p_template text,
  p_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  doc uuid;
begin
  perform public.touch_session();
  if private.portal_role() not in ('admin', 'medical') or not private.assurance_ok() then
    raise exception 'Not permitted';
  end if;
  select id into pid from public.patients where legacy_id = p_patient_legacy;
  if pid is null or not private.can_see_patient(pid) then
    raise exception 'Not permitted';
  end if;
  if p_storage_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$' then
    raise exception 'Unexpected storage path';
  end if;
  insert into public.generated_documents (patient_id, template_name, storage_path, created_by)
  values (pid, left(p_template, 180), p_storage_path, auth.uid())
  returning id into doc;
  perform audit.write('Generated document', p_patient_legacy, 'Requisition PDF', true, auth.uid(), left(p_template, 180));
  return doc;
end;
$$;

create or replace function public.client_home()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  perform public.touch_session();
  if private.portal_role() <> 'client' or not private.assurance_ok() then
    raise exception 'Client access only';
  end if;
  pid := private.my_patient();
  if pid is null then
    raise exception 'No client record is linked to this account';
  end if;
  perform audit.write('Opened client portal', (select legacy_id from public.patients where id = pid), 'Portal', true);
  return jsonb_build_object(
    'environment', (select environment from public.clinic_settings where id = 1),
    'idleMinutes', (select idle_timeout_minutes from public.clinic_settings where id = 1),
    'janeUrl', (select jane_portal_url from public.clinic_settings where id = 1),
    'clinic', (select legal_name from public.clinic_settings where id = 1),
    'profile', (
      select jsonb_build_object(
        'first', p.first_name,
        'last', p.last_name,
        'preferred', p.preferred_name,
        'city', p.city,
        'dob', to_char(c.dob, 'YYYY-MM-DD'),
        'email', c.email,
        'phone', c.phone,
        'address', c.address,
        'postal', c.postal_code,
        'phnLast4', right(coalesce(i.phn, ''), 4),
        'since', to_char(p.joined_on, 'Month YYYY'),
        'status', p.status,
        'legacy', p.legacy_id
      )
      from public.patients p
      join private.patient_contact c on c.patient_id = p.id
      left join private.patient_identifiers i on i.patient_id = p.id
      where p.id = pid
    ),
    'team', (
      select jsonb_build_array(
        jsonb_build_object('role', 'Nurse Practitioner', 'name', np.first_name || ' ' || np.last_name, 'title', np.title),
        jsonb_build_object('role', 'Herbalist and nutrition specialist', 'name', hns.first_name || ' ' || hns.last_name, 'title', hns.title)
      )
      from public.patients p
      left join public.profiles np on np.id = p.np_profile_id
      left join public.profiles hns on hns.id = p.hns_profile_id
      where p.id = pid
    ),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'time', a.time_label, 'meridiem', a.meridiem, 'label', a.visit_label, 'state', a.state
      ))
      from public.appointments a where a.patient_id = pid
    ), '[]'::jsonb),
    'wellness', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.legacy_id,
        'kind', w.kind,
        'date', w.visit_on,
        'version', w.version,
        'body', w.body,
        'author', author.first_name || ' ' || author.last_name,
        'approvedBy', approver.first_name || ' ' || approver.last_name,
        'publishedAt', w.published_at
      ) order by w.published_at desc)
      from public.wellness_plans w
      join public.profiles author on author.id = w.responsible_clinician_id
      left join public.profiles approver on approver.id = w.approved_by
      where w.patient_id = pid and w.status = 'Published'
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'name', g.template_name, 'at', g.created_at
      ) order by g.created_at desc)
      from public.generated_documents g
      where g.patient_id = pid and g.released_to_patient
    ), '[]'::jsonb),
    'ranges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'marker', r.marker, 'unit', r.unit, 'range', r.range_label, 'note', r.note
      ) order by r.sort_order)
      from public.reference_ranges r
    ), '[]'::jsonb),
    'library', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'topic', a.topic, 'kind', a.kind,
        'time', a.minutes, 'desc', a.summary, 'body', a.body_html,
        'rec', a.recommended, 'img', a.image_path
      ) order by a.title)
      from public.library_articles a where a.published
    ), '[]'::jsonb),
    'consent', coalesce((select granted from public.tracking_consents where patient_id = pid), false),
    'tracking', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'kind', t.kind, 'on', t.recorded_on, 'value', t.value,
        'unit', t.unit, 'note', t.note, 'hidden', t.hidden, 'source', t.source
      ) order by t.recorded_on desc, t.created_at desc)
      from public.tracking_entries t
      where t.patient_id = pid and t.deleted_at is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_tracking_consent(p_granted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.my_patient();
begin
  perform public.touch_session();
  if private.portal_role() <> 'client' or pid is null or not private.assurance_ok() then
    raise exception 'Client access only';
  end if;
  insert into public.tracking_consents (patient_id, granted, granted_at, withdrawn_at)
  values (pid, p_granted, case when p_granted then now() else null end, case when p_granted then null else now() end)
  on conflict (patient_id) do update set
    granted = excluded.granted,
    granted_at = case when excluded.granted then now() else tracking_consents.granted_at end,
    withdrawn_at = case when excluded.granted then null else now() end,
    updated_at = now();
  perform audit.write(
    case when p_granted then 'Granted tracking consent' else 'Withdrew tracking consent' end,
    (select legacy_id from public.patients where id = pid),
    'Patient-entered tracking',
    true
  );
end;
$$;

create or replace function public.save_tracking_entry(
  p_kind text,
  p_on date,
  p_value numeric,
  p_unit text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.my_patient();
  id uuid;
begin
  perform public.touch_session();
  if private.portal_role() <> 'client' or pid is null or not private.assurance_ok() then
    raise exception 'Client access only';
  end if;
  if p_kind not in ('sleep', 'steps', 'activity', 'hrv', 'heart_rate', 'weight', 'biometric') then
    raise exception 'Unknown tracking type';
  end if;
  insert into public.tracking_entries (patient_id, kind, recorded_on, value, unit, note)
  values (pid, p_kind, coalesce(p_on, current_date), p_value, left(coalesce(p_unit, ''), 24), left(coalesce(p_note, ''), 240))
  returning tracking_entries.id into id;
  perform audit.write('Added patient-entered tracking', id::text, 'Patient-entered tracking', true);
  return id;
end;
$$;

create or replace function public.hide_tracking_entry(p_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.my_patient();
begin
  perform public.touch_session();
  update public.tracking_entries
  set hidden = p_hidden
  where id = p_id and patient_id = pid and deleted_at is null;
  if not found then
    raise exception 'Entry not found';
  end if;
  perform audit.write(case when p_hidden then 'Hid tracking entry' else 'Showed tracking entry' end, p_id::text, 'Patient-entered tracking', true);
end;
$$;

create or replace function public.delete_tracking_entry(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := private.my_patient();
begin
  perform public.touch_session();
  update public.tracking_entries
  set deleted_at = now(), value = null, note = '', hidden = true
  where id = p_id and patient_id = pid and deleted_at is null;
  if not found then
    raise exception 'Entry not found';
  end if;
  perform audit.write('Deleted tracking entry', p_id::text, 'Patient-entered tracking', true);
end;
$$;

create or replace function public.security_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.touch_session();
  if private.portal_role() <> 'owner' or not private.assurance_ok() then
    raise exception 'Owner access only';
  end if;
  return jsonb_build_object(
    'failedSignIns24h', (
      select count(*) from private.login_attempts a
      where a.window_started_at > now() - interval '24 hours' and a.failed_count > 0
    ),
    'lockedAccounts', (
      select count(*) from private.login_attempts a where a.locked_until is not null and a.locked_until > now()
    ),
    'deniedEvents7d', (
      select count(*) from audit.events e where e.ok = false and e.at > now() - interval '7 days'
    )
  );
end;
$$;

revoke all on function public.enforce_minor_guardian() from public, anon, authenticated;
revoke all on function public.reject_clinical_wellness() from public, anon, authenticated;
revoke all on function public.version_wellness_plan() from public, anon, authenticated;
revoke all on function public.block_disclosure_change() from public, anon, authenticated;
revoke all on function public.block_version_change() from public, anon, authenticated;
revoke all on function public.tracking_guard() from public, anon, authenticated;

revoke all on function public.touch_session() from public, anon;
grant execute on function public.touch_session() to authenticated;
grant execute on function public.log_audit(text, text, text, boolean, text) to authenticated;
grant execute on function public.reveal_phn(text, text) to authenticated;
grant execute on function public.staff_bootstrap() to authenticated;
grant execute on function public.staff_commit(jsonb) to authenticated;
grant execute on function public.register_generated_document(text, text, text) to authenticated;
grant execute on function public.client_home() to authenticated;
grant execute on function public.set_tracking_consent(boolean) to authenticated;
grant execute on function public.save_tracking_entry(text, date, numeric, text, text) to authenticated;
grant execute on function public.hide_tracking_entry(uuid, boolean) to authenticated;
grant execute on function public.delete_tracking_entry(uuid) to authenticated;
grant execute on function public.security_summary() to authenticated;

-- The default signature created by the revoke above may not match. Re-revoke
-- the real log_audit signature explicitly.
revoke all on function public.log_audit(text, text, text, boolean, text) from public, anon;
grant execute on function public.log_audit(text, text, text, boolean, text) to authenticated;
