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
 * Pasa de las animaciones completas a la versión con menos movimiento y
 * viceversa. MotionNotice pregunta una sola vez; esto es lo que queda para
 * cambiar de idea, y por eso vive en el header. Solo aparece si el dispositivo
 * pide reducir el movimiento (para el resto no hay nada que elegir). No toca
 * ningún ajuste del dispositivo: guarda la preferencia de ScrollLab y recarga.
 */
export default function MotionToggle() {
  const t = useT()
  const [asks, setAsks] = useState(deviceWantsLessMotion)
  const [persistent] = useState(canRemember)

  useEffect(() => watchDeviceMotion(setAsks), [])

  if (!asks || !persistent) return null

  const full = isMotionForced()
  const label = t('motionToggle.label')

  return (
    <button
      type="button"
      onClick={() => setMotion(full ? 'calm' : 'full')}
      aria-pressed={full}
      aria-label={label}
      title={label}
      className="group grid size-11 place-items-center transition-colors hover:text-accent"
    >
      <span className="grid size-7 place-items-center rounded-full border border-ink/25 transition-colors group-hover:border-accent">
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <circle cx="10.5" cy="8" r="2.4" fill="currentColor" />
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="transition-opacity"
          >
            <path d="M6.2 4.6a5 5 0 0 0 0 6.8" opacity={full ? 1 : 0.3} />
            <path d="M3 2.9a8.6 8.6 0 0 0 0 10.2" opacity={full ? 0.6 : 0.2} />
          </g>
        </svg>
      </span>
    </button>
  )
}
