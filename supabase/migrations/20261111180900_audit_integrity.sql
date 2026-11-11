-- Callers may record only observational notes, and only about patients they can see.
-- Privileged outcomes are written by the function that performed them.
-- The hash chain keeps its head on one locked row. A row id can be allocated
-- before a waiting writer continues, so the highest id is not a safe head.

create table if not exists audit.chain (
  id integer primary key check (id = 1),
  last_hash text not null
);

insert into audit.chain (id, last_hash)
select 1, coalesce((select e.row_hash from audit.events e order by e.id desc limit 1), 'genesis')
where not exists (select 1 from audit.chain where id = 1);

revoke all on table audit.chain from public, anon, authenticated;

create or replace function audit.stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev text;
begin
  -- Lock the chain head until this transaction commits. A second insert in
  -- the same transaction sees the hash it just stored.
  select c.last_hash into prev
  from audit.chain c
  where c.id = 1
  for update;
  new.prev_hash := coalesce(prev, 'genesis');
  new.row_hash := encode(extensions.digest(
    new.prev_hash || '|' || coalesce(new.actor_id::text, '') || '|' ||
    coalesce(new.action, '') || '|' || coalesce(new.record_id, '') || '|' ||
    coalesce(new.info_type, '') || '|' || coalesce(new.detail, '') || '|' ||
    extract(epoch from new.at)::text,
    'sha256'
  ), 'hex');
  update audit.chain set last_hash = new.row_hash where id = 1;
  return new;
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
declare
  allowed text[] := array[
    'Request denied',
    'Viewed record',
    'Signed out',
    'Opened client chart',
    'Viewed audit history',
    'Access denied',
    'Passed task on',
    'Replied on task',
    'Acknowledged note',
    'Completed task',
    'Reopened task',
    'Approved time off',
    'Declined time off',
    'Signed confidentiality agreement',
    'Reported privacy concern',
    'Requested time off',
    'Set reminder',
    'Sent note',
    'Sent task',
    'Created care plan draft',
    'Downloaded care plan PDF',
    'Added plant photo',
    'Viewed staff activity',
    'Confirmed manual Jane update',
    'Ended staff session',
    'Marked compliance item complete',
    'Reopened compliance item',
    'Opened care plan',
    'Saved care plan draft',
    'Sent wellness plan for NP review',
    'Marked care plan ready for review',
    'Started care plan revision',
    'Withdrew task',
    'Deleted reminder',
    'Cancelled time off request',
    'Read policy change',
    'Removed team dashboard post',
    'Opened policies & procedures',
    'Opened official form',
    'Reassigned task',
    'Changed new-client period',
    'Changed session timeout',
    'Uploaded template',
    'Set policies & procedures link',
    'Posted to team dashboard',
    'Published library resource',
    'Hid library resource',
    'Recorded delivery to patient',
    'Recorded disclosure',
    'Signed in'
  ];
begin
  perform public.touch_session();
  if private.portal_role() not in ('owner', 'admin', 'holistic', 'medical') or not private.profile_active() then
    raise exception 'Not permitted';
  end if;
  if not private.assurance_ok() then
    raise exception 'A verified second factor is required';
  end if;
  if p_action is null or not (p_action = any (allowed)) then
    raise exception 'This audit action is recorded by the server';
  end if;
  if p_action in ('Request denied', 'Access denied') then
    p_ok := false;
  end if;
  if coalesce(p_record_id, '') ~ '^BLM-[0-9]+$' then
    if not exists (
      select 1 from public.patients p
      where p.legacy_id = p_record_id and private.can_see_patient(p.id)
    ) then
      raise exception 'Not permitted';
    end if;
  end if;
  if coalesce(p_record_id, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    if not exists (
      select 1 from public.patients p
      where p.id = p_record_id::uuid and private.can_see_patient(p.id)
    ) then
      raise exception 'Not permitted';
    end if;
  end if;
  perform audit.write(
    p_action,
    left(coalesce(p_record_id, ''), 80),
    left(coalesce(p_info_type, ''), 80),
    coalesce(p_ok, false),
    auth.uid(),
    left(coalesce(p_detail, ''), 180)
  );
end;
$$;

create or replace function public.record_document_download(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  legacy text;
begin
  perform public.touch_session();
  if not private.profile_active() or not private.assurance_ok() then
    raise exception 'Not permitted';
  end if;
  select p.legacy_id into legacy
  from public.generated_documents g
  join public.patients p on p.id = g.patient_id
  where g.id = p_id
    and private.can_see_patient(g.patient_id)
    and (private.portal_role() <> 'client' or g.released_to_patient);
  if legacy is null then
    raise exception 'Not permitted';
  end if;
  perform audit.write('Downloaded document', legacy, 'Requisition PDF', true, auth.uid(), p_id::text);
end;
$$;

revoke all on function public.record_document_download(uuid) from public, anon;
grant execute on function public.record_document_download(uuid) to authenticated;

create or replace function public.audit_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or old.status is not distinct from new.status then
    return new;
  end if;
  perform audit.write(
    case
      when new.status = 'deactivated' then 'Deactivated staff'
      when old.status = 'deactivated' then 'Reactivated staff'
      else 'Updated staff status'
    end,
    coalesce(new.legacy_id, ''),
    'Staff account',
    true,
    auth.uid(),
    old.status || ' to ' || new.status
  );
  return new;
end;
$$;

revoke all on function public.audit_profile_status() from public, anon, authenticated;

drop trigger if exists audit_profile_status on public.profiles;
create trigger audit_profile_status
after update of status on public.profiles
for each row execute function public.audit_profile_status();
