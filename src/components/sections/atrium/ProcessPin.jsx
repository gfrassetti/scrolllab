import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import model from './assets/model.jpg'
import material from './assets/material.jpg'
import orbitSite from './assets/orbit-site.jpg'

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
 */
export default function ProcessPin({ label = 'Approach', scenes = defaultScenes }) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="approach"
      className="bg-atrium-paper px-5 pb-[18svh] text-atrium-ink md:px-10"
    >
      <p className="atrium-note pt-[10svh] pb-[6svh] font-display text-atrium-ink/65">{label}</p>
      <div className="grid gap-10 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] md:gap-20">
        <div className="hidden md:block">
          <div className="sticky top-0 flex h-svh items-center py-[9svh]">
            <div className="relative aspect-3/4 w-full overflow-hidden">
              <div data-process-media className="absolute -inset-[12%] will-change-transform">
                {scenes.map((scene, i) => (
                  <img
                    key={scene.title}
                    data-process-img
                    src={scene.img}
                    alt=""
                    className="absolute inset-0 h-full w-full max-w-none object-cover"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          {scenes.map((scene) => (
            <article
              key={scene.title}
              data-process-step
              className="flex min-h-[76svh] flex-col justify-center gap-6 py-12 md:min-h-svh md:gap-8 md:py-0"
            >
              <p className="atrium-note font-display text-atrium-ink/65">{scene.kicker}</p>
              <img
                src={scene.img}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-full object-cover md:hidden"
              />
              <h3 className="atrium-mid max-w-[13ch]">{scene.title}</h3>
              <p className="max-w-[22ch] font-display text-[clamp(1.15rem,2.6vw,2.35rem)] leading-[1.16] text-atrium-ink/80">
                {scene.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
