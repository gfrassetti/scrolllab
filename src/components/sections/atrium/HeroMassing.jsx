import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import heroField from './assets/hero-field.jpg'
import heroHouse from './assets/hero-house.jpg'
import interior from './assets/interior.jpg'

/**
 * HeroMassing — sticky massing plate. The photograph scales and drifts
 * (P2) while the white manifesto slides over it. Brand type is plate-size,
 * not the page H1.
 */
export default function HeroMassing({
  lineOne = 'Atrium',
  lineTwo = 'Architectural Bureau',
  hint,
  img1 = heroField,
  img2 = heroHouse,
  img3 = interior,
}) {
  const root = useRef(null)
  const frames = [img1, img2, img3]
  void hint

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const media = root.current.querySelector('[data-hero-media]')
      const layers = gsap.utils.toArray('[data-mass-layer]')

      const stack = root.current.parentElement
      gsap.fromTo(
        media,
        { yPercent: -6, scale: 1.12 },
        {
          yPercent: 14,
          scale: 1.04,
          ease: 'none',
          scrollTrigger: {
            trigger: stack,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.45,
          },
        },
      )

      if (layers[1]) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stack,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
        tl.to(layers[0], { opacity: 0, ease: 'none' }, 0.35)
        tl.to(layers[1], { opacity: 1, ease: 'none' }, 0.35)
        if (layers[2]) {
          tl.to(layers[1], { opacity: 0, ease: 'none' }, 0.72)
          tl.to(layers[2], { opacity: 1, ease: 'none' }, 0.72)
        }
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} className="sticky top-0 z-0 h-svh overflow-hidden">
      <div data-hero-media className="absolute inset-0 h-[130%] w-full will-change-transform">
        {frames.map((src, i) => (
          <img
            key={src}
            data-mass-layer
            src={src}
            alt=""
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding={i === 0 ? 'sync' : 'async'}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: i === 0 ? 1 : 0 }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />

      <div className="relative flex h-full flex-col justify-end px-5 pb-14 md:px-10 md:pb-16">
        <p className="max-w-[22ch] font-display text-[clamp(1.7rem,3.1vw,3.75rem)] leading-[1.05] text-white">
          <span className="block">{lineOne}</span>
          <span className="block pb-1 font-display italic font-normal">{lineTwo}</span>
        </p>
      </div>
    </section>
  )
}
