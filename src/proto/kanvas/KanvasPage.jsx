import { useEffect, useRef, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { getLenis } from '../../hooks/useLenis'
import { createKanvas, lerp, clamp01 } from './engine'

import heroImg from '../../components/sections/apex/assets/road.webp'
import cardA from '../../components/sections/atelier/assets/card-1.webp'
import cardB from '../../components/sections/apex/assets/lounge.webp'
import cardC from '../../components/sections/atelier/assets/work-3.webp'

/**
 * Prototipo técnico (solo local): loader → hero → el hero se aleja y queda como card → más cards,
 * todo en UN canvas. Las imágenes son provisorias (APEX / ATELIER): acá se prueba la mecánica.
 */

const DARK = '#0e0e12'
const CREAM = '#ede8df'
const WHITE = '#ffffff'
const CARD_SHAPE = (w) => {
  const k = Math.min(1, w / 520)
  return { radius: 14 * k + 6, tab: [w * 0.42, 22 * k + 10, 26 * k + 12], cut: 34 * k + 14 }
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3

export default function KanvasPage() {
  return (
    <SmoothScrollProvider>
      <Kanvas />
    </SmoothScrollProvider>
  )
}

function Kanvas() {
  const canvasRef = useRef(null)
  const heroRef = useRef(null)
  const destRef = useRef(null)
  const slotsRef = useRef([])
  const headRef = useRef(null)
  const heroTextRef = useRef(null)
  const loadRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const lenis = getLenis()
    lenis?.stop()
    window.scrollTo(0, 0)
    const k = createKanvas(canvasRef.current, { clear: WHITE })
    const { THREE } = k

    // --- texturas, con progreso real -------------------------------------------------------
    const manager = new THREE.LoadingManager()
    const loader = new THREE.TextureLoader(manager)
    const tex = (src) => {
      const t = loader.load(src, (tt) => {
        tt.userData.size = [tt.image.width, tt.image.height]
        k.renderer.initTexture(tt) // sube a la GPU antes de que se vea: sin tirón al aparecer
      })
      t.colorSpace = THREE.SRGBColorSpace
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.anisotropy = 4
      return t
    }
    const tHero = tex(heroImg)
    const tCards = [tex(cardA), tex(cardB), tex(cardC)]
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true

    const boot = { prog: 0, shown: 0, reveal: 0, loaded: false }
    // Lo que comparten las capas en cada cuadro (cuánto se alejó el hero).
    const shared = { m: 0 }
    manager.onProgress = (_u, done, total) => (boot.prog = done / total)
    manager.onLoad = () => (boot.loaded = true)

    // --- el hero: una escena propia, en perspectiva, dibujada en una textura ----------------
    const rt = new THREE.WebGLRenderTarget(16, 16, { samples: 4 })
    rt.texture.colorSpace = THREE.SRGBColorSpace
    const heroScene = new THREE.Scene()
    heroScene.background = new THREE.Color(DARK)
    const heroCam = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    const heroMat = new THREE.MeshBasicMaterial({ map: tHero })
    const heroQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heroMat)
    heroScene.add(heroQuad)
    let heroAspect = 1
    const fitHero = (W, H) => {
      const dpr = k.renderer.getPixelRatio()
      rt.setSize(Math.round(W * dpr), Math.round(H * dpr))
      heroAspect = W / H
      heroCam.aspect = heroAspect
      heroCam.updateProjectionMatrix()
    }
    const heroPlane = k.plane(rt.texture, [16, 16], 10)
    const linePlane = k.plane(white, [1, 1], 20)
    linePlane.u.uTint.value.set(DARK)
    linePlane.u.uTintMix.value = 1

    const cardPlanes = tCards.map((t, i) => k.plane(t, [1536, 1024], 5 + i))

    // --- capa: loader + hero + morph a card ---------------------------------------------------
    k.add({
      onResize: (W, H) => fitHero(W, H),
      update: ({ dt, W, H, scrollY, pointer }) => {
        // 1) loader: una línea que avanza con la carga real
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

        // 2) el hero sale de la línea y llena la pantalla (mismo plano: nunca hay corte)
        const full = { x: 0, y: 0, w: W, h: H }
        const fromLine = { x: lx, y: ly - 1, w: lw, h: 2 }
        let r = {
          x: lerp(fromLine.x, full.x, rv),
          y: lerp(fromLine.y, full.y, rv),
          w: lerp(fromLine.w, full.w, rv),
          h: lerp(fromLine.h, full.h, rv),
        }

        // 3) con el scroll, se aleja y aterriza en su card (la del tableau, que ya está en la página)
        let m = 0
        const dest = destRef.current?.getBoundingClientRect()
        if (dest && rv >= 1) {
          const end = dest.top + scrollY - (H - dest.height) / 2
          const start = end - H * 1.15
          m = easeInOut(clamp01((scrollY - start) / (end - start)))
          r = {
            x: lerp(0, dest.left, m),
            y: lerp(0, dest.top, m),
            w: lerp(W, dest.width, m),
            h: lerp(H, dest.height, m),
          }
        }
        shared.m = m
        heroPlane.rect(r.x, r.y, r.w, r.h)
        heroPlane.u.uMapSize.value.set(rt.width, rt.height)
        const sh = CARD_SHAPE(r.w)
        heroPlane.shape({ radius: sh.radius * m, tab: [sh.tab[0], sh.tab[1] * m, sh.tab[2] * m], cut: sh.cut * m })
        heroPlane.u.uAlpha.value = rv > 0 ? 1 : 0

        // la escena de adentro: órbita al puntero y, al hacerse card, la cámara se aleja
        const dist = 3.2 + m * 1.6 - rv * 0.4
        const vh = 2 * Math.tan((heroCam.fov * Math.PI) / 360) * 3.2
        const img = tHero.userData.size || [2688, 1520]
        const ia = img[0] / img[1]
        const qh = Math.max(vh, (vh * heroAspect) / ia) * 1.18
        heroQuad.scale.set(qh * ia, qh, 1)
        heroCam.position.set(pointer.sx * 0.22, -pointer.sy * 0.14, dist)
        heroCam.lookAt(0, 0, 0)
        k.renderer.setRenderTarget(rt)
        k.renderer.render(heroScene, heroCam)

        // el fondo de la página: blanco mientras la línea se abre; cuando el hero ya cubre todo,
        // pasa a crema por detrás (no se ve hasta que el hero se achica: nunca hay un gris de mezcla)
        k.clearColor.set(rv >= 1 ? CREAM : WHITE)
        // el titular del hero se va con el morph
        if (heroTextRef.current) {
          // se va al principio del alejamiento, antes de que asome el titular de abajo
          const out = clamp01(m / 0.18)
          const inn = clamp01((rv - 0.72) / 0.28) // entra cuando la imagen ya casi llenó la pantalla
          heroTextRef.current.style.opacity = String(inn * (1 - out))
          heroTextRef.current.style.transform = `translate3d(0, ${(1 - inn) * 30 - out * 40}px, 0)`
          heroTextRef.current.style.filter = out > 0.01 && out < 0.99 ? `blur(${out * 6}px)` : 'none'
        }
      },
    })

    // --- capa: las cards del tableau (cada una sobre su slot, con parallax propio) -------------
    k.add({
      update: ({ H }) => {
        slotsRef.current.forEach((el, i) => {
          const p = cardPlanes[i]
          if (!el || !p) return
          const b = el.getBoundingClientRect()
          const depth = Number(el.dataset.depth || 0)
          const c = (b.top + b.height / 2 - H / 2) / H // −1 … 1 alrededor del centro
          const enter = easeOut(clamp01((H - b.top) / (H * 0.55)))
          const y = b.top + c * depth * 120
          const s = lerp(0.9, 1, enter)
          const w = b.width * s
          const h = b.height * s
          p.rect(b.left + (b.width - w) / 2, y + (b.height - h) / 2, w, h)
          p.shape(CARD_SHAPE(w))
          p.u.uZoom.value = 1.22
          p.u.uShift.value.set(0, -c * 0.9)
          p.u.uAlpha.value = enter
          const t = cardPlanes[i].u.uMap.value.userData.size
          if (t) p.u.uMapSize.value.set(t[0], t[1])
        })
        // el titular se entinta: de gris claro a negro con el scroll
        const hd = headRef.current
        if (hd) {
          const b = hd.getBoundingClientRect()
          const t = clamp01((H * 0.7 - b.top) / (H * 0.45))
          const g = Math.round(lerp(205, 18, t))
          hd.style.color = `rgb(${g},${g},${g})`
          // entra recién cuando el titular del hero ya se fue
          hd.style.opacity = String(clamp01((shared.m - 0.22) / 0.25))
        }
      },
    })

    return () => {
      k.dispose()
      rt.dispose()
      lenis?.start()
    }
  }, [])

  // Al terminar el revelado, se libera el scroll.
  useEffect(() => {
    if (!ready) return undefined
    const id = setTimeout(() => getLenis()?.start(), 1500)
    return () => clearTimeout(id)
  }, [ready])

  const mono = { fontFamily: "'Space Mono', ui-monospace, monospace" }
  const display = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif", fontWeight: 800, letterSpacing: '-0.045em' }

  return (
    <div className="relative" style={{ color: '#111' }}>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-svh w-full" />

      {/* Carga: el número y el rótulo (la línea la dibuja el canvas). */}
      <div
        className="pointer-events-none fixed inset-x-0 top-1/2 z-20 mx-auto flex w-[56vw] -translate-y-[calc(100%+14px)] justify-between text-[11px] tracking-[0.18em] uppercase transition-opacity duration-500"
        style={{ ...mono, opacity: ready ? 0 : 1 }}
      >
        <span>Loading — <span ref={loadRef}>00</span>%</span>
        <span className="opacity-50">kanvas://proto.v1</span>
      </div>

      {/* HUD: riel izquierdo con la cruz, columnas finas. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 z-20 hidden w-14 border-r border-black/10 md:block">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] leading-none mix-blend-difference" style={{ color: '#fff' }}>
          ✛
        </span>
      </div>

      {/* 1. Hero: el titular sobre el canvas; el alto es el recorrido del morph. */}
      <section ref={heroRef} className="relative z-10 h-[200svh]">
        <div className="sticky top-0 flex h-svh items-end px-6 pb-[12svh] md:px-24">
          <h1 ref={heroTextRef} className="text-[clamp(3.2rem,11vw,12rem)] leading-[0.82] uppercase" style={{ ...display, color: '#fff', opacity: 0 }}>
            The city
            <br />
            remembers.
          </h1>
        </div>
      </section>

      {/* 2. Tableau: entra por debajo del hero (se superpone su último tramo). */}
      <section className="relative z-10 -mt-[100svh] min-h-[200svh] px-6 pt-[16svh] md:pl-24 md:pr-10">
        <div className="grid gap-6 md:grid-cols-12">
          <p className="text-[11px] md:col-span-1" style={mono}>
            ■ 001
          </p>
          <h2 ref={headRef} className="text-[clamp(2.4rem,6.4vw,6.8rem)] leading-[0.86] uppercase md:col-span-11" style={{ ...display, color: 'rgb(205,205,205)' }}>
            Every map was drawn by someone who left.
          </h2>
        </div>
        <div className="mt-[10svh] grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-3">
            <div ref={(el) => (slotsRef.current[0] = el)} data-depth="0.35" className="aspect-[16/9] w-full" />
            <p className="mt-[24svh] max-w-[26ch] text-[17px] leading-snug" style={{ fontFamily: 'Inter, sans-serif' }}>
              Six districts, one curfew, and a signal nobody admits to sending.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-6 md:mt-[22svh]">
            <div ref={(el) => (slotsRef.current[1] = el)} data-depth="-0.25" className="aspect-[4/5] w-full" />
          </div>
          <div className="md:col-span-3 md:col-start-10">
            <div ref={destRef} className="aspect-[3/4] w-full" />
          </div>
        </div>
        <div className="mt-[12svh] grid md:grid-cols-12">
          <div className="md:col-span-5 md:col-start-3">
            <div ref={(el) => (slotsRef.current[2] = el)} data-depth="0.5" className="aspect-[3/2] w-full" />
          </div>
        </div>
      </section>
      <div className="relative z-10 h-[60svh]" />
    </div>
  )
}
