import { useId, useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { attachScroll, magScale } from '../../../lib/beat'
import { RuptureOn, RuptureHit } from './RuptureOn'

const DEFAULT_PLATES = [
  { index: '01', title: 'Rule', tone: '#16110e' },
  { index: '02', title: 'Fold', tone: '#656565' },
  { index: '03', title: 'Ratio', tone: '#a3a3a3' },
  { index: '04', title: 'Baseline', tone: '#d4cfc6' },
]

const NEXT_RULES = [
  { left: '22%', height: '28%' },
  { left: '38%', height: '52%' },
  { left: '54%', height: '36%' },
  { left: '71%', height: '64%' },
  { left: '84%', height: '22%' },
]

function tumbleSteps(i, hop) {
  const towardX = 512 - (i + 0.5) * 256
  const landRot = i === 0 ? 360 : 90 * i
  return [
    { delay_px: 70 * i, dx: towardX * 0.2, dy: -hop, rot: 90, from: 0, acc: 'ease-out', speed: 1 },
    { dx: towardX * 0.58, dy: -hop, rot: 90, speed: 1 },
    { dx: towardX, dy: 16, rot: 180, acc: 'ease-in', speed: 1 },
    { dx: towardX, dy: 16, rot: landRot, speed: 1 },
  ]
}

function coverScale(pin, fill) {
  const side = fill.offsetWidth || 1
  return (Math.hypot(pin.offsetWidth, pin.offsetHeight) / side) * 1.18
}

/** Rotated square of the growing cube, in pin-local px — for the veil hole. */
function cubePoints(pin, fill) {
  const pinR = pin.getBoundingClientRect()
  const box = fill.getBoundingClientRect()
  const rot = ((Number(gsap.getProperty(fill, 'rotation')) || 0) * Math.PI) / 180
  const k = Math.abs(Math.cos(rot)) + Math.abs(Math.sin(rot))
  const side = k > 0.05 ? box.width / k : box.width
  const hw = side / 2
  const cx = box.left + box.width / 2 - pinR.left
  const cy = box.top + box.height / 2 - pinR.top
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [
    [-hw, -hw],
    [hw, -hw],
    [hw, hw],
    [-hw, hw],
  ].map(([x, y]) => `${x * c - y * s + cx},${x * s + y * c + cy}`)
}

function punchHole(pin, fill, hole) {
  if (!pin || !fill || !hole) return
  hole.setAttribute('points', cubePoints(pin, fill).join(' '))
}

/**
 * FourPlates — drawer over the hero. Cubes tumble, then the keeper
 * spins and grows. The next chapter is a sibling layer (never scaled);
 * a vector hole in the black veil reveals it (P4 + P13).
 */
export default function FourPlates({
  eyebrow = 'PLATES',
  platesText,
  plate1Title = 'Rule',
  plate2Title = 'Fold',
  plate3Title = 'Ratio',
  plate4Title = 'Baseline',
  nextImg,
}) {
  const root = useRef(null)
  const holeMaskId = `ratio-plate-hole-${useId().replace(/:/g, '')}`
  const plates = platesText
    ? platesText.split('\n').filter(Boolean).slice(0, 4).map((line, i) => {
        const [title] = line.split('|').map((p) => p.trim())
        return {
          index: String(i + 1).padStart(2, '0'),
          title: title || DEFAULT_PLATES[i].title,
          tone: DEFAULT_PLATES[i].tone,
        }
      })
    : [
        { ...DEFAULT_PLATES[0], title: plate1Title },
        { ...DEFAULT_PLATES[1], title: plate2Title },
        { ...DEFAULT_PLATES[2], title: plate3Title },
        { ...DEFAULT_PLATES[3], title: plate4Title },
      ]

  useGSAP(
    () => {
      const pin = root.current.querySelector('[data-plates-pin]')
      const drawer = pin.querySelector('[data-drawer]')
      const titleEl = pin.querySelector('[data-plates-title]')
      const cards = gsap.utils.toArray('[data-plate-card]', pin)
      const swatches = gsap.utils.toArray('[data-plate-swatch]', pin)
      const fills = gsap.utils.toArray('[data-swatch-fill]', pin)
      const keepFill = fills[0]
      const veil = pin.querySelector('[data-plates-veil]')
      const hole = pin.querySelector('[data-plates-hole]')
      const next = pin.querySelector('[data-plates-next]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.set(drawer, { yPercent: reduced ? 0 : 100 })
      gsap.set(fills, { transformOrigin: '50% 50%', scale: 1, rotation: 0, autoAlpha: 1 })
      if (veil) gsap.set(veil, { autoAlpha: 0 })
      if (next) gsap.set(next, { autoAlpha: 0 })
      cards.forEach((card, i) => {
        gsap.set(card, { left: `${i * 25}%`, width: '25%', autoAlpha: 1 })
      })

      if (reduced) return undefined

      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const s = magScale(pin.offsetWidth)
        const hop = Math.round((pin.offsetHeight * 0.26) / s)
        const players = swatches.map((sw, i) => attachScroll(sw, tumbleSteps(i, hop), s))
        const tumbleEnd = Math.max(...players.map((p) => p.duration), 1)
        const proxy = { px: 0 }

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=560%',
            pin: '[data-plates-pin]',
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        tl.to(drawer, { yPercent: 0, duration: 1.15 }, 0)
        tl.to({}, { duration: 0.32 }, 1.15)

        if (titleEl) tl.to(titleEl, { autoAlpha: 0, duration: 0.24 }, 1.47)
        tl.to('[data-plate-foot]', { autoAlpha: 0, duration: 0.2 }, 1.47)
        tl.to(fills.slice(1), { autoAlpha: 0.48, duration: 0.22 }, 1.55)

        tl.to(
          proxy,
          {
            px: tumbleEnd,
            duration: 1.65,
            onUpdate: () => players.forEach((p) => p.seek(proxy.px)),
          },
          1.55,
        )

        fills.slice(1).forEach((fill, i) => {
          tl.to(fill, { autoAlpha: 0, duration: 0.38 }, 3.22 + i * 0.05)
        })
        cards.slice(1).forEach((card, i) => {
          tl.to(card, { autoAlpha: 0, duration: 0.28 }, 3.22 + i * 0.04)
        })
        if (cards[0]) tl.to(cards[0], { borderColor: 'transparent', duration: 0.2 }, 3.45)
        if (keepFill) {
          const grow = coverScale(pin, keepFill)
          tl.add(() => {
            punchHole(pin, keepFill, hole)
          }, 3.48)
          if (next) tl.set(next, { autoAlpha: 1 }, 3.48)
          if (veil) tl.set(veil, { autoAlpha: 1 }, 3.48)
          tl.to(drawer, { autoAlpha: 0, duration: 0.16 }, 3.48)
          tl.to(
            keepFill,
            {
              scale: grow,
              rotation: 90,
              autoAlpha: 0,
              duration: 1.35,
              onUpdate() {
                keepFill.classList.toggle('is-zoom', this.progress() > 0.01)
                punchHole(pin, keepFill, hole)
              },
            },
            3.52,
          )
          tl.to({}, { duration: 0.28 }, 4.87)
        }
      })

      mm.add('(max-width: 1023px)', () => {
        gsap.set(drawer, { yPercent: 0 })
        gsap.set(cards, { autoAlpha: 1 })
        gsap.set(fills, { autoAlpha: 1, scale: 1 })
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [eyebrow, plate1Title, plate2Title, plate3Title, plate4Title, platesText, nextImg] },
  )

  return (
    <section
      id="systems"
      ref={root}
      className="pointer-events-none relative z-[45] -mt-[100svh] text-ratio-paper"
    >
      <div data-plates-pin className="pointer-events-none relative h-svh overflow-hidden">
        <div data-plates-next className="invisible absolute inset-0 z-0 bg-ratio-paper" aria-hidden="true">
          {nextImg ? (
            <img src={nextImg} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : null}
          <span className="absolute inset-x-0 top-[58%] h-px bg-ratio-ink" />
          {NEXT_RULES.map((rule) => (
            <span
              key={rule.left}
              className="absolute w-px bg-ratio-ink"
              style={{ left: rule.left, top: `calc(58% - ${rule.height})`, height: rule.height }}
            />
          ))}
          <RuptureHit className="absolute top-[46%] left-[16%] z-10 aspect-square !h-auto !w-[10%]" />
          <span className="absolute top-[46%] left-[28%] aspect-square w-[10%] border border-ratio-ink bg-ratio-paper" />
        </div>

        <svg
          data-plates-veil
          className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <mask id={holeMaskId} maskUnits="userSpaceOnUse">
              <rect width="100%" height="100%" fill="#fff" />
              <polygon data-plates-hole fill="#000" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="#ebe6dc" mask={`url(#${holeMaskId})`} />
        </svg>

        <div data-drawer className="pointer-events-auto absolute inset-0 z-10 flex flex-col bg-ratio-field will-change-transform">
          <h2
            data-plates-title
            className="relative shrink-0 px-5 pt-16 font-brico text-[clamp(2.1rem,6.4vw,5.8rem)] font-medium leading-[0.86] tracking-[-0.04em] uppercase md:px-8 md:pt-20"
          >
            {eyebrow}
            <RuptureHit className="absolute top-16 right-5 md:top-20 md:right-8" />
          </h2>

          <div className="relative mt-6 min-h-0 flex-1 overflow-visible">
            {plates.map((plate, i) => (
              <article
                key={plate.index}
                data-plate-card
                data-ratio-block
                className="absolute top-0 bottom-0 flex flex-col border-l border-white/20 first:border-l-0"
                style={{ left: `${i * 25}%`, width: '25%' }}
              >
                <div className="min-h-0 flex-1" />
                <div
                  data-plate-foot
                  className="flex items-end justify-between px-3 py-4 text-[11px] tracking-[0.08em] uppercase md:px-4"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="size-2.5 bg-current" />
                    {plate.title}
                  </span>
                  <span>{plate.index}</span>
                </div>
              </article>
            ))}

            <div data-swatch-layer className="pointer-events-none absolute inset-0 z-20 overflow-visible">
              {plates.map((plate, i) => (
                <span
                  key={`sw-${plate.index}`}
                  data-plate-swatch
                  className="absolute top-1/2 aspect-square w-[10.5%] will-change-transform"
                  style={{
                    left: `${(i + 0.5) * 25}%`,
                    marginLeft: '-5.25%',
                    marginTop: '-5.25%',
                    zIndex: 4 - i,
                  }}
                >
                  <span data-swatch-fill className="absolute inset-0 overflow-visible">
                    <span
                      data-rupture-off
                      className="absolute inset-0"
                      style={{ backgroundColor: plate.tone }}
                    />
                    <RuptureOn index={i} />
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
