import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { PAPER, TORN_TOP } from './comicKit'
import { DogHead, PigHead } from './StoryArt'
import { parseNavLinks } from '../../../lib/navLinks'
import { externalProps, legalDocs } from '../../../lib/contactLinks'
import LegalSheet from '../../LegalSheet'

const DEFAULT_COLUMNS = [
  {
    heading: 'The story',
    items: [
      { label: 'The road', href: '#chapter-dusty' },
      { label: 'The farm', href: '#chapter-fork' },
      { label: 'Home', href: '#chapter-bond' },
      { label: 'Two worlds', href: '#chapter-worlds' },
    ],
  },
  {
    heading: 'Get involved',
    items: [
      { label: 'Sponsor a pig', href: 'mailto:sponsor@haven-sanctuary.org?subject=Sponsor%20a%20pig' },
      { label: 'Volunteer', href: 'mailto:hello@haven-sanctuary.org?subject=Volunteering' },
      { label: 'Open days', href: 'mailto:hello@haven-sanctuary.org?subject=Open%20day' },
      { label: 'Instagram', href: 'https://www.instagram.com/' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { label: 'Privacy', href: '#privacy' },
      { label: 'Charity details', href: '#charity' },
    ],
  },
]

const PRIVACY = `Last updated: 1 April 2026

Haven Farm Sanctuary is responsible for the personal data you share on this site.

We keep what you send us when you write, sponsor an animal or book an open day: your name, your email and your message. We use it to answer you, send sponsor updates you asked for and organise visits.

We never sell or swap your data. You can ask to see, correct or delete it at any time at hello@haven-sanctuary.org.`

const CHARITY = `Haven Farm Sanctuary is a small charity looking after rescued farm animals on thirty acres in Somerset, England.

Sponsorships pay for food, bedding and vet care. Every sponsor receives a photo update of their animal each season.

Dusty and Pip are characters in our story; the animals you meet on an open day are real, and every one of them has a name.`

/**
 * FooterComic — the back cover. A torn sheet of the comic's grey paper rises
 * over the last scene: a closing line with the CTA, three columns of links, a
 * contact line, and the brand set huge along the bottom with the dog and the
 * pig peeking over it.
 */
export default function FooterComic({
  brand = 'HAVEN',
  headline = 'Every animal here has a name. Help us give one more.',
  cta = 'Sponsor a pig',
  ctaHref = 'mailto:sponsor@haven-sanctuary.org?subject=Sponsor%20a%20pig',
  columns = DEFAULT_COLUMNS,
  email = 'hello@haven-sanctuary.org',
  credit = '©2026 Haven Farm Sanctuary — Somerset, England',
  backToTop = 'Back to top ↑',
  legalDocsList = [
    { href: '#privacy', title: 'Privacy', body: PRIVACY },
    { href: '#charity', title: 'Charity details', body: CHARITY },
  ],
  legalCloseLabel = 'Close',
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-foot-reveal]')
      gsap.from('[data-foot-line]', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.8)',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 60%', once: true },
      })
      gsap.from('[data-foot-word] span', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '[data-foot-word]', start: 'top 95%', once: true },
      })
      gsap.from('[data-foot-face]', {
        yPercent: 70,
        rotate: (i) => (i ? 12 : -12),
        duration: 1,
        ease: 'back.out(1.6)',
        stagger: 0.15,
        scrollTrigger: { trigger: '[data-foot-word]', start: 'top 95%', once: true },
      })
    },
    { scope: root },
  )

  const links = (column) =>
    parseNavLinks(column.items).map((item) => (
      <li key={item.label}>
        <a href={item.href} {...externalProps(item.href)} className="tpl-link tpl-hit relative inline-block py-1 text-[15px] font-semibold md:text-base">
          {item.label}
        </a>
      </li>
    ))

  return (
    <footer
      id="contact"
      ref={root}
      className="relative -mt-[100svh] flex min-h-[115svh] flex-col overflow-hidden px-5 pt-28 text-[#1d1a18] calm:mt-0 md:px-10 md:pt-36"
      style={{ ...PAPER, clipPath: TORN_TOP }}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p data-foot-line data-foot-reveal className="font-hand text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.92] font-black tracking-[0.01em] uppercase">
            {headline}
          </p>
          <a
            data-foot-line
            data-foot-reveal
            href={ctaHref}
            className="ui-press tpl-hit relative mt-8 inline-flex items-center gap-3 rounded-md bg-comic-flare px-6 py-4 text-[13px] font-bold tracking-[0.16em] text-white uppercase shadow-[0_10px_24px_rgba(232,90,36,0.4)] transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:rotate-[-1deg]"
          >
            {cta}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:col-span-7">
          {columns.map((column) => (
            <div key={column.heading} data-foot-line data-foot-reveal>
              <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#1d1a18]/55 uppercase">{column.heading}</p>
              <ul className="space-y-1">{links(column)}</ul>
            </div>
          ))}
          <div data-foot-line data-foot-reveal className="col-span-2 sm:col-span-3">
            <p className="mb-3 text-[11px] font-bold tracking-[0.24em] text-[#1d1a18]/55 uppercase">Contact</p>
            <a href={`mailto:${email}`} className="tpl-link tpl-hit relative font-brico text-xl font-bold [overflow-wrap:anywhere] md:text-2xl">
              {email}
            </a>
          </div>
        </nav>
      </div>

      <div className="mx-auto mt-14 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[#1d1a18]/20 pt-5 text-[12px] font-semibold">
        <p className="text-[#1d1a18]/60">{credit}</p>
        <a href="#top" className="tpl-link tpl-hit relative">
          {backToTop}
        </a>
      </div>

      {/* the brand, huge, with the two of them peeking over it */}
      <div className="relative mt-auto pt-24">
        <div data-foot-face className="absolute bottom-[58%] left-[12%] w-[min(18vw,230px)]">
          <DogHead mood="happy" className="block h-auto w-full" />
        </div>
        <div data-foot-face className="absolute right-[12%] bottom-[56%] w-[min(18vw,230px)]">
          <PigHead mood="calm" className="block h-auto w-full" />
        </div>
        <p
          data-foot-word
          aria-label={brand}
          className="relative -mx-2 -mb-[0.12em] overflow-hidden text-center font-hand text-[clamp(6rem,30vw,30rem)] leading-[0.8] font-black tracking-[0.01em] text-[#1d1311] uppercase"
        >
          {brand.split('').map((ch, i) => (
            <span key={i} aria-hidden="true" className="inline-block">
              {ch}
            </span>
          ))}
        </p>
      </div>

      <LegalSheet docs={legalDocs(legalDocsList)} closeLabel={legalCloseLabel} bg="#efe9dc" fg="#1d1a18" />
    </footer>
  )
}
