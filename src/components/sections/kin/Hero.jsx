import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { prefersReducedMotion } from '../../../lib/motion'
import { BAR_H, WORD, accentBar, doorSlots, layoutWord } from './barGlyphs'

/**
 * KIN — Hero
 *
 * The brand is the image: a word built from identical bars (barGlyphs.js),
 * drawn in one fixed layer above the page. One bar — the one nearest the
 * middle — carries the accent colour all the way down.
 *
 *  1. Loader — a baseline draws itself, then the bars drop in from above one
 *     at a time and land on it like type being set (the accent bar last).
 *     The diagonal ones lean into their letters, cut flat by the band. Then
 *     the rule, the hairlines and the headline (line by line) arrive.
 *  2. Scroll — the word comes apart and the bars build a doorway over the
 *     next section: two pillars and a lintel with the accent bar as its
 *     keystone. Further down the doorway goes dark and the view walks
 *     through it; the dark inside becomes the room that follows
 *     (`data-kin-dark`).
 *
 * Every position is computed from the viewport and the word, so the same
 * beat runs on a phone, and changing WORD (or the `word` prop) rebuilds the
 * loader, the band and the doorway on its own.
 *
 * Calm (reduce motion): no doorway. The word sits still in the hero and the
 * page fades in.
 */

const INK = '#141414'
const ACCENT = '#e1371f'
const SEEN_KEY = 'kin-loader-seen'

const NAV = [
  { label: 'Link 1', href: '#top' },
  { label: 'Link 2', href: '#rooms' },
  { label: 'Link 3', href: '#about' },
]

const ROOMS = [
  'Lorem ipsum dolor',
  'Sit amet consectetur',
  'Adipiscing elit sed',
  'Do eiusmod tempor',
  'Incididunt ut labore',
]

const pad = (n) => String(n).padStart(2, '0')

// Visitor's local time, "City — 14:32". Empty until mounted (no SSR mismatch).
function LocalTime({ place }) {
  const [now, setNow] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const tick = () => setNow(fmt.format(new Date()))
    tick()
    const id = window.setInterval(tick, 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <>
      {place} — <span className="tabular-nums">{now || '--:--'}</span>
    </>
  )
}

// Same drop order on every load: a shuffle that never starts at an edge.
function dropOrder(count, last) {
  const rest = Array.from({ length: count }, (_, i) => i).filter((i) => i !== last)
  const out = []
  let lo = 0
  let hi = rest.length - 1
  const fromMiddle = Math.floor(rest.length / 2)
  out.push(rest[fromMiddle])
  rest.splice(fromMiddle, 1)
  hi = rest.length - 1
  while (lo <= hi) {
    out.push(rest[hi])
    if (lo !== hi) out.push(rest[lo])
    lo += 1
    hi -= 1
  }
  return [...out, last]
}

// Display face: Archivo at its widest, in capitals.
const DISPLAY = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }

// The four hairlines of the nav box. In the hero they are drawn by the
// loader (rule-x / rule-y); in the fixed bar they are what morphs: the top
// and the sides fold away and the bottom stretches edge to edge.
function BoxLines({ variant }) {
  const hero = variant === 'hero'
  const x = (side) => (hero ? { 'data-kin-rule-x': true, 'data-kin-bline': side } : { 'data-kin-sline': side })
  const y = (side) => (hero ? { 'data-kin-rule-y': true, 'data-kin-bline': side } : { 'data-kin-sline': side })
  return (
    <>
      <span aria-hidden="true" {...x('top')} className="absolute inset-x-0 top-0 h-px bg-[#141414]" />
      <span aria-hidden="true" {...x('bottom')} className="absolute inset-x-0 bottom-0 h-px bg-[#141414]" />
      <span aria-hidden="true" {...y('left')} className="absolute inset-y-0 left-0 w-px bg-[#141414]" />
      <span aria-hidden="true" {...y('right')} className="absolute inset-y-0 right-0 w-px bg-[#141414]" />
    </>
  )
}

