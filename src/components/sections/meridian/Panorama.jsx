import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * MERIDIAN — Panorama
 *
 * Full-width photo with parallax (the image is taller than the section and
 * drifts against the scroll), a big serif title bottom-left whose
 * connector words drop to small caps, and a CTA wrapped in slowly
 * pulsing concentric rings top-left — same anatomy as the reference's
 * "View of the panorama" band.
 *
 * REPLACE ME: public/meridian/gallery/panorama.webp is a demo still — use a
 * wide, high-resolution photo (2560px+).
 */

const SMALL_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'from', 'a', 'with'])

export default function Panorama({
  title = 'View of the Panorama',
  ctaLabel = 'Explore Panorama',
  ctaHref = '#',
  image = '/meridian/gallery/panorama.webp',
}) {
  const root = useRef(null)
  const imgRef = useRef(null)
  const titleRef = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        imgRef.current,
        { yPercent: -7 },
        {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      const split = new SplitText(titleRef.current, { type: 'chars' })
      gsap.set(split.chars, { opacity: 0, yPercent: 30, filter: 'blur(6px)' })
      gsap.to(split.chars, {
        opacity: 1,
        yPercent: 0,
        filter: 'blur(0px)',
        duration: 1.6,
        stagger: 0.025,
        ease: 'power2.out',
        scrollTrigger: { trigger: titleRef.current, start: 'top 88%', once: true },
      })
    },
    { scope: root, dependencies: [title], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id="panorama"
      className="relative h-[80svh] overflow-hidden bg-[#2a2622] text-white"
    >
      <img
        ref={imgRef}
        src={image}
        alt=""
        draggable={false}
        className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover will-change-transform"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0) 45%), linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 30%)',
        }}
      />

      <a
        href={ctaHref}
        className="mer-pano-cta absolute top-24 left-6 flex h-[150px] w-[150px] items-center justify-center md:top-28 md:left-16 md:h-[180px] md:w-[180px]"
      >
        <span aria-hidden="true" className="mer-pano-ring mer-pano-ring-1" />
        <span aria-hidden="true" className="mer-pano-ring mer-pano-ring-2" />
        <span aria-hidden="true" className="mer-pano-ring mer-pano-ring-3" />
        <span
          className="relative text-[11px] uppercase tracking-[0.14em]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {ctaLabel}
        </span>
      </a>

      <h2
        ref={titleRef}
        className="absolute bottom-14 left-6 max-w-[40rem] text-[clamp(2.6rem,5.4vw,5.2rem)] leading-[0.95] tracking-[-0.02em] uppercase md:bottom-16 md:left-16"
        style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
      >
        {title.split(/(\s+)/).map((w, i) => {
          if (!w.trim()) return w
          const small = SMALL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ''))
          return small ? (
            <span key={i} className="text-[0.42em] tracking-normal">
              {w}
            </span>
          ) : (
            <span key={i}>{w}</span>
          )
        })}
      </h2>

      <style>{`
        .mer-pano-ring { position: absolute; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.4); animation: mer-pano-pulse 4.5s ease-in-out infinite; }
        .mer-pano-ring-1 { inset: 22%; }
        .mer-pano-ring-2 { inset: 8%; animation-delay: 0.6s; border-color: rgba(255,255,255,0.28); }
        .mer-pano-ring-3 { inset: -8%; animation-delay: 1.2s; border-color: rgba(255,255,255,0.16); }
        @keyframes mer-pano-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 0.5; } }
        .mer-pano-cta span:last-child { transition: letter-spacing 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-pano-cta:hover span:last-child { letter-spacing: 0.22em; }
        @media (prefers-reduced-motion: reduce) { .mer-pano-ring { animation: none; } }
      `}</style>
    </section>
  )
}
