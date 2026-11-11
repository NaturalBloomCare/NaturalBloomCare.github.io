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

Failed passwords and the five-failure lock are not written today. `hook_password_verification_attempt` would write those rows, but that hook cannot be enabled on the Pro plan. It needs the Team plan. Until then this is a documented gap. The password itself is not stored.

Once migration 14 is applied and the custom access token hook is on, a refused sign-in writes `Sign-in blocked` with the detail `Not on access list`. The email address is not copied into that detail. Sheet sync writes `Updated access list` for each change, again without the email address.

A requisition send writes `Sent requisition link` with the recipient address, because the clinic asked for the recipient on that row. Requesting the one-time code writes `Requested requisition code`. A wrong or expired code writes `Requisition code rejected`, and the fifth failure writes `Requisition code locked`. A correct code writes `Opened requisition link`. Revoking the link writes `Revoked requisition link`. Staff cannot edit those rows.

A sign-in code writes `Requested sign-in code`, `Sign-in code accepted`, `Sign-in code rejected`, or `Sign-in code locked`. The code itself is not stored. The detail does not include the address. Opening a client record, a requisition, or a document also writes `Viewed …` through `note_staff_view`. The owner’s audit screen reads the latest 400 server rows. There is no point-in-time recovery on the Pro plan; that is a separate platform gap.

Tracking deletion nulls the value and the note, then writes “Deleted tracking entry” with the row id.

## What is not written

Edge Function logs contain an event name, a status and a document id. They do not contain a name, a health number, an email body or the PDF. No analytics product was added.

The audit detail is capped at 180 characters. Staff should still avoid typing a diagnosis into a task title. The task title is stored, and the audit line may quote a short target.

## Retention

The clinic’s own checklist in the staff portal says audit logs are kept 10 years, in line with Alberta’s logging standard, and records are kept 10 years after last service, longer for minors. This database does not delete audit rows. A retention job that deletes health records would need a documented destruction procedure and must not delete the audit of that destruction. That job is not built. The period itself needs human review against the NP’s retention schedule and the HIA.

Account closure is not a delete button. Deactivating a staff profile blocks sign-in and data access and keeps the audit. There is no client self-delete of the registration record, because that record may have to be retained. Tracking entries are the exception: the client can clear the number they typed.

## Review

`security_summary` can count recent failed sign-ins, current locks and denied audit events for the owner. Failed sign-ins and locks stay empty while the password hook cannot run. Denied audit events from the portal still appear. It does not return passwords or clinical text. A named person still has to read the log on a schedule. That person is not appointed here. The privacy officer field is `TODO: Privacy Officer name`.
