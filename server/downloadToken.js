import crypto from 'node:crypto'

/**
 * Link de descarga firmado de una orden paga: payload base64url
 * ({ orderId, userId, exp }) + HMAC-SHA256 con DOWNLOAD_SECRET. Vence a los
 * `ttlSeconds`; la verificación compara en tiempo constante.
 */
export function signDownloadToken({ orderId, userId, secret, ttlSeconds }) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = Buffer.from(JSON.stringify({ orderId, userId, exp })).toString(
    'base64url',
  )
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyDownloadToken(token, secret) {
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  if (sig.length !== expected.length) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (!crypto.timingSafeEqual(a, b)) return null
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  if (data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}
