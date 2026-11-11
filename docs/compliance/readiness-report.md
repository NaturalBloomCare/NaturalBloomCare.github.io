# Compliance readiness report

Project: Bloom portals for Natural Bloom Care Inc.
Database: Supabase project `yaehgbbuyzfpkjpdqlzs`, region given as `ca-central-1`.
Clinical record: Jane.
This report does not say the portal is HIA compliant or PIPA compliant. Those conclusions need the Nurse Practitioner, a privacy lead and counsel.

Checklist sections 1, 5, 6 and 7 are mostly legal, contractual or operational. They are marked for human review. Sections 2, 3 and 4 are the technical items that could be built in this repository.

## Section 2 — Supabase infrastructure and security

| Item | Status | Evidence |
| --- | --- | --- |
| Production project in Canada Central | NEEDS MANUAL VERIFICATION | The brief names `ca-central-1`. This repo cannot read the project region. Confirm in the Supabase dashboard. |
| Where records, auth, files, backups and logs are processed | NEEDS MANUAL VERIFICATION | Schema and bucket are created for the linked project. Backup region and support access are a Supabase contract question. |
| Encryption in transit and at rest | NEEDS MANUAL VERIFICATION | The browser uses `https://yaehgbbuyzfpkjpdqlzs.supabase.co`. At-rest encryption is a platform control, not a setting in this repo. |
| RLS on every patient-data table | PASS | `20261111180000_foundation.sql` enables RLS on the public patient tables. `20261111180600_lock_direct_writes.sql` enables RLS with no API policy on `private.patient_contact`, `private.patient_identifiers`, `private.login_attempts` and `private.session_touch`. Direct updates of `profiles`, `wellness_plans` and `patients` are revoked. |
| Patient-level and clinic-level access | PASS | `private.can_see_patient` and the policies. Local test: the fictional NP Iris saw three assigned patients; Rosemary did not see the medical-only patient; the owner payload had blank date of birth and email. |
| MFA for administrators and clinical staff | PASS in the database and the staff UI | `private.assurance_ok` requires `aal2` for staff. `staff_bootstrap` raises without it. Local test: the same NP at `aal1` was rejected. The staff UI enrols TOTP. The password hook must still be enabled for lockout. MFA enrolment itself works without that hook. |
| Secure authentication and session expiration | PASS for idle timeout. NEEDS MANUAL VERIFICATION for JWT lifetime | `touch_session` and `private.session_ok`. Browser idle sign-out uses the clinic setting, default 15 minutes. JWT expiry is a dashboard setting this repo cannot change. |
| No privileged key in the frontend | PASS | `assets/bloom-config.js` has the publishable key only. The service-role key is read inside Edge Functions from the platform environment and is not assigned in HTML or browser JavaScript. |
| Secrets in a secret store | NEEDS MANUAL VERIFICATION | Secrets are named for the dashboard. They are not committed. Someone still has to set them. |
| Private bucket and short signed URLs | PASS in SQL and the function | Bucket `patient-documents` is private. There is no select policy. `document-url` signs a URL for 30–300 seconds, default 120, after the caller’s row check. |
| Backups and a tested restore | NEEDS MANUAL VERIFICATION | Supabase manages backups. This repo does not run a restore test. |
| Network restrictions | NEEDS MANUAL VERIFICATION | Not set from SQL. |
| Security Advisor | NEEDS MANUAL VERIFICATION | Needs a dashboard run after the migrations are applied. |

## Section 3 — Patient data and care plans

| Item | Status | Evidence |
| --- | --- | --- |
| Wellness separated from clinical care plans | PASS | No tables for diagnoses, labs, notes, prescriptions or NP treatment plans. `reject_clinical_wellness` blocks those keys. Client Results and clinical Care plan screens are a Jane handoff. |
| Source and responsible clinician | PASS for wellness notes | `wellness_plans.responsible_clinician_id`. Clinical plans are not stored, so they have no row here. They remain in Jane. |
| NP approval before publishing | PASS | `approve_wellness_plan` is the only publish path. It requires a verified NP credential and sets `approved_by` and `published_by` to `auth.uid()`. A herbalist cannot set those statuses. Direct table writes are revoked. |
| Patient sees only their records | PASS | Client policy and `client_home` use `private.my_patient()`. |
| Patients cannot edit clinician notes | PASS | `authenticated` has no insert or update grant on `wellness_plans`. A client also cannot update `profiles.portal_role` or `cred`. |
| Created, modified, approved, published | PASS | Those columns are on `wellness_plans`. |
| Version history | PASS | `wellness_plan_versions`, append-only. |
| Patient-entered data is labelled | PASS | `source` is forced to `patient-entered`. The client UI says the entries are not verified clinical data. |
| What stays in Jane | PASS as a design rule | Documented in the inventory. The staff chart’s clinical panels say “Held in Jane”. |
| Clinical data kept out of marketing | PASS for this build | No analytics tag was added. The waitlist form was already on the site and does not receive portal records. |

