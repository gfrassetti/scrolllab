import { useEffect, useState } from 'react'

/**
 * FooterAtelier — dark studio closer (Trionn-style layout, generic copy):
 * CTA block + enquiry/social columns + oversized lined brand mark.
 */
const defaultSocial = [
  { label: 'Link one', href: '#' },
  { label: 'Link two', href: '#' },
  { label: 'Link three', href: '#' },
  { label: 'Link four', href: '#' },
]

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
  clockLabel = 'Local →',
  enquiryLabel = 'Business enquiry',
  emailLabel = 'E.',
  phoneLabel = 'P.',
  socialLabel = 'Social',
  social,
  bg,
  fg,
}) {
  const [clock, setClock] = useState('')
  const socialLinks = (Array.isArray(social) && social.length ? social : defaultSocial).filter(
    (l) => l && l.label,
  )

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
    <footer
      className="relative overflow-hidden bg-[#0b0c10] px-5 pt-20 pb-0 text-white md:px-10 md:pt-28"
      style={{ backgroundColor: bg || undefined, color: fg || undefined }}
    >
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
                {clockLabel} {clock}
              </p>
            ) : null}
            <a
              href={ctaHref}
              className="tpl-hit relative text-[12px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-white/35 transition-[text-decoration-color] duration-300 hover:decoration-white"
            >
              {cta}
            </a>

            <div className="grid w-full max-w-md grid-cols-2 gap-8 text-left lg:text-right">
              <div>
                <p className="text-[11px] tracking-[0.22em] text-white/35 uppercase">
                  {enquiryLabel}
                </p>
                <a
                  href={`mailto:${email}`}
                  className="tpl-link mt-3 block w-fit py-3 text-sm text-white/70 transition-colors duration-300 hover:text-white lg:ml-auto lg:py-0.5"
                >
                  {emailLabel} {email}
                </a>
                <p className="mt-1 text-sm text-white/70">
                  {phoneLabel} {phone}
                </p>
              </div>
              <div>
                <p className="text-[11px] tracking-[0.22em] text-white/35 uppercase">
                  {socialLabel}
                </p>
                <ul className="mt-3 text-sm text-white/70 lg:space-y-1.5">
                  {socialLinks.map((l, i) => (
                    <li key={i}>
                      <a href={l.href || '#'} className="tpl-link tpl-hit relative inline-block py-3 transition-colors duration-300 hover:text-white lg:py-0.5">
                        {l.label}
                      </a>
                    </li>
                  ))}
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
