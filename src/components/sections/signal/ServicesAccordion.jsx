import { useRef, useState } from 'react'
import { gsap } from '../../../lib/gsap'

const defaultServices = [
  {
    title: 'Sound design',
    body: 'Original scores and sonic identities built to sit under motion, not on top of it.',
  },
  {
    title: 'Motion graphics',
    body: 'Title sequences, kinetic type systems, and the small transitions that make a cut feel intentional.',
  },
  {
    title: 'Brand film',
    body: 'Short-form films that carry a brand’s tone end to end — concept through final mix.',
  },
  {
    title: 'Creative technology',
    body: 'Scroll-driven and interactive builds for launches that need to feel like an event, not a page.',
  },
]

/**
 * ServicesAccordion — expand/collapse list (Dolsten's grid-template-rows
 * mechanic, ported here with the GSAP height:'auto' idiom already used by
 * components/FaqAccordion.jsx). Indexed like ratio/atrium's numbered rows
 * and lit with the signal-accent cyan so it reads as SIGNAL, not a generic
 * FAQ block. See docs/reference-analysis/signal.md.
 */
function Row({ index, item, isOpen, onToggle }) {
  const panelRef = useRef(null)
  const tweenRef = useRef(null)

  const toggle = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    onToggle()
    if (reduced) return

    tweenRef.current?.kill()
    requestAnimationFrame(() => {
      const el = panelRef.current
      if (!el) return
      if (!isOpen) {
        gsap.set(el, { height: 0, opacity: 0 })
        tweenRef.current = gsap.to(el, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out' })
      } else {
        tweenRef.current = gsap.to(el, { height: 0, opacity: 0, duration: 0.32, ease: 'power2.in' })
      }
    })
  }

  return (
    <div
      className="border-b border-signal-ink/15 py-7 transition-colors"
      style={{ borderLeft: isOpen ? '2px solid var(--signal-accent)' : '2px solid transparent' }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-baseline gap-5 pl-5 text-left"
      >
        <span className="font-mono text-[11px] tracking-[0.2em] text-signal-accent">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex-1 font-grotesk text-[clamp(1.4rem,3.2vw,2.2rem)] font-medium tracking-[-0.02em]">
          {item.title}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-2xl transition-transform duration-300 ${isOpen ? 'rotate-45 text-signal-accent' : 'text-signal-ink/35'}`}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div ref={panelRef} className="overflow-hidden pl-5">
          <p className="max-w-[55ch] pt-4 pl-[2.6em] text-sm leading-relaxed text-signal-ink/65">
            {item.body}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ServicesAccordion({ eyebrow = 'Services', items = defaultServices }) {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="bg-signal-paper px-5 py-24 text-signal-ink md:px-10 md:py-32">
      <div className="mx-auto max-w-[1000px]">
        <p className="text-[11px] tracking-[0.28em] text-signal-ink/45 uppercase">{eyebrow}</p>
        <div className="mt-10">
          {items.map((item, i) => (
            <Row
              key={item.title}
              index={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
