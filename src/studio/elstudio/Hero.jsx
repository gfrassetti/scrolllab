import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { BAND_H, C, NAV_H, OPEN_DELAY, SITE } from './brand'
import Logo from './Logo'
import { LOGO_VIEWBOX } from './logoPaths'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT, ROOM } from './localScene'

/**
 * El hero: una lámina de arquitectura.
 *
 * La pantalla es una hoja con una grilla de 8 columnas a la vista (4 en el teléfono). Arriba, la
 * marca a todo el ancho: el logo del loader aterriza ahí. En el cuadrante grande (columnas 4–8) un
 * local se dibuja a lápiz y carbonilla; a la izquierda, la bajada, la etapa y el rótulo de la
 * lámina (el cuadro de datos de un plano).
 *
 * Al scrollear (el hero queda fijo): la marca se achica hasta su lugar en el nav y el cuadrante
 * crece; el boceto se vuelve la maqueta 3D (es la misma escena, así que cada trazo cae sobre su
 * objeto); el local se decora pieza por pieza y al final la cámara se acerca. Cada etapa cambia la
 * columna de la izquierda y el rótulo (lámina 01 → 04).
 *
 * Con el mouse: al entrar al hero aparecen las líneas de construcción (guías punteadas y una regla
 * en óxido alrededor del cuadrante) y, al hacer clic y arrastrar sobre el dibujo, se ve el otro
 * estado del lado izquierdo del cursor (el local terminado sobre el boceto, o al revés).
 *
 * Con «reducir movimiento»: la lámina quieta, con el local terminado.
 */

const REVEAL_SECONDS = 3.2

const STAGES = [
  { n: '01', title: 'Boceto', text: 'Todo empieza a mano: la idea del espacio, a lápiz y carbonilla.' },
  { n: '02', title: 'Volumen', text: 'El mismo dibujo en tres dimensiones: proporciones, luz y recorridos.' },
  { n: '03', title: 'Interiorismo', text: 'Materiales, objetos y luz cálida, pensados para quien usa el espacio.' },
  { n: '04', title: 'Experiencia', text: 'Un lugar listo para vivirse.' },
]

const MONO = { fontFamily: "'DM Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace" }
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })

