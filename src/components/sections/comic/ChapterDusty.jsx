import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import PaperFrame from './PaperFrame'
import heroRoad from './assets/hero-road.png'
import closeupBuddies from './assets/closeup-buddies.png'
import driveSunset from './assets/drive-sunset.png'

const CAPTIONS = [
  'Caption 1 — replace with story beat.',
  'Caption 2 — replace with story beat.',
  'Caption 3 — replace with story beat.',
  'Caption 4 — replace with story beat.',
]

/**
 * ChapterDusty — full-bleed illustrated comic reel.
 * Camera zoom → torn close-up panel → drive panel wipe. Image art + GSAP scrub.
 */
export default function ChapterDusty({
  eyebrow = 'Eyebrow 1',
  title = 'TITLE 1',
  captions = CAPTIONS,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const pin = root.current.querySelector('[data-pin]')
      const titleEl = root.current.querySelector('[data-hero-title]')
      const camera = root.current.querySelector('[data-camera]')
      const heroImg = root.current.querySelector('[data-hero-img]')
      const close = root.current.querySelector('[data-panel="close"]')
      const drive = root.current.querySelector('[data-panel="drive"]')
      const closeImg = root.current.querySelector('[data-close-img]')
      const driveImg = root.current.querySelector('[data-drive-img]')
      const captionsEls = gsap.utils.toArray('[data-caption]')
      const bits = gsap.utils.toArray('[data-dust-bit]')
      const vignette = root.current.querySelector('[data-vignette]')

      gsap.set(close, { yPercent: 112, rotate: 2.8 })
      gsap.set(drive, { xPercent: 112, rotate: -2.4 })
      gsap.set(captionsEls, { opacity: 0, y: 28 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.4,
          pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Act 1 — title + slow push-in
      tl.to(titleEl, { opacity: 0, y: -60, scale: 0.92, duration: 1.4 }, 1)
      tl.fromTo(
        heroImg,
        { scale: 1.08, xPercent: 0, yPercent: 0 },
        { scale: 1.18, xPercent: -2, yPercent: 1, duration: 3.5 },
        0,
      )
      tl.fromTo(vignette, { opacity: 0.15 }, { opacity: 0.45, duration: 3 }, 0)

      // Act 2 — hard zoom toward truck / animals
      tl.to(
        camera,
        {
          scale: 1.85,
          xPercent: 4,
          yPercent: 10,
          duration: 3.8,
          transformOrigin: '48% 62%',
        },
        2.4,
      )
      tl.to(heroImg, { scale: 1.35, duration: 3.8 }, 2.4)
      tl.to(vignette, { opacity: 0.62, duration: 2 }, 2.8)

      bits.forEach((bit, i) => {
        tl.fromTo(
          bit,
          { opacity: 0, x: 20, y: 10 },
          {
            opacity: 0.55 + (i % 3) * 0.1,
            x: -100 - i * 14,
            y: -30 + (i % 4) * 10,
            duration: 2.4,
          },
          2.6 + i * 0.06,
        )
      })

      tl.to(captionsEls[0], { opacity: 1, y: 0, duration: 0.55 }, 2.5)
      tl.to(captionsEls[0], { opacity: 0, y: -20, duration: 0.4 }, 3.7)
      tl.to(captionsEls[1], { opacity: 1, y: 0, duration: 0.55 }, 3.8)
      tl.to(captionsEls[1], { opacity: 0, y: -20, duration: 0.4 }, 5.1)

      // Act 3 — torn close-up slides up over the zoom
      tl.to(close, { yPercent: 0, rotate: -0.6, duration: 2.3 }, 5.4)
      tl.fromTo(
        closeImg,
        { scale: 1.2, yPercent: 8 },
        { scale: 1.05, yPercent: 0, duration: 2.6 },
        5.4,
      )
      tl.to(captionsEls[2], { opacity: 1, y: 0, duration: 0.6 }, 6.4)
      tl.to(captionsEls[2], { opacity: 0, y: -18, duration: 0.4 }, 7.8)

      // Act 4 — drive panel wipes from the right (comic page turn)
      tl.to(drive, { xPercent: 0, rotate: 0.5, duration: 2.5 }, 8)
      tl.to(close, { xPercent: -22, rotate: -4, scale: 0.96, duration: 2.5 }, 8)
      tl.fromTo(
        driveImg,
        { scale: 1.15, xPercent: -6 },
        { scale: 1.05, xPercent: 4, duration: 3.2 },
        8,
      )
      tl.to(captionsEls[3], { opacity: 1, y: 0, duration: 0.65 }, 8.8)
      tl.to(captionsEls[3], { opacity: 0.9, duration: 1.2 }, 10)

      // Exit
      tl.to(
        [camera, close, drive],
        { yPercent: -4, scale: 0.95, duration: 1.5 },
        10.6,
      )
    },
    { scope: root },
  )

  return (
    <section
      id="chapter-dusty"
      ref={root}
      className="relative h-[1000vh] bg-[#1a1512] text-white"
    >
      <div data-pin className="relative h-svh overflow-hidden">
        <div className="absolute inset-0">
          <div data-camera className="absolute inset-0 origin-center will-change-transform">
            <img
              data-hero-img
              src={heroRoad}
              alt=""
              className="absolute inset-0 h-full w-full origin-center object-cover will-change-transform"
              draggable={false}
            />
          </div>

          <div
            data-vignette
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0.15,
              background:
                'radial-gradient(ellipse at center, transparent 35%, rgba(10,8,6,0.75) 100%)',
            }}
          />

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                data-dust-bit
                className="absolute rounded-full bg-[#f0e6d6]"
                style={{
                  width: 4 + (i % 5) * 3,
                  height: 3 + (i % 4) * 2,
                  left: `${42 + (i % 6) * 3}%`,
                  top: `${58 + (i % 5) * 4}%`,
                  opacity: 0,
                  filter: 'blur(1px)',
                }}
              />
            ))}
          </div>

          <div
            data-panel="close"
            className="absolute inset-x-[3%] top-[7%] bottom-[8%] z-20 will-change-transform md:inset-x-[7%]"
          >
            <PaperFrame className="h-full !w-full">
              <div className="relative h-full overflow-hidden">
                <img
                  data-close-img
                  src={closeupBuddies}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  draggable={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-12 from-white to-transparent"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)',
                    clipPath:
                      'polygon(0 45%, 7% 0, 16% 40%, 28% 4%, 40% 42%, 52% 0, 64% 38%, 76% 6%, 88% 40%, 100% 8%, 100% 100%, 0 100%)',
                  }}
                />
              </div>
            </PaperFrame>
          </div>

          <div
            data-panel="drive"
            className="absolute inset-x-[2%] top-[8%] bottom-[7%] z-30 will-change-transform md:inset-x-[5%]"
          >
            <PaperFrame className="h-full !w-full">
              <div className="relative h-full overflow-hidden">
                <img
                  data-drive-img
                  src={driveSunset}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  draggable={false}
                />
              </div>
            </PaperFrame>
          </div>
        </div>

        <div
          data-hero-title
          className="pointer-events-none absolute inset-x-0 top-[20%] z-40 px-5 text-center md:top-[18%]"
        >
          <p className="mb-4 text-[11px] tracking-[0.3em] text-white/85 uppercase drop-shadow md:text-xs">
            {eyebrow}
          </p>
          <h1
            className="mx-auto max-w-5xl font-brico text-[clamp(2.6rem,9vw,6.2rem)] leading-[0.86] font-extrabold tracking-[-0.045em] text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
            style={{ transform: 'rotate(-1.2deg)' }}
          >
            {title}
          </h1>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[10%] z-50 flex justify-center px-6 md:top-[8%]">
          <div className="relative h-28 w-full max-w-3xl text-center">
            {captions.map((text) => (
              <p
                key={text}
                data-caption
                className="absolute inset-x-0 text-[15px] leading-relaxed text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.75)] md:text-lg"
              >
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
