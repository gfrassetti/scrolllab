import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { getLenis } from '../../hooks/useLenis'
import { createKanvas, lerp, clamp01 } from './engine'
import { createAudio } from './audio'
import { createRidge, createTopo } from './ridge'
import { createRelic } from './relic'
import { AMBER, AudioWave, BODY, DISPLAY, FONTS_HREF, KANVAS_CSS, Menu, LABEL, RollLink, setHoverFx, useSubscribed } from './ui'

/**
 * Kanvas — prototipo (solo local) con la arquitectura de la referencia y una identidad propia: VESPER,
 * un atlas ilustrado. Cómo funciona: docs/kanvas.md.
 *
 *   · Un RELOJ único: el scroll produce un progreso 0 → 1. Un espaciador da el largo y nada más.
 *   · Una capa CANVAS fija (todo lo que es imagen o 3D) y una capa UI fija encima, con las secciones
 *     APILADAS: el progreso decide cuál se ve.
 *   · Carga → hero (escena 3D) → el hero se aleja y queda como lámina inclinada entre otras dos →
 *     la lámina se da vuelta y del otro lado está la cordillera, a pantalla completa → una transición
 *     de vetas → los dos viajeros de espaldas, al viento.
 */

const NAME = 'VESPER'
const CREAM = '#ede8df'
const WHITE = '#ffffff'
const INK = '#15111d'
const SCROLL_SCREENS = 16

// El guion, en progreso (0 → 1).
const T = {
  heroOut: [0.01, 0.04], // el titular y la bitácora del hero se desvanecen
  morph: [0.03, 0.14], // el hero se aleja y queda como lámina
  tableIn: [0.075, 0.14], // las láminas suben a su lugar
  ink: [0.12, 0.17], // su titular se entinta
  tableOut: [0.23, 0.26], // el texto de las láminas se va
  flip: [0.23, 0.31], // la lámina del hero se da vuelta y crece a pantalla completa
  ridge: [0.3, 0.7], // la cordillera: q de 0 a 1
  wipe: [0.66, 0.76], // la transición de rombos (tapa todo en el medio)
  relic: [0.71, 1], // la reliquia: la carta gira con el scroll
}
// Dentro de la cordillera (q).
const Q = {
  textA: [0.04, 0.14, 0.36, 0.46], // entra, se queda, se va
  textB: [0.5, 0.58, 0.86, 0.95],
}
const RELIC_COUNT = 312 // el número vertical: hojas del atlas

const CARD_SHAPE = (w) => ({ top: w / 2, bottom: Math.min(14, w * 0.04) })

// Las otras dos láminas: la misma escena desde otras cámaras (coordenadas de three, y arriba).
// La primera es una imagen quieta; la segunda, un «video» (la cámara orbita sola alrededor de la torre).
const VIEWS = [
  { pos: [-0.15, 0.95, 4.4], at: [-0.6, 0.62, 1.6], fov: 34, mode: 'still' },
  { pos: [2.5, 0.05, 3.5], at: [0.3, 2.5, 0.2], fov: 46, mode: 'video' },
]

const NAV = [
  { id: 'atlas', label: 'Atlas', p: 0, leaf: '01' },
  { id: 'isles', label: 'The Isles', p: 0.195, leaf: '02' },
  { id: 'wayfarers', label: 'Wayfarers', p: 0.52, leaf: '03' },
  { id: 'relics', label: 'Relics', p: 0.86, leaf: '04' },
]
const MENU = [...NAV, { id: 'chronicle', label: 'Chronicle', p: 1, leaf: '05' }, { id: 'about', label: 'About', p: 1, leaf: '06' }]

// La palabra de la carga: cada fila de píxeles es una veta que llega desde un costado, estirada, y se
// acomoda; al plegarse, todas las filas leen la línea del medio y el nombre se vuelve el horizonte.
const WORD_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uAlpha, uForm, uFold, uTime;
float hash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
void main() {
  const float N = 30.0;
  float row = floor(vUv.y * N);
  float r = hash(row + 3.0);
  float e = clamp((uForm - r * 0.5) / 0.5, 0.0, 1.0);
  e = 1.0 - pow(1.0 - e, 3.0);
  float side = mod(row, 2.0) < 1.0 ? -1.0 : 1.0;
  float sx = vUv.x + (1.0 - e) * side * (0.3 + r * 1.1);
  float sy = mix((row + 0.5) / N, vUv.y, e);
  sy = mix(sy, 0.5, uFold);
  float a = texture2D(uMap, vec2(fract(sx), sy)).a;
  float blink = step(0.8, hash(row * 7.0 + floor(uTime * 16.0)));
  a *= 1.0 - blink * (1.0 - e);
  a *= smoothstep(0.0, 0.06, uForm - r * 0.5 + 0.06);
  gl_FragColor = vec4(uTint, a * uAlpha);
}
`

// La transición a pantalla completa: una grilla de rombos (la estrella del atlas). Los rombos crecen de
// abajo hacia arriba hasta tapar todo y después se abren desde adentro en el mismo orden, con el filo
// en ámbar. (La referencia usa letras recortadas; acá es geometría.)
const WIPE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform float uT;
uniform vec3 uTint, uEdgeC;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  const float CELL = 110.0;
  vec2 px = vUv * uSize;
  vec2 id = floor(px / CELL);
  vec2 f = fract(px / CELL) * 2.0 - 1.0;
  float d = abs(f.x) + abs(f.y); // 0 en el centro del rombo, 2 en las esquinas de la celda
  float order = id.y / max(1.0, uSize.y / CELL) * 0.55 + hash(id) * 0.15;
  float rin = clamp(uT * 2.0 * 1.7 - order, 0.0, 1.0) * 2.05;
  float rout = clamp((uT * 2.0 - 1.0) * 1.7 - order, 0.0, 1.0) * 2.05;
  if (d > rin || d < rout) discard;
  float eIn = (1.0 - smoothstep(0.0, 0.07, abs(d - rin))) * step(rin, 2.0);
  float eOut = (1.0 - smoothstep(0.0, 0.07, abs(d - rout))) * step(0.001, rout);
  gl_FragColor = vec4(mix(uTint, uEdgeC, clamp(max(eIn, eOut), 0.0, 1.0)), 1.0);
}
`

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3
const seg = (p, [a, b]) => clamp01((p - a) / (b - a))
/** Entra en [a, b], se queda, se va en [c, d]. */
const span = (q, [a, b, c, d]) => Math.min(seg(q, [a, b]), 1 - seg(q, [c, d]))
const DEG = Math.PI / 180
const SEGS = 28

export default function KanvasPage() {
  return (
    <SmoothScrollProvider>
      <Kanvas />
    </SmoothScrollProvider>
  )
}

