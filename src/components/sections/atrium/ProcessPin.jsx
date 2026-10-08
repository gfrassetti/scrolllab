import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { model, material, orbitSite, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultScenes = [
  {
    kicker: '01',
    title: 'Placeholder stage one',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    img: model,
  },
  {
    kicker: '02',
    title: 'Placeholder stage two',
    body: 'Et dolore magna aliqua, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.',
    img: material,
  },
  {
    kicker: '03',
    title: 'Placeholder stage three',
    body: 'Ut aliquip ex ea commodo consequat, duis aute irure dolor in reprehenderit in voluptate velit.',
    img: orbitSite,
  },
]

/**
 * ProcessPin — sticky photograph, copy flows past and swaps the frame
 * (P1 + P3). The picture drifts inside its crop the whole way (P2).
 *
 * En el teléfono (< 768) cada paso trae su foto en línea: la foto entra con
 * un zoom suave y el texto sube al aparecer — antes ahí no se animaba nada.
 *
 * Calma: la foto pegada no cambia (el swap lo dispara el scroll), así que en
 * calma no hay columna pegada: cada paso va con su foto en línea, en todos los
 * anchos, y entra con un fundido.
 */
export default function ProcessPin({ label = 'Approach', scenes = defaultScenes , bg, fg }) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-process-step]', { y: 16, stagger: 0.1 })

      const mm = gsap.matchMedia()
      const media = root.current.querySelector('[data-process-media]')
      if (media) {
        gsap.fromTo(
          media,
          { yPercent: -8, scale: 1.14 },
          {
            yPercent: 8,
            scale: 1.04,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.5,
            },
          },
        )
      }

      mm.add('(max-width: 767px)', () => {
        gsap.utils.toArray('[data-process-step]').forEach((step) => {
          const img = step.querySelector('[data-process-inline]')
          const bits = step.querySelectorAll('[data-process-bit]')
          if (img) {
            gsap.fromTo(
              img,
              { scale: 1.16 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: { trigger: step, start: 'top bottom', end: 'center center', scrub: 0.5 },
              },
            )
          }
          gsap.from(bits, {
            y: 28,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: step, start: 'top 72%', once: true },
          })
        })
      })

      mm.add('(min-width: 768px)', () => {
        const images = gsap.utils.toArray('[data-process-img]')
        const steps = gsap.utils.toArray('[data-process-step]')
        const activate = (index) => {
          images.forEach((img, i) => {
            gsap.to(img, {
              opacity: i === index ? 1 : 0,
              duration: 0.7,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          })
        }
        steps.forEach((step, i) => {
          ScrollTrigger.create({
            trigger: step,
            start: 'top 55%',
            end: 'bottom 55%',
            onEnter: () => activate(i),
            onEnterBack: () => activate(i),
          })
        })
      })
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <section
      ref={root}
      id="approach"
      className="bg-atrium-paper px-5 pb-[18svh] text-atrium-ink md:px-10"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--color-atrium-paper': bg || undefined,
        '--atrium-paper': bg || undefined,
        '--color-atrium-ink': fg || undefined,
        '--atrium-ink': fg || undefined,
      }}
    >
      <p className="atrium-note pt-[10svh] pb-[6svh] font-display text-atrium-ink/65">{label}</p>
      <div className="grid gap-10 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] md:gap-20 calm:md:grid-cols-1">
        <div className="hidden md:block calm:md:hidden">
          <div className="sticky top-0 flex h-svh items-center py-[9svh]">
            <div className="relative aspect-3/4 w-full overflow-hidden">
              <div data-process-media className="absolute -inset-[12%] will-change-transform">
                {scenes.map((scene, i) => (
                  <img
                    key={scene.title}
                    data-process-img
                    {...imgAttrs(scene.img, variants)}
                    sizes="100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full max-w-none object-cover"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="calm:md:mx-auto calm:md:w-full calm:md:max-w-3xl">
          {scenes.map((scene) => (
            <article
              key={scene.title}
              data-process-step
              className="flex min-h-[76svh] flex-col justify-center gap-6 py-12 md:min-h-svh md:gap-8 md:py-0 calm:md:min-h-0 calm:md:py-16"
            >
              <p data-process-bit className="atrium-note font-display text-atrium-ink/65">{scene.kicker}</p>
              <div className="aspect-4/3 w-full overflow-hidden md:hidden calm:md:block">
                <img
                  data-process-inline
                  {...imgAttrs(scene.img, variants)}
                  sizes="(min-width: 768px) 48rem, 100vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover will-change-transform"
                />
              </div>
              <h3 data-process-bit className="atrium-mid max-w-[13ch]">{scene.title}</h3>
              <p
                data-process-bit
                className="max-w-[22ch] font-display text-[clamp(1.15rem,2.6vw,2.35rem)] leading-[1.16] text-atrium-ink/80"
              >
                {scene.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
