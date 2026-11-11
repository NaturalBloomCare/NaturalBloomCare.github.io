-- Public, locked-down table so the Edge Function can store link hashes
-- through the Data API. No policy is granted to browsers.
drop table if exists private.secure_links;

create table if not exists public.secure_links (
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

alter table public.secure_links enable row level security;
revoke all on public.secure_links from anon, authenticated;
