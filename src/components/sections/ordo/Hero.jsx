import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget } from '../../../lib/motion'
import { C, HERO_VH, LABEL, NAV_H, OPEN_DELAY, OPEN_T as T, SITE, STAGE_AT } from './brand'
import { hidePaint, paint } from './paint'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT } from './localScene'
import photoFull from './assets/room-photo.webp'
import photoSmall from './assets/room-photo-1200.webp'
import sketchFull from './assets/sketch-room.webp'
import sketchSmall from './assets/sketch-room-1200.webp'
import emptyFull from './assets/sketch-empty.webp'
import emptySmall from './assets/sketch-empty-1200.webp'
import rawFull from './assets/sketch-raw.webp'
import rawSmall from './assets/sketch-raw-1200.webp'
import { DESIGN_PIECES, IMG, ROOM_IN_IMAGE as RI } from './designPieces'

/**
 * El hero: del boceto a la foto del local, sobre una lámina con la grilla a la vista.
 *
 * La disposición (como la de un hero de plano): arriba, tres cuartos de la pantalla para el cuadrante
 * del dibujo (un alzado, 21:9), a todo el ancho, con la etapa y la lámina en sus esquinas; abajo, una
 * franja baja como la de heronaiapp.com: el título grande a la izquierda y, a la derecha, una celda
 * con el texto de cada etapa. El alto de esa franja es --band-h (ordo.css).
 * Al terminar el loader, un local (café / showroom, minimal cálido) se dibuja a lápiz. Al scrollear
 * (el hero queda fijo):
 *   01 El espacio   el local como se recibe, en obra gris (ventana chica, parches, el caño y la lamparita).
 *   02 Diseño       el estudio proyecta todo, pieza por pieza (designPieces.js): primero la obra (ventanal,
 *                   nicho, cielorraso, revestimientos) y después el equipamiento (barra, repisa, banco,
 *                   mesa, florero, pedestal, árbol).
 *   03 Materia y luz la luz y la sombra se pintan debajo de los trazos, entra el color y los
 *                   trazos se van: queda la foto del local.
 *   04 Experiencia  la cámara se acerca sobre la foto.
 * En pantallas angostas (teléfono, tablet en vertical) el local no entra entero: el dibujo queda
 * grande y la cámara lo recorre, de izquierda a derecha, siguiendo cada mueble mientras se dibuja;
 * para la luz, el color y la foto vuelve al centro.
 * Todo pasa sobre la misma toma (boceto y foto alineados): las líneas no se corren nunca. El 3D
 * queda debajo solo para medir (la mira lee metros del piso).
 *
 * Con el mouse: al entrar al dibujo aparecen las líneas de construcción (guías punteadas y una regla
 * en óxido alrededor del cuadrante). En la última hoja, con el local terminado, se habilita el clic y
 * arrastre: del lado izquierdo del cursor se ve el boceto del local como se recibió (el antes).
 *
 * Al salir (con `boceto`, Boceto.jsx): 100vh más de scroll con la lámina fija, en los que todo vuelve
 * a boceto (la foto se despinta y vuelven los trazos; el texto y el marco pasan a lápiz). Después la
 * hoja en boceto sigue con el scroll y queda atrás.
 *
 * Con «reducir movimiento»: la lámina quieta, con la foto.
 */

const REVEAL_SECONDS = 3.8 * T

// Lo que dice la celda de la derecha en cada hoja del plano (la primera es también el subtítulo fijo,
// para los buscadores: ABOUT).
const ABOUT =
  'An architecture and interiors studio in Lisbon. We design every space whole, from the first line to the last joint.'
