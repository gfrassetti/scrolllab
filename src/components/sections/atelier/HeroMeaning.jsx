import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { createFrameBudget, fitCameraDistance, prefersReducedMotion, trackPointer } from '../../../lib/motion'
import ScrollFog from './ScrollFog'
import { createMaquette } from './maquette'

// Cámara de la pieza. En PC queda en PIECE_Z; en vertical se aleja (`fitCameraDistance`)
// hasta que la banca entra en el ancho (con la vasija y las patas abiertas).
const PIECE_FOV = 38
const PIECE_Z = 7.2
const PIECE_RADIUS = 2.2

/**
 * HeroMeaning — the studio's architectural model, in 3D (see maquette.js):
 * the plan is drawn on an oak base, the slab and the glass ground floor arrive
 * as the page opens, and the scroll (pinned) assembles the rest — the
 * cantilevered floor, the upper volume, the stair tower, the roof — piece by
 * piece, while the model turns. The letters of the title step aside when the
 * mouse comes near.
 */
export default function HeroMeaning({
  line1 = 'Buildings that',
  line2 = 'hold the light.',
  hint = 'Scroll to build',
  meta = 'Atelier Nove — Architecture & Interiors — Milan',
  body = 'An architecture and interiors studio. Houses, hotels and the rooms inside them, from the first sketch to the last fitting.',
  bg,
  fg,
  /** La maqueta: el color de la cartulina y el de los árboles. */
  objectColor,
  ringColor,
  /** La niebla que se mueve con el scroll (sale del fondo y del texto). */
  showFog = 'on',
}) {
  const root = useRef(null)
  const fogBg = bg || '#0b0c10'
  const fogFg = fg || '#ffffff'
  const canvasRef = useRef(null)

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      // En un teléfono las letras entran sin desenfoque: veinte capas con
      // `filter` animado, justo cuando el 3D está arrancando, traban.
      const coarse = window.matchMedia('(pointer: coarse)').matches

      // Sin máscara: las letras se mueven fuera de su caja cuando el puntero se acerca.
      const split = new SplitText('[data-atelier-hero]', { type: 'chars' })
      // opacity (no autoAlpha): el texto sigue en el árbol de accesibilidad mientras entra
      gsap.set(split.chars, coarse ? { opacity: 0, y: 24 } : { opacity: 0, y: 24, filter: 'blur(12px)' })
      let intro = false
      gsap.to(split.chars, {
        opacity: 1,
        y: 0,
        ...(coarse ? {} : { filter: 'blur(0px)' }),
        duration: 0.9,
        stagger: { each: 0.035, from: 'random' },
        ease: 'power3.out',
        delay: 0.2,
        onComplete: () => {
          intro = true
        },
      })

      // —— Three: the studio piece ——
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
      // En un teléfono (DPR 3) 1.5 se ve igual de nítido y cuesta la mitad de GPU.
      const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.9
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(PIECE_FOV, 1, 0.1, 60)
      const piece = createMaquette(renderer, scene, { tint: objectColor, accent: ringColor })
      const { group } = piece

      // El mouse en PC, el dedo en el teléfono (un dedo que scrollea cancela
      // pointermove y la pieza quedaba sin reaccionar).
      const pointer = trackPointer()

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        const z = fitCameraDistance({ fov: PIECE_FOV, aspect: camera.aspect, radius: PIECE_RADIUS, base: PIECE_Z })
        // vista de maqueta: desde arriba, como se mira sobre la mesa del estudio
        camera.position.set(0, z * 0.48, z)
        camera.lookAt(0, -0.35, 0)
        camera.updateProjectionMatrix()
        // en pantalla ancha la banca queda a la derecha, detrás del titular a la izquierda;
        // en vertical, arriba del texto
        const halfW = Math.tan((PIECE_FOV * Math.PI) / 360) * z * camera.aspect
        const wide = camera.aspect > 1.15
        const halfH = Math.tan((PIECE_FOV * Math.PI) / 360) * z
        piece.place(wide ? halfW * 0.5 : 0, wide ? 0.05 : halfH * 0.32, wide ? 0.74 : 0.62)
      }
      resize()
      window.addEventListener('resize', resize)

      // la maqueta se arma: al cargar llegan la losa y la planta baja; el resto, con el scroll
      const build = { intro: 0, scroll: 0 }
      gsap.to(build, { intro: 1, duration: 2.4, delay: 0.4, ease: 'power2.out' })
      const st = gsap.to(
        {},
        {
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=140%',
            pin: root.current.querySelector('[data-hero-pin]'),
            scrub: 0.6,
            anticipatePin: 1,
            onUpdate: (self) => {
              build.scroll = self.progress
            },
          },
        },
      )

      // Fuera de pantalla no se dibuja: en un teléfono la GPU seguía renderizando
      // el 3D mientras se leía el resto de la página.
      let onScreen = true
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(root.current)

      // Si el teléfono no llega a ~30 cuadros baja la resolución de a escalones.
      const budget = createFrameBudget({
        dpr,
        apply: (value) => {
          renderer.setPixelRatio(value)
          resize()
        },
      })

      // Las letras se apartan del puntero: cada una guarda el centro de su caja.
      const chars = split.chars.map((el) => ({
        el,
        x: gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' }),
        cx: 0,
        cy: 0,
      }))
      const measure = () => {
        chars.forEach((c) => {
          const r = c.el.getBoundingClientRect()
          c.cx = r.left + r.width / 2 - (gsap.getProperty(c.el, 'x') || 0)
          c.cy = r.top + r.height / 2 - (gsap.getProperty(c.el, 'y') || 0)
        })
      }
      const measured = gsap.delayedCall(1.6, measure)
      window.addEventListener('resize', measure)
      const REACH = 170
      // Sin mouse todavía el puntero «está» en el centro de la pantalla: las
      // letras de ahí se corrían solas al cargar. Se apartan recién cuando el mouse se mueve.
      let moved = false
      const onMove = () => {
        moved = true
      }
      window.addEventListener('pointermove', onMove, { passive: true, once: true })

      let yaw = 0.55
      let pitch = 0
      const tick = (time, deltaMs) => {
        if (!onScreen) return
        // un vaivén lento y la mirada del puntero; mientras se arma, la maqueta gira despacio
        const targetYaw = -0.55 + (reduced ? 0 : Math.sin(time * 0.22) * 0.5) + pointer.x * 0.35 + build.scroll * 0.9
        const targetPitch = -pointer.y * 0.06
        yaw += (targetYaw - yaw) * 0.06
        pitch += (targetPitch - pitch) * 0.06
        group.rotation.set(pitch, yaw, 0)
        piece.setBuild(reduced ? 1 : build.intro * 0.3 + build.scroll * 0.7)
        renderer.render(scene, camera)
        budget.tick(deltaMs)

        if (intro && moved && !coarse && !reduced) {
          for (const c of chars) {
            const dx = c.cx - pointer.clientX
            const dy = c.cy - pointer.clientY
            const dist = Math.hypot(dx, dy) || 1
            const f = Math.max(0, 1 - dist / REACH)
            const push = f * f * 46
            c.x((dx / dist) * push)
            c.y((dy / dist) * push)
          }
        }
      }
      gsap.ticker.add(tick)

      gsap.from('[data-atelier-meta]', {
        opacity: 0,
        y: 16,
        duration: 0.9,
        delay: 0.9,
        stagger: 0.1,
      })

      return () => {
        window.removeEventListener('pointermove', onMove)
        pointer.dispose()
        window.removeEventListener('resize', resize)
        window.removeEventListener('resize', measure)
        measured.kill()
        gsap.ticker.remove(tick)
        io.disconnect()
        st.scrollTrigger?.kill()
        st.kill()
        piece.dispose()
        renderer.dispose()
        split.revert()
      }
    },
    { scope: root, dependencies: [objectColor, ringColor], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      className="bg-(--sec-bg) text-current"
      style={{
        '--sec-bg': bg || '#0b0c10',
        color: fg || '#ffffff',
      }}
    >
      <div data-hero-pin className="relative flex min-h-svh flex-col justify-between overflow-hidden px-5 pt-24 pb-8 md:px-10 md:pt-28">
      {showFog !== 'off' && <ScrollFog density={0.7} bg={fogBg} fg={fogFg} />}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
      />

      <p
        data-atelier-meta
        className="relative z-10 max-w-[36ch] text-[11px] tracking-[0.22em] text-current/45 uppercase"
      >
        {meta}
      </p>

      <div className="relative z-[2] mix-blend-difference">
        <h1
          data-atelier-hero
          className="max-w-[12ch] font-brico text-[clamp(2.8rem,10vw,7.5rem)] leading-[0.9] font-semibold tracking-[-0.04em]"
        >
          {line1}
          <br />
          {line2}
        </h1>
      </div>

      <div className="relative z-10 flex flex-col gap-3 border-t border-current/15 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <p
          data-atelier-meta
          className="max-w-[40ch] text-sm text-current/55"
        >
          {body}
        </p>
        <p
          data-atelier-meta
          className="shrink-0 text-[11px] tracking-[0.22em] text-current/50 uppercase"
        >
          {hint} ↓
        </p>
      </div>
      </div>
    </section>
  )
}
