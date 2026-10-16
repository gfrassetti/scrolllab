import { useEffect, useRef, useState } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { getLenis } from '../../hooks/useLenis'
import { createKanvas, lerp, clamp01 } from './engine'

import cardA from '../../components/sections/atelier/assets/card-1.webp'
import cardB from '../../components/sections/apex/assets/lounge.webp'
import cardC from '../../components/sections/atelier/assets/work-3.webp'

/**
 * Kanvas v2 — prototipo técnico (solo local) con la arquitectura de la referencia:
 *
 *   · Un RELOJ único: el scroll (Lenis) produce un progreso 0 → 1 para todo el sitio. No hay
 *     secciones en el flujo de la página ni `sticky`: un espaciador da el largo del scroll y nada más.
 *   · Una capa CANVAS fija (todo lo que es imagen o 3D) y una capa UI fija encima (texto, HUD), con
 *     las secciones APILADAS: el progreso decide cuál se ve, cuál entra y cuál sale.
 *   · El hero es una ESCENA 3D (GLB hecho en Blender, con su cámara animada adentro). El progreso
 *     reproduce esa cámara; el puntero la hace orbitar un poco. Al alejarse, la escena queda dentro
 *     de una card con forma de carpeta, en el mismo canvas.
 *
 * El arte es provisorio (la isla es una prueba propia; las cards son fotos de APEX / ATELIER).
 */

const CREAM = '#ede8df'
const WHITE = '#ffffff'
const SCROLL_SCREENS = 6 // largo del recorrido, en pantallas

// El guion, en progreso (0 → 1).
const T = {
  heroOut: [0.12, 0.2], // el titular del hero se va
  morph: [0.2, 0.46], // el hero se aleja y queda como card
  tableIn: [0.3, 0.46], // la sección siguiente sube a su lugar
  ink: [0.42, 0.58], // su titular se entinta
}

