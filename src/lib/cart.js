import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  arsFromUsd,
  estimateCustomPriceUsd,
  isComingSoonSku,
  templatePriceUsd,
} from './pricing.js'
import { recipeHasCommerce } from './composition.js'
import { trackAddToCart } from './gtm.js'

export function isCustomSku(sku) {
  return sku === 'custom' || String(sku).startsWith('custom:')
}

/**
 * Precio en pesos de una línea del carrito. La composición no guarda monto:
 * se recalcula desde la receta con la misma fórmula que aplica el checkout,
 * así un carrito viejo en localStorage nunca muestra el precio de ayer.
 */
export function cartLinePriceArs(item, catalog, rate) {
  if (isCustomSku(item?.sku)) {
    const recipe = item?.recipe || []
    return arsFromUsd(
      estimateCustomPriceUsd(recipe.length, recipeHasCommerce(recipe)),
      rate,
    )
  }
  return catalog?.[item?.sku]?.unit_price ?? null
}

/** Precio de lista en USD para mostrar cuando el UI está en inglés. */
export function cartLinePriceUsd(item, catalog) {
  if (isCustomSku(item?.sku)) {
    const recipe = item?.recipe || []
    return estimateCustomPriceUsd(recipe.length, recipeHasCommerce(recipe))
  }
  return (
    catalog?.[item?.sku]?.unit_price_usd ?? templatePriceUsd(item?.sku) ?? null
  )
}

const CHECKOUT_INTENT_KEY = 'scrolllab-checkout-intent'
/** Ventana para retomar el pago: más viejo que esto ya no es el mismo intento. */
const CHECKOUT_INTENT_TTL_MS = 30 * 60 * 1000

/**
 * El comprador ya apretó Pagar pero le faltaba sesión. Al volver del login
 * el carrito retoma solo el checkout en vez de pedirle otro click.
 */
export function markCheckoutIntent(now = Date.now()) {
  try {
    sessionStorage.setItem(CHECKOUT_INTENT_KEY, String(now))
  } catch {
    /* ignore */
  }
}

/** Devuelve si había intención vigente y la consume (no se repite). */
export function takeCheckoutIntent(now = Date.now()) {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_KEY)
    sessionStorage.removeItem(CHECKOUT_INTENT_KEY)
    const at = Number(raw)
    if (!Number.isFinite(at) || at <= 0) return false
    return now - at <= CHECKOUT_INTENT_TTL_MS
  } catch {
    return false
  }
}

export const useCartNotice = create((set) => ({
  notice: null,
  show: (item, { already = false, updated = false } = {}) =>
    set({
      notice: {
        id: crypto.randomUUID(),
        sku: item.sku,
        title: item.title,
        recipe: item.recipe,
        already,
        updated,
      },
    }),
  clear: () => set({ notice: null }),
}))

/**
 * Cart is UX-only. Prices are re-validated on the server at checkout.
 * Solo una composición del builder a la vez: al re-agregar, se reemplaza.
 */
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (isComingSoonSku(item?.sku)) return false
        const items = get().items

        if (isCustomSku(item.sku)) {
          // SKU estable: el precio/catalog siempre mapea a `custom`.
          const nextItem = { ...item, sku: 'custom', qty: 1 }
          const hadCustom = items.some((i) => isCustomSku(i.sku))
          const rest = items.filter((i) => !isCustomSku(i.sku))
          set({ items: [...rest, nextItem] })
          useCartNotice.getState().show(nextItem, { updated: hadCustom })
          trackAddToCart(nextItem)
          return true
        }

        const exists = items.find((i) => i.sku === item.sku)
        if (exists) {
          useCartNotice.getState().show(item, { already: true })
          return false
        }
        set({ items: [...items, { ...item, qty: 1 }] })
        useCartNotice.getState().show(item)
        trackAddToCart(item)
        return true
      },
      removeItem: (sku) => {
        // Solo ese ítem (templates o la única composición `custom`).
        set({ items: get().items.filter((i) => i.sku !== sku) })
      },
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    // v2: una sola composición custom (antes se apilaban custom:…)
    {
      name: 'scrolllab-cart-v2',
      merge: (persisted, current) => {
        const items = Array.isArray(persisted?.items)
          ? persisted.items.filter((item) => !isComingSoonSku(item?.sku))
          : current.items
        return { ...current, ...persisted, items }
      },
    },
  ),
)
