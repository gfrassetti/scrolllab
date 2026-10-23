import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { LABEL } from './brand'
import { ProyectosBody } from './Proyectos'
import photoFull from './assets/foto-local.webp'
import photoSmall from './assets/foto-local-1200.webp'
import sketchFull from './assets/boceto-local.webp'
import sketchSmall from './assets/boceto-local-1200.webp'

/**
 * El plano: el sitio como folios sobre una mesa de dibujo. El usuario va diseñando con el scroll y
 * cada sección que deja atrás vuelve a ser un boceto apoyado en la mesa.
 *
 * Al terminar las cuatro etapas del hero (300vh más de scroll, con el hero todavía fijo):
 *   1. vuelta a boceto   la foto del local se despinta (el mismo pincel, al revés) y vuelven los
 *                        trazos; el título queda en contorno con rayado de grafito y el marco y los
 *                        textos tiemblan apenas, como trazados a mano (--sk y el filtro #es-pencil).
 *   2. la mesa           la cámara se aleja: el hero es un folio apoyado (girado, con su sombra) sobre
 *                        una mesa con grilla de plano; alrededor, los folios que siguen, en boceto.
 *   3. el folio siguiente la cámara va hasta el de Proyectos y se acerca hasta llenar la pantalla…
 *   4. …y Proyectos se diseña: el boceto de la tarjeta se vuelve foto y el texto, tinta.
 * Al llenar la pantalla, el folio le pasa la posta a la sección real (idéntica), que sigue con el
 * scroll de siempre. El nav no se mueve en ningún momento.
 *
 * Todo lo que se mueve son transformaciones (los folios y la hoja del hero) y un canvas 2D (la grilla
 * de la mesa); el filtro de lápiz solo cambia mientras algo está volviendo a boceto.
 *
 * Con «reducir movimiento» no hay plano: el hero termina y sigue Proyectos.
 */

