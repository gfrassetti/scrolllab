import { useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { sceneA, sceneB, sceneC, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

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
 *
 * En el teléfono (< 768) cada escena trae su foto en línea: la foto entra con
 * un zoom suave y el texto sube al aparecer — antes ahí no se animaba nada.
 *
 * Calma: la foto pegada no cambia (el cambio lo dispara el scroll), así que con
 * ella, en tablet y escritorio, las fotos de la escena B y C nunca se veían. Sin
 * movimiento no hay columna pegada: cada escena va con su foto en línea, en todos
 * los anchos, y entra con un fundido.
 */
export default function StickyImageStory({
  chapter = '02',
  total = '06',
  label = 'Sticky story',
  scenes,
  chapterLabel = 'Chapter',
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)
  // Escenas del builder: una fila sin foto toma la de ejemplo de su lugar, así
  // la columna pegada nunca queda vacía.
  const valid = scenes?.filter((s) => s?.title || s?.body || s?.kicker || s?.img)
  const list = valid?.length
    ? valid.map((s, i) => ({ ...s, img: s.img || defaultScenes[i % defaultScenes.length].img }))
    : defaultScenes

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-scene-step]', { y: 16, stagger: 0.1 })

      const mm = gsap.matchMedia()

      mm.add('(max-width: 767px)', () => {
        gsap.utils.toArray('[data-scene-step]').forEach((step) => {
          const img = step.querySelector('[data-scene-inline]')
          const bits = step.querySelectorAll('[data-scene-bit]')
          if (img) {
            gsap.fromTo(
              img,
              { scale: 1.14 },
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
    <section
      ref={root}
      className="px-5 md:px-10"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--market-ink': fg || undefined,
        '--market-bone': bg || undefined,
        '--color-accent': accent || undefined,
      }}
    >
      <div className="mb-10 flex items-baseline justify-between border-t border-ink/15 pt-4 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
          {chapterLabel} {chapter} / {total}
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-16 calm:md:grid-cols-1">
        {/* Sticky image column — desktop only */}
        <div className="hidden md:block calm:md:hidden">
          <div className="sticky top-0 flex h-svh items-center py-10">
            <div className="relative aspect-3/4 w-full max-w-115 overflow-hidden">
              {list.map((scene, i) => (
                <img
                  key={i}
                  data-scene-img
                  {...imgAttrs(scene.img, variants)}
                  sizes="(min-width: 768px) 460px, 100vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Narrative steps */}
        <div className="calm:md:mx-auto calm:md:w-full calm:md:max-w-3xl">
          {list.map((scene, i) => (
            <article
              key={i}
              data-scene-step
              className="flex min-h-[70svh] flex-col justify-center gap-5 py-14 md:min-h-svh md:py-0 calm:md:min-h-0 calm:md:py-16"
            >
              <p data-scene-bit className="text-[11px] uppercase tracking-[0.25em] text-accent md:text-xs">
                {scene.kicker} — {String(i + 1).padStart(2, '0')}
              </p>

              <div className="aspect-4/3 w-full overflow-hidden md:hidden calm:md:block">
                <img
                  data-scene-inline
                  {...imgAttrs(scene.img, variants)}
                  sizes="(min-width: 768px) 48rem, 100vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover will-change-transform"
                />
              </div>

              <h3
                data-scene-bit
                className="text-[clamp(1.8rem,4.5vw,3.6rem)] leading-[1.02] font-medium tracking-[-0.02em]"
              >
                {scene.title}
              </h3>
              <p data-scene-bit className="max-w-[42ch] text-sm leading-relaxed text-ink/70 md:text-base">
                {scene.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
