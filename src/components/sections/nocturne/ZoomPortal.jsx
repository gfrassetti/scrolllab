import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * ZoomPortal — a small image window pinned at screen center grows
 * until it swallows the whole viewport, scrubbed by scroll. A giant
 * outlined word behind it fades away as the portal opens.
 */
export default function ZoomPortal({
  seq = '02',
  total = '06',
  label = 'The portal',
  ghostWord = 'CLOSER',
  endCaption = 'Placeholder caption — the scene you were squinting at.',
  img = 'https://picsum.photos/seed/noct-portal/1920/1200',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.set('[data-portal]', { scale: 0.22 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      tl.to('[data-portal]', { scale: 1, ease: 'power1.inOut' }, 0)
        .to('[data-portal-ghost]', { opacity: 0, scale: 1.15, ease: 'none' }, 0)
        .from(
          '[data-portal-end]',
          { opacity: 0, y: 24, ease: 'power2.out' },
          0.75,
        )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative h-[260vh] md:h-[300vh]">
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        <div className="absolute top-0 inset-x-0 mx-5 flex items-baseline justify-between border-t border-salt/20 pt-4 md:mx-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-salt/40 md:text-xs">
            Seq. {seq} / {total}
          </p>
          <p className="text-[11px] uppercase tracking-[0.3em] md:text-xs">{label}</p>
        </div>

        <span
          data-portal-ghost
          aria-hidden="true"
          className="pointer-events-none absolute font-brico text-[26vw] leading-none font-extrabold tracking-[-0.02em] text-transparent uppercase select-none [-webkit-text-stroke:1px_rgba(236,233,226,0.25)]"
        >
          {ghostWord}
        </span>

        <div data-portal className="absolute inset-0 will-change-transform">
          <img
            src={img}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <p
          data-portal-end
          className="absolute bottom-8 mx-5 max-w-[38ch] text-center text-[11px] uppercase tracking-[0.3em] text-salt/80 md:bottom-10 md:text-xs"
        >
          {endCaption}
        </p>
      </div>
    </section>
  )
}
