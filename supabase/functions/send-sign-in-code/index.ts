import { adminClient, json, logStatus, optionsResponse, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405)
  const sb = userClient(req)
  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData.user) return json({ status: 'unauthorized', message: 'Sign in again.' }, 401)

  const provider = Deno.env.get('EMAIL_PROVIDER') ?? ''
  const apiKey = Deno.env.get('EMAIL_API_KEY') ?? ''
  const from = Deno.env.get('EMAIL_FROM') ?? ''
  if (!provider || !apiKey || !from) {
    logStatus('sign-in-code', 'not_configured')
    return json({
      status: 'not_configured',
      message: 'Sign-in codes cannot be sent until email is configured. Nothing was sent.'
    })
  }

  const sessionId = sessionIdFrom(req)
  if (!sessionId) return json({ status: 'invalid', message: 'Sign in again.' }, 401)
  const code = randomCode()
  const codeHash = await sha256(code)
  const admin = adminClient()
  if (!admin) {
    return json({ status: 'not_configured', message: 'Sign-in codes cannot be sent until email is configured. Nothing was sent.' })
  }
  const prepared = await admin.rpc('prepare_sign_in_code', {
    p_user_id: userData.user.id,
    p_session_id: sessionId,
    p_code_hash: codeHash
  })
  const status = String(prepared.data?.status || '')
  if (prepared.error || !prepared.data?.ok) {
    logStatus('sign-in-code', status || 'denied')
    if (status === 'throttled') return json({ status, message: 'Please wait a minute and try again.' }, 429)
    if (status === 'locked') return json({ status, message: 'Too many attempts. Try again later.' }, 429)
    return json({ status: 'invalid', message: 'A code could not be sent.' }, 400)
  }
  const sent = await sendCode(provider, apiKey, from, String(prepared.data.email || ''), code)
  if (!sent) {
    await admin.rpc('clear_sign_in_code', { p_user_id: userData.user.id })
    logStatus('sign-in-code', 'failed')
    return json({ status: 'failed', message: 'The code could not be sent. Nothing was opened.' }, 502)
  }
  logStatus('sign-in-code', 'sent')
  return json({ status: 'sent', message: 'A code was sent to your account email. It works once and expires in 10 minutes.' })
})

function sessionIdFrom(req: Request): string {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const part = token.split('.')[1]
  if (!part) return ''
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return String(json.session_id || '')
  } catch {
    return ''
  }
}

function randomCode(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(100000 + (buf[0] % 900000))
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendCode(provider: string, apiKey: string, from: string, to: string, code: string) {
  const text = `Your Natural Bloom Care Inc. sign-in code is ${code}. It works once and expires in 10 minutes.`
  const subject = 'Your Bloom sign-in code'
  const name = provider.toLowerCase()
  if (!to) return false
  if (name === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text })
    })
    return res.ok
  }
  if (name === 'postmark') {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': apiKey, 'content-type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: text, MessageStream: 'outbound' })
    })
    return res.ok
  }
  const url = Deno.env.get('EMAIL_API_URL')
  if (!url) return false
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text })
  })
  return res.ok
}
