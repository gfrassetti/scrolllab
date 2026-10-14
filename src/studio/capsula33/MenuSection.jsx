import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY, BODY } from './brand'
import { MAP_BG } from './mapScene'
import { PRICES } from './roomModel'

/**
 * cāpsula33 — «Menú»: la pantalla LED de la barra, a lo grande.
 *
 * Una matriz de puntos en canvas con los precios reales (los de la pantalla del
 * local). Con el scroll las filas se van escribiendo, punto por punto, como un
 * tablero. Una sola tipografía, un solo color de LED; el título de cada columna
 * va en naranja. El texto para lectores de pantalla es una lista aparte.
 */

const ELEGIDOS = ['Mar de otoño', 'Tostón del bosque negro', 'Poke bowl de trucha', 'Spaghetti con ciervo ahumado']

const K = 1.45 // resolución de la matriz (más puntos = letras más limpias)
const LINE = Math.round(13 * K) // alto de cada renglón, en puntos
const colW = Math.round(92 * K)
// Pantalla ancha: dos columnas lado a lado. Teléfono: una sola, una debajo de la otra.
const dims = (narrow) => (narrow ? { GW: Math.round(120 * K), GH: Math.round(222 * K) } : { GW: Math.round(230 * K), GH: Math.round(150 * K) })

/** Dibuja el texto del tablero en un canvas chico y devuelve los puntos prendidos. */
function buildDots(narrow) {
  const { GW, GH } = dims(narrow)
  const c = document.createElement('canvas')
  c.width = GW
  c.height = GH
  const g = c.getContext('2d', { willReadFrequently: true })
  g.clearRect(0, 0, GW, GH)
  g.textBaseline = 'alphabetic'
  const font = (w, px) => `${w} ${Math.round(px * K)}px 'Chakra Petch', 'Roboto Mono', monospace`
  const col = (x, y0, title, rows) => {
    g.font = font(700, 11)
    g.fillStyle = '#ff0000' // marca: encabezado
    g.fillText(title, x, y0 + Math.round(30 * K))
    g.fillRect(x, y0 + Math.round(36 * K), colW, Math.round(2 * K))
    g.font = font(600, 10)
    g.fillStyle = '#0000ff' // marca: renglón
    rows.forEach(([name, price], i) => {
      const y = y0 + Math.round(56 * K) + i * LINE
      g.textAlign = 'left'
      g.fillText(name.toUpperCase(), x, y)
      g.textAlign = 'right'
      g.fillText(price, x + colW, y)
    })
    g.textAlign = 'left'
  }
  g.font = font(700, 12)
  g.fillStyle = '#ff0000'
  g.fillText('CAFETERÍA', Math.round(14 * K), Math.round(14 * K))
  if (narrow) {
    col(Math.round(14 * K), 0, 'CALIENTES', PRICES.calientes)
    col(Math.round(14 * K), 7 * LINE + Math.round(27 * K), 'FRÍOS', PRICES.frios)
  } else {
    col(Math.round(14 * K), 0, 'CALIENTES', PRICES.calientes)
    col(Math.round(124 * K), 0, 'FRÍOS', PRICES.frios)
  }
  const { data } = g.getImageData(0, 0, GW, GH)
  const dots = []
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = (y * GW + x) * 4
      if (data[i + 3] < 110) continue
      // Rojo → encabezado (naranja); azul → texto (celeste LED).
      dots.push({ x, y, head: data[i] > data[i + 2], flash: 0 })
    }
  }
  return dots
}

