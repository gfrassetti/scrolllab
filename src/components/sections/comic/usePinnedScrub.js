import { useGSAP, gsap } from '../../../lib/gsap'

/**
 * usePinnedScrub — patrón canónico de scrollytelling en SCROLLLAB.
 * Sección alta + pin del viewport + timeline scrubbeada. Usalo en cada
 * “capítulo” que deba sentirse como historieta / cámara, no como fade corto.
 *
 * @param {React.RefObject} rootRef ref de la <section> (trigger = root)
 * @param {object} opts
 * @param {(ctx: { root: HTMLElement, pin: HTMLElement, gsap: typeof gsap, tl: gsap.core.Timeline }) => void} opts.build
 * @param {number} [opts.scrub=0.4]
 */
export function usePinnedScrub(rootRef, { build, scrub = 0.4 } = {}) {
  useGSAP(
    () => {
      if (!rootRef.current) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const root = rootRef.current
      const pin = root.querySelector('[data-pin]')
      if (!pin || typeof build !== 'function') return

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      build({ root, pin, gsap, tl })
    },
    { scope: rootRef },
  )
}
