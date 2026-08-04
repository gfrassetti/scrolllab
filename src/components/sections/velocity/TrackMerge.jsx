import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import trackA1 from './assets/track-a1.png'
import trackA2 from './assets/track-a2.png'
import trackA3 from './assets/track-a3.png'
import trackA4 from './assets/track-a4.png'
import trackB1 from './assets/track-b1.png'
import trackB2 from './assets/track-b2.png'
import trackB3 from './assets/track-b3.png'
import trackB4 from './assets/track-b4.png'
import trackB5 from './assets/track-b5.png'
import onTrack from './assets/on-track.png'
import offTrack from './assets/off-track.png'

const ROW_A = [
  {
    label: 'Title 1',
    img: trackA1,
    w: 'w-[42vw] md:w-[18vw]',
  },
  {
    label: 'Quote',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.',
    w: 'w-[70vw] md:w-[28vw]',
  },
  {
    label: 'Title 2',
    img: trackA2,
    w: 'w-[36vw] md:w-[14vw]',
  },
  {
    label: 'Title 3',
    img: trackA3,
    w: 'w-[48vw] md:w-[20vw]',
  },
  {
    label: 'Title 8',
    img: trackA4,
    w: 'w-[40vw] md:w-[16vw]',
  },
]

const ROW_B = [
  {
    label: 'Title 4',
    img: trackB1,
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Title 5',
    img: trackB2,
    w: 'w-[56vw] md:w-[24vw]',
  },
  {
    label: 'Title 6',
    img: trackB3,
    w: 'w-[44vw] md:w-[17vw]',
  },
  {
    label: 'Title 7',
    img: trackB4,
    w: 'w-[40vw] md:w-[16vw]',
  },
  {
    label: 'Title 9',
    img: trackB5,
    w: 'w-[46vw] md:w-[19vw]',
  },
]

/**
 * TrackMerge — dual-row gallery with aggressive speed differential, then
 * PATH 1 / PATH 2 panels converge and hold before release.
 */
