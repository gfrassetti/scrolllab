import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartNotice = create((set) => ({
  notice: null,
  show: (item, { already = false } = {}) =>
    set({
      notice: {
        id: crypto.randomUUID(),
        sku: item.sku,
        title: item.title,
        recipe: item.recipe,
        already,
      },
    }),
  clear: () => set({ notice: null }),
}))

/**
 * Cart is UX-only. Prices are re-validated on the server at checkout.
 */
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const exists = get().items.find((i) => i.sku === item.sku)
        if (exists && item.sku !== 'custom' && !String(item.sku).startsWith('custom:')) {
          useCartNotice.getState().show(item, { already: true })
          return false
        }
        set({ items: [...get().items, { ...item, qty: 1 }] })
        useCartNotice.getState().show(item)
        return true
      },
      removeItem: (sku) => {
        set({ items: get().items.filter((i) => i.sku !== sku) })
      },
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: 'scrolllab-cart-v1' },
  ),
)
