# Migration apply order

Apply these files in this order, in the Supabase SQL editor or with `supabase db push` after the project is linked. Do not skip one. They assume the hosted project already has `auth` and `storage`.

1. `supabase/migrations/20261111180000_foundation.sql`
2. `supabase/migrations/20261111180100_rpcs.sql`
3. `supabase/migrations/20261111180200_auth_hooks.sql`
4. `supabase/migrations/20261111180300_storage.sql`
5. `supabase/migrations/20261111180400_seed.sql`
6. `supabase/migrations/20261111180500_secure_links.sql`

Then deploy the Edge Functions:

- `supabase/functions/send-document`
- `supabase/functions/document-url`
- `supabase/functions/open-secure-link`

The seed is fictional and marked testing. Staff password on the fictional accounts is `BloomStaff-Test-2026!`. The fictional client `amelia.hart@example.com` uses `BloomClient-Test-2026!`. Disable these accounts before any real information is stored. The passwords are in this public repository.

After the SQL is applied, turn on two Authentication hooks or lockout and live role claims will not run:

- Password verification attempt → `public.hook_password_verification_attempt`
- Custom access token → `public.custom_access_token_hook`

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
