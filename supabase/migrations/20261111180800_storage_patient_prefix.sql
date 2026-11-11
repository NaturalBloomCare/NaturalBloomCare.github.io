-- Staff may upload a requisition PDF only under the patient's own folder.
-- The folder name is the patient uuid. The caller must already be allowed to see that patient.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema is not present; skip patient-prefix policy';
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
      and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+\.pdf$'
      and private.can_see_patient(((storage.foldername(name))[1])::uuid)
    )
  $policy$;
end $$;
