import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import orbitMeeting from './assets/orbit-meeting.jpg'
import orbitScreens from './assets/orbit-screens.jpg'
import orbitHands from './assets/orbit-hands.jpg'
import orbitDesk from './assets/orbit-desk.jpg'
import orbitBoard from './assets/orbit-board.jpg'
import gallery from './assets/gallery.jpg'

const defaultPlates = [
  { src: orbitMeeting, rotate: -16, x: '2%', y: '8%', w: '24%', speed: 1.45, spin: 10 },
  { src: orbitScreens, rotate: 9, x: '26%', y: '22%', w: '26%', speed: 0.65, spin: -8 },
  { src: orbitHands, rotate: -5, x: '48%', y: '12%', w: '22%', speed: 1.2, spin: 7 },
  { src: gallery, rotate: 14, x: '68%', y: '0%', w: '24%', speed: 1.6, spin: -12 },
  { src: orbitDesk, rotate: -20, x: '78%', y: '28%', w: '22%', speed: 0.85, spin: 9 },
  { src: orbitBoard, rotate: 11, x: '-2%', y: '38%', w: '20%', speed: 1.3, spin: -6 },
]

/**
 * PeopleScatter — black field, a studio line, photographs thrown on a
 * loose arc. Each plate drifts and tilts on its own scrub (P2 / P6).
 */
export default function PeopleScatter({
  label = 'People & Process',
  title = 'A studio shaped by clarity, trust, and a collective pursuit of thoughtful design.',
  plates = defaultPlates,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const split = new SplitText('[data-people-title]', {
        type: 'lines',
        mask: 'lines',
      })
      gsap.from(split.lines, {
        yPercent: 108,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      })

      gsap.utils.toArray('[data-people-plate]').forEach((el) => {
        const speed = Number(el.dataset.speed) || 0.8
        const spin = Number(el.dataset.spin) || 0
        const base = Number(el.dataset.rotate) || 0
        gsap.fromTo(
          el,
          { yPercent: -18 * speed, rotate: base - spin },
          {
            yPercent: 18 * speed,
            rotate: base + spin,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.55,
            },
          },
        )
      })
    },
    { scope: root },
  )

  const renderPlates = (className) =>
    plates.map((plate) => (
      <figure
        key={plate.src + plate.x + className}
        data-people-plate
        data-speed={plate.speed}
        data-spin={plate.spin}
        data-rotate={plate.rotate}
        className={`absolute overflow-hidden will-change-transform ${className}`}
        style={{
          left: plate.x,
          top: plate.y,
          width: plate.w,
        }}
      >
        <img
          src={plate.src}
          alt=""
          className="aspect-[4/3] h-auto w-full max-w-none object-cover"
        />
      </figure>
    ))

  const italicTitle = title.replace(
    /\bpursuit\b/i,
    (word) => `⟦${word}⟧`,
  )

  return (
    <section
      ref={root}
      id="people"
      className="relative min-h-[170svh] overflow-hidden bg-atrium-ink px-5 pt-16 pb-24 text-atrium-paper md:min-h-[180svh] md:px-10 md:pt-20 md:pb-32"
    >
      <p className="font-grotesk text-[13px] tracking-[-0.01em] md:text-[15px]">{label}</p>
      <h2
        data-people-title
        className="relative z-10 mt-10 max-w-[18ch] font-display text-[clamp(2.05rem,5.5vw,4.75rem)] font-normal leading-[1.12] tracking-[-0.03em]"
      >
        {italicTitle.split('⟦').map((chunk, i) => {
          if (i === 0) return chunk
          const [em, rest] = chunk.split('⟧')
          return (
            <span key={em + rest}>
              <em className="italic font-normal">{em}</em>
              {rest}
            </span>
          )
        })}
      </h2>

      <div className="relative mt-16 h-[58vh] md:hidden">{renderPlates('')}</div>
      <div className="pointer-events-none absolute inset-x-0 top-[36%] hidden h-[64%] md:block">
        {renderPlates('')}
      </div>
    </section>
  )
}
