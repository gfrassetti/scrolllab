import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { LABEL } from './brand'
import { ROOM_IN_IMAGE as RI } from './designPieces'
import photoFull from './assets/foto-local.webp'
import photoSmall from './assets/foto-local-1200.webp'

/**
 * Proyectos — por ahora, la tarjeta 01 con su ficha (el resto del contenido es un div de 1vh).
 *
 * La salida del hero: el local que se acaba de diseñar es un proyecto del estudio. Al terminar el
 * hero, la foto se despega de la lámina (la del lienzo se esconde y en su lugar queda una copia en
 * DOM, exactamente encima) y, mientras la hoja del hero se va hacia arriba y Proyectos sube, la foto
 * se achica y se recorta hasta caer en la tarjeta 01. Ahí se queda (la copia se va y la tarjeta
 * muestra su foto) y entra la ficha. Volviendo hacia arriba, el camino al revés.
 *
 * En cada cuadro se interpola entre dos rectángulos vivos: el del local en el hero (que se mueve con
 * su hoja) y el de la tarjeta (que se mueve con el scroll); así arranca pegada a uno y termina pegada
 * al otro, sin saltos.
 *
 * Con «reducir movimiento»: la tarjeta ya tiene su foto y la ficha está a la vista.
 */

// Ficha de muestra: reemplazar por los datos del proyecto real.
const PROJECT = {
  n: '01',
  name: 'Olivo',
  kind: 'Café · Local comercial',
  place: 'San Carlos de Bariloche',
  year: '2025',
  area: '68 m²',
}

const A = 2400 / 1029 // la proporción de la foto

/** La foto, del tamaño justo para que el local (sin el papel de alrededor) cubra la caja. */
function coverRoom(box) {
  const rw = RI.x1 - RI.x0
  const rh = RI.y1 - RI.y0
  const w = Math.max(box.w / rw, (box.h / rh) * A)
  const h = w / A
  return {
    x: box.x + box.w / 2 - (RI.x0 + rw / 2) * w,
    y: box.y + box.h / 2 - (RI.y0 + rh / 2) * h,
    w,
    h,
  }
}

const lerp = (a, b, t) => a + (b - a) * t
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function Proyectos({ calm, exit }) {
  const sectionRef = useRef(null)
  const cardRef = useRef(null)
  const cardImgRef = useRef(null)
  const flyRef = useRef(null)
  const flyImgRef = useRef(null)
  const fichaRef = useRef(null)
  const src = typeof window !== 'undefined' && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1400 ? photoFull : photoSmall

  // La foto de la tarjeta, recortada al local (en %, así acompaña los cambios de tamaño).
  useLayoutEffect(() => {
    const card = cardRef.current
    const img = cardImgRef.current
    const fit = () => {
      const w = card.clientWidth
      const h = card.clientHeight
      if (!w || !h) return
      const r = coverRoom({ x: 0, y: 0, w, h })
      Object.assign(img.style, { left: `${(r.x / w) * 100}%`, top: `${(r.y / h) * 100}%`, width: `${(r.w / w) * 100}%`, height: `${(r.h / h) * 100}%` })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(card)
    return () => ro.disconnect()
  }, [])

  // El vuelo.
  useLayoutEffect(() => {
    if (calm || !exit) return undefined
    const fly = flyRef.current
    const flyImg = flyImgRef.current
    const card = cardRef.current
    const cardImg = cardImgRef.current
    const ficha = fichaRef.current
    let t = 0
    let flying = false

    const draw = () => {
      const from = exit.current?.place()
      const on = t > 0 && t < 1 && !!from
      if (on !== flying) {
        flying = on
        fly.style.visibility = on ? 'visible' : 'hidden'
      }
      // Antes de despegar, la foto es la del lienzo; al aterrizar, la de la tarjeta.
      exit.current?.hidePhoto(t > 0)
      cardImg.style.visibility = t >= 1 ? 'visible' : 'hidden'
      const k = smoothstep(0.72, 1, t)
      ficha.style.opacity = String(k)
      ficha.style.transform = `translateY(${(1 - k) * 14}px)`
      if (!on) return
      const c = card.getBoundingClientRect()
      const to = { x: c.left, y: c.top, w: c.width, h: c.height }
      const e = ease(t)
      const box = lerpRect(from.clip, to, e)
      const img = lerpRect(from.img, coverRoom(to), e)
      Object.assign(fly.style, { transform: `translate3d(${box.x}px, ${box.y}px, 0)`, width: `${box.w}px`, height: `${box.h}px` })
      Object.assign(flyImg.style, { transform: `translate3d(${img.x - box.x}px, ${img.y - box.y}px, 0)`, width: `${img.w}px`, height: `${img.h}px` })
    }

    // Del final del hero (esta sección asoma abajo) a esta sección arriba de todo.
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        t = clamp01(self.progress)
        draw()
      },
      onRefresh: (self) => {
        t = clamp01(self.progress)
        draw()
      },
    })
    // El rectángulo de partida se mueve con la hoja del hero: se redibuja en cada cuadro del vuelo.
    const tick = () => flying && draw()
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      fly.style.visibility = 'hidden'
      cardImg.style.visibility = ''
      ficha.style.opacity = ''
      ficha.style.transform = ''
    }
  }, [calm, exit])

  return (
    <section ref={sectionRef} id="proyectos" aria-labelledby="proyectos-title" className="es-proj relative min-h-svh">
      <header className="es-proj__head">
        <h2 id="proyectos-title" className="es-proj__title">
          Proyectos
        </h2>
        <span className="es-proj__label" style={LABEL}>
          {PROJECT.n} / {PROJECT.n}
        </span>
      </header>

      <article className="es-proj__item">
        <div ref={cardRef} className="es-proj__card">
          <img ref={cardImgRef} src={src} alt={`${PROJECT.name}, ${PROJECT.kind.toLowerCase()} en ${PROJECT.place}`} className="es-proj__img" decoding="async" />
          <span className="es-proj__slot" aria-hidden="true" />
        </div>
        <dl ref={fichaRef} className="es-proj__ficha">
          <div className="es-proj__row es-proj__row--name">
            <dt className="sr-only">Proyecto</dt>
            <dd>
              <span className="es-proj__n" style={LABEL}>
                {PROJECT.n}
              </span>
              {PROJECT.name}
            </dd>
          </div>
          {[
            ['Tipo', PROJECT.kind],
            ['Lugar', PROJECT.place],
            ['Año', PROJECT.year],
            ['Superficie', PROJECT.area],
          ].map(([k, v]) => (
            <div key={k} className="es-proj__row">
              <dt style={LABEL}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </article>

      {/* El resto de la sección (por ahora vacío). */}
      <div style={{ height: '1vh' }} />

      {/* La foto en vuelo, del hero a la tarjeta. */}
      <div ref={flyRef} className="es-proj__fly" aria-hidden="true">
        <img ref={flyImgRef} src={src} alt="" decoding="async" />
      </div>
    </section>
  )
}

function smoothstep(a, b, v) {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
