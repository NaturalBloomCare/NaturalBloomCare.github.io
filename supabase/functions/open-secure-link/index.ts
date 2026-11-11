import { adminClient, json, logStatus, optionsResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405)
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  const action = String(body.action || '')
  const code = String(body.code || '').replace(/\D/g, '')
  if (!token || !['request-code', 'confirm', 'open'].includes(action)) {
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

  if (action === 'open') {
    const gate = await admin.rpc('redeem_requisition_link', { p_token_hash: tokenHash })
    const gateStatus = String(gate.data?.status || '')
    if (gate.error || !gate.data?.ok) {
      logStatus('secure-link', gateStatus || 'invalid', found.data.document_id)
      const message = gateStatus === 'revoked'
        ? 'This link was turned off. Ask the clinic to send a new one.'
        : gateStatus === 'expired'
          ? 'This link has expired. Ask the clinic to send a new one.'
          : 'This link is not valid.'
      return json({ status: gateStatus || 'invalid', message }, gateStatus === 'expired' ? 410 : 404)
    }
    const signed = await admin.storage.from('patient-documents').createSignedUrl(String(gate.data.storage_path), Number(gate.data.ttl_seconds || 900))
    if (signed.error || !signed.data?.signedUrl) return json({ status: 'error', message: 'A short-lived link could not be created.' }, 500)
    logStatus('secure-link', 'opened', found.data.document_id)
    return json({ status: 'ok', url: signed.data.signedUrl, expiresIn: Number(gate.data.ttl_seconds || 900) })
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
    const codeHash = await sha256(next)
    const gate = await admin.rpc('request_secure_link_code', { p_token_hash: tokenHash, p_code_hash: codeHash })
    const gateStatus = String(gate.data?.status || '')
    if (gate.error || !gate.data?.ok) {
      const status = gateStatus === 'throttled' || gateStatus === 'locked' ? gateStatus : 'invalid'
      logStatus('secure-link', status, found.data.document_id)
      const message = status === 'throttled'
        ? 'A code was just sent. Wait a minute before asking for another.'
        : status === 'locked'
          ? 'Too many code requests. This link is locked for 15 minutes.'
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

  const attempts = Number(found.data.failed_attempts || 0)
  if (!code || !found.data.code_hash || await sha256(code) !== found.data.code_hash) {
    const nextAttempts = attempts + 1
    const locked = nextAttempts >= 5
    await admin.from('secure_links').update({
      failed_attempts: nextAttempts,
      locked_until: locked ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
    }).eq('id', found.data.id)
    logStatus('secure-link', locked ? 'locked' : 'rejected', found.data.document_id)
    if (locked) return json({ status: 'locked', message: 'Too many incorrect codes. This link is locked for 15 minutes.' }, 429)
    return json({ status: 'error', message: 'That code does not match. Request a new one if it has expired.' }, 401)
  }
  const doc = await admin.from('generated_documents').select('storage_path').eq('id', found.data.document_id).maybeSingle()
  if (!doc.data) return json({ status: 'error', message: 'The document is no longer available.' }, 404)
  const signed = await admin.storage.from('patient-documents').createSignedUrl(doc.data.storage_path, 120)
  if (signed.error || !signed.data?.signedUrl) return json({ status: 'error', message: 'A short-lived link could not be created.' }, 500)
  await admin.from('secure_links').update({ confirmed_at: new Date().toISOString(), code_hash: null, failed_attempts: 0, locked_until: null }).eq('id', found.data.id)
  logStatus('secure-link', 'opened', found.data.document_id)
  return json({ status: 'ok', url: signed.data.signedUrl, expiresIn: 120 })
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
  const text = `Your Natural Bloom Care Inc. confirmation code is ${code}. It opens one document for two minutes.`
  if (provider.toLowerCase() === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: 'Your confirmation code', text })
    })
    return res.ok
  }
  const url = Deno.env.get('EMAIL_API_URL')
  if (!url) return false
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Your confirmation code', text })
  })
  return res.ok
}
