-- Requisition delivery by email is a revocable link, not a file attachment.
-- Fax remains in the edge function and stays off unless the clinic turns the flag on.
-- This does not make the portal compliant with any privacy statute.

alter table public.clinic_settings
  add column if not exists email_link_ttl_hours integer not null default 72
    check (email_link_ttl_hours between 1 and 168),
  add column if not exists fax_enabled boolean not null default false;

alter table public.secure_links
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid,
  add column if not exists last_opened_at timestamptz;

create or replace function public.register_requisition_link(
  p_document_id uuid,
  p_token_hash text,
  p_recipient text,
  p_purpose text,
  p_what text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  doc public.generated_documents%rowtype;
  patient public.patients%rowtype;
  hours integer;
  link_id uuid;
  expires timestamptz;
begin
  perform public.touch_session();
  select * into me from public.profiles where id = auth.uid();
  if not found or me.status <> 'active' or me.portal_role not in ('admin', 'medical')
     or not private.assurance_ok() or not private.profile_active() then
    raise exception 'Not permitted';
  end if;
  if coalesce(p_token_hash, '') = '' or position('@' in coalesce(p_recipient, '')) = 0 then
    raise exception 'A recipient email is required';
  end if;
  select * into doc from public.generated_documents where id = p_document_id;
  if not found then
    raise exception 'Not permitted';
  end if;
  select * into patient from public.patients where id = doc.patient_id;
  if not found or not private.can_see_patient(patient.id) then
    raise exception 'Not permitted';
  end if;
  if me.portal_role = 'medical'
     and patient.np_profile_id is distinct from auth.uid()
     and patient.hns_profile_id is distinct from auth.uid() then
    raise exception 'This patient is not assigned to you';
  end if;
  select email_link_ttl_hours into hours from public.clinic_settings where id = 1;
  hours := coalesce(hours, 72);
  expires := now() + make_interval(hours => hours);
  insert into public.secure_links (document_id, token_hash, recipient, expires_at, created_by)
  values (p_document_id, p_token_hash, left(trim(p_recipient), 180), expires, auth.uid())
  returning id into link_id;
  insert into public.disclosures (
    patient_id, disclosed_to, purpose, what_disclosed, recorded_by, channel, status, document_id
  ) values (
    doc.patient_id,
    left(trim(p_recipient), 180),
    left(coalesce(p_purpose, 'Requisition delivery'), 180),
    left(coalesce(p_what, 'Requisition record'), 180),
    auth.uid(),
    'email',
    'Link prepared',
    p_document_id
  );
  perform audit.write(
    'Sent requisition link',
    patient.legacy_id,
    'Requisition PDF',
    true,
    auth.uid(),
    left(trim(p_recipient), 180)
  );
  return jsonb_build_object('id', link_id, 'expires_at', expires, 'ttl_hours', hours);
end;
$$;

revoke all on function public.register_requisition_link(uuid, text, text, text, text) from public, anon;
grant execute on function public.register_requisition_link(uuid, text, text, text, text) to authenticated;

create or replace function public.redeem_requisition_link(p_token_hash text)
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
begin
  if coalesce(p_token_hash, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  select * into link from public.secure_links where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'status', 'revoked');
  end if;
  if link.expires_at < now() then
    return jsonb_build_object('ok', false, 'status', 'expired');
  end if;
  select * into doc from public.generated_documents where id = link.document_id;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  select legacy_id into legacy from public.patients where id = doc.patient_id;
  remaining := greatest(60, least(900, floor(extract(epoch from (link.expires_at - now())))::integer));
  update public.secure_links set last_opened_at = now() where id = link.id;
  perform audit.write(
    'Opened requisition link',
    coalesce(legacy, ''),
    'Requisition PDF',
    true,
    null,
    left(link.recipient, 180)
  );
  return jsonb_build_object(
    'ok', true,
    'status', 'ok',
    'storage_path', doc.storage_path,
    'ttl_seconds', remaining,
    'document_id', doc.id
  );
end;
$$;

revoke all on function public.redeem_requisition_link(text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.redeem_requisition_link(text) to service_role;
  end if;
end $$;

create or replace function public.revoke_requisition_link(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  link public.secure_links%rowtype;
  legacy text;
begin
  perform public.touch_session();
  select * into me from public.profiles where id = auth.uid();
  if not found or me.status <> 'active' or me.portal_role not in ('admin', 'medical')
     or not private.assurance_ok() or not private.profile_active() then
    raise exception 'Not permitted';
  end if;
  select * into link from public.secure_links where id = p_id;
  if not found then
    raise exception 'Not permitted';
  end if;
  select p.legacy_id into legacy
  from public.generated_documents g
  join public.patients p on p.id = g.patient_id
  where g.id = link.document_id;
  if legacy is null or not private.can_see_patient((
    select g.patient_id from public.generated_documents g where g.id = link.document_id
  )) then
    raise exception 'Not permitted';
  end if;
  if me.portal_role = 'medical' and not exists (
    select 1 from public.generated_documents g
    join public.patients p on p.id = g.patient_id
    where g.id = link.document_id
      and (p.np_profile_id = auth.uid() or p.hns_profile_id = auth.uid())
  ) then
    raise exception 'This patient is not assigned to you';
  end if;
  update public.secure_links
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_id and revoked_at is null;
  perform audit.write('Revoked requisition link', legacy, 'Requisition PDF', true, auth.uid(), left(link.recipient, 180));
end;
$$;

revoke all on function public.revoke_requisition_link(uuid) from public, anon;
grant execute on function public.revoke_requisition_link(uuid) to authenticated;
