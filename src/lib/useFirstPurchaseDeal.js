import { useMemo } from 'react'
import { useAuth } from './auth'
import { useWelcomeCoupon } from './welcomeCoupon'
import { firstPurchaseDeal } from './coupon'
import { useCurrency } from './currency'
import { useFxRate } from './fx'

/**
 * Precio de los «Comprar» rápidos (píldora de las demos, catálogo, bundle,
 * builder, ficha), que saltan el carrito: con el 10% de primera compra a la
 * vista SOLO si quien mira todavía no compró. El cupón lo devuelve el servidor
 * únicamente a una cuenta sin compras pagas ni reembolsadas, y se descarta al
 * confirmar una compra; sin sesión, precio de lista.
 */
export function useFirstPurchaseDeal(usd) {
  const { user } = useAuth()
  const { currency } = useCurrency()
  const { rate } = useFxRate()
  const userId = user?.id ?? null
  const coupon = useWelcomeCoupon((s) => (userId && s.userId === userId ? s.coupon : null))
  return useMemo(
    () => firstPurchaseDeal({ usd, currency, rate, coupon }),
    [usd, currency, rate, coupon],
  )
}