function Kanvas() {
  const canvasRef = useRef(null)
  const spacerRef = useRef(null)
  const R = useRef({ slots: [] })
  const loadRef = useRef(null)
  const segsRef = useRef(null)
  const [stage, setStage] = useState('load') // load → word → open → done
  const [active, setActive] = useState('atlas')
  const [menu, setMenu] = useState(false)
  const audio = useMemo(() => createAudio(), [])
  const audioOn = useSubscribed(audio, false)

  useEffect(() => {
    setHoverFx(() => audio.tick())
    return () => {
      setHoverFx(null)
      audio.dispose()
    }
  }, [audio])

  useEffect(() => {
    const lenis = getLenis()
    lenis?.stop()
    window.scrollTo(0, 0)
    const k = createKanvas(canvasRef.current, { clear: WHITE })
    const { THREE } = k
    const r = R.current
    let stageNow = 'load'
    let activeNow = 'atlas'
    let themeNow = ''
    let sceneNow = 'intro'
    let segsNow = -1
    let gridNow = false
    let wipeSide = 0
    const toStage = (s) => {
      if (s === stageNow) return
      stageNow = s
      setStage(s)
    }

    // --- carga real: el GLB y las tipografías ---------------------------------------------------
    const manager = new THREE.LoadingManager()
    const boot = { prog: 0, shown: 0, loaded: false, form: 0, hold: 0, fold: 0, reveal: 0 }
    manager.onProgress = (_u, done, total) => (boot.prog = done / total)
    manager.onLoad = () => (boot.loaded = true)

    // --- la palabra de la carga, dibujada en una textura ----------------------------------------
    const wordCanvas = document.createElement('canvas')
    let wordTex = null
    const word = { h: 1, ready: false }
    const drawWord = () => {
      const { W, H } = k.size()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const g = wordCanvas.getContext('2d')
      const css = (px) => `${DISPLAY.weight} ${px}px ${DISPLAY.family}, system-ui, sans-serif`
      let fs = 200
      g.font = css(fs)
      fs = Math.min((fs * W * (W < 768 ? 0.9 : 0.8)) / g.measureText(NAME).width, H * 0.42)
      word.h = Math.round(fs * 0.95)
      wordCanvas.width = Math.min(4096, Math.round(W * dpr))
      wordCanvas.height = Math.round(word.h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, word.h)
      g.font = css(fs)
      if ('letterSpacing' in g) g.letterSpacing = `${-fs * 0.01}px`
      g.fillStyle = '#fff'
      g.textAlign = 'center'
      const cap = g.measureText('V').actualBoundingBoxAscent || fs * 0.7
      g.fillText(NAME, W / 2, word.h / 2 + cap / 2)
      // textura nueva en cada dibujo: la anterior quedó reservada con otro tamaño en la GPU
      wordTex?.dispose()
      wordTex = new THREE.CanvasTexture(wordCanvas)
      wordPlane.u.uMap.value = wordTex
      word.ready = true
    }
    manager.itemStart('fonts')
    const fontsLink = document.createElement('link')
    fontsLink.rel = 'stylesheet'
    fontsLink.href = FONTS_HREF
    let fontsDone = false
    const fontsReady = () => {
      if (fontsDone) return
      fontsDone = true
      // el número grande espera a su tipografía (si no, se ve un instante con otra)
      loadRef.current?.closest('p')?.style.setProperty('opacity', '1')
      drawWord()
      manager.itemEnd('fonts')
    }
    fontsLink.onload = () =>
      Promise.all([
        document.fonts.load(`${DISPLAY.weight} 120px ${DISPLAY.family}`),
        document.fonts.load("500 12px 'Barlow Semi Condensed'"),
        document.fonts.load("400 16px 'Barlow'"),
      ]).finally(fontsReady)
    fontsLink.onerror = fontsReady
    const fontsTimeout = setTimeout(fontsReady, 4000)
    document.head.appendChild(fontsLink)

    // --- la escena 3D del hero (la isla) ----------------------------------------------------------
    const target = () => {
      const t = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
      t.texture.colorSpace = THREE.SRGBColorSpace
      return t
    }
    const rt = target()
    const hero = new THREE.Scene()
    const sky = document.createElement('canvas')
    sky.width = 4
    sky.height = 256
    const sg = sky.getContext('2d')
    const grd = sg.createLinearGradient(0, 0, 0, 256)
    grd.addColorStop(0, '#5b4b8a')
    grd.addColorStop(0.55, '#c99bb8')
    grd.addColorStop(1, '#f6cfa8')
    sg.fillStyle = grd
    sg.fillRect(0, 0, 4, 256)
    const skyTex = new THREE.CanvasTexture(sky)
    skyTex.colorSpace = THREE.SRGBColorSpace
    hero.background = skyTex
    hero.fog = new THREE.Fog('#d9a9bd', 9, 22)
    hero.add(new THREE.HemisphereLight('#fff1e0', '#5a4a80', 1.6))
    const sun = new THREE.DirectionalLight('#ffe2c4', 2.4)
    sun.position.set(4, 6, 3)
    hero.add(sun)
    const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1)
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter
    ramp.needsUpdate = true
    let heroCam = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    let mixer = null
    let clipDur = 1
    let crystal = null
    let lookAt = null
    let content = null
    const tilt = { x: 0, y: 0 }
    const pivot = new THREE.Vector3()
    const qx = new THREE.Quaternion()
    const qy = new THREE.Quaternion()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const keepQ = new THREE.Quaternion()
    const keepP = new THREE.Vector3()
    const fitHero = () => {
      const { W, H } = k.size()
      const dpr = k.renderer.getPixelRatio()
      rt.setSize(Math.round(W * dpr), Math.round(H * dpr))
      heroCam.aspect = W / H
      heroCam.updateProjectionMatrix()
    }
    new GLTFLoader(manager).load('/proto/kanvas/isle.glb', (g) => {
      g.scene.traverse((o) => {
        if (!o.isMesh) return
        o.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp })
        const c = o.geometry.attributes.color
        if (!c?.count) return
        const [cr, cg, cb] = [c.getX(0), c.getY(0), c.getZ(0)]
        if (!crystal && cg > 0.85 && cr < 0.5) {
          crystal = o
          o.userData.baseY = o.position.y
          o.material.emissive = new THREE.Color('#2aa89a')
        }
        if (cr > 0.95 && cg > 0.75 && cb < 0.55) o.material.emissive = new THREE.Color('#ffb347')
      })
      hero.add(g.scene)
      lookAt = g.scene.getObjectByName('Camera_Target') || null
      // El contenido (todo menos la cámara y su punto de mira) va a un grupo propio: es lo que se
      // inclina con el mouse; la cámara del GLB queda afuera.
      content = new THREE.Group()
      for (const child of [...g.scene.children]) {
        if (child.isCamera || child === lookAt || child.getObjectByProperty('isCamera', true)) continue
        content.add(child)
      }
      g.scene.add(content)
      if (g.cameras[0]) heroCam = g.cameras[0]
      if (g.animations.length) {
        mixer = new THREE.AnimationMixer(g.scene)
        for (const clip of g.animations) mixer.clipAction(clip).play()
        clipDur = Math.max(...g.animations.map((c) => c.duration))
      }
      fitHero()
      views.forEach((v) => (v.stale = true))
    })
    /** Renderiza la isla sin la inclinación del mouse (las láminas quieta y «video» no la siguen). */
    const neutral = (fn) => {
      if (!content) return fn()
      keepQ.copy(content.quaternion)
      keepP.copy(content.position)
      content.quaternion.identity()
      content.position.set(0, 0, 0)
      fn()
      content.quaternion.copy(keepQ)
      content.position.copy(keepP)
    }

    const views = VIEWS.map((v) => {
      const cam = new THREE.PerspectiveCamera(v.fov, 1, 0.1, 100)
      cam.position.set(...v.pos)
      cam.lookAt(...v.at)
      const at = new THREE.Vector3(...v.at)
      const dx = v.pos[0] - v.at[0]
      const dz = v.pos[2] - v.at[2]
      return { ...v, cam, at, rad: Math.hypot(dx, dz), ang: Math.atan2(dx, dz), rt: target(), stale: true }
    })

    // --- la cordillera y el relieve del HUD ---------------------------------------------------------
    const ridge = createRidge(THREE)
    const ridgeRt = target()
    const topo = createTopo(THREE)
    const topoRt = target()
    const fitRidge = () => {
      const { W, H } = k.size()
      const dpr = k.renderer.getPixelRatio()
      ridgeRt.setSize(Math.round(W * dpr), Math.round(H * dpr))
      ridge.setSize(W, H)
    }
    fitRidge()
    const relic = createRelic(THREE)
    const relicRt = target()

    // --- los planos del canvas ----------------------------------------------------------------------
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true
    const cardPlanes = views.map((v, i) => k.plane(v.rt.texture, [16, 16], 5 + i))
    const heroPlane = k.plane(rt.texture, [16, 16], 10)
    const topoPlane = k.plane(topoRt.texture, [16, 16], 12)
    const relicPlane = k.plane(relicRt.texture, [16, 16], 14)
    const tiltCard = { x: 0, y: 0 }
    const linePlane = k.plane(white, [1, 1], 20)
    linePlane.u.uTint.value.set(INK)
    linePlane.u.uTintMix.value = 1
    const wordPlane = k.plane(white, [1, 1], 21, {
      frag: WORD_FRAG,
      uniforms: { uForm: { value: 0 }, uFold: { value: 0 }, uTime: { value: 0 } },
    })
    wordPlane.u.uTint.value.set(INK)
    const wipePlane = k.plane(white, [1, 1], 40, {
      frag: WIPE_FRAG,
      uniforms: { uT: { value: 0 }, uEdgeC: { value: new THREE.Color(AMBER) } },
    })
    wipePlane.u.uTint.value.set(INK)

    // --- el reloj ---------------------------------------------------------------------------------
    const progress = (scrollY) => {
      const max = (spacerRef.current?.offsetHeight || 1) - window.innerHeight
      return clamp01(scrollY / Math.max(1, max))
    }
    const show = (el, v, y = 0) => {
      if (!el) return
      el.style.opacity = String(v)
      el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
      el.style.transform = `translate3d(0, ${y}px, 0)`
    }
    const renderTo = (scene, cam, tgt, w, h) => {
      const dpr = k.renderer.getPixelRatio()
      const tw = Math.max(16, Math.round((w * dpr) / 8) * 8)
      const th = Math.max(16, Math.round((h * dpr) / 8) * 8)
      let resized = false
      if (tgt.width !== tw || tgt.height !== th) {
        tgt.setSize(tw, th)
        resized = true
      }
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      k.renderer.setRenderTarget(tgt)
      k.renderer.render(scene, cam)
      return resized
    }

    k.add({
      onResize: () => {
        fitHero()
        fitRidge()
        views.forEach((v) => (v.stale = true))
        if (fontsDone) drawWord()
      },
      update: ({ dt, now, W, H, scrollY, pointer }) => {
        const p = progress(scrollY)

        // 1) la carga: barra de segmentos → el nombre se forma → se pliega en el horizonte → se abre
        boot.shown += (boot.prog - boot.shown) * (1 - Math.exp(-6 * dt))
        if (loadRef.current) loadRef.current.textContent = String(Math.round(boot.shown * 100)).padStart(3, '0')
        const lit = Math.round(boot.shown * SEGS)
        if (lit !== segsNow && segsRef.current) {
          segsNow = lit
          ;[...segsRef.current.children].forEach((s, i) => (s.dataset.on = i < lit ? '1' : '0'))
        }
        if (boot.loaded && word.ready && boot.shown > 0.995 && boot.form === 0) {
          boot.form = 0.0001
          toStage('word')
        }
        if (boot.form > 0 && boot.form < 1) boot.form = Math.min(1, boot.form + dt / 1.6)
        if (boot.form >= 1 && boot.hold < 1) boot.hold = Math.min(1, boot.hold + dt / 0.8)
        if (boot.hold >= 1 && boot.fold < 1) boot.fold = Math.min(1, boot.fold + dt / 0.6)
        if (boot.fold >= 1 && boot.reveal === 0) {
          boot.reveal = 0.0001
          toStage('open')
        }
        if (boot.reveal > 0 && boot.reveal < 1) {
          boot.reveal = Math.min(1, boot.reveal + dt / 1.6)
          if (boot.reveal >= 1) toStage('done')
        }
        const rv = easeInOut(boot.reveal)
        const lw = W * 0.56
        const lx = (W - lw) / 2
        const ly = H / 2

        const fo = easeInOut(boot.fold)
        const wh = lerp(word.h, 2, fo)
        wordPlane.rect(lerp(0, lx, fo), H / 2 - wh / 2, lerp(W, lw, fo), wh)
        wordPlane.u.uForm.value = boot.form
        wordPlane.u.uFold.value = clamp01(boot.fold * 1.6)
        wordPlane.u.uTime.value = now / 1000
        wordPlane.u.uAlpha.value = boot.form > 0 ? 1 - clamp01((boot.fold - 0.8) / 0.2) : 0
        wordPlane.mesh.visible = wordPlane.mesh.visible && boot.reveal === 0
        // la raya del horizonte: solo al final del pliegue y mientras el ojo se abre
        linePlane.rect(lx, ly - 1, lw, 2)
        linePlane.u.uAlpha.value = boot.reveal > 0 ? 1 - clamp01(rv * 6) : boot.fold > 0 ? clamp01((boot.fold - 0.55) / 0.35) : 0

        // 2) el hero: del horizonte a pantalla completa → a su lámina → se da vuelta → la cordillera
        const m = rv >= 1 ? easeInOut(seg(p, T.morph)) : 0
        const f = rv >= 1 ? easeInOut(seg(p, T.flip)) : 0
        const back = f >= 0.5 // ya se ve el otro lado de la lámina
        const dest = r.dest?.getBoundingClientRect()
        const ro = easeInOut(clamp01(boot.reveal / 0.7))
        const rw = easeInOut(clamp01((boot.reveal - 0.3) / 0.7))
        let rect = { x: lerp(lx, 0, rw), y: lerp(ly - 1, 0, ro), w: lerp(lw, W, rw), h: lerp(2, H, ro) }
        let rot = 0
        const destRot = Number(r.dest?.dataset.rot || 0) * DEG
        if (dest && m > 0) {
          rect = { x: lerp(0, dest.left, m), y: lerp(0, dest.top, m), w: lerp(W, dest.width, m), h: lerp(H, dest.height, m) }
          rot = destRot * m
        }
        if (dest && f > 0) {
          // el giro: el ancho se cierra con el coseno y del otro lado ya es la cordillera, que crece
          const g = easeInOut(clamp01((f - 0.15) / 0.85))
          const full = { x: lerp(dest.left, 0, g), y: lerp(dest.top, 0, g), w: lerp(dest.width, W, g), h: lerp(dest.height, H, g) }
          const cx = full.x + full.w / 2
          const fw = full.w * Math.max(0.002, Math.abs(Math.cos(f * Math.PI)))
          rect = { x: cx - fw / 2, y: full.y, w: fw, h: full.h }
          rot = destRot * (1 - g)
        }
        heroPlane.rect(rect.x, rect.y, rect.w, rect.h, rot)
        heroPlane.u.uMap.value = back ? ridgeRt.texture : rt.texture
        heroPlane.u.uMapSize.value.set(back ? ridgeRt.width : rt.width, back ? ridgeRt.height : rt.height)
        heroPlane.u.uTint.value.set(INK)
        heroPlane.u.uTintMix.value = Math.sin(f * Math.PI) * 0.45 // de canto se oscurece
        // la ventana del HUD: lo que sube más allá de la barra se corta en su línea
        const fr = W < 768 ? { pad: 12, bar: 52 } : { pad: 20, bar: 56 }
        const win = { x: fr.pad, y: fr.pad + fr.bar, w: W - fr.pad * 2, h: H - fr.pad * 2 - fr.bar }
        const wm = m * (1 - easeInOut(clamp01((f - 0.4) / 0.6)))
        heroPlane.clip(lerp(0, win.x, wm), lerp(0, win.y, wm), lerp(W, win.w, wm), lerp(H, win.h, wm))
        if (m > 0) {
          const sh = CARD_SHAPE(rect.w / Math.max(0.002, Math.abs(Math.cos(f * Math.PI))))
          const sq = 1 - easeInOut(clamp01((f - 0.3) / 0.7))
          heroPlane.shape({ top: Math.min(sh.top * m * sq, rect.w / 2), bottom: sh.bottom * m * sq })
        } else {
          const lens = (rect.h / 2) * (1 - rv)
          heroPlane.shape({ top: lens, bottom: lens })
        }
        heroPlane.u.uAlpha.value = boot.reveal > 0 ? 1 : 0

        // la isla: la cámara del GLB avanza con el progreso y todo se inclina hacia el mouse
        if (mixer) mixer.setTime(Math.min(clipDur - 0.001, clamp01(p / T.morph[1]) * clipDur))
        const kt = 1 - Math.exp(-2.6 * dt)
        tilt.x += (pointer.x - tilt.x) * kt
        tilt.y += (pointer.y - tilt.y) * kt
        heroCam.updateMatrixWorld()
        right.setFromMatrixColumn(heroCam.matrixWorld, 0).normalize()
        up.setFromMatrixColumn(heroCam.matrixWorld, 1).normalize()
        if (content) {
          if (lookAt) lookAt.getWorldPosition(pivot)
          else heroCam.getWorldDirection(pivot).multiplyScalar(4).add(heroCam.position)
          qy.setFromAxisAngle(up, tilt.x * 0.32)
          qx.setFromAxisAngle(right, tilt.y * 0.2)
          content.quaternion.copy(qy).multiply(qx)
          content.position.copy(pivot).sub(pivot.clone().applyQuaternion(content.quaternion))
        }
        if (crystal) crystal.position.y = crystal.userData.baseY + Math.sin(now * 0.0015) * 0.06
        if (boot.reveal > 0 && !back) {
          k.renderer.setRenderTarget(rt)
          k.renderer.render(hero, heroCam)
        }

        // la cordillera: q recorre la cámara; se dibuja solo cuando se ve. Pasada la mitad de la
        // transición (todo tapado), queda atrás: debajo ya está la sección de la reliquia.
        const q = seg(p, T.ridge)
        const past = p >= (T.wipe[0] + T.wipe[1]) / 2
        if (past) heroPlane.u.uAlpha.value = 0
        if (f > 0.45 && !past) {
          ridge.update({ q, now, dt, pointer })
          k.renderer.setRenderTarget(ridgeRt)
          k.renderer.render(ridge.scene, ridge.camera)
        }

        k.clearColor.set(rv >= 1 ? CREAM : WHITE)

        // 3) la capa UI: el HUD y las secciones apiladas
        const out = easeOut(seg(p, T.heroOut))
        const inn = clamp01((rv - 0.82) / 0.18)
        show(r.frame, inn)
        const theme = (m > 0.5 && !back) || past ? 'light' : 'dark'
        if (r.frame && theme !== themeNow) {
          themeNow = theme
          r.frame.dataset.theme = theme
        }
        show(r.heroUi, inn * (1 - out), (1 - inn) * 24 - out * 40)
        if (r.heroTitle) r.heroTitle.style.filter = out > 0.01 && out < 0.99 ? `blur(${out * 10}px)` : 'none'
        if (r.scrollHint) r.scrollHint.style.opacity = String(inn * (1 - clamp01(p * 60)))
        const tin = easeOut(seg(p, T.tableIn))
        const tout = easeInOut(seg(p, T.tableOut))
        // en el teléfono las láminas no entran en una pantalla: la sección sube con el scroll
        const drift = W < 768 && p > T.tableIn[1] ? (p - T.tableIn[1]) * H * 4.2 : 0
        show(r.tableUi, tin > 0 ? 1 - tout : 0, (1 - tin) * H * 0.6 - drift - tout * 30)
        if (r.ink) {
          const t = seg(p, T.ink)
          r.ink.style.color = `rgb(${Math.round(lerp(205, 21, t))},${Math.round(lerp(205, 17, t))},${Math.round(lerp(205, 29, t))})`
          r.ink.style.opacity = String(clamp01((m - 0.3) / 0.3))
        }

        // la cordillera: dos textos grandes que flotan, la grilla del HUD y la pantalla del relieve
        const vis = f >= 1 && !past ? 1 : 0
        const wipeT = seg(p, T.wipe)
        const hidden = wipeT > 0.04 && wipeT < 0.96 ? 0 : 1
        const a = span(q, Q.textA) * vis * hidden
        show(r.ridgeA, a, lerp(H * 0.22, -H * 0.18, seg(q, [Q.textA[0], Q.textA[3]])))
        const b = span(q, Q.textB) * vis * hidden
        show(r.ridgeB, b, lerp(H * 0.12, -H * 0.06, seg(q, [Q.textB[0], Q.textB[3]])))
        const grid = b > 0.5
        if (grid !== gridNow && r.grid) {
          gridNow = grid
          r.grid.dataset.on = grid ? '1' : '0'
        }

        // la pantalla del relieve (el «video» chico del HUD) sobre su slot
        const ts = r.topo?.getBoundingClientRect()
        if (ts && b > 0.01) {
          topo.update(now)
          renderTo(topo.scene, topo.camera, topoRt, ts.width, ts.height)
          topoPlane.rect(ts.left, ts.top, ts.width, ts.height)
          topoPlane.u.uMapSize.value.set(topoRt.width, topoRt.height)
          topoPlane.u.uAlpha.value = b
        } else topoPlane.rect(0, 0, 0, 0)

        // la transición de rombos: tapa toda la pantalla y debajo cambia la sección
        wipePlane.rect(0, 0, wipeT > 0 && wipeT < 1 ? W : 0, H)
        wipePlane.u.uT.value = wipeT
        const side = past ? 1 : -1
        if (wipeT > 0 && wipeT < 1 && side !== wipeSide) {
          wipeSide = side
          audio.sweep()
        } else if (wipeT === 0 || wipeT === 1) wipeSide = 0

        // la reliquia: la carta del centro gira con el scroll (y un poco con el mouse); el farol gira
        // adentro, con su llama y sus chispas
        const rp = seg(p, T.relic)
        const relicOn = past ? 1 : 0
        const relicV = past ? clamp01((wipeT - 0.65) / 0.35) : 0 // el texto llega cuando los rombos se abren
        show(r.relicUi, relicV, (1 - relicV) * 24)
        if (r.relicStats) r.relicStats.dataset.on = rp > 0.12 ? '1' : '0'
        if (r.relicNum) r.relicNum.textContent = String(Math.round(RELIC_COUNT * easeOut(clamp01(rp * 4)))).padStart(3, '0')
        const ks = r.relicSlot?.getBoundingClientRect()
        if (ks && relicOn) {
          const kc = 1 - Math.exp(-3 * dt)
          tiltCard.x += (pointer.x - tiltCard.x) * kc
          tiltCard.y += (pointer.y - tiltCard.y) * kc
          const turn = lerp(-0.85, 0.85, easeInOut(rp)) + tiltCard.x * 0.22
          relic.update({ now, turn: -turn * 0.6 })
          renderTo(relic.scene, relic.camera, relicRt, ks.width, ks.height)
          relicPlane.rect(ks.left, ks.top, ks.width, ks.height, -2.5 * DEG)
          relicPlane.shape(CARD_SHAPE(ks.width))
          relicPlane.u.uTurn.value.set(turn, -tiltCard.y * 0.18)
          relicPlane.u.uMapSize.value.set(relicRt.width, relicRt.height)
          relicPlane.u.uAlpha.value = 1
          if (r.relicDeg) r.relicDeg.textContent = String(Math.round(((turn / DEG) % 360) + 360) % 360).padStart(3, '0')
        } else relicPlane.rect(0, 0, 0, 0)

        // el altímetro y la barra de progreso del HUD
        if (r.meterMark) r.meterMark.style.transform = `translate3d(0, ${(p * (r.meter?.offsetHeight || 0)).toFixed(1)}px, 0)`
        if (r.meterNum) r.meterNum.textContent = String(Math.round(4800 - p * 4800)).padStart(4, '0')
        if (r.progBar) r.progBar.style.transform = `scaleX(${p.toFixed(4)})`
        if (r.progNum) r.progNum.textContent = String(Math.round(p * 100)).padStart(3, '0')
        const act = p < 0.07 ? 'atlas' : p < 0.29 ? 'isles' : !past ? 'wayfarers' : 'relics'
        if (act !== activeNow) {
          activeNow = act
          setActive(act)
        }
        const sc = rv < 1 ? 'intro' : p < 0.07 ? 'hero' : p < 0.29 ? 'tableau' : !past ? 'ridge' : 'relic'
        if (sc !== sceneNow) {
          sceneNow = sc
          audio.scene(sc)
        }

        // 4) las otras dos láminas: quietas sobre su slot. Una es una imagen; la otra, un «video».
        r.slots.forEach((el, i) => {
          const pl = cardPlanes[i]
          const v = views[i]
          if (!el || !pl) return
          const bx = el.getBoundingClientRect()
          const alpha = tin * (1 - easeInOut(clamp01(f * 2.5)))
          pl.rect(bx.left, bx.top, bx.width, bx.height, Number(el.dataset.rot || 0) * DEG)
          pl.shape(CARD_SHAPE(bx.width))
          pl.clip(win.x, win.y, win.w, win.h)
          pl.u.uAlpha.value = alpha
          if (alpha < 0.001 || !pl.mesh.visible) return
          if (v.mode === 'video') {
            const ang = v.ang + Math.sin(now * 0.00022) * 0.55
            v.cam.position.set(v.at.x + Math.sin(ang) * v.rad, v.pos[1] + Math.sin(now * 0.0003) * 0.15, v.at.z + Math.cos(ang) * v.rad)
            v.cam.lookAt(v.at)
          }
          if (v.mode === 'video' || v.stale) {
            neutral(() => {
              if (renderTo(hero, v.cam, v.rt, bx.width, bx.height)) renderTo(hero, v.cam, v.rt, bx.width, bx.height)
            })
            v.stale = !content
          }
          pl.u.uMapSize.value.set(v.rt.width, v.rt.height)
        })
      },
    })

    return () => {
      clearTimeout(fontsTimeout)
      fontsLink.remove()
      k.dispose()
      ;[rt, ridgeRt, topoRt, relicRt, ...views.map((v) => v.rt)].forEach((t) => t.dispose())
      ridge.dispose()
      relic.dispose()
      topo.dispose()
      wordTex?.dispose()
      lenis?.start()
    }
  }, [audio])

  // El scroll se libera cuando el hero terminó de abrirse.
  useEffect(() => {
    if (stage !== 'done' || menu) return undefined
    getLenis()?.start()
    return () => getLenis()?.stop()
  }, [stage, menu])

  const go = useCallback((it) => {
    setMenu(false)
    const lenis = getLenis()
    const max = (spacerRef.current?.offsetHeight || 1) - window.innerHeight
    setTimeout(() => lenis?.scrollTo(it.p * max, { duration: 2.2 }), 380)
  }, [])
  const openMenu = () => {
    audio.drawer(true)
    setMenu(true)
  }
  const closeMenu = useCallback(() => {
    audio.drawer(false)
    setMenu(false)
  }, [audio])

  const set = (key) => (el) => (R.current[key] = el)
  const display = { fontFamily: DISPLAY.family, fontWeight: DISPLAY.weight, letterSpacing: DISPLAY.tracking }
  const layer = 'fixed inset-0 h-svh w-full'
  const inset = 'calc(var(--pad) + 28px)'
  const tag = 'flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase'
  const dot = <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />

  return (
    <div className="kv" style={{ color: INK, fontFamily: BODY }}>
      <style>{KANVAS_CSS}</style>
      <div ref={spacerRef} aria-hidden="true" style={{ height: `${SCROLL_SCREENS * 100}svh` }} />

      {/* Capa 1: el canvas. */}
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none z-0 ${layer}`} />

      {/* Capa 2: la UI, con las secciones apiladas. */}
      <div className={`pointer-events-none z-10 ${layer}`}>
        {/* carga: el número grande y la barra de segmentos (no una línea) */}
        <div
          className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center"
          style={{ opacity: stage === 'load' ? 1 : 0, transition: 'opacity .35s', visibility: stage === 'load' ? 'visible' : 'hidden' }}
        >
          <p className="flex items-start leading-[0.8]" style={{ ...display, fontSize: 'clamp(4.5rem, 14vw, 9rem)', opacity: 0, transition: 'opacity .3s' }}>
            <span ref={loadRef} className="tabular-nums">
              000
            </span>
            <span className="mt-2 ml-1 text-[0.25em]">%</span>
          </p>
          <div ref={segsRef} className="kv-segs mt-5 flex w-[min(78vw,420px)] gap-[4px]" aria-hidden="true">
            {Array.from({ length: SEGS }, (_, i) => (
              <i key={i} data-on="0" />
            ))}
          </div>
          <p className="mt-4 flex w-[min(78vw,420px)] justify-between text-[11px] tracking-[0.18em] uppercase opacity-70" style={{ fontFamily: LABEL }}>
            <span>Charting the horizon</span>
            <span>Leaf 00 / 06</span>
          </p>
        </div>
        <div
          className="absolute inset-x-0 bottom-[10svh] flex flex-col items-center gap-3"
          style={{ opacity: stage === 'load' || stage === 'word' ? 1 : 0, transition: 'opacity .5s', visibility: stage === 'done' ? 'hidden' : 'visible' }}
        >
          <button
            type="button"
            onClick={() => audio.set(!audioOn)}
            aria-label={audioOn ? 'Sound off' : 'Sound on'}
            className="pointer-events-auto relative flex h-16 w-16 cursor-pointer items-center justify-center"
          >
            <svg viewBox="0 0 64 64" className="kv-ring absolute inset-0" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="32" cy="32" r="31" strokeDasharray="40 8 6 8" />
            </svg>
            <AudioWave on={audioOn} icon />
          </button>
          <span className="text-[11px] tracking-[0.16em] uppercase opacity-60" style={{ fontFamily: LABEL }}>
            {audioOn ? 'Sound on' : 'Tap for sound'}
          </span>
        </div>

        {/* Sección: hero. El titular enorme arriba; la bitácora abajo a la derecha. */}
        <section ref={set('heroUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute" style={{ left: inset, right: inset, top: 'calc(var(--pad) + var(--bar) + 2svh)' }}>
            <p className={`mb-2 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              Leaf 01 // The outer isles
            </p>
            <h1 ref={set('heroTitle')} className="uppercase" style={{ ...display, fontSize: 'min(27svh, 25vw)', lineHeight: 0.84, textShadow: '0 4px 60px rgba(30,16,60,.3)' }}>
              <span className="block">Beyond</span>
              <span className="block">the last</span>
              <span className="block">
                map<span style={{ color: AMBER }}>.</span>
              </span>
            </h1>
          </div>
          <div
            className="absolute right-[calc(var(--pad)+16px)] w-[min(34ch,calc(100vw-var(--pad)*2-32px))] md:right-[calc(var(--pad)+44px)] md:w-[36ch]"
            style={{ bottom: 'calc(var(--pad) + 52px)', textShadow: '0 1px 16px rgba(30,16,60,.4)' }}
          >
            <p className="flex items-center gap-3 border-t border-white/40 pt-3 text-[11px] tracking-[0.16em] uppercase" style={{ fontFamily: LABEL }}>
              <span style={{ color: AMBER }}>Log 01</span>
              <span className="opacity-70">44°12′N · 12°06′E</span>
            </p>
            <p className="mt-3 text-[16px] leading-[1.4] md:text-[17px]">
              Vesper is an illustrated world told one leaf at a time — three wayfarers, the last lanterns, and a map that keeps redrawing itself.
            </p>
            <RollLink text="Begin the crossing" onClick={() => go(NAV[1])} className="mt-4 text-[12px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL, '--rl-to': AMBER }}>
              <span className="mr-2" style={{ color: AMBER }}>
                ▸
              </span>
            </RollLink>
          </div>
          <div ref={set('scrollHint')} className="absolute left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] tracking-[0.16em] uppercase md:flex" style={{ bottom: 'calc(var(--pad) + 18px)', fontFamily: LABEL }}>
            Scroll
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1.5l5 5 5-5" />
            </svg>
          </div>
        </section>

        {/* Sección: las tres láminas, con el titular grande. La ventana del HUD la recorta. */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(calc(var(--pad) + var(--bar)) var(--pad) var(--pad) var(--pad))' }}>
          <section
            ref={set('tableUi')}
            className="absolute inset-0"
            style={{ opacity: 0, visibility: 'hidden', paddingLeft: inset, paddingRight: 'calc(var(--pad) + 48px)', paddingTop: 'calc(var(--pad) + var(--bar) + 4svh)' }}
          >
            <div className="relative">
              <p className={`absolute top-[0.6em] left-0 ${tag}`} style={{ fontFamily: LABEL }}>
                {dot}
                002
              </p>
              <h2
                ref={set('ink')}
                className="uppercase"
                style={{ ...display, fontSize: 'min(10.5svh, 7.4vw)', lineHeight: 0.88, color: 'rgb(205,205,205)', textIndent: 'min(16vw, 220px)' }}
              >
                Every map was drawn by someone who left.
              </h2>
            </div>
            <div className="mt-[5svh] grid gap-10 md:grid-cols-12 md:gap-8">
              <figure className="md:col-span-3 md:mt-[9svh]">
                <div ref={(el) => (R.current.slots[0] = el)} data-rot="3" className="aspect-[4/5] w-full" />
                <figcaption className={`mt-5 ${tag}`} style={{ fontFamily: LABEL }}>
                  01 // The wayfarers
                </figcaption>
                <p className="mt-2 max-w-[28ch] text-[16px] leading-snug">Three cloaks, three lanterns, one road nobody has finished.</p>
              </figure>
              <figure className="md:col-span-3 md:col-start-5">
                <div ref={(el) => (R.current.slots[1] = el)} data-rot="-2" className="aspect-[3/4] w-full" />
                <figcaption className={`mt-5 ${tag}`} style={{ fontFamily: LABEL }}>
                  <span className="inline-block h-[6px] w-[6px] animate-pulse rounded-full" style={{ background: '#e5484d' }} />
                  02 // The lantern tower — live
                </figcaption>
              </figure>
              <figure className="md:col-span-4 md:col-start-9 md:mt-[3svh]">
                <div ref={set('dest')} data-rot="-5" className="aspect-[3/4] w-full" />
                <figcaption className={`mt-5 ${tag}`} style={{ fontFamily: LABEL }}>
                  03 // The outer isle
                </figcaption>
              </figure>
            </div>
          </section>
        </div>

        {/* Sección: la cordillera (del otro lado de la lámina). Textos grandes que flotan. */}
        <section ref={set('ridgeA')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute" style={{ left: inset, right: 'calc(var(--pad) + 60px)', top: '30svh' }}>
            <p className={`mb-3 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              003
            </p>
            <p className="max-w-[16ch] uppercase" style={{ ...display, fontSize: 'min(11svh, 8.4vw)', lineHeight: 0.88, textIndent: 'min(10vw, 140px)', textShadow: '0 4px 50px rgba(60,30,60,.35)' }}>
              You are a wayfarer: a keeper of the last light in a world that forgot it.
            </p>
          </div>
        </section>
        <section ref={set('ridgeB')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute left-[calc(var(--pad)+28px)] right-[calc(var(--pad)+28px)] md:left-[34%] md:right-[30%]" style={{ top: '24svh' }}>
            <p className={`mb-3 ${tag}`} style={{ fontFamily: LABEL }}>
              {dot}
              004
            </p>
            <p className="uppercase" style={{ ...display, fontSize: 'clamp(30px, 5.6vw, 8.4svh)', lineHeight: 0.9, textIndent: 'min(6vw, 90px)', textShadow: '0 4px 40px rgba(40,20,50,.35)' }}>
              What will you carry? The lantern or the map? To light the way — or to hide it?
            </p>
          </div>
          <div className="absolute hidden md:block" style={{ left: '73%', top: '24svh' }}>
            <div ref={set('topo')} className="h-[150px] w-[150px] lg:h-[180px] lg:w-[180px]" />
            <p className="mt-3 text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              N 44°12′37″
              <br />E 12°06′51″
            </p>
            <p className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              <span className="relative inline-block h-[5px] w-10 bg-white/25">
                <span className="absolute inset-y-0 left-0 w-[60%] bg-white" />
              </span>
              Wind 12 kn
            </p>
          </div>
          <p className={`absolute hidden md:flex ${tag}`} style={{ left: '34%', top: 'calc(80svh + 14px)', fontFamily: LABEL }}>
            {dot}
            Wayfarer sigil
          </p>
        </section>
        {/* Sección: la reliquia. A la izquierda, su ficha (como el inventario de un juego); al
            centro, la carta que gira con el scroll; a la derecha, el número vertical gigante. */}
        <section ref={set('relicUi')} className="absolute inset-0" style={{ opacity: 0, visibility: 'hidden' }}>
          <div ref={set('relicStats')} data-on="0" className="kv-stats absolute hidden md:block" style={{ left: inset, top: 'calc(var(--pad) + var(--bar) + 5svh)', width: 'min(25vw, 330px)' }}>
            <p className={tag} style={{ fontFamily: LABEL }}>
              {dot}
              005 // Relic
            </p>
            <h2 className="mt-3 uppercase" style={{ ...display, fontSize: 'min(8svh, 4.6vw)', lineHeight: 0.88 }}>
              The last
              <br />
              lantern
            </h2>
            <p className="mt-3 text-[15px] leading-snug opacity-80">Lit once, carried by three. It burns as long as someone still remembers the road.</p>
            <dl className="mt-6 text-[12px] tracking-[0.12em] uppercase" style={{ fontFamily: LABEL }}>
              <div className="kv-row">
                <dt>Lumen</dt>
                <dd className="kv-bar" style={{ '--v': 0.87 }}>
                  <i />
                </dd>
                <dd>87</dd>
              </div>
              <div className="kv-row">
                <dt>Oil</dt>
                <dd className="kv-pips">
                  {Array.from({ length: 7 }, (_, i) => (
                    <i key={i} data-full={i < 3 ? '1' : '0'} style={{ '--d': `${i * 60}ms` }} />
                  ))}
                </dd>
                <dd>3/7</dd>
              </div>
              <div className="kv-row">
                <dt>Range</dt>
                <dd className="col-span-2 text-right">1.2 leagues</dd>
              </div>
              <div className="kv-row">
                <dt>Keeper</dt>
                <dd className="col-span-2 text-right">Aurel Vane</dd>
              </div>
              <div className="kv-row">
                <dt>Forged</dt>
                <dd className="col-span-2 text-right">Drowned coast, yr 0</dd>
              </div>
            </dl>
          </div>
          {/* el dial: cuánto giró la carta */}
          <div className="absolute hidden items-center gap-3 md:flex" style={{ left: inset, bottom: 'calc(var(--pad) + 52px)' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="22" cy="22" r="20" strokeOpacity="0.3" />
              <circle cx="22" cy="22" r="20" strokeDasharray="2 5.2" />
              <path d="M22 6v8M22 30v8M6 22h8M30 22h8" stroke={AMBER} strokeWidth="1.5" />
            </svg>
            <p className="text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ fontFamily: LABEL }}>
              Turn <span ref={set('relicDeg')} className="tabular-nums">000</span>°
              <br />
              <span className="opacity-60">Scroll to turn the relic</span>
            </p>
          </div>
          <div ref={set('relicSlot')} className="absolute top-1/2 left-1/2 aspect-[4/5] w-[min(64vw,44svh)] -translate-x-1/2 -translate-y-[44%] md:w-[min(30vw,54svh)]" />
          <div className="absolute inset-x-0 bottom-[calc(var(--pad)+52px)] text-center md:hidden">
            <p className="uppercase" style={{ ...display, fontSize: '34px', lineHeight: 0.9 }}>
              The last lantern
            </p>
          </div>
          <div className="absolute inset-y-0 hidden items-center gap-3 md:flex" style={{ right: 'calc(var(--pad) + 44px)' }}>
            <p className="text-[11px] tracking-[0.16em] uppercase opacity-70" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Leaves in the atlas ▸
            </p>
            <p ref={set('relicNum')} className="leading-[0.78] tabular-nums" style={{ ...display, fontSize: 'min(34svh, 19vw)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {RELIC_COUNT}
            </p>
          </div>
        </section>
      </div>

      {/* Capa 3: el HUD. Esquinas de mira, la barra de arriba, el altímetro, el rótulo vertical y la
          grilla que aparece en la cordillera. */}
      <div ref={set('frame')} data-theme="dark" className="kv-frame pointer-events-none fixed inset-0 z-20" style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="absolute" style={{ inset: 'var(--pad)' }}>
          <span className="kv-corner top-0 left-0" style={{ borderTopWidth: 1.5, borderLeftWidth: 1.5 }} />
          <span className="kv-corner top-0 right-0" style={{ borderTopWidth: 1.5, borderRightWidth: 1.5 }} />
          <span className="kv-corner bottom-0 left-0" style={{ borderBottomWidth: 1.5, borderLeftWidth: 1.5 }} />
          <span className="kv-corner right-0 bottom-0" style={{ borderBottomWidth: 1.5, borderRightWidth: 1.5 }} />

          {/* la barra de progreso del scroll, en el borde de abajo, entre las esquinas */}
          <div className="absolute right-10 bottom-0 left-10 h-px" style={{ background: 'var(--dim)' }} aria-hidden="true">
            <span ref={set('progBar')} className="absolute inset-0 origin-left" style={{ background: 'var(--accent)', transform: 'scaleX(0)' }} />
          </div>
          <p className="absolute right-12 bottom-2 hidden text-[11px] tracking-[0.14em] tabular-nums md:block" style={{ fontFamily: LABEL }}>
            <span ref={set('progNum')}>000</span>%
          </p>

          <div ref={set('grid')} data-on="0" className="kv-grid absolute inset-0 hidden md:block" aria-hidden="true">
            <i className="h" style={{ top: 'calc(24svh - var(--pad) - 24px)' }} />
            <i className="h" style={{ top: 'calc(80svh - var(--pad))' }} />
            <i className="v" style={{ left: 'calc(34% - 30px)' }} />
            <i className="v" style={{ left: 'calc(73% - 30px)' }} />
          </div>

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 md:px-4" style={{ height: 'var(--bar)' }}>
            <span className="absolute right-8 bottom-0 left-8 h-px" style={{ background: 'var(--dim)' }} aria-hidden="true" />
            <div className="flex items-center gap-3">
              <button type="button" onClick={openMenu} aria-label="Open menu" className="pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center">
                <Burger />
              </button>
              <span className="hidden uppercase md:inline" style={{ ...display, fontSize: '26px', letterSpacing: '0.08em' }}>
                {NAME}
              </span>
            </div>
            <span className="absolute left-1/2 -translate-x-1/2 uppercase md:hidden" style={{ ...display, fontSize: '23px', letterSpacing: '0.08em' }}>
              {NAME}
            </span>
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[12px] tracking-[0.1em] uppercase md:flex" style={{ fontFamily: LABEL }} aria-label="Sections">
              {NAV.map((it) => (
                <RollLink key={it.id} text={it.label} active={it.id === active} onClick={() => go(it)} />
              ))}
            </nav>
            <AudioWave on={audioOn} onClick={() => audio.toggle()} className="md:hidden" />
            <button
              type="button"
              onClick={() => go(NAV[3])}
              className="kv-chamfer pointer-events-auto hidden h-9 cursor-pointer items-center gap-2 px-5 text-[12px] tracking-[0.12em] uppercase md:flex"
              style={{ fontFamily: LABEL, background: 'var(--fg)', color: 'var(--fg-inv)', transition: 'background .5s, color .5s' }}
            >
              <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
              Get the atlas
            </button>
          </div>

          <div className="absolute inset-y-0 left-0 hidden w-7 items-center justify-center md:flex">
            <p className="text-[11px] tracking-[0.2em] whitespace-nowrap uppercase opacity-70" style={{ fontFamily: LABEL, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Vesper atlas — leaves 01/06
            </p>
          </div>

          <div ref={set('meter')} className="kv-ruler absolute right-2 hidden w-[10px] md:block" style={{ top: 'calc(var(--bar) + 24px)', bottom: 56 }}>
            <div ref={set('meterMark')} className="absolute top-0 right-0 flex -translate-y-1/2 items-center gap-2" style={{ willChange: 'transform' }}>
              <span className="text-[11px] tracking-[0.1em] tabular-nums" style={{ fontFamily: LABEL }}>
                ALT <span ref={set('meterNum')}>4800</span>
              </span>
              <svg width="8" height="10" viewBox="0 0 8 10" style={{ color: 'var(--accent)' }}>
                <path d="M0 0l8 5-8 5z" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div className="absolute bottom-1 left-2 hidden md:block">
            <AudioWave on={audioOn} onClick={() => audio.toggle()} label />
          </div>
        </div>
      </div>

      <Menu open={menu} onClose={closeMenu} items={MENU} active={active} onGo={go} footer={<MenuFooter onGo={go} audioOn={audioOn} onAudio={() => audio.toggle()} />} />
    </div>
  )
}

function Burger() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1 1h22M1 6h14M1 11h22" />
    </svg>
  )
}

function MenuFooter({ onGo, audioOn, onAudio }) {
  const row = 'flex items-center gap-6 border-t border-white/15 px-6 py-4 md:px-10'
  const lab = 'hidden w-24 shrink-0 text-[11px] tracking-[0.14em] uppercase opacity-60 md:block'
  const link = 'text-[13px] tracking-[0.1em] uppercase'
  const style = { fontFamily: LABEL, '--rl-to': AMBER }
  const end = { id: 'chronicle', p: 1 }
  return (
    <div style={{ fontFamily: LABEL }}>
      <div className={row}>
        <p className={lab}>Follow</p>
        <div className="flex flex-wrap items-center gap-6">
          <RollLink text="Instagram" onClick={() => onGo(end)} className={link} style={style} />
          <RollLink text="Discord" onClick={() => onGo(end)} className={link} style={style} />
          <RollLink text="The Chronicle" onClick={() => onGo(end)} className={link} style={style} />
        </div>
      </div>
      <div className={`${row} justify-between text-[11px] tracking-[0.12em] uppercase`}>
        <AudioWave on={audioOn} onClick={onAudio} label />
        <span className="opacity-50">© 2026 Vesper Atlas</span>
      </div>
    </div>
  )
}
