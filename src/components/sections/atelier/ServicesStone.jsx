import { useRef, useState } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { createFrameBudget, fitCameraDistance, trackPointer } from '../../../lib/motion'
import ScrollFog from './ScrollFog'
import { createStudioPiece } from './studioPiece'

const SERVICES = [
  {
    title: 'Interiors',
    body: 'Homes, hotels and restaurants, from the first layout to the last detail on site.',
    material: 'Travertine',
  },
  {
    title: 'Furniture',
    body: 'Pieces designed for one room and made by hand in our workshop in Brianza.',
    material: 'Oak',
  },
  {
    title: 'Materials',
    body: 'A library of stone, timber and textile, chosen again for every project.',
    material: 'Linen',
  },
  {
    title: 'Identity',
    body: 'Names, signage and print for the places we design, so the door matches the room.',
    material: 'Ink',
  },
]

const PIECE_FOV = 36
const PIECE_Z = 6.6
const PIECE_RADIUS = 2.3

// Where the four services sit along the pinned scroll: a margin at each end
// and an even share of the rest.
const LEAD = 0.1
const SPAN = 0.8

/**
 * ServicesStone — the same bench as the hero, now showing what the studio
 * works in. Scrolling (or choosing a service) walks the piece through four
 * materials with a sweep — travertine, oak, linen, ink — one for each service;
 * the chosen service opens, the others step back.
 *
 * Per-service title/body are editable from the builder via
 * service1Title / service1Body … service4Body, and the material names via
 * material1 … material4.
 */
