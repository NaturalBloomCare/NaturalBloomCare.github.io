# Staff role matrix

This is the access the database enforces after `20261111181500_role_matrix_and_read_audit.sql`. It is not a statement that the portal meets any privacy statute. A person still has to confirm that each role matches the clinic’s duties.

| | Owner | Administration | Medical (NP) | Holistic |
| --- | --- | --- | --- | --- |
| Directory of names, city, status | Yes | Yes | Assigned patients | Assigned patients |
| Date of birth, email, address | No | Yes, for requisitions | Yes, for assigned patients | No |
| Phone | No | Yes | Yes | Yes, for assigned patients |
| Health number | No | Last four digits, full number only with a reason | Last four digits, full number only with a reason | No |
| Requisitions and generated PDFs | No | Yes | Assigned patients | No |
| Wellness plans | No | No | Assigned patients, publish | Own drafts, cannot publish |
| Audit log | Latest 400 server rows | No | No | No |
| Clinic settings and staff accounts | Yes | No | No | No |
| Send or revoke a requisition link | No | Yes | Assigned patients | No |

The owner’s workspace blanks date of birth, email, phone, address and the health number. Holistic staff receive the same blanks except the phone number of an assigned patient. Generated documents are not selectable by the owner or by holistic staff.

Reads of a client record, a requisition, or a document call `public.note_staff_view`, which appends an audit row. Staff cannot update or delete `audit.events`.

The health number is collected for requisitions. The PDF copy stores the last four digits. The full number stays in `private.patient_identifiers` until `reveal_phn`, which requires `patients.reveal_ahc` (administration and the NP) and a reason.
