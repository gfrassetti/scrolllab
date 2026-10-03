import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { createFrameBudget } from '../../../lib/motion'
import ScrollFog from './ScrollFog'

const SERVICES = [
  {
    title: 'Service 01',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Placeholder service copy.',
    side: 'left',
  },
  {
    title: 'Service 02',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Placeholder service copy.',
    side: 'right',
  },
  {
    title: 'Service 03',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Placeholder service copy.',
    side: 'left',
  },
  {
    title: 'Service 04',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Placeholder service copy.',
    side: 'right',
  },
]

/**
 * ServicesStone — pinned services scene with a scroll-scrubbed WebGL
 * “stone” block and cards that resolve around it (Trionn-inspired).
 *
 * Per-service title/body are editable from the builder via
 * service1Title / service1Body … service4Body.
 */
export default function ServicesStone({
  eyebrow = 'Section eyebrow',
  title = 'Placeholder services statement.',
  service1Title,
  service1Body,
  service2Title,
  service2Body,
  service3Title,
  service3Body,
  service4Title,
  service4Body,
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)

  const overrides = [
    { title: service1Title, body: service1Body },
    { title: service2Title, body: service2Body },
    { title: service3Title, body: service3Body },
    { title: service4Title, body: service4Body },
  ]
  const reducedMotion = useReducedMotion()
  const services = SERVICES.map((service, i) => ({
    ...service,
    title: overrides[i]?.title || service.title,
    body: overrides[i]?.body || service.body,
  }))

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
      // En un teléfono (DPR 3) 1.5 se ve igual de nítido y cuesta la mitad de GPU.
      const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40)
      camera.position.z = 7

      const geo = new THREE.BoxGeometry(2.4, 2.4, 2.4)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a3f48,
        roughness: 0.85,
        metalness: 0.15,
        flatShading: true,
      })
      const stone = new THREE.Mesh(geo, mat)
      // carved mark
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 1.4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6 }),
      )
      mark.position.z = 1.21
      stone.add(mark)
      scene.add(stone)
      scene.add(new THREE.AmbientLight(0xffffff, 0.45))
      const key = new THREE.DirectionalLight(0xffffff, 1.2)
      key.position.set(4, 5, 6)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x88a0ff, 0.35)
      fill.position.set(-4, -2, 2)
      scene.add(fill)

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
      }
      resize()
      window.addEventListener('resize', resize)

      // Two absolute slots (left / right). Cards share slots by index parity —
      // must crossfade pairs or titles stack on top of each other.
      const cards = gsap.utils.toArray('[data-service-card]')
      // Sin motion no se pincha ni se scrubea: las cuatro tarjetas quedan a la
      // vista (el JSX las pone en grilla) y la piedra, quieta.
      if (!reduced) {
        const pairA = cards.filter((_, i) => i < 2)
        const pairB = cards.filter((_, i) => i >= 2)
        gsap.set(cards, { autoAlpha: 0, y: 28 })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=320%',
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
        })

        tl.to(
          stone.rotation,
          {
            x: 1.1,
            y: 2.4,
            ease: 'none',
          },
          0,
        )
        tl.to(
          stone.position,
          {
            y: 0.15,
            ease: 'none',
          },
          0,
        )

        tl.to(
          pairA,
          { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.06, ease: 'power2.out' },
          0.1,
        )
        tl.to(
          pairA,
          { autoAlpha: 0, y: -20, duration: 0.14, ease: 'power1.in' },
          0.48,
        )
        tl.fromTo(
          pairB,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.06, ease: 'power2.out' },
          0.52,
        )

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
      const tick = (time, deltaMs) => {
        if (!onScreen) return
        renderer.render(scene, camera)
        budget.tick(deltaMs)
      }
      gsap.ticker.add(tick)

      return () => {
        window.removeEventListener('resize', resize)
        gsap.ticker.remove(tick)
        io.disconnect()
        renderer.dispose()
        geo.dispose()
        mat.dispose()
        mark.geometry.dispose()
        mark.material.dispose()
      }
    },
    { scope: root },
  )

  return (
    <section
      id="services"
      ref={root}
      className="relative bg-[#0b0c10] text-white"
    >
      <div className={`relative overflow-hidden ${reducedMotion ? 'min-h-svh' : 'h-svh'}`}>
        <ScrollFog density={0.65} />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <div className="relative z-10 flex h-full flex-col px-5 pt-24 pb-8 md:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[11px] tracking-[0.25em] text-white/40 uppercase">
              {eyebrow}
            </p>
            <p className="max-w-[36ch] text-right text-xs text-white/45 md:text-sm">
              Lorem ipsum dolor sit amet — placeholder support line for this
              section.
            </p>
          </div>

          <div
            className={
              reducedMotion
                ? 'mt-8 grid flex-1 content-center gap-8 py-8 sm:grid-cols-2'
                : 'relative mt-8 flex-1'
            }
          >
            {services.map((service, i) => (
              <article
                key={i}
                data-service-card
                className={`max-w-[280px] md:max-w-[320px] ${
                  reducedMotion
                    ? ''
                    : service.side === 'left'
                      ? 'absolute left-0 top-[12%] md:top-[18%]'
                      : 'absolute right-0 bottom-[18%] md:bottom-[22%]'
                }`}
              >
                <h3 className="text-[clamp(1.25rem,2.4vw,1.85rem)] leading-tight font-medium tracking-[-0.02em]">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {service.body}
                </p>
              </article>
            ))}
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4">
            <p className="text-[11px] tracking-[0.2em] text-white/40 uppercase">
              ✦ {title}
            </p>
            <a
              href="#facts"
              className="tpl-link tpl-hit relative text-[11px] tracking-[0.2em] text-white uppercase"
            >
              View services →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
