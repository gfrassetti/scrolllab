import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../../lib/motion'

const SERIF = "'Fraunces', 'Times New Roman', serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"

/**
 * FOLD — Footer
 *
 * The film's last picture keeps living: a short seamless video loop that
 * starts on the same frame the film ends on, so scrolling from the film into
 * the footer has no cut, and the clouds keep drifting with the clock even
 * when the reader stops. It plays only while it is on screen; with reduced
 * motion it holds its first frame (the poster).
 */
export default function Footer({
  video = '/fold/footer-loop.mp4',
  poster = '/fold/footer-loop.jpg',
  kicker = 'Closing line',
  title = 'Fold it, light it, let it go.',
  cta = 'Call to action',
  ctaHref = '#',
  meta = ['Brand Studio', 'City, Country', 'hello@example.com'],
}) {
  const videoRef = useRef(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v || prefersReducedMotion()) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    })
    io.observe(v)
    return () => io.disconnect()
  }, [])

  return (
    <footer className="relative h-svh overflow-hidden bg-[#e9e2d3] text-[#1b1a17]">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={video}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col items-center justify-center px-[6vw] text-center" style={{ textShadow: '0 0 24px rgba(242,239,230,0.85)' }}>
        <p className="mb-5 flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase" style={{ fontFamily: MONO }}>
          <span aria-hidden="true" className="inline-block h-px w-6 bg-current" />
          {kicker}
          <span aria-hidden="true" className="inline-block h-px w-6 bg-current" />
        </p>
        <h2 className="max-w-[14ch] text-[13vw] leading-[0.98] font-light tracking-[-0.02em] md:text-[6vw]" style={{ fontFamily: SERIF }}>
          {title}
        </h2>
        <a
          href={ctaHref}
          className="tpl-hit group relative mt-10 inline-flex items-center gap-3 rounded-[4px] bg-[#1b1a17] py-1 pr-1 pl-4 text-[11px] tracking-[0.16em] text-[#f2efe6] uppercase [text-shadow:none]"
          style={{ fontFamily: MONO }}
        >
          {cta}
          <span aria-hidden="true" className="grid aspect-square w-8 place-items-center rounded-[3px] border border-[#f2efe6]/30 transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[#f2efe6]/15">
            →
          </span>
        </a>
      </div>
      {/* The meta row sits on a soft paper wash so it reads over the valley. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#e9e2d3]/90 via-[#e9e2d3]/45 to-transparent"
      />
      <ul
        className="absolute inset-x-0 bottom-0 flex flex-wrap justify-between gap-x-6 gap-y-2 px-[4vw] pb-6 text-[11px] tracking-[0.18em] uppercase md:px-[2.65%]"
        style={{ fontFamily: MONO }}
      >
        {meta.map((m, i) => (
          <li key={i}>{typeof m === 'string' ? m : m?.text}</li>
        ))}
      </ul>
    </footer>
  )
}
