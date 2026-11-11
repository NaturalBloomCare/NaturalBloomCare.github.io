-- Role matrix tightening and a server-side read log.
-- Holistic staff do not receive a health number, a date of birth, an address,
-- an email, requisitions, or generated documents. Administration receives the
-- demographics a requisition needs, not a clinical chart. The owner stays on
-- directory fields only.

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
        'dob', case when me.portal_role in ('admin', 'medical') then to_char(c.dob, 'YYYY-MM-DD') else '' end,
        'ahc', case
          when me.portal_role in ('admin', 'medical') then '00000-' || right(coalesce(i.phn, '0000'), 4)
          else ''
        end,
        'email', case when me.portal_role in ('admin', 'medical') then c.email else '' end,
        'phone', case when me.portal_role in ('admin', 'medical', 'holistic') then c.phone else '' end,
        'addr', case when me.portal_role in ('admin', 'medical') then c.address else '' end,
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
          me.portal_role = 'admin'
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
        and me.portal_role in ('admin', 'medical')
    ), '[]'::jsonb)
  );
  return result;
end;
$$;

create or replace function public.note_staff_view(p_legacy_id text, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  kind text := case
    when p_kind in ('Client record', 'Requisition', 'Document') then p_kind
    else 'Client record'
  end;
begin
  perform public.touch_session();
  if private.portal_role() not in ('owner', 'admin', 'holistic', 'medical')
     or not private.profile_active()
     or not private.assurance_ok() then
    raise exception 'Not permitted';
  end if;
  select id into pid from public.patients where legacy_id = p_legacy_id;
  if pid is null or not private.can_see_patient(pid) then
    perform audit.write('Request denied', coalesce(p_legacy_id, ''), kind, false, auth.uid(), 'View refused');
    raise exception 'Not permitted';
  end if;
  if kind = 'Requisition' and private.portal_role() not in ('admin', 'medical') then
    perform audit.write('Request denied', p_legacy_id, kind, false, auth.uid(), 'View refused');
    raise exception 'Not permitted';
  end if;
  if kind = 'Document' and private.portal_role() not in ('admin', 'medical') then
    perform audit.write('Request denied', p_legacy_id, kind, false, auth.uid(), 'View refused');
    raise exception 'Not permitted';
  end if;
  perform audit.write('Viewed ' || kind, p_legacy_id, kind, true, auth.uid(), '');
end;
$$;

revoke all on function public.note_staff_view(text, text) from public, anon;
grant execute on function public.note_staff_view(text, text) to authenticated;

drop policy if exists documents_select on public.generated_documents;
create policy documents_select on public.generated_documents
for select to authenticated
using (
  private.can_see_patient(patient_id)
  and (
    private.portal_role() in ('admin', 'medical')
    or (private.portal_role() = 'client' and released_to_patient)
  )
);
