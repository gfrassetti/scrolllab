import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { BAND_H, C, LABEL, NAV_H, OPEN_DELAY, SITE } from './brand'
import { paint } from './paint'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT, ROOM } from './localScene'

/**
 * El hero: del boceto al local, sobre una lámina con la grilla a la vista.
 *
 * Al terminar el loader, un local (café / showroom) se dibuja a lápiz y carbonilla y ocupa toda la
 * lámina. Al scrollear (el hero queda fijo), como en un proceso de diseño:
 *   01 Boceto       el cuadrante se corre a la derecha y entra el texto a la izquierda.
 *   02 Volumen      el local sube desde el dibujo, pieza por pieza, y la cámara se eleva con él;
 *                   el trazo se apaga cuando el volumen ya está en pie.
 *   03 Interiorismo el cuadrante cruza a la izquierda (el texto, a la derecha) y el local se
 *                   decora: materiales, objetos, lámparas que se encienden.
 *   04 Experiencia  la cámara se acerca.
 * El rótulo de la lámina (01 → 04) acompaña cada etapa.
 *
 * Con el mouse: al entrar al hero aparecen las líneas de construcción (guías punteadas y una regla
 * en óxido alrededor del cuadrante) y, al hacer clic y arrastrar sobre el dibujo, se ve el otro
 * estado del lado izquierdo del cursor (el local terminado sobre el boceto, o al revés).
 *
 * Con «reducir movimiento»: la lámina quieta, con el local terminado.
 */

const REVEAL_SECONDS = 3.2
// `?foto-ref`: el local terminado con la cámara de arranque y el cuadro a todo el canvas, para
// generar la foto del arrastre a partir de él (scripts propios, no se usa en el sitio).
const PHOTO_REF = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('foto-ref')

const STAGES = [
  { n: '01', title: 'Boceto', text: 'Todo empieza a mano: la idea del espacio, a lápiz y carbonilla.' },
  { n: '02', title: 'Volumen', text: 'El mismo dibujo en tres dimensiones: proporciones, luz y recorridos.' },
  { n: '03', title: 'Interiorismo', text: 'Materiales, objetos y luz cálida, pensados para quien usa el espacio.' },
  { n: '04', title: 'Experiencia', text: 'Un lugar listo para vivirse.' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })

/**
 * Las medidas de la lámina para un escenario de W × H. Tres posiciones del cuadrante:
 *   full   toda la lámina (el boceto recién dibujado)
 *   right  columnas 4–8, con el texto en las 1–3
 *   left   columnas 1–5, con el texto en las 6–8
 * En el teléfono el cuadrante va arriba y el texto debajo.
 */
function sheetLayout(W, H) {
  const desk = W >= 640
  const side = desk ? 36 : 16
  const gap = 16
  const cols = desk ? 8 : 4
  const colW = (W - side * 2 - gap * (cols - 1)) / cols
  const top = (desk ? NAV_H.desk : NAV_H.phone) + (desk ? 26 : 20)
  const bottom = H - (desk ? BAND_H.desk : BAND_H.phone) - (desk ? 20 : 14)
  const full = { x: side, y: top, w: W - side * 2, h: bottom - top }
  if (desk) {
    const span = (n) => n * colW + (n - 1) * gap
    const x = (c) => side + c * (colW + gap)
    return {
      desk,
      cols,
      full,
      right: { panel: { x: x(3), y: top, w: span(5), h: bottom - top }, text: { x: x(0), y: top, w: span(3) - gap, h: bottom - top } },
      left: { panel: { x: x(0), y: top, w: span(5), h: bottom - top }, text: { x: x(5) + gap, y: top, w: span(3) - gap, h: bottom - top } },
    }
  }
  const textH = 92
  const panel = { x: side, y: top, w: W - side * 2, h: bottom - top - textH }
  const text = { x: side, y: bottom - textH + 14, w: W - side * 2, h: textH - 14 }
  return { desk, cols, full, right: { panel, text }, left: { panel, text } }
}

