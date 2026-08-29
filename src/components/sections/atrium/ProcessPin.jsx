import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import model from './assets/model.jpg'
import material from './assets/material.jpg'
import gallery from './assets/gallery.jpg'

const defaultScenes = [
  {
    kicker: 'Sketch',
    title: 'From paper to mass',
    body: 'Early volumes are tested as models. Circulation, light, and the first structural rhythm get decided here, before a facade is named.',
    img: model,
  },
  {
    kicker: 'Envelope',
    title: 'Material as climate',
    body: 'Stone, timber, and metal are chosen for how they weather, not how they photograph. The joint is the drawing.',
    img: material,
  },
  {
    kicker: 'Light',
    title: 'Rooms that hold still',
    body: 'The last pass is quiet: openings, thresholds, and the pause between them. A gallery, a house, a hall: same discipline.',
    img: gallery,
  },
]

/**
 * ProcessPin — sticky image, copy flows past and swaps the frame (P1 + P3).
 */
export default function ProcessPin({
  label = 'Approach',
  scenes = defaultScenes,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const mm = gsap.matchMedia()
      const media = root.current.querySelector('[data-process-media]')
      if (media) {
        gsap.fromTo(
          media,
          { yPercent: -10, scale: 1.14 },
          {
            yPercent: 10,
            scale: 1.06,
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
    <section ref={root} id="approach" className="border-t border-[#111]/12 px-5 md:px-10">
      <p className="pt-6 text-[11px] tracking-[0.28em] text-[#111]/45 uppercase">{label}</p>
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="hidden md:block">
          <div className="sticky top-0 flex h-svh items-center py-10">
            <div className="relative aspect-4/3 w-full overflow-hidden">
              <div data-process-media className="absolute -inset-[14%] will-change-transform">
                {scenes.map((scene, i) => (
                  <img
                    key={scene.title}
                    data-process-img
                    src={scene.img}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          {scenes.map((scene, i) => (
            <article
              key={scene.title}
              data-process-step
              className="flex min-h-[70svh] flex-col justify-center gap-5 py-14 md:min-h-svh md:py-0"
            >
              <p className="text-[11px] tracking-[0.28em] text-[#111]/45 uppercase">
                {scene.kicker}
              </p>
              <img
                src={scene.img}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-full object-cover md:hidden"
              />
              <h3 className="font-display text-[clamp(2rem,5vw,3.6rem)] leading-[0.92] tracking-[-0.03em]">
                {scene.title}
              </h3>
              <p className="max-w-md text-[15px] leading-relaxed text-[#111]/65">{scene.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
