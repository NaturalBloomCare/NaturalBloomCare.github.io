-- A secure link can email a confirmation code at most once a minute, and at most eight times.
-- The check is a locked row update so two requests cannot both pass.

alter table public.secure_links
  add column if not exists code_sent_at timestamptz,
  add column if not exists code_requests integer not null default 0;

create or replace function public.request_secure_link_code(p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.secure_links%rowtype;
begin
  if coalesce(p_token_hash, '') = '' or coalesce(p_code_hash, '') = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  select * into link
  from public.secure_links
  where token_hash = p_token_hash
  for update;
  if not found or link.expires_at < now() then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if link.locked_until is not null and link.locked_until > now() then
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if link.code_requests >= 8 then
    update public.secure_links
    set locked_until = now() + interval '15 minutes'
    where id = link.id;
    return jsonb_build_object('ok', false, 'status', 'locked');
  end if;
  if link.code_sent_at is not null and link.code_sent_at > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'status', 'throttled');
  end if;
  update public.secure_links
  set code_hash = p_code_hash,
      code_sent_at = now(),
      code_requests = code_requests + 1
  where id = link.id;
  return jsonb_build_object(
    'ok', true,
    'status', 'ok',
    'email', link.recipient,
    'document_id', link.document_id
  );
end;
$$;

revoke all on function public.request_secure_link_code(text, text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.request_secure_link_code(text, text) to service_role;
  end if;
end $$;
