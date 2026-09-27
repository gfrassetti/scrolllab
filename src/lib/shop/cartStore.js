import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getProduct, cartLineId } from './products'

/**
 * Cart store for sold commerce templates — separate from SCROLLLAB marketplace cart.
 *
 * Lines are keyed by `cartLineId(productId, variant)`, not by `productId`
 * alone: two sizes of the same tee are two lines, each with its own qty.
 * `setQty` / `removeItem` take that line id (what `lines[].id` holds), not
 * the raw product id.
 */
export const useShopCart = create(
  persist(
    (set, get) => ({
      lines: [],
      drawerOpen: false,

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set({ drawerOpen: !get().drawerOpen }),

      addItem: (productOrId, qty = 1, variant = null) => {
        // La grilla y la ficha pasan el producto de su catálogo (puede ser el
        // editado en el builder, ver ShopCatalog); un id suelto se busca en el
        // de ejemplo.
        const product =
          typeof productOrId === 'string' ? getProduct(productOrId) : productOrId
        if (!product?.id) return
        const id = cartLineId(product.id, variant)
        const lines = [...get().lines]
        const existing = lines.find((l) => l.id === id)
        if (existing) {
          existing.qty += qty
        } else {
          lines.push({
            id,
            productId: product.id,
            variant,
            variantLabel: variant ? product.variants?.label : null,
            name: product.name,
            price: product.price,
            currency: product.currency,
            img: product.img,
            qty,
          })
        }
        set({ lines, drawerOpen: true })
      },

      setQty: (lineId, qty) => {
        const next = Math.max(0, Number(qty) || 0)
        set({
          lines: get()
            .lines.map((l) => (l.id === lineId ? { ...l, qty: next } : l))
            .filter((l) => l.qty > 0),
        })
      },

      removeItem: (lineId) => {
        set({ lines: get().lines.filter((l) => l.id !== lineId) })
      },

      clear: () => set({ lines: [] }),

      count: () => get().lines.reduce((n, l) => n + l.qty, 0),

      total: () => get().lines.reduce((n, l) => n + l.price * l.qty, 0),
    }),
    {
      name: 'scrolllab-shop-cart-v1',
      partialize: (state) => ({ lines: state.lines }),
      // Carritos guardados antes de las variantes no tienen `id` — sin esto
      // `setQty`/`removeItem` no encontrarian la linea y quedarian rotas.
      migrate: (persisted) => {
        const state = persisted && typeof persisted === 'object' ? persisted : {}
        const lines = Array.isArray(state.lines) ? state.lines : []
        return {
          ...state,
          lines: lines.map((l) =>
            l && l.id ? l : { ...l, id: cartLineId(l?.productId, l?.variant) },
          ),
        }
      },
      version: 1,
    },
  ),
)
