import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import TiltPlate from './TiltPlate'
import FolderFrame from './FolderFrame'
import cutout from './assets/op-cutout.png'
import sliverA from './assets/op-warden.jpg'
import sliverB from './assets/citadel.jpg'
import sliverC from './assets/world-vista.jpg'

/**
 * FooterDrop — black closer. Giant outlined mark, 3D slivers, rising operator.
 */
export default function FooterDrop({
  mark = 'VANTA',
  hint = 'What path will you forge?',
  cta = 'Play the drop →',
  boot = '// initializing',
  fileLine = 'warden_07.jpg',
  story = 'Story',
  journal = 'Journal',
  media = 'Media',
  gallery = 'Gallery',
  about = 'About',
  contact = 'hello@vanta.game',
  legal = 'Privacy · Terms · License',
  col1 = 'Discover',
  col2 = 'Join',
  col3 = 'More detail',
  img = cutout,
  img2 = sliverA,
  img3 = sliverB,
  img4 = sliverC,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-drop-cutout]',
        { yPercent: 38 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        },
      )
      gsap.fromTo(
        '[data-drop-sliver]',
        { yPercent: 22 },
        {
          yPercent: 0,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 75%',
            end: 'top 20%',
            scrub: 0.5,
          },
        },
      )
    },
    { scope: root },
  )

  const links = [story, journal, media, gallery, about]
  const cols = [
    { label: col1, href: '#project' },
    { label: col2, href: '#drop' },
    { label: col3, href: '#citadel' },
  ]
  const slivers = [
    { src: img2, rot: '-12deg', tab: 'left' },
    { src: img3, rot: '6deg', tab: 'right' },
    { src: img4, rot: '-4deg', tab: 'left' },
  ]

  return (
    <footer
      id="drop"
      ref={root}
      className="relative overflow-hidden bg-[#09090b] text-white"
    >
      <div className="grid gap-8 border-b border-white/15 px-5 py-8 font-mono text-[10px] tracking-[0.18em] uppercase md:grid-cols-4 md:px-10">
        <p className="opacity-55">
          {boot}
          <br />
          new files in database
          <br />
          {fileLine}
        </p>
        <ul className="space-y-1">
          {links.map((item) => (
            <li key={item}>
              <a
                href="#project"
                className="underline-offset-4 transition-opacity duration-200 ease-[var(--ease-out)] hover:opacity-50 hover:underline"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Contact us at
          <br />
          <a href={`mailto:${contact}`} className="underline-offset-2 hover:underline">
            {contact}
          </a>
        </p>
        <p className="md:text-right">
          <a
            href="#top"
            className="vanta-chamfer ui-press inline-block border border-white/30 px-4 py-2"
          >
            {cta}
          </a>
        </p>
      </div>

      <div className="relative min-h-[78svh]">
        <p
          aria-hidden="true"
          className="font-anton pointer-events-none absolute inset-x-0 top-[8%] text-center text-[28vw] leading-[0.75] tracking-[-0.05em] text-transparent uppercase [-webkit-text-stroke:2px_white]"
        >
          {mark}
        </p>

        <div className="absolute inset-x-0 top-[18%] z-10 flex justify-center md:top-[16%]">
          {slivers.map((item, i) => (
            <div
              key={item.src}
              data-drop-sliver
              className="pointer-events-auto h-[28svh] w-[22vw] max-w-[220px] md:h-[34svh]"
              style={{ rotate: item.rot, marginLeft: i === 0 ? 0 : '-4vw' }}
            >
              <TiltPlate className="h-full w-full">
                <FolderFrame tab={item.tab} className="h-full w-full">
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                </FolderFrame>
              </TiltPlate>
            </div>
          ))}
        </div>

        <img
          data-drop-cutout
          src={img}
          alt=""
          className="relative z-20 mx-auto h-[58svh] w-auto object-contain"
        />
        <p className="absolute bottom-28 left-5 z-20 font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 md:left-10">
          {hint}
        </p>
        <p className="absolute right-5 bottom-28 z-20 font-mono text-[10px] tracking-[0.16em] uppercase opacity-40 md:right-10">
          {legal}
        </p>
      </div>

      <div className="grid border-t border-white/15 md:grid-cols-3">
        {cols.map((col) => (
          <a
            key={col.label}
            href={col.href}
            className="group border-white/15 px-5 py-6 md:border-r md:last:border-r-0 md:px-8 md:py-8"
          >
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-55">
              ▶▶
            </span>
            <span className="font-anton mt-2 block text-[clamp(1.8rem,4vw,3rem)] leading-none uppercase transition-colors duration-200 ease-[var(--ease-out)] group-hover:text-[#c0fb50]">
              {col.label}
            </span>
          </a>
        ))}
      </div>
    </footer>
  )
}
