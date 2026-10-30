import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'
import { getLenis, scrollToSection } from '../../../hooks/useLenis'
import { getRoute, navigate } from './router'
import { hidePaint } from './paint'
import { C, LABEL, OPEN_DELAY, OPEN_T as T, SITE } from './brand'
import Logo from './Logo'

/**
 * The site frame, drawn with lines like a floor plan: the nav on top and, below, the edge of the hero's text
 * block (its height is --band-h, in ordo.css).
 *
 * The opening (after the sketch is painted): two thin lines are born at the centre of the screen and stretch
 * out to the edges; one goes up and stays as the nav's border, the other goes down and stays as the border of
 * the block below (the hero draws that one, Hero.jsx, with the same timings: it belongs to its sheet). Then
 * the nav dividers are traced (from top to bottom), the buttons are painted (paint.js) and the ruler and the
 * registration crosses come in.
 *
 * The small logo (`logoRef`) starts invisible: the loader lands there and lights it up (via the hero).
 * On hover the logo is written again: from the first "O" to the last, each letter traced in rust and then
 * filled, and at the end the slab drops.
 *
 * All the cells are the same size (--mod, ordo.css), and the ruler lines, the hero columns and the edge of its
 * text cell are measured from the right edge in multiples of that module: the nav dividers
 * are the start of the lines that run down the page.
 *
 * By width: on the phone, the logo and "Menu" (which opens the sections and the contact in a sheet
 * below the nav); from 640, also "Contact"; from 768, the sections in the nav, no menu.
 */

const LINKS = [
  { id: 'projects', label: 'Projects' },
  { id: 'studio', label: 'Studio' },
  { id: 'services', label: 'Services' },
]
const MENU = [...LINKS, { id: 'contact', label: 'Contact', accent: true }]


