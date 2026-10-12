import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import {
  canRemember,
  deviceWantsLessMotion,
  isMotionForced,
  setMotion,
  watchDeviceMotion,
} from '../lib/motionOverride'

/**
 * «Animaciones: Sí / No»: pasa de las animaciones completas a la versión con
 * menos movimiento y viceversa. MotionNotice pregunta una sola vez; esto es lo
 * que queda para cambiar de idea, y vive junto al idioma y el tema (menú de
 * preferencias del header y menú del teléfono), con texto: un ícono suelto no
 * decía qué era. Solo aparece si el dispositivo pide reducir el movimiento
 * (para el resto no hay nada que elegir). No toca ningún ajuste del
 * dispositivo: guarda la preferencia de ScrollLab y recarga.
 *
 * `className` se aplica solo cuando el control se dibuja, así quien lo aloja
 * puede darle un separador sin que quede una línea vacía cuando no aparece.
 */
export default function MotionToggle({ className = '' }) {
  const t = useT()
  const [asks, setAsks] = useState(deviceWantsLessMotion)
  const [persistent] = useState(canRemember)

  useEffect(() => watchDeviceMotion(setAsks), [])

  if (!asks || !persistent) return null

  const full = isMotionForced()
  const choose = (wantsFull) => {
    if (wantsFull !== full) setMotion(wantsFull ? 'full' : 'calm')
  }
  const option = (wantsFull, label) => {
    const on = wantsFull === full
    return (
      <button
        type="button"
        onClick={() => choose(wantsFull)}
        aria-pressed={on}
        className={`min-h-11 min-w-9 px-1.5 transition-colors ${
          on ? 'text-accent' : 'text-ink/40 hover:text-accent'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label={t('motionToggle.label')}
      className={`flex items-center justify-between gap-3 ${className}`}
    >
      <span className="text-body-sm text-ink/60">{t('motionToggle.row')}</span>
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] md:text-xs">
        {option(true, t('motionToggle.full'))}
        {option(false, t('motionToggle.reduced'))}
      </span>
    </div>
  )
}
