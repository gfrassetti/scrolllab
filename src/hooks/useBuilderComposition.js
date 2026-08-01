import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  bootstrapComposition,
  saveComposition,
  compositionToRecipe,
  recipeHasCommerce,
  dedupeUniqueKinds,
  hasDuplicateChrome,
  kindIsBlocked,
  addSectionToComposition,
  updateCompositionItemProps,
  removeCompositionItem,
  moveCompositionItem,
  reorderCompositionItem,
} from '../lib/composition'
import { estimateCustomPriceUsd, MAX_CUSTOM_SECTIONS } from '../lib/pricing'

/**
 * Estado + mutaciones del builder. La UI (BuilderPage) solo renderiza.
 * Persistencia en localStorage en cada cambio; la receta de checkout
 * nunca incluye blob:/data: (assets de preview local).
 */
export function useBuilderComposition() {
  const [boot] = useState(bootstrapComposition)
  const [items, setItems] = useState(boot.items)
  const [preview, setPreview] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [limitNotice, setLimitNotice] = useState('')

  useEffect(() => {
    saveComposition(items)
  }, [items])

  useEffect(() => {
    if (!limitNotice) return undefined
    const id = window.setTimeout(() => setLimitNotice(''), 3200)
    return () => window.clearTimeout(id)
  }, [limitNotice])

  const duplicateChrome = useMemo(() => hasDuplicateChrome(items), [items])

  useEffect(() => {
    if (!duplicateChrome) return
    setItems((prev) => {
      const cleaned = dedupeUniqueKinds(prev)
      return cleaned.length === prev.length ? prev : cleaned
    })
  }, [duplicateChrome])

  const recipe = useMemo(() => compositionToRecipe(items), [items])
  const hasCommerce = useMemo(() => recipeHasCommerce(recipe), [recipe])
  const sectionCount = recipe.length
  const atMaxSections = sectionCount >= MAX_CUSTOM_SECTIONS
  const estimatedPriceUsd = estimateCustomPriceUsd(sectionCount, hasCommerce)

  const notify = useCallback((message) => {
    if (message) setLimitNotice(message)
  }, [])

  /** Devuelve null si entró, o el motivo por el que no: { reason, kind? }. */
  const addSection = useCallback((sectionId, atIndex) => {
    let blocked = null
    setItems((prev) => {
      if (prev.length >= MAX_CUSTOM_SECTIONS) {
        blocked = { reason: 'max' }
        return prev
      }
      const result = addSectionToComposition(prev, sectionId, atIndex)
      if (result.blocked) {
        blocked = { reason: 'kind', kind: result.kind }
        return prev
      }
      return result.items
    })
    return blocked
  }, [])

  const updateItemProps = useCallback((uid, props) => {
    setItems((prev) => updateCompositionItemProps(prev, uid, props))
  }, [])

  const removeItem = useCallback((uid) => {
    setItems((prev) => removeCompositionItem(prev, uid))
  }, [])

  const moveItem = useCallback((uid, delta) => {
    setItems((prev) => moveCompositionItem(prev, uid, delta))
  }, [])

  const reorderItem = useCallback((uid, index) => {
    setItems((prev) => reorderCompositionItem(prev, uid, index))
  }, [])

  const clearItems = useCallback(() => setItems([]), [])

  const isKindBlocked = useCallback(
    (sectionId) => kindIsBlocked(sectionId, items),
    [items],
  )

  const openPreview = useCallback(() => {
    window.scrollTo(0, 0)
    setPreview(true)
  }, [])

  const closePreview = useCallback(() => {
    window.scrollTo(0, 0)
    setPreview(false)
  }, [])

  return {
    items,
    setItems,
    preview,
    dragOver,
    setDragOver,
    limitNotice,
    setLimitNotice: notify,
    bootCleaned: boot.cleaned,
    recipe,
    hasCommerce,
    sectionCount,
    atMaxSections,
    estimatedPriceUsd,
    hasDuplicateChrome: duplicateChrome,
    addSection,
    updateItemProps,
    removeItem,
    moveItem,
    reorderItem,
    clearItems,
    isKindBlocked,
    openPreview,
    closePreview,
  }
}
