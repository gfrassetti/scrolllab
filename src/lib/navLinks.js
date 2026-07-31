function slug(label) {
  return String(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Normalizes nav links into `{ label, href }`.
 *
 * Accepts plain labels (`'Story'` → `#story`, so you only add `id="story"`
 * to the section), explicit pairs (`'Story | #chapter-1'`), or objects.
 * `text` is the newline-separated form the builder edits and wins over
 * `links` when present.
 */
export function parseNavLinks(links, text) {
  const source =
    typeof text === 'string' && text.trim()
      ? text.split('\n')
      : Array.isArray(links)
        ? links
        : []

  return source
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        const label = String(entry.label ?? '').trim()
        return label ? { label, href: entry.href || `#${slug(label)}` } : null
      }
      const raw = String(entry ?? '').trim()
      if (!raw) return null
      const [label, href] = raw.split('|').map((part) => part.trim())
      if (!label) return null
      return { label, href: href || `#${slug(label)}` }
    })
    .filter(Boolean)
}
