import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { scrollToSection } from '../../hooks/useLenis'
import { C, LABEL, NAV_H, OPEN_DELAY, SITE } from './brand'
import { hidePaint, paint } from './paint'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT } from './localScene'
import photoFull from './assets/foto-local.webp'
import photoSmall from './assets/foto-local-1200.webp'
import sketchFull from './assets/boceto-local.webp'
import sketchSmall from './assets/boceto-local-1200.webp'
import emptyFull from './assets/boceto-vacio.webp'
import emptySmall from './assets/boceto-vacio-1200.webp'
import { DESIGN_PIECES, ROOM_IN_IMAGE as RI } from './designPieces'

/**
 * El hero: del boceto a la foto del local, sobre una lámina con la grilla a la vista.
 *
 * La disposición (como la de un hero de plano): arriba, tres cuartos de la pantalla para el cuadrante
 * del dibujo (un alzado, 21:9), a todo el ancho, con la etapa y la lámina en sus esquinas; abajo, el
 * bloque de texto: el título grande a la izquierda y, a la derecha, la bajada, el botón a proyectos
 * y una cinta con los servicios. El alto de ese bloque es --band-h (elstudio.css).
 * Al terminar el loader, un local (café / showroom) se dibuja a lápiz y carbonilla. Al scrollear
 * (el hero queda fijo):
 *   01 El espacio   el local vacío, dibujado a lápiz (muros, ventana, nicho, luz).
 *   02 Diseño       cada mueble se dibuja en su lugar, uno por uno (designPieces.js): barra, estantes, banco, mesa, guardado, pedestales, olivo.
 *   03 Materia y luz la luz y la sombra se pintan debajo de los trazos, entra el color y los
 *                   trazos se van: queda la foto del local.
 *   04 Experiencia  la cámara se acerca sobre la foto.
 * Todo pasa sobre la misma toma (boceto y foto alineados): las líneas no se corren nunca. El 3D
 * queda debajo solo para medir (la mira lee metros del piso).
 *
 * Con el mouse: al entrar al hero aparecen las líneas de construcción (guías punteadas y una regla
 * en óxido alrededor del cuadrante) y, al hacer clic y arrastrar sobre el dibujo, se ve el otro
 * estado del lado izquierdo del cursor (la foto sobre el boceto, o el boceto sobre la foto).
 *
 * Con «reducir movimiento»: la lámina quieta, con la foto.
 */

const REVEAL_SECONDS = 3.8

