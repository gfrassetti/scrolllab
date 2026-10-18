import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { themeVars } from '../../../lib/themeVars'

const defaultWords = ['RAW', 'CONCRETE', 'STEEL', 'GRID', 'WEIGHT', 'MASS']
/** Escala de cada palabra en la pila inicial. */
const SCALE = 0.42

/**
 * SkewScroller — the mantra as a building. Pinned, the scroll first draws a
 * small isometric tower line by line (one floor per word), fills its concrete
 * faces with each word on its floor; then the tower comes apart — the floors
 * swing out and fade, each word slides to its side (one left, the next right)
 * — and last the steel lines between them are drawn in. Once laid, the stack
 * still shears with scroll velocity.
 *
 * Se pincha el contenido (`[data-skew-pin]`), no la sección: React es dueño de
 * la sección y el builder la re-renderiza.
 *
 * Calma: sin pin ni pila — las palabras ya están en su lugar y entran con un
 * fundido.
 */
export default function SkewScroller({
  unit = '01',
  total = '05',
  label = 'The mantra',
  unitLabel = 'Unit',
  words,
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)
  const track = useRef(null)
  const rows =
    Array.isArray(words) && words.length
      ? words.map((w) => (typeof w === 'string' ? w : w.word || ''))
      : defaultWords

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-skew-row]', { y: 24, stagger: 0.07 })

      const pin = root.current.querySelector('[data-skew-pin]')
      const wordsEls = gsap.utils.toArray('[data-skew-word]', root.current)
      const lines = gsap.utils.toArray('[data-skew-line]', root.current)

      // Cuánto le falta a cada palabra para estar en el centro de la pila.
      const toCenter = (el, axis) => {
        const t = track.current.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        const gx = gsap.getProperty(el, 'x') || 0
        const gy = gsap.getProperty(el, 'y') || 0
        if (axis === 'x') return t.left + t.width / 2 - (r.left + r.width / 2 - gx)
        // apiladas como losas: una columna chica y prolija en el centro, cada una
        // apoyada sobre la de abajo (a la escala de la pila, SCALE)
        const i = wordsEls.indexOf(el)
        const stackOffset = (i - (wordsEls.length - 1) / 2) * r.height * SCALE * 0.92
        return t.top + t.height / 2 - (r.top + r.height / 2 - gy) + stackOffset
      }

      // —— el edificio: un piso por palabra, en isométrica, dibujado a la medida de la pila ——
      const svg = root.current.querySelector('[data-skew-building]')
      const NS = 'http://www.w3.org/2000/svg'
      const drawBuilding = () => {
        if (!svg) return
        const t = track.current.getBoundingClientRect()
        const scaleNow = (el) => gsap.getProperty(el, 'scale') || 1
        const widest = Math.max(...wordsEls.map((el) => el.getBoundingClientRect().width / scaleNow(el)))
        const rowH = wordsEls[0].getBoundingClientRect().height / scaleNow(wordsEls[0])
        const fw = widest * SCALE * 1.45 // ancho de la fachada
        const fh = rowH * SCALE * 0.92 // alto de un piso (= paso de la pila)
        const dx = fw * 0.22 // profundidad isométrica
        const dy = -dx * 0.58
        const n = wordsEls.length
        const W = fw + dx
        const H = n * fh - dy
        // la fachada queda centrada donde está la pila
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
        svg.style.width = `${W}px`
        svg.style.height = `${H}px`
        svg.style.left = `${t.width / 2 - fw / 2}px`
        svg.style.top = `${t.height / 2 - (n * fh) / 2 + dy}px`
        // los polígonos se crean una vez (las animaciones los apuntan); al
        // re-medir solo se mueven sus puntos
        const shapes = []
        for (let i = 0; i < n; i += 1) {
          const y = -dy + i * fh
          if (i === 0) shapes.push([[0, y], [dx, 0], [fw + dx, 0], [fw, y]])
          shapes.push([[fw, y], [fw + dx, y + dy], [fw + dx, y + dy + fh], [fw, y + fh]])
          shapes.push([[0, y], [fw, y], [fw, y + fh], [0, y + fh]])
        }
        const existing = svg.querySelectorAll('polygon')
        if (existing.length === shapes.length) {
          existing.forEach((el, k) => el.setAttribute('points', shapes[k].map((q) => q.join(',')).join(' ')))
          return
        }
        svg.textContent = ''
        const fills = {
          top: 'color-mix(in srgb, var(--color-concrete) 92%, white)',
          side: 'color-mix(in srgb, var(--color-concrete) 66%, var(--color-carbon))',
          front: 'color-mix(in srgb, var(--color-concrete) 84%, var(--color-carbon))',
        }
        let k = 0
        for (let i = 0; i < n; i += 1) {
          const g = document.createElementNS(NS, 'g')
          g.setAttribute('data-skew-floor', '')
          const kinds = i === 0 ? ['top', 'side', 'front'] : ['side', 'front']
          for (const kind of kinds) {
            const el = document.createElementNS(NS, 'polygon')
            el.setAttribute('points', shapes[k].map((q) => q.join(',')).join(' '))
            el.setAttribute('pathLength', '1')
            el.setAttribute('fill', fills[kind])
            el.setAttribute('stroke', 'var(--color-carbon)')
            el.setAttribute('stroke-width', '1.5')
            el.setAttribute('vector-effect', 'non-scaling-stroke')
            el.setAttribute('data-skew-face', '')
            g.append(el)
            k += 1
          }
          svg.append(g)
        }
      }
      drawBuilding()
      const floors = () => gsap.utils.toArray('[data-skew-floor]', svg)
      const faces = () => gsap.utils.toArray('[data-skew-face]', svg)

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=230%',
          pin,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: drawBuilding,
        },
      })
      // 1 · el edificio se dibuja en líneas, de abajo hacia arriba, y después se llena
      tl.fromTo(faces(), { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0 }, { strokeDashoffset: 0, duration: 0.3, stagger: { each: 0.012, from: 'end' } }, 0)
        .to(faces(), { fillOpacity: 1, duration: 0.12 }, 0.28)
        .from(wordsEls, { opacity: 0, duration: 0.1, stagger: { each: 0.015, from: 'end' } }, 0.3)
      // 2 · se desarma: los pisos se abren a los costados y se desvanecen, las palabras van a su lugar
      tl.to(
        floors(),
        {
          x: (i) => (i % 2 ? 1 : -1) * (60 + i * 14),
          y: (i) => (i - wordsEls.length / 2) * 18,
          rotation: (i) => (i % 2 ? 6 : -6),
          opacity: 0,
          duration: 0.4,
          stagger: { each: 0.03, from: 'end' },
          ease: 'power2.in',
        },
        0.5,
      )
        .from(
          wordsEls,
          {
            x: (i, el) => toCenter(el, 'x'),
            y: (i, el) => toCenter(el, 'y'),
            rotation: (i) => (i % 2 ? 1.2 : -1.2),
            scale: SCALE,
            stagger: { each: 0.06, from: 'end' },
            duration: 0.7,
          },
          0.55,
        )
        // 3 · las líneas de la retícula
        .from(lines, { scaleX: 0, stagger: 0.05, duration: 0.35 }, 1.05)
        .from('[data-skew-head]', { yPercent: -100, autoAlpha: 0, duration: 0.25 }, 0)

      // Ya armada, la pila se tuerce con la velocidad del scroll y vuelve.
      const proxy = { skew: 0 }
      const setSkew = gsap.quickSetter(track.current, 'skewX', 'deg')
      const shear = ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          if (tl.progress() < 0.98) return
          const velocity = gsap.utils.clamp(-10, 10, self.getVelocity() / -400)
          if (Math.abs(velocity) > Math.abs(proxy.skew)) {
            proxy.skew = velocity
            gsap.to(proxy, {
              skew: 0,
              duration: 0.9,
              ease: 'power3.out',
              overwrite: true,
              onUpdate: () => setSkew(proxy.skew),
            })
          }
        },
      })
      return () => shear.kill()
    },
    { scope: root, dependencies: [rows.length], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      style={{ backgroundColor: bg || undefined, color: fg || undefined, ...themeVars({ carbon: fg, klein: accent, concrete: bg }) }}
    >
      <div
        data-skew-pin
        className="flex min-h-svh flex-col justify-center overflow-hidden px-5 py-20 md:px-8 md:py-24"
      >
        <div
          data-skew-head
          className="mb-8 flex items-baseline justify-between border-t-2 border-carbon pt-2 font-mono text-[11px] uppercase tracking-[0.1em] md:mb-10 md:text-xs"
        >
          <p>
            {unitLabel} {unit} / {total}
          </p>
          <p>{label}</p>
        </div>

        <div ref={track} className="relative will-change-transform">
          {/* el edificio que se dibuja y se desarma (lo arma el JS a la medida de la pila) */}
          <svg data-skew-building aria-hidden="true" className="pointer-events-none absolute overflow-visible" />
          {rows.map((word, i) => (
            <div
              key={i}
              data-skew-row
              className={`relative font-anton text-[13vw] leading-[1.05] uppercase select-none md:text-[min(9vw,12.5svh)] ${
                i % 2 === 1 ? 'text-right text-klein' : ''
              }`}
            >
              <span data-skew-word className="inline-block will-change-transform">
                {word}
              </span>
              <span
                data-skew-line
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 bg-carbon ${i % 2 === 1 ? 'origin-right' : 'origin-left'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
