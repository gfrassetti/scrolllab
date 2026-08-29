import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import orbitCivic from './assets/orbit-civic.jpg'
import orbitFacade from './assets/orbit-facade.jpg'
import orbitMaterials from './assets/orbit-materials.jpg'
import civic from './assets/civic.jpg'
import tower from './assets/tower.jpg'
import courtyard from './assets/courtyard.jpg'
import gallery from './assets/gallery.jpg'
import heroHouse from './assets/hero-house.jpg'
import interior from './assets/interior.jpg'

// `model.jpg` / `material.jpg` / `orbit-site.jpg` quedan solo para ProcessPin
// y las seis de PeopleScatter (orbit-board/meeting/screens/hands/desk/model)
// no entran aca: el anillo no puede repetir ninguna foto dentro de si mismo,
// y con solo 19 assets en el pool no alcanza para que ademas no se toque con
// ProjectRail. Nueve tiles, todas distintas entre si, es el mejor balance
// hasta que haya piezas nuevas (Higgsfield / template-image-designer) — ese
// paso no corrio en esta sesion por falta de la herramienta de generacion.
const defaultTiles = [
  orbitCivic,
  civic,
  orbitMaterials,
  courtyard,
  orbitFacade,
  tower,
  gallery,
  interior,
  heroHouse,
]

/**
 * OrbitRing — the photographs sit on one circular rail, each rotated to the
 * tangent, and the whole rail turns as a rigid body on scrub (P1). The
 * rotation lives on the ring wrapper, never on a tile: every tile already
 * carries its own `rotate + translateY` and the two would fight. The centre
 * holds a single scene — the founding year — so the pin reads as one idea,
 * not a carousel. The figures for the stats come after, in StatField.
 */
export default function OrbitRing({
  tiles = defaultTiles,
  lineOne = '0000',
  lineTwo = 'Placeholder year',
  left = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
  right = 'Incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam.',
  turn = 290,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.set('[data-orbit-scene]', { autoAlpha: 0, y: 34 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.35,
        },
      })

      // Rotate y un crecimiento leve viven en el wrapper del anillo, nunca en
      // el tile — ese ya tiene su propio rotate + translateY, y un scale
      // grande ahi dispersaria el aro y dejaria el centro vacio.
      tl.fromTo(
        '[data-orbit-ring]',
        { rotate: -turn * 0.16, scale: 0.96 },
        { rotate: turn * 0.84, scale: 1.03, ease: 'none', duration: 1 },
        0,
      )
      tl.fromTo(
        '[data-orbit-media]',
        { yPercent: -7 },
        { yPercent: 7, ease: 'none', duration: 1 },
        0,
      )

      tl.to('[data-orbit-scene]', { autoAlpha: 1, y: 0, ease: 'none', duration: 0.1 }, 0.04)
      tl.to('[data-orbit-scene]', { autoAlpha: 0, y: -28, ease: 'none', duration: 0.06 }, 0.94)
    },
    { scope: root },
  )

  return (
    <section ref={root} id="foundation" className="relative h-[340svh] bg-atrium-ink text-atrium-paper">
      <div data-orbit-pin className="sticky top-0 h-svh overflow-hidden">
        <div
          data-orbit-ring
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-0 w-0 [--orbit-r:min(34vw,40vh)] will-change-transform md:[--orbit-r:min(30vw,46vh)]"
        >
          {tiles.map((src, i) => (
            <div
              key={`${src}-${i}`}
              data-orbit-tile
              className="absolute top-0 left-0 h-[clamp(4.6rem,23vw,22rem)] w-[clamp(4rem,20vw,19rem)] overflow-hidden md:h-[clamp(8rem,23vw,22rem)] md:w-[clamp(7rem,20vw,19rem)]"
              style={{
                transform: `rotate(${(360 / tiles.length) * i}deg) translateY(calc(-1 * var(--orbit-r))) translate(-50%, -50%)`,
              }}
            >
              <img
                data-orbit-media
                src={src}
                alt=""
                loading={i > 3 ? 'lazy' : undefined}
                className="h-[116%] w-full max-w-none -translate-y-[7%] object-cover will-change-transform"
              />
            </div>
          ))}
        </div>

        {/* Scrim: a algunas rotaciones una foto clara queda justo detras del
            texto — sin esto se vuelve ilegible, sobre todo en mobile donde
            el anillo tiene menos aire alrededor del centro. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(closest-side,rgba(17,17,17,0.7),transparent_72%)]"
        />

        <div
          data-orbit-scene
          className="relative z-10 flex h-full flex-col items-center justify-center px-5 pb-[6svh] text-center"
        >
          <h2 className="atrium-display">
            <span className="block">{lineOne}</span>
            <span className="block">{lineTwo}</span>
          </h2>
          <div className="atrium-note mt-[5svh] grid w-full max-w-xl gap-6 text-left text-atrium-paper/65 md:grid-cols-2 md:gap-14">
            <p>{left}</p>
            <p>{right}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