const STAGES = [
  { n: '01', title: 'El espacio', text: 'Un local vacío: muros, luz y proporciones.' },
  { n: '02', title: 'Diseño', text: 'Cada pieza se dibuja pensando en quien va a usar el espacio.' },
  { n: '03', title: 'Materia y luz', text: 'Materiales, luz y color: el espacio como se va a vivir.' },
  { n: '04', title: 'Experiencia', text: 'Un lugar listo para vivirse.' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * Las medidas de la lámina para un escenario de W × H: el cuadrante del dibujo va a todo el ancho,
 * entre el nav y el bloque de texto de abajo (que empieza en `infoTop`).
 */
function sheetLayout(W, H, infoTop) {
  const side = W >= 640 ? 36 : 16
  const cols = W >= 640 ? 8 : 4
  const top = (W >= 640 ? NAV_H.desk : NAV_H.phone) + (W >= 640 ? 22 : 16)
  const bottom = infoTop - (W >= 640 ? 18 : 12)
  return { cols, panel: { x: side, y: top, w: W - side * 2, h: Math.max(80, bottom - top) } }
}

const SERVICES = ['Interiorismo', 'Locales comerciales', 'Mobiliario a medida', 'Vivienda', 'Objetos', 'Dirección de obra']

/**
 * El cuadro del alzado dentro del cuadrante: lo más grande posible sin cortar el local (el papel de
 * arriba y abajo puede quedar afuera). En pantallas angostas se agranda y recorta los costados.
 */
function cameraFrame(p) {
  const aspect = p.w / p.h
  let fw = Math.min(p.w, p.h * 1.06 * FRAME_ASPECT)
  const over = Math.min(2.2, Math.max(1, (FRAME_ASPECT / aspect) * 0.86))
  fw *= over
  const fh = fw / FRAME_ASPECT
  return { x: p.x + (p.w - fw) / 2, y: p.y + (p.h - fh) / 2, w: fw, h: fh }
}

export default function Hero({ boarded, calm, bridge, navLogoRef }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const panelRef = useRef(null)
  const infoRef = useRef(null)
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
    const info = infoRef.current
    const phone = window.matchMedia('(max-width: 767px)').matches
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    // El boceto a lápiz y la foto del local (misma toma): en pantallas chicas, los livianos.
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1600
    const scene = createLocalScene({
      canvas,
      phone,
      photo: big ? photoFull : photoSmall,
      sketch: big ? sketchFull : sketchSmall,
      sketchEmpty: big ? emptyFull : emptySmall,
    })
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
      L = sheetLayout(W, H, info.offsetTop)
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
    let frame = null
    const apply = (p) => {
      if (!lastKey) {
        lastKey = 'set'
        const P = L.panel
        const f = cameraFrame(P)
        frame = f
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
      }
      // El espacio → el diseño, mueble por mueble → luz y sombra, color (los trazos se van) → la cámara se acerca.
      scene.setRise(0)
      const pieces = DESIGN_PIECES.map((_, i) => (calm ? 1 : smooth(0.06 + i * 0.058, 0.06 + i * 0.058 + 0.1, p)))
      scene.setDesign(pieces)
      scene.setPhoto(calm ? 1 : smooth(0.52, 0.64, p))
      scene.setSat(calm ? 1 : smooth(0.62, 0.78, p))
      scene.setSketch(calm ? 0 : 1 - smooth(0.62, 0.8, p))
      scene.setZoom(calm ? 0 : smooth(0.84, 1, p))
      const s = calm ? 3 : p < 0.06 ? 0 : p < 0.52 ? 1 : p < 0.84 ? 2 : 3
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

    // La mira del cursor pregunta acá en qué punto del alzado está, en metros: a lo largo del muro y
    // de alto desde el piso. Solo dentro del interior del local.
    setPlanProbe((x, y) => {
      if (!frame) return null
      const c = canvas.getBoundingClientRect()
      const u = (x - c.left - frame.x) / frame.w
      const v = (y - c.top - frame.y) / frame.h
      const mx = ((u - RI.x0) / (RI.x1 - RI.x0)) * RI.w
      const my = ((RI.y1 - v) / (RI.y1 - RI.y0)) * RI.h
      if (mx < 0 || mx > RI.w || my < 0 || my > RI.h) return null
      return { x: mx, y: my }
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
    // El dibujo arranca cuando la imagen está (si tarda, el marco se arma igual y el dibujo lo sigue).
    let alive = true
    scene.sketchReady.then(() => {
      if (alive) gsap.to(pen, { v: 1, duration: REVEAL_SECONDS, ease: 'power1.inOut', onUpdate: () => scene.setReveal(pen.v) })
    })
    tl
      .to(q('[data-panel-edge]'), { scale: 1, duration: 0.9, ease: 'expo.inOut', stagger: 0.05 }, 0.2)
      .to(q('[data-col]'), { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, OPEN_DELAY + 0.8)
      .add(() => paint(q('[data-paint]'), { stagger: 0.05, duration: 0.85 }), OPEN_DELAY + 0.6)
    return () => {
      alive = false
      tl.kill()
      gsap.killTweensOf(pen)
    }
  }, [boarded, calm])

  const st = STAGES[stage]

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
          aria-label="Alzado de un local vacío dibujado a lápiz que se va diseñando, mueble por mueble, hasta la foto del local terminado"
          data-cursor-tip={tip === 'sketch' ? 'Clic y arrastre · el boceto' : 'Clic y arrastre · la foto'}
        />

        {/* El marco del cuadrante: cuatro bordes que se dibujan y sus datos. */}
        <div ref={panelRef} className="es-panel" data-cursor-zone aria-hidden="true">
          <span data-panel-edge className="es-panel__edge es-panel__edge--t" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--r" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--b" />
          <span data-panel-edge className="es-panel__edge es-panel__edge--l" />
          <span data-paint data-paint-stage className="es-paint es-panel__label es-panel__label--tl" style={LABEL}>
            {st.n} — {st.title}
          </span>
          <span data-paint data-paint-stage className="es-paint es-panel__label es-panel__label--tr hidden sm:block" style={LABEL}>
            Alzado · Esc. 1:50 · Lámina {st.n} / 04
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

        {/* El bloque de abajo: el título grande, la bajada, el botón y la cinta de servicios. */}
        <div ref={infoRef} className="es-info" style={{ color: C.ink }}>
          <h1 className="es-info__title">
            <span className="sr-only">{SITE.name} — </span>
            <span data-paint className="es-paint es-info__line">
              Diseño e interiorismo
            </span>
            <span data-paint className="es-paint es-info__line">
              para quien lo vive
            </span>
          </h1>
          <div className="es-info__side">
            <p data-paint className="es-paint es-info__lede">
              Estudio multidisciplinario de diseño e interiorismo, enfocado en la experiencia de usuario. Desde la Patagonia y Buenos
              Aires, para cualquier lugar.
            </p>
            <a
              href="#proyectos"
              className="es-info__cta"
              style={LABEL}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('proyectos')
              }}
            >
              <span data-paint className="es-paint">
                Ver proyectos
              </span>
              <span data-paint className="es-paint es-info__arrow" aria-hidden="true">
                →
              </span>
            </a>
            <div className="es-info__ticker" style={LABEL} aria-label={`Servicios: ${SERVICES.join(', ')}`}>
              <div data-paint className="es-paint es-info__track" aria-hidden="true">
                {[0, 1].map((k) => (
                  <span key={k} className="es-info__run">
                    {SERVICES.map((t) => (
                      <span key={t} className="es-info__item">
                        <span className="es-info__dot" />
                        {t}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
