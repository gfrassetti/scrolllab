import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getProduct } from './products'

/**
 * Cart store for sold commerce templates — separate from SCROLLLAB marketplace cart.
 */
export const useShopCart = create(
  persist(
    (set, get) => ({
      lines: [],
      drawerOpen: false,

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set({ drawerOpen: !get().drawerOpen }),

      addItem: (productId, qty = 1) => {
        const product = getProduct(productId)
        if (!product) return
        const lines = [...get().lines]
        const existing = lines.find((l) => l.productId === product.id)
        if (existing) {
          existing.qty += qty
        } else {
          lines.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            currency: product.currency,
            img: product.img,
            qty,
          })
        }
        set({ lines, drawerOpen: true })
      },

      setQty: (productId, qty) => {
        const next = Math.max(0, Number(qty) || 0)
        set({
          lines: get()
            .lines.map((l) =>
              l.productId === productId ? { ...l, qty: next } : l,
            )
            .filter((l) => l.qty > 0),
        })
      },

      removeItem: (productId) => {
        set({ lines: get().lines.filter((l) => l.productId !== productId) })
      },

      clear: () => set({ lines: [] }),

      count: () => get().lines.reduce((n, l) => n + l.qty, 0),

      total: () => get().lines.reduce((n, l) => n + l.price * l.qty, 0),
    }),
    {
      name: 'scrolllab-shop-cart-v1',
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
)