// Dónde está cada folio en la mesa, en anchos y altos de pantalla desde el del hero.
const FOLIOS = [
  { id: 'hero', name: 'Inicio', x: 0, y: 0, rot: -1.4 },
  { id: 'proy', name: 'Proyectos', x: 1.16, y: 0.07, rot: 1.1 },
  { id: 'serv', name: 'Servicios', x: 2.32, y: -0.05, rot: -0.8 },
  { id: 'cont', name: 'Contacto', x: 0.58, y: 1.2, rot: 0.6 },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t

export default function Plano({ calm, exit }) {
  const layerRef = useRef(null)
  const mesaRef = useRef(null)
  const dispRef = useRef(null)
  const dispFolioRef = useRef(null)
  const folioRefs = useRef({})
  const shadowRefs = useRef({})
  const capRefs = useRef({})
  const big = typeof window !== 'undefined' && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1400

  useLayoutEffect(() => {
    if (calm) return undefined
    const hero = document.getElementById('inicio')
    const proy = document.getElementById('proyectos')
    const layer = layerRef.current
    const mesa = mesaRef.current
    const ctx2d = mesa.getContext('2d')
    const proyFolio = folioRefs.current.proy
    let u = 0
    let needs = true
    let active = null
    let W = 0
    let H = 0
    let dpr = 1
    let lastSk = -1
    const lastDisp = [-1, -1]
    let mesaOn = true

    const size = () => {
      W = window.innerWidth
      H = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      mesa.width = Math.round(W * dpr)
      mesa.height = Math.round(H * dpr)
      needs = true
    }
    size()

    // Las fotos del folio (foto y boceto), decodificadas de antemano, cuando el navegador está libre:
    // si no, se decodifican en el primer cuadro del plano y ese cuadro se traba.
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200))
    const warm = idle(() => layer.querySelectorAll('img').forEach((img) => img.decode?.().catch(() => {})))

    // La grilla de la mesa, en coordenadas de la mesa (se mueve y se escala con la cámara).
    const drawMesa = (k, cx, cy, m) => {
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (m <= 0.001) {
        if (mesaOn) ctx2d.clearRect(0, 0, W, H)
        mesaOn = false
        return
      }
      mesaOn = true
      ctx2d.clearRect(0, 0, W, H)
      ctx2d.globalAlpha = m
      ctx2d.fillStyle = '#e6e2d8'
      ctx2d.fillRect(0, 0, W, H)
      const ox = W / 2 - k * cx
      const oy = H / 2 - k * cy
      for (const [step, color] of [
        [60, 'rgba(22, 21, 19, 0.06)'],
        [300, 'rgba(22, 21, 19, 0.13)'],
      ]) {
        const s = step * k
        ctx2d.strokeStyle = color
        ctx2d.lineWidth = 1
        ctx2d.beginPath()
        for (let x = ((ox % s) + s) % s; x < W; x += s) {
          ctx2d.moveTo(Math.round(x) + 0.5, 0)
          ctx2d.lineTo(Math.round(x) + 0.5, H)
        }
        for (let y = ((oy % s) + s) % s; y < H; y += s) {
          ctx2d.moveTo(0, Math.round(y) + 0.5)
          ctx2d.lineTo(W, Math.round(y) + 0.5)
        }
        ctx2d.stroke()
      }
      ctx2d.globalAlpha = 1
    }

    const draw = () => {
      const on = u > 0 && u < 1
      if (on !== active) {
        active = on
        layer.style.visibility = on ? 'visible' : 'hidden'
        // La sección real se ve recién cuando su folio llenó la pantalla; el hero, hasta entonces.
        proy.style.visibility = u >= 1 ? '' : 'hidden'
        exit.current?.setHidden(u >= 1)
      }
      const phone = W < 640
      const K = phone ? 0.4 : 0.34
      const back = smooth(0, 0.2, u) // el hero vuelve a boceto
      const zOut = smooth(0.16, 0.42, u) // la cámara se aleja
      const zIn = smooth(0.6, 0.9, u) // y se acerca al folio de Proyectos
      const pan = smooth(0.34, 0.78, u)
      const sk = 1 - smooth(0.8, 0.98, u) // Proyectos se diseña
      const k = 1 - (1 - K) * (zOut - zIn)
      const center = (f) => ({ x: W / 2 + f.x * W, y: H / 2 + f.y * H })
      const hc = center(FOLIOS[0])
      const pc = center(FOLIOS[1])
      const cx = lerp(hc.x, pc.x, pan)
      const cy = lerp(hc.y, pc.y, pan)
      const m = clamp01((1 - k) / (1 - K))

      const place = (f, turn) => {
        const c = center(f)
        return `translate3d(${k * (c.x - cx)}px, ${k * (c.y - cy)}px, 0) scale(${k}) rotate(${f.rot * turn}deg)`
      }

      exit.current?.setBack(on || u >= 1 ? back : 0)
      exit.current?.setFolio(on ? place(FOLIOS[0], zOut) : '')

      for (const f of FOLIOS) {
        const turn = f.id === 'hero' ? zOut : f.id === 'proy' ? 1 - zIn : 1
        const tf = place(f, turn)
        if (f.id !== 'hero') folioRefs.current[f.id].style.transform = tf
        const sh = shadowRefs.current[f.id]
        sh.style.transform = tf
        sh.style.opacity = String(f.id === 'hero' ? zOut : f.id === 'proy' ? 1 - zIn : 1)
        // El rótulo de cada folio, debajo, sin escalar.
        const c = center(f)
        const cap = capRefs.current[f.id]
        cap.style.transform = `translate3d(${W / 2 + k * (c.x - cx)}px, ${H / 2 + k * (c.y - cy + H / 2) + 14}px, 0) translateX(-50%)`
        cap.style.opacity = String(m)
      }

      // Solo si cambió: cada cambio de --sk recalcula el folio entero.
      if (sk !== lastSk) {
        lastSk = sk
        proyFolio.style.setProperty('--sk', String(sk))
        proyFolio.classList.toggle('is-sketch', sk > 0.001)
      }
      // El temblor del lápiz: en el hero mientras vuelve a boceto; en el folio, hasta que se diseña.
      // En cuatro escalones (cada cambio vuelve a pasar el filtro sobre el texto y el marco).
      const step = (v) => (Math.ceil(v * 4) / 4) * 2.6
      if (step(back) !== lastDisp[0]) dispRef.current?.setAttribute('scale', String((lastDisp[0] = step(back))))
      if (step(sk) !== lastDisp[1]) dispFolioRef.current?.setAttribute('scale', String((lastDisp[1] = step(sk))))
      drawMesa(k, cx, cy, m)
    }

    const st = ScrollTrigger.create({
      start: () => hero.offsetTop + window.innerHeight * 3.8,
      end: () => hero.offsetTop + window.innerHeight * 6.8,
      onUpdate: (self) => {
        u = clamp01(self.progress)
        needs = true
      },
      onRefresh: (self) => {
        u = clamp01(self.progress)
        size()
        active = null
      },
    })
    const tick = () => {
      if (!needs) return
      needs = false
      draw()
    }
    gsap.ticker.add(tick)
    const hero0 = () => exit.current
    return () => {
      ;(window.cancelIdleCallback ?? clearTimeout)(warm)
      gsap.ticker.remove(tick)
      st.kill()
      hero0()?.setFolio('')
      hero0()?.setBack(0)
      hero0()?.setHidden(false)
      proy.style.visibility = ''
    }
  }, [calm, exit])

  if (calm) return null

  return (
    <div ref={layerRef} className="es-plano pointer-events-none fixed inset-0 z-[1]" style={{ visibility: 'hidden' }} aria-hidden="true">
      {/* El lápiz: un temblor apenas visible en los trazos del texto y del marco. */}
      <svg width="0" height="0" className="absolute">
        <filter id="es-pencil" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="es-pencil-f" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap ref={dispFolioRef} in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <canvas ref={mesaRef} className="absolute inset-0 h-full w-full" />

      {/* Las sombras de los folios (la del hero queda debajo de su hoja, que vive en el hero). */}
      {FOLIOS.map((f) => (
        <div key={f.id} ref={(el) => (shadowRefs.current[f.id] = el)} className="es-plano__shadow" />
      ))}

      {/* Los folios que siguen, en boceto. */}
      <div ref={(el) => (folioRefs.current.proy = el)} className="es-plano__folio es-proj es-sheet es-sk is-sketch" style={{ '--sk': 1 }}>
        <ProyectosBody src={big ? photoFull : photoSmall} sketchSrc={big ? sketchFull : sketchSmall} />
      </div>
      {FOLIOS.slice(2).map((f) => (
        <div key={f.id} ref={(el) => (folioRefs.current[f.id] = el)} className="es-plano__folio es-sheet es-sk is-sketch" style={{ '--sk': 1 }}>
          <div className="es-plano__frame">
            <span className="es-panel__label es-panel__label--tl" style={LABEL}>
              {f.name}
            </span>
          </div>
        </div>
      ))}

      {FOLIOS.map((f, i) => (
        <span key={f.id} ref={(el) => (capRefs.current[f.id] = el)} className="es-plano__cap" style={LABEL}>
          Hoja {String(i + 1).padStart(2, '0')} — {f.name}
        </span>
      ))}
    </div>
  )
}
