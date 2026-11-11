# Authentication and authorization

## Sign-in

Clients use `/portal/`. Staff use `/staff/`. Both use Supabase Auth email and password. The publishable key in `assets/bloom-config.js` is the browser key. The service-role key is read only inside Edge Functions from the platform environment.

Staff must reach authenticator assurance level `aal2` before `staff_bootstrap` returns data. A staff member with no factor is shown a TOTP enrolment screen. A staff member who already has a factor is shown the six-digit challenge.

Clients may enrol TOTP from Profile. If they have a verified factor, row checks require `aal2` as well. If they have not enrolled, `aal1` is enough for their own portal.

Deactivated and invited accounts are rejected by `hook_password_verification_attempt` once that hook is enabled in the Supabase dashboard. Five failed passwords in 15 minutes lock the account for 15 minutes. The hook has to be selected in Authentication → Hooks or GoTrue will not call it.

`custom_access_token_hook` copies `portal_role` from `public.profiles` into `app_metadata`. Policies read that claim, not `user_metadata`, because users can edit the latter.

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

Patients cannot insert or update `wellness_plans`. Publishing requires `approved_by` and `published_by`. A trigger rejects bodies that carry diagnoses, labs, prescriptions or biomarker rows.

Tracking rows are forced to `source = 'patient-entered'`. The client can hide or soft-delete their own rows. A care-team read requires consent, and hidden rows are excluded.

Direct select on `workspace_items` is not granted. Staff read it through `staff_bootstrap`, which filters notes and requisitions. RLS is enabled with no permissive policy so a later grant does not dump every note.

## What was not granted

`anon` has no patient-table access. `authenticated` cannot select the audit log, the PHN table, or contact details except through the checked functions. There is no storage select policy. Downloads go through `document-url`.
