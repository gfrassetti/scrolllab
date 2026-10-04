import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ComicPanel from './ComicPanel'
import PaperFrame from './PaperFrame'
import RoadHero from './RoadHero'
import { closeupBuddies, driveSunset, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

const CAPTIONS = [
  'Caption 1 — replace with story beat.',
  'Caption 2 — replace with story beat.',
  'Caption 3 — replace with story beat.',
  'Caption 4 — replace with story beat.',
]

/**
 * ChapterDusty — full-bleed illustrated comic reel.
 * Camera zoom → torn close-up panel → drive panel wipe. Image art + GSAP scrub.
 *
 * Calma: las tres escenas (hero, close-up, drive) viven apiladas una arriba
 * de otra (`absolute inset-0`) para que el scrub las cruce — sin scrub se
 * verían las tres pisándose. En calma son tres viñetas en fila, cada una un
 * bloque normal del documento (ComicPanel), con fundido al entrar.
 */
const LAYER_ZOOM = { sky: 1.04, far: 1.08, peak: 1.12, hills: 1.22, road: 1.34, shrubs: 1.55, fore: 1.7 }

/** Small connective words ("a", "of") are set small, like a hand-lettered cover. */
const isSmall = (word) => word.replace(/[^a-z]/gi, '').length <= 2

export default function ChapterDusty({
  eyebrow = 'Eyebrow 1',
  title = 'A TALE OF ROAD AND DUST',
  onomatopoeia = 'VROOM',
  captions = CAPTIONS,
}) {
  const root = useRef(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return calmReveal('[data-comic-reveal]')

      const pin = root.current.querySelector('[data-pin]')
      const titleEl = root.current.querySelector('[data-hero-title]')
      const camera = root.current.querySelector('[data-camera]')
      const close = root.current.querySelector('[data-panel="close"]')
      const drive = root.current.querySelector('[data-panel="drive"]')
      const closeImg = root.current.querySelector('[data-close-img]')
      const driveImg = root.current.querySelector('[data-drive-img]')
      const captionsEls = gsap.utils.toArray('[data-caption]')
      const strip = root.current.querySelector('[data-caption-strip]')
      const sfx = root.current.querySelector('[data-sfx]')
      const q = (sel) => gsap.utils.toArray(sel, root.current)
      const truckPos = root.current.querySelector('[data-truck-pos]')
      const tails = q('[data-tail]')
      const heads = q('[data-head]')
      const puffs = q('[data-smoke-puff]')

      // The title is hand-cut: every letter sits a little off its baseline.
      const split = SplitText.create(titleEl.querySelector('[data-hero-words]'), {
        type: 'chars',
        charsClass: 'comic-char',
      })
      split.chars.forEach((char) => {
        gsap.set(char, { rotate: gsap.utils.random(-5, 5), y: gsap.utils.random(-4, 4), display: 'inline-block' })
      })

      // The truck starts far down the road: small, near the vanishing point.
      // `rig.s` is how close it is: it sets the scale and, with the horizon at
      // y = 500, how far down the road it sits.
      // In a portrait phone the scene is cropped to its middle: keep the truck smaller.
      const narrow = window.innerWidth < 768
      const near = narrow ? { mid: 0.56, end: 0.64, zoom: 1.08 } : { mid: 0.9, end: 0.98, zoom: 1.45 }
      const rig = { s: narrow ? 0.26 : 0.38 }
      const applyRig = () =>
        truckPos.setAttribute('transform', `translate(800 ${500 + 340 * rig.s}) scale(${rig.s})`)
      applyRig()
      gsap.set(tails, { y: 150 })
      gsap.set(heads, { y: 230 })
      gsap.set(puffs, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' })
      gsap.set(camera, { transformOrigin: '50% 68%' })
      gsap.set(close, { yPercent: 112, rotate: 2.8 })
      gsap.set(drive, { xPercent: 112, rotate: -2.4 })
      gsap.set(captionsEls, { opacity: 0, y: 28 })
      gsap.set(strip, { opacity: 0 })
      gsap.set(sfx, { opacity: 0, scale: 0.7, xPercent: 6, rotate: -8 })

      // Idle life, not tied to the scroll: the tails wag, the heads bob.
      tails.forEach((tail, i) => {
        gsap.to(tail.querySelector('[data-tail-sway]'), {
          rotate: i ? -16 : 20,
          duration: 0.32 + i * 0.07,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '0px 0px',
        })
      })
      heads.forEach((head, i) => {
        gsap.to(head.querySelector('[data-head-bob]'), {
          y: 5,
          rotate: i ? -1.2 : 1.6,
          duration: 0.9 + i * 0.15,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '0px 40px',
        })
      })

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

      // Act 1 — the truck rolls toward us; the title breaks up letter by letter
      tl.to(rig, { s: near.mid, duration: 3.2, ease: 'power1.in', onUpdate: applyRig }, 0)
      tl.to(
        split.chars,
        {
          opacity: 0,
          y: () => gsap.utils.random(-320, -140),
          x: () => gsap.utils.random(-90, 90),
          rotate: () => gsap.utils.random(-50, 50),
          scale: 0.7,
          duration: 0.9,
          stagger: { each: 0.045, from: 'random' },
          ease: 'power2.in',
        },
        0.25,
      )
      tl.to(titleEl.querySelector('[data-hero-eyebrow]'), { opacity: 0, y: -14, duration: 0.7 }, 0.6)

      // the engine noise rips across the left of the frame
      tl.to(sfx, { opacity: 1, scale: 1, xPercent: 0, rotate: -4, duration: 0.7, ease: 'back.out(1.7)' }, 0.55)
      tl.to(sfx, { xPercent: -3, scale: 1.08, duration: 1.7 }, 1.25)
      tl.to(sfx, { opacity: 0, duration: 0.6 }, 2.35)

      // tails pop over the tailgate, wag, then the animals turn around
      tails.forEach((tail, i) => {
        tl.to(tail, { y: 0, duration: 0.5, ease: 'back.out(2)' }, 0.55 + i * 0.12)
        tl.to(tail, { y: 150, duration: 0.45, ease: 'power2.in' }, 1.95 + i * 0.1)
      })
      heads.forEach((head, i) => {
        tl.to(head, { y: 0, duration: 0.9, ease: 'back.out(1.35)' }, 2.25 + i * 0.22)
      })

      // smoke churns out of the wheels, billows and drifts wide along the road
      puffs.forEach((puff, i) => {
        const side = i >= 6 ? 1 : -1
        const k = i % 6
        const at = 0.9 + k * 0.2
        tl.fromTo(
          puff,
          { opacity: 0, scale: 0.35, x: 0, y: 0 },
          { opacity: 0.98, scale: 1.4, x: side * (14 + k * 6), y: -8 - k * 3, duration: 0.8 },
          at,
        )
        tl.to(
          puff,
          { opacity: 0, scale: 3.4 + (k % 3) * 0.5, x: side * (150 + k * 46), y: -34 - k * 9, duration: 2.4 },
          at + 0.8,
        )
      })

      // the paragraph arrives with a soft blur behind it
      tl.to(strip, { opacity: 1, duration: 0.6 }, 1.7)
      tl.to(captionsEls[0], { opacity: 1, y: 0, duration: 0.55 }, 1.9)
      tl.to(captionsEls[0], { opacity: 0, y: -20, duration: 0.4 }, 3.9)
      tl.to(captionsEls[1], { opacity: 1, y: 0, duration: 0.55 }, 4.0)
      tl.to(captionsEls[1], { opacity: 0, y: -20, duration: 0.4 }, 5.1)
      tl.to(strip, { opacity: 0, duration: 0.4 }, 4.3)

      // Act 2 — the camera pushes in and tilts down onto the truck, layer by layer
      tl.to(
        camera,
        { scale: near.zoom, yPercent: -3, duration: 3.6, ease: 'power1.inOut' },
        2.3,
      )
      Object.entries(LAYER_ZOOM).forEach(([name, zoom]) => {
        const layer = root.current.querySelector(`[data-layer="${name}"]`)
        if (layer) {
          tl.to(layer, { scale: zoom, svgOrigin: '800 640', duration: 3.6, ease: 'power1.inOut' }, 2.3)
        }
      })
      tl.to(rig, { s: near.end, duration: 2.6, ease: 'power1.inOut', onUpdate: applyRig }, 3.2)

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
    { scope: root, dependencies: [reduced] },
  )

  if (reduced) {
    return (
      <section
        id="chapter-dusty"
        ref={root}
        className="relative bg-[#1a1512] py-20 text-white md:py-28"
      >
        <div data-comic-reveal className="mb-10 px-5 text-center md:px-10">
          <p className="mb-4 text-[11px] tracking-[0.3em] text-white/85 uppercase md:text-xs">
            {eyebrow}
          </p>
          <h1 className="mx-auto max-w-5xl font-hand text-[clamp(2.6rem,9vw,6rem)] leading-[0.9] font-black tracking-[0.01em] uppercase">
            {title}
          </h1>
        </div>
        <div data-comic-reveal className="mx-auto mb-6 max-w-4xl px-5 md:px-10">
          <PaperFrame className="h-full !w-full">
            <div className="relative aspect-[16/10] overflow-hidden md:aspect-[16/8]">
              <RoadHero calm />
            </div>
            <div className="bg-[#f7f4ee] p-6 text-[#2a2622] md:p-8">
              <p className="text-sm leading-relaxed text-[#2a2622]/75">{captions[0]}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#2a2622]/75">{captions[1]}</p>
            </div>
          </PaperFrame>
        </div>
        <div data-comic-reveal>
          <ComicPanel
            img={closeupBuddies}
            variants={variants}
            sizes="(max-aspect-ratio: 3/2) 130vh, 90vw"
            lines={[captions[2]]}
          />
        </div>
        <div data-comic-reveal>
          <ComicPanel
            img={driveSunset}
            variants={variants}
            sizes="(max-aspect-ratio: 3/2) 130vh, 90vw"
            lines={[captions[3]]}
          />
        </div>
      </section>
    )
  }

  return (
    <section
      id="chapter-dusty"
      ref={root}
      className="relative h-[580vh] bg-[#1a1512] text-white"
    >
      <div data-pin className="relative h-svh overflow-hidden">
        <div className="absolute inset-0">
          <div data-camera className="absolute inset-0 origin-center will-change-transform">
            <RoadHero />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 mix-blend-multiply"
            style={{
              background:
                'radial-gradient(ellipse at 50% 60%, transparent 40%, rgba(40,18,10,0.45) 100%)',
            }}
          />

          <div
            data-panel="close"
            className="absolute inset-x-[3%] top-[7%] bottom-[8%] z-20 will-change-transform md:inset-x-[7%]"
          >
            <PaperFrame className="h-full !w-full">
              <div className="relative h-full overflow-hidden">
                <img
                  data-close-img
                  {...imgAttrs(closeupBuddies, variants)}
                  sizes="(max-aspect-ratio: 3/2) 130vh, 90vw"
                  loading="lazy"
                  decoding="async"
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
                  {...imgAttrs(driveSunset, variants)}
                  sizes="(max-aspect-ratio: 3/2) 130vh, 90vw"
                  loading="lazy"
                  decoding="async"
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
          className="pointer-events-none absolute inset-x-0 top-[10%] z-40 px-5 text-center md:top-[9%]"
        >
          <p
            data-hero-eyebrow
            className="mb-3 text-[13px] font-semibold tracking-[0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] md:text-[15px]"
          >
            {eyebrow}
          </p>
          <h1
            className="mx-auto max-w-[17ch] font-hand text-[clamp(3.2rem,10vw,8.6rem)] leading-[0.84] font-black tracking-[0.015em] text-balance text-white uppercase drop-shadow-[0_8px_0_rgba(20,10,8,0.28)]"
            aria-label={title}
          >
            <span data-hero-words aria-hidden="true">
              {title.split(' ').map((word, i) => (
                <span
                  key={i}
                  className="inline-block whitespace-nowrap"
                  style={{ fontSize: isSmall(word) ? '0.42em' : undefined, margin: '0 0.12em' }}
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>
        </div>

        {/* the engine, as sound */}
        <div
          data-sfx
          aria-hidden="true"
          className="pointer-events-none absolute top-[30%] left-[1%] z-30 w-[58vw] max-w-[760px] md:left-[3%] md:w-[40vw]"
        >
          <svg viewBox="0 0 640 330" className="h-auto w-full overflow-visible">
            <defs>
              <path id="sfx-path" d="M20 270 C140 80 330 40 610 150" />
            </defs>
            <text
              className="font-hand"
              fontSize="170"
              fontWeight="900"
              letterSpacing="4"
              fill="#fff"
              stroke="#1d1311"
              strokeWidth="9"
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              <textPath href="#sfx-path" startOffset="0">
                {onomatopoeia}
              </textPath>
            </text>
          </svg>
        </div>

        {/* paragraph over a soft blur of the scene */}
        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-50 flex justify-center px-6 md:top-[11%]">
          <div className="relative w-full max-w-4xl text-center">
            <div
              data-caption-strip
              aria-hidden="true"
              className="absolute -inset-x-[12%] -inset-y-5 backdrop-blur-[6px]"
              style={{
                background: 'rgba(20,34,32,0.14)',
                // closest-side: the fade ends exactly at the box edge, so no hard rectangle
                WebkitMaskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
                maskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
              }}
            />
            <div className="relative h-24 md:h-20">
              {captions.map((text) => (
                <p
                  key={text}
                  data-caption
                  className="absolute inset-x-0 text-[15px] leading-relaxed font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] md:text-lg"
                >
                  {text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
