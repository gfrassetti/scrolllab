import { getSection } from './sectionRegistry'
import { sanitizeProps, isEphemeralAssetUrl } from './sectionFields'

export const STORAGE_KEY = 'builder-composition-v1'

/** Only scroll-section id for the commerce kit (PDP/cart/checkout are routes). */
export const COMMERCE_SCROLL_SECTION = 'commerce/ProductGrid'

/** Una sola nav / footer. Los heroes sí se pueden repetir. */
export const UNIQUE_CHROME_KINDS = new Set(['nav', 'footer'])

export function sectionKind(sectionId) {
  return getSection(sectionId)?.kind
}

export function isUniqueKind(kind) {
  return Boolean(kind && UNIQUE_CHROME_KINDS.has(kind))
}

/**
 * Normalize a composition item and drop unknown sections / bad props.
 * Preview-only blob: URLs are kept here so the builder can show local assets.
 */
export function normalizeCompositionItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const sectionId = raw.sectionId
  if (!getSection(sectionId)) return null
  const props = sanitizeProps(sectionId, raw.props)
  return {
    uid: typeof raw.uid === 'string' ? raw.uid : crypto.randomUUID(),
    sectionId,
    ...(props ? { props } : {}),
  }
}

/** Carga cruda (sin dedupe de nav/footer). */
export function readCompositionItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeCompositionItem).filter(Boolean)
  } catch {
    return []
  }
}

/** Una sola nav / footer: conserva la primera de cada tipo. */
export function dedupeUniqueKinds(items) {
  const seen = new Set()
  return (items || []).filter((item) => {
    const kind = sectionKind(item.sectionId)
    if (!isUniqueKind(kind)) return true
    if (seen.has(kind)) return false
    seen.add(kind)
    return true
  })
}

export function bootstrapComposition() {
  const loaded = readCompositionItems()
  const items = dedupeUniqueKinds(loaded)
  return { items, cleaned: items.length < loaded.length }
}

export function loadComposition() {
  return dedupeUniqueKinds(readCompositionItems())
}

export function saveComposition(items) {
  const normalized = dedupeUniqueKinds(
    (items || []).map(normalizeCompositionItem).filter(Boolean),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function clearComposition() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Recipe payload for checkout: [{ id, props? }, ...] — never ships blob:/data:. */
export function compositionToRecipe(items) {
  return (items || []).map((item) => {
    const props = sanitizeProps(item.sectionId, item.props)
    if (!props) return { id: item.sectionId }
    const exported = {}
    for (const [key, value] of Object.entries(props)) {
      if (isEphemeralAssetUrl(value)) continue
      exported[key] = value
    }
    return Object.keys(exported).length
      ? { id: item.sectionId, props: exported }
      : { id: item.sectionId }
  })
}

export function recipeHasCommerce(recipe) {
  const ids = (recipe || []).map((entry) =>
    typeof entry === 'string' ? entry : entry?.id,
  )
  return ids.some((id) => String(id).startsWith('commerce/'))
}

export function takenUniqueKinds(items) {
  const taken = new Set()
  for (const item of items || []) {
    const kind = sectionKind(item.sectionId)
    if (isUniqueKind(kind)) taken.add(kind)
  }
  return taken
}

export function hasDuplicateChrome(items) {
  const counts = { nav: 0, footer: 0 }
  for (const item of items || []) {
    const kind = sectionKind(item.sectionId)
    if (kind && kind in counts) counts[kind] += 1
  }
  return Object.values(counts).some((n) => n > 1)
}

export function kindIsBlocked(sectionId, items) {
  const kind = sectionKind(sectionId)
  return isUniqueKind(kind) && takenUniqueKinds(items).has(kind)
}

export function createCompositionItem(sectionId) {
  if (!getSection(sectionId)) return null
  return { uid: crypto.randomUUID(), sectionId }
}

export function addSectionToComposition(items, sectionId, atIndex) {
  const section = getSection(sectionId)
  if (!section) return { items, blocked: false }
  if (
    isUniqueKind(section.kind) &&
    (items || []).some((item) => sectionKind(item.sectionId) === section.kind)
  ) {
    return { items, blocked: true, kind: section.kind }
  }
  const nextItem = createCompositionItem(sectionId)
  const index = atIndex == null ? items.length : atIndex
  const next = [...items]
  next.splice(index, 0, nextItem)
  return { items: next, blocked: false }
}

export function updateCompositionItemProps(items, uid, props) {
  return (items || []).map((item) => {
    if (item.uid !== uid) return item
    const next = { uid: item.uid, sectionId: item.sectionId }
    const cleaned = sanitizeProps(item.sectionId, props)
    if (cleaned) next.props = cleaned
    return next
  })
}

export function removeCompositionItem(items, uid) {
  return (items || []).filter((item) => item.uid !== uid)
}

export function moveCompositionItem(items, uid, delta) {
  const from = (items || []).findIndex((item) => item.uid === uid)
  const to = from + delta
  if (from === -1 || to < 0 || to >= items.length) return items
  const next = [...items]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

/** Drop `uid` at `index` (palette reorder). */
export function reorderCompositionItem(items, uid, index) {
  const from = (items || []).findIndex((item) => item.uid === uid)
  if (from === -1) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(from < index ? index - 1 : index, 0, moved)
  return next
}
