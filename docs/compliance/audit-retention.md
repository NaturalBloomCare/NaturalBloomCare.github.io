# Audit and retention

## What is written

`audit.events` is append-only. A trigger rejects update and delete. Each insert stores the previous row’s hash and a SHA-256 of that hash plus actor, action, record id, information type, detail and time. A superuser can still disable a trigger. The chain makes tampering visible. It does not make it impossible for a database owner.

Each row has:

- `actor_id`
- `at`
- `action`
- `record_id`
- `info_type` (the kind of record, not the clinical value)
- `detail` (a short label, capped)
- `ok`

Writes of patient tables also fire `audit.row_change`. Reads of the workspace and the client home are logged inside `staff_bootstrap` and `client_home`, because Postgres cannot attach a trigger to `SELECT`. Downloads call `record_document_download`, which checks that the caller can see the document and then writes the audit row. `log_audit` is limited to observational notes. Sends insert `public.disclosures`, which is also append-only, and the document row change is audited.

Each audit row stores the previous row’s hash. The head of that chain lives on one `audit.chain` row, which `audit.stamp` locks until the writing transaction commits. Row level security is on for `audit.chain` and there is no policy, so the API cannot read or write the head. Two concurrent writes therefore continue from the same head, including when a row id was allocated before the writer obtained the lock. The hash covers the actor, action, record, information type, detail and time.

Failed passwords are written by the password hook: failed sign-in, lock, deactivated, invited. The password itself is not stored.

Tracking deletion nulls the value and the note, then writes “Deleted tracking entry” with the row id.

## What is not written

Edge Function logs contain an event name, a status and a document id. They do not contain a name, a health number, an email body or the PDF. No analytics product was added.

The audit detail is capped at 180 characters. Staff should still avoid typing a diagnosis into a task title. The task title is stored, and the audit line may quote a short target.

## Retention

The clinic’s own checklist in the staff portal says audit logs are kept 10 years, in line with Alberta’s logging standard, and records are kept 10 years after last service, longer for minors. This database does not delete audit rows. A retention job that deletes health records would need a documented destruction procedure and must not delete the audit of that destruction. That job is not built. The period itself needs human review against the NP’s retention schedule and the HIA.

Account closure is not a delete button. Deactivating a staff profile blocks sign-in and data access and keeps the audit. There is no client self-delete of the registration record, because that record may have to be retained. Tracking entries are the exception: the client can clear the number they typed.

## Review

`security_summary` returns counts of recent failed sign-ins, current locks and denied audit events to the owner. It does not return passwords or clinical text. A named person still has to read the log on a schedule. That person is not appointed here. The privacy officer field is `TODO: Privacy Officer name`.
