# Migration apply order

Apply these files in this order, in the Supabase SQL editor or with `supabase db push` after the project is linked. Do not skip one. They assume the hosted project already has `auth` and `storage`.

1. `supabase/migrations/20261111180000_foundation.sql`
2. `supabase/migrations/20261111180100_rpcs.sql`
3. `supabase/migrations/20261111180200_auth_hooks.sql`
4. `supabase/migrations/20261111180300_storage.sql`
5. `supabase/migrations/20261111180400_seed.sql`
6. `supabase/migrations/20261111180500_secure_links.sql`
7. `supabase/migrations/20261111180600_lock_direct_writes.sql`
8. `supabase/migrations/20261111180700_seed_credentials_and_second_client.sql`
9. `supabase/migrations/20261111180800_storage_patient_prefix.sql`
10. `supabase/migrations/20261111180900_audit_integrity.sql`
11. `supabase/migrations/20261111181000_published_plan_version.sql`
12. `supabase/migrations/20261111181100_secure_link_throttle.sql`
13. `supabase/migrations/20261111181200_audit_chain_rls_and_code_release.sql`

Migrations 1–12 are already applied on the live project. Apply 13 after them. The seed file no longer contains a sign-in secret. Migration 8 is what replaced the live passwords.

Then deploy the Edge Functions:

- `supabase/functions/send-document`
- `supabase/functions/document-url`
- `supabase/functions/open-secure-link`

After migration 13, redeploy `open-secure-link`. A code request is throttled by `request_secure_link_code`. If the email provider rejects the send, `release_secure_link_code` gives that attempt back so it does not count toward the eight-request limit.

The seed is fictional and marked testing. Migration 8 replaces every `@example.com` password with a random value that cannot be used to sign in, and it replaces stored health numbers with obviously invalid samples such as `00000-0001`. Set a test password privately through the password-reset page.

After the SQL is applied, turn on the custom access token hook or live role claims will not run:

- Custom access token → `public.custom_access_token_hook`

The Password Verification Attempt hook (`public.hook_password_verification_attempt`) cannot be enabled on the current Pro plan. Supabase reserves that hook for the Team plan. Until then, per-account lockout and failed-login auditing are not active. The controls that still apply are no public sign-ups, leaked-password protection, staff TOTP MFA, Supabase Auth rate limits, the 15-minute idle timeout, and `private.profile_active()` checks.

Add these redirect URLs in Authentication:

- `https://naturalbloom.ca/auth/reset.html`
- `https://naturalbloom.ca/portal/`
- `https://naturalbloom.ca/staff/`

Set Edge Function secrets only in the Supabase dashboard, never in the website:

| Secret | Required to send | If missing |
| --- | --- | --- |
| `SUPABASE_URL` | Injected by Supabase on hosted functions | Function cannot start |
| `SUPABASE_ANON_KEY` | Injected | Function cannot read the caller |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected. Used only to sign a URL | Download and fax return not configured |
| `EMAIL_PROVIDER` | `resend`, `postmark`, or another name with `EMAIL_API_URL` | Email returns not configured |
| `EMAIL_API_KEY` | Yes, for email | not configured |
| `EMAIL_FROM` | Yes, for email | not configured |
| `EMAIL_API_URL` | Only for a provider other than Resend or Postmark | not configured |
| `FAX_PROVIDER` | Must be `documo` | Fax returns not configured |
| `FAX_API_KEY` | Yes, for fax | not configured |
| `FAX_API_BASE` | Optional. Defaults to `https://api.documo.com/v1/faxes` | Uses the default |

Nothing is sent while those secrets are empty. The attempt is still written to the disclosure log with status `not_configured`.
