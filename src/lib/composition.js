import { getSection } from './sectionRegistry'
import { sanitizeProps } from './sectionFields'

export const STORAGE_KEY = 'builder-composition-v1'

/** Only scroll-section id for the commerce kit (PDP/cart/checkout are routes). */
export const COMMERCE_SCROLL_SECTION = 'commerce/ProductGrid'

/**
 * Normalize a composition item and drop unknown sections.
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

/** Carga cruda (sin dedupe de nav/hero/footer). */
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

/**
 * Load the saved builder composition from localStorage, dropping any
 * entries whose section no longer exists, and enforcing one nav/hero/footer.
 */
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

/** Recipe payload for checkout: [{ id, props? }, ...] */
export function compositionToRecipe(items) {
  return items.map((item) => {
    const props = sanitizeProps(item.sectionId, item.props)
    return props ? { id: item.sectionId, props } : { id: item.sectionId }
  })
}

export function recipeHasCommerce(recipe) {
  const ids = (recipe || []).map((entry) =>
    typeof entry === 'string' ? entry : entry?.id,
  )
  return ids.some((id) => String(id).startsWith('commerce/'))
}

/** Una sola nav / hero / footer: conserva la primera de cada tipo. */
const UNIQUE_CHROME_KINDS = new Set(['nav', 'hero', 'footer'])

export function dedupeUniqueKinds(items) {
  const seen = new Set()
  return (items || []).filter((item) => {
    const kind = getSection(item.sectionId)?.kind
    if (!kind || !UNIQUE_CHROME_KINDS.has(kind)) return true
    if (seen.has(kind)) return false
    seen.add(kind)
    return true
  })
}
