import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { attachScroll, magScale } from '../../../lib/beat'
import { RuptureOn, RuptureScript } from './RuptureOn'

const DEFAULT_PLATES = [
  { index: '01', title: 'Grid', tone: '#ffffff' },
  { index: '02', title: 'Fold', tone: '#9a9a9a' },
  { index: '03', title: 'Ratio', tone: '#555555' },
  { index: '04', title: 'Baseline', tone: '#222222' },
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

/**
 * FourPlates — drawer over the hero. The four squares tumble like the
 * hero cube (Beat hops + 90° rot), overlap, then one grows into the next chapter.
 */
export default function FourPlates({
  eyebrow = 'PLATES',
  platesText,
  plate1Title = 'Grid',
  plate2Title = 'Fold',
  plate3Title = 'Ratio',
  plate4Title = 'Baseline',
}) {
  const root = useRef(null)
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
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.set(drawer, { yPercent: reduced ? 0 : 100 })
      gsap.set(fills, { transformOrigin: '50% 50%', scale: 1, autoAlpha: 1 })
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
          tl.to(
            keepFill,
            {
              scale: 22,
              backgroundColor: '#ffffff',
              duration: 0.95,
              onUpdate() {
                keepFill.classList.toggle('is-zoom', this.progress() > 0.02)
              },
            },
            3.55,
          )
        }
      })

      mm.add('(max-width: 1023px)', () => {
        gsap.set(drawer, { yPercent: 0 })
        gsap.set(cards, { autoAlpha: 1 })
        gsap.set(fills, { autoAlpha: 1, scale: 1 })
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [eyebrow, plate1Title, plate2Title, plate3Title, plate4Title, platesText] },
  )

  return (
    <section
      id="systems"
      ref={root}
      className="relative z-[45] -mt-[100svh] text-white"
    >
      <div data-plates-pin className="relative h-svh overflow-hidden">
        <div data-drawer className="absolute inset-0 flex flex-col bg-[#111] will-change-transform">
          <h2
            data-plates-title
            className="relative shrink-0 px-5 pt-16 font-grotesk text-[clamp(2.1rem,6.4vw,5.8rem)] font-medium leading-[0.86] tracking-[-0.045em] uppercase md:px-8 md:pt-20"
          >
            <span className="relative inline-block">
              {eyebrow}
              <RuptureScript className="absolute top-0 left-0 origin-left whitespace-nowrap">
                {eyebrow}
              </RuptureScript>
            </span>
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
                  <span
                    data-swatch-fill
                    className="absolute inset-0"
                  >
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
