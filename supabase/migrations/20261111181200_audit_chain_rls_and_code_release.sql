-- The chain head is not readable through the API.
-- A confirmation code that was never emailed does not count toward the send limit.

alter table audit.chain enable row level security;
revoke all on table audit.chain from public, anon, authenticated;

create or replace function public.release_secure_link_code(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_token_hash, '') = '' then
    return;
  end if;
  update public.secure_links
  set code_requests = greatest(code_requests - 1, 0),
      code_sent_at = null,
      code_hash = null
  where token_hash = p_token_hash
    and confirmed_at is null;
end;
$$;

revoke all on function public.release_secure_link_code(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.release_secure_link_code(text) to service_role;
  end if;
end $$;
