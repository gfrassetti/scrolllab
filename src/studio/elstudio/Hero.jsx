import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { BAND_H, C, LABEL, NAV_H, OPEN_DELAY, SITE } from './brand'
import { hidePaint, paint } from './paint'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT, ROOM } from './localScene'
import photoFull from './assets/foto-local.webp'
import photoSmall from './assets/foto-local-1200.webp'
import sketchFull from './assets/boceto-local.webp'
import sketchSmall from './assets/boceto-local-1200.webp'

/**
 * El hero: del boceto a la foto del local, sobre una lámina con la grilla a la vista.
 *
 * La lámina está dividida desde el primer cuadro: a la izquierda la bajada, la etapa y el rótulo;
 * a la derecha el cuadrante del dibujo (en pantallas angostas, el dibujo arriba y la etapa abajo).
 * Al terminar el loader, un local (café / showroom) se dibuja a lápiz y carbonilla. Al scrollear
 * (el hero queda fijo):
 *   01 Boceto       el dibujo.
 *   02 Volumen      el local sube desde el dibujo, pieza por pieza (como en Illoca); el trazo queda
 *                   como un fantasma y se apaga cuando el volumen está en pie.
 *   03 Interiorismo la foto real del local se pinta encima de la maqueta, de izquierda a derecha.
 *   04 Experiencia  la cámara se acerca sobre la foto.
 * La cámara del 3D no se mueve: el boceto, la maqueta y la foto calzan uno sobre otro.
 *
 * Con el mouse: al entrar al hero aparecen las líneas de construcción (guías punteadas y una regla
 * en óxido alrededor del cuadrante) y, al hacer clic y arrastrar sobre el dibujo, se ve el otro
 * estado del lado izquierdo del cursor (la foto sobre el boceto, o el boceto sobre la foto).
 *
 * Con «reducir movimiento»: la lámina quieta, con la foto.
 */

const REVEAL_SECONDS = 3.8
// `?foto-ref`: el local terminado con la cámara de arranque y el cuadro a todo el canvas, para
// generar la foto del arrastre a partir de él (scripts propios, no se usa en el sitio).
const PHOTO_REF = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('foto-ref')

