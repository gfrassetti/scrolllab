import { useEffect, useState } from 'react'

/**
 * FooterAtelier — dark studio closer (Trionn-style layout, generic copy):
 * CTA block + enquiry/social columns + oversized lined brand mark.
 */
export default function FooterAtelier({
  eyebrow = "Let's build work that inspires.",
  line = 'Ready to build something bold?',
  cta = 'Start a collaboration →',
  ctaHref = '#contact',
  brand = 'BRAND',
  legal = '©2026 Placeholder Brand',
  email = 'hello@placeholder.studio',
  phone = '+00 000 000 0000',
  hint = 'Hover the lines.',
}) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setClock(`${hh}:${mm}`)
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <footer className="relative overflow-hidden bg-[#0b0c10] px-5 pt-20 pb-0 text-white md:px-10 md:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(180,190,210,0.12), transparent 55%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] tracking-[0.22em] text-white/45 uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-4 font-brico text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
              {line}
            </h2>
            <p className="mt-8 text-[11px] tracking-[0.18em] text-white/40 uppercase">
              {legal}
            </p>
            <p className="mt-2 text-[11px] tracking-[0.18em] text-white/35 uppercase">
              {hint}
            </p>
          </div>

          <div className="flex flex-col items-start gap-8 lg:items-end lg:text-right">
            {clock ? (
              <p className="text-[11px] tracking-[0.2em] text-white/40 uppercase">
                Local → {clock}
              </p>
            ) : null}
            <a
              href={ctaHref}
              className="text-[12px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-white/35 hover:decoration-white"
            >
              {cta}
            </a>

            <div className="grid w-full max-w-md grid-cols-2 gap-8 text-left lg:text-right">
              <div>
                <p className="text-[10px] tracking-[0.22em] text-white/35 uppercase">
                  Business enquiry
                </p>
                <a
                  href={`mailto:${email}`}
                  className="mt-3 block text-sm text-white/70 hover:text-white"
                >
                  E. {email}
                </a>
                <p className="mt-1 text-sm text-white/70">P. {phone}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.22em] text-white/35 uppercase">
                  Social
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/70">
                  <li>
                    <a href="#" className="hover:text-white">
                      Link one
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Link two
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Link three
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white">
                      Link four
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Oversized lined brand mark — clipped at the bottom edge */}
        <p
          aria-hidden="true"
          className="mt-16 select-none text-center font-brico text-[clamp(5.5rem,22vw,16rem)] leading-[0.78] font-extrabold tracking-[-0.05em] uppercase md:mt-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(255,255,255,0.92) 0 2px, transparent 2px 7px)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            maskImage:
              'linear-gradient(to bottom, black 0%, black 62%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, black 62%, transparent 100%)',
          }}
        >
          {brand}
        </p>
      </div>
    </footer>
  )
}
