/**
 * Cupón de bienvenida de quien tiene sesión. No hay formulario: cuando alguien
 * entra con su cuenta de Google y todavía no compró, el servidor le crea el
 * cupón (una vez) y le manda el mail; acá solo se pide y se guarda lo que
 * responde, para que el carrito lo aplique solo y la cuenta lo mencione.
 *
 * El descuento real lo calcula siempre POST /api/checkout, que recibe el código.
 */
import { create } from 'zustand'
import { api } from './api.js'
import { trackLead } from './gtm.js'
import { loadUtm } from './utm.js'

/**
 * Pide el cupón (`post` y `utm` se inyectan en los tests). Devuelve
 * `{ coupon, created }`: `coupon` es null si no hay uno vigente (ya compró,
 * lo usó o venció) y `created` dice si el servidor lo creó recién.
 */
export async function fetchWelcomeCoupon({
  locale,
  post = api.welcomeCoupon,
  utm = loadUtm(),
} = {}) {
  const data = await post({ locale: locale === 'en' ? 'en' : 'es', utm })
  const coupon = data?.coupon?.code
    ? {
        code: data.coupon.code,
        percent: data.coupon.percent,
        expiresAt: data.coupon.expiresAt,
      }
    : null
  return { coupon, created: data?.created === true }
}

export const useWelcomeCoupon = create((set, get) => ({
  userId: null, // de quién es lo que hay guardado
  status: 'idle', // idle | loading | ready
  coupon: null, // { code, percent, expiresAt } si hay uno vigente

  /** Lo pide una sola vez por usuario y por carga de página. */
  load: async (userId, { locale, post } = {}) => {
    if (!userId) return
    const current = get()
    if (current.userId === userId && current.status !== 'idle') return

    set({ userId, status: 'loading', coupon: null })
    try {
      const { coupon, created } = await fetchWelcomeCoupon({ locale, post })
      if (get().userId !== userId) return // cambió de cuenta mientras esperaba
      set({ coupon, status: 'ready' })
      if (created) trackLead({ source: 'account' })
    } catch {
      // Sin cupón no se rompe nada: se paga a precio de lista.
      if (get().userId === userId) set({ coupon: null, status: 'ready' })
    }
  },

  /** El servidor lo rechazó al pagar (ya usado, vencido…): se saca del carrito. */
  drop: () => set({ coupon: null }),

  /** Cerró sesión: no queda nada de la cuenta anterior. */
  clear: () => set({ userId: null, status: 'idle', coupon: null }),
}))