const STAGES = [
  { n: '01', title: 'Boceto', text: 'Todo empieza a mano: la idea del espacio, a lápiz y carbonilla.' },
  { n: '02', title: 'Volumen', text: 'El mismo dibujo en tres dimensiones: proporciones, luz y recorridos.' },
  { n: '03', title: 'Interiorismo', text: 'Materiales, luz y objetos: el espacio como se va a vivir.' },
  { n: '04', title: 'Experiencia', text: 'Un lugar listo para vivirse.' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * Las medidas de la lámina para un escenario de W × H: el cuadrante del dibujo y la columna de texto.
 * Desde 1024 px: texto en las columnas 1–3 y dibujo en las 4–8. Más angosto: dibujo arriba y la
 * etapa debajo.
 */
function sheetLayout(W, H) {
  const desk = W >= 1024
  const side = W >= 640 ? 36 : 16
  const gap = 16
  const cols = W >= 640 ? 8 : 4
  const colW = (W - side * 2 - gap * (cols - 1)) / cols
  const top = (W >= 640 ? NAV_H.desk : NAV_H.phone) + (W >= 640 ? 26 : 20)
  const bottom = H - (W >= 640 ? BAND_H.desk : BAND_H.phone) - (W >= 640 ? 20 : 14)
  if (desk) {
    const span = (n) => n * colW + (n - 1) * gap
    const x = (c) => side + c * (colW + gap)
    return {
      desk,
      cols,
      panel: { x: x(3), y: top, w: span(5), h: bottom - top },
      text: { x: x(0), y: top, w: span(3) - gap, h: bottom - top },
    }
  }
  const textH = 92
  return {
    desk,
    cols,
    panel: { x: side, y: top, w: W - side * 2, h: bottom - top - textH },
    text: { x: side, y: bottom - textH + 14, w: W - side * 2, h: textH - 14 },
  }
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
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    // El boceto a lápiz y la foto del local (misma toma): en pantallas chicas, los livianos.
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
    const scene = createLocalScene({ canvas, phone, photo: big ? photoFull : photoSmall, sketch: big ? sketchFull : sketchSmall })
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
    const apply = (p) => {
      if (PHOTO_REF) {
        const W = stageEl.clientWidth
        const H = stageEl.clientHeight
        scene.setFrame(0, 0, W, H)
        canvas.style.clipPath = 'none'
        scene.setRise(1)
        scene.setSketch(0)
        scene.setDecor(1)
        scene.setReveal(1)
        return
      }
      if (!lastKey) {
        lastKey = 'set'
        const P = L.panel
        const T = L.text
        const f = cameraFrame(P)
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        Object.assign(left.style, { left: `${T.x}px`, top: `${T.y}px`, width: `${T.w}px`, height: `${T.h}px` })
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
      }
      // Boceto → el local sube desde el dibujo → la foto se pinta encima → la cámara se acerca.
      scene.setRise(calm ? 1 : clamp01((p - 0.06) / 0.34))
      // El trazo queda como un fantasma mientras el volumen sube desde él, y se apaga cuando está en pie.
      scene.setSketch(calm ? 0 : 1 - 0.86 * smooth(0.04, 0.1, p) - 0.14 * smooth(0.32, 0.42, p))
      scene.setPhoto(calm ? 1 : smooth(0.46, 0.76, p))
      scene.setZoom(calm ? 0 : smooth(0.8, 1, p))
      const s = calm ? 3 : p < 0.06 ? 0 : p < 0.44 ? 1 : p < 0.8 ? 2 : 3
      if (s !== shownStage) {
        shownStage = s
        setStage(s)
        setTip(scene.splitShows())
      }
    }
    apply(current)
    if (calm) scene.setReveal(1)
    // Mientras se arrastra, el cartel dice qué se ve del otro lado.
    const refreshTip = () => setTip(scene.splitShows())

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
    const split = { on: 0 }
    let dragging = false
    const onDown = (e) => {
      if (!fine || e.pointerType === 'touch' || e.button !== 0) return
      dragging = true
      canvas.setPointerCapture?.(e.pointerId)
      scene.setSplit(e.clientX / stageEl.clientWidth)
      refreshTip()
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
    // Las líneas de construcción: aparecen al entrar al dibujo con el mouse (el canvas solo recibe el
    // puntero dentro del cuadrante, por su clip-path).
    const onEnter = (e) => e.pointerType !== 'touch' && stageEl.classList.add('is-hover')
    const onLeave = () => stageEl.classList.remove('is-hover')
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      gsap.ticker.remove(tick)
      gsap.killTweensOf(split)
      trigger?.kill()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
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
      hidePaint(q('[data-paint]'))
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
      .add(() => paint(q('[data-paint]'), { stagger: 0.05, duration: 0.85 }), OPEN_DELAY + 0.6)
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
    <section ref={sectionRef} id="inicio" aria-label="Inicio" className="relative h-[480vh] calm:h-svh">
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
          data-cursor-tip={tip === 'sketch' ? 'Clic y arrastre · el boceto' : 'Clic y arrastre · la foto'}
        />

        {/* El marco del cuadrante: cuatro bordes que se dibujan y sus datos. */}
        <div ref={panelRef} className="es-panel" data-cursor-zone aria-hidden="true">
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
        <div ref={leftRef} className="es-left" style={{ color: C.ink }}>
          <h1 className="sr-only">
            {SITE.name} — {SITE.tagline}
          </h1>
          <p data-paint className="es-paint es-left__lede hidden lg:block">
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
          <dl className="es-rotulo hidden lg:grid" style={LABEL}>
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
