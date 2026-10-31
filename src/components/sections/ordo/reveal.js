import { useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '../../../lib/gsap'
import { hidePaint, paint } from './paint'

/**
 * Reveals a section's pieces as it scrolls into view. Mark the pieces inside a `[data-group]`:
 *   [data-sweep]  painted left to right with the pencil edge (paint.js)
 *   [data-up]     rises a few pixels while it fades in
 * A group starts when its top reaches 85% of the screen and plays once. With «reduce motion» (`calm`)
 * nothing is hidden: the section is simply there.
 */
export function useReveal(ref, calm) {
  useLayoutEffect(() => {
    if (calm || !ref.current) return undefined
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-group]').forEach((group) => {
        const sweeps = group.querySelectorAll('[data-sweep]')
        const ups = group.querySelectorAll('[data-up]')
        hidePaint(sweeps)
        gsap.set(ups, { autoAlpha: 0, y: 22 })
        ScrollTrigger.create({
          trigger: group,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            paint(sweeps, { duration: 1.2, stagger: 0.12, delay: 0.05 })
            gsap.to(ups, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.15 })
          },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [ref, calm])
}