const STAGES = [
  { n: '01', title: 'The space', text: ABOUT },
  { n: '02', title: 'Design', text: 'We draw the whole space, piece by piece: openings, ceiling, finishes, joinery and furniture.' },
  { n: '03', title: 'Matter & light', text: 'From the idea to the built: materials, light and colour chosen for how the place will be lived in.' },
  { n: '04', title: 'Experience', text: 'The finished project, with a face of its own: a space ready to welcome its people.' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** El acercamiento sobre la foto al final del hero (localScene.js: uPhotoZoom). Sin acercamiento: la foto se queda
 *  como está en la etapa 04, para que el arrastre y la vuelta a boceto no se muevan. */
/**
 * El título se escribe por partes con los primeros tics de la rueda: «Diseño» ya está y, al pasar por cada avance
 * del hero, la siguiente parte aparece con un fundido lento (sube apenas y se desenfoca un poco al llegar). Cada
 * parte tiene su propio tiempo: no depende de qué tan rápido se gire la rueda. Lo que todavía no llegó no se ve.
 */
const TITLE_AT = [0, 0.012, 0.04, 0.07]
/** Cómo entra y sale cada parte del título y del texto de la etapa (s). */
const SOFT_IN = 1.25
const SOFT_OUT = 0.45

const PHOTO_END_ZOOM = 1
// La etapa 02: las piezas (obra y equipamiento) se dibujan una tras otra entre 0.06 y 0.52 del hero.
const PIECE_DUR = 0.09
const pieceAt = (k) => 0.06 + (k * (0.52 - 0.06 - PIECE_DUR)) / Math.max(1, DESIGN_PIECES.length - 1)
/** El cartel del cursor en la última etapa, cuando se puede arrastrar. */
const DRAG_TIP = 'Click and drag'
/** Lo que no es fondo en la foto (el local con su base y su sombra), en fracciones de la imagen. */
const PHOTO_IN = { x0: 0.03, x1: 0.97, y0: 0.085, y1: 0.87 }

/**
 * Las medidas de la lámina para un escenario de W × H: el cuadrante del dibujo va a todo el ancho,
 * entre el nav y el bloque de texto de abajo (que empieza en `infoTop`).
 */
function sheetLayout(W, H, infoTop) {
  const side = W >= 640 ? 36 : 16
  // Una línea de columna por cada módulo desde el borde derecho (las divisiones del nav, hacia abajo).
  const mod = W >= 1024 ? 192 : 128
  const cols = Math.max(1, Math.ceil(W / mod) - 1)
  // Entre el lomo del nav (opaco hasta --nav-h + 9) y el cuadrante queda la franja de los rótulos.
  const top = (W >= 640 ? NAV_H.desk : NAV_H.phone) + (W >= 640 ? 34 : 28)
  const bottom = infoTop - (W >= 640 ? 18 : 12)
  return { cols, panel: { x: side, y: top, w: W - side * 2, h: Math.max(80, bottom - top) } }
}

/**
 * El cuadro del alzado dentro del cuadrante: lo que se encaja es el local (no el papel que lo rodea
 * en la imagen), lo más grande posible sin cortarlo. En pantallas angostas se agranda y recorta los
 * costados.
 */
function cameraFrame(p) {
  const rw = RI.x1 - RI.x0
  const rh = RI.y1 - RI.y0
  const aspect = p.w / p.h
  const over = aspect < 1.5 ? Math.min(2.2, Math.max(1, (FRAME_ASPECT / aspect) * 0.86)) : 1
  const fw = Math.min(((p.w * 0.97) / rw) * over, ((p.h * 0.94) / rh) * FRAME_ASPECT)
  const fh = fw / FRAME_ASPECT
  return {
    x: p.x + p.w / 2 - fw * ((RI.x0 + RI.x1) / 2),
    y: p.y + p.h / 2 - fh * ((RI.y0 + RI.y1) / 2),
    w: fw,
    h: fh,
  }
}

/**
 * Una parte del título. Hasta que le toca no se ve, pero ocupa su lugar (el título no se acomoda al llegar cada
 * parte). Ver TITLE_AT.
 */
function Chunk({ text, hidden }) {
  return (
    <span data-chunk className="od-chunk">
      <span className="od-chunk__ink" style={hidden ? { opacity: 0, visibility: 'hidden' } : undefined}>
        {text}
      </span>
    </span>
  )
}

export default function Hero({ boarded, calm, bridge, navLogoRef, exit, boceto = false }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const panelRef = useRef(null)
  const infoRef = useRef(null)
  const cueRef = useRef(null)
  const colsRef = useRef(null)
  const sceneRef = useRef(null)
  const [stage, setStage] = useState(calm ? 3 : 0)
  const [cols, setCols] = useState(8)

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
      sketchRaw: big ? rawFull : rawSmall,
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
          // Con `boceto`, después de las cuatro etapas sigue la vuelta a boceto (Boceto.jsx): 100vh más.
          end: boceto ? () => `+=${window.innerHeight * HERO_VH}` : 'bottom bottom',
          onUpdate: (self) => {
            target = self.progress
          },
        })

    let shownStage = -1
    let canDrag = false
    let release = () => {}
    let frame = null
    // Cuando el local no entra entero en el cuadrante (teléfono, tablet en vertical), la cámara lo
    // recorre: los muebles se dibujan de izquierda a derecha y el cuadro sigue al que se está dibujando.
    let base = null
    let pan = false
    let order = DESIGN_PIECES.map((_, i) => i)
    let slot = order
    const centerOf = (i) => (DESIGN_PIECES[i].rect[0] + DESIGN_PIECES[i].rect[2]) / 2 / IMG.w
    // La vuelta a boceto al salir (0 → 1, la maneja Boceto.jsx): la foto se despinta y vuelven los trazos.
    let back = 0
    // El recorrido: arranca a la izquierda, pasa por cada mueble mientras se dibuja y, para la luz, el
    // color y la foto, vuelve al centro. El cuadro nunca muestra más allá de los muros.
    const panTo = (p) => {
      const P = L.panel
      const at = (k) => pieceAt(k) + PIECE_DUR * 0.4
      const n = order.length
      let fx = centerOf(order[0])
      for (let k = 0; k < n - 1; k += 1) if (p > at(k)) fx = centerOf(order[k]) + (centerOf(order[k + 1]) - centerOf(order[k])) * smooth(at(k), at(k + 1), p)
      if (p > at(n - 1)) fx = centerOf(order[n - 1]) + (0.5 - centerOf(order[n - 1])) * smooth(0.52, 0.8, p)
      const lo = P.x + P.w - RI.x1 * base.w
      const hi = P.x - RI.x0 * base.w
      const x = Math.min(hi, Math.max(lo, P.x + P.w / 2 - fx * base.w))
      if (Math.abs(x - frame.x) < 0.3) return
      frame = { ...base, x }
      scene.setFrame(frame.x, frame.y, frame.w, frame.h)
    }
    // Las partes del título: la tinta se descubre con el scroll (solo se escribe lo que cambió).
    const chunks = [...stageEl.querySelectorAll('[data-chunk]')].map((el, i) => ({ ink: el.querySelector('.od-chunk__ink'), on: calm || i === 0 }))
    const apply = (p) => {
      if (!lastKey) {
        lastKey = 'set'
        const P = L.panel
        const f = cameraFrame(P)
        base = f
        frame = f
        pan = !calm && f.w * (RI.x1 - RI.x0) > P.w + 2
        order = DESIGN_PIECES.map((_, i) => i)
        // Recorriendo: la obra primero y después el equipamiento, cada capa de izquierda a derecha.
        if (pan) order.sort((a, b) => (DESIGN_PIECES[b].obra ? 1 : 0) - (DESIGN_PIECES[a].obra ? 1 : 0) || centerOf(a) - centerOf(b))
        slot = DESIGN_PIECES.map((_, i) => order.indexOf(i))
        scene.setFrame(f.x, f.y, f.w, f.h)
        canvas.style.clipPath = `inset(${P.y}px ${stageEl.clientWidth - P.x - P.w}px ${stageEl.clientHeight - P.y - P.h}px ${P.x}px)`
        Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` })
        stageEl.style.setProperty('--px', `${P.x}px`)
        stageEl.style.setProperty('--py', `${P.y}px`)
        stageEl.style.setProperty('--pw', `${P.w}px`)
        stageEl.style.setProperty('--ph', `${P.h}px`)
      }
      if (!calm) {
        chunks.forEach((c, i) => {
          const on = p >= TITLE_AT[i]
          if (on === c.on) return
          c.on = on
          gsap.to(
            c.ink,
            on
              ? { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: SOFT_IN, ease: 'power2.out', overwrite: 'auto', clearProps: 'filter' }
              : { autoAlpha: 0, y: 12, filter: 'blur(3px)', duration: SOFT_OUT, ease: 'power2.out', overwrite: 'auto' },
          )
        })
      }
      // La señal de scroll se va apenas se empieza a bajar.
      if (cueRef.current) cueRef.current.style.opacity = String(calm ? 0 : 1 - smooth(0.004, 0.035, p))
      // El espacio → el diseño, mueble por mueble → luz y sombra, color (los trazos se van) → la cámara se acerca.
      scene.setRise(0)
      const pieces = DESIGN_PIECES.map((_, i) => (calm ? 1 : smooth(pieceAt(slot[i]), pieceAt(slot[i]) + PIECE_DUR, p)))
      if (pan) panTo(p)
      scene.setDesign(pieces)
      scene.setPhoto(calm ? 1 : smooth(0.52, 0.64, p) * (1 - back))
      scene.setSat(calm ? 1 : smooth(0.62, 0.78, p))
      scene.setSketch(calm ? 0 : Math.max(1 - smooth(0.62, 0.8, p), back))
      const s = calm ? 3 : p < STAGE_AT[1] ? 0 : p < STAGE_AT[2] ? 1 : p < STAGE_AT[3] ? 2 : 3
      if (s !== shownStage) {
        shownStage = s
        setStage(s)
        // El arrastre (antes / después) se habilita recién en la última hoja, con el local terminado.
        canDrag = s === 3 && back === 0
        if (!canDrag) release()
      }
    }
    apply(current)
    if (calm) scene.setReveal(1)

    let parked = false
    const tick = (_t, deltaMs) => {
      if (parked) return
      current += (target - current) * (1 - Math.exp(-deltaMs / 110))
      if (Math.abs(target - current) < 1e-4) current = target
      apply(current)
      if (scene.render()) budget.tick(deltaMs)
    }
    gsap.ticker.add(tick)

    // La mira del cursor pregunta acá en qué punto del alzado está, en metros: a lo largo del muro y
    // de alto desde el piso. Solo dentro del interior del local.
    // La salida a Proyectos (Proyectos.jsx): dónde está el local en la pantalla ahora (la foto, con el
    // acercamiento final de la escena, y el recorte del cuadrante) y cómo esconder la del lienzo.
    if (exit) {
      exit.current = {
        place() {
          if (!frame || !L) return null
          const r = stageEl.getBoundingClientRect()
          const P = L.panel
          const z = PHOTO_END_ZOOM
          const w = frame.w * z
          const h = frame.h * z
          // El acercamiento es sobre el punto (0.5, 0.52) del cuadro (localScene.js, photoAt).
          const img = { x: r.left + frame.x + frame.w * 0.5 - w * 0.5, y: r.top + frame.y + frame.h * 0.52 - h * 0.52, w, h }
          const x0 = Math.max(img.x + PHOTO_IN.x0 * w, r.left + P.x)
          const y0 = Math.max(img.y + PHOTO_IN.y0 * h, r.top + P.y)
          const x1 = Math.min(img.x + PHOTO_IN.x1 * w, r.left + P.x + P.w)
          const y1 = Math.min(img.y + PHOTO_IN.y1 * h, r.top + P.y + P.h)
          return { img, clip: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
        },
        /** Al salir, todo vuelve a boceto: la foto (en la escena) y el texto y el marco (--sk, CSS). */
        setBack(v) {
          if (v === back) return
          back = v
          stageEl.style.setProperty('--sk', String(v))
          stageEl.classList.toggle('is-sketch', v > 0.001)
          canDrag = shownStage === 3 && v === 0
          if (v > 0) release()
          // Mientras todo vuelve a boceto no hay arrastre: tampoco el cartel que lo ofrece.
          if (v > 0) canvas.removeAttribute('data-cursor-tip')
          else if (shownStage === 3) canvas.setAttribute('data-cursor-tip', DRAG_TIP)
        },
        hidePhoto(hidden) {
          if (hidden === parked) return
          // Mientras la foto vuela, el lienzo no se ve: el hero deja de calcular y de dibujar.
          parked = hidden
          canvas.style.visibility = hidden ? 'hidden' : ''
          if (!hidden) scene.render(true)
        },
      }
    }

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
      if (!canDrag || !fine || e.pointerType === 'touch' || e.button !== 0) return
      dragging = true
      canvas.setPointerCapture?.(e.pointerId)
      scene.setSplit(e.clientX / stageEl.clientWidth)
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
    release = onUp
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
      if (exit) exit.current = null
      canvas.style.visibility = ''
      scene.dispose()
      sceneRef.current = null
    }
  }, [calm, exit, boceto])

  // Al cambiar de etapa, lo que cambia entra con un fundido lento: sube apenas y se desenfoca un poco al llegar
  // (el texto, el número y los rótulos del cuadrante, uno tras otro). Antes de pintar, para que no se vea de golpe.
  const firstStage = useRef(true)
  useLayoutEffect(() => {
    if (firstStage.current) {
      firstStage.current = false
      return undefined
    }
    if (calm) return undefined
    const tween = gsap.fromTo(
      stageRef.current.querySelectorAll('[data-paint-stage]'),
      { autoAlpha: 0, y: 10, filter: 'blur(3px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: SOFT_IN, stagger: 0.12, ease: 'power2.out', overwrite: 'auto', clearProps: 'filter,transform' },
    )
    return () => tween.kill()
  }, [stage, calm])

  // Antes de que termine el loader: la grilla, el cuadrante y la columna, escondidos.
  useLayoutEffect(() => {
    if (calm) return undefined
    const q = gsap.utils.selector(stageRef.current)
    const ctx = gsap.context(() => {
      gsap.set(q('[data-col]'), { scaleY: 0 })
      gsap.set(q('[data-vline]'), { scaleY: 0 })
      gsap.set(q('[data-panel-edge]'), { scale: 0 })
      // La línea de abajo del marco nace en el centro de la pantalla, con la del nav (Nav.jsx).
      const mid = window.innerHeight / 2
      gsap.set(q('[data-frame-line]'), { scaleX: 0, y: (_i, el) => mid - el.getBoundingClientRect().top })
      gsap.set(q('[data-frame-mark]'), { autoAlpha: 0, scale: 0.4 })
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
      .to(q('[data-panel-edge]'), { scale: 1, duration: 0.9 * T, ease: 'expo.inOut', stagger: 0.05 * T }, 0.2 * T)
      // Los mismos tiempos que la línea del nav: se estira en el centro y baja a su lugar.
      .to(q('[data-frame-line]'), { scaleX: 1, duration: 0.8 * T, ease: 'expo.inOut' }, OPEN_DELAY)
      .to(q('[data-frame-line]'), { y: 0, duration: 1 * T, ease: 'expo.inOut' }, OPEN_DELAY + 0.75 * T)
      .to(q('[data-frame-mark]'), { autoAlpha: 1, scale: 1, duration: 0.5 * T, ease: 'back.out(2)', stagger: 0.05 * T }, OPEN_DELAY + 2.1 * T)
      .to(q('[data-col]'), { scaleY: 1, duration: 1.1 * T, ease: 'expo.out', stagger: 0.06 * T }, OPEN_DELAY + 0.8 * T)
      // La línea del texto arranca con las dos horizontales y es más lenta que ellas (a las dos les lleva 1,75 T).
      .to(q('[data-vline]'), { scaleY: 1, duration: 2.6 * T, ease: 'power2.inOut' }, OPEN_DELAY)
      .add(() => paint(q('[data-paint]'), { stagger: 0.05 * T, duration: 0.85 * T }), OPEN_DELAY + 0.6 * T)
      .add(() => cueRef.current?.classList.add('is-on'), OPEN_DELAY + 1.4 * T)
    return () => {
      alive = false
      tl.kill()
      gsap.killTweensOf(pen)
    }
  }, [boarded, calm])

  const st = STAGES[stage]

  return (
    <section ref={sectionRef} id="home" aria-label="Home" className={`relative z-[2] ${boceto ? 'h-[580vh]' : 'h-[480vh]'} calm:h-svh`}>
      <div ref={stageRef} data-hero-sheet className="od-lamina od-sheet od-sk sticky top-0 h-svh overflow-hidden">
        {/* La grilla de columnas, a la vista. */}
        <div ref={colsRef} className="od-cols" aria-hidden="true" style={{ '--cols': cols }}>
          {Array.from({ length: cols }, (_, i) => (
            <span key={i} data-col style={{ '--i': i + 1 }} />
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label="Elevation of a shop shell drawn in pencil that gets designed piece by piece, from the openings and finishes to each piece of furniture, until it becomes the photograph of the finished space"
          data-cursor-tip={stage === 3 ? DRAG_TIP : undefined}
        />

        {/* El marco del cuadrante: cuatro bordes que se dibujan y sus datos. */}
        <div ref={panelRef} className="od-panel" data-cursor-zone aria-hidden="true">
          <span data-panel-edge className="od-panel__edge od-panel__edge--t" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--r" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--b" />
          <span data-panel-edge className="od-panel__edge od-panel__edge--l" />
          <span data-paint data-paint-stage className="od-paint od-panel__label od-panel__label--tl" style={LABEL}>
            {st.n} — {st.title}
          </span>
          <span data-paint data-paint-stage className="od-paint od-panel__label od-panel__label--tr hidden sm:block" style={LABEL}>
            Elevation · Scale 1:50 · Sheet {st.n} / 04
          </span>
        </div>

        {/* Las líneas de construcción (con el mouse). */}
        <div className="od-guides" aria-hidden="true">
          <span className="od-guide od-guide--h" style={{ top: 'var(--py)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph) / 3)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph) * 2 / 3)' }} />
          <span className="od-guide od-guide--h" style={{ top: 'calc(var(--py) + var(--ph))' }} />
          <span className="od-guide od-guide--v" style={{ left: 'var(--px)' }} />
          <span className="od-guide od-guide--v" style={{ left: 'calc(var(--px) + var(--pw) / 2)' }} />
          <span className="od-guide od-guide--v" style={{ left: 'calc(var(--px) + var(--pw))' }} />
          <span className="od-guide od-guide--rust-v" />
          <span className="od-guide od-guide--rust-h" />
        </div>

        {/* El borde de la franja de abajo y sus cruces: el marco de esta hoja (se va con ella). */}
        <span data-frame-line className="od-frame__line od-frame__line--bottom" aria-hidden="true" />
        {['bl', 'br'].map((k) => (
          <span key={k} data-frame-mark className={`od-frame__mark od-frame__mark--${k}`} aria-hidden="true" />
        ))}

        {/* La franja de abajo: el título grande y, a la derecha, el texto de la etapa. */}
        <div ref={infoRef} className="od-info" style={{ color: C.ink }}>
          <h1 className="od-info__title">
            <span className="sr-only">{SITE.name} — </span>
            <span data-paint className="od-paint od-info__line">
              <Chunk text="Architecture" /> <Chunk text="& interiors" hidden={!calm} />
            </span>
            <span data-paint className="od-paint od-info__line">
              <Chunk text="for the people" hidden={!calm} /> <Chunk text="who live in them" hidden={!calm} />
            </span>
          </h1>
          {/* La señal de scroll: la palabra y una flecha dibujada a mano que se traza una y otra vez. */}
          <div ref={cueRef} className="od-scrollcue" aria-hidden="true">
            <span className="od-scrollcue__label" style={LABEL}>
              Scroll
            </span>
            <svg className="od-scrollcue__arrow" viewBox="0 0 30 64" fill="none">
              <path className="od-scrollcue__s1" pathLength="1" d="M15.2 2 C14.4 14, 16.3 24, 15 36 S14.6 50, 15.4 58.5" />
              <path className="od-scrollcue__s2" pathLength="1" d="M16.4 4.5 C15.6 18, 16.8 30, 15.9 42 S15.6 52, 15.8 57" />
              <path className="od-scrollcue__h1" pathLength="1" d="M5.5 46.5 C9 50.5, 12.4 54.6, 15.3 59.4" />
              <path className="od-scrollcue__h2" pathLength="1" d="M25.2 45.4 C21.6 50, 18.4 54.4, 15.1 59.6 L14.2 61" />
            </svg>
          </div>

          <div className="od-info__side">
            {/* La línea que separa el titular del texto: se traza de arriba abajo al abrir (data-vline). */}
            <span data-vline className="od-info__vline" aria-hidden="true" />
            <h2 className="sr-only">{ABOUT}</h2>
            {/* El número de la hoja: el mismo de la lámina del cuadrante («Lámina 02 / 04»). */}
            <span data-paint data-paint-stage className="od-paint od-info__step" style={LABEL} aria-hidden="true">
              {st.n} / 04
            </span>
            <p data-paint data-paint-stage className="od-paint od-info__copy" aria-live="polite">
              {st.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
