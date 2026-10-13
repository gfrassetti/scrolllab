import { useEffect, useRef, useState } from 'react'
import { C, MONO } from './brand'
import { cursorEvents } from './cursorBus'

/**
 * cāpsula33 — el cursor: una mira de nave.
 *
 * Quieta: un anillo partido con un punto. Sobre un link o botón se achica.
 * Sobre una zona del local «fija el blanco»: los corchetes se cierran, la mira
 * gira y aparece la etiqueta (PAGE · zona). Arrastrando el local, flechas.
 * Solo con mouse; en pantallas táctiles queda el dedo.
 */

const bus = cursorEvents

export default function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState({ state: 'idle', label: '' })
  const [overLink, setOverLink] = useState(false)
  const [pressed, setPressed] = useState(false)
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    document.documentElement.classList.add('c33-cursor')
    const onSet = (e) => setMode(e.detail)
    bus.addEventListener('set', onSet)

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ring = { x: pos.x, y: pos.y }
    let visible = false
    let raf = 0
    const show = (v) => {
      visible = v
      if (dotRef.current) dotRef.current.style.opacity = v ? 1 : 0
      if (ringRef.current) ringRef.current.style.opacity = v ? 1 : 0
    }
    const onMove = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
      if (!visible) {
        ring.x = pos.x
        ring.y = pos.y
        show(true)
      }
    }
    const onOver = (e) => setOverLink(!!e.target.closest?.('a, button, [role="button"], input, label'))
    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    const onLeaveDoc = (e) => {
      if (!e.relatedTarget) show(false)
    }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      ring.x += (pos.x - ring.x) * 0.22
      ring.y += (pos.y - ring.y) * 0.22
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerout', onLeaveDoc, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      document.documentElement.classList.remove('c33-cursor')
      bus.removeEventListener('set', onSet)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerout', onLeaveDoc)
      cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null
  const lock = mode.state === 'lock'
  const drag = mode.state === 'drag'
  const small = overLink && !lock && !drag
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'

  return (
    <>
      <style>{`html.c33-cursor, html.c33-cursor * { cursor: none !important; }`}</style>
      <div ref={dotRef} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[100] opacity-0" style={{ willChange: 'transform' }}>
        <span className="absolute -top-[2px] -left-[2px] block h-1 w-1 rounded-full" style={{ background: C.neon, boxShadow: `0 0 8px ${C.neon}` }} />
      </div>
      <div ref={ringRef} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[100] opacity-0" style={{ willChange: 'transform' }}>
        <svg
          width="72"
          height="72"
          viewBox="-36 -36 72 72"
          className="absolute -top-9 -left-9 overflow-visible"
          style={{
            transform: `rotate(${lock ? 45 : 0}deg) scale(${small ? 0.55 : pressed ? 0.85 : 1})`,
            transition: `transform 450ms ${ease}`,
          }}
        >
          {/* Anillo partido en cuatro. */}
          <circle
            r={lock ? 11 : 15}
            fill="none"
            stroke={lock ? C.neon : 'rgba(242,233,220,0.85)'}
            strokeWidth="1"
            strokeDasharray={lock ? '4 3' : '17.5 6'}
            style={{ transition: `r 450ms ${ease}, stroke 300ms` }}
          />
          {/* Corchetes de blanco fijado. */}
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`} style={{ opacity: lock ? 1 : 0, transition: 'opacity 250ms' }}>
              <path
                d="M -7 -20 L -20 -20 L -20 -7"
                fill="none"
                stroke={C.neon}
                strokeWidth="1.5"
                style={{ transform: `translate(${lock ? 4 : -4}px, ${lock ? 4 : -4}px)`, transition: `transform 450ms ${ease}` }}
              />
            </g>
          ))}
          {/* Marcas de mira. */}
          {!lock && !drag
            ? [0, 90, 180, 270].map((a) => <line key={a} transform={`rotate(${a})`} x1="0" y1="-19" x2="0" y2="-23" stroke="rgba(242,233,220,0.6)" strokeWidth="1" />)
            : null}
          {/* Arrastre: flechas a los costados. */}
          {drag ? (
            <g stroke={C.neon} strokeWidth="1.5" fill="none">
              <path d="M -22 -5 L -28 0 L -22 5" />
              <path d="M 22 -5 L 28 0 L 22 5" />
            </g>
          ) : null}
        </svg>
        {lock && mode.label ? (
          <span
            className="absolute top-3 left-8 text-[10px] tracking-[0.2em] whitespace-nowrap uppercase"
            style={{ ...MONO, color: C.neon, textShadow: '0 0 12px rgba(5,5,6,0.9)' }}
          >
            ▸ {mode.label}
          </span>
        ) : null}
      </div>
    </>
  )
}
