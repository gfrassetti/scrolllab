import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import sceneA from './assets/scene-a.png'
import sceneB from './assets/scene-b.png'
import sceneC from './assets/scene-c.png'

const defaultScenes = [
  {
    kicker: 'Scene A',
    title: 'Placeholder scene one',
    body: 'Generic supporting copy. Each block of text swaps the pinned image beside it as it scrolls into view.',
    img: sceneA,
  },
  {
    kicker: 'Scene B',
    title: 'Placeholder scene two',
    body: 'Swap this text for your own narrative beat. The image column stays fixed while the story flows past it.',
    img: sceneB,
  },
  {
    kicker: 'Scene C',
    title: 'Placeholder scene three',
    body: 'The final beat of this chapter. On small screens each scene simply carries its own inline image.',
    img: sceneC,
  },
]

/**
 * StickyImageStory — classic scrollytelling pattern: a sticky image
 * column on the left, narrative blocks flowing on the right. Each
 * block crossfades the pinned image. On mobile, images render inline.
 */
export default function StickyImageStory({
  chapter = '02',
  total = '06',
  label = 'Sticky story',
  scenes = defaultScenes,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px)', () => {
        const images = gsap.utils.toArray('[data-scene-img]')
        const steps = gsap.utils.toArray('[data-scene-step]')

        const activate = (index) => {
          images.forEach((img, i) => {
            gsap.to(img, {
              opacity: i === index ? 1 : 0,
              scale: i === index ? 1 : 1.06,
              duration: 0.7,
              ease: 'power2.out',
              overwrite: true,
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
    <section ref={root} className="px-5 md:px-10">
      <div className="mb-10 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          Chapter {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        {/* Sticky image column — desktop only */}
        <div className="hidden md:block">
          <div className="sticky top-0 flex h-svh items-center py-10">
            <div className="relative aspect-3/4 w-full max-w-115 overflow-hidden">
              {scenes.map((scene, i) => (
                <img
                  key={scene.img}
                  data-scene-img
                  src={scene.img}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Narrative steps */}
        <div>
          {scenes.map((scene, i) => (
            <article
              key={scene.title}
              data-scene-step
              className="flex min-h-[70svh] flex-col justify-center gap-5 py-14 md:min-h-svh md:py-0"
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-accent md:text-xs">
                {scene.kicker} — {String(i + 1).padStart(2, '0')}
              </p>

              <img
                src={scene.img}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-full object-cover md:hidden"
              />

              <h3 className="text-[clamp(1.8rem,4.5vw,3.6rem)] leading-[1.02] font-medium tracking-[-0.02em]">
                {scene.title}
              </h3>
              <p className="max-w-[42ch] text-sm leading-relaxed text-ink/70 md:text-base">
                {scene.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