// The nav row — brand, numbered links, the solid call to action, time — on
// the page's 12-column grid. The hero shows it inside a hairline box; the
// fixed bar repeats it in exactly the same place once the box reaches the
// top, so the box seems to become the header.
function BarRow({ fade = false, brand, brandNote, links, visitLabel, visitHref, place }) {
  const f = fade ? { 'data-kin-fade': true } : {}
  return (
    <nav aria-label="Primary" className="grid grid-cols-12 items-center gap-x-[1.25vw] px-[1.25vw] py-[0.8vw]">
      <p {...f} className="col-span-3">
        {brand} <span className="opacity-55">{brandNote}</span>
      </p>
      <ul {...f} className="col-span-5 col-start-4 flex gap-[2em]">
        {links.map((l, i) => (
          <li key={l.href} className="flex gap-[0.6em]">
            <span className="tabular-nums opacity-45">{pad(i + 1)}</span>
            <a href={l.href} className="tpl-link tpl-hit relative">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <a {...f} href={visitHref} className="kin-solid tpl-hit relative col-span-2 col-start-9 inline-flex w-fit items-center gap-[0.6em] bg-[#141414] px-[0.9em] py-[0.45em] text-[#e1e2de]">
        <span aria-hidden="true" className="inline-block h-[0.62em] w-[0.3em]" style={{ backgroundColor: ACCENT }} />
        {visitLabel}
      </a>
      <p {...f} className="col-span-2 col-start-11 text-right">
        <LocalTime place={place} />
      </p>
    </nav>
  )
}

// Phone menu: a paper panel that drops over the page with the links set
// big, one per line, each rising out of its mask.
function MenuOverlay({ open, onClose, links, visitLabel, visitHref, place, closeLabel }) {
  const ref = useRef(null)
  const closeRef = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const calm = prefersReducedMotion()
    const lines = el.querySelectorAll('[data-kin-menu-line]')
    if (open) {
      wasOpen.current = true
      getLenis()?.stop()
      gsap.killTweensOf([el, ...lines])
      gsap.set(el, { display: 'flex', autoAlpha: 1 })
      if (calm) {
        gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
      } else {
        gsap.fromTo(
          el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.7,
            ease: 'power3.inOut',
          },
        )
        gsap.fromTo(
          lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.07,
            delay: 0.3,
          },
        )
      }
      closeRef.current?.focus()
      const onKey = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    // Only a real close touches the scroll: on mount the loader owns it.
    if (!wasOpen.current) return undefined
    wasOpen.current = false
    getLenis()?.start()
    const hide = () => gsap.set(el, { display: 'none' })
    if (calm) gsap.to(el, { autoAlpha: 0, duration: 0.2, onComplete: hide })
    else
      gsap.to(el, {
        clipPath: 'inset(100% 0% 0% 0%)',
        duration: 0.55,
        ease: 'power3.inOut',
        onComplete: hide,
      })
    return undefined
  }, [open, onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[70] hidden flex-col-reverse bg-[#e1e2de] px-[4.5vw] pt-[8vw] pb-[4.5vw] text-[3.3vw] text-[#141414] md:hidden"
    >
      <div className="flex items-baseline justify-between">
        <button ref={closeRef} type="button" onClick={onClose} className="tpl-hit relative">
          {closeLabel}
        </button>
        <p>
          <LocalTime place={place} />
        </p>
      </div>
      <div className="mb-3 h-px bg-[#141414]" />
      <ul className="mb-auto">
        {links.map((l, i) => (
          <li key={l.href} className="flex items-start gap-[4vw] border-b border-[#141414]/20 py-[2.5vw]">
            <span className="pt-[1.6vw] tabular-nums">{pad(i + 1)}</span>
            <span className="block overflow-hidden pb-[0.05em]">
              <a
                data-kin-menu-line
                href={l.href}
                onClick={onClose}
                className="block text-[10vw] leading-[0.95] font-semibold uppercase"
                style={DISPLAY}
              >
                {l.label}
              </a>
            </span>
          </li>
        ))}
      </ul>
      <a
        href={visitHref}
        onClick={onClose}
        className="mb-[6vw] inline-flex w-fit items-center gap-[0.6em] bg-[#141414] px-[0.9em] py-[0.7em] text-[#e1e2de]"
      >
        <span aria-hidden="true" className="inline-block h-[0.62em] w-[0.3em]" style={{ backgroundColor: ACCENT }} />
        {visitLabel}
      </a>
    </div>
  )
}

export default function Hero({
  word = WORD,
  brand = 'Brand name',
  brandNote = 'Tagline',
  links = NAV,
  visitLabel = 'Call to action',
  visitHref = '#visit',
  place = 'City',
  listLabel = 'List title',
  rooms = ROOMS,
  lines = ['Headline 1—', 'Lorem ipsum', 'dolor sit amet'],
  line1,
  line2,
  line3,
  scrollLabel = 'Scroll to explore',
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const rootRef = useRef(null)
  const bandRef = useRef(null)
  const layerRef = useRef(null)
  const accentLayerRef = useRef(null)
  const navRef = useRef(null)
  const stickyRef = useRef(null)
  const cueRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const navProps = { brand, brandNote, links, visitLabel, visitHref, place }
  // The builder edits the headline line by line and the list as {text} rows.
  const headline = [line1, line2, line3].some(Boolean) ? [line1, line2, line3].filter(Boolean) : lines
  const roomTexts = rooms.map((r) => (typeof r === 'string' ? r : r?.text || ''))

  // The fixed bar: when the hero's nav box reaches the top edge, the bar
  // takes its place pixel for pixel and the box's lines morph into a header
  // rule — the top folds away, the sides retract, the bottom stretches edge
  // to edge. Scrolling back above that point draws the box again.
  useGSAP(
    () => {
      const sticky = stickyRef.current
      const box = navRef.current
      if (!sticky || !box) return undefined
      const calm = prefersReducedMotion()
      const line = (side) => sticky.querySelector(`[data-kin-sline='${side}']`)
      gsap.set(sticky, { autoAlpha: 0 })
      const morph = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } })
      morph.to(line('top'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.55 }, 0)
      morph.to([line('left'), line('right')], { scaleY: 0, transformOrigin: '50% 0%', duration: 0.45 }, 0)
      morph.fromTo(line('bottom'), { left: '0vw', right: '0vw' }, { left: '-1.25vw', right: '-1.25vw', duration: 0.65 }, 0.1)

      const show = () => {
        gsap.set(sticky, { autoAlpha: 1 })
        gsap.set(box, { autoAlpha: 0 })
        morph.eventCallback('onReverseComplete', null)
        if (calm) morph.progress(1)
        else morph.timeScale(1).play()
      }
      // Going back up, the swap is instant — at this point the bar and the
      // box sit on the same pixels — and it is the box, scrolling with the
      // page, that draws its lines back. (Redrawing them on the fixed bar
      // left it stuck at the top while the box moved away: a jump.)
      const boxLine = (side) => box.querySelector(`[data-kin-bline='${side}']`)
      const hide = () => {
        morph.pause(0)
        gsap.set(sticky, { autoAlpha: 0 })
        gsap.set(box, { autoAlpha: 1 })
        if (calm) return
        const ease = 'power3.inOut'
        gsap.fromTo(boxLine('top'), { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.55, ease, overwrite: true })
        gsap.fromTo([boxLine('left'), boxLine('right')], { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.45, ease, delay: 0.1, overwrite: true })
        gsap.fromTo(boxLine('bottom'), { left: '-1.25vw', right: '-1.25vw' }, { left: '0vw', right: '0vw', duration: 0.6, ease, overwrite: true })
      }
      const st = ScrollTrigger.create({
        trigger: box,
        start: 'top top',
        onEnter: show,
        onLeaveBack: hide,
      })
      // The scroll cue leaves with the first quarter screen of scroll.
      const cue = [cueRef.current].filter(Boolean)
      const cueTween = cue.length
        ? gsap.to(cue, {
            autoAlpha: 0,
            y: calm ? 0 : -16,
            ease: 'none',
            scrollTrigger: {
              start: 0,
              end: () => window.innerHeight * 0.25,
              scrub: true,
            },
          })
        : null
      return () => {
        st.kill()
        morph.kill()
        cueTween?.scrollTrigger?.kill()
        cueTween?.kill()
      }
    },
    { dependencies: [] },
  )
  const layout = useMemo(() => layoutWord(word), [word])
  const accent = useMemo(() => accentBar(layout), [layout])

  useGSAP(
    () => {
      const root = rootRef.current
      const band = bandRef.current
      const layer = layerRef.current
      const accentLayer = accentLayerRef.current
      // Both layers move together; only their stacking differs (the accent
      // bar sits above the intro text, the ink bars under its blend).
      const layers = [layer, accentLayer].filter(Boolean)
      const bars = layout.bars.map((_, i) => root.querySelector(`[data-kin-bar='${i}']`))
      const voidEl = layer?.querySelector('[data-kin-void]')
      if (!root || !band || !layer || bars.some((b) => !b)) return undefined

      const calm = prefersReducedMotion()
      const q = (sel) => gsap.utils.toArray(sel, root)
      const ground = q('[data-kin-ground]')
      const plinths = q('[data-kin-plinth]')
      const rulesX = q('[data-kin-rule-x]')
      const rulesY = q('[data-kin-rule-y]')
      const titleLines = q('[data-kin-line]')
      const fades = q('[data-kin-fade]')

      // Geometry of the band, in the layer's coordinates. With the layer
      // fixed, they match the viewport while the hero sits at the top.
      // The band's height sets the letters' size (it is capped at about half
      // the screen, see the markup); whatever width is left over spreads the
      // letters apart so the word still runs edge to edge.
      let geo = null
      const measure = () => {
        const r = band.getBoundingClientRect()
        const h = root.getBoundingClientRect()
        const s = Math.min(r.width / layout.width, r.height / BAR_H)
        const spare = r.width / s - layout.width
        geo = {
          s,
          extra: layout.letters > 1 ? Math.max(0, spare) / (layout.letters - 1) : 0,
          x: r.left - h.left,
          y: r.top - h.top,
          w: r.width,
          h: BAR_H * s,
          vw: layer.clientWidth,
          vh: layer.clientHeight,
        }
        gsap.set(bars, {
          width: s,
          height: BAR_H * s,
          xPercent: -50,
          yPercent: -50,
        })
        // A plinth under each letter, following the letter spacing.
        plinths.forEach((el, li) => {
          const r = layout.ranges[li]
          if (!r) return
          gsap.set(el, { left: (r.x0 + li * geo.extra) * s, width: (r.x1 - r.x0) * s })
        })
      }

      const wordPose = (i) => {
        const b = layout.bars[i]
        return {
          x: geo.x + (b.cx + b.li * geo.extra) * geo.s,
          y: geo.y + b.cy * geo.s,
          rotation: b.r,
          scaleX: 1,
          scaleY: b.sy,
        }
      }
      const bandClip = () => `inset(${geo.y}px 0px ${Math.max(0, geo.vh - geo.y - geo.h)}px 0px)`
      const colorOf = (i) => (i === accent ? ACCENT : INK)

      const restWord = () => {
        bars.forEach((bar, i) =>
          gsap.set(bar, {
            ...wordPose(i),
            backgroundColor: colorOf(i),
            transformOrigin: '50% 50%',
          }),
        )
        if (voidEl) gsap.set(voidEl, { autoAlpha: 0 })
      }

      // ---- Calm: the word stays put, everything fades in once. ----------
      if (calm) {
        gsap.set(layers, { position: 'absolute', zIndex: 1 })
        measure()
        restWord()
        gsap.set(layers, { clipPath: bandClip() })
        gsap.from([...titleLines, ...fades], {
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.05,
          delay: 0.2,
        })
        const onResize = () => {
          measure()
          restWord()
          gsap.set(layers, { clipPath: bandClip() })
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }

      // ---- Scroll: word → doorway → through it into the dark room --------
      let scrollTl = null
      let handoff = null
      let follow = null
      const buildScroll = () => {
        scrollTl?.scrollTrigger?.kill()
        scrollTl?.kill()
        handoff?.kill()
        follow?.kill()
        measure()
        restWord()
        // Until the hero reaches the top the fixed layer rides along with it
        // (in a builder composition it can sit further down the page; fixed
        // bars would otherwise cover whatever comes before it).
        const track = () => gsap.set(layers, { y: Math.max(0, root.getBoundingClientRect().top) })
        track()
        follow = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'top top',
          onUpdate: track,
          onEnterBack: track,
          onLeaveBack: track,
          onLeave: () => gsap.set(layers, { y: 0 }),
        })
        const { s, vw, vh } = geo
        const phone = vw < 768

        const door = doorSlots(bars.length)
        const sp = Math.min(((phone ? 0.62 : 0.3) * vw) / door.width, (vh * 0.5) / door.height)
        const k = sp / s
        const ox = vw / 2
        const oy = vh * (phone ? 0.86 : 0.88)

        // The accent bar is the keystone; the rest keep their left→right
        // order (ground first) so nothing crosses on the way down.
        const mid = layout.width / 2
        const keySlot = door.slots.find((sl) => sl.key)
        const others = door.slots.filter((sl) => sl !== keySlot).sort((a, b) => a.cx - b.cx || b.cy - a.cy)
        const rest = layout.bars
          .map((_, i) => i)
          .filter((i) => i !== accent)
          .sort((a, b) => layout.bars[a].cx - layout.bars[b].cx)
        const slotOf = new Map(rest.map((i, n) => [i, others[n]]))
        slotOf.set(accent, keySlot)

        const darkEl = document.querySelector('[data-kin-dark]')
        const heroTop = root.getBoundingClientRect().top + window.scrollY
        const endPx = darkEl
          ? darkEl.getBoundingClientRect().top + window.scrollY - heroTop
          : root.offsetHeight + vh * 2
        // The dark has to fill the screen by the time the room's top reaches
        // the bottom edge; the room (drawn above the bars, same ink) then
        // slides in over a screen that is already black.
        const aEnd = Math.min(vh * 0.95, endPx * 0.4)
        const darken = vh * 0.45
        const walk = vh * 0.8
        const total = Math.max(aEnd + vh * 0.25 + darken + walk, endPx - vh)
        const walkStart = total - walk
        const darkStart = walkStart - darken

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: `+=${total}`,
            scrub: 1,
          },
        })
        handoff = ScrollTrigger.create({
          trigger: darkEl || root,
          start: darkEl ? 'top top' : 'bottom top',
          onEnter: () => gsap.set(layers, { autoAlpha: 0 }),
          onLeaveBack: () => gsap.set(layers, { autoAlpha: 1 }),
        })

        // The band stops cutting the letters as soon as they move.
        tl.fromTo(layers, { clipPath: bandClip() }, { clipPath: 'inset(0px 0px 0px 0px)', duration: aEnd * 0.12 }, 0)

        // Where everything goes when the view walks through the door.
        const o = door.opening
        const inset = 0.14
        const vx0 = ox + (o.x0 + inset) * sp
        const vx1 = ox + (o.x1 - inset) * sp
        const vy0 = oy + (o.y0 + inset) * sp
        const vy1 = oy + o.y1 * sp
        const cx = (vx0 + vx1) / 2
        const cy = (vy0 + vy1) / 2
        const zoom = Math.max(vw / (vx1 - vx0), vh / (vy1 - vy0)) * 1.15
        const through = (x, y) => ({
          x: vw / 2 + (x - cx) * zoom,
          y: vh / 2 + (y - cy) * zoom,
        })

        // The doorway's dark: grows up from the ground, then fills the view.
        if (voidEl) {
          gsap.set(voidEl, {
            autoAlpha: 1,
            width: vx1 - vx0,
            height: vy1 - vy0,
            xPercent: -50,
            yPercent: -50,
            x: cx,
            y: cy,
            scaleX: 1,
            scaleY: 0,
            transformOrigin: '50% 100%',
          })
          tl.to(voidEl, { scaleY: 1, duration: darken, ease: 'power2.inOut' }, darkStart)
          tl.to(
            voidEl,
            {
              ...through(cx, cy),
              scaleX: zoom,
              scaleY: zoom,
              transformOrigin: '50% 50%',
              duration: walk,
              ease: 'power2.in',
            },
            walkStart,
          )
        }

        bars.forEach((bar, i) => {
          const from = wordPose(i)
          const slot = slotOf.get(i)
          const side = layout.bars[i].cx < mid ? -1 : 1
          const lying = slot.r === 90
          const turn = i === accent ? 90 : lying ? side * 270 : side * 360
          const to = {
            x: ox + slot.cx * sp,
            y: oy + slot.cy * sp,
            rotation: turn,
            scaleX: k,
            scaleY: k * slot.sy,
          }
          const lead = Math.abs(layout.bars[i].cx - mid) / mid // outer bars leave first
          const startA = (1 - lead) * aEnd * 0.1
          const half = (aEnd - startA) / 2

          // Out and up with most of the spin, then down into place.
          tl.fromTo(
            bar,
            from,
            {
              x: gsap.utils.interpolate(from.x, to.x, 0.5) + side * vw * 0.05,
              y: gsap.utils.interpolate(from.y, to.y, 0.35) - vh * 0.06,
              rotation: gsap.utils.interpolate(from.rotation, to.rotation, 0.65),
              scaleX: gsap.utils.interpolate(1, k, 0.5),
              scaleY: gsap.utils.interpolate(from.scaleY, to.scaleY, 0.5),
              duration: half,
              ease: 'power1.in',
            },
            startA,
          )
          tl.to(bar, { ...to, duration: half, ease: 'power3.out' }, startA + half)

          // Walk through: the frame opens out past the edges of the screen.
          tl.to(
            bar,
            {
              ...through(to.x, to.y),
              scaleX: k * zoom,
              scaleY: to.scaleY * zoom,
              duration: walk,
              ease: 'power2.in',
            },
            walkStart,
          )
        })

        scrollTl = tl
      }

      // ---- Loader: type being set ----------------------------------------
      const seen = (() => {
        try {
          return sessionStorage.getItem(SEEN_KEY) === '1'
        } catch {
          return false
        }
      })()
      const f = seen ? 0.6 : 1

      // In a builder composition the hero may sit further down the page:
      // then there is no loader (it would yank the page to the top); the
      // word is simply set and the scroll beat takes over.
      const atTop = root.getBoundingClientRect().top + window.scrollY < 10
      if (!atTop) {
        gsap.set(layer, { zIndex: 30 })
        gsap.set(accentLayer, { zIndex: 44 })
        buildScroll()
        ScrollTrigger.refresh()
        let staticTimer = 0
        const onResizeStatic = () => {
          window.clearTimeout(staticTimer)
          staticTimer = window.setTimeout(() => {
            buildScroll()
            ScrollTrigger.refresh()
          }, 180)
        }
        window.addEventListener('resize', onResizeStatic)
        return () => {
          window.clearTimeout(staticTimer)
          window.removeEventListener('resize', onResizeStatic)
          scrollTl?.scrollTrigger?.kill()
          scrollTl?.kill()
          handoff?.kill()
          follow?.kill()
        }
      }

      // The loader always plays from the top of the page.
      window.scrollTo(0, 0)
      const lock = () => getLenis()?.stop()
      lock()
      const lockTimer = window.setTimeout(lock, 0)
      const block = (e) => e.preventDefault()
      window.addEventListener('wheel', block, { passive: false })
      window.addEventListener('touchmove', block, { passive: false })
      const unlock = () => {
        window.removeEventListener('wheel', block)
        window.removeEventListener('touchmove', block)
        getLenis()?.start()
      }

      measure()
      const bandCy = geo.y + geo.h / 2
      const order = dropOrder(bars.length, accent)

      gsap.set(layer, { zIndex: 60, clipPath: 'none' })
      gsap.set(accentLayer, { zIndex: 61, clipPath: 'none' })
      if (voidEl) gsap.set(voidEl, { autoAlpha: 0 })
      bars.forEach((bar, i) =>
        gsap.set(bar, {
          x: wordPose(i).x,
          y: -geo.h,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          backgroundColor: colorOf(i),
          transformOrigin: '50% 100%',
        }),
      )
      gsap.set(ground, { scaleX: 0, transformOrigin: '0% 50%' })
      gsap.set(plinths, { scaleX: 0, transformOrigin: '0% 50%' })
      gsap.set(rulesX, { scaleX: 0, transformOrigin: '0% 50%' })
      gsap.set(rulesY, { scaleY: 0, transformOrigin: '50% 0%' })
      gsap.set(titleLines, { yPercent: 110 })
      gsap.set(fades, { autoAlpha: 0 })

      const loader = gsap.timeline()
      loader.to(ground, { scaleX: 1, duration: 0.9 * f, ease: 'power2.inOut' }, 0.2 * f)
      // One bar at a time drops onto the baseline and lands with a small
      // squash, like a piece of type being struck.
      order.forEach((i, n) => {
        const t = (0.75 + n * 0.22) * f
        const bar = bars[i]
        loader.to(bar, { y: bandCy, duration: 0.42 * f, ease: 'power3.in' }, t)
        loader.to(bar, { scaleY: 0.86, duration: 0.07, ease: 'power1.out' }, t + 0.42 * f)
        loader.to(bar, { scaleY: 1, duration: 0.35, ease: 'back.out(3)' }, t + 0.42 * f + 0.07)
      })
      const leanAt = (0.75 + order.length * 0.22 + 0.45) * f
      // The diagonals lean into their letters, cut flat by the band.
      loader.set(bars, { transformOrigin: '50% 50%' }, leanAt - 0.01)
      loader.set(layers, { clipPath: bandClip() }, leanAt - 0.01)
      loader.to(
        bars,
        {
          y: (i) => wordPose(i).y,
          rotation: (i) => wordPose(i).rotation,
          scaleY: (i) => wordPose(i).scaleY,
          duration: 0.75 * f,
          ease: 'power3.inOut',
          stagger: 0.04 * f,
        },
        leanAt,
      )
      // The page sets itself: rule, hairlines, headline, then the rest.
      const t0 = leanAt + 0.35 * f
      // The plinths are laid one by one, left to right.
      loader.to(plinths, { scaleX: 1, duration: 0.7, ease: 'power3.inOut', stagger: 0.12 }, t0)
      loader.to(rulesX, { scaleX: 1, duration: 1, ease: 'power2.inOut' }, t0 + 0.2)
      loader.to(titleLines, { yPercent: 0, duration: 1, ease: 'power2.out', stagger: 0.1 }, t0 + 0.4)
      loader.to(fades, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', stagger: 0.06 }, t0 + 0.9)
      loader.to(rulesY, { scaleY: 1, duration: 1, ease: 'power2.inOut' }, t0 + 0.6)
      loader.add(() => {
        gsap.set(layer, { zIndex: 30 })
        gsap.set(accentLayer, { zIndex: 44 })
        try {
          sessionStorage.setItem(SEEN_KEY, '1')
        } catch {
          /* private mode */
        }
        unlock()
        buildScroll()
        ScrollTrigger.refresh()
      }, t0 + 0.4)

      let resizeTimer = 0
      const onResize = () => {
        if (loader.isActive()) return
        window.clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(() => {
          buildScroll()
          ScrollTrigger.refresh()
        }, 180)
      }
      window.addEventListener('resize', onResize)

      return () => {
        window.clearTimeout(lockTimer)
        window.clearTimeout(resizeTimer)
        window.removeEventListener('resize', onResize)
        unlock()
        scrollTl?.scrollTrigger?.kill()
        scrollTl?.kill()
        handoff?.kill()
        follow?.kill()
      }
    },
    { scope: rootRef, dependencies: [layout, accent] },
  )

  return (
    <section ref={rootRef} id="top" className="relative flex min-h-svh flex-col text-[#141414]">
      {/* Phone: the menu bar sits at the foot of the screen (difference
          blend, so it reads on paper and on the dark room alike). */}
      <div className="fixed inset-x-0 bottom-0 z-[52] flex items-center justify-between px-[4.5vw] pb-[4.5vw] text-[3.3vw] text-white mix-blend-difference md:hidden">
        <button data-kin-fade type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} className="tpl-hit relative inline-flex items-center gap-[0.6em]">
          <span aria-hidden="true" className="inline-block h-[0.62em] w-[0.3em] bg-current" />
          {menuLabel}
        </button>
        <p data-kin-fade>
          <LocalTime place={place} />
        </p>
      </div>
      <MenuOverlay open={menuOpen} onClose={closeMenu} closeLabel={closeLabel} {...navProps} />

      {/* Fixed bar (desktop): takes over from the hero's nav box. */}
      <div ref={stickyRef} className="invisible fixed inset-x-0 top-0 z-50 hidden bg-[#e1e2de] text-[0.82vw] md:block">
        <div className="relative mx-[1.25vw]">
          <BoxLines variant="bar" />
          <BarRow {...navProps} />
        </div>
      </div>

      {/* The bars (and the doorway's dark): fixed above the page, absolute in
          the calm version. */}
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <div data-kin-void className="invisible absolute left-0 top-0 bg-[#141414]" />
        {layout.bars.map((b, i) =>
          i === accent ? null : (
            <div key={i} data-kin-bar={i} className="absolute left-0 top-0 bg-[#141414] will-change-transform" />
          ),
        )}
      </div>
      {/* The accent bar on its own layer, above the intro text: the text's
          difference blend would turn red into cyan. Below the dark room. */}
      <div ref={accentLayerRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[44] overflow-hidden">
        <div
          data-kin-bar={accent}
          className="absolute left-0 top-0 will-change-transform"
          style={{ backgroundColor: ACCENT }}
        />
      </div>

      {/* Reserves the word's room; the bars are drawn in the layer. Full
          width, never taller than about half the screen with the plinths.
          On a phone the word stands at the foot of the screen instead. */}
      <div
        ref={bandRef}
        className="relative mx-[4.5vw] h-[min(calc(91vw*var(--kin-ratio)),calc(50svh-9vw))] max-md:order-2 md:mx-[1.25vw] md:mt-[1.25vw] md:h-[min(calc(97.5vw*var(--kin-ratio)),calc(50svh-4.6vw))]"
        style={{ '--kin-ratio': layout.height / layout.width }}
      >
        <span className="sr-only">{word}</span>
        {/* The baseline the bars land on. */}
        <div data-kin-ground className="absolute inset-x-0 bottom-0 h-px bg-[#141414]" />
      </div>

      {/* Plinths: a block under each letter, like a pedestal per piece. */}
      <div className="relative mx-[4.5vw] mt-[2vw] h-[2.6vw] max-md:order-3 md:mx-[1.25vw] md:mt-[1vw] md:h-[2.2vw]">
        {layout.ranges.map((r, li) => (
          <div key={li} data-kin-plinth className="absolute inset-y-0 left-0 bg-[#141414]" />
        ))}
      </div>
      <div aria-hidden="true" className="h-[17vw] max-md:order-4 md:hidden" />

      {/* Desktop nav: a hairline box, laid out like the header it turns into. */}
      <div ref={navRef} className="relative mx-[1.25vw] mt-[1.25vw] hidden text-[0.82vw] md:block">
        <BoxLines variant="hero" />
        <BarRow fade {...navProps} />
      </div>

      {/* Lower half: a 12-column grid — headline, list. */}
      <div className="relative flex flex-col px-[4.5vw] pt-[7vw] max-md:order-1 max-md:flex-1 md:mt-[1.25vw] md:grid md:flex-1 md:grid-cols-12 md:gap-x-[1.25vw] md:px-[1.25vw] md:pt-0">
        <div className="relative flex flex-col justify-between md:col-span-9 md:pt-[1.25vw] md:pb-[1.25vw]">
          {/* Scroll cue: a small box that fades away as the page moves. */}
          <div data-kin-fade className="hidden md:block">
            <div ref={cueRef} className="w-fit">
              <a href="#about" className="kin-cue tpl-hit relative inline-flex items-center gap-[0.6em] border border-[#141414] bg-[#e1e2de] px-[0.9em] py-[0.6em] text-[0.82vw] leading-none">
                {scrollLabel}
                <svg aria-hidden="true" viewBox="0 0 11 12" className="kin-scroll-arrow h-[0.85em] w-[0.85em]" fill="currentColor">
                  <path d="M5.5 12 10.5 6.9V5.1L6.1 9.5V0H4.9v9.5L.5 5.1v1.8z" />
                </svg>
              </a>
            </div>
          </div>
          <h1 className="text-[7.4vw] leading-[0.94] font-semibold uppercase md:text-[min(4.4vw,8.5svh)]" style={DISPLAY}>
            {headline.map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.05em]">
                <span data-kin-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </h1>
        </div>

        <div className="relative mt-[7vw] flex flex-col justify-end md:col-span-3 md:mt-0 md:pb-[1.25vw]">
          <div data-kin-fade className="text-[3.3vw] leading-[1.15] md:text-[0.82vw]">
            <p className="flex justify-between pb-[0.6em]">
              <span>{listLabel}</span>
              <span className="tabular-nums">({pad(roomTexts.length)})</span>
            </p>
            <ul className="kin-rooms border-t border-[#141414]">
              {roomTexts.map((r, i) => (
                <li key={r} className="kin-room flex gap-[1.4em] border-b border-[#141414]/20 py-[0.45em]">
                  <span className="kin-room-n tabular-nums">{pad(i + 1)}</span>
                  <span className="kin-room-t">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .kin-solid { transition: background-color 320ms ease, color 320ms ease, box-shadow 320ms ease; }
        .kin-scroll-arrow { transition: transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        .kin-cue { animation: kin-float 3.2s ease-in-out infinite; transition: background-color 320ms ease, color 320ms ease; }
        @keyframes kin-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .kin-room { transition: opacity 320ms ease; }
        .kin-room-n { transition: color 240ms ease; }
        .kin-room-t { transition: transform 420ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)); }
        @media (hover: hover) {
          .kin-solid:hover { background-color: #e1e2de; color: #141414; box-shadow: inset 0 0 0 1px #141414; }
          .kin-cue:hover { background-color: #141414; color: #e1e2de; }
          .kin-cue:hover .kin-scroll-arrow { transform: translateY(0.25em); }
          .kin-rooms:hover .kin-room { opacity: 0.35; }
          .kin-rooms .kin-room:hover { opacity: 1; }
          .kin-room:hover .kin-room-n { color: ${ACCENT}; }
          .kin-room:hover .kin-room-t { transform: translateX(0.5em); }
        }
        @media (prefers-reduced-motion: reduce) {
          :where(:root:not([data-motion='full'])) .kin-room,
          :where(:root:not([data-motion='full'])) .kin-room-t,
          :where(:root:not([data-motion='full'])) .kin-solid,
          :where(:root:not([data-motion='full'])) .kin-scroll-arrow { transition: none; }
          :where(:root:not([data-motion='full'])) .kin-cue { animation: none; }
        }
      `}</style>
    </section>
  )
}