export default function TrackMerge({
  pathLabelA = 'Path 1',
  pathLabelB = 'Path 2',
  mergeTitleA = 'TITLE',
  mergeTitleB = 'TITLE',
  mergeAccent = 'A',
}) {
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
              end: '+=520%',
              pin: true,
              scrub: 0.65,
              anticipatePin: 1,
            },
          })

          // Act 1 — opposing rows: top races left, bottom crawls opposite
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 18 },
            { xPercent: -72, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -22 },
            { xPercent: 8, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-path-tag]',
            { opacity: 0 },
            { opacity: 1, duration: 0.15 },
            0.05,
          )

          // Continuous bg wash: forest → cream (merge) → black (HelmetGrid)
          tl.fromTo(
            '[data-tm-bg]',
            { backgroundColor: '#0a1a12' },
            { backgroundColor: '#12261c', ease: 'none', duration: 0.2 },
            0,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: '#1a3328', ease: 'none', duration: 0.18 },
            0.2,
          )

          // Act 2 — gallery exits; merge stage fades in
          tl.to(
            '[data-tm-gallery]',
            { opacity: 0, scale: 0.94, ease: 'power1.in' },
            0.38,
          )
          tl.to('[data-tm-path-tag]', { opacity: 0, duration: 0.08 }, 0.36)

          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1, duration: 0.1, ease: 'none' },
            0.36,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: '#e6e4dc', ease: 'none', duration: 0.22 },
            0.34,
          )

          // Act 3 — panels slam together from opposite corners
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -70, xPercent: -18, opacity: 0.25, rotate: -4 },
            {
              yPercent: 0,
              xPercent: 0,
              opacity: 1,
              rotate: 0,
              ease: 'power3.out',
            },
            0.4,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 70, xPercent: 18, opacity: 0.25, rotate: 4 },
            {
              yPercent: 0,
              xPercent: 0,
              opacity: 1,
              rotate: 0,
              ease: 'power3.out',
            },
            0.4,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0, scale: 1.14, letterSpacing: '0.12em' },
            {
              opacity: 1,
              scale: 1,
              letterSpacing: '-0.04em',
              ease: 'power2.out',
            },
            0.52,
          )

          // Act 4 — long hold on the merge beat (storytelling pause)
          tl.to('[data-tm-merge]', { opacity: 1, duration: 0.22 }, 0.62)

          // Act 5 — release: wash to black to match HelmetGrid below
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: '#000000', ease: 'none', duration: 0.2 },
            0.78,
          )
          tl.to(
            '[data-tm-merge]',
            { opacity: 0, y: -36, scale: 0.97, ease: 'power1.in' },
            0.84,
          )
        },
      )

      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=360%',
              pin: true,
              scrub: 0.7,
            },
          })
          tl.fromTo(
            '[data-tm-row-a]',
            { xPercent: 10 },
            { xPercent: -78, ease: 'none' },
            0,
          )
          tl.fromTo(
            '[data-tm-row-b]',
            { xPercent: -12 },
            { xPercent: 6, ease: 'none' },
            0,
          )
          tl.to('[data-tm-gallery]', { opacity: 0, scale: 0.96 }, 0.42)
          tl.fromTo(
            '[data-tm-merge]',
            { opacity: 0 },
            { opacity: 1 },
            0.4,
          )
          tl.fromTo(
            '[data-tm-bg]',
            { backgroundColor: '#0a1a12' },
            { backgroundColor: '#1a3328', ease: 'none', duration: 0.35 },
            0,
          )
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: '#e6e4dc', ease: 'none', duration: 0.2 },
            0.38,
          )
          tl.fromTo(
            '[data-tm-on]',
            { yPercent: -48, opacity: 0.3 },
            { yPercent: 0, opacity: 1, ease: 'power2.out' },
            0.44,
          )
          tl.fromTo(
            '[data-tm-off]',
            { yPercent: 48, opacity: 0.3 },
            { yPercent: 0, opacity: 1, ease: 'power2.out' },
            0.44,
          )
          tl.fromTo(
            '[data-tm-title]',
            { opacity: 0 },
            { opacity: 1 },
            0.55,
          )
          tl.to('[data-tm-merge]', { opacity: 1, duration: 0.18 }, 0.62)
          tl.to(
            '[data-tm-bg]',
            { backgroundColor: '#000000', ease: 'none', duration: 0.18 },
            0.78,
          )
          tl.to('[data-tm-merge]', { opacity: 0, y: -20 }, 0.84)
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative bg-[#0a1a12] text-[#ece9e2]">
      <div className="relative h-svh overflow-hidden">
        <div
          data-tm-bg
          className="absolute inset-0 bg-[#0a1a12] transition-colors"
        />

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

          <p
            data-tm-path-tag
            className="pointer-events-none absolute top-[12%] left-5 z-20 text-[10px] tracking-[0.3em] text-acid uppercase opacity-0 md:left-10"
          >
            Dual track
          </p>

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
                    — Caption
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

        <div
          data-tm-merge
          className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0"
        >
          <div className="relative grid w-full max-w-6xl grid-cols-2 items-center gap-3 px-4 md:gap-8 md:px-10">
            <div data-tm-on className="will-change-transform">
              <div className="mx-auto aspect-square w-[78%] overflow-hidden md:w-[70%]">
                <img
                  src={onTrack}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[10px] tracking-[0.25em] text-[#161412]/50 uppercase md:text-xs">
                {pathLabelA}
              </p>
            </div>
            <div data-tm-off className="will-change-transform">
              <div className="mx-auto aspect-3/4 w-[70%] overflow-hidden md:w-[58%]">
                <img
                  src={offTrack}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[10px] tracking-[0.25em] text-[#161412]/50 uppercase md:text-xs">
                {pathLabelB}
              </p>
            </div>
          </div>

          <h2
            data-tm-title
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center font-brico text-[clamp(2.2rem,9vw,6.5rem)] leading-[0.85] font-semibold tracking-[-0.04em] text-[#161412] uppercase"
          >
            <span className="relative inline-block">
              <span className="absolute -top-2 left-0 font-display text-[0.55em] font-normal normal-case italic text-acid md:-top-3">
                {mergeAccent}
              </span>
              {mergeTitleA}
            </span>{' '}
            <span className="text-[#161412]/35">/</span> {mergeTitleB}
          </h2>
        </div>
      </div>
    </section>
  )
}