/** Las medidas de la lámina para un escenario de W × H: la marca, el cuadrante y la columna. */
function sheetLayout(W, H) {
  const desk = W >= 640
  const side = desk ? 36 : 16
  const gap = 16
  const cols = desk ? 8 : 4
  const colW = (W - side * 2 - gap * (cols - 1)) / cols
  const top = (desk ? NAV_H.desk : NAV_H.phone) + (desk ? 26 : 20)
  const bottom = H - (desk ? BAND_H.desk : BAND_H.phone) - (desk ? 20 : 14)
  const wordW = W - side * 2
  const wordH = (wordW * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w
  const word = { x: side, y: top, w: wordW, h: wordH }
  const below = top + wordH + (desk ? 18 : 12)
  if (desk) {
    const px = side + 3 * (colW + gap)
    const pw = W - side - px
    const lw = 3 * colW + 2 * gap
    return {
      desk,
      side,
      gap,
      cols,
      word,
      panel0: { x: px, y: below, w: pw, h: bottom - below },
      panel1: { x: px, y: top, w: pw, h: bottom - top },
      left0: { x: side, y: below, w: lw - gap, h: bottom - below },
      left1: { x: side, y: top, w: lw - gap, h: bottom - top },
    }
  }
  // Teléfono: la marca arriba, el cuadrante a todo el ancho y la etapa debajo.
  const textH = 92
  return {
    desk,
    side,
    gap,
    cols,
    word,
    panel0: { x: side, y: below, w: W - side * 2, h: bottom - below - textH },
    panel1: { x: side, y: top, w: W - side * 2, h: bottom - top - textH },
    left0: { x: side, y: bottom - textH + 14, w: W - side * 2, h: textH - 14 },
    left1: { x: side, y: bottom - textH + 14, w: W - side * 2, h: textH - 14 },
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
  const wordRef = useRef(null)
  const panelRef = useRef(null)
  const leftRef = useRef(null)
  const colsRef = useRef(null)
  const sceneRef = useRef(null)
  const [stage, setStage] = useState(calm ? 3 : 0)
  const [cols, setCols] = useState(8)
  const [tip, setTip] = useState('final')

  // El loader aterriza en la marca gigante.
  useEffect(() => {
    const word = wordRef.current
    bridge.current = {
      target: () => word.querySelector('svg[data-part=row]'),
      show: () => {
        word.style.visibility = 'visible'
      },
    }
    return () => {
      bridge.current = {}
    }
  }, [bridge])

  // La escena, la geometría de la lámina y el scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    const stageEl = stageRef.current
    const word = wordRef.current
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
      word.style.left = `${L.word.x}px`
      word.style.top = `${L.word.y}px`
      word.style.fontSize = `${(L.word.w * 1000) / LOGO_VIEWBOX.w}px`
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
      // La marca se achica hasta el logo del nav y el cuadrante crece (en la versión calma no).
      const t = calm ? 0 : smooth(0.02, 0.12, p)
      const P = lerpRect(L.panel0, L.panel1, t)
      const Lc = lerpRect(L.left0, L.left1, t)
      const key = `${P.x.toFixed(1)}|${P.y.toFixed(1)}|${P.w.toFixed(1)}|${P.h.toFixed(1)}`
      if (key !== lastKey) {
        lastKey = key
        const f = cameraFrame(P)
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        Object.assign(left.style, { left: `${Lc.x}px`, top: `${Lc.y}px`, width: `${Lc.w}px`, height: `${Lc.h}px` })
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
        // La marca viaja al logo del nav.
        const nav = navLogoRef.current?.querySelector('svg[data-part=row]')?.getBoundingClientRect()
        if (nav) {
          const s = lerp(1, nav.width / L.word.w, t)
          word.style.transform = `translate3d(${lerp(0, nav.left - L.word.x, t)}px, ${lerp(0, nav.top - L.word.y, t)}px, 0) scale(${s})`
        }
        const docked = t > 0.995
        word.style.opacity = docked ? '0' : '1'
        if (navLogoRef.current) navLogoRef.current.style.opacity = docked ? '1' : '0'
      }
      // Boceto → maqueta → decorado → la cámara se acerca.
      scene.setSketch(calm ? 0 : 1 - clamp01((p - 0.18) / 0.18))
      scene.setDecor(calm ? 1 : clamp01((p - 0.4) / 0.4))
      scene.setCamera(calm ? 0 : clamp01((p - 0.82) / 0.18))
      const s = calm ? 3 : p < 0.2 ? 0 : p < 0.4 ? 1 : p < 0.8 ? 2 : 3
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
  }, [calm, navLogoRef])

  // Antes de que termine el loader: la grilla, el cuadrante y la columna, escondidos.
  useLayoutEffect(() => {
    if (calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const ctx = gsap.context(() => {
      gsap.set(q('[data-col]'), { scaleY: 0 })
      gsap.set(q('[data-panel-edge]'), { scale: 0 })
      gsap.set(q('[data-left-in]'), { autoAlpha: 0, y: 12 })
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
      .to(q('[data-left-in]'), { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09 }, OPEN_DELAY + 1)
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
    <section ref={sectionRef} id="inicio" aria-label="Inicio" className="relative h-[560vh] calm:h-svh">
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
          <span className="es-panel__label es-panel__label--tl" style={MONO}>
            {st.n} — {st.title}
          </span>
          <span className="es-panel__label es-panel__label--tr" style={MONO}>
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

        {/* La marca a todo el ancho: el loader aterriza acá y al scrollear viaja al nav. */}
        <div ref={wordRef} className="es-word" style={{ visibility: calm ? 'visible' : 'hidden' }} aria-hidden="true">
          <Logo compact />
        </div>

        {/* La columna de la izquierda: bajada, etapa y rótulo. */}
        <div ref={leftRef} className="es-left" style={{ color: C.ink }}>
          <h1 className="sr-only">
            {SITE.name} — {SITE.tagline}
          </h1>
          <p data-left-in className="es-left__lede hidden sm:block">
            Diseño e interiorismo enfocado en la experiencia de usuario.
          </p>
          <div data-left-in className="es-left__stage" aria-live="polite">
            <span className="es-left__n" style={MONO}>
              {st.n}
            </span>
            <div key={stage} className="es-left__stage-in">
              <h2 className="es-left__title">{st.title}</h2>
              <p className="es-left__text">{st.text}</p>
            </div>
          </div>
          <dl data-left-in className="es-rotulo hidden sm:grid" style={MONO}>
            {rows.map(([k, v]) => (
              <div key={k} className="es-rotulo__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="es-rotulo__row es-rotulo__row--sign">
              <dt>Dibujó</dt>
              <dd>{SITE.name}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
