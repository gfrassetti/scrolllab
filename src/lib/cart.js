import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
          return
        }
        set({ items: [...get().items, { ...item, qty: 1 }] })
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
