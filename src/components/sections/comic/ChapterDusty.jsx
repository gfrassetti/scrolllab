import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal } from '../../../lib/motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import ComicPanel from './ComicPanel'
import PaperFrame from './PaperFrame'
import RoadHero from './RoadHero'
import SideTruck from './SideTruck'
import { CanyonScene, FarmScene, FenceScene } from './Vignettes'
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
/** A ragged top edge for the paper curtain: x in %, y in px, the same every render. */
const TORN_TOP = (() => {
  let a = 7
  const rand = () => {
    a = (a * 16807) % 2147483647
    return a / 2147483647
  }
  const pts = Array.from({ length: 41 }, (_, i) => `${((i / 40) * 100).toFixed(2)}% ${(4 + rand() * 30).toFixed(1)}px`)
  return `polygon(${pts.join(', ')}, 100% 100%, 0 100%)`
})()

// crumpled grey paper: flat colour under a soft fractal-noise shading
const PAPER = {
  backgroundColor: '#c3c1bd',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.011 0.02' numOctaves='4' seed='3'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.42  0 0 0 0 0.41  0 0 0 0.9 -0.18'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
}

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

      // Act 3 — a torn paper curtain rises over the zoom; the dog and the pig
      // come in from the two edges of the page and meet in the middle
      const half = root.current.querySelectorAll('[data-buddy-half]')
      const ink = q('[data-ink]')
      const tiles = q('[data-tile]')
      const farm = root.current.querySelector('[data-farm]')
      const farmScene = root.current.querySelector('[data-farm-scene]')
      const slot = root.current.querySelector('[data-slot-farm]')
      const trio = root.current.querySelector('[data-trio]')
      const buddies = root.current.querySelector('[data-buddies]')
      const sideTruck = root.current.querySelector('[data-side-truck]')
      const curtain = root.current.querySelector('[data-curtain]')

      // where an element sits in the pin, ignoring transforms
      const rectIn = (el) => {
        let left = 0
        let top = 0
        for (let node = el; node && node !== pin; node = node.offsetParent) {
          left += node.offsetLeft
          top += node.offsetTop
        }
        return { left, top, w: el.offsetWidth, h: el.offsetHeight }
      }
      const slotRect = () => rectIn(slot)
      const clipFor = () => {
        const r = slotRect()
        const W = pin.clientWidth
        const H = pin.clientHeight
        return `inset(${r.top}px ${W - r.left - r.w}px ${H - r.top - r.h}px ${r.left}px)`
      }

      gsap.set(curtain, { yPercent: 106 })
      gsap.set(half[0], { x: () => -pin.clientWidth * 0.62 })
      gsap.set(half[1], { x: () => pin.clientWidth * 0.62 })
      gsap.set(ink, { opacity: 0, y: 24 })
      gsap.set(tiles, { opacity: 0, y: 70, rotate: (i) => (i % 2 ? 4 : -4) })
      gsap.set(farm, { opacity: 0, y: 70, clipPath: clipFor })
      // the scene grows from the middle of its square, so it always covers the window
      const slotCenter = () => {
        const r = slotRect()
        return `${r.left + r.w / 2}px ${r.top + r.h / 2}px`
      }
      gsap.set(farmScene, { scale: 0.7, transformOrigin: slotCenter })
      // The truck is placed by its own wrapper (centered, bottom edge on the pin's
      // bottom); x / y / scale carry it from the lower-left corner onto the road.
      const truckW = () => sideTruck.offsetWidth
      // it starts just outside the left edge, a little below its final level
      const START_X = () => -(pin.clientWidth / 2 + truckW() * 0.72)
      // the farm's road, in the pin: the scene is cropped with `slice`
      const roadY = () => {
        const W = pin.clientWidth
        const H = pin.clientHeight
        const k = Math.max(W / 1600, H / 900)
        return (H - 900 * k) / 2 + 706 * k
      }
      // y that puts the wheels on that road (they sit 10 % of the truck's height above its bottom edge)
      const END_Y = () => roadY() + 0.102 * ((truckW() * 470) / 900) - pin.clientHeight
      gsap.set(sideTruck, { x: START_X, y: () => END_Y() + pin.clientHeight * 0.24, scale: 1.4, transformOrigin: '50% 100%' })
      gsap.set([buddies, trio], { opacity: 0 })

      tl.to(curtain, { yPercent: 0, duration: 1.7, ease: 'power2.out' }, 5.0)
      tl.set(buddies, { opacity: 1 }, 6.6)
      tl.to(half[0], { x: 0, duration: 1.2, ease: 'power3.out' }, 6.6)
      tl.to(half[1], { x: 0, duration: 1.2, ease: 'power3.out' }, 6.6)
      tl.to(ink[0], { opacity: 1, y: 0, duration: 0.7 }, 7.6)
      tl.to(ink[0], { opacity: 0, y: -16, duration: 0.5 }, 9.0)

      // the three scenes take the place the dog and the pig held
      tl.set(trio, { opacity: 1 }, 9.0)
      tl.to(buddies, { opacity: 0, scale: 0.94, duration: 0.7 }, 9.0)
      tl.to(tiles, { opacity: 1, y: 0, rotate: 0, duration: 0.9, stagger: 0.18, ease: 'power3.out' }, 9.0)
      tl.to(farm, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 9.36)
      tl.to(ink[1], { opacity: 1, y: 0, duration: 0.7 }, 9.9)

      // The truck is always moving. It comes up out of the lower-left corner the
      // moment the squares arrive, big and close, and keeps shrinking, always opaque
      // and always moving toward the road. The instant its hood touches the first square the last
      // scene starts to grow, and both finish together: the truck on the farm road.
      const TRUCK_AT = 9.8
      const LINEAR_FOR = 6.6 // the straight run, if it never sped up
      const RUSH_FOR = 1.7 // the last stretch, when both speed up
      const tw = truckW()
      const hood = 0.44 * tw // front of the hood, from the truck's center, at scale 1
      const centerX = pin.clientWidth / 2
      const first = rectIn(tiles[0])
      const x0 = START_X()
      const xTouch = first.left - hood - centerX // the hood touches the first square
      const xPast = first.left + first.w - hood - centerX // the hood reaches its far edge
      const along = (x) => Math.min(0.9, Math.max(0.15, (x0 - x) / x0)) // share of the straight run
      const HIT = TRUCK_AT + LINEAR_FOR * along(xTouch)
      const PAST = TRUCK_AT + LINEAR_FOR * Math.max(along(xPast), along(xTouch) + 0.08)
      const END = PAST + RUSH_FOR
      // a speed-up that carries on from the straight run: `lead` is the share of
      // the stretch already covered at the start's pace (0 = from a standstill)
      const rush = (lead) => (t) => lead * t + (1 - lead) * t * t

      // x, y and scale move together in a straight line up to the first square
      tl.to(sideTruck, { y: END_Y, duration: HIT - TRUCK_AT, ease: 'none' }, TRUCK_AT)
      tl.to(sideTruck, { scale: 1, duration: HIT - TRUCK_AT, ease: 'none' }, TRUCK_AT)
      // x keeps the same pace across the first square, then speeds up into the farm
      const pace = (xTouch - x0) / (HIT - TRUCK_AT) // px per unit
      const xAt = (t) => x0 + pace * (t - TRUCK_AT)
      tl.to(sideTruck, { x: xAt(PAST), duration: PAST - TRUCK_AT, ease: 'none' }, TRUCK_AT)
      const lead = Math.min(1, Math.max(0.1, (pace * RUSH_FOR) / (0 - xAt(PAST))))
      tl.to(sideTruck, { x: 0, duration: RUSH_FOR, ease: rush(lead) }, PAST)

      // the farm starts to grow as the hood touches the first square, slowly, and
      // takes off together with the truck
      const farmP = { v: 0 }
      const applyFarm = () => {
        const r = slotRect()
        const W = pin.clientWidth
        const H = pin.clientHeight
        const k = 1 - farmP.v
        farm.style.clipPath = `inset(${r.top * k}px ${(W - r.left - r.w) * k}px ${(H - r.top - r.h) * k}px ${r.left * k}px)`
        gsap.set(farmScene, { scale: 0.7 + 0.3 * farmP.v })
      }
      const SLOW = 0.18
      tl.to(farmP, { v: SLOW, duration: PAST - HIT, ease: 'none', onUpdate: applyFarm }, HIT)
      const farmLead = Math.min(1, Math.max(0.05, ((SLOW / (PAST - HIT)) * RUSH_FOR) / (1 - SLOW)))
      tl.to(farmP, { v: 1, duration: RUSH_FOR, ease: rush(farmLead), onUpdate: applyFarm }, PAST)
      tl.to(tiles.slice(0, 2), { opacity: 0, x: (i) => (i ? 60 : -90), duration: RUSH_FOR + 0.6, ease: 'power2.in' }, PAST - 0.2)
      tl.to(root.current.querySelector('[data-trio-frame]'), { opacity: 0, duration: RUSH_FOR + 0.4 }, PAST - 0.2)
      tl.to(ink[1], { color: '#fff', duration: 0.9 }, END - 0.9)
      tl.to(curtain, { opacity: 0, duration: 0.6 }, END + 0.3)
      // a beat to look at the finished scene
      tl.to({}, { duration: 1.6 }, END + 0.6)
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
      className="relative h-[960vh] bg-[#1a1512] text-white"
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

          {/* the torn paper curtain that rises over the zoom */}
          <div
            data-curtain
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-9 -bottom-2 z-20 will-change-transform"
            style={{ filter: 'drop-shadow(0 -8px 14px rgba(20,12,8,0.4))' }}
          >
            <div className="h-full w-full" style={{ ...PAPER, clipPath: TORN_TOP }} />
          </div>

          {/* the dog comes in from the left edge, the pig from the right, and they meet */}
          <div className="pointer-events-none absolute inset-x-0 top-[26%] z-30 flex justify-center">
            <div
              data-buddies
              className="h-[min(54svh,44vw)] aspect-[2/1] max-w-[94vw]"
            >
              <PaperFrame bg="transparent" className="h-full !w-full">
                <div className="relative h-full overflow-hidden">
                  {[0, 1].map((side) => (
                    <div
                      key={side}
                      data-buddy-half
                      className={`absolute inset-y-0 w-1/2 overflow-hidden will-change-transform ${side ? 'right-0' : 'left-0'}`}
                    >
                      <img
                        {...imgAttrs(closeupBuddies, variants)}
                        sizes="(max-aspect-ratio: 3/2) 130vh, 90vw"
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className={`absolute top-0 h-full w-[200%] max-w-none object-cover ${side ? 'right-0' : 'left-0'}`}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </PaperFrame>
            </div>
          </div>

          {/* three scenes take the place the dog and the pig held */}
          <div className="pointer-events-none absolute inset-x-0 top-[26%] z-30 flex justify-center">
            <div
              data-trio
              className="[--s:min(25vw,50svh)] max-md:[--s:min(27vw,34svh)]"
              style={{ width: 'calc(var(--s) * 3 + 8vw)', maxWidth: '96vw' }}
            >
              <div data-trio-frame>
                <PaperFrame bg="transparent" shadow={false} className="!w-full">
                  <div className="flex items-center justify-center gap-[1.6vw] px-[2.4vw] py-[2.6vw]">
                    {[CanyonScene, FenceScene].map((Scene, i) => (
                      <div
                        key={i}
                        data-tile
                        className="relative aspect-square w-[var(--s)] shrink-0 overflow-hidden shadow-[0_14px_40px_rgba(30,25,20,0.35)]"
                      >
                        <Scene className="absolute inset-0 h-full w-full" />
                      </div>
                    ))}
                    <div data-slot-farm className="aspect-square w-[var(--s)] shrink-0" />
                  </div>
                </PaperFrame>
              </div>
            </div>
          </div>

          {/* the last scene: starts as the third square, grows to the whole page */}
          <div
            data-farm
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[35] overflow-hidden will-change-transform"
          >
            <FarmScene className="absolute inset-0 h-full w-full" data-farm-scene />
          </div>

          {/* and the truck that drives into it */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center">
            <div data-side-truck className="w-[min(46vw,96svh)] will-change-transform max-md:w-[82vw]">
              <SideTruck className="block h-auto w-full" />
            </div>
          </div>

          {/* black ink on the paper: later it turns white over the farm */}
          <div className="pointer-events-none absolute inset-x-0 top-[10%] z-[45] flex justify-center px-6 md:top-[9%]">
            <div className="relative h-24 w-full max-w-3xl text-center md:h-20">
              {captions.slice(2, 4).map((text) => (
                <p
                  key={text}
                  data-ink
                  className="absolute inset-x-0 text-[15px] leading-relaxed font-semibold text-[#1b1a18] md:text-lg"
                >
                  {text}
                </p>
              ))}
            </div>
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
              {captions.slice(0, 2).map((text) => (
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
