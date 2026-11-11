-- Go-live cleanup. Do not run this until the clinic has confirmed that every
-- row still in the database is sample data. It deletes fictional @example.com
-- accounts and rows marked is_testing. It does not touch clinic_settings.
-- It is not a migration and it is not applied automatically.
--
-- Refuse unless the session has explicitly opted in:
--   psql -c "select set_config('bloom.confirm_go_live', 'yes', false)" -f supabase/scripts/go_live_cleanup.sql
-- Review the printed counts before you commit. This script rolls back unless
-- you change the final rollback to commit yourself.

begin;

do $$
begin
  if current_setting('bloom.confirm_go_live', true) is distinct from 'yes' then
    raise exception 'Refusing to delete sample data. Set bloom.confirm_go_live to yes only when every remaining record is fictional.';
  end if;
end $$;

create temporary table sample_users on commit drop as
  select id, email from auth.users where email like '%@example.com';

delete from public.tracking_entries
where patient_id in (select id from public.patients where is_testing);

delete from public.tracking_consents
where patient_id in (select id from public.patients where is_testing);

delete from public.wellness_plan_versions
where plan_id in (
  select id from public.wellness_plans where is_testing
);

delete from public.wellness_plans where is_testing;

delete from public.disclosures where is_testing;

delete from public.secure_links
where document_id in (select id from public.generated_documents where is_testing);

delete from public.generated_documents where is_testing;

delete from public.appointments
where patient_id in (select id from public.patients where is_testing);

delete from public.incidents
where patient_ref in (select legacy_id from public.patients where is_testing);

update public.patients
set np_profile_id = null, hns_profile_id = null, auth_user_id = null
where np_profile_id in (select id from sample_users)
   or hns_profile_id in (select id from sample_users)
   or auth_user_id in (select id from sample_users);

delete from public.workspace_items
where patient_ref in (select legacy_id from public.patients where is_testing);

delete from private.patient_identifiers
where patient_id in (select id from public.patients where is_testing);

delete from private.patient_contact
where patient_id in (select id from public.patients where is_testing);

delete from private.portal_access
where email like '%@example.com';

delete from public.patients where is_testing;

delete from public.profiles
where email like '%@example.com' or id in (select id from sample_users);

delete from auth.identities
where user_id in (select id from sample_users);

delete from auth.sessions
where user_id in (select id from sample_users);

delete from auth.users
where id in (select id from sample_users);

do $$
declare
  left_users integer;
  left_patients integer;
begin
  select count(*) into left_users from auth.users where email like '%@example.com';
  select count(*) into left_patients from public.patients where is_testing;
  raise notice 'sample users remaining: %; testing patients remaining: %', left_users, left_patients;
end $$;

rollback;
