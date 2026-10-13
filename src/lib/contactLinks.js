/**
 * Contact lines that work: an email becomes a `mailto:` link, a phone number a
 * `tel:` link, anything else stays text. And external links open in a new tab.
 *
 * Footers write their contact blocks as plain lines (the builder edits them as
 * a textarea); this is what turns them into links.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** `hello@brand.com` → `mailto:…`, `+39 011 555 0142` → `tel:+390115550142`, else null. */
export function contactHref(line) {
  const text = String(line ?? '').trim()
  if (EMAIL.test(text)) return `mailto:${text}`
  if (/^\+?[\d\s().-]+$/.test(text) && text.replace(/\D/g, '').length >= 7) return `tel:${text.replace(/[^\d+]/g, '')}`
  return null
}

/** `target` / `rel` for a link that leaves the page (http, https). */
export function externalProps(href) {
  return /^https?:\/\//i.test(String(href ?? '')) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

/**
 * The documents a footer hands to <LegalSheet>: one per link that points at a
 * hash (`#privacy`) and has text. A link to a real page (`/privacy`,
 * `https://…`) is left alone.
 */
export function legalDocs(entries) {
  const docs = {}
  for (const { href, title, body } of entries) {
    const h = String(href ?? '')
    if (h.startsWith('#') && h.length > 1 && String(body ?? '').trim()) docs[h.slice(1)] = { title, body }
  }
  return docs
}
