import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import orbitMeeting from './assets/orbit-meeting.jpg'
import orbitScreens from './assets/orbit-screens.jpg'
import orbitHands from './assets/orbit-hands.jpg'
import orbitBoard from './assets/orbit-board.jpg'
import orbitDesk from './assets/orbit-desk.jpg'
import orbitModel from './assets/orbit-model.jpg'

/**
 * El arco de la referencia: las placas suben hacia la derecha, se solapan y
 * se inclinan cada vez mas. `x` / `y` / `w` son la version desktop (vw y % de
 * la banda); `mx` / `my` / `mw` la version movil, donde el arco no entra y
 * las fotos caen en zigzag. Estas fotos no se repiten en el anillo.
 */
const defaultPlates = [
  { src: orbitBoard, x: -13, y: 66, w: 25, rot: -2, ratio: '6 / 5', speed: 0.7, mx: 2, my: 0, mw: 62 },
  { src: orbitMeeting, x: 8, y: 57, w: 26, rot: -5, ratio: '1 / 1', speed: 1.15, mx: 32, my: 14, mw: 60 },
  { src: orbitScreens, x: 32, y: 60, w: 25, rot: -8, ratio: '6 / 5', speed: 0.85, mx: 0, my: 29, mw: 66 },
  { src: orbitHands, x: 55, y: 41, w: 25, rot: -12, ratio: '1 / 1', speed: 1.35, mx: 28, my: 45, mw: 62 },
  { src: orbitDesk, x: 76, y: 20, w: 27, rot: -19, ratio: '6 / 5', speed: 0.95, mx: 4, my: 61, mw: 64 },
  { src: orbitModel, x: 96, y: 4, w: 25, rot: -26, ratio: '1 / 1', speed: 1.5, mx: 30, my: 77, mw: 58 },
]

/**
 * PeopleScatter — black field, a small serif label, one studio statement at
 * paragraph-headline size, and the photographs thrown on an arc that climbs
 * out of the right edge. Each plate drifts on its own scrub and the picture
 * moves inside its crop (P2 / P6). One set of figures — never duplicated
 * per breakpoint, so the scrub is not fighting twelve nodes.
 */
export default function PeopleScatter({
  label = 'Section label',
  title = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
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
        duration: 1.15,
        ease: 'power4.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 68%', once: true },
      })

      gsap.utils.toArray('[data-people-plate]').forEach((figure) => {
        const speed = Number(figure.dataset.speed) || 1
        // El drift vive en un wrapper interno: la rotacion se queda en el
        // nodo de recorte y nunca la pisa un yPercent.
        const drift = figure.querySelector('[data-people-drift]')
        const media = figure.querySelector('[data-people-media]')

        gsap.fromTo(
          drift,
          { yPercent: -16 * speed },
          {
            yPercent: 16 * speed,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.55,
            },
          },
        )

        gsap.fromTo(
          media,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.7,
            },
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="people"
      className="relative min-h-[200svh] overflow-hidden bg-atrium-ink px-5 pt-[13svh] pb-[10svh] text-atrium-paper md:min-h-[135svh] md:px-10"
    >
      {/* Caja angosta a proposito: el label parte en dos lineas como en la ref. */}
      <p className="atrium-note relative z-10 max-w-[8ch] font-display">{label}</p>

      <h2
        data-people-title
        className="atrium-lead relative z-10 mt-[6svh] max-w-[20ch] indent-[1.15em]"
      >
        {title}
      </h2>

      <div className="pointer-events-none absolute inset-x-0 top-[62svh] h-[122svh] md:top-[24svh] md:h-[78svh]">
        {plates.map((plate) => (
          <figure
            key={plate.src}
            data-people-plate
            data-speed={plate.speed}
            style={{
              '--px': `${plate.x}vw`,
              '--py': `${plate.y}%`,
              '--pw': `${plate.w}vw`,
              '--mx': `${plate.mx}vw`,
              '--my': `${plate.my}%`,
              '--mw': `${plate.mw}vw`,
            }}
            className="absolute top-[var(--my)] left-[var(--mx)] w-[var(--mw)] md:top-[var(--py)] md:left-[var(--px)] md:w-[var(--pw)]"
          >
            <div data-people-drift className="will-change-transform">
              <div
                className="overflow-hidden"
                style={{
                  transform: `rotate(${plate.rot}deg)`,
                  aspectRatio: plate.ratio,
                }}
              >
                <img
                  data-people-media
                  src={plate.src}
                  alt=""
                  loading="lazy"
                  className="h-[114%] w-full max-w-none -translate-y-[6%] object-cover will-change-transform"
                />
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}
