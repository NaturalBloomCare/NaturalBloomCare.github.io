# Vendors and subprocessors

This is an inventory for the Nurse Practitioner’s PIA and for contract review. It is not a finding that any vendor meets Alberta’s information-manager test.

| Party | Role in this build | Where processing happens | Status |
| --- | --- | --- | --- |
| Natural Bloom Care Inc. | Clinic named on the public site. Custodianship of health information sits with the NP, not with this repository. | Alberta | Needs human review of the legal entity and the custodian. |
| Nurse Practitioner, Iris Calloway, MN, NP | Named practitioner. Registration number is still `TODO: CRNA registration number`. | Alberta | Needs human review. Do not treat the testing flag `verified: true` as a college check. |
| Rosemary Hale | Herbalist and nutrition specialist named on the public site. | Alberta | Needs human review of what wellness information she may see. |
| Supabase | Auth, Postgres, storage, Edge Functions. Project `yaehgbbuyzfpkjpdqlzs`, region stated as `ca-central-1`. | Intended: Canada Central. Backups, logs and support access need confirmation. | Needs human review and an information-manager agreement before real PHI. |
| GitHub Pages | Serves the static site, including this repository. | GitHub’s hosting. Not a Canadian health region. | Needs human review. Migration files with fictional records are downloadable because Pages serves the repo root. |
| Jane | Clinical system of record. Not integrated by API. | Jane’s region, to be confirmed in Jane’s agreement. | Needs human review. The portal URL is a blank placeholder. |
| Google Apps Script | Existing waitlist. Left unchanged. | Google. | Already in production on the site. Cross-border. Needs human review. |
| Email provider | Not selected. `send-document` and `open-secure-link` read `EMAIL_PROVIDER` (`resend`, `postmark`, or a custom `EMAIL_API_URL`), `EMAIL_API_KEY`, and `EMAIL_FROM`. No key is in the repository. A requisition email contains a Bloom link and a neutral notice. It does not attach the PDF and it does not name the patient or a health number. | Unknown until chosen. The clinic has to pick a provider and decide where that vendor stores the message. | Not configured. Nothing is sent. |
| Documo | Fax code remains. It runs only when `FAX_ENABLED=true`, `clinic_settings.fax_enabled` is true, `FAX_PROVIDER=documo`, and `FAX_API_KEY` is set. The defaults are off. | Documo’s region, commonly outside Canada. | Off. Needs human review before a fax of a requisition is turned on. |
| Open-Meteo | Removed. The staff clock no longer calls it. | — | Not used. |

Fonts and the Supabase, pdf.js, jsPDF and html2canvas libraries are files in this repository. The browser does not call Google Fonts or a JavaScript CDN for them.

No product analytics script was added. Edge Functions log a status and a document id, not a name, a health number or the text of a PDF.
