import { adminClient, json, logStatus, optionsResponse, userClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405)
  const sb = userClient(req)
  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData.user) return json({ status: 'unauthorized' }, 401)
  const body = await req.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  if (!documentId) return json({ status: 'error', message: 'Missing document.' }, 400)

  const { data: doc } = await sb
    .from('generated_documents')
    .select('id, storage_path, patient_id')
    .eq('id', documentId)
    .maybeSingle()
  if (!doc) return json({ status: 'forbidden' }, 403)

  const admin = adminClient()
  if (!admin) {
    logStatus('download', 'not_configured', documentId)
    return json({ status: 'not_configured', message: 'Signed links need the server key inside the Edge Function. Nothing was downloaded.' })
  }
  const { data: settings } = await admin.from('clinic_settings').select('signed_url_ttl_seconds').eq('id', 1).maybeSingle()
  const ttl = Math.min(300, Math.max(30, Number(settings?.signed_url_ttl_seconds || 120)))
  const signed = await admin.storage.from('patient-documents').createSignedUrl(doc.storage_path, ttl)
  if (signed.error || !signed.data?.signedUrl) {
    logStatus('download', 'failed', documentId)
    return json({ status: 'error', message: 'A short-lived link could not be created.' }, 500)
  }
  await sb.rpc('log_audit', {
    p_action: 'Downloaded document',
    p_record_id: documentId,
    p_info_type: 'Requisition PDF',
    p_ok: true,
    p_detail: 'Signed URL'
  })
  logStatus('download', 'signed', documentId)
  return json({ status: 'ok', url: signed.data.signedUrl, expiresIn: ttl })
})