export default function ServicesStone({
  eyebrow = 'Services',
  title = 'Four things, done properly.',
  service1Title,
  service1Body,
  service2Title,
  service2Body,
  service3Title,
  service3Body,
  service4Title,
  service4Body,
  material1,
  material2,
  material3,
  material4,
  note = 'Every project keeps one lead designer, from the first meeting to the day we hand over the keys.',
  cta = 'See selected work →',
  ctaHref = '#work',
  bg,
  fg,
  /** La pieza 3D: el tinte de la banca, el color de la vasija y la luz de relleno. */
  objectColor,
  markColor,
  lightColor,
  /** La niebla que se mueve con el scroll (sale del fondo y del texto). */
  showFog = 'on',
}) {
  const root = useRef(null)
  const fogBg = bg || '#0b0c10'
  const fogFg = fg || '#ffffff'
  const canvasRef = useRef(null)
  const stRef = useRef(null)
  const [active, setActive] = useState(0)

  const overrides = [
    { title: service1Title, body: service1Body, material: material1 },
    { title: service2Title, body: service2Body, material: material2 },
    { title: service3Title, body: service3Body, material: material3 },
    { title: service4Title, body: service4Body, material: material4 },
  ]
  const reducedMotion = useReducedMotion()
  const services = SERVICES.map((service, i) => ({
    title: overrides[i]?.title || service.title,
    body: overrides[i]?.body || service.body,
    material: overrides[i]?.material || service.material,
  }))

  // Choosing a service scrolls the pinned scene to where its material shows.
  const goTo = (i) => {
    const st = stRef.current
    if (!st) return setActive(i)
    const top = st.start + (st.end - st.start) * (LEAD + (i / (services.length - 1)) * SPAN)
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(top, { duration: 1.1 })
    else window.scrollTo({ top, behavior: 'smooth' })
  }

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
      renderer.toneMappingExposure = 0.95
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(PIECE_FOV, 1, 0.1, 60)
      const piece = createStudioPiece(renderer, scene, { tint: objectColor, vessel: markColor })
      if (lightColor) piece.fill.color.set(lightColor)
      const { group } = piece
      const pointer = trackPointer()

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        const z = fitCameraDistance({ fov: PIECE_FOV, aspect: camera.aspect, radius: PIECE_RADIUS, base: PIECE_Z })
        camera.position.set(0, 1.7, z)
        camera.lookAt(0, 0.05, 0)
        camera.updateProjectionMatrix()
        const halfW = Math.tan((PIECE_FOV * Math.PI) / 360) * z * camera.aspect
        const wide = camera.aspect > 1.15
        // en pantalla ancha la lista queda a la izquierda y la banca a la derecha
        const halfH = Math.tan((PIECE_FOV * Math.PI) / 360) * z
        // En calma, en pantallas chicas, el canvas va en el flujo arriba de la lista: la banca al centro.
        const inFlow = getComputedStyle(canvas).position === 'relative'
        if (inFlow) piece.place(0, 0, 0.8)
        else piece.place(wide ? halfW * 0.4 : 0, wide ? 0 : halfH * 0.34, wide ? 1.05 : 0.8)
      }
      resize()
      window.addEventListener('resize', resize)

      // `s`: 0 = first service … 3 = last; the progress line follows the scroll
      const state = { s: 0, p: 0 }
      let st = null
      if (!reduced) {
        st = ScrollTriggerPin(root.current, state, services.length, setActive)
        stRef.current = st
      }

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

      let yaw = 0.3
      let pitch = 0
      const tick = (time, deltaMs) => {
        if (!onScreen) return
        const frac = state.s - Math.floor(state.s)
        // while the sweep crosses, the piece lifts apart a little, like being re-made
        const lift = state.s >= services.length - 1 ? 0 : Math.sin(Math.PI * THREE.MathUtils.clamp((frac - 0.45) / 0.55, 0, 1)) * 0.3
        const targetYaw = 0.35 + state.p * 0.7 + pointer.x * 0.35 + (reduced ? 0 : Math.sin(time * 0.4) * 0.05)
        const targetPitch = -pointer.y * 0.08
        yaw += (targetYaw - yaw) * 0.07
        pitch += (targetPitch - pitch) * 0.07
        group.rotation.set(pitch, yaw, 0)
        piece.setMaterial(state.s)
        piece.setExplode(lift)
        renderer.render(scene, camera)
        budget.tick(deltaMs)
      }
      gsap.ticker.add(tick)

      return () => {
        stRef.current = null
        st?.kill()
        pointer.dispose()
        window.removeEventListener('resize', resize)
        gsap.ticker.remove(tick)
        io.disconnect()
        piece.dispose()
        renderer.dispose()
      }
    },
    { scope: root, dependencies: [objectColor, markColor, lightColor], revertOnUpdate: true },
  )

  return (
    <section
      id="services"
      ref={root}
      className="relative bg-(--sec-bg) text-current"
      style={{
        '--sec-bg': bg || '#0b0c10',
        color: fg || '#ffffff',
      }}
    >
      <div data-services-pin className={`relative overflow-hidden ${reducedMotion ? 'min-h-svh' : 'h-svh'}`}>
        {showFog !== 'off' && <ScrollFog density={0.65} bg={fogBg} fg={fogFg} />}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`pointer-events-none z-[1] w-full ${
            reducedMotion ? 'relative mt-16 h-[40svh] lg:absolute lg:inset-0 lg:mt-0 lg:h-full' : 'absolute inset-0 h-full'
          }`}
        />

        <div className={`relative z-10 flex h-full flex-col px-5 pb-8 md:px-10 ${reducedMotion ? 'pt-6 lg:pt-24' : 'pt-24'}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[11px] tracking-[0.25em] text-current/40 uppercase">
              {eyebrow}
            </p>
            <p className="max-w-[36ch] text-right text-xs text-current/45 md:text-sm">
              {note}
            </p>
          </div>

          <div className="relative mt-6 flex flex-1 items-end pb-4 md:mt-8 md:items-center md:pb-0">
            <ol className="relative w-full max-w-[34rem] space-y-1 pl-6 md:space-y-2 md:pl-8">
              {/* the line fills as the scroll walks the four materials */}
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-px bg-current/15" />
              <span
                aria-hidden="true"
                data-services-line
                className="absolute top-2 bottom-2 left-0 w-px origin-top scale-y-0 bg-current"
              />
              {services.map((service, i) => {
                const open = reducedMotion || active === i
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={active === i ? 'true' : undefined}
                      className="group relative block min-h-11 w-full py-1.5 text-left"
                    >
                      <span
                        className={`block text-[clamp(1.6rem,4.4vw,3.6rem)] leading-[1.02] font-medium tracking-[-0.03em] transition-[opacity,transform] duration-500 ease-out ${
                          open ? 'translate-x-0 opacity-100' : 'opacity-35 group-hover:translate-x-1.5 group-hover:opacity-70'
                        }`}
                      >
                        {service.title}
                        <span className="ml-3 align-middle text-[11px] font-normal tracking-[0.2em] text-current/40 uppercase">
                          {service.material}
                        </span>
                      </span>
                      <span
                        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
                          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <span className="overflow-hidden">
                          <span className="mt-2 block max-w-[38ch] text-sm leading-relaxed text-current/60 md:text-[15px]">
                            {service.body}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-current/10 pt-4">
            <p className="text-[11px] tracking-[0.2em] text-current/40 uppercase">
              ✦ {title}
              <span className="ml-3 text-current/70" data-services-material>
                {services[active]?.material}
              </span>
            </p>
            <a
              href={ctaHref}
              className="tpl-link tpl-hit relative text-[11px] tracking-[0.2em] text-current uppercase"
            >
              {cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * The pinned scroll that walks the four services. `state.s` goes 0 → n-1 across
 * the middle of the scroll (a margin at each end); `state.p` is the whole
 * progress. The active service and the line follow it.
 */
function ScrollTriggerPin(section, state, count, setActive) {
  const line = section.querySelector('[data-services-line]')
  let last = -1
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=320%',
      // se pincha el contenido, no la sección: React es dueño de la sección (el builder la re-renderiza)
      pin: section.querySelector('[data-services-pin]'),
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress
        state.p = p
        state.s = THREE.MathUtils.clamp((p - LEAD) / SPAN, 0, 1) * (count - 1)
        const idx = Math.round(state.s)
        if (idx !== last) {
          last = idx
          setActive(idx)
        }
        if (line) line.style.transform = `scaleY(${THREE.MathUtils.clamp((p - LEAD) / SPAN, 0, 1)})`
      },
    },
  })
  return tl.scrollTrigger
}
