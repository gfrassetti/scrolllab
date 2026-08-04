import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import card1 from './assets/card-1.png'
import card2 from './assets/card-2.png'
import card3 from './assets/card-3.png'
import card4 from './assets/card-4.png'
import card5 from './assets/card-5.png'
import card6 from './assets/card-6.png'

const defaultCards = [
  {
    title: 'Card 01',
    label: 'Label one',
    tone: 'from-[#f4f0ea] via-[#e8d5c4] to-[#c45a1a]',
    img: card1,
  },
  {
    title: 'Card 02',
    label: 'Label two',
    tone: 'from-[#d8d0c4] via-[#b8a898] to-[#6a5a4a]',
    img: card2,
  },
  {
    title: 'Card 03',
    label: 'Label three',
    tone: 'from-[#1a1410] via-[#3a2a22] to-[#0c0a08]',
    img: card3,
  },
  {
    title: 'Card 04',
    label: 'Label four',
    tone: 'from-[#2a2a2a] via-[#4a4540] to-[#1a1816]',
    img: card4,
  },
  {
    title: 'Card 05',
    label: 'Label five',
    tone: 'from-[#ece8e0] via-[#ddd6cc] to-[#b8b0a4]',
    img: card5,
  },
  {
    title: 'Card 06',
    label: 'Label six',
    tone: 'from-[#e8d4d8] via-[#c8a0a8] to-[#8a6070]',
    img: card6,
  },
]

/**
 * StudioCards — light plane after the shutter wash: 2×3 rounded cards
 * that stagger in on scroll (Trionn explore / Dribbble grid pattern).
 */
export default function StudioCards({
  note = 'Concepts, explorations, and interface experiments shared openly as part of our creative process.',
  cta = 'View collection →',
  ctaHref = '#top',
  cards = defaultCards,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-studio-card]', {
        y: 64,
        opacity: 0,
        scale: 0.96,
        duration: 0.85,
        ease: 'power3.out',
        stagger: { each: 0.08, from: 'start' },
        scrollTrigger: {
          trigger: root.current?.querySelector('[data-studio-grid]'),
          start: 'top 78%',
          once: true,
        },
      })

      gsap.from('[data-studio-foot]', {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: root.current?.querySelector('[data-studio-foot]'),
          start: 'top 90%',
          once: true,
        },
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="bg-[#e8e8e6] px-5 py-20 text-[#111214] md:px-10 md:py-28"
    >
      <ul
        data-studio-grid
        className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
      >
        {cards.map((card) => (
          <li key={card.title} data-studio-card>
            <article className="group relative aspect-[16/11] overflow-hidden rounded-2xl bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.08)] md:rounded-3xl">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.tone}`}
              />
              <img
                src={card.img}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="text-[10px] tracking-[0.22em] text-white/70 uppercase">
                  {card.label}
                </p>
                <h3 className="mt-1 font-brico text-xl font-semibold tracking-[-0.02em] text-white md:text-2xl">
                  {card.title}
                </h3>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div
        data-studio-foot
        className="mx-auto mt-14 flex max-w-[1400px] flex-col gap-4 border-t border-black/15 pt-6 md:mt-18 md:flex-row md:items-start md:justify-between"
      >
        <p className="max-w-[42ch] text-sm leading-relaxed text-black/55 md:text-[15px]">
          {note}
        </p>
        <a
          href={ctaHref}
          className="shrink-0 text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-black/30 hover:decoration-black"
        >
          {cta}
        </a>
      </div>
    </section>
  )
}
