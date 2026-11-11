import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  return createClient(url, key, { global: { headers: { Authorization: auth } } })
}

export function adminClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !key) return null
  return createClient(url, key)
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

/** Log a status only. Never log names, numbers, or document text. */
export function logStatus(event: string, status: string, id?: string) {
  console.log(JSON.stringify({ event, status, id: id ?? null }))
}
