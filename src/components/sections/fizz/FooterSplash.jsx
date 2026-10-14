import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { riseBubbles } from './riseBubbles'
import { parseNavLinks } from '../../../lib/navLinks'
import { externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'

const defaultColumns = [
  {
    heading: 'Navigation',
    items: [
      { label: 'Flavors', href: '#flavors' },
      { label: 'Why Fizz', href: '#benefits' },
      { label: 'Our story', href: '#story' },
      { label: 'Instagram', href: 'https://www.instagram.com/' },
    ],
  },
]

const PRIVACY = `Last updated: 1 February 2026

Fizz Drinks Co., S.L. (Carrer de Cádiz 31, 46006 Valencia) is responsible for the personal data you share on this site.

We keep what you send us through the contact form: your name, your email and your message. We use it only to answer you, and we delete it after a year without contact.

We do not sell your data or share it with advertisers. Our email provider processes it on our behalf, inside the European Union.

You can ask to see, correct or delete your data at any time at privacy@fizzdrinks.co.`

const TERMS = `Last updated: 1 February 2026

This site is run by Fizz Drinks Co., S.L. The flavors, ingredients and nutrition facts shown here are the ones printed on our bottles; if they ever differ, the bottle is right.

Fizz is sold through stockists. Prices, availability and deposits on returnable glass are set by each shop.

Photographs and text on this site belong to Fizz Drinks Co. and may not be reused without written permission.`

/**
 * FooterSplash — the closing screen: one full viewport of flat color, the link
 * columns on top, the brand set huge and tilted along the bottom, and glass
 * bubbles rising out of it (only while the footer is on screen).
 */
export default function FooterSplash({
  ctaWord = 'FIZZ*',
  email = 'hello@fizzdrinks.co',
  ctaHref,
  columns = defaultColumns,
  links,
  bg = '#2c4bff',
  fg = '#fff3e2',
  legal = '©2026 Fizz Drinks Co. — Valencia',
  note = 'Stocked in 400 shops across Spain and Portugal. Write to us if you want Fizz in yours.',
  backToTop = 'Back to top ↑',
  contactLabel = 'Contact',
  legalHeading = 'Legal',
  privacyLabel = 'Privacy',
  privacyHref = '#privacy',
  privacyText = PRIVACY,
  termsLabel = 'Terms',
  termsHref = '#terms',
  termsText = TERMS,
  legalCloseLabel = 'Close',
  showBubbles = 'on',
  bubbleColor,
}) {
  const root = useRef(null)
  const bubblesRef = useRef(null)
  const cta = ctaHref || `mailto:${email}`
  const flatLinks = Array.isArray(links) ? links.filter((l) => l && l.label) : []

  const legalNav = (
    <nav aria-label={legalHeading}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-55 md:text-xs lg:mb-5">
        {legalHeading}
      </p>
      <ul className="lg:space-y-1">
        {[
          { label: privacyLabel, href: privacyHref },
          { label: termsLabel, href: termsHref },
        ]
          .filter((l) => l.label)
          .map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                {...externalProps(l.href)}
                className="tpl-link tpl-hit relative inline-block py-3 text-sm uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
              >
                {l.label}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  )

  useGSAP(
    () => {
      // Calma: la marca entra con un fundido; las burbujas que suben no se prenden.
      if (prefersReducedMotion()) return calmReveal('[data-splash-word]', { y: 18, duration: 0.9 })

      const split = new SplitText('[data-splash-word]', { type: 'chars', mask: 'chars' })
      gsap.from(split.chars, {
        yPercent: 115,
        stagger: 0.05,
        ease: 'power4.out',
        duration: 1.2,
        scrollTrigger: { trigger: root.current, start: 'top 35%', once: true },
      })

      // Las burbujas de vidrio, las mismas que en el resto de la página.
      if (showBubbles === 'off') return undefined
      return riseBubbles(bubblesRef.current, root.current)
    },
    { scope: root, dependencies: [showBubbles], revertOnUpdate: true },
  )

  return (
    <footer
      ref={root}
      className="relative flex min-h-svh flex-col overflow-hidden px-5 pt-24 pb-0 md:px-10 md:pt-28"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div
        ref={bubblesRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={bubbleColor ? { color: bubbleColor } : undefined}
      />

      <div className="relative grid gap-12 md:grid-cols-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-8 md:grid-cols-3">
          {flatLinks.length > 0 ? (
            <nav aria-label="Links" className="col-span-2">
              <ul className="grid grid-cols-2 gap-x-8 lg:gap-y-2">
                {flatLinks.map((l, i) => (
                  <li key={i}>
                    <a
                      href={l.href || '#top'}
                      {...externalProps(l.href)}
                      className="tpl-link tpl-hit relative inline-block py-3 text-sm uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <>
              {columns.map((column) => (
                <nav key={column.heading} aria-label={column.heading}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-55 md:text-xs lg:mb-5">
                    {column.heading}
                  </p>
                  <ul className="lg:space-y-1">
                    {parseNavLinks(column.items).map((item) => (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          {...externalProps(item.href)}
                          className="tpl-link tpl-hit relative inline-block py-3 text-sm uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </>
          )}
          {/* Legal: también con links propios (antes desaparecía al editarlos). */}
          {legalNav}
          {/* Contacto: también con links propios (antes desaparecía al editarlos). */}
          <div className="col-span-2 md:col-span-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-55 md:text-xs lg:mb-5">
              {contactLabel}
            </p>
            <a
              href={cta}
              className="tpl-link tpl-hit relative inline-block py-3 text-sm [overflow-wrap:anywhere] uppercase transition-opacity duration-300 hover:opacity-70 md:text-base lg:py-0"
            >
              {email}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:col-span-4 md:items-end md:text-right">
          <p className="max-w-[34ch] text-sm leading-relaxed opacity-80 md:text-base">{note}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-55 md:text-xs">
            {legal}
          </p>
          <a
            href="#top"
            className="tpl-link tpl-hit relative self-start text-[11px] font-semibold uppercase tracking-[0.22em] transition-opacity duration-300 hover:opacity-70 md:self-end md:text-xs"
          >
            {backToTop}
          </a>
        </div>
      </div>

      <p
        aria-label={ctaWord}
        className="relative mt-auto -mb-[0.1em] origin-bottom-left -rotate-[4deg] pt-16 select-none md:pt-24"
      >
        <span
          data-splash-word
          aria-hidden="true"
          className="-ml-[0.04em] block font-brico text-[clamp(5.5rem,27vw,34rem)] leading-[0.82] font-extrabold tracking-[-0.045em] whitespace-nowrap uppercase"
        >
          {ctaWord}
        </span>
      </p>

      <LegalSheet
        docs={legalDocs([
          { href: privacyHref, title: privacyLabel, body: privacyText },
          { href: termsHref, title: termsLabel, body: termsText },
        ])}
        closeLabel={legalCloseLabel}
        bg={fg || '#fff3e2'}
        fg={bg || '#2c4bff'}
      />
    </footer>
  )
}
