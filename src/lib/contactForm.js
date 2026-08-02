/**
 * Client-side guards for the home contact form.
 * Formspree still receives plain text; we never inject HTML into the DOM.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

const LIMITS = {
  name: 80,
  email: 120,
  message: 2000,
  messageMin: 12,
}

/** Strip tags, control chars, and zero-width junk. */
export function sanitizePlainText(raw, maxLen) {
  let value = String(raw ?? '')
  value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  value = value.replace(/[\u200B-\u200D\uFEFF]/g, '')
  // Drop HTML/XML tags entirely, then any leftover brackets
  value = value.replace(/<\/?[^>]*>/g, ' ')
  value = value.replace(/[<>]/g, '')
  value = value.replace(/javascript\s*:/gi, '')
  value = value.replace(/\bon\w+\s*=/gi, '')
  value = value.replace(/\s+/g, ' ').trim()
  if (value.length > maxLen) value = value.slice(0, maxLen)
  return value
}

export function sanitizeContactPayload(input) {
  return {
    name: sanitizePlainText(input.name, LIMITS.name),
    email: sanitizePlainText(input.email, LIMITS.email).toLowerCase(),
    message: sanitizePlainText(input.message, LIMITS.message),
  }
}

/**
 * @returns {{ ok: true, data: {name,email,message} } | { ok: false, errors: Record<string,string> }}
 */
export function validateContactPayload(input, labels) {
  const data = sanitizeContactPayload(input)
  const errors = {}

  if (!data.name || data.name.length < 2) {
    errors.name = labels.nameRequired
  }
  if (!EMAIL_RE.test(data.email)) {
    errors.email = labels.emailInvalid
  }
  if (data.message.length < LIMITS.messageMin) {
    errors.message = labels.messageShort
  }

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, data }
}

export { LIMITS }
