# Authentication and authorization

## Sign-in

Clients use `/portal/`. Staff use `/staff/`. Both use Supabase Auth email and password. The publishable key in `assets/bloom-config.js` is the browser key. The service-role key is read only inside Edge Functions from the platform environment.

Staff must reach authenticator assurance level `aal2` before `staff_bootstrap` returns data. A staff member with no factor is shown a TOTP enrolment screen. A staff member who already has a factor is shown the six-digit challenge.

Clients may enrol TOTP from Profile. If they have a verified factor, row checks require `aal2` as well. If they have not enrolled, `aal1` is enough for their own portal.

Public sign-up stays off. Leaked-password protection and Supabase Auth rate limits are dashboard controls. Staff must pass TOTP before any record opens. The browser signs out after the 15-minute idle timeout. `private.profile_active()` allows data access only when the profile status is `active` and `private.on_access_list()` finds one active `private.portal_access` row for that email, for the same portal and role. A token issued before the row was inactivated stops reading data immediately. An invited account still cannot read patient rows.

Per-account lockout and failed-login auditing are not active. `hook_password_verification_attempt` would record a failed password, lock an account after five failures in 15 minutes, and reject deactivated and invited accounts at sign-in. Supabase offers that Password Verification Attempt hook on the Team plan only. This project is on Pro, so the hook cannot be turned on. That is a documented gap until the plan includes it. The function remains in the database and does nothing until the hook can be selected.

`custom_access_token_hook` refuses a token unless `private.portal_access` has one active row for the account email. A client row must match a client profile. A staff row must match that same staff role. A missing profile, or a deactivated profile, is also refused. The hook returns HTTP 403 with “This account is not on the Bloom access list. Contact the clinic.” The sign-in pages show that as “This account isn't on the Bloom access list. Please contact the clinic.” On success the hook still copies `portal_role` and `account_status` into `app_metadata`, and adds `portal` (`staff` or `client`). Policies read `app_metadata`, not `user_metadata`, because users can edit the latter. The hook also runs when a session refreshes, so an inactivated row stops the next token. Set the JWT expiry short. The hook does nothing until it is selected in the dashboard.

One email has one row, so the same person cannot be both staff and a client. `private.apply_access_list` is the sync from Clover’s sheet. It is executable by the service role only. People who drop off the sheet, or are marked inactive, have the access row set inactive and the profile set deactivated. Users are not deleted. An owner invite through `private.invite_staff` requires an active staff row for that email and role, or it raises “Add this person to the access list first.” The migration does not create the clinic’s real accounts.

## Session

The browser signs out after the clinic idle time, default 15 minutes. `touch_session` records the session id. `private.session_ok` requires that touch to be newer than the idle limit and the session to still exist in `auth.sessions`. A stale session cannot read patient rows.

Password reset uses `/auth/reset.html`. The Supabase dashboard must allow that redirect URL and `https://naturalbloom.ca/portal/` before reset emails will return here.

JWT lifetime is a project setting. This repository cannot set it. It should be short for a health portal. That is a manual step.

## Authorization

`private.has_perm` repeats the staff portal’s role matrix. Clinical permissions need `cred.verified`. NP-only permissions need `cred.type = 'NP'` and `verified`. Revoked keys are removed. The owner does not receive clinical permissions.

`private.can_see_patient` then limits rows:

- A client sees only the patient row linked to their user.
- Administration with the directory permission sees the directory.
- The owner sees directory fields, and the workspace function blanks date of birth, email, phone, address and the health number.
- A medical or holistic practitioner sees patients assigned to them.
- `sharing_wish = 'medical-only'` hides that patient from the holistic role.

`authenticated` cannot update `public.profiles`. Role, credentials, status and revoked permissions are not self-serve columns. The owner changes staff through `staff_commit`, which runs as a security definer and will not change a client into a staff role. A client who updates her own `portal_role` is rejected by the database before any policy runs.

`authenticated` cannot insert or update `public.wellness_plans` or update `public.patients`. Drafts go through `staff_commit`. A herbalist may only set a plan to Draft or Ready for Review. Approval and publication go through `approve_wellness_plan`. That function requires a signed-in medical user whose credential type is `NP` and whose credential is marked verified, and it sets `approved_by` and, when publishing, `published_by` to `auth.uid()`. The row trigger rejects any other transition into Approved or Published, including one where the approver columns are merely not null.

A published wellness plan’s body and kind cannot be changed. An NP edit in `staff_commit` creates or updates a separate draft and leaves the published row as it was approved. `log_audit` accepts only a fixed list of observational notes, and only for a patient the caller can see. Privileged outcomes, including a health-number reveal, a publication, a deactivation and a document download, are written by the function that performed them.

The trigger also rejects bodies that carry diagnoses, labs, prescriptions or biomarker rows.

Tracking rows are forced to `source = 'patient-entered'`. The client can hide or soft-delete their own rows. A care-team read requires consent, and hidden rows are excluded.

Direct select on `workspace_items` is not granted. Staff read it through `staff_bootstrap`, which filters notes and requisitions. RLS is enabled with no permissive policy so a later grant does not dump every note.

`private.patient_contact`, `private.patient_identifiers`, `private.login_attempts` and `private.session_touch` have row level security enabled and no policy for the API roles. `anon` and `authenticated` have no privileges on those tables. Security definer functions still read them.

`anon` cannot execute the staff, client, tracking or reveal functions.

## What was not granted

`anon` has no patient-table access. `authenticated` cannot select the audit log, the PHN table, or contact details except through the checked functions. There is no storage select policy. Downloads go through `document-url`. Sending a document from the Edge Function requires an administration or medical role, and a medical caller must be that patient’s assigned NP or herbalist.
