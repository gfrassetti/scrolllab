import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'
import { getLenis } from '../../../hooks/useLenis'
import { LABEL } from './brand'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
/** How long the numbers stay visible after the last movement (ms): a flash, not a sign. */
const ACTIVE_MS = 600

/**
 * The scroll bar of the site: a vertical ruler, the sibling of the one that drops under the nav.
 *
 * Along the right edge, fine ticks every 8 px and a longer one every 80. A rust cursor marks where
 * the page is; the ticks around it grow a little, as under a magnifying glass. The page sections
 * (each `<section>` of <main>, numbered in order: today Home and Projects; any that are added come in on their own)
 * are marked with a longer line, and while scrolling (and a moment after) the number of
 * the current section appears; when the page is still, the ruler is left alone. The hero stages have no mark:
 * they are part of the run of section 01.
 *
 * It replaces the native bar (class `hide-native-scrollbar` on <html>, src/index.css). With a mouse or
 * trackpad it is clicked and dragged like a normal bar; on the phone it is only an indicator (a strip
 * that took touches would steal the scroll from the finger).
 *
 * Only transforms and a CSS variable of the cursor move; there is nothing to redraw per frame.
 */
export default function ScrollRuler({ on }) {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches)
  const [marks, setMarks] = useState([])
  const rulerRef = useRef(null)
  const markRef = useRef(null)
  const tagRef = useRef(null)
  const marksRef = useRef([])
  const timer = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER)
    const onChange = () => setFine(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Where each section starts (as a fraction of the run). It is measured on load and on resize.
  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return
      // A project page marks its panels (data-spot): in the horizontal strip, by how much scroll each one takes
      // up; in vertical, where each one starts. The home page and the single-scroll one, their sections.
      const marked = [...document.querySelectorAll('[data-spot]')]
      const wrap = document.querySelector('.od-pd-h')
      // The horizontal strip (ProjectPage): its trigger gives where it starts and how long it lasts (read live, not a copy).
      const pin = wrap ? ScrollTrigger.getAll().find((t) => t.pin === wrap) : null
      const dist = pin ? pin.end - pin.start : 0
      let spots
      if (marked.length && dist > 0) {
        const track = document.querySelector('[data-pd-track]')
        const run = Math.max(1, track.scrollWidth - window.innerWidth)
        const start = Math.max(0, pin.start)
        // Those in the strip, by how much scroll each one takes; those below (the closing), where they start.
        spots = marked.map((el) =>
          track.contains(el) ? start + Math.min(1, Math.max(0, el.offsetLeft / run)) * dist : el.getBoundingClientRect().top + window.scrollY,
        )
      } else if (marked.length) {
        spots = marked.map((el) => el.getBoundingClientRect().top + window.scrollY)
      } else {
        // The sheets of the page: the sections that mark themselves (a composition has no <main>), else the sections of <main>.
        const sheets = [...document.querySelectorAll('[data-od-section]')]
        spots = (sheets.length ? sheets : [...document.querySelectorAll('main > section')]).map((el) => el.getBoundingClientRect().top + window.scrollY)
      }
      const next = spots.map((y, i) => ({ n: String(i + 1).padStart(2, '0'), y, f: Math.min(1, y / max) }))
      marksRef.current = next
      setMarks((prev) => (prev.length === next.length && prev.every((m, i) => Math.abs(m.f - next[i].f) < 0.0005) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.documentElement)
    window.addEventListener('load', measure)
    ScrollTrigger.addEventListener('refresh', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('load', measure)
      ScrollTrigger.removeEventListener('refresh', measure)
    }
  }, [])

  // The cursor follows the page; the sheet number lights up while scrolling.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hide-native-scrollbar')
    const ruler = rulerRef.current
    const mark = markRef.current
    const tag = tagRef.current
    let last = -1
    let lastTag = ''
    const draw = (progress, scroll) => {
      const h = ruler.clientHeight
      const y = progress * h
      if (Math.abs(y - last) < 0.2) return
      last = y
      mark.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
      ruler.style.setProperty('--y', `${y.toFixed(1)}px`)
      let n = '01'
      // A section counts once it already occupies the top of the screen (not only when it reaches the top).
      for (const m of marksRef.current) if (scroll + window.innerHeight * 0.6 >= m.y) n = m.n
      if (n !== lastTag) {
        lastTag = n
        tag.textContent = n
      }
      ruler.classList.add('is-active')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (!ruler.dataset.dragging) ruler.classList.remove('is-active')
      }, ACTIVE_MS)
    }
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => draw(self.progress, self.scroll()),
    })
    draw(trigger.progress, trigger.scroll())
    ruler.classList.remove('is-active')
    return () => {
      trigger.kill()
      window.clearTimeout(timer.current)
      root.classList.remove('hide-native-scrollbar')
    }
  }, [])

  // Click or drag: the height on the ruler is the height on the page.
  useEffect(() => {
    const ruler = rulerRef.current
    if (!fine || !ruler) return undefined
    let dragging = false
    const go = (e, immediate) => {
      const rect = ruler.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      const y = ratio * (document.documentElement.scrollHeight - window.innerHeight)
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(y, { immediate })
      else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
    }
    const onDown = (e) => {
      if (e.button !== 0) return
      dragging = true
      ruler.setPointerCapture(e.pointerId)
      ruler.dataset.dragging = ''
      ruler.classList.add('is-active')
      go(e, false)
    }
    const onMove = (e) => dragging && go(e, true)
    const onUp = (e) => {
      dragging = false
      delete ruler.dataset.dragging
      if (ruler.hasPointerCapture(e.pointerId)) ruler.releasePointerCapture(e.pointerId)
    }
    ruler.addEventListener('pointerdown', onDown)
    ruler.addEventListener('pointermove', onMove)
    ruler.addEventListener('pointerup', onUp)
    ruler.addEventListener('pointercancel', onUp)
    return () => {
      ruler.removeEventListener('pointerdown', onDown)
      ruler.removeEventListener('pointermove', onMove)
      ruler.removeEventListener('pointerup', onUp)
      ruler.removeEventListener('pointercancel', onUp)
    }
  }, [fine])

  return (
    <div ref={rulerRef} className="od-ruler" data-on={on ? '' : undefined} data-fine={fine ? '' : undefined} aria-hidden="true">
      <span className="od-ruler__ticks" />
      <span className="od-ruler__lens" />
      {marks.map((m) => (
        <span key={m.n} className="od-ruler__wp" style={{ top: `${m.f * 100}%` }}>
          <span className="od-ruler__wpn" style={LABEL}>
            {m.n}
          </span>
        </span>
      ))}
      <span ref={markRef} className="od-ruler__mark">
        <span ref={tagRef} className="od-ruler__tag" style={LABEL}>
          01
        </span>
      </span>
    </div>
  )
}
