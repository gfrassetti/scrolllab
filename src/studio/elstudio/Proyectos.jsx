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

// Ficha de muestra: va a ser un proyecto real del cliente (fotos y datos los pide el estudio).
const PROJECT = {
  n: '01',
  name: 'Proyecto 1',
  kind: 'Local comercial',
  place: 'Lugar X',
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

/**
 * El contenido de Proyectos: el título, la tarjeta 01 y su ficha.
 */
function ProyectosBody({ refs, src, titleId }) {
  const localCard = useRef(null)
  const cardRef = refs?.card ?? localCard
  // La foto de la tarjeta (y su boceto), recortada al local (en %, así acompaña los cambios de tamaño).
  useLayoutEffect(() => {
    const card = cardRef.current
    const fit = () => {
      const w = card.clientWidth
      const h = card.clientHeight
      if (!w || !h) return
      const r = coverRoom({ x: 0, y: 0, w, h })
      for (const img of card.querySelectorAll('img')) {
        Object.assign(img.style, { left: `${(r.x / w) * 100}%`, top: `${(r.y / h) * 100}%`, width: `${(r.w / w) * 100}%`, height: `${(r.h / h) * 100}%` })
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(card)
    return () => ro.disconnect()
  }, [cardRef])

  return (
    <>
      <header className="es-proj__head">
        <h2 id={titleId} className="es-proj__title">
          Proyectos
        </h2>
        <span className="es-proj__label" style={LABEL}>
          {PROJECT.n} / {PROJECT.n}
        </span>
      </header>

      <article className="es-proj__item">
        <div ref={cardRef} className="es-proj__card">
          <img
            ref={refs?.img}
            src={src}
            alt={titleId ? `${PROJECT.name}, ${PROJECT.kind.toLowerCase()} en ${PROJECT.place}` : ''}
            className="es-proj__img"
            decoding="async"
          />
          <span className="es-proj__slot" aria-hidden="true" />
        </div>
        <dl ref={refs?.ficha} className="es-proj__ficha">
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
    </>
  )
}

/** La foto de la tarjeta según la pantalla (la misma en la sección y en su folio). */
const projectPhoto = () =>
  typeof window !== 'undefined' && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1400 ? photoFull : photoSmall

/**
 * La sección. `mode`: 'proyecto' (la foto del hero vuela a la tarjeta) o cualquier otra salida (la
 * sección sigue al hero, sin vuelo).
 */
export default function Proyectos({ calm, exit, mode = 'proyecto' }) {
  const sectionRef = useRef(null)
  const cardRef = useRef(null)
  const cardImgRef = useRef(null)
  const flyRef = useRef(null)
  const flyImgRef = useRef(null)
  const fichaRef = useRef(null)
  const src = projectPhoto()
  const flies = mode === 'proyecto'

  // El vuelo.
  useLayoutEffect(() => {
    if (calm || !exit || !flies) return undefined
    const fly = flyRef.current
    const flyImg = flyImgRef.current
    const card = cardRef.current
    const cardImg = cardImgRef.current
    const ficha = fichaRef.current
    let t = 0
    let flying = false
    let needs = true
    // El tamaño de base de la foto en vuelo (el de la partida). En el vuelo solo cambian transformaciones:
    // la placa de la foto se dibuja una vez y la GPU la mueve y la escala (cambiar ancho y alto en cada
    // cuadro la volvía a dibujar entera, a 2400 px, y el pase se trababa).
    let base = null

    // La foto, decodificada de antemano (si no, el primer cuadro del vuelo la decodifica).
    flyImg.decode?.().catch(() => {})
    cardImg.decode?.().catch(() => {})

    const draw = () => {
      // Primero se mide todo (el local en el hero y la tarjeta) y después se escribe.
      const from = exit.current?.place()
      const c = card.getBoundingClientRect()
      const on = t > 0 && t < 1 && !!from
      if (on !== flying) {
        flying = on
        fly.style.visibility = on ? 'visible' : 'hidden'
        if (on && !base) {
          base = { box: from.clip, img: from.img }
          Object.assign(fly.style, { width: `${base.box.w}px`, height: `${base.box.h}px` })
          Object.assign(flyImg.style, { width: `${base.img.w}px`, height: `${base.img.h}px` })
        }
      }
      // Antes de despegar, la foto es la del lienzo; al aterrizar, la de la tarjeta.
      exit.current?.hidePhoto(t > 0)
      cardImg.style.visibility = t >= 1 ? 'visible' : 'hidden'
      const k = smoothstep(0.72, 1, t)
      ficha.style.opacity = String(k)
      ficha.style.transform = `translate3d(0, ${(1 - k) * 14}px, 0)`
      if (!on) return
      const to = { x: c.left, y: c.top, w: c.width, h: c.height }
      const e = ease(t)
      const box = lerpRect(from.clip, to, e)
      const img = lerpRect(from.img, coverRoom(to), e)
      const sx = box.w / base.box.w
      const sy = box.h / base.box.h
      const si = img.w / base.img.w
      fly.style.transform = `translate3d(${box.x}px, ${box.y}px, 0) scale(${sx}, ${sy})`
      flyImg.style.transform = `translate3d(${(img.x - box.x) / sx}px, ${(img.y - box.y) / sy}px, 0) scale(${si / sx}, ${si / sy})`
    }

    // Del final del hero (esta sección asoma abajo) a esta sección arriba de todo.
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        t = clamp01(self.progress)
        needs = true
      },
      onRefresh: (self) => {
        t = clamp01(self.progress)
        base = null
        flying = false
        needs = true
      },
    })
    // Un solo dibujo por cuadro, y solo si el scroll se movió.
    const tick = () => {
      if (!needs) return
      needs = false
      draw()
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      fly.style.visibility = 'hidden'
      cardImg.style.visibility = ''
      ficha.style.opacity = ''
      ficha.style.transform = ''
    }
  }, [calm, exit, flies])

  return (
    <section
      ref={sectionRef}
      id="proyectos"
      aria-labelledby="proyectos-title"
      className="es-proj relative min-h-svh"
    >
      <ProyectosBody refs={{ card: cardRef, img: cardImgRef, ficha: fichaRef }} src={src} titleId="proyectos-title" />

      {/* El resto de la sección (por ahora vacío). */}
      <div style={{ height: '1vh' }} />

      {/* La foto en vuelo, del hero a la tarjeta. */}
      {flies && (
        <div ref={flyRef} className="es-proj__fly" aria-hidden="true">
          <img ref={flyImgRef} src={src} alt="" decoding="async" />
        </div>
      )}
    </section>
  )
}

function smoothstep(a, b, v) {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
