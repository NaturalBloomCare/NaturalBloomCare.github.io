# Patient-information inventory

Classification below is a working label for the build, not a legal opinion. Counsel and the Nurse Practitioner custodian need to confirm HIA versus PIPA for each row before launch. “Needs human review” means this repository does not decide the classification.

| Information | Where it lives | Working label | Notes |
| --- | --- | --- | --- |
| Client name, city, Alberta-only flag, Jane chart reference, care-team assignment | `public.patients` | Likely HIA registration information once the person is a patient. Needs human review. | The owner portal is not given date of birth, email, phone or address. |
| Date of birth, email, phone, address, postal code | `private.patient_contact` | Likely HIA if collected to provide a health service. Needs human review. | Not granted to the browser role. Returned by a checked function. |
| Alberta PHN | `private.patient_identifiers` | Health information. Needs human review. | Last four digits in the staff workspace. Full number only through `reveal_phn`, which writes an audit row. Testing rows store obviously invalid samples such as `00000-0001`. |
| Appointment time and visit label | `public.appointments` | Scheduling. Needs human review. | No clinical note is stored on the row. |
| Requisition status and staff tasks | `public.workspace_items` | Operational. The free text can become health information if staff type it. | Staff are told not to paste a history. |
| Generated requisition PDF | Private bucket `patient-documents` | Health information once it names a patient and a test. Needs human review. | No public URL. Download is a signed link of at most 120 seconds. |
| Disclosure and send status | `public.disclosures` | Accountability record. | Append-only. |
| Wellness note body | `public.wellness_plans` | May be health information even though it is not a medical treatment plan. Needs human review. | Published only after an NP is recorded as approver. Patients cannot update the row. |
| Wellness version history | `public.wellness_plan_versions` | Same as the note. | Append-only. |
| Library articles and general reference ranges | `public.library_articles`, `public.reference_ranges` | Not a patient’s information. | Ranges are labelled as education, not a result. |
| Sleep, steps, activity, HRV, heart rate, weight, other biometrics the client types | `public.tracking_entries` | Sensitive. May be HIA or PIPA depending on role and use. Needs human review. | Labelled patient-entered. Consent, hide and delete are required. Delete clears the number. |
| Tracking consent | `public.tracking_consents` | Personal information about a choice. | Withdrawal stops new entries. |
| Staff name, role, credentials text | `public.profiles` | Staff personal information under PIPA. Needs human review. | Registration numbers are `TODO`, not invented licences. The signed-in user cannot update this row, including `portal_role` or `cred`. |
| Portal access list: email, name, phone, portal, staff role, active or inactive | `private.portal_access` | Contact details for who may sign in. Not a health record. Needs human review. | One row per email. Row level security is on. The browser roles have no privilege. Clover syncs it with `private.apply_access_list`, which only the service role can call. |
| Clinic name, address, phone, fax, Jane URL, idle timeout | `public.clinic_settings` | Business contact information. Needs human review. | One row. No patient data. The owner writes it through `staff_commit`. |
| Privacy incident report | `public.incidents` | May contain health information if the reporter names a patient or describes an event. Needs human review. | Staff insert their own report. The owner can read them. The description is not copied into function logs. |
| Secure document link | `public.secure_links` | A token hash, a recipient address and a confirmation-code HMAC. The recipient address is personal information. Needs human review. | No browser policy. A new code can be sent at most once a minute and eight times per link. A failed email send is released and does not count toward those eight. Failed code attempts increment `failed_attempts` and lock the link for 15 minutes after five failures. A new code does not reset that count. The code is generated with `crypto.getRandomValues` and stored as an HMAC with the Vault pepper `code_pepper`. After the code is accepted, `confirmed_at` is set and the file address lasts at most two minutes. The code goes to the same mailbox as the link. TODO: SMS as a second channel is not built. |
| Sign-in email code | `private.sign_in_codes` and `private.sign_in_code_passes` | A code HMAC and the session that passed it. Not a health record. | The code is emailed to the account address. It expires in 10 minutes and works once. Five failures lock it. A new code does not clear those failures while the lock holds. The pepper is not stored in the table. |
| Failed password counter | `private.login_attempts` | Staff account security data. Not a health record. | Row level security is on and the API roles have no privilege. The password itself is not stored. |
| Session activity | `private.session_touch` | Session id, user id and last activity time. | Row level security is on and the API roles have no privilege. Used to expire an idle session. |
| Audit log | `audit.events` | Accountability record. May itself be health information when it names a patient. Needs human review. | Append-only, with a hash chain. |
| Password, session, MFA secret | Supabase Auth | Credential. Not a health record, but a safeguard for one. | Service role is not in the website. |
| Waitlist name, email, phone, interest | Existing Google Apps Script. Not Supabase. | PIPA personal information. Needs human review. | Unchanged from the current site. The form leaves Canada. |
| Diagnoses, history, clinical notes, prescriptions, lab results, NP treatment recommendations | Jane only | Health information under HIA, in Jane. | Not given columns in Supabase. |

Under-18 clients can be stored only when `guardian_patient_id` points at an active adult client. The database trigger enforces that. The portal does not check that the person is physically in Alberta at the time of a visit. That remains an operational rule.

The environment row is `testing`. The seed is fictional. Real PHI must not be loaded until the agreements and the PIA path in the checklist are done.