/** El cuadro de la cámara dentro del cuadrante: 16:9 entero; si el cuadrante es angosto, un poco más grande (recorta los costados). */
function cameraFrame(p) {
  const aspect = p.w / p.h
  let fw
  let fh
  if (aspect > FRAME_ASPECT) {
    fh = p.h * 0.96
    fw = fh * FRAME_ASPECT
  } else {
    fw = p.w * 0.96
    fh = fw / FRAME_ASPECT
  }
  const over = Math.min(1.85, Math.max(1, (FRAME_ASPECT / aspect) * 0.86))
  fw *= over
  fh *= over
  return { x: p.x + (p.w - fw) / 2, y: p.y + (p.h - fh) / 2, w: fw, h: fh }
}

export default function Hero({ boarded, calm, bridge, navLogoRef }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const panelRef = useRef(null)
  const leftRef = useRef(null)
  const colsRef = useRef(null)
  const sceneRef = useRef(null)
  const [stage, setStage] = useState(calm ? 3 : 0)
  const [cols, setCols] = useState(8)
  const [tip, setTip] = useState('final')

  // El loader aterriza en el logo del nav.
  useEffect(() => {
    bridge.current = {
      target: () => navLogoRef.current?.querySelector('svg[data-part=row]'),
      show: () => {
        if (navLogoRef.current) navLogoRef.current.style.opacity = '1'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [bridge, navLogoRef])

  // La escena, la geometría de la lámina y el scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    const stageEl = stageRef.current
    const panel = panelRef.current
    const left = leftRef.current
    const phone = window.matchMedia('(max-width: 767px)').matches
    const scene = createLocalScene({ canvas, phone })
    sceneRef.current = scene
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2)
    scene.setPixelRatio(dpr)
    const budget = createFrameBudget({ dpr, apply: (v) => scene.setPixelRatio(v) })

    let L = null
    let lastKey = ''
    const measure = () => {
      const W = stageEl.clientWidth
      const H = stageEl.clientHeight
      scene.resize(W, H)
      L = sheetLayout(W, H)
      setCols(L.cols)
      lastKey = ''
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stageEl)

    // El scroll del hero (0→1 mientras está fijo), suavizado en cada cuadro.
    let target = calm ? 1 : 0
    let current = target
    const trigger = calm
      ? null
      : ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            target = self.progress
          },
        })

    let shownStage = -1
    let shownSide = 'none'
    const apply = (p) => {
      // El cuadrante: toda la lámina → a la derecha (texto a la izquierda) → a la izquierda (texto a la derecha).
      const toRight = calm ? 1 : smooth(0.03, 0.12, p)
      const toLeft = calm ? 0 : smooth(0.46, 0.58, p)
      const P = lerpRect(lerpRect(L.full, L.right.panel, toRight), L.left.panel, toLeft)
      // El texto no viaja por encima del dibujo: se apaga, salta de lado y se vuelve a pintar.
      const T = toLeft < 0.5 ? L.right.text : L.left.text
      // El texto entra con el corrimiento y, al cruzar de lado, se apaga en el medio del viaje.
      const textAlpha = toRight * (1 - smooth(0, 0.3, toLeft) + smooth(0.7, 1, toLeft))
      const key = `${P.x.toFixed(1)}|${P.y.toFixed(1)}|${P.w.toFixed(1)}|${P.h.toFixed(1)}|${textAlpha.toFixed(3)}`
      if (PHOTO_REF) {
        const W = stageEl.clientWidth
        const H = stageEl.clientHeight
        scene.setFrame(0, 0, W, H)
        canvas.style.clipPath = 'none'
        scene.setRise(1)
        scene.setSketch(0)
        scene.setDecor(1)
        scene.setCamera(0)
        scene.setReveal(1)
        return
      }
      if (key !== lastKey) {
        lastKey = key
        const f = cameraFrame(P)
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        Object.assign(left.style, { left: `${T.x}px`, top: `${T.y}px`, width: `${T.w}px`, height: `${T.h}px`, opacity: String(textAlpha) })
        left.style.visibility = textAlpha < 0.01 ? 'hidden' : 'visible'
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
      }
      // Cada vez que el texto llega a un lado, se pinta de nuevo (en el teléfono, al aparecer).
      const sideNow = toRight < 0.5 ? 'none' : toLeft < 0.5 ? 'right' : 'left'
      if (sideNow !== shownSide) {
        shownSide = sideNow
        if (sideNow !== 'none' && !calm) paint(left.querySelectorAll('[data-paint]'), { stagger: 0.05, duration: 0.8 })
      }
      // Boceto → el local sube desde el dibujo → se decora → la cámara se acerca.
      scene.setRise(calm ? 1 : clamp01((p - 0.16) / 0.28))
      // El trazo queda como un fantasma mientras el volumen sube desde él, y se apaga cuando está en pie.
      scene.setSketch(calm ? 0 : 1 - 0.86 * smooth(0.13, 0.18, p) - 0.14 * smooth(0.38, 0.47, p))
      scene.setDecor(calm ? 1 : clamp01((p - 0.5) / 0.32))
      scene.setCamera(calm ? 0 : clamp01((p - 0.84) / 0.16))
      const s = calm ? 3 : p < 0.14 ? 0 : p < 0.48 ? 1 : p < 0.84 ? 2 : 3
      if (s !== shownStage) {
        shownStage = s
        setStage(s)
        setTip(scene.splitShows())
      }
    }
    apply(current)
    if (calm) scene.setReveal(1)

    const tick = (_t, deltaMs) => {
      current += (target - current) * (1 - Math.exp(-deltaMs / 110))
      if (Math.abs(target - current) < 1e-4) current = target
      apply(current)
      if (scene.render()) budget.tick(deltaMs)
    }
    gsap.ticker.add(tick)

    // La mira del cursor pregunta acá en qué punto del local está (en metros), solo dentro del cuadrante.
    setPlanProbe((x, y) => {
      const r = panel.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null
      const c = canvas.getBoundingClientRect()
      return scene.probe(x - c.left, y - c.top)
    })

    // El arrastre sobre el dibujo (solo con mouse): el otro estado a la izquierda del cursor.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const split = { on: 0 }
    let dragging = false
    const onDown = (e) => {
      if (!fine || e.pointerType === 'touch' || e.button !== 0) return
      dragging = true
      canvas.setPointerCapture?.(e.pointerId)
      scene.setSplit(e.clientX / stageEl.clientWidth)
      setTip(scene.splitShows())
      gsap.to(split, { on: 1, duration: 0.45, ease: 'expo.out', overwrite: true, onUpdate: () => scene.setSplitOn(split.on) })
    }
    const onMove = (e) => {
      if (dragging) scene.setSplit(e.clientX / stageEl.clientWidth)
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      gsap.to(split, { on: 0, duration: 0.55, ease: 'expo.out', overwrite: true, onUpdate: () => scene.setSplitOn(split.on) })
    }
    // Las líneas de construcción: aparecen al entrar al hero con el mouse.
    const onEnter = (e) => e.pointerType !== 'touch' && stageEl.classList.add('is-hover')
    const onLeave = () => stageEl.classList.remove('is-hover')
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    stageEl.addEventListener('pointerenter', onEnter)
    stageEl.addEventListener('pointerleave', onLeave)

    return () => {
      gsap.ticker.remove(tick)
      gsap.killTweensOf(split)
      trigger?.kill()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stageEl.removeEventListener('pointerenter', onEnter)
      stageEl.removeEventListener('pointerleave', onLeave)
      setPlanProbe(null)
      scene.dispose()
      sceneRef.current = null
    }
  }, [calm])

  // Al cambiar de etapa, lo que cambia se vuelve a pintar (el título, el texto, el estado y la lámina).
  const firstStage = useRef(true)
  useEffect(() => {
    if (firstStage.current) {
      firstStage.current = false
      return undefined
    }
    if (calm) return undefined
    const tween = paint(stageRef.current.querySelectorAll('[data-paint-stage]'), { stagger: 0.06, duration: 0.75 })
    return () => tween.kill()
  }, [stage, calm])

  // Antes de que termine el loader: la grilla, el cuadrante y la columna, escondidos.
  useLayoutEffect(() => {
    if (calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const ctx = gsap.context(() => {
      gsap.set(q('[data-col]'), { scaleY: 0 })
      gsap.set(q('[data-panel-edge]'), { scale: 0 })
    }, stageRef)
    return () => ctx.revert()
  }, [calm])

  // Al terminar el loader: el boceto se pinta y la lámina se arma alrededor.
  useEffect(() => {
    const scene = sceneRef.current
    if (!boarded || !scene || calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const pen = { v: 0 }
    const tl = gsap.timeline()
    tl.to(pen, { v: 1, duration: REVEAL_SECONDS, ease: 'power1.inOut', onUpdate: () => scene.setReveal(pen.v) }, 0)
      .to(q('[data-panel-edge]'), { scale: 1, duration: 0.9, ease: 'expo.inOut', stagger: 0.05 }, 0.2)
      .to(q('[data-col]'), { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, OPEN_DELAY + 0.8)
    return () => tl.kill()
  }, [boarded, calm])

  const st = STAGES[stage]
  const rows = [
    ['Proyecto', 'Local · café y showroom'],
    ['Superficie', `${ROOM.w * ROOM.d} m²`],
    ['Escala', '1:50'],
    ['Estado', st.title],
    ['Lámina', `${st.n} / 04`],
    ['Fecha', '10 · 2026'],
  ]

  return (
    <section ref={sectionRef} id="inicio" aria-label="Inicio" className="relative h-[600vh] calm:h-svh">
      <div ref={stageRef} className="es-lamina sticky top-0 h-svh overflow-hidden">
        {/* La grilla de columnas, a la vista. */}
        <div ref={colsRef} className="es-cols" aria-hidden="true" style={{ '--cols': cols }}>
          {Array.from({ length: cols }, (_, i) => (
            <span key={i} data-col />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label="Boceto a lápiz de un local que se convierte en una maqueta 3D y se va decorando"
          data-cursor-tip={tip === 'final' ? 'Clic y arrastre · el local terminado' : 'Clic y arrastre · el boceto'}
        />

        {/* El marco del cuadrante: cuatro bordes que se dibujan y sus datos. */}
        <div ref={panelRef} className="es-panel" aria-hidden="true">
          <span data-panel-edge className="es-panel__edge es-panel__edge--t" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--r" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--b" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--l" />
          <span data-paint-stage className="es-paint es-panel__label es-panel__label--tl" style={LABEL}>
            {st.n} — {st.title}
          </span>
          <span className="es-panel__label es-panel__label--tr" style={LABEL}>
            Esc. 1:50 · N ↑
          </span>
        </div>

        {/* Las líneas de construcción (con el mouse). */}
        <div className="es-guides" aria-hidden="true">
          <span className="es-guide es-guide--h" style={{ top: 'var(--py)' }} />
          <span className="es-guide es-guide--h" style={{ top: 'calc(var(--py) + var(--ph) / 3)' }} />
          <span className="es-guide es-guide--h" style={{ top: 'calc(var(--py) + var(--ph) * 2 / 3)' }} />
          <span className="es-guide es-guide--h" style={{ top: 'calc(var(--py) + var(--ph))' }} />
          <span className="es-guide es-guide--v" style={{ left: 'var(--px)' }} />
          <span className="es-guide es-guide--v" style={{ left: 'calc(var(--px) + var(--pw) / 2)' }} />
          <span className="es-guide es-guide--v" style={{ left: 'calc(var(--px) + var(--pw))' }} />
          <span className="es-guide es-guide--rust-v" />
          <span className="es-guide es-guide--rust-h" />
        </div>

        {/* La columna de texto (cambia de lado): bajada, etapa y rótulo. */}
        <div ref={leftRef} className="es-left" style={{ color: C.ink, opacity: 0, visibility: 'hidden' }}>
          <h1 className="sr-only">
            {SITE.name} — {SITE.tagline}
          </h1>
          <p data-paint className="es-paint es-left__lede hidden sm:block">
            Diseño e interiorismo enfocado en la experiencia de usuario.
          </p>
          <div className="es-left__stage" aria-live="polite">
            <span data-paint data-paint-stage className="es-paint es-left__n" style={LABEL}>
              {st.n}
            </span>
            <div>
              <h2 data-paint data-paint-stage className="es-paint es-left__title">
                {st.title}
              </h2>
              <p data-paint data-paint-stage className="es-paint es-left__text">
                {st.text}
              </p>
            </div>
          </div>
          <dl className="es-rotulo hidden sm:grid" style={LABEL}>
            {rows.map(([k, v]) => (
              <div key={k} className="es-rotulo__row">
                <dt data-paint className="es-paint">
                  {k}
                </dt>
                <dd data-paint {...(k === 'Estado' || k === 'Lámina' ? { 'data-paint-stage': '' } : {})} className="es-paint">
                  {v}
                </dd>
              </div>
            ))}
            <div className="es-rotulo__row es-rotulo__row--sign">
              <dt data-paint className="es-paint">
                Dibujó
              </dt>
              <dd data-paint className="es-paint">
                {SITE.name}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
