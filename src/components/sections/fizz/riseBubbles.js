import { gsap } from '../../../lib/gsap'

const rand = (min, max) => min + Math.random() * (max - min)

/**
 * FIZZ rising bubbles — one pool of glass circles (an outline and a little
 * window highlight, drawn in `currentColor`) that climb out of the bottom of
 * `host`, drift sideways and shrink away. The footer, the benefits and the
 * contact form all use it, so the page has a single bubble language.
 *
 * It only spawns while `trigger` is on screen. Call the returned function to
 * stop and remove everything. Meant for the full-motion version: callers skip
 * it when the visitor asked for calm.
 *
 * @param {HTMLElement} host    absolutely positioned layer the bubbles live in
 * @param {Element}     trigger element whose visibility turns the stream on
 * @param {object}      [opts]
 * @param {[number, number]} [opts.size]  min/max diameter in px
 * @param {number} [opts.every]           seconds between bubbles
 * @param {number} [opts.burst]           how many pop out when it first shows
 * @param {number} [opts.pool]            max bubbles alive at once
 */
export function riseBubbles(host, trigger, {
  size,
  every,
  burst,
  pool: poolSize,
} = {}) {
  const phone = window.innerWidth < 768
  const [minSize, maxSize] = size || (phone ? [34, 84] : [44, 128])
  const gap = every ?? (phone ? 0.65 : 0.42)
  const first = burst ?? (phone ? 4 : 8)

  const pool = Array.from({ length: poolSize ?? (phone ? 10 : 20) }, () => {
    const el = document.createElement('span')
    el.style.cssText =
      'position:absolute;left:0;bottom:0;border-radius:9999px;border:2px solid currentColor;opacity:0;will-change:transform'
    const shine = document.createElement('i')
    shine.style.cssText =
      'position:absolute;top:15%;left:20%;width:34%;height:19%;border-radius:9999px;background:currentColor;transform:rotate(-35deg)'
    el.appendChild(shine)
    host.appendChild(el)
    return { el, busy: false }
  })

  const spawn = () => {
    const bubble = pool.find((b) => !b.busy)
    if (!bubble) return
    bubble.busy = true
    const d = rand(minSize, maxSize)
    const rise = host.clientHeight + d + 60
    gsap.set(bubble.el, {
      width: d,
      height: d,
      left: `${rand(0, 100)}%`,
      xPercent: -50,
      y: d,
      x: 0,
      scale: 1,
      opacity: 0,
    })
    const tl = gsap.timeline({
      onComplete: () => {
        bubble.busy = false
      },
    })
    tl.to(bubble.el, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
    tl.to(bubble.el, { y: -rise, duration: rand(4.5, 8), ease: 'power1.out' }, 0)
    tl.to(bubble.el, { x: rand(-110, 110), duration: rand(4.5, 8), ease: 'sine.inOut' }, 0)
    tl.to(bubble.el, { scale: 0.5, duration: 1.4, ease: 'power1.in' }, '>-1.4')
    tl.to(bubble.el, { opacity: 0, duration: 0.5, ease: 'none' }, '>-0.5')
  }

  let inView = false
  let pending = true
  let acc = 0
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    if (inView && pending) {
      pending = false
      for (let i = 0; i < first; i += 1) gsap.delayedCall(i * 0.12, spawn)
    }
  })
  io.observe(trigger)

  const step = (_, deltaMs) => {
    if (!inView) return
    acc += deltaMs / 1000
    if (acc >= gap) {
      acc = 0
      spawn()
    }
  }
  gsap.ticker.add(step)

  return () => {
    io.disconnect()
    gsap.ticker.remove(step)
    pool.forEach(({ el }) => {
      gsap.killTweensOf(el)
      el.remove()
    })
  }
}
