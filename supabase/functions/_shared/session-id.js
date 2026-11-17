// Reads session_id from a JWT payload. The payload is base64url and may
// omit the padding that atob requires.
export function sessionIdFromJwt(token) {
  const part = String(token || '').replace(/^Bearer\s+/i, '').split('.')[1]
  if (!part) return ''
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = JSON.parse(atob(padded))
    return String(json.session_id || '')
  } catch {
    return ''
  }
}
