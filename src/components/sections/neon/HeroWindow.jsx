import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion, trackPointer } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { city, fore, room, sky, variants } from './assets/images'

/**
 * Depth of each layer: how far it drifts when you "move your head" (pointer,
 * finger or arrow keys). Like looking out of a window, the far city slides the
 * most behind the frame and the room barely moves. `scale` gives each layer
 * room to drift without showing its edges.
 */
const LAYERS = [
  { id: 'sky', src: sky, drift: 70, lift: 26, scale: 1.16 },
  { id: 'city', src: city, drift: 48, lift: 18, scale: 1.12 },
  { id: 'room', src: room, drift: 12, lift: 6, scale: 1.04 },
  { id: 'fore', src: fore, drift: -10, lift: -4, scale: 1.06 },
]

/**
 * HeroWindow — a cozy room at night, looking out at a neon megacity, painted
 * in layers. Move the pointer (or a finger, or the arrow keys) and the view
 * shifts like a person turning their head: the city slides behind the window
 * frame, the room stays put. Scrolling walks you through the glass into the
 * city.
 */
export default function HeroWindow({
  eyebrow = 'Eyebrow 1',
  title = 'Title 1',
  lead = 'Lead 1 — a quiet line about the page. Replace with your copy.',
  hint = 'Move to look around',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const scene = root.current
      if (prefersReducedMotion()) return calmReveal('[data-neon-copy]')

      const layers = LAYERS.map((l) => {
        const el = scene.querySelector(`[data-layer="${l.id}"]`)
        return {
          ...l,
          x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.out' }),
        }
      })

      // the "head": pointer / finger, nudged by the arrow keys
      const pointer = trackPointer()
      const keys = { x: 0, y: 0 }
      const onKey = (e) => {
        const step = 0.25
        if (e.key === 'ArrowLeft') keys.x = Math.max(-1, keys.x - step)
        else if (e.key === 'ArrowRight') keys.x = Math.min(1, keys.x + step)
        else if (e.key === 'ArrowUp') keys.y = Math.max(-1, keys.y - step)
        else if (e.key === 'ArrowDown') keys.y = Math.min(1, keys.y + step)
        else return
        // the arrows drive the view while the hero is on screen; past it they scroll as usual
        if (scene.getBoundingClientRect().top > -window.innerHeight * 0.5) e.preventDefault()
      }
      window.addEventListener('keydown', onKey)

      // On a screen narrower than the painting (a phone held upright) only part
      // of the scene fits: the head also pans across it, so the room, the cat
      // and the plants come into view. On a wide screen there's nothing to pan.
      const pin = scene.querySelector('[data-pin]')
      const panRoom = () => Math.max(0, (pin.clientHeight * (16 / 9) - pin.clientWidth) / 2) * 0.9
      // a slow idle sway so the scene breathes even when nobody moves (wider on a phone)
      const tick = (time) => {
        const wide = panRoom() > 0
        const swayX = Math.sin(time * (wide ? 0.11 : 0.18)) * (wide ? 0.55 : 0.12)
        const swayY = Math.sin(time * 0.13 + 1) * 0.06
        const hx = Math.max(-1, Math.min(1, pointer.x + keys.x + swayX))
        const hy = Math.max(-1, Math.min(1, pointer.y + keys.y + swayY))
        const pan = -hx * panRoom()
        // looking right brings the left of the view into the window: the far layers slide the other way
        layers.forEach((l) => {
          l.x(pan - hx * l.drift)
          l.y(-hy * l.lift)
        })
      }
      gsap.ticker.add(tick)

      // entrance: the room light comes up, then the city wakes behind the glass
      gsap.from('[data-layer="sky"], [data-layer="city"]', { opacity: 0, duration: 1.6, ease: 'power2.out', stagger: 0.25 })
      gsap.from('[data-layer="room"]', { opacity: 0, filter: 'brightness(0.3)', duration: 1.4, ease: 'power2.out' })
      gsap.from('[data-layer="fore"]', { opacity: 0, x: -30, duration: 1.4, delay: 0.5, ease: 'power3.out' })
      gsap.from('[data-neon-copy] > *', { y: 24, opacity: 0, duration: 0.9, delay: 0.9, stagger: 0.12, ease: 'power3.out' })

      // scroll: walk through the glass — the room opens up past the edges, the city comes closer
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: scene,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          pin: scene.querySelector('[data-pin]'),
          anticipatePin: 1,
        },
      })
      tl.to('[data-neon-copy]', { opacity: 0, y: -40, duration: 0.35 }, 0)
      tl.to('[data-neon-hint]', { opacity: 0, duration: 0.15 }, 0)
      tl.to('[data-dolly="fore"]', { scale: 1.9, opacity: 0, duration: 0.7 }, 0)
      tl.to('[data-dolly="room"]', { scale: 2.6, duration: 1, ease: 'power2.in' }, 0.05)
      tl.to('[data-dolly="room"]', { opacity: 0, duration: 0.3 }, 0.75)
      tl.to('[data-dolly="city"]', { scale: 1.35, duration: 1 }, 0.05)
      tl.to('[data-dolly="sky"]', { scale: 1.12, duration: 1 }, 0.05)

      return () => {
        window.removeEventListener('keydown', onKey)
        gsap.ticker.remove(tick)
        pointer.dispose?.()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative h-[260vh] bg-[#140a24] text-white calm:h-auto">
      <div data-pin className="relative h-svh overflow-hidden">
        {LAYERS.map((l) => (
          // two wrappers: the outer one dollies with the scroll, the inner one drifts with the head
          <div
            key={l.id}
            data-dolly={l.id}
            className="absolute inset-0 will-change-transform"
            // the room dollies toward the middle of the window
            style={{ transformOrigin: l.id === 'room' ? '50% 42%' : '50% 50%' }}
          >
            <div data-layer={l.id} className="absolute inset-0 will-change-transform" style={{ transform: `scale(${l.scale})` }}>
              <img
                {...imgAttrs(l.src, variants)}
                sizes="100vw"
                alt=""
                draggable={false}
                fetchPriority={l.id === 'sky' || l.id === 'room' ? 'high' : undefined}
                className="absolute top-0 left-1/2 h-full w-auto max-w-none min-w-full -translate-x-1/2 object-cover"
              />
            </div>
          </div>
        ))}

        {/* a soft bloom and vignette tie the layers together */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 55%, rgba(10,4,20,0.55) 100%), linear-gradient(180deg, rgba(10,4,20,0.35) 0%, transparent 22%)',
          }}
        />

        <div data-neon-copy className="pointer-events-none absolute inset-x-0 top-[9%] z-10 px-5 text-center md:top-[8%]">
          <p className="text-[12px] font-semibold tracking-[0.32em] text-white/80 uppercase drop-shadow md:text-[13px]">{eyebrow}</p>
          <h1 className="mx-auto mt-3 max-w-[14ch] font-display text-[clamp(2.8rem,8vw,7rem)] leading-[0.92] font-semibold italic drop-shadow-[0_6px_30px_rgba(20,0,40,0.7)]">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-white/85 drop-shadow md:text-base">{lead}</p>
        </div>

        <p data-neon-hint className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[11px] font-semibold tracking-[0.28em] whitespace-nowrap text-white/70 uppercase md:text-xs">
          {hint} <span aria-hidden="true">← → ↑ ↓</span>
        </p>
      </div>
    </section>
  )
}