const CARD_SHAPE = (w) => {
  const k = Math.min(1, w / 520)
  return { radius: 14 * k + 6, tab: [w * 0.42, 22 * k + 10, 26 * k + 12], cut: 34 * k + 14 }
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3
const seg = (p, [a, b]) => clamp01((p - a) / (b - a))

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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const lenis = getLenis()
    lenis?.stop()
    window.scrollTo(0, 0)
    const k = createKanvas(canvasRef.current, { clear: WHITE })
    const { THREE } = k
    const r = R.current

    // --- carga real: el GLB y las fotos ---------------------------------------------------------
    const manager = new THREE.LoadingManager()
    const texLoader = new THREE.TextureLoader(manager)
    const tex = (src) => {
      const t = texLoader.load(src, (tt) => {
        tt.userData.size = [tt.image.width, tt.image.height]
        k.renderer.initTexture(tt)
      })
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      return t
    }
    const tCards = [tex(cardA), tex(cardB), tex(cardC)]
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true

    const boot = { prog: 0, shown: 0, reveal: 0, loaded: false }
    manager.onProgress = (_u, done, total) => (boot.prog = done / total)
    manager.onLoad = () => (boot.loaded = true)

    // --- la escena 3D del hero, dibujada en una textura -------------------------------------------
    const rt = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
    rt.texture.colorSpace = THREE.SRGBColorSpace
    const hero = new THREE.Scene()
    // cielo: degradado pintado (lavanda arriba, durazno al horizonte)
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
    // sombreado «pintado»: tres tonos por cara, con el color por vértice del GLB
    const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1)
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter
    ramp.needsUpdate = true
    const root = new THREE.Group()
    hero.add(root)
    let heroCam = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    let mixer = null
    let clipDur = 1
    let crystal = null
    let lookAt = null // el «Camera_Target» del GLB: el punto que mira la cámara
    let content = null // lo que se inclina al mouse
    // La inclinación al mouse: con más peso que el puntero (amortiguado propio, λ ≈ 2,6).
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
        // el cristal: el único objeto verde agua
        if (!crystal && c?.count && c.getY(0) > 0.85 && c.getX(0) < 0.5) {
          crystal = o
          o.userData.baseY = o.position.y
          o.material.emissive = new THREE.Color('#2aa89a')
        }
      })
      root.add(g.scene)
      lookAt = g.scene.getObjectByName('Camera_Target') || null
      // La cámara viene dentro del GLB: si se inclina todo, gira con la escena y no se nota nada.
      // El contenido (todo menos la cámara y su punto de mira) va a un grupo propio, que es el que se
      // inclina. Sigue dentro de g.scene, así las animaciones lo encuentran por nombre.
      content = new THREE.Group()
      content.name = 'content'
      for (const child of [...g.scene.children]) {
        if (child.isCamera || child === lookAt || child.getObjectByProperty('isCamera', true)) continue
        content.add(child)
      }
      g.scene.add(content)
      if (g.cameras[0]) heroCam = g.cameras[0]
      // Todas las animaciones del GLB van juntas (la cámara y su punto de mira vienen por separado).
      if (g.animations.length) {
        mixer = new THREE.AnimationMixer(g.scene)
        for (const clip of g.animations) mixer.clipAction(clip).play()
        clipDur = Math.max(...g.animations.map((c) => c.duration))
      }
      fitHero()
    })

    const heroPlane = k.plane(rt.texture, [16, 16], 10)
    const linePlane = k.plane(white, [1, 1], 20)
    linePlane.u.uTint.value.set('#0e0e12')
    linePlane.u.uTintMix.value = 1
    const cardPlanes = tCards.map((t, i) => k.plane(t, [1536, 1024], 5 + i))

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

    k.add({
      onResize: () => fitHero(),
      update: ({ dt, now, W, H, scrollY, pointer }) => {
        const p = progress(scrollY)

        // 1) carga: la línea avanza con la carga real y se abre en el hero
        boot.shown += (boot.prog - boot.shown) * (1 - Math.exp(-6 * dt))
        if (loadRef.current) loadRef.current.textContent = String(Math.round(boot.shown * 100)).padStart(2, '0')
        if (boot.loaded && boot.shown > 0.995 && boot.reveal === 0) {
          boot.reveal = 0.0001
          setReady(true)
        }
        if (boot.reveal > 0 && boot.reveal < 1) boot.reveal = Math.min(1, boot.reveal + dt / 1.6)
        const rv = easeInOut(boot.reveal)
        const lw = W * 0.56
        const lx = (W - lw) / 2
        const ly = H / 2
        linePlane.rect(lx, ly - 1, lw * Math.min(1, boot.shown), 2)
        linePlane.u.uAlpha.value = 1 - clamp01(rv * 3)

        // 2) el hero: de la línea a pantalla completa; con el progreso, a su card
        const m = rv >= 1 ? easeInOut(seg(p, T.morph)) : 0
        const dest = r.dest?.getBoundingClientRect()
        let rect = { x: lerp(lx, 0, rv), y: lerp(ly - 1, 0, rv), w: lerp(lw, W, rv), h: lerp(2, H, rv) }
        if (dest && m > 0) {
          rect = { x: lerp(0, dest.left, m), y: lerp(0, dest.top, m), w: lerp(W, dest.width, m), h: lerp(H, dest.height, m) }
        }
        heroPlane.rect(rect.x, rect.y, rect.w, rect.h)
        heroPlane.u.uMapSize.value.set(rt.width, rt.height)
        const sh = CARD_SHAPE(rect.w)
        heroPlane.shape({ radius: sh.radius * m, tab: [sh.tab[0], sh.tab[1] * m, sh.tab[2] * m], cut: sh.cut * m })
        heroPlane.u.uAlpha.value = rv > 0 ? 1 : 0

        // la cámara del GLB avanza con el progreso (del cristal a la isla entera) y orbita al puntero
        if (mixer) mixer.setTime(Math.min(clipDur - 0.001, clamp01(p / T.morph[1]) * clipDur))
        // El objeto entero se inclina hacia el mouse, en los ejes de la cámara (derecha / arriba como
        // los ves) y alrededor del punto que la cámara está mirando.
        const kt = 1 - Math.exp(-2.6 * dt)
        tilt.x += (pointer.x - tilt.x) * kt
        tilt.y += (pointer.y - tilt.y) * kt
        heroCam.updateMatrixWorld()
        right.setFromMatrixColumn(heroCam.matrixWorld, 0).normalize()
        up.setFromMatrixColumn(heroCam.matrixWorld, 1).normalize()
        if (content) {
          if (lookAt) lookAt.getWorldPosition(pivot)
          else heroCam.getWorldDirection(pivot).multiplyScalar(4).add(heroCam.position)
          qy.setFromAxisAngle(up, tilt.x * 0.32) // mouse a la derecha → gira hacia la derecha
          qx.setFromAxisAngle(right, tilt.y * 0.2) // mouse abajo → se inclina hacia abajo
          content.quaternion.copy(qy).multiply(qx)
          content.position.copy(pivot).sub(pivot.clone().applyQuaternion(content.quaternion))
        }
        if (crystal) crystal.position.y = crystal.userData.baseY + Math.sin(now * 0.0015) * 0.06
        k.renderer.setRenderTarget(rt)
        k.renderer.render(hero, heroCam)

        k.clearColor.set(rv >= 1 ? CREAM : WHITE)

        // 3) la capa UI: secciones apiladas, una sola visible por tramo
        const out = seg(p, T.heroOut)
        const inn = clamp01((rv - 0.72) / 0.28)
        show(r.heroUi, inn * (1 - out), (1 - inn) * 30 - out * 50)
        if (r.heroTitle) r.heroTitle.style.filter = out > 0.01 && out < 0.99 ? `blur(${out * 6}px)` : 'none'
        const tin = easeOut(seg(p, T.tableIn))
        const drift = p > T.tableIn[1] ? (p - T.tableIn[1]) * H * 0.9 : 0
        show(r.tableUi, tin > 0 ? 1 : 0, (1 - tin) * H * 0.6 - drift)
        if (r.ink) {
          const t = seg(p, T.ink)
          const gv = Math.round(lerp(205, 18, t))
          r.ink.style.color = `rgb(${gv},${gv},${gv})`
          r.ink.style.opacity = String(clamp01((m - 0.3) / 0.3))
        }

        // 4) las cards: cada una sobre su slot (que sube con la sección) y con su parallax propio
        r.slots.forEach((el, i) => {
          const pl = cardPlanes[i]
          if (!el || !pl) return
          const b = el.getBoundingClientRect()
          const depth = Number(el.dataset.depth || 0)
          const c = (b.top + b.height / 2 - H / 2) / H
          const enter = easeOut(clamp01((H - b.top) / (H * 0.5))) * (tin > 0 ? 1 : 0)
          const s = lerp(0.9, 1, enter)
          const w = b.width * s
          const h = b.height * s
          pl.rect(b.left + (b.width - w) / 2, b.top + c * depth * 140 + (b.height - h) / 2, w, h)
          pl.shape(CARD_SHAPE(w))
          pl.u.uZoom.value = 1.22
          pl.u.uShift.value.set(0, -c * 0.9)
          pl.u.uAlpha.value = enter
          const sz = pl.u.uMap.value.userData.size
          if (sz) pl.u.uMapSize.value.set(sz[0], sz[1])
        })
      },
    })

    return () => {
      k.dispose()
      rt.dispose()
      lenis?.start()
    }
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    const id = setTimeout(() => getLenis()?.start(), 1500)
    return () => clearTimeout(id)
  }, [ready])

  const set = (key) => (el) => (R.current[key] = el)
  const mono = { fontFamily: "'Space Mono', ui-monospace, monospace" }
  const display = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif", fontWeight: 800, letterSpacing: '-0.045em' }
  const layer = 'fixed inset-0 h-svh w-full'

  return (
    <div style={{ color: '#111' }}>
      {/* El largo del scroll y nada más: el contenido no está en el flujo de la página. */}
      <div ref={spacerRef} aria-hidden="true" style={{ height: `${SCROLL_SCREENS * 100}svh` }} />

      {/* Capa 1: el canvas (todo lo que es imagen o 3D). */}
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none z-0 ${layer}`} />

      {/* Capa 2: la UI, con las secciones apiladas. */}
      <div className={`pointer-events-none z-10 ${layer}`}>
        {/* carga */}
        <div
          className="absolute inset-x-0 top-1/2 mx-auto flex w-[56vw] -translate-y-[calc(100%+14px)] justify-between text-[11px] tracking-[0.18em] uppercase transition-opacity duration-500"
          style={{ ...mono, opacity: ready ? 0 : 1 }}
        >
          <span>
            Loading — <span ref={loadRef}>00</span>%
          </span>
          <span className="opacity-50">kanvas://proto.v2</span>
        </div>

        {/* HUD: riel izquierdo con la cruz */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-14 border-r border-black/10 md:block">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] leading-none" style={{ color: '#111' }}>
            ✛
          </span>
        </div>

        {/* Sección: hero */}
        <section ref={set('heroUi')} className="absolute inset-0 flex items-end px-6 pb-[12svh] md:px-24" style={{ opacity: 0, visibility: 'hidden' }}>
          <h1 ref={set('heroTitle')} className="text-[clamp(3.2rem,11vw,12rem)] leading-[0.82] text-white uppercase" style={display}>
            The isle
            <br />
            remembers.
          </h1>
        </section>

        {/* Sección: tableau (sube a su lugar mientras el hero se aleja) */}
        <section ref={set('tableUi')} className="absolute inset-0 px-6 pt-[14svh] md:pr-10 md:pl-24" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="grid gap-6 md:grid-cols-12">
            <p className="text-[11px] md:col-span-1" style={mono}>
              ■ 001
            </p>
            <h2 ref={set('ink')} className="text-[clamp(2.2rem,5.6vw,6rem)] leading-[0.86] uppercase md:col-span-11" style={{ ...display, color: 'rgb(205,205,205)' }}>
              Every map was drawn by someone who left.
            </h2>
          </div>
          <div className="mt-[7svh] grid gap-6 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-3">
              <div ref={(el) => (R.current.slots[0] = el)} data-depth="0.35" className="aspect-[16/9] w-full" />
              <p className="mt-[20svh] max-w-[26ch] text-[16px] leading-snug" style={{ fontFamily: 'Inter, sans-serif' }}>
                Six districts, one curfew, and a signal nobody admits to sending.
              </p>
            </div>
            <div className="md:col-span-3 md:col-start-6 md:mt-[16svh]">
              <div ref={(el) => (R.current.slots[1] = el)} data-depth="-0.25" className="aspect-[4/5] w-full" />
            </div>
            <div className="md:col-span-3 md:col-start-10">
              <div ref={set('dest')} className="aspect-[3/4] w-full" />
            </div>
          </div>
          <div className="mt-[8svh] grid md:grid-cols-12">
            <div className="md:col-span-4 md:col-start-3">
              <div ref={(el) => (R.current.slots[2] = el)} data-depth="0.5" className="aspect-[3/2] w-full" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