## Section 4 — Auditing and monitoring

| Item | Status | Evidence |
| --- | --- | --- |
| Log access, changes, downloads, disclosures | PASS with a limit | Changes use triggers. Workspace open, client home, PHN reveal, download and send are explicit writes. A raw `SELECT` that a later grant might allow is not triggered, because Postgres has no `SELECT` trigger. The granted path is the functions. |
| User, time, action, record id | PASS | `audit.events` columns `actor_id`, `at`, `action`, `record_id`. |
| Tamper resistance | PASS as a control, not as a guarantee against a superuser | Update and delete raise. Each row stores `prev_hash` and `row_hash`. |
| Retention period | NEEDS MANUAL VERIFICATION | The log is not auto-deleted. Ten years is the clinic’s stated target and is not implemented as a job. See `audit-retention.md`. |
| Failed login monitoring | PASS once the hook is enabled. NEEDS MANUAL VERIFICATION until then | `hook_password_verification_attempt` and `security_summary`. The hook does nothing until it is selected in the dashboard. |
| Breach detection and escalation | PARTIAL | The staff privacy-incident form writes `public.incidents`. It does not page anyone. Notification steps are in the staff checklist text and need a named privacy officer. |
| Breach procedure documented | NEEDS MANUAL VERIFICATION | The portal describes the duty. It does not appoint the officer or file the notices. |
| Security and privacy testing before launch | NEEDS MANUAL VERIFICATION | Local SQL role checks were run. No penetration test was run. |

## Conflicts with the Patient Portal Data Sharing Guide

These are decisions for the clinic, not things this build silently resolved.

1. The staff prototype’s lab-results, chart and clinical care-plan screens are still in the portal so the layout remains. They no longer load biomarker values, diagnoses or treatment text from Supabase. A medical user can still open the clinical editor as a browser scratch pad. It is labelled as not stored, and `staff_commit` drops any plan that is not a wellness note. Refresh clears it.
2. A generated PDF can contain whatever a staff member types into “What you are requesting” and “Note”. That text is not parsed into a diagnosis column, but it is health information inside the file if they paste a history. The guide says history stays in Jane. The field tells them to leave the history in Jane. The clinic should decide whether free text on a requisition is acceptable.
3. Emailing a link plus a code to the same mailbox does not attach the PDF, and it is not a true second channel. Fax, when Documo is configured, sends the PDF to Documo, which may be outside Canada.
4. Demographics and the PHN are stored so a requisition can be filled. The guide’s “keep in Jane” list does not name the PHN, but a PHN is still health information. It is in a private table and audited on reveal.
5. Fictional patients are seeded so the screens can be tried. They are marked testing. Migration 8 replaces the live passwords with random unusable values and replaces the sample health numbers with invalid placeholders such as `00000-0001`. The clinic sets a test password privately through password reset. GitHub Pages still publishes the repository, including the historical seed migration, so the project must stay free of real PHI.

## Launch blockers that need a person

- Information-manager agreement with Supabase, and a decision on GitHub Pages, Jane, the email provider and Documo.
- Privacy impact assessment filed by the NP custodian before real health information is used.
- Privacy officer named. The field is a TODO.
- CRNA registration numbers for Iris Calloway and any other NP. The field is a TODO. The testing seed marks the credential verified so the role can be exercised. That is not a college verification.
- Street address, phone and fax. They are TODOs.
- Jane portal URL. It is blank on purpose.
- Enable the two Auth hooks, shorten JWT expiry, allow the reset URLs, run Security Advisor, and test a backup restore.
- Turn off the fictional accounts before any real chart exists.
- Do not describe the portal as HIA or PIPA compliant in public material.
