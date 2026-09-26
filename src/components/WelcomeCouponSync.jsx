import { useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useWelcomeCoupon } from '../lib/welcomeCoupon'
import { useI18n } from '../i18n'

/**
 * Sin pantalla: al haber sesión pide el cupón de bienvenida (lo crea la primera
 * vez y ahí sale el mail); al cerrar sesión lo borra. Lo lee el carrito y la cuenta.
 */
export default function WelcomeCouponSync() {
  const { user, loading } = useAuth()
  const { locale } = useI18n()
  const load = useWelcomeCoupon((s) => s.load)
  const clear = useWelcomeCoupon((s) => s.clear)
  const userId = user?.id ?? null

  useEffect(() => {
    if (loading) return
    if (userId) load(userId, { locale })
    else clear()
  }, [loading, userId, locale, load, clear])

  return null
}
