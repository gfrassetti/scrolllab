import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { getLenis } from '../hooks/useLenis'
import { deviceWantsLessMotion, getMotion, isMotionForced } from '../lib/motionOverride'

/**
 * Diagnóstico para mirar en un teléfono real: `?motion-debug` en cualquier URL
 * del market (dura la pestaña; `?motion-debug=0` lo apaga). Muestra qué corre de
 * verdad en ese dispositivo — modo de movimiento, puntero, pantalla, scroll
 * táctil, ScrollTriggers, cuadros por segundo y contextos WebGL perdidos — para
 * que una captura alcance para saber por qué una demo se ve distinta que en PC.
 *
 * Solo market, carga diferida y sin eventos de puntero encima de la página: no
 * viaja en el ZIP ni cambia cómo se ve lo que mide.
 */
const REFRESH_MS = 500

function snapshot({ fps, lostContexts }) {
  const media = (query) => window.matchMedia(query).matches
  const triggers = ScrollTrigger.getAll()
  const doc = document.documentElement
  const canvases = document.querySelectorAll('canvas').length
  const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
  const reduces = deviceWantsLessMotion()
  const saved = getMotion()
  return [
    ['modo', isMotionForced() || !reduces ? 'completo' : 'calma'],
    ['dispositivo reduce', `${reduces ? 'sí' : 'no'} · botón: ${saved ?? '—'}`],
    ['puntero', `${media('(pointer: coarse)') ? 'táctil' : 'fino'} · hover ${media('(hover: hover)') ? 'sí' : 'no'} · ${navigator.maxTouchPoints} toques`],
    ['pantalla', `${innerWidth}×${innerHeight} · visual ${Math.round(window.visualViewport?.width ?? innerWidth)}×${Math.round(window.visualViewport?.height ?? innerHeight)} · dpr ${devicePixelRatio}`],
    ['scroll', `${Math.round(scrollY)} / ${Math.round(doc.scrollHeight - innerHeight)} · normalizeScroll ${ScrollTrigger.normalizeScroll() ? 'sí' : 'no'} · Lenis ${getLenis() ? 'sí' : 'no'}`],
    ['ScrollTrigger', `${triggers.length} · pines ${triggers.filter((st) => st.pin).length} · activos ${triggers.filter((st) => st.isActive).length}`],
    ['cuadros', `${fps.avg} fps · mín ${fps.min}`],
    ['canvas', `${canvases} · WebGL perdidos ${lostContexts}`],
    ...(memory === null ? [] : [['memoria JS', `${memory} MB`]]),
    ['navegador', navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 64)],
  ]
}

export default function MotionDebug() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(true)
  const lost = useRef(0)
  const frames = useRef([])

  useEffect(() => {
    const onLost = () => {
      lost.current += 1
    }
    // El evento no burbujea: se lo ve en la fase de captura.
    document.addEventListener('webglcontextlost', onLost, true)

    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      frames.current.push(now - last)
      if (frames.current.length > 90) frames.current.shift()
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const read = () => {
      const deltas = frames.current
      const avgMs = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 16.7
      const worstMs = deltas.length ? Math.max(...deltas) : 16.7
      setRows(
        snapshot({
          fps: { avg: Math.round(1000 / avgMs), min: Math.round(1000 / worstMs) },
          lostContexts: lost.current,
        }),
      )
    }
    read()
    const timer = setInterval(read, REFRESH_MS)
    return () => {
      document.removeEventListener('webglcontextlost', onLost, true)
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
  }, [])

  const close = () => {
    try {
      sessionStorage.removeItem('scrolllab-motion-debug')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  if (!open) return null
  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-[2147483000] max-w-[calc(100vw-1rem)] rounded-md bg-black/80 px-3 py-2 font-mono text-[11px] leading-[1.45] text-[#d6ffcc]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="mb-1 pr-9 text-white/60">motion-debug</p>
      <dl className="m-0">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-[7.5rem] shrink-0 text-white/55">{label}</dt>
            <dd className="m-0 min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar el diagnóstico"
        className="pointer-events-auto absolute top-0 right-0 flex size-11 items-center justify-center text-base text-white/70"
      >
        ×
      </button>
    </div>
  )
}
