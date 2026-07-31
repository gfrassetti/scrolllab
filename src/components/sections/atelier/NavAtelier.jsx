import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'

export default function NavAtelier({
  brand = 'BRAND',
  cta = 'Your CTA',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const header = root.current
      if (!header) return

      const toLight = () => header.setAttribute('data-on-light', 'true')
      const toDark = () => header.removeAttribute('data-on-light')

      ScrollTrigger.create({
        trigger: '#work',
        start: 'top 80px',
        end: 'bottom top',
        onEnter: toLight,
        onEnterBack: toLight,
        onLeave: toDark,
        onLeaveBack: toDark,
      })
    },
    { scope: root },
  )

  return (
    <header
      ref={root}
      className="group fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 md:px-10 data-[on-light]:text-[#111214]"
    >
      <a
        href="#top"
        className="text-sm font-medium tracking-[0.2em] text-white uppercase group-data-[on-light]:text-[#111214]"
      >
        {brand}
      </a>
      <p className="hidden text-[10px] tracking-[0.25em] text-white/40 uppercase md:block group-data-[on-light]:text-black/40">
        Placeholder label
      </p>
      <div className="flex items-center gap-2">
        <a
          href="#services"
          className="rounded-full bg-white px-4 py-2 text-[10px] font-medium tracking-[0.18em] text-black uppercase group-data-[on-light]:bg-[#111214] group-data-[on-light]:text-white"
        >
          {cta}
        </a>
        <a
          href="#work"
          className="rounded-full border border-white/40 px-3 py-2 text-[10px] tracking-[0.18em] text-white uppercase group-data-[on-light]:border-black/30 group-data-[on-light]:text-[#111214]"
        >
          Menu
        </a>
      </div>
    </header>
  )
}
