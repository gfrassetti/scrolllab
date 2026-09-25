import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import MenuOverlay, { Hamburger } from './MenuOverlay'
import { HeaderCta, HeaderLink, LangSwitch } from './NavBits'
import { useLang } from './lang'
import Preloader from './Preloader'

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
// The preloader waits for this many frames (the first stretch of the
// flythrough); the rest keep loading while the visitor already scrolls.
const PRELOAD_GATE = 60

// Wordmark scrub: progress 0 -> WORDMARK_RANGE, giant+centered -> small+docked
// in the nav row. Past that point it just sits there, same as the reference.
const WORDMARK_RANGE = 0.18
const WORDMARK_BIG_PX = 132
const WORDMARK_SMALL_PX = 15
const WORDMARK_SMALL_PX_MOBILE = 18
const MOBILE_MQ = '(max-width: 767px)'

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
  menuLabel,
  floorPlansLabel,
  welcomeText = 'A real estate scrollytelling template — replace this copy, the hero sequence and the rest of the imagery with your own.',
  quoteKicker = 'THE VISION',
  quoteTitle = 'A scroll-scrubbed real estate template —\nreplace this headline with your\nown value statement.',
  inviteKicker = 'MEET',
  inviteTitle,
  inviteBody = '[Region], [Country]',
  inviteCta,
  menuLinks,
}) {
  const { lang, t } = useLang()
  const menuText = menuLabel ?? t('menu')
  const floorPlansText = floorPlansLabel ?? t('floorPlans')
  const ctaText = inviteCta ?? t('exploreVillas')
  const track = useRef(null)
  const stage = useRef(null)
  const canvasRef = useRef(null)
  const wordmarkRef = useRef(null)
  const welcomeRef = useRef(null)
  const stateRefs = useRef([])
  const navRef = useRef(null)
  const navBgRef = useRef(null)
  const brandRef = useRef(null)
  const bgRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuOpenRef = useRef(false)
  menuOpenRef.current = menuOpen

  // Preloader ↔ hero handshake: frames report progress through a ref (no
  // re-render per frame); the hero's intro tweens wait on `introRef`.
  const loadedRef = useRef(0)
  const loaderDoneRef = useRef(false)
  const introRef = useRef(null)
  const handleLoaderDone = () => {
    loaderDoneRef.current = true
    introRef.current?.()
  }

  // Mobile is a different composition, not a squeezed desktop (verified on
  // the reference at 375px): no giant wordmark — the logo is docked in the
  // header from the first frame; the background pans left → right as you
  // scroll; the scrubbed welcome/quote copy is gone and only the invite
  // (kicker, title, circle CTA) stays, static.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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
      cta: ctaText,
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

      // Mobile: a landscape frame cover-cropped into a portrait screen
      // only shows ~30% of its width, so the crop slides left → right with
      // scroll (panT 0 → 1) — same idea as the reference's translating
      // wide image. Desktop stays centred (0.5).
      const mobile = isMobile
      let panT = mobile ? 0 : 0.5

      function drawCover(img) {
        const cw = canvas.width
        const ch = canvas.height
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
        const dw = img.naturalWidth * scale
        const dh = img.naturalHeight * scale
        ctx.drawImage(img, (cw - dw) * panT, (ch - dh) / 2, dw, dh)
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

      // Smart header (verified on the reference: `.header` is fixed, gets
      // `.hidden` = translateY(-100%) while scrolling down, and
      // `.background` = solid sand + 1px border while scrolling up; 0.4s
      // cubic-bezier(0.16,1,0.3,1) on transform + background-color).
      //   top    → transparent over the video (scrollY < 24)
      //   hidden → scrolling down
      //   solid  → scrolling up: painted bar with the CTA
      // The docked wordmark is the header's logo: it stays put when the bar
      // hides (verified on the reference) and only turns dark when the bar
      // paints.
      let hdr = 'top'
      let pastHero = false
      let lastY = window.scrollY
      let wmDocked = false

      function paintHeader() {
        const nav = navRef.current
        const bg = navBgRef.current
        const wm = wordmarkRef.current
        if (!nav || !bg) return
        nav.style.transform = hdr === 'hidden' ? 'translateY(-100%)' : 'translateY(0)'
        nav.dataset.solid = hdr === 'solid' ? 'true' : 'false'
        bg.style.transform = hdr === 'solid' ? 'translateY(0)' : 'translateY(-100%)'
        if (wm) {
          wm.style.color = wmDocked && hdr === 'solid' ? '#2a2622' : ''
          // once the sticky stage starts scrolling away the docked
          // wordmark leaves with it — the header's own brand takes over
          wm.style.opacity = pastHero ? '0' : ''
        }
        const brand = brandRef.current
        if (brand) {
          const show = pastHero && hdr === 'solid'
          brand.style.opacity = show ? '1' : '0'
          brand.style.pointerEvents = show ? 'auto' : 'none'
        }
      }

      function onHeaderScroll() {
        if (menuOpenRef.current) return
        const y = window.scrollY
        const dy = y - lastY
        let next = hdr
        if (y < 24) {
          next = 'top'
          lastY = y
        } else if (Math.abs(dy) >= 2) {
          next = dy > 0 ? 'hidden' : 'solid'
          lastY = y
        }
        if (next === hdr) return
        hdr = next
        paintHeader()
      }

      // Docked wordmark sits vertically centred in the nav row (h1 has
      // line-height 1.1, so its box is font-size * 1.1 tall).
      let dockTop = 34
      const wmSmallPx = mobile ? WORDMARK_SMALL_PX_MOBILE : WORDMARK_SMALL_PX
      function sizeHeaderBg() {
        if (navRef.current && navBgRef.current) {
          const navH = navRef.current.offsetHeight
          navBgRef.current.style.height = `${navH}px`
          dockTop = (navH - wmSmallPx * 1.1) / 2
        }
      }
      sizeHeaderBg()
      if (brandRef.current) brandRef.current.style.fontSize = `${wmSmallPx}px`
      paintHeader()
      const onHeaderResize = () => {
        sizeHeaderBg()
        layoutWordmark(prog)
      }
      window.addEventListener('scroll', onHeaderScroll, { passive: true })
      window.addEventListener('resize', onHeaderResize)

      function layoutWordmark(prog) {
        const el = wordmarkRef.current
        if (!el) return
        const t = mobile ? 1 : Math.max(0, Math.min(1, prog / WORDMARK_RANGE))
        const docked = t > 0.98
        if (docked !== wmDocked) {
          wmDocked = docked
          paintHeader()
        }
        el.style.fontSize = `${lerp(WORDMARK_BIG_PX, wmSmallPx, t)}px`
        const stageH = stage.current?.clientHeight || window.innerHeight
        el.style.top = `${lerp(stageH / 2, dockTop, t)}px`
        el.style.transform = `translate(-50%, ${lerp(-50, 0, t)}%)`
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

      // Mobile: welcome + quote are dropped, the last (invite) state is
      // simply on screen — no per-word scrub.
      function layoutMobileStatic() {
        if (welcomeRef.current) welcomeRef.current.style.display = 'none'
        stateRefs.current.forEach((el, k) => {
          if (!el) return
          if (k !== STATES.length - 1) {
            el.style.display = 'none'
            return
          }
          el.querySelectorAll('[data-word-i], [data-scrub-tail]').forEach((w) => {
            w.style.opacity = '1'
            w.style.filter = 'none'
          })
          el.style.pointerEvents = 'auto'
        })
      }

      function layoutWelcome(prog) {
        if (mobile) return
        const el = welcomeRef.current
        if (!el) return
        layoutScrub(el, prog, WELCOME_AT, WELCOME_SPAN, false)
      }

      function layoutStates(prog) {
        if (mobile) return
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

      // The whole point of `dirty`/`shown` in paint() is to skip redundant
      // canvas redraws — but this function used to set `dirty = true` and
      // re-run every layout* pass on EVERY gsap.ticker frame regardless of
      // whether anything actually moved. That's a full canvas redraw +
      // querySelectorAll + per-word style writes, 60 times a second,
      // forever, even at rest — stealing frame budget from anything else
      // animating on the page (the menu drawer's own CSS transition was
      // visibly janky because of this, not because of the transition
      // itself). Bail out the instant the lerp has nothing left to do.
      function frameTick() {
        const before = prog
        prog += (targetProg - prog) * EASE
        if (Math.abs(targetProg - prog) < 0.0005) prog = targetProg
        if (prog === before) return
        dirty = true
        if (mobile) panT = prog
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
        if (mobile) layoutMobileStatic()
      } else {
        loadedRef.current = 0
        urls.forEach((url, i) => {
          const img = new Image()
          img.decoding = 'async'
          img.onload = () => {
            loadedRef.current += 1
            if (i === 0 && alive.v) {
              dirty = true
              paint(0)
            }
          }
          img.onerror = () => {
            loadedRef.current += 1
          }
          img.src = url
          images[i] = img
        })

        layoutWordmark(0)
        layoutWelcome(0)
        layoutStates(0)
        if (mobile) layoutMobileStatic()

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

        // Intro waits for the preloader (loaderDoneRef) — it is built
        // paused and started by handleLoaderDone().
        const intro = gsap.timeline({ paused: true })
        const split = new SplitText(wordmarkRef.current, { type: 'chars', mask: 'chars' })
        gsap.set(split.chars, { autoAlpha: 0, filter: 'blur(10px)' })
        intro.to(
          split.chars,
          {
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: 1.9,
            stagger: { each: 0.07, from: 'random' },
            ease: 'power2.out',
          },
          0.1,
        )

        const navSplit = new SplitText('[data-meridian-hero-nav]', { type: 'chars', mask: 'chars' })
        gsap.set(navSplit.chars, { autoAlpha: 0, filter: 'blur(10px)' })
        intro.to(
          navSplit.chars,
          {
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: 1.7,
            stagger: { each: 0.06, from: 'random' },
            ease: 'power2.out',
          },
          0.6,
        )

        introRef.current = () => intro.play()
        if (loaderDoneRef.current) intro.play()
      }

      // Past the end of the sticky runway the stage scrolls away at full
      // speed while its background drifts down at 30% of the scroll (numbers
      // read off the reference: bg translateY = 0.3 × distance past the
      // end) — that lag is the parallax the next section rises against.
      const bgEl = bgRef.current
      ScrollTrigger.create({
        trigger: track.current,
        start: 'bottom bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          if (!reduced && bgEl) {
            const h = stage.current?.clientHeight || window.innerHeight
            bgEl.style.transform = `translate3d(0, ${(self.progress * h * 0.3).toFixed(1)}px, 0)`
          }
          const past = self.progress > 0
          if (past !== pastHero) {
            pastHero = past
            paintHeader()
          }
        },
      })

      return () => {
        alive.v = false
        gsap.ticker.remove(frameTick)
        window.removeEventListener('resize', resize)
        window.removeEventListener('scroll', onHeaderScroll)
        window.removeEventListener('resize', onHeaderResize)
        if (welcomeRef.current) welcomeRef.current.style.display = ''
        stateRefs.current.forEach((el) => {
          if (el) el.style.display = ''
        })
        images.length = 0
      }
    },
    { scope: track, revertOnUpdate: true, dependencies: [isMobile] },
  )

  return (
    <section ref={track} className="relative" style={{ height: `${FRAME_COUNT * PX_PER_FRAME}px` }}>
      <Preloader
        wordmark={wordmark}
        getLoaded={() => loadedRef.current / PRELOAD_GATE}
        bigPx={WORDMARK_BIG_PX}
        onFadeStart={handleLoaderDone}
        onDone={handleLoaderDone}
      />
      <div ref={stage} className="sticky top-0 z-30 h-svh overflow-hidden" style={{ background: '#dfd8cf' }}>
        <div ref={bgRef} className="absolute inset-0 z-0 will-change-transform">
        {/* poster: first frame, so the first paint is never blank */}
        <img
          src={frameUrl(1)}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover max-md:object-left"
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
        </div>

        {/* nav — hamburger + Floor Plans are fixed chrome; the wordmark
            between them is the SAME element as the giant hero title,
            scrubbed here by layoutWordmark(), not a second copy. z is
            above the menu overlay so the hamburger stays clickable when
            the menu is open (it morphs into the close X). Color flips
            to dark when the menu opens so it stays legible on the cream
            drawer background. */}
        <div
          ref={navBgRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[15] border-b border-[#2a2622]/10 bg-[#dfd8cf]"
          style={{
            transform: 'translateY(-100%)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <div
          ref={navRef}
          data-solid="false"
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex items-center justify-between px-6 py-6 text-white data-[solid=true]:text-[#2a2622] md:px-10"
          style={{
            color: menuOpen ? '#2a2622' : undefined,
            transition:
              'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Desktop: when the menu is open the drawer's own CLOSE button
              takes over, so the hamburger only owns the opening state.
              Mobile: the header stays put over the full-screen drawer
              (logo included) and the hamburger itself becomes the X —
              same as the reference. */}
          {menuOpen && !isMobile ? (
            <span aria-hidden="true" />
          ) : (
            <div className="flex items-center gap-6">
              <Hamburger
                open={menuOpen}
                label={menuText}
                onClick={() => setMenuOpen((o) => !o)}
              />
              {!menuOpen && <HeaderCta href="#villas" label={ctaText} />}
            </div>
          )}
          <a
            ref={brandRef}
            href="#top"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap uppercase tracking-[-0.01em]"
            style={{
              fontFamily: "'Fraunces', serif",
              lineHeight: 1.1,
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {wordmark}
          </a>
          <div className="flex items-center gap-7">
            <LangSwitch className="max-md:hidden" />
            {/* keyed by language: the intro SplitText replaces this node's DOM, so React needs a fresh node to change its text */}
            <HeaderLink key={lang} href="#floor-plans" label={floorPlansText} introAttr />
          </div>
        </div>

        <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} links={menuLinks} />

        {/* the wordmark — starts giant/centered, scrubs into the nav's
            center slot as layoutWordmark() runs each tick */}
        <h1
          ref={wordmarkRef}
          aria-hidden="true"
          data-menu={menuOpen ? 'true' : 'false'}
          className="pointer-events-none absolute left-1/2 z-20 whitespace-nowrap uppercase tracking-[-0.01em] text-white max-md:data-[menu=true]:z-[75] max-md:data-[menu=true]:text-[#2a2622]"
          style={{
            fontFamily: "'Fraunces', serif",
            top: '50%',
            transform: 'translate(-50%, -50%)',
            lineHeight: 1.1,
            fontSize: `${WORDMARK_BIG_PX}px`,
            transition:
              'color 0.4s cubic-bezier(0.16, 1, 0.3, 1), translate 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
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
                className="group pointer-events-auto mt-8 inline-flex h-32 w-32 flex-col max-md:absolute max-md:right-[10%] max-md:bottom-[14%] max-md:mt-0 max-md:h-36 max-md:w-36 max-md:shadow-[0_0_0_10px_rgba(255,255,255,0.14),0_0_0_20px_rgba(255,255,255,0.07)] items-center justify-center gap-2 rounded-full border border-white/50 text-[11px] uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-white hover:text-[#2a2622] md:h-40 md:w-40"
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
          {t('scrollDown')}
        </div>
      </div>
    </section>
  )
}
