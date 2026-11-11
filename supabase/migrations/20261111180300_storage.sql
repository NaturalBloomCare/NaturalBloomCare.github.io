-- Private bucket for generated requisition PDFs.
-- No select policy: downloads go through the document-url Edge Function,
-- which checks the caller and returns a signed URL that expires in the
-- clinic setting (default 120 seconds).

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema is not present; skip bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('patient-documents', 'patient-documents', false, 10485760, array['application/pdf'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
end $$;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  execute 'drop policy if exists patient_documents_staff_insert on storage.objects';
  execute $policy$
    create policy patient_documents_staff_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'patient-documents'
      and private.assurance_ok()
      and private.session_ok()
      and private.portal_role() in ('admin', 'medical')
    )
  $policy$;
end $$;
