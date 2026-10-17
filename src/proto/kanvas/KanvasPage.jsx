import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { getLenis } from '../../hooks/useLenis'
import { createKanvas, lerp, clamp01 } from './engine'
import { createAudio } from './audio'
import { AMBER, AudioWave, BODY, FONTS, FONTS_HREF, KANVAS_CSS, Menu, MONO, RollLink, useSubscribed } from './ui'

/**
 * Kanvas — prototipo (solo local) con la arquitectura de la referencia y una identidad propia: VESPER,
 * un atlas ilustrado.
 *
 *   · Un RELOJ único: el scroll (Lenis) produce un progreso 0 → 1. No hay secciones en el flujo de la
 *     página: un espaciador da el largo del scroll y nada más.
 *   · Una capa CANVAS fija (todo lo que es imagen o 3D) y una capa UI fija encima, con las secciones
 *     APILADAS: el progreso decide cuál se ve.
 *   · La carga: la línea de progreso estalla en vetas que se juntan en el nombre; el nombre se pliega
 *     en la línea del horizonte y el horizonte se abre como un ojo sobre la escena.
 *   · El hero es una ESCENA 3D (GLB hecho en Blender, con su cámara animada adentro) que se aleja y
 *     queda como una lámina inclinada, una de las tres de la sección siguiente. Las otras dos son la
 *     misma escena vista por otras cámaras: nada de fotos.
 *
 * El arte es provisorio (formas simples en Blender) hasta tener los modelos pintados.
 */

const NAME = 'VESPER'
const CREAM = '#ede8df'
const WHITE = '#ffffff'
const INK = '#15111d'
const SCROLL_SCREENS = 6

// El guion, en progreso (0 → 1).
const T = {
  heroOut: [0.06, 0.16], // el titular y el párrafo del hero se desvanecen
  morph: [0.14, 0.46], // el hero se aleja y queda como lámina
  tableIn: [0.28, 0.46], // la sección siguiente sube a su lugar
  ink: [0.4, 0.56], // su titular se entinta
}

// Las láminas del atlas: arco arriba, esquinas de abajo apenas redondeadas.
const CARD_SHAPE = (w) => ({ top: w / 2, bottom: Math.min(14, w * 0.04) })

// Las otras dos láminas: la misma escena desde otras cámaras (coordenadas de three, y arriba).
const VIEWS = [
  { pos: [-0.15, 0.95, 4.4], at: [-0.6, 0.62, 1.6], fov: 34 }, // los tres viajeros
  { pos: [2.5, 0.05, 3.5], at: [0.3, 2.5, 0.2], fov: 46 }, // la torre y el cristal, desde abajo
]

const NAV = [
  { id: 'atlas', label: 'Atlas', p: 0, leaf: '01' },
  { id: 'isles', label: 'The Isles', p: 0.62, leaf: '02' },
  { id: 'wayfarers', label: 'Wayfarers', p: 0.62, leaf: '03' },
  { id: 'chronicle', label: 'Chronicle', p: 1, leaf: '04' },
]
const MENU = [
  { id: 'atlas', label: 'Atlas', p: 0, leaf: '01' },
  { id: 'isles', label: 'The Isles', p: 0.62, leaf: '02' },
  { id: 'wayfarers', label: 'Wayfarers', p: 0.62, leaf: '03' },
  { id: 'chronicle', label: 'Chronicle', p: 1, leaf: '04' },
  { id: 'gallery', label: 'Gallery', p: 1, leaf: '05' },
  { id: 'about', label: 'About', p: 1, leaf: '06' },
]

