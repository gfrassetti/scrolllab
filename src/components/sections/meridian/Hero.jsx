import { useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import MenuOverlay, { Hamburger } from './MenuOverlay'

/**
 * MERIDIAN — Hero
 *
 * A scroll-scrubbed sequence of pre-rendered frames (aerial flythrough)
 * painted on a fixed canvas. Everything on top of it — the wordmark, the
 * welcome copy, the kicker/title/body/CTA of each state — is driven by
 * the SAME `progress` value the frames use. Each word (yes, word, not
 * block) has its own tiny window inside its parent state's scroll span,
 * so as you scroll the words fade in one after another with a soft blur,
 * hold at full opacity, and fade out in the same order — the look from
 * the reference site's headlines where some words are already visible
 * and the next ones are still ghosting in.
 *
 * Course notes applied (docs/award-winning-web-developer.md):
 * - Detalle #5.2: same tiny motion vocabulary reused everywhere (word
 *   fade+blur on scroll, wordmark dock, canvas scrub — no new entrance
 *   per section).
 * - Detalle #5.3/5.5: deliberate order kicker → title → body → CTA with
 *   staggered arrival, not all together.
 * - Detalle #9 (stacking): scroll reveal + micro-interactions + depth
 *   layered on the same content, not one at a time.
 * - Detalle #9.4: nothing aggressive — sub-pixel drift, opacity/blur
 *   only, no big translates or bouncy easings.
 *
 * Frames live in `public/meridian/hero/seq/` as `0001.<ext>` … — swap
 * that folder's contents (and FRAME_COUNT/FRAME_EXT below) for your own
 * flythrough; nothing else in this file needs to change.
 */

// ──────────────────────────────────────────────────────────────────
// REPLACE ME — this is the one thing you actually need to change.
// `public/meridian/hero/seq/` ships with a demo aerial flythrough
// (stock footage) so the scroll mechanics work out of the box. Swap it
// for your own property's footage:
//   1. Get a short, continuous flythrough/drone clip of your property.
//   2. Extract frames with ffmpeg, e.g. for a ~10s clip:
//        ffmpeg -i flythrough.mp4 -vf "fps=24,scale=1280:-1" -c:v libwebp -q:v 60 public/meridian/hero/seq/%04d.webp
//   3. Update FRAME_COUNT below to however many files that produced.
//      Everything else — the scrub, the wordmark dock, the text states
//      — keeps working unchanged.
// ──────────────────────────────────────────────────────────────────
const FRAME_BASE = '/meridian/hero/seq'
const FRAME_COUNT = 239
const FRAME_EXT = 'webp'
const FRAME_PAD = 4
// How many scroll pixels each frame gets. Lower = faster flythrough per
// scroll notch. Tuned so a normal wheel push moves several frames, not
// one — that's what makes it feel like a fluid video, not a slideshow.
const PX_PER_FRAME = 16

// Wordmark scrub: progress 0 -> WORDMARK_RANGE, giant+centered -> small+docked
// in the nav row. Past that point it just sits there, same as the reference.
const WORDMARK_RANGE = 0.18
const WORDMARK_BIG_PX = 132
const WORDMARK_SMALL_PX = 15
const WORDMARK_TOP_SMALL = '34px'

// Welcome copy has its own little scrubbed window at the very start:
// fades in word by word as you begin, then out as the wordmark docks.
// AT is offset just past 0 so the very first paint is clean — the
// wordmark alone, no ghost copy already peeking through.
const WELCOME_AT = 0.14
const WELCOME_SPAN = 0.18

// Each state's `at` is its centre point on the 0..1 progress track; its
// `span` is how wide (in progress units) its whole reveal→hold→fade
// window is. Words inside a state are staggered across the first ~55%
// of that window; the last state (`hold: true`) keeps its words at full
// opacity from `at` onward so the invite stays put while the sticky
// section wraps up its scroll runway and hands off to the next one.
//
// Timing (at/span/hold) is layout, not content — it stays fixed here.
// The actual copy comes from props (builder-editable), merged in below.
const STATES_TIMING = [
  { at: 0.42, span: 0.26, kind: 'quote' },
  { at: 0.72, span: 0.24, hold: true, kind: 'invite' },
]

function frameUrl(n) {
  return `${FRAME_BASE}/${String(n).padStart(FRAME_PAD, '0')}.${FRAME_EXT}`
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// Break a string into whitespace-preserving tokens. Line breaks (\n)
// become explicit `<br>` markers so multi-line titles keep their shape.
function tokenize(text) {
  const out = []
  const lines = text.split('\n')
  lines.forEach((line, li) => {
    if (li > 0) out.push({ br: true })
    const parts = line.split(/(\s+)/)
    parts.forEach((part) => {
      if (!part) return
      if (/^\s+$/.test(part)) out.push({ space: part })
      else out.push({ word: part })
    })
  })
  return out
}

/**
 * Render a text block whose words fade in/out based on scroll progress.
 * Every word gets a `data-word-i` and `data-word-n` attribute so the
 * runtime tick can compute its opacity/blur from its position in the
 * sequence and the parent state's `at`/`span`.
 */
function ScrubText({ text, tag: Tag = 'span', className, style }) {
  const tokens = tokenize(text)
  const words = tokens.filter((t) => t.word)
  const total = words.length
  let wi = -1
  return (
    <Tag className={className} style={style} aria-label={text.replace(/\n/g, ' ')}>
      {tokens.map((t, i) => {
        if (t.br) return <br key={`br-${i}`} />
        if (t.space) return <span key={`sp-${i}`}>{t.space}</span>
        wi++
        return (
          <span
            key={`w-${i}`}
            data-word-i={wi}
            data-word-n={total}
            aria-hidden="true"
            className="inline-block will-change-[opacity,filter]"
            style={{ opacity: 0, filter: 'blur(6px)' }}
          >
            {t.word}
          </span>
        )
      })}
    </Tag>
  )
}

export default function Hero({
  wordmark = 'Meridian',
  menuLabel = 'Menu',
  floorPlansLabel = 'Floor Plans',
  welcomeText = 'A real estate scrollytelling template — replace this copy, the hero sequence and the rest of the imagery with your own.',
  quoteKicker = 'THE VISION',
  quoteTitle = 'A scroll-scrubbed real estate template —\nreplace this headline with your\nown value statement.',
  inviteKicker = 'MEET',
  inviteTitle,
  inviteBody = '[Region], [Country]',
  inviteCta = 'Explore Villas',
}) {
  const track = useRef(null)
  const stage = useRef(null)
  const canvasRef = useRef(null)
  const wordmarkRef = useRef(null)
  const welcomeRef = useRef(null)
  const stateRefs = useRef([])
  const [menuOpen, setMenuOpen] = useState(false)

  // The invite headline repeats the wordmark by default ("MEET /
  // MERIDIAN") — falls back to whatever `wordmark` resolves to so the
  // two stay in sync if someone only edits one of the two fields.
  const resolvedInviteTitle = inviteTitle || wordmark.toUpperCase()

  const STATES = [
    { ...STATES_TIMING[0], kicker: quoteKicker, title: quoteTitle },
    {
      ...STATES_TIMING[1],
      kicker: inviteKicker,
      title: resolvedInviteTitle,
      body: inviteBody,
      cta: inviteCta,
    },
  ]

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { alpha: false })
      const alive = { v: true }

      const urls = Array.from({ length: FRAME_COUNT }, (_, i) => frameUrl(i + 1))
      const images = new Array(FRAME_COUNT)

      const idxOf = (p) =>
        Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(p * (FRAME_COUNT - 1))))

      function drawCover(img) {
        const cw = canvas.width
        const ch = canvas.height
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
        const dw = img.naturalWidth * scale
        const dh = img.naturalHeight * scale
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
      }

      let shown = -1
      let dirty = true

      function paint(fi) {
        const img = images[fi]
        if (!img || !img.complete) return
        if (fi === shown && !dirty) return
        ctx.fillStyle = '#dfd8cf'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        drawCover(img)
        shown = fi
        dirty = false
      }

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
        const w = stage.current.clientWidth || window.innerWidth || 0
        const h = stage.current.clientHeight || window.innerHeight || 0
        if (w < 2 || h < 2) return
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        dirty = true
        paint(Math.max(0, shown))
      }

      function layoutWordmark(prog) {
        const el = wordmarkRef.current
        if (!el) return
        const t = Math.max(0, Math.min(1, prog / WORDMARK_RANGE))
        el.style.fontSize = `${lerp(WORDMARK_BIG_PX, WORDMARK_SMALL_PX, t)}px`
        if (t > 0.98) {
          el.style.top = WORDMARK_TOP_SMALL
          el.style.transform = 'translate(-50%, 0)'
        } else {
          el.style.top = `${lerp(50, 0, t)}%`
          el.style.transform = `translate(-50%, ${lerp(-50, 0, t)}%)`
        }
      }

      /**
       * Runtime word-fade: for every element carrying `data-word-i` /
       * `data-word-n`, compute its opacity + blur from the current
       * scroll progress and the container's own `at`/`span`/`hold`.
       *
       * Timing per word (`i` of `n` total inside a span starting at
       * `start = at - span/2`):
       *   arrive       = start + spread * (i / max(n-1,1))
       *   own window   = span * 0.22          (fade in over this)
       *   depart       = at + span/2 - own window
       *
       * `hold: true` skips the depart phase — words stay at full opacity
       * from their arrive point onward, which is what the last state
       * needs so the invite stays on screen while the sticky hero
       * finishes its runway.
       */
      function layoutScrub(el, prog, at, span, hold) {
        const words = el.querySelectorAll('[data-word-i]')
        const n = words.length
        const start = at - span * 0.5
        const spread = span * 0.55
        const own = Math.max(0.02, span * 0.22)
        const departStart = at + span * 0.5 - span * 0.35
        const departSpan = Math.max(0.02, span * 0.35)

        // Compute opacity for a stagger position `t` in [0..1] (0 = first,
        // 1 = last). Words use their own i/(n-1); tail elements pin to
        // t = 1 so they arrive with the last word and leave with it.
        const oAt = (t) => {
          const arrive = start + spread * t
          let inO = 0
          if (prog >= arrive) inO = Math.min(1, (prog - arrive) / own)
          let outO = 1
          if (!hold) {
            const departTime = departStart + spread * t * 0.6
            if (prog > departTime) {
              outO = Math.max(0, 1 - (prog - departTime) / departSpan)
            }
          }
          return Math.max(0, Math.min(1, inO * outO))
        }

        words.forEach((word, i) => {
          const t = n > 1 ? i / (n - 1) : 0
          const o = oAt(t)
          word.style.opacity = o.toFixed(3)
          word.style.filter = `blur(${((1 - o) * 4).toFixed(2)}px)`
        })

        // Tail elements: CTA, body pill, decorative icons — anything that
        // should arrive with the tail of the title. Same scrub curve as
        // the last word so nothing sits at full opacity while the copy
        // is still ghosting in.
        const tails = el.querySelectorAll('[data-scrub-tail]')
        tails.forEach((tail) => {
          const o = oAt(1)
          tail.style.opacity = o.toFixed(3)
          tail.style.filter = `blur(${((1 - o) * 4).toFixed(2)}px)`
        })
      }

      function layoutWelcome(prog) {
        const el = welcomeRef.current
        if (!el) return
        layoutScrub(el, prog, WELCOME_AT, WELCOME_SPAN, false)
      }

      function layoutStates(prog) {
        for (let k = 0; k < STATES.length; k++) {
          const el = stateRefs.current[k]
          const st = STATES[k]
          if (!el) continue
          layoutScrub(el, prog, st.at, st.span, st.hold)
          // Pointer events on the whole state block — only clickable
          // when it's actually visible enough to hit.
          const anyVisible = el.querySelector('[data-word-i]')?.style.opacity ?? '0'
          el.style.pointerEvents = parseFloat(anyVisible) > 0.5 ? 'auto' : 'none'
        }
      }

      let targetProg = 0
      let prog = 0
      const EASE = 0.18

      function frameTick() {
        prog += (targetProg - prog) * EASE
        if (Math.abs(targetProg - prog) < 0.0005) prog = targetProg
        dirty = true
        paint(idxOf(prog))
        layoutWordmark(prog)
        layoutWelcome(prog)
        layoutStates(prog)
      }

      resize()
      window.addEventListener('resize', resize)

      if (reduced) {
        // Static: no ticker, no scrub — one representative frame, the
        // wordmark already docked, the invite state shown at rest.
        images[0] = new Image()
        images[0].src = urls[0]
        images[0].onload = () => {
          if (!alive.v) return
          dirty = true
          paint(0)
        }
        layoutWordmark(WORDMARK_RANGE)
        layoutWelcome(WELCOME_AT)
        layoutStates(STATES[STATES.length - 1].at)
      } else {
        urls.forEach((url, i) => {
          const img = new Image()
          img.decoding = 'async'
          img.onload = () => {
            if (i === 0 && alive.v) {
              dirty = true
              paint(0)
            }
          }
          img.src = url
          images[i] = img
        })

        layoutWordmark(0)
        layoutWelcome(0)
        layoutStates(0)

        gsap.ticker.add(frameTick)
        ScrollTrigger.create({
          trigger: track.current,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            targetProg = self.progress
          },
          onRefresh: resize,
        })

        const split = new SplitText(wordmarkRef.current, { type: 'chars', mask: 'chars' })
        gsap.set(split.chars, { autoAlpha: 0, filter: 'blur(10px)' })
        gsap.to(split.chars, {
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 0.85,
          stagger: { each: 0.02, from: 'random' },
          ease: 'power2.out',
          delay: 0.2,
        })

        const navSplit = new SplitText('[data-meridian-hero-nav]', { type: 'chars', mask: 'chars' })
        gsap.set(navSplit.chars, { autoAlpha: 0, filter: 'blur(10px)' })
        gsap.to(navSplit.chars, {
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 0.85,
          stagger: { each: 0.02, from: 'random' },
          ease: 'power2.out',
          delay: 0.35,
        })
      }

      return () => {
        alive.v = false
        gsap.ticker.remove(frameTick)
        window.removeEventListener('resize', resize)
        images.length = 0
      }
    },
    { scope: track, revertOnUpdate: true },
  )

  return (
    <section ref={track} className="relative" style={{ height: `${FRAME_COUNT * PX_PER_FRAME}px` }}>
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden" style={{ background: '#dfd8cf' }}>
        {/* poster: first frame, so the first paint is never blank */}
        <img
          src={frameUrl(1)}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />
        {/* scrim: darkens the flythrough so white type stays legible over
            any frame — heavier at top/bottom where the nav and copy sit */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 22%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* nav — hamburger + Floor Plans are fixed chrome; the wordmark
            between them is the SAME element as the giant hero title,
            scrubbed here by layoutWordmark(), not a second copy. z is
            above the menu overlay so the hamburger stays clickable when
            the menu is open (it morphs into the close X). Color flips
            to dark when the menu opens so it stays legible on the cream
            drawer background. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex items-center justify-between px-6 py-6 md:px-10"
          style={{
            color: menuOpen ? '#2a2622' : '#ffffff',
            transition: 'color 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* When the menu is open the drawer's own CLOSE button takes
              over (bigger, always visible on the cream background); the
              hero's fixed hamburger only owns the opening state. */}
          {menuOpen ? (
            <span aria-hidden="true" />
          ) : (
            <Hamburger open={false} label={menuLabel} onClick={() => setMenuOpen(true)} />
          )}
          <span aria-hidden="true" />
          <a
            href="#floor-plans"
            data-meridian-hero-nav
            className="pointer-events-auto text-[11px] uppercase tracking-[0.2em] underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-300"
            style={{
              fontFamily: "'Space Mono', monospace",
              textDecorationColor: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = 'currentColor')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
          >
            {floorPlansLabel}
          </a>
        </div>

        <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* the wordmark — starts giant/centered, scrubs into the nav's
            center slot as layoutWordmark() runs each tick */}
        <h1
          ref={wordmarkRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 z-20 whitespace-nowrap uppercase tracking-[-0.01em] text-white"
          style={{
            fontFamily: "'Fraunces', serif",
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: `${WORDMARK_BIG_PX}px`,
          }}
        >
          {wordmark}
        </h1>
        <span className="sr-only">{wordmark}</span>

        {/* welcome copy — words fade in as the wordmark shrinks, fade
            out as it finishes docking */}
        <div
          ref={welcomeRef}
          className="pointer-events-none absolute inset-x-6 bottom-24 z-20 max-w-[36ch] text-sm leading-relaxed text-white md:inset-x-10 md:bottom-28"
        >
          <ScrubText text={welcomeText} tag="p" className="[&_span]:whitespace-pre" />
        </div>

        {/* text states — each word scrubs its own opacity/blur off the
            same scroll `progress` as the frames */}
        {STATES.map((st, k) => (
          <div
            key={st.kind}
            ref={(el) => (stateRefs.current[k] = el)}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          >
            {st.kicker && (
              <ScrubText
                text={st.kicker}
                tag="p"
                className="mb-4 text-[11px] uppercase tracking-[0.28em] text-white/80"
                style={{ fontFamily: "'Space Mono', monospace" }}
              />
            )}
            <ScrubText
              text={st.title}
              tag="h2"
              className="text-[clamp(1.6rem,4vw,2.8rem)] leading-[1.1] text-white"
              style={{ fontFamily: "'Fraunces', serif" }}
            />
            {st.body && (
              <ScrubText
                text={st.body}
                tag="p"
                className="mt-4 text-xs uppercase tracking-[0.24em] text-white/70"
                style={{ fontFamily: "'Space Mono', monospace" }}
              />
            )}
            {st.cta && (
              <a
                href="#villas"
                data-scrub-tail
                className="group pointer-events-auto mt-8 inline-flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-full border border-white/50 text-[11px] uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-white hover:text-[#2a2622] md:h-40 md:w-40"
                style={{ fontFamily: "'Space Mono', monospace", opacity: 0 }}
              >
                {/* underline + icon rotate combined on the same hover —
                    catalog item #9 (docs/award-winning-web-developer.md) */}
                <span className="relative pb-0.5">
                  {st.cta}
                  <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:rotate-45"
                >
                  <path
                    d="M3 11L11 3M11 3H5M11 3V9"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}
          </div>
        ))}

        {/* scroll-down cue */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-8 z-20 text-center text-[11px] uppercase tracking-[0.3em] text-white/60"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Scroll down
        </div>
      </div>
    </section>
  )
}
