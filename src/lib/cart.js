import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  arsFromUsd,
  BUNDLE_MODELS,
  estimateCustomPriceUsd,
  isComingSoonSku,
  templatePriceUsd,
} from './pricing.js'
import { MAX_CART_COMPOSITIONS } from '../domain/catalog.js'
import { recipeHasCommerce, currentCompositionId } from './composition.js'
import { couponLinePrice } from './coupon.js'
import { trackAddToCart } from './gtm.js'

export function isCustomSku(sku) {
  return sku === 'custom' || String(sku).startsWith('custom:')
}

/** Id de la composición de una línea del builder (sin id: la «actual», como antes). */
const compositionIdOf = (item) => item?.compositionId || 'current'

/**
 * Clave única de una línea del carrito: el sku de un template, o la
 * composición del builder (puede haber varias, cada una con su id).
 */
export function cartItemKey(item) {
  return isCustomSku(item?.sku) ? `custom:${compositionIdOf(item)}` : item?.sku
}

/**
 * Título de una línea: con varias composiciones del builder, cada una dice cuál
 * es y cuántas secciones lleva («Composición 2 · 10 secciones»).
 * @param {any} item
 * @param {any[]} items
 * @param {(key: string, vars?: any) => string} t
 */
export function cartLineTitle(item, items, t) {
  const n = compositionNumber(items, item)
  const count = item.recipe?.length || 0
  return n ? t(count === 1 ? 'cart.compositionNOne' : 'cart.compositionN', { n, count }) : item?.title
}

/**
 * Número de una composición entre las del carrito (1, 2…), o null si es la
 * única: con una sola no hace falta numerarla.
 */
export function compositionNumber(items, item) {
  const customs = (items || []).filter((i) => isCustomSku(i.sku))
  if (customs.length < 2) return null
  const index = customs.findIndex((i) => cartItemKey(i) === cartItemKey(item))
  return index < 0 ? null : index + 1
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

/**
 * Precios del carrito con cupón opcional: lo que muestra la página. `payable`
 * tiene que ser lo que cobra el servidor (`discountedArsFromUsd` de
 * server/catalog.js): hay un test que compara los dos.
 */
export function priceCartLines({
  items,
  catalog,
  rate,
  showUsd = false,
  coupon = null,
}) {
  const currency = showUsd ? 'USD' : 'ARS'
  const lines = (items || []).map((item) => {
    const usd = cartLinePriceUsd(item, catalog)
    const list = showUsd ? usd : cartLinePriceArs(item, catalog, rate)
    const discounted =
      coupon && list != null
        ? couponLinePrice({ usd, rate, percent: coupon.percent, currency })
        : null
    return {
      ...item,
      unit_price: list,
      discounted_price: discounted,
      currency_id: currency,
    }
  })
  const total = lines.reduce((sum, l) => sum + (l.unit_price || 0), 0)
  const payable = lines.reduce(
    (sum, l) => sum + ((l.discounted_price ?? l.unit_price) || 0),
    0,
  )
  return { lines, total, payable, discount: total - payable }
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
  show: (item, { already = false, updated = false, inBundle = false, absorbed = 0, full = false } = {}) =>
    set({
      notice: {
        id: crypto.randomUUID(),
        sku: item.sku,
        title: item.title,
        recipe: item.recipe,
        already,
        updated,
        inBundle,
        absorbed,
        full,
      },
    }),
  clear: () => set({ notice: null }),
}))

/** Modelos sueltos que el bundle ya trae: tenerlos al lado sería pagarlos dos veces. */
export function withoutBundleOverlap(items) {
  if (!(items || []).some((i) => i.sku === 'bundle')) return items || []
  return items.filter((i) => !BUNDLE_MODELS.includes(i.sku))
}

/**
 * Cart is UX-only. Prices are re-validated on the server at checkout.
 * Composiciones del builder: hasta MAX_CART_COMPOSITIONS, cada una con su id
 * (`compositionId`); re-agregar la misma la reemplaza. Cada una se cobra y se
 * baja aparte. El bundle absorbe los modelos sueltos que ya trae.
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
          const key = cartItemKey(nextItem)
          const same = items.some((i) => cartItemKey(i) === key)
          if (same) {
            set({ items: items.map((i) => (cartItemKey(i) === key ? nextItem : i)) })
            useCartNotice.getState().show(nextItem, { updated: true })
            return true
          }
          if (items.filter((i) => isCustomSku(i.sku)).length >= MAX_CART_COMPOSITIONS) {
            useCartNotice.getState().show(nextItem, { full: true })
            return false
          }
          set({ items: [...items, nextItem] })
          useCartNotice.getState().show(nextItem)
          trackAddToCart(nextItem)
          return true
        }

        const exists = items.find((i) => i.sku === item.sku)
        if (exists) {
          useCartNotice.getState().show(item, { already: true })
          return false
        }
        if (BUNDLE_MODELS.includes(item.sku) && items.some((i) => i.sku === 'bundle')) {
          useCartNotice.getState().show(item, { inBundle: true })
          return false
        }
        const next = withoutBundleOverlap([...items, { ...item, qty: 1 }])
        set({ items: next })
        useCartNotice
          .getState()
          .show(item, { absorbed: items.length + 1 - next.length })
        trackAddToCart(item)
        return true
      },
      /**
       * La composición del carrito sigue a la del builder: si después de
       * «Agregar al carrito» se siguió editando, se paga (y se descarga) la
       * versión actual, no la foto del momento en que se agregó. Solo la
       * composición con ese id: las otras del carrito no se tocan. Sin esa
       * composición en el carrito no agrega nada, y un builder vacío no borra
       * la que ya estaba.
       */
      syncComposition: (recipe, compositionId) => {
        if (!Array.isArray(recipe) || recipe.length === 0) return
        const items = get().items
        const key = cartItemKey({ sku: 'custom', compositionId })
        const current = items.find((i) => cartItemKey(i) === key)
        if (!current) return
        if (JSON.stringify(current.recipe) === JSON.stringify(recipe)) return
        set({
          items: items.map((i) => (cartItemKey(i) === key ? { ...i, recipe } : i)),
        })
      },
      /** Por clave (`cartItemKey`): el sku de un template o una composición. */
      removeItem: (key) => {
        set({ items: get().items.filter((i) => cartItemKey(i) !== key && i.sku !== key) })
      },
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    // v2: una sola composición custom (antes se apilaban custom:…)
    {
      name: 'scrolllab-cart-v2',
      merge: (persisted, current) => {
        const items = Array.isArray(persisted?.items)
          ? withoutBundleOverlap(
              persisted.items.filter((item) => !isComingSoonSku(item?.sku)),
            ).map((item) =>
              // Carrito de antes de las composiciones múltiples: su composición
              // es la que está abierta en el builder (así sigue sincronizando).
              isCustomSku(item?.sku) && !item.compositionId
                ? { ...item, compositionId: currentCompositionId() }
                : item,
            )
          : current.items
        return { ...current, ...persisted, items }
      },
    },
  ),
)
