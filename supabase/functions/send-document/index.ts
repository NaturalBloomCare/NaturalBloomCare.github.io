import { adminClient, json, logStatus, userClient } from '../_shared/supabase.ts'

const cors = {
  'access-control-allow-origin': 'https://naturalbloom.ca',
  'access-control-allow-headers': 'authorization, content-type, apikey',
  'access-control-allow-methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405)

  const sb = userClient(req)
  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData.user) return json({ status: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  const channel = String(body.channel || '')
  const purpose = String(body.purpose || 'Continuing care').slice(0, 180)
  const what = String(body.what || 'Requisition record').slice(0, 180)
  const to = String(body.to || '').slice(0, 180)
  if (!documentId || !['portal', 'email', 'fax'].includes(channel)) {
    return json({ status: 'error', message: 'Choose portal, email, or fax.' }, 400)
  }

  const { data: profile } = await sb.from('profiles').select('id, portal_role').eq('id', userData.user.id).maybeSingle()
  if (!profile || (profile.portal_role !== 'admin' && profile.portal_role !== 'medical')) {
    logStatus('send', 'forbidden', documentId)
    return json({ status: 'forbidden', message: 'Only administration or an assigned medical practitioner can send a document.' }, 403)
  }

  const { data: doc, error: docError } = await sb
    .from('generated_documents')
    .select('id, patient_id, template_name, storage_path')
    .eq('id', documentId)
    .maybeSingle()
  if (docError || !doc) return json({ status: 'forbidden' }, 403)

  const { data: patient } = await sb
    .from('patients')
    .select('id, np_profile_id, hns_profile_id')
    .eq('id', doc.patient_id)
    .maybeSingle()
  if (!patient) return json({ status: 'forbidden' }, 403)
  if (profile.portal_role === 'medical' && patient.np_profile_id !== userData.user.id && patient.hns_profile_id !== userData.user.id) {
    logStatus('send', 'not_assigned', documentId)
    return json({ status: 'forbidden', message: 'This patient is not assigned to you.' }, 403)
  }

  if (channel === 'portal') {
    const released = await sb.rpc('release_document', { p_id: documentId })
    if (released.error) return json({ status: 'error', message: 'The document could not be released.' }, 400)
    await sb.from('disclosures').insert({
      patient_id: doc.patient_id,
      disclosed_to: 'Client portal',
      purpose,
      what_disclosed: what,
      recorded_by: userData.user.id,
      channel: 'portal',
      status: 'Released',
      document_id: documentId
    })
    logStatus('send', 'released', documentId)
    return json({
      status: 'released',
      channel: 'portal',
      message: 'The client can open this from their portal after they sign in. The file was not emailed.'
    })
  }

  if (channel === 'email') {
    const provider = Deno.env.get('EMAIL_PROVIDER') ?? ''
    const apiKey = Deno.env.get('EMAIL_API_KEY') ?? ''
    const from = Deno.env.get('EMAIL_FROM') ?? ''
    if (!provider || !apiKey || !from || !to) {
      await sb.from('disclosures').insert({
        patient_id: doc.patient_id,
        disclosed_to: to || 'Email recipient',
        purpose,
        what_disclosed: what,
        recorded_by: userData.user.id,
        channel: 'email',
        status: 'not_configured',
        document_id: documentId
      })
      logStatus('send', 'not_configured', documentId)
      return json({
        status: 'not_configured',
        channel: 'email',
        message: 'Email is not configured. Set EMAIL_PROVIDER, EMAIL_API_KEY and EMAIL_FROM. Nothing was sent.'
      })
    }

    const token = crypto.randomUUID() + crypto.randomUUID()
    const tokenHash = await sha256(token)
    const registered = await sb.rpc('register_requisition_link', {
      p_document_id: documentId,
      p_token_hash: tokenHash,
      p_recipient: to,
      p_purpose: purpose,
      p_what: what
    })
    if (registered.error || !registered.data?.id) {
      logStatus('send', 'denied', documentId)
      return json({ status: 'error', message: registered.error?.message || 'The secure link could not be stored.' }, 400)
    }
    const hours = Number(registered.data.ttl_hours || 72)
    const url = `https://naturalbloom.ca/portal/link.html?t=${encodeURIComponent(token)}`
    const text = [
      'Natural Bloom Care Inc. has a document for you.',
      'The file is not attached to this email.',
      `The link works for ${hours} hours and can be turned off by the clinic.`,
      url,
      'If you were not expecting this, delete this message.'
    ].join('\n\n')
    const sent = await sendEmail(provider, apiKey, from, to, 'A document from Natural Bloom Care Inc.', text)
    await sb.from('disclosures').insert({
      patient_id: doc.patient_id,
      disclosed_to: to,
      purpose,
      what_disclosed: what,
      recorded_by: userData.user.id,
      channel: 'email',
      status: sent.ok ? 'Link sent' : 'Failed',
      document_id: documentId
    })
    logStatus('send', sent.ok ? 'link_sent' : 'failed', documentId)
    if (!sent.ok) return json({ status: 'failed', channel: 'email', linkId: registered.data.id, message: 'The email provider did not accept the message. The file was not attached. You can revoke the link.' }, 502)
    return json({
      status: 'sent',
      channel: 'email',
      linkId: registered.data.id,
      message: `A link was sent without the file attached. It works for ${hours} hours and can be revoked.`
    })
  }

  const { data: clinic } = await sb.from('clinic_settings').select('fax_enabled').eq('id', 1).maybeSingle()
  const faxKey = Deno.env.get('FAX_API_KEY') ?? ''
  const faxProvider = (Deno.env.get('FAX_PROVIDER') ?? '').toLowerCase()
  const faxFlag = (Deno.env.get('FAX_ENABLED') ?? '').toLowerCase() === 'true'
  if (!faxFlag || !clinic?.fax_enabled || !faxKey || faxProvider !== 'documo' || !to) {
    await sb.from('disclosures').insert({
      patient_id: doc.patient_id,
      disclosed_to: to || 'Fax recipient',
      purpose,
      what_disclosed: what,
      recorded_by: userData.user.id,
      channel: 'fax',
      status: 'not_configured',
      document_id: documentId
    })
    logStatus('send', 'not_configured', documentId)
    return json({
      status: 'not_configured',
      channel: 'fax',
      message: 'Fax is turned off. Email a link instead. Nothing was sent.'
    })
  }
  const admin = adminClient()
  if (!admin) return json({ status: 'not_configured', channel: 'fax', message: 'The document service is missing its server key. Nothing was sent.' })
  const file = await admin.storage.from('patient-documents').download(doc.storage_path)
  if (file.error || !file.data) return json({ status: 'error', message: 'The PDF could not be read for faxing.' }, 500)
  const form = new FormData()
  form.append('faxNumber', to)
  form.append('attachments', new Blob([await file.data.arrayBuffer()], { type: 'application/pdf' }), 'requisition.pdf')
  const fax = await fetch(Deno.env.get('FAX_API_BASE') || 'https://api.documo.com/v1/faxes', {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(faxKey + ':')}` },
    body: form
  })
  await sb.from('disclosures').insert({
    patient_id: doc.patient_id,
    disclosed_to: to,
    purpose,
    what_disclosed: what,
    recorded_by: userData.user.id,
    channel: 'fax',
    status: fax.ok ? 'Sent' : 'Failed',
    document_id: documentId
  })
  logStatus('send', fax.ok ? 'fax_sent' : 'failed', documentId)
  if (!fax.ok) return json({ status: 'failed', channel: 'fax', message: 'The fax provider did not accept the document.' }, 502)
  return json({ status: 'sent', channel: 'fax', message: 'The fax was accepted by Documo. Confirm delivery in Documo before treating it as received.' })
})

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendEmail(provider: string, apiKey: string, from: string, to: string, subject: string, text: string) {
  const name = provider.toLowerCase()
  if (name === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text })
    })
    return { ok: res.ok }
  }
  if (name === 'postmark') {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': apiKey, 'content-type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: text, MessageStream: 'outbound' })
    })
    return { ok: res.ok }
  }
  const url = Deno.env.get('EMAIL_API_URL')
  if (!url) return { ok: false }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text })
  })
  return { ok: res.ok }
}
