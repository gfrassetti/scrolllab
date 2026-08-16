import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import cutout from './assets/op-cutout.png'

/**
 * FooterDrop — black closer as a four-column terminal, giant mark.
 */
export default function FooterDrop({
  mark = 'VANTA',
  hint = 'What path will you forge?',
  cta = 'Download brand book',
  boot = '// initializing',
  fileLine = 'new files in database',
  story = 'Story',
  journal = 'Journal',
  media = 'Media',
  gallery = 'Gallery',
  about = 'About',
  contact = 'hello@vanta.game',
  legal = 'Privacy · Terms · License',
  col1 = 'Discover more',
  col2 = 'Join the conversation',
  col3 = 'More details',
  img = cutout,
  img2,
  img3,
  img4,
}) {
  const root = useRef(null)
  void img2
  void img3
  void img4

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-drop-cutout]',
        { yPercent: 28 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 75%',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        },
      )
    },
    { scope: root },
  )

  const links = [story, journal, media, gallery, about]

  return (
    <footer id="drop" ref={root} className="relative overflow-hidden bg-[#09090b] text-white">
      <div className="grid border-b border-white/15 md:grid-cols-4">
        <div className="border-white/15 px-5 py-8 font-mono text-[10px] tracking-[0.16em] uppercase opacity-55 md:border-r md:px-8">
          <p>
            {boot}
            <br />
            {fileLine}
          </p>
        </div>
        <div className="border-white/15 px-5 py-8 md:border-r md:px-8">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-50">■ {col1}</p>
          <ul className="mt-4 space-y-1 font-anton text-[clamp(1.1rem,2vw,1.45rem)] leading-none tracking-wide uppercase">
            {links.map((item) => (
              <li key={item}>
                <a
                  href="#project"
                  className="inline-block px-1 py-0.5 transition-colors duration-200 ease-[var(--ease-out)] hover:bg-white hover:text-black"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-white/15 px-5 py-8 md:border-r md:px-8">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-50">■ {col2}</p>
          <ul className="mt-4 space-y-1 font-anton text-[clamp(1.1rem,2vw,1.45rem)] leading-none tracking-wide uppercase">
            <li>
              <a href="#drop" className="inline-block px-1 py-0.5 hover:bg-white hover:text-black">
                Twitter
              </a>
            </li>
            <li>
              <a href="#drop" className="inline-block px-1 py-0.5 hover:bg-white hover:text-black">
                Discord
              </a>
            </li>
          </ul>
        </div>
        <div className="px-5 py-8 md:px-8">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-50">■ {col3}</p>
          <a
            href={`mailto:${contact}`}
            className="mt-4 block font-anton text-[clamp(1.1rem,2vw,1.45rem)] uppercase hover:opacity-60"
          >
            {contact}
          </a>
          <a
            href="#top"
            className="vanta-chamfer ui-press mt-6 inline-block border border-white/35 px-4 py-2 font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            {cta}
          </a>
        </div>
      </div>

      <div className="relative min-h-[58svh]">
        <p
          aria-hidden="true"
          className="font-anton pointer-events-none absolute inset-x-0 top-[18%] text-center text-[32vw] leading-[0.72] tracking-[-0.07em] text-white uppercase"
        >
          {mark}
        </p>
        <img
          data-drop-cutout
          src={img}
          alt=""
          className="relative z-10 mx-auto mt-[18%] h-[42svh] w-auto object-contain mix-blend-lighten opacity-80"
        />
        <p className="absolute bottom-8 left-5 font-mono text-[10px] tracking-[0.2em] uppercase opacity-55 md:left-8">
          {hint}
        </p>
        <p className="absolute right-5 bottom-8 font-mono text-[10px] tracking-[0.16em] uppercase opacity-40 md:right-8">
          {legal}
        </p>
      </div>
    </footer>
  )
}
