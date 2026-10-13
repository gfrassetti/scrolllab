import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

// The hero's cobalt family, light enough to read on the dark grape stage.
const WORD_COLORS = ['#9db8ff', '#6c86ff', '#c9d6ff', '#4f6bff']

/** `#rrggbb` mezclado con blanco (t > 0) o negro (t < 0): la familia de un color. */
function shade(hex, t) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const target = t > 0 ? 255 : 0
  const k = Math.abs(t)
  const ch = (v) => Math.round(v + (target - v) * k).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

/** Las 4 tintas de las palabras: las de la demo, o la familia del acento. */
const wordColors = (accent) =>
  accent ? [shade(accent, 0.45), shade(accent, 0.15), shade(accent, 0.7), accent] : WORD_COLORS

/**
 * PopManifesto — a giant paragraph that inks in word by word as you
 * scroll, with every fourth-ish word landing in a cobalt tone.
 */
export default function PopManifesto({
  eyebrow = '',
  text = 'We started Fizz in a Valencia kitchen because every soda tasted the same: too sweet, too fake and too loud about it. So we pressed real fruit, cut the sugar and kept the bubbles. Five flavors later, it is still made by twelve people who drink far too much of it.',
  /** Ancla de la sección: el nav apunta acá. */
  id = 'story',
  bg,
  fg,
  /** Color de las palabras que se tiñen (vacío: la familia cobalto de la demo). */
  accent,
}) {
  const root = useRef(null)
  const tints = wordColors(accent)

  useGSAP(
    () => {
      // Calma: el párrafo entra con un fundido, sin tintarse palabra por palabra.
      if (prefersReducedMotion()) return calmReveal('[data-pop-manifesto]', { y: 14, duration: 0.9 })

      const split = new SplitText('[data-pop-manifesto]', { type: 'words' })

      // Every few words gets a flavor color once it has inked in.
      split.words.forEach((word, i) => {
        if (i % 4 === 2) {
          word.dataset.popColor = tints[(i / 4) % tints.length | 0]
        }
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 75%',
          end: 'bottom 55%',
          scrub: 0.35,
        },
      })

      tl.fromTo(
        split.words,
        { opacity: 0.1, y: 12 },
        { opacity: 1, y: 0, stagger: 0.55, ease: 'none' },
      )
      split.words.forEach((word, i) => {
        if (!word.dataset.popColor) return
        tl.to(
          word,
          { color: word.dataset.popColor, duration: 0.4 },
          i * 0.6 + 0.3,
        )
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id={id}
      className="px-5 py-24 md:px-10 md:py-40"
      style={{
        background: bg || undefined,
        color: fg || undefined,
        ...(fg ? { '--color-foam': fg } : {}),
        '--color-grape': bg || undefined,
        '--color-foam': fg || undefined,
      }}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foam/60 md:text-xs">
          {eyebrow}
        </p>
      ) : null}
      <p
        data-pop-manifesto
        className="max-w-5xl font-brico text-[clamp(1.6rem,4.6vw,3.6rem)] leading-[1.15] font-bold tracking-[-0.01em]"
      >
        {text}
      </p>
    </section>
  )
}