export default function Nav({ logoRef, open, calm }) {
  const rootRef = useRef(null)

  // Before opening, everything in the frame is hidden (the lines, at the centre and with no length).
  useLayoutEffect(() => {
    const q = gsap.utils.selector(rootRef.current)
    const ctx = gsap.context(() => {
      if (calm) return
      // Each line starts at the centre of the screen: its position is measured and it is shifted there.
      const mid = window.innerHeight / 2
      gsap.set(q('[data-line]'), { scaleX: 0, y: (_i, el) => mid - el.getBoundingClientRect().top })
      gsap.set(q('[data-divider]'), { scaleY: 0 })
      hidePaint(q('[data-in]'))
      gsap.set(q('[data-ruler]'), { scaleX: 0 })
      gsap.set(q('[data-mark]'), { autoAlpha: 0, scale: 0.4 })
    }, rootRef)
    return () => ctx.revert()
  }, [calm])

  useEffect(() => {
    if (!open || calm) return undefined
    const q = gsap.utils.selector(rootRef.current)
    const tl = gsap.timeline({ delay: OPEN_DELAY })
    // The two lines are born together at the centre and stretch out to the edges…
    tl.to(q('[data-line]'), { scaleX: 1, duration: 0.8 * T, ease: 'expo.inOut' })
      // …and then part: one goes up to the nav, the other down to the band.
      .to(q('[data-line]'), { y: 0, duration: 1 * T, ease: 'expo.inOut' }, `-=${0.05 * T}`)
      .to(q('[data-ruler]'), { scaleX: 1, duration: 0.9 * T, ease: 'expo.out' }, `-=${0.25 * T}`)
      // The nav dividers are traced, from top to bottom, and the buttons are painted.
      .to(q('[data-divider]'), { scaleY: 1, duration: 0.55 * T, ease: 'expo.out', stagger: 0.08 * T }, `-=${0.7 * T}`)
      .to(q('[data-in]'), { '--paint': 0, duration: 0.8 * T, ease: 'power2.inOut', stagger: 0.07 * T }, `-=${0.45 * T}`)
      .to(q('[data-mark]'), { autoAlpha: 1, scale: 1, duration: 0.5 * T, ease: 'back.out(2)', stagger: 0.05 * T }, `-=${0.5 * T}`)
    return () => tl.kill()
  }, [open, calm])

  // The logo is written again on hover (once per pass; with "reduce motion", nothing).
  const writing = useRef(null)
  const writeLogo = () => {
    if (calm || writing.current?.isActive()) return
    const svg = logoRef.current?.querySelector('svg[data-part=row]')
    if (!svg) return
    const order = ['O1', 'R', 'D', 'O2', 'slab']
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } })
    order.forEach((id, i) => {
      const fill = svg.querySelector(`[data-part=${id}] [data-fill]`)
      const strokes = [...svg.querySelectorAll(`[data-part=${id}] [data-stroke]`)]
      const trail = { p: 0 }
      const at = i * 0.075
      tl.set(fill, { opacity: 0 }, 0)
        .set(strokes, { opacity: 1 }, 0)
        .call(() => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', '1')), null, 0)
        .to(trail, { p: 1, duration: 0.42, onUpdate: () => strokes.forEach((el) => el.setAttribute('stroke-dashoffset', String(1 - trail.p))) }, at)
        .to(fill, { opacity: 1, duration: 0.28, ease: 'power1.out' }, at + 0.3)
        .to(strokes, { opacity: 0, duration: 0.25 }, at + 0.42)
    })
    writing.current = tl
  }
  useEffect(() => () => writing.current?.kill(), [])

  const go = (id) => (e) => {
    e.preventDefault()
    setMenu(false)
    getLenis()?.start()
    // From a project page, the sections are on the home page.
    if (getRoute().name !== 'home') navigate({ name: 'home' }, { section: id })
    else scrollToSection(id)
  }

  // The phone menu: while it is open the page does not move; Escape closes it.
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)
  useEffect(() => {
    if (!menu) return undefined
    const lenis = getLenis()
    lenis?.stop()
    menuRef.current?.querySelector('a')?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMenu(false)
      menuBtnRef.current?.focus()
    }
    const onWide = () => window.innerWidth >= 768 && setMenu(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWide)
    return () => {
      lenis?.start()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onWide)
    }
  }, [menu])

  return (
    <div ref={rootRef} className="od-frame pointer-events-none fixed inset-0 z-40" style={{ color: C.ink }}>
      {/* The pad's binding: opaque paper behind the nav and the ruler. When the sheet changes, the outgoing sheet
          passes underneath. */}
      <span className="od-sheet od-frame__binding" aria-hidden="true" />
      {/* The nav. */}
      <header className="od-frame__nav absolute inset-x-0 top-0 flex items-stretch justify-between">
        <a
          ref={logoRef}
          href="#home"
          onClick={go('home')}
          onPointerEnter={(e) => e.pointerType !== 'touch' && writeLogo()}
          aria-label={`${SITE.name}, go to the top`}
          className="pointer-events-auto flex items-center px-4 sm:px-9"
          style={{ fontSize: 26, opacity: 0 }}
        >
          <Logo compact hairline />
        </a>
        <nav aria-label="Main" className="flex items-stretch">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={go(l.id)}
              className="od-cell pointer-events-auto relative hidden w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase md:flex"
              style={LABEL}
            >
              <span data-divider className="od-cell__divider" aria-hidden="true" />
              <span data-in className="od-paint">{l.label}</span>
            </a>
          ))}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="od-menu"
            className="od-cell pointer-events-auto relative flex w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase md:hidden"
            style={LABEL}
          >
            <span data-divider className="od-cell__divider" aria-hidden="true" />
            <span data-in className="od-paint">{menu ? 'Close' : 'Menu'}</span>
            <span data-in className={`od-paint od-menu__burger${menu ? ' is-open' : ''}`} aria-hidden="true" />
          </button>
          <a
            href="#contact"
            onClick={go('contact')}
            className="od-cell pointer-events-auto relative hidden w-[var(--mod)] items-center px-4 text-[12px] tracking-[0.1em] uppercase sm:flex"
            style={{ ...LABEL, color: C.rust }}
            data-cursor="Get in touch"
          >
            <span data-divider className="od-cell__divider" aria-hidden="true" />
            <span data-in className="od-paint">Contact</span>
            <span data-in className="od-paint absolute right-3 bottom-2 text-[14px]" aria-hidden="true">
              →
            </span>
          </a>
        </nav>
      </header>

      {/* The phone menu: a sheet that drops down from the nav. */}
      <nav
        id="od-menu"
        ref={menuRef}
        aria-label="Menu"
        className={`od-menu od-sheet${menu ? ' is-open pointer-events-auto' : ''}`}
        aria-hidden={!menu}
        inert={!menu}
      >
        <ul className="od-menu__list">
          {MENU.map((l, i) => (
            <li key={l.id} style={{ '--i': i }}>
              <a href={`#${l.id}`} onClick={go(l.id)} className="od-menu__link" style={l.accent ? { color: C.rust } : undefined}>
                <span className="od-menu__n" style={LABEL}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="od-menu__foot" style={LABEL}>
          <span>{SITE.places.join(' · ')}</span>
          <a href={SITE.instagram.href} target="_blank" rel="noreferrer" className="od-menu__ig">
            {SITE.instagram.handle}
          </a>
        </div>
      </nav>

      {/* The frame line and the ruler under the nav (the lower one belongs to the hero's sheet: it leaves with it). */}
      <span data-line="top" className="od-frame__line od-frame__line--top" aria-hidden="true" />
      <span data-ruler className="od-frame__ruler" aria-hidden="true" />

      {/* Registration crosses in the top corners (the bottom ones also belong to the sheet). */}
      {['tl', 'tr'].map((k) => (
        <span key={k} data-mark className={`od-frame__mark od-frame__mark--${k}`} aria-hidden="true" />
      ))}

    </div>
  )
}