export default function MenuSection() {
  const rootRef = useRef(null)
  const R = useRef({ progress: 0 })
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)
  const { GW, GH } = dims(narrow)

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 700)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  useEffect(() => {
    const r = R.current
    const canvas = r.canvas
    const ctx = canvas.getContext('2d')
    let dots = []
    let order = []
    let cell = 4
    let dpr = 1
    let grid = null
    let raf = 0
    let dirty = true
    let alive = true

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      // Lo que entra en el lugar libre (alto y ancho), sin cortarse nunca.
      const box = r.slot.getBoundingClientRect()
      const pad = window.innerWidth >= 768 ? 40 : 24
      cell = Math.max(1, Math.min((box.width - pad) / GW, (box.height - pad) / GH))
      const w = cell * GW
      canvas.style.width = `${w}px`
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(cell * GH * dpr)
      canvas.style.height = `${cell * GH}px`
      // La rejilla apagada se dibuja una vez y se copia.
      grid = document.createElement('canvas')
      grid.width = canvas.width
      grid.height = canvas.height
      const g = grid.getContext('2d')
      g.scale(dpr, dpr)
      g.fillStyle = 'rgba(127,212,255,0.07)'
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        g.beginPath()
        g.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.26, 0, Math.PI * 2)
        g.fill()
      }
      dirty = true
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (!alive || !dots.length) return
      const p = r.progress
      const shown = Math.floor(p * 1.08 * dots.length)
      let animating = false
      if (!dirty && r.lastShown === shown && !r.flashing) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(grid, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Los recién prendidos brillan más y se asientan.
      const prev = r.lastShown ?? 0
      for (let k = prev; k < Math.min(shown, order.length); k++) order[k].flash = 1
      for (let k = 0; k < Math.min(shown, order.length); k++) {
        const d = order[k]
        const base = d.head ? '255,122,26' : '127,212,255'
        const a = 0.82 + 0.18 * d.flash
        ctx.fillStyle = `rgba(${base},${a})`
        if (cell < 2.4) {
          // Puntos muy chicos: un cuadrado lleno se ve encendido; un círculo de medio píxel, apagado.
          const sz = cell * (0.86 + 0.14 * d.flash)
          ctx.fillRect(d.x * cell, d.y * cell, sz, sz)
        } else {
          ctx.beginPath()
          ctx.arc((d.x + 0.5) * cell, (d.y + 0.5) * cell, cell * (0.38 + 0.12 * d.flash), 0, Math.PI * 2)
          ctx.fill()
        }
        if (d.flash > 0) {
          d.flash = Math.max(0, d.flash - 0.04)
          animating = true
        }
      }
      // Los que ya no están (se volvió para arriba) se apagan sin quedar brillando.
      for (let k = shown; k < order.length; k++) order[k].flash = 0
      r.lastShown = shown
      r.flashing = animating
      dirty = false
    }

    const start = async () => {
      try {
        await document.fonts?.load("700 11px 'Chakra Petch'")
        await document.fonts?.load("600 10px 'Chakra Petch'")
      } catch {
        /* sin la fuente, la de reemplazo */
      }
      if (!alive) return
      dots = buildDots(narrow)
      // Orden de lectura, con un pequeño desorden por renglón (parece un barrido).
      order = [...dots].sort((a, b) => a.y - b.y || a.x - b.x)
      layout()
      raf = requestAnimationFrame(draw)
    }
    start()
    const ro = new ResizeObserver(() => dots.length && layout())
    ro.observe(r.slot)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [narrow]) // eslint-disable-line react-hooks/exhaustive-deps -- GW/GH salen de `narrow`

  useGSAP(
    () => {
      const r = R.current
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          r.progress = Math.max(0, Math.min(1, self.progress / 0.72))
          // Los Elegidos: la tira corre con el scroll y el plato que pasa por el centro se enciende.
          const q = Math.max(0, Math.min(1, (self.progress - 0.3) / 0.7))
          const track = r.track
          const lane = r.lane
          if (!track || !lane) return
          const items = [...track.querySelectorAll('[data-dish]')]
          const travel = Math.max(0, track.scrollWidth - lane.clientWidth * 0.5)
          const x = lane.clientWidth * 0.5 - items[0].offsetWidth / 2 - travel * q
          track.style.transform = `translate3d(${x}px, 0, 0)`
          const mid = lane.getBoundingClientRect().left + lane.clientWidth / 2
          items.forEach((el) => {
            const b = el.getBoundingClientRect()
            const d = Math.abs(b.left + b.width / 2 - mid) / (lane.clientWidth / 2)
            const k = Math.max(0, 1 - d * 1.6)
            el.style.opacity = String(0.28 + 0.72 * k)
            el.style.color = k > 0.5 ? C.neon : C.cream
          })
        },
      })
      gsap.fromTo(
        r.head.querySelectorAll('[data-in]'),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 55%', once: true } },
      )
    },
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)

  return (
    <section ref={rootRef} id="menu" className="relative h-[280svh]" style={{ background: '#05060a', color: C.cream }}>
      <div className="sticky top-0 flex h-svh flex-col gap-5 overflow-hidden px-6 pt-20 pb-6 md:gap-6 md:px-10 lg:px-[5vw] lg:pt-24 lg:pb-8">
        <div ref={set('head')} className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <p data-in className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase opacity-0" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
              <span className="h-px w-8" style={{ background: C.neon }} />
              Menú
            </p>
            {/* «cafetería» con la c del logo (la c con la barra naranja de c̄33). */}
            <h2 data-in aria-label="Cafetería" className="c33-cafe mt-3 text-[clamp(2.6rem,6.4vw,6.4rem)] leading-[0.95] font-light opacity-0" style={{ ...MONO, letterSpacing: '-0.04em' }}>
              <span aria-hidden="true" className="relative inline-block">
                <span className="absolute left-[0.1em] right-[0.1em] top-[0.17em] h-[0.06em] rounded-full" style={{ background: C.orange, boxShadow: `0 0 18px ${C.neon}` }} />
                c
              </span>
              <span aria-hidden="true">afetería</span>
            </h2>
          </div>
          <p data-in className="max-w-[34ch] text-[16px] leading-[1.5] opacity-0" style={{ ...BODY, color: 'rgba(242,233,220,0.7)' }}>
            Los precios, tal como los muestra la pantalla LED del local.
          </p>
        </div>

        <div ref={set('slot')} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="relative rounded-xl border p-3 md:p-5" style={{ background: '#03040a', borderColor: 'rgba(127,212,255,0.14)', boxShadow: '0 0 80px rgba(127,212,255,0.06) inset' }}>
          <canvas ref={set('canvas')} aria-hidden="true" className="block" />
          {/* Para lectores de pantalla: la lista, en texto. */}
          <div className="sr-only">
            <h3>Calientes</h3>
            <ul>
              {PRICES.calientes.map(([n, p]) => (
                <li key={n}>
                  {n}: {p} pesos
                </li>
              ))}
            </ul>
            <h3>Fríos</h3>
            <ul>
              {PRICES.frios.map(([n, p]) => (
                <li key={n}>
                  {n}: {p} pesos
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>

        {/* Los Elegidos: una tira que corre con el scroll; el plato del centro se enciende. */}
        <div className="flex items-center gap-5 border-t pt-4" style={{ borderColor: 'rgba(242,233,220,0.12)' }}>
          <p className="shrink-0 text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            Elegidos
          </p>
          <div ref={set('lane')} className="relative min-w-0 flex-1 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)', maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)' }}>
            <ul ref={set('track')} className="flex w-max items-center gap-10 will-change-transform md:gap-16">
              {ELEGIDOS.map((d, i) => (
                <li key={d} data-dish className="c33-dish flex items-center gap-10 text-[clamp(1.05rem,2vw,1.9rem)] leading-none font-semibold whitespace-nowrap uppercase md:gap-16" style={{ ...DISPLAY, opacity: 0.28 }}>
                  {d}
                  {i < ELEGIDOS.length - 1 ? <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.orange }} /> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
