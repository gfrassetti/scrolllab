import { getSection } from './sectionRegistry'

export const STORAGE_KEY = 'builder-composition-v1'

/**
 * Load the saved builder composition from localStorage, dropping any
 * entries whose section no longer exists in the registry. Shared by
 * the builder and the /preview route (new-tab preview).
 */
export function loadComposition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw).filter((item) => getSection(item.sectionId))
  } catch {
    return []
  }
}

export function saveComposition(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}
