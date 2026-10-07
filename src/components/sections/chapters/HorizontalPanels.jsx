import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { panelA, panelB, panelC, panelD, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const defaultPanels = [
  {
    index: '3.1',
    title: 'Placeholder panel',
    caption: 'Generic caption — swap freely',
    img: panelA,
  },
  {
    index: '3.2',
    title: 'Another placeholder',
    caption: 'Each panel is one narrative beat',
    img: panelB,
  },
  {
    index: '3.3',
    title: 'Keeps on going',
    caption: 'The scroll is vertical, the motion horizontal',
    img: panelC,
  },
  {
    index: '3.4',
    title: 'Last frame',
    caption: 'On mobile the panels stack vertically',
    img: panelD,
  },
]

/**
 * HorizontalPanels — the section pins itself while vertical scroll
 * drives a horizontal pan across the panels (desktop only).
 * On mobile / reduced motion it degrades to a vertical stack.
 *
 * `variant="media"` (default): image + caption (Chapters template).
 * `variant="type"`: oversized step titles, no images; letter/word
 * reveals in the ManifestoReveal / HeroKinetic storytelling style.
 *
 * En el teléfono (< 768) las fotos de cada panel entran con un zoom suave y el
 * pie sube al aparecer (antes solo `variant="type"` se animaba ahí).
 *
 * Calma: sin pin ni recorrido horizontal, en tablet y escritorio quedaba un
 * escenario de 100svh con los paneles 2 a 4 tapados fuera de pantalla. Pasa a la
 * pila vertical (clases `calm:`), cada bloque entra con un fundido y los títulos
 * quedan enteros.
 */
export default function HorizontalPanels({
  chapter = '03',
  total = '06',
  label = 'Horizontal drift',
  heading = 'Sideways is a direction too',
  headingBefore,
  headingEm,
  headingAfter,
  panels = defaultPanels,
  variant = 'media',
  /** Idle word opacity for type reveals (home needs readable steps). */
  idleOpacity = 0.12,
}) {
  const root = useRef(null)
  const track = useRef(null)
  const typeOnly = variant === 'type'
  const hasParts =
    headingBefore != null || headingEm != null || headingAfter != null

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        return calmReveal('[data-panels-intro], [data-type-panel], [data-panel-fig]', {
          y: 18,
          stagger: 0.1,
        })
      }

      const mm = gsap.matchMedia()
      const splits = []

      const splitIntro = () => {
        const intro = root.current?.querySelector('[data-panels-intro]')
        if (!intro) return null
        const split = new SplitText(intro, { type: 'words' })
        splits.push(split)
        return split
      }

      const splitTypePanels = () => {
        const articles = gsap.utils.toArray('[data-type-panel]', root.current)
        return articles.map((article) => {
          const title = article.querySelector('[data-panel-title]')
          const caption = article.querySelector('[data-panel-caption]')
          const titleSplit = title
            ? new SplitText(title, { type: 'words' })
            : null
          const captionSplit = caption
            ? new SplitText(caption, { type: 'words', aria: 'none' })
            : null
          if (titleSplit) splits.push(titleSplit)
          if (captionSplit) splits.push(captionSplit)
          return { article, titleSplit, captionSplit }
        })
      }

      const introSplit = typeOnly ? splitIntro() : null
      const panelSplits = typeOnly ? splitTypePanels() : []

      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const getDistance = () =>
            track.current.scrollWidth - window.innerWidth

          const tween = gsap.to(track.current, {
            x: () => -getDistance(),
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: () => `+=${getDistance()}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          if (introSplit) {
            const introEl = root.current.querySelector('[data-panels-intro]')
            gsap.fromTo(
              introSplit.words,
              { opacity: idleOpacity },
              {
                opacity: 1,
                stagger: 0.06,
                ease: 'none',
                scrollTrigger: {
                  trigger: introEl,
                  containerAnimation: tween,
                  start: 'left 85%',
                  end: 'left 25%',
                  scrub: true,
                },
              },
            )
          }

          panelSplits.forEach(({ article, titleSplit, captionSplit }) => {
            if (titleSplit) {
              gsap.fromTo(
                titleSplit.words,
                { opacity: idleOpacity },
                {
                  opacity: 1,
                  stagger: 0.06,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: article,
                    containerAnimation: tween,
                    start: 'left 78%',
                    end: 'left 28%',
                    scrub: true,
                  },
                },
              )
            }
            if (captionSplit) {
              gsap.fromTo(
                captionSplit.words,
                { opacity: idleOpacity },
                {
                  opacity: 1,
                  stagger: 0.05,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: article,
                    containerAnimation: tween,
                    start: 'left 70%',
                    end: 'left 30%',
                    scrub: true,
                  },
                },
              )
            }
            const indexEl = article.querySelector('[data-panel-index]')
            if (indexEl) {
              gsap.fromTo(
                indexEl,
                { opacity: Math.min(1, idleOpacity + 0.15) },
                {
                  opacity: 1,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: article,
                    containerAnimation: tween,
                    start: 'left 82%',
                    end: 'left 55%',
                    scrub: true,
                  },
                },
              )
            }
          })
        },
      )

      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          if (introSplit) {
            gsap.fromTo(
              introSplit.words,
              { opacity: idleOpacity },
              {
                opacity: 1,
                stagger: 0.06,
                ease: 'none',
                scrollTrigger: {
                  trigger: root.current,
                  start: 'top 75%',
                  end: 'top 35%',
                  scrub: true,
                },
              },
            )
          }

          panelSplits.forEach(({ article, titleSplit, captionSplit }) => {
            if (titleSplit) {
              gsap.fromTo(
                titleSplit.words,
                { opacity: idleOpacity },
                {
                  opacity: 1,
                  stagger: 0.06,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: article,
                    start: 'top 80%',
                    end: 'top 40%',
                    scrub: true,
                  },
                },
              )
            }
            if (captionSplit) {
              gsap.fromTo(
                captionSplit.words,
                { opacity: idleOpacity },
                {
                  opacity: 1,
                  stagger: 0.05,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: article,
                    start: 'top 75%',
                    end: 'top 45%',
                    scrub: true,
                  },
                },
              )
            }
          })

          if (!typeOnly) {
            gsap.utils.toArray('[data-panel-fig]').forEach((fig) => {
              const img = fig.querySelector('[data-panel-img]')
              const bits = fig.querySelectorAll('[data-panel-bit]')
              if (img) {
                gsap.fromTo(
                  img,
                  { scale: 1.14 },
                  {
                    scale: 1,
                    ease: 'none',
                    scrollTrigger: { trigger: fig, start: 'top bottom', end: 'center center', scrub: 0.5 },
                  },
                )
              }
              gsap.from(bits, {
                y: 24,
                opacity: 0,
                duration: 0.7,
                ease: 'power3.out',
                stagger: 0.08,
                scrollTrigger: { trigger: fig, start: 'top 78%', once: true },
              })
            })
          }
        },
      )

      return () => {
        splits.forEach((s) => s.revert())
        mm.revert()
      }
    },
    { scope: root, dependencies: [variant, panels.length, idleOpacity] },
  )

  return (
    <section ref={root} className="relative overflow-hidden md:h-svh calm:md:h-auto">
      {/* Pinneada, la sección queda en el tope del viewport: el rótulo baja
          lo que mide la nav fija para no pisarse con ella. */}
      <div className="flex items-baseline justify-between border-t border-ink/15 px-5 pt-4 md:absolute md:inset-x-0 md:top-20 md:z-10 md:mx-10 md:px-0 calm:md:static calm:md:mx-0 calm:md:px-10">
        {chapter != null && (
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs">
            Chapter {chapter} / {total}
          </p>
        )}
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">{label}</p>
      </div>

      <div
        ref={track}
        className={
          typeOnly
            ? 'flex flex-col md:h-full md:w-max md:flex-row md:items-stretch md:gap-20 lg:gap-28 calm:md:h-auto calm:md:w-auto calm:md:flex-col calm:md:gap-0 calm:lg:gap-0'
            : 'flex flex-col md:h-full md:w-max md:flex-row md:items-stretch calm:md:h-auto calm:md:w-auto calm:md:flex-col'
        }
      >
        <div
          className={
            typeOnly
              ? 'flex flex-col justify-center px-5 py-16 md:h-full md:w-[36vw] md:shrink-0 md:px-10 lg:w-[30vw] calm:md:h-auto calm:md:w-auto calm:lg:w-auto'
              : 'flex flex-col justify-center px-5 py-16 md:h-full md:w-[60vw] md:shrink-0 md:px-10 lg:w-[45vw] calm:md:h-auto calm:md:w-auto calm:lg:w-auto'
          }
        >
          <h2
            data-panels-intro
            className={
              typeOnly
                ? 'max-w-[11ch] text-[clamp(2rem,5.5vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.03em]'
                : 'text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.95] font-medium tracking-[-0.03em]'
            }
          >
            {hasParts ? (
              <>
                {headingBefore}{' '}
                {headingEm != null && (
                  <em className="font-display font-normal italic text-accent">
                    {headingEm}
                  </em>
                )}
                {headingAfter}
              </>
            ) : (
              <>
                {heading.split(' ').slice(0, -2).join(' ')}{' '}
                <em className="font-display font-normal italic text-accent">
                  {heading.split(' ').slice(-2).join(' ')}
                </em>
              </>
            )}
          </h2>
        </div>

        {panels.map((panel) =>
          typeOnly ? (
            <article
              key={panel.index}
              data-type-panel
              className="flex flex-col justify-center gap-5 px-5 pb-20 md:h-full md:w-[48vw] md:shrink-0 md:px-12 md:py-24 lg:w-[40vw] lg:px-16 calm:md:h-auto calm:md:w-auto calm:lg:w-auto calm:md:px-10 calm:lg:px-10 calm:md:py-10"
            >
              <p
                data-panel-index
                className="text-[11px] uppercase tracking-[0.3em] text-accent md:text-xs"
              >
                {panel.index}
              </p>
              <h3
                data-panel-title
                className="max-w-[12ch] text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.9] font-medium tracking-[-0.045em]"
              >
                {panel.title}
              </h3>
              {/* SplitText le pone aria-label al <p> y axe lo prohíbe: el texto
                  real va en un sr-only y el animado queda aria-hidden. */}
              <p className="sr-only">{panel.caption}</p>
              <p
                data-panel-caption
                aria-hidden="true"
                className="max-w-[36ch] text-base leading-relaxed text-ink/65 md:text-lg"
              >
                {panel.caption}
              </p>
            </article>
          ) : (
            <figure
              key={panel.index}
              data-panel-fig
              className="flex flex-col justify-center gap-4 px-5 pb-16 md:h-full md:w-[52vw] md:shrink-0 md:px-8 md:py-24 lg:w-[36vw] calm:md:mx-auto calm:md:h-auto calm:md:w-full calm:md:max-w-xl calm:lg:w-full calm:md:px-5 calm:md:py-10"
            >
              <div
                data-panel-bit
                className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.25em] text-ink/60 md:text-xs"
              >
                <span className="text-accent">{panel.index}</span>
                <span>{panel.title}</span>
              </div>
              {panel.img ? (
                <div className="aspect-4/5 w-full overflow-hidden">
                  <img
                    data-panel-img
                    {...imgAttrs(panel.img, variants)}
                    sizes="(min-width: 1024px) 36vw, (min-width: 768px) 52vw, 100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover will-change-transform"
                  />
                </div>
              ) : null}
              <figcaption data-panel-bit className="text-sm text-ink/70">
                {panel.caption}
              </figcaption>
            </figure>
          ),
        )}
      </div>
    </section>
  )
}