// La palabra de la carga: cada fila de píxeles es una veta que llega desde un costado, estirada
// (lee una sola línea del glifo) y se acomoda en su lugar. Mientras llega, se repite (las copias que
// barren la pantalla) y parpadea. Al plegarse, todas las filas leen la línea del medio: el nombre se
// vuelve una raya, que es el horizonte que después se abre.
const WORD_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uAlpha;
uniform float uForm;
uniform float uFold;
uniform float uTime;
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

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3
const seg = (p, [a, b]) => clamp01((p - a) / (b - a))
const DEG = Math.PI / 180

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
  const [stage, setStage] = useState('load') // load → word → open → done
  const [active, setActive] = useState('atlas')
  const [menu, setMenu] = useState(false)
  // la tipografía de titulares, para comparar: ?font=tektur | unbounded | oxanium | michroma
  const [fontId, setFontId] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('font')
    return FONTS[q] ? q : 'tektur'
  })
  const font = FONTS[fontId]
  const fontRef = useRef(font)
  useEffect(() => {
    fontRef.current = font
  }, [font])
  const audio = useMemo(() => createAudio(), [])
  const audioOn = useSubscribed(audio, false)

  useEffect(() => () => audio.dispose(), [audio])

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
      const f = fontRef.current
      const css = (px) => `${f.weight} ${px}px ${f.family}, system-ui, sans-serif`
      let fs = 200
      g.font = css(fs)
      const span = W < 768 ? 0.9 : 0.8
      fs = Math.min((fs * W * span) / g.measureText(NAME).width, H * 0.42)
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
      drawWord()
      manager.itemEnd('fonts')
    }
    fontsLink.onload = () => {
      const f = fontRef.current
      Promise.all([document.fonts.load(`${f.weight} 120px ${f.family}`), document.fonts.load("400 12px 'Share Tech Mono'"), document.fonts.load("400 16px 'Chakra Petch'")]).finally(fontsReady)
    }
    fontsLink.onerror = fontsReady
    const fontsTimeout = setTimeout(fontsReady, 4000)
    document.head.appendChild(fontsLink)

    // --- la escena 3D del hero ------------------------------------------------------------------
    const rt = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
    rt.texture.colorSpace = THREE.SRGBColorSpace
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
    const root = new THREE.Group()
    hero.add(root)
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
        // los faroles: se encienden
        if (cr > 0.95 && cg > 0.75 && cb < 0.55) o.material.emissive = new THREE.Color('#ffb347')
      })
      root.add(g.scene)
      lookAt = g.scene.getObjectByName('Camera_Target') || null
      // El contenido (todo menos la cámara y su punto de mira) va a un grupo propio, que es el que se
      // inclina con el mouse; la cámara del GLB queda afuera.
      content = new THREE.Group()
      content.name = 'content'
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
    })

    // las otras dos láminas: la misma escena, con su cámara y su textura
    const views = VIEWS.map((v) => {
      const cam = new THREE.PerspectiveCamera(v.fov, 1, 0.1, 100)
      cam.position.set(...v.pos)
      cam.lookAt(...v.at)
      const vrt = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
      vrt.texture.colorSpace = THREE.SRGBColorSpace
      return { cam, rt: vrt }
    })

    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true
    const cardPlanes = views.map((v, i) => k.plane(v.rt.texture, [16, 16], 5 + i))
    const heroPlane = k.plane(rt.texture, [16, 16], 10)
    const linePlane = k.plane(white, [1, 1], 20)
    linePlane.u.uTint.value.set(INK)
    linePlane.u.uTintMix.value = 1
    const wordPlane = k.plane(white, [1, 1], 21, {
      frag: WORD_FRAG,
      uniforms: { uForm: { value: 0 }, uFold: { value: 0 }, uTime: { value: 0 } },
    })
    wordPlane.u.uTint.value.set(INK)

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
    const renderView = (scene, cam, target, w, h) => {
      const dpr = k.renderer.getPixelRatio()
      const tw = Math.max(16, Math.round((w * dpr) / 8) * 8)
      const th = Math.max(16, Math.round((h * dpr) / 8) * 8)
      if (target.width !== tw || target.height !== th) target.setSize(tw, th)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      k.renderer.setRenderTarget(target)
      k.renderer.render(scene, cam)
    }

    k.add({
      onResize: () => {
        fitHero()
        if (fontsDone) drawWord()
      },
      update: ({ dt, now, W, H, scrollY, pointer }) => {
        const p = progress(scrollY)

        // 1) la carga: línea de progreso → el nombre se forma → se pliega en el horizonte → se abre
        boot.shown += (boot.prog - boot.shown) * (1 - Math.exp(-6 * dt))
        if (loadRef.current) loadRef.current.textContent = String(Math.round(boot.shown * 100)).padStart(2, '0')
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

        linePlane.rect(lx, ly - 1, boot.form > 0 ? lw : lw * Math.min(1, boot.shown), 2)
        linePlane.u.uAlpha.value =
          boot.reveal > 0 ? 1 - clamp01(rv * 6) : boot.fold > 0 ? clamp01((boot.fold - 0.55) / 0.35) : 1 - clamp01(boot.form * 5)

        // 2) el hero: del horizonte a pantalla completa; con el progreso, a su lámina inclinada
        const m = rv >= 1 ? easeInOut(seg(p, T.morph)) : 0
        const dest = r.dest?.getBoundingClientRect()
        const ro = easeInOut(clamp01(boot.reveal / 0.7))
        const rw = easeInOut(clamp01((boot.reveal - 0.3) / 0.7))
        let rect = { x: lerp(lx, 0, rw), y: lerp(ly - 1, 0, ro), w: lerp(lw, W, rw), h: lerp(2, H, ro) }
        let rot = 0
        if (dest && m > 0) {
          rect = { x: lerp(0, dest.left, m), y: lerp(0, dest.top, m), w: lerp(W, dest.width, m), h: lerp(H, dest.height, m) }
          rot = Number(r.dest.dataset.rot || 0) * DEG * m
        }
        heroPlane.rect(rect.x, rect.y, rect.w, rect.h, rot)
        // la ventana del HUD: lo que sube más allá de la barra de arriba se corta en su línea
        const fr = W < 768 ? { pad: 12, bar: 52 } : { pad: 20, bar: 56 }
        const win = { x: fr.pad, y: fr.pad + fr.bar, w: W - fr.pad * 2, h: H - fr.pad * 2 - fr.bar }
        heroPlane.clip(lerp(0, win.x, m), lerp(0, win.y, m), lerp(W, win.w, m), lerp(H, win.h, m))
        heroPlane.u.uMapSize.value.set(rt.width, rt.height)
        if (m > 0) {
          const sh = CARD_SHAPE(rect.w)
          heroPlane.shape({ top: sh.top * m, bottom: sh.bottom * m })
        } else {
          const lens = (rect.h / 2) * (1 - rv)
          heroPlane.shape({ top: lens, bottom: lens })
        }
        heroPlane.u.uAlpha.value = boot.reveal > 0 ? 1 : 0

        if (mixer) mixer.setTime(Math.min(clipDur - 0.001, clamp01(p / T.morph[1]) * clipDur))
        // la escena se inclina hacia el mouse, en los ejes de la cámara y alrededor del punto que mira
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
        if (boot.reveal > 0) {
          k.renderer.setRenderTarget(rt)
          k.renderer.render(hero, heroCam)
        }

        k.clearColor.set(rv >= 1 ? CREAM : WHITE)

        // 3) la capa UI: el marco y las secciones apiladas
        const out = easeOut(seg(p, T.heroOut))
        const inn = clamp01((rv - 0.82) / 0.18) // el texto llega cuando el ojo ya está casi abierto
        show(r.frame, inn)
        const theme = m > 0.5 ? 'light' : 'dark'
        if (r.frame && theme !== themeNow) {
          themeNow = theme
          r.frame.dataset.theme = theme
        }
        show(r.heroUi, inn * (1 - out), (1 - inn) * 24 - out * 40)
        if (r.heroTitle) r.heroTitle.style.filter = out > 0.01 && out < 0.99 ? `blur(${out * 8}px)` : 'none'
        if (r.scrollHint) r.scrollHint.style.opacity = String(inn * (1 - clamp01(p * 30)))
        const tin = easeOut(seg(p, T.tableIn))
        const drift = p > T.tableIn[1] ? (p - T.tableIn[1]) * H * 0.9 : 0
        show(r.tableUi, tin > 0 ? 1 : 0, (1 - tin) * H * 0.6 - drift)
        if (r.ink) {
          const t = seg(p, T.ink)
          // de gris a la tinta (#15111d)
          r.ink.style.color = `rgb(${Math.round(lerp(205, 21, t))},${Math.round(lerp(205, 17, t))},${Math.round(lerp(205, 29, t))})`
          r.ink.style.opacity = String(clamp01((m - 0.3) / 0.3))
        }
        // el altímetro del HUD: la marca baja con el progreso y el número cuenta la altura
        if (r.meterMark) r.meterMark.style.transform = `translate3d(0, ${(p * (r.meter?.offsetHeight || 0)).toFixed(1)}px, 0)`
        if (r.meterNum) r.meterNum.textContent = String(Math.round(4800 - p * 4800)).padStart(4, '0')
        const act = p < 0.3 ? 'atlas' : 'isles'
        if (act !== activeNow) {
          activeNow = act
          setActive(act)
        }

        // 4) las otras dos láminas: escenas vivas sobre su slot, con su giro y su parallax
        r.slots.forEach((el, i) => {
          const pl = cardPlanes[i]
          const v = views[i]
          if (!el || !pl) return
          const b = el.getBoundingClientRect()
          const depth = Number(el.dataset.depth || 0)
          const c = (b.top + b.height / 2 - H / 2) / H
          const enter = easeOut(clamp01((H - b.top) / (H * 0.5))) * (tin > 0 ? 1 : 0)
          const s = lerp(0.88, 1, enter)
          const w = b.width * s
          const h = b.height * s
          pl.rect(b.left + (b.width - w) / 2, b.top + c * depth * 140 + (b.height - h) / 2, w, h, Number(el.dataset.rot || 0) * DEG * enter)
          pl.shape(CARD_SHAPE(w))
          pl.clip(win.x, win.y, win.w, win.h)
          pl.u.uZoom.value = 1.15
          pl.u.uShift.value.set(0, -c * 0.9)
          pl.u.uAlpha.value = enter
          if (enter > 0.001 && pl.mesh.visible) {
            renderView(hero, v.cam, v.rt, b.width, b.height)
            pl.u.uMapSize.value.set(v.rt.width, v.rt.height)
          }
        })
      },
    })

    return () => {
      clearTimeout(fontsTimeout)
      fontsLink.remove()
      k.dispose()
      rt.dispose()
      views.forEach((v) => v.rt.dispose())
      wordTex?.dispose()
      lenis?.start()
    }
  }, [])

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
    // el cajón termina de cerrarse antes de que el scroll arranque
    setTimeout(() => lenis?.scrollTo(it.p * max, { duration: 1.8 }), 380)
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
  const display = { fontFamily: font.family, fontWeight: font.weight, letterSpacing: font.tracking }
  const layer = 'fixed inset-0 h-svh w-full'
  const inset = 'calc(var(--pad) + 28px)'
  const pickFont = (id) => {
    setFontId(id)
    const u = new URL(window.location.href)
    u.searchParams.set('font', id)
    window.history.replaceState(null, '', u)
  }

  return (
    <div className="kv" style={{ color: INK, fontFamily: BODY }}>
      <style>{KANVAS_CSS}</style>
      <div ref={spacerRef} aria-hidden="true" style={{ height: `${SCROLL_SCREENS * 100}svh` }} />

      {/* Capa 1: el canvas. */}
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none z-0 ${layer}`} />

      {/* Capa 2: la UI, con las secciones apiladas. */}
      <div className={`pointer-events-none z-10 ${layer}`}>
        {/* carga: el porcentaje sobre la línea y el botón del sonido */}
        <div
          className="absolute inset-x-0 top-1/2 mx-auto flex w-[56vw] -translate-y-[calc(100%+12px)] justify-between text-[11px] tracking-[0.12em] uppercase"
          style={{ fontFamily: MONO, opacity: stage === 'load' ? 1 : 0, transition: `opacity .4s` }}
        >
          <span>
            Charting the horizon — <span ref={loadRef}>00</span>%
          </span>
          <span className="hidden opacity-50 sm:inline">vesper/atlas/leaf-00</span>
        </div>
        <div
          className="absolute inset-x-0 bottom-[14svh] flex flex-col items-center gap-3"
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
          <span className="text-[10px] tracking-[0.14em] uppercase opacity-60" style={{ fontFamily: MONO }}>
            {audioOn ? 'Sound on' : 'Tap for sound'}
          </span>
        </div>

        {/* Sección: hero. El titular arriba, como el cartel de un nivel; el párrafo abajo a la
            derecha, como la entrada de una bitácora. */}
        <section ref={set('heroUi')} className="absolute inset-0 text-white" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute" style={{ left: inset, right: inset, top: 'calc(var(--pad) + var(--bar) + 3svh)' }}>
            <p className="mb-3 flex items-center gap-3 text-[11px] tracking-[0.16em] uppercase" style={{ fontFamily: MONO }}>
              <span className="inline-block h-[7px] w-[7px]" style={{ background: AMBER }} />
              Leaf 01 // The outer isles
            </p>
            <h1
              ref={set('heroTitle')}
              className="uppercase"
              style={{ ...display, fontSize: `calc(clamp(3.2rem, 15vw, 9.5rem) * ${font.scale})`, lineHeight: 0.86, textShadow: '0 2px 40px rgba(30,16,60,.3)' }}
            >
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
            <p className="flex items-center gap-3 border-t border-white/40 pt-3 text-[11px] tracking-[0.16em] uppercase" style={{ fontFamily: MONO }}>
              <span style={{ color: AMBER }}>Log 01</span>
              <span className="opacity-70">44°12′N · 12°06′E</span>
            </p>
            <p className="mt-3 text-[16px] leading-[1.4] md:text-[17px]">
              Vesper is an illustrated world told one leaf at a time — three wayfarers, the last lanterns, and a map that keeps redrawing itself.
            </p>
            <RollLink text="Begin the crossing" onClick={() => go(NAV[1])} className="mt-4 text-[12px] tracking-[0.14em] uppercase" style={{ fontFamily: MONO, '--rl-to': AMBER }}>
              <span className="mr-2" style={{ color: AMBER }}>
                ▸
              </span>
            </RollLink>
          </div>
          <div ref={set('scrollHint')} className="absolute left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] tracking-[0.16em] uppercase md:flex" style={{ bottom: 'calc(var(--pad) + 18px)', fontFamily: MONO }}>
            Scroll
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1.5l5 5 5-5" />
            </svg>
          </div>
        </section>

        {/* Sección: las tres láminas (sube a su lugar mientras el hero se aleja). La envuelve la ventana
            del HUD: lo que sube más allá de la barra se corta en su línea, igual que en el canvas. */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(calc(var(--pad) + var(--bar)) var(--pad) var(--pad) var(--pad))' }}>
          <section
            ref={set('tableUi')}
            className="absolute inset-0"
            style={{ opacity: 0, visibility: 'hidden', paddingLeft: inset, paddingRight: 'calc(var(--pad) + 48px)', paddingTop: 'calc(var(--pad) + var(--bar) + 6svh)' }}
          >
            <div className="grid gap-4 md:grid-cols-12 md:gap-8">
              <p className="text-[11px] tracking-[0.14em] uppercase md:col-span-2 md:pt-3" style={{ fontFamily: MONO }}>
                Leaf 02 // The isles
              </p>
              <h2
                ref={set('ink')}
                className="leading-[0.98] md:col-span-10"
                style={{ fontFamily: font.family, fontWeight: Math.min(font.weight, 600), letterSpacing: font.tracking, fontSize: `calc(clamp(2rem, 4.6vw, 5rem) * ${font.scale})`, color: 'rgb(205,205,205)' }}
              >
                Every map was drawn by someone who left.
              </h2>
            </div>
            <div className="mt-[6svh] grid gap-10 md:grid-cols-12 md:gap-8">
              <figure className="md:col-span-3 md:mt-[12svh]">
                <div ref={(el) => (R.current.slots[0] = el)} data-depth="0.3" data-rot="3" className="aspect-[4/5] w-full" />
                <figcaption className="mt-5 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: MONO }}>
                  01 // The wayfarers
                </figcaption>
                <p className="mt-2 max-w-[28ch] text-[16px] leading-snug">Three cloaks, three lanterns, one road nobody has finished.</p>
              </figure>
              <figure className="md:col-span-3 md:col-start-5">
                <div ref={(el) => (R.current.slots[1] = el)} data-depth="-0.2" data-rot="-2" className="aspect-[3/4] w-full" />
                <figcaption className="mt-5 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: MONO }}>
                  02 // The lantern tower
                </figcaption>
              </figure>
              <figure className="md:col-span-4 md:col-start-9 md:mt-[4svh]">
                <div ref={set('dest')} data-rot="-5" className="aspect-[3/4] w-full" />
                <figcaption className="mt-5 text-[11px] tracking-[0.14em] uppercase" style={{ fontFamily: MONO }}>
                  03 // The outer isle
                </figcaption>
              </figure>
            </div>
          </section>
        </div>
      </div>

      {/* Capa 3: el HUD. Sin marco cerrado: cuatro esquinas de mira, la barra de arriba, un
          altímetro a la derecha que baja con el scroll y el rótulo vertical a la izquierda. */}
      <div ref={set('frame')} data-theme="dark" className="kv-frame pointer-events-none fixed inset-0 z-20" style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="absolute" style={{ inset: 'var(--pad)' }}>
          <span className="kv-corner top-0 left-0" style={{ borderTopWidth: 1.5, borderLeftWidth: 1.5 }} />
          <span className="kv-corner top-0 right-0" style={{ borderTopWidth: 1.5, borderRightWidth: 1.5 }} />
          <span className="kv-corner bottom-0 left-0" style={{ borderBottomWidth: 1.5, borderLeftWidth: 1.5 }} />
          <span className="kv-corner right-0 bottom-0" style={{ borderBottomWidth: 1.5, borderRightWidth: 1.5 }} />

          {/* barra de arriba */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 md:px-4" style={{ height: 'var(--bar)' }}>
            <span className="absolute right-8 bottom-0 left-8 h-px" style={{ background: 'var(--dim)' }} aria-hidden="true" />
            <div className="flex items-center gap-3">
              <button type="button" onClick={openMenu} aria-label="Open menu" className="pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center">
                <Burger />
              </button>
              <span className="hidden text-[18px] uppercase md:inline" style={{ ...display, fontSize: `${20 * font.scale}px`, letterSpacing: '0.04em' }}>
                {NAME}
              </span>
            </div>
            <span className="absolute left-1/2 -translate-x-1/2 text-[18px] uppercase md:hidden" style={{ ...display, fontSize: `${18 * font.scale}px`, letterSpacing: '0.04em' }}>
              {NAME}
            </span>
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[12px] tracking-[0.1em] uppercase md:flex" style={{ fontFamily: MONO }} aria-label="Sections">
              {NAV.map((it) => (
                <RollLink key={it.id} text={it.label} active={it.id === active} onClick={() => go(it)} />
              ))}
            </nav>
            <AudioWave on={audioOn} onClick={() => audio.toggle()} className="md:hidden" />
            <button
              type="button"
              onClick={() => go(NAV[3])}
              className="kv-chamfer pointer-events-auto hidden h-9 cursor-pointer items-center gap-2 px-5 text-[12px] tracking-[0.12em] uppercase md:flex"
              style={{ fontFamily: MONO, background: 'var(--fg)', color: 'var(--fg-inv)', transition: 'background .5s, color .5s' }}
            >
              <span className="inline-block h-[6px] w-[6px]" style={{ background: AMBER }} />
              Get the atlas
            </button>
          </div>

          {/* rótulo vertical, a la izquierda */}
          <div className="absolute inset-y-0 left-0 hidden w-7 items-center justify-center md:flex">
            <p className="text-[11px] tracking-[0.2em] whitespace-nowrap uppercase opacity-70" style={{ fontFamily: MONO, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Vesper atlas — leaves 01/06
            </p>
          </div>

          {/* el altímetro, a la derecha */}
          <div ref={set('meter')} className="kv-ruler absolute right-2 hidden w-[10px] md:block" style={{ top: 'calc(var(--bar) + 24px)', bottom: 56 }}>
            <div ref={set('meterMark')} className="absolute top-0 right-0 flex -translate-y-1/2 items-center gap-2" style={{ willChange: 'transform' }}>
              <span className="text-[11px] tracking-[0.1em]" style={{ fontFamily: MONO }}>
                ALT <span ref={set('meterNum')}>4800</span>
              </span>
              <svg width="8" height="10" viewBox="0 0 8 10" style={{ color: 'var(--accent)' }}>
                <path d="M0 0l8 5-8 5z" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* abajo: sonido a la izquierda */}
          <div className="absolute bottom-1 left-2 hidden md:block">
            <AudioWave on={audioOn} onClick={() => audio.toggle()} label />
          </div>
        </div>
      </div>

      {/* Solo del prototipo: para comparar tipografías de titulares en vivo. */}
      <div className="fixed bottom-[calc(var(--pad)+10px)] left-[calc(var(--pad)+130px)] z-30 hidden items-center gap-1 rounded-sm bg-black/55 p-1 text-[10px] tracking-[0.08em] text-white uppercase backdrop-blur md:flex" style={{ fontFamily: MONO }}>
        <span className="px-2 opacity-60">Type</span>
        {Object.entries(FONTS).map(([id, f]) => (
          <button key={id} type="button" onClick={() => pickFont(id)} className="cursor-pointer rounded-sm px-2 py-1" style={id === fontId ? { background: AMBER, color: INK } : null}>
            {f.label}
          </button>
        ))}
      </div>

      <Menu open={menu} onClose={closeMenu} items={MENU} active={active} onGo={go} displayFont={font} footer={<MenuFooter onGo={go} audioOn={audioOn} onAudio={() => audio.toggle()} />} />
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
  const style = { fontFamily: MONO, '--rl-to': AMBER }
  const end = { id: 'chronicle', p: 1 }
  return (
    <div style={{ fontFamily: MONO }}>
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
