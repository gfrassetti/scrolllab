import { useRef } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { VantaCrosshair } from './VantaChrome'
import HeroCanvas from './HeroCanvas'
import heroFace from './assets/hero-face.jpg'
import rex from './assets/op-rex.jpg'

/**
 * HeroOperators — un retrato. Full-bleed, y el mismo nodo se achica a carpeta.
 *
 * El retrato lo renderiza HeroCanvas (WebGL): el puntero mueve la cámara, no la
 * foto. Acá no va tilt CSS sobre la card — duplicaría la respuesta del puntero y
 * es lo que hace que un hero KPR-like se note falso.
 */
export default function HeroOperators({
  // Copy genérico a propósito (título 1 / headline / lorem corto): en esta
  // pasada estamos clavando motor y layout contra la ref, no lore de VANTA.
  // El comprador reemplaza esto por su propio copy — no hace falta inventar
  // facciones/operators todavía.
  line = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.',
  word1 = 'HEADLINE.',
  word2 = 'TITLE TWO.',
  word3 = 'TITLE 1.',
  tag1 = '01',
  tag2 = '02',
  tag3 = '03',
  worldLine = 'Subheadline placeholder text goes here.',
  hint = 'Scroll',
  img = heroFace,
  img2 = rex,
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const card = root.current.querySelector('[data-hero-card]')
      const shot = root.current.querySelector('[data-hero-shot]')
      const cardB = root.current.querySelector('[data-hero-card-b]')
      const tiltEl = root.current.querySelector('[data-hero-tilt]')
      const paper = root.current.querySelector('[data-hero-paper]')
      const tab = root.current.querySelector('[data-hero-tab]')
      const words = gsap.utils.toArray('[data-hero-word]', root.current)
      const world = root.current.querySelector('[data-hero-world]')
      const copy = root.current.querySelector('[data-hero-copy]')
      const type = gsap.utils.toArray('[data-hero-type]', root.current)

      // Anton carga con display=swap (index.html) sin ningún gate: SplitText
      // puede correr ANTES de que la fuente real esté lista, cortar cada
      // carácter en un span de tamaño fijo medido contra el fallback, y romper
      // (recorte + flicker) cuando Anton entra y cambia el ancho del glifo.
      // Palabras huge + fluid (clamp/vw) como estas son justo donde más se
      // nota. Se tapan hasta que la fuente real esté confirmada.
      let split = null
      let played = false
      let cancelled = false
      gsap.set(words, { autoAlpha: reduced ? 1 : 0 })

      const playIntro = () => {
        if (played || reduced || cancelled) return
        played = true
        split = new SplitText(words, { type: 'chars', mask: 'chars' })
        gsap.set(split.chars, { yPercent: 110 })
        gsap.set(words, { autoAlpha: 1 })
        gsap.set(copy, { autoAlpha: 0, y: 14 })
        gsap.set(type, { autoAlpha: 0 })
        gsap.to(split.chars, {
          yPercent: 0,
          duration: 1.15,
          delay: 0.08,
          ease: 'power4.out',
          stagger: 0.028,
        })
        gsap.to(copy, { autoAlpha: 1, y: 0, duration: 0.9, delay: 0.18, ease: 'power3.out' })
        gsap.to(type, { autoAlpha: 1, duration: 0.85, delay: 0.12, ease: 'power3.out' })
      }

      const bootLive = document.querySelector('[data-vanta-boot]')
      const onBootOut = () => {
        playIntro()
        window.removeEventListener('vanta:boot-out', onBootOut)
      }
      const armIntro = () => {
        if (reduced || !bootLive) {
          // Un frame de diferencia: StrictMode monta/desmonta/remonta este
          // efecto en el mismo tick al arrancar. Si playIntro() corriera ya,
          // el montaje fantasma también crearía su SplitText antes de que
          // `cancelled` se ponga en true — doble split, doble flicker. Con
          // rAF, para cuando esto corre, el fantasma ya se limpió.
          requestAnimationFrame(() => !cancelled && playIntro())
        } else window.addEventListener('vanta:boot-out', onBootOut)
      }
      if (reduced || document.fonts.status === 'loaded') armIntro()
      else document.fonts.ready.then(() => !cancelled && armIntro())

      // Sin tilt loop: la respuesta al puntero la da la órbita de cámara en
      // HeroCanvas. Un rotate CSS acá encima sería doble parallax sobre la
      // misma imagen.

      const sizeCard = () => {
        const w = Math.min(window.innerWidth * 0.4, 400)
        const h = window.innerHeight * 0.7
        return { w, h, top: window.innerHeight * 0.15, left: window.innerWidth * 0.5 }
      }

      const placeFull = () => {
        gsap.set(card, {
          top: 0,
          left: 0,
          xPercent: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          borderRadius: 0,
        })
        gsap.set(shot, { borderRadius: 0 })
      }
      placeFull()
      gsap.set(tiltEl, { transformPerspective: 1400, transformOrigin: '50% 50%' })
      gsap.set(cardB, { autoAlpha: 0, x: 120, rotateY: -32 })
      gsap.set(tab, { autoAlpha: 0, x: 12 })
      gsap.set(paper, { autoAlpha: 0 })
      gsap.set(world, { autoAlpha: 0, y: 18 })

      if (reduced) {
        const { w, h, top, left } = sizeCard()
        gsap.set(card, {
          top,
          left,
          xPercent: -50,
          width: w,
          height: h,
          borderRadius: 28,
        })
        gsap.set(shot, { borderRadius: 28 })
        gsap.set([paper, world, tab, cardB], { autoAlpha: 1, x: 0, y: 0, rotateY: -18 })
        return () => {
          cancelled = true
          window.removeEventListener('vanta:boot-out', onBootOut)
        }
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=240%',
          pin: '[data-hero-pin]',
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      })

      tl.to(
        card,
        {
          top: () => sizeCard().top,
          left: () => sizeCard().left,
          xPercent: -50,
          width: () => sizeCard().w,
          height: () => sizeCard().h,
          borderRadius: 28,
          duration: 0.85,
          ease: 'none',
        },
        0,
      )
      tl.to(shot, { borderRadius: 28, duration: 0.85, ease: 'none' }, 0)
      tl.to(paper, { autoAlpha: 1, duration: 0.4, ease: 'none' }, 0.12)
      tl.to(words, { autoAlpha: 0, y: -30, stagger: 0.04, duration: 0.22, ease: 'none' }, 0.16)
      tl.to('[data-hero-hud]', { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0.12)
      tl.to(copy, { color: '#111114', duration: 0.2, ease: 'none' }, 0.22)
      tl.to(tab, { autoAlpha: 1, x: 0, duration: 0.18, ease: 'none' }, 0.38)
      tl.to(
        cardB,
        { autoAlpha: 1, x: () => Math.min(window.innerWidth * 0.22, 210), rotateY: -24, duration: 0.4, ease: 'none' },
        0.42,
      )
      tl.to(world, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'none' }, 0.5)

      const onResize = () => {
        if (tl.scrollTrigger && tl.scrollTrigger.progress < 0.08) placeFull()
      }
      window.addEventListener('resize', onResize)

      return () => {
        cancelled = true
        split?.revert()
        window.removeEventListener('vanta:boot-out', onBootOut)
        window.removeEventListener('resize', onResize)
      }
    },
    { scope: root },
  )

  return (
    <section id="project" ref={root} className="relative bg-[#0a0810] text-white">
      <div data-hero-pin className="relative h-svh overflow-hidden">
        <div data-hero-paper className="absolute inset-0 bg-[#f4f1ea]" />

        <p
          data-hero-world
          className="font-anton pointer-events-none absolute top-[22%] left-[6%] z-10 max-w-[12ch] text-[clamp(2.2rem,6vw,5.2rem)] leading-[0.88] tracking-[-0.03em] text-[#111114]/25 uppercase"
        >
          {worldLine}
        </p>

        <div
          data-hero-space
          className="absolute inset-0 z-20"
          style={{ perspective: '1400px' }}
        >
          <div data-hero-tilt className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
            <article
              data-hero-card-b
              className="absolute top-[18%] left-1/2 z-0 h-[64%] w-[min(38vw,360px)] overflow-hidden rounded-[1.6rem]"
              style={{ transformOrigin: '60% 50%' }}
            >
              <img src={img2} alt="" className="h-full w-full object-cover" />
            </article>

            <article
              data-hero-card
              className="absolute z-10 will-change-transform"
              style={{ transformOrigin: '50% 50%', overflow: 'visible' }}
            >
              {/* Tab de la carpeta: gradiente, no una copia del retrato. Antes
                  acá iba el mismo jpg al 400% — decodificaba 2 MB dos veces y
                  aparecía como retrato fantasma en DevTools. */}
              <span
                data-hero-tab
                aria-hidden="true"
                className="absolute top-1/2 left-0 z-10 h-24 w-7 -translate-x-[70%] -translate-y-1/2 overflow-hidden rounded-l-2xl bg-gradient-to-b from-[#2a1f3d] via-[#1a1424] to-[#2a1f3d]"
              />
              <div data-hero-shot className="relative h-full w-full overflow-hidden">
                <HeroCanvas img={img} focalY={0.34} />
              </div>
            </article>
          </div>
        </div>

        <p
          data-hero-copy
          className="pointer-events-none absolute top-16 left-4 z-30 max-w-[17rem] text-[11px] leading-relaxed md:top-20 md:left-8 md:text-[13px]"
        >
          {line}
        </p>

        {/* Las tres palabras van APILADAS, gigantes, alineadas a la izquierda,
            directo arriba del retrato — no una columna chica a un costado. Así
            está en la ref (beat-05): cada línea corre casi el ancho completo. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[8%] z-30 px-4 md:px-8" data-hero-type="">
          {[
            [tag1, word1],
            [tag2, word2],
            [tag3, word3],
          ].map(([tag, word]) => (
            <div key={tag} className="flex items-baseline gap-3">
              <span className="w-8 shrink-0 font-mono text-[9px] tracking-[0.22em] uppercase opacity-70 md:w-10">
                {tag}
              </span>
              <p
                data-hero-word
                className="font-anton text-[clamp(2.6rem,9.2vw,7.6rem)] leading-[0.86] tracking-[-0.035em] uppercase"
              >
                {word}
              </p>
            </div>
          ))}
        </div>

        <p className="pointer-events-none absolute right-6 bottom-6 z-30 font-mono text-[10px] tracking-[0.28em] uppercase opacity-70" data-hero-type="">
          {hint}
          <span aria-hidden="true" className="ml-2 inline-block">↓</span>
        </p>

        <div
          data-hero-type=""
          data-hero-hud=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[25] opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255 / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.35) 1px, transparent 1px)',
            backgroundSize: '12% 16%',
          }}
        />

        <div
          data-hero-type=""
          data-hero-hud=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 z-40 rounded-[1.25rem] border border-white/25 md:inset-4"
        />
        {/* data-hero-hud: se apaga con el resto del HUD al achicarse la card
            (mismo selector que anima la timeline de scrub más arriba). */}
        <span data-hero-hud>
          <VantaCrosshair />
        </span>
      </div>
    </section>
  )
}
