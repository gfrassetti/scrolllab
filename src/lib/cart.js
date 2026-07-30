import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function isCustomSku(sku) {
  return sku === 'custom' || String(sku).startsWith('custom:')
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
        const items = get().items

        if (isCustomSku(item.sku)) {
          // SKU estable: el precio/catalog siempre mapea a `custom`.
          const nextItem = { ...item, sku: 'custom', qty: 1 }
          const hadCustom = items.some((i) => isCustomSku(i.sku))
          const rest = items.filter((i) => !isCustomSku(i.sku))
          set({ items: [...rest, nextItem] })
          useCartNotice.getState().show(nextItem, { updated: hadCustom })
          return true
        }

        const exists = items.find((i) => i.sku === item.sku)
        if (exists) {
          useCartNotice.getState().show(item, { already: true })
          return false
        }
        set({ items: [...items, { ...item, qty: 1 }] })
        useCartNotice.getState().show(item)
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
    { name: 'scrolllab-cart-v2' },
  ),
)
