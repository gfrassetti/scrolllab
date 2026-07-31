import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

const ROW_A = [
  {
    label: 'Battersea, 2024',
    img: 'https://picsum.photos/seed/vel-a1/640/860',
    w: 'w-[42vw] md:w-[18vw]',
  },
  {
    label: 'Quote',
    quote: 'It doesn’t matter where you start — it’s how you progress from there.',
    w: 'w-[70vw] md:w-[28vw]',
  },
  {
    label: 'Monaco, 2023',
    img: 'https://picsum.photos/seed/vel-a2/520/700',
    w: 'w-[36vw] md:w-[14vw]',
  },
  {
    label: 'High Performance, 2024',
    img: 'https://picsum.photos/seed/vel-a3/700/700',
    w: 'w-[48vw] md:w-[20vw]',
  },
]

const ROW_B = [
  {
    label: 'FIA Prize Giving, 2024',
    img: 'https://picsum.photos/seed/vel-b1/700/700',
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Miami GP, 2024',
    img: 'https://picsum.photos/seed/vel-b2/900/900',
    w: 'w-[56vw] md:w-[24vw]',
  },
  {
    label: 'Britain, 2025',
    img: 'https://picsum.photos/seed/vel-b3/700/700',
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Barcelona, 2024',
    img: 'https://picsum.photos/seed/vel-b4/640/800',
    w: 'w-[40vw] md:w-[16vw]',
  },
]

/**
 * TrackMerge — vertical scroll drives:
 * 1) horizontal photo gallery
 * 2) ON TRACK / OFF TRACK panels converging
 * 3) release into the next section below
 */
export default function TrackMerge() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-tm-gallery]', { opacity: 1, x: 0 })
        gsap.set('[data-tm-merge]', { opacity: 1 })
        gsap.set('[data-tm-on]', { y: 0, x: 0 })
        gsap.set('[data-tm-off]', { y: 0, x: 0 })
      })

      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=420%',
              pin: true,
              scrub: 0.8,
              anticipatePin: 1,
            },
          })

          // 1 — gallery pans horizontally (two rows, different speeds)
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 8 },
            { xPercent: -55, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -6 },
            { xPercent: -62, ease: 'none' },
            0,
          )

          // gallery exits
          tl.to(
            '[data-tm-gallery]',
            { opacity: 0, scale: 0.96, ease: 'power1.in' },
            0.42,
          )

          // 2 — merge scene in
          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1, duration: 0.12, ease: 'none' },
            0.4,
          )
          tl.fromTo(
            '[data-tm-bg]',
            { backgroundColor: '#0a1a12' },
            { backgroundColor: '#e6e4dc', ease: 'none', duration: 0.18 },
            0.4,
          )

          // panels start apart and join
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -55, xPercent: -12, opacity: 0.4 },
            { yPercent: 0, xPercent: 0, opacity: 1, ease: 'power2.out' },
            0.45,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 55, xPercent: 12, opacity: 0.4 },
            { yPercent: 0, xPercent: 0, opacity: 1, ease: 'power2.out' },
            0.45,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0, scale: 1.08 },
            { opacity: 1, scale: 1, ease: 'power2.out' },
            0.58,
          )

          // brief hold on the joined frame, then soft exit
          tl.to('[data-tm-merge]', { opacity: 1, duration: 0.12 }, 0.78)
          tl.to(
            '[data-tm-merge]',
            { opacity: 0, y: -24, ease: 'power1.in' },
            0.9,
          )
        },
      )

      // Mobile: simpler horizontal scrub without pin merge complexity
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=280%',
              pin: true,
              scrub: 0.75,
            },
          })
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 4 },
            { xPercent: -70, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -4 },
            { xPercent: -75, ease: 'none' },
            0,
          )
          tl.to('[data-tm-gallery]', { opacity: 0 }, 0.5)
          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1 },
            0.48,
          )
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -40 },
            { yPercent: 0, ease: 'power2.out' },
            0.52,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 40 },
            { yPercent: 0, ease: 'power2.out' },
            0.52,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0 },
            { opacity: 1 },
            0.62,
          )
          tl.to('[data-tm-merge]', { opacity: 0 }, 0.9)
        },
      )
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative bg-[#0a1a12] text-[#ece9e2]"
    >
      <div className="relative h-svh overflow-hidden">
        <div
          data-tm-bg
          className="absolute inset-0 bg-[#0a1a12] transition-colors"
        />

        {/* ——— 1. Horizontal gallery ——— */}
        <div
          data-tm-gallery
          className="absolute inset-0 z-10 flex flex-col justify-center gap-[4vh] overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-radial-gradient(circle at 40% 40%, transparent 0 16px, rgba(236,233,226,0.08) 16px 17px)',
            }}
          />

          <div
            data-tm-row-a
            className="flex items-end gap-4 px-5 will-change-transform md:gap-6 md:px-10"
          >
            {ROW_A.map((item) =>
              item.quote ? (
                <figure
                  key={item.label}
                  className={`${item.w} shrink-0 pb-6 md:pb-10`}
                >
                  <blockquote className="font-display text-[clamp(1.35rem,3.2vw,2.4rem)] leading-[1.1] italic text-[#ece9e2]">
                    {item.quote}
                  </blockquote>
                  <p className="mt-4 text-[10px] tracking-[0.25em] text-acid uppercase">
                    — signature
                  </p>
                </figure>
              ) : (
                <figure key={item.label} className={`${item.w} shrink-0`}>
                  <div className="aspect-3/4 overflow-hidden border border-white/15">
                    <img
                      src={item.img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 text-[10px] tracking-[0.2em] text-white/50 uppercase">
                    {item.label}
                  </figcaption>
                </figure>
              ),
            )}
          </div>

          <div
            data-tm-row-b
            className="flex items-start gap-4 px-5 will-change-transform md:gap-6 md:px-10"
          >
            {ROW_B.map((item) => (
              <figure key={item.label} className={`${item.w} shrink-0`}>
                <div className="aspect-square overflow-hidden border border-white/15">
                  <img
                    src={item.img}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-[10px] tracking-[0.2em] text-white/50 uppercase">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* ——— 2. ON / OFF converge ——— */}
        <div
          data-tm-merge
          className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0"
        >
          <div className="relative grid w-full max-w-6xl grid-cols-2 items-center gap-3 px-4 md:gap-8 md:px-10">
            <div
              data-tm-on
              className="will-change-transform"
            >
              <div className="mx-auto aspect-square w-[78%] overflow-hidden md:w-[70%]">
                <img
                  src="https://picsum.photos/seed/vel-on-track/900/900"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[10px] tracking-[0.25em] text-[#161412]/50 uppercase md:text-xs">
                On track
              </p>
            </div>
            <div
              data-tm-off
              className="will-change-transform"
            >
              <div className="mx-auto aspect-3/4 w-[70%] overflow-hidden md:w-[58%]">
                <img
                  src="https://picsum.photos/seed/vel-off-track/800/1100"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[10px] tracking-[0.25em] text-[#161412]/50 uppercase md:text-xs">
                Off track
              </p>
            </div>
          </div>

          <h2
            data-tm-title
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center font-brico text-[clamp(2.2rem,9vw,6.5rem)] leading-[0.85] font-semibold tracking-[-0.04em] text-[#161412] uppercase"
          >
            <span className="relative inline-block">
              <span className="absolute -top-2 left-0 font-display text-[0.55em] font-normal normal-case italic text-acid md:-top-3">
                on
              </span>
              TRACK
            </span>{' '}
            <span className="text-[#161412]/35">OFF</span> TRACK
          </h2>
        </div>
      </div>
    </section>
  )
}
