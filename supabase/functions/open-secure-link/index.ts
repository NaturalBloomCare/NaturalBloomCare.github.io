import { adminClient, json, logStatus, optionsResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405)
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  const action = String(body.action || '')
  const code = String(body.code || '').replace(/\D/g, '')
  if (!token || !['request-code', 'confirm'].includes(action)) {
    return json({ status: 'error', message: 'This link is not valid.' }, 400)
  }
  const admin = adminClient()
  if (!admin) return json({ status: 'not_configured', message: 'Secure links are not available until the server key is set.' })

  const tokenHash = await sha256(token)
  const found = await admin.from('secure_links').select('id, document_id, recipient, expires_at, code_hash, failed_attempts, locked_until').eq('token_hash', tokenHash).maybeSingle()
  if (found.error || !found.data) return json({ status: 'error', message: 'This link is not valid.' }, 404)
  if (new Date(found.data.expires_at).getTime() < Date.now()) {
    return json({ status: 'error', message: 'This link has expired. Ask the clinic to send a new one.' }, 410)
  }
  if (found.data.locked_until && new Date(found.data.locked_until).getTime() > Date.now()) {
    logStatus('secure-link', 'locked', found.data.document_id)
    return json({ status: 'locked', message: 'Too many incorrect codes. This link is locked for 15 minutes.' }, 429)
  }

  if (action === 'request-code') {
    const provider = Deno.env.get('EMAIL_PROVIDER') ?? ''
    const apiKey = Deno.env.get('EMAIL_API_KEY') ?? ''
    const from = Deno.env.get('EMAIL_FROM') ?? ''
    if (!provider || !apiKey || !from) {
      logStatus('secure-link', 'not_configured', found.data.document_id)
      return json({ status: 'not_configured', message: 'A confirmation code cannot be sent until email is configured.' })
    }
    const next = randomCode()
    const gate = await admin.rpc('request_secure_link_code', { p_token_hash: tokenHash, p_code: next })
    const gateStatus = String(gate.data?.status || '')
    if (gate.error || !gate.data?.ok) {
      const status = gateStatus === 'throttled' || gateStatus === 'locked' || gateStatus === 'not_configured' ? gateStatus : 'invalid'
      logStatus('secure-link', status, found.data.document_id)
      const message = status === 'throttled'
        ? 'A code was just sent. Wait a minute before asking for another.'
        : status === 'locked'
          ? 'Too many code requests. This link is locked for 15 minutes.'
          : status === 'not_configured'
            ? 'A confirmation code cannot be sent until the code pepper is configured.'
            : 'This link is not valid.'
      return json({ status, message }, status === 'invalid' ? 404 : 429)
    }
    const sent = await sendCode(provider, apiKey, from, String(gate.data.email || ''), next)
    logStatus('secure-link', sent ? 'code_sent' : 'failed', found.data.document_id)
    if (!sent) {
      await admin.rpc('release_secure_link_code', { p_token_hash: tokenHash })
      return json({ status: 'failed', message: 'The confirmation code could not be sent.' }, 502)
    }
    return json({ status: 'code_sent', message: 'A six-digit code was sent to the same address. It is not a second channel, so a person who can read that mailbox can also read the code.' })
  }

  const gate = await admin.rpc('confirm_requisition_code', { p_token_hash: tokenHash, p_code: code })
  const gateStatus = String(gate.data?.status || '')
  if (gate.error || !gate.data?.ok) {
    logStatus('secure-link', gateStatus || 'rejected', found.data.document_id)
    if (gateStatus === 'locked') return json({ status: 'locked', message: 'Too many attempts. Try again later.' }, 429)
    if (gateStatus === 'invalid') return json({ status: 'invalid', message: 'This link is not valid.' }, 404)
    return json({ status: 'rejected', message: 'That code was not accepted.' }, 401)
  }
  const ttl = Math.min(120, Number(gate.data.ttl_seconds || 120))
  const signed = await admin.storage.from('patient-documents').createSignedUrl(String(gate.data.storage_path), ttl)
  if (signed.error || !signed.data?.signedUrl) return json({ status: 'error', message: 'The document could not be opened.' }, 500)
  logStatus('secure-link', 'opened', found.data.document_id)
  return json({ status: 'ok', url: signed.data.signedUrl, expiresIn: ttl })
})

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
  const text = `Your Natural Bloom Care Inc. code is ${code}. It works once and expires in 10 minutes.`
  const subject = 'Your confirmation code'
  const name = provider.toLowerCase()
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
