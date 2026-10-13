import { useEffect, useRef } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion, trackPointer } from '../../lib/motion'
import { C, BODY } from './brand'

/**
 * cāpsula33 — «La cápsula»: lo primero que se ve después de cruzar la puerta.
 *
 * Arranca en negro (es el cuarto oscuro al que entra el hero de C33) y se
 * arma por capas, cada una a su velocidad: el local desenfocado al fondo,
 * «A BORDO» en contorno naranja, la tripulante con su café al centro y,
 * adelante, las espirales de neón del salón y el vapor de la taza. El scroll
 * mueve las capas; el puntero las balancea apenas.
 */

const ARCHIVO = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '125%', fontVariationSettings: "'wdth' 125" }
const INK = '#111113'

function Spiral({ className, style }) {
  // Las lámparas del salón: un tubo blanco que da vueltas sobre sí mismo.
  const loops = 5
  let d = ''
  for (let i = 0; i <= 200; i += 1) {
    const t = i / 200
    const a = t * loops * Math.PI * 2
    const x = 20 + t * 360 + Math.cos(a) * 34
    const y = 60 + Math.sin(a) * 34
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `
  }
  return (
    <svg viewBox="0 0 400 120" className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <path d={d} fill="none" stroke="#fff6ec" strokeWidth="5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px rgba(255,220,180,0.8))' }} />
    </svg>
  )
}

export default function CapsulaScene() {
  const rootRef = useRef(null)
  const layersRef = useRef({})

  useGSAP(
    () => {
      const L = layersRef.current
      const calm = prefersReducedMotion()
      if (calm) {
        gsap.from([L.bg, L.word, L.girl, L.copy], { autoAlpha: 0, duration: 0.8, stagger: 0.1, scrollTrigger: { trigger: rootRef.current, start: 'top 60%' } })
        return undefined
      }
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
      })
      // Del negro: la luz del local se enciende de a poco.
      tl.fromTo(L.bg, { autoAlpha: 0, scale: 1.35, yPercent: 6 }, { autoAlpha: 0.55, scale: 1.15, yPercent: -6, duration: 1 }, 0)
      tl.fromTo(L.word, { autoAlpha: 0, xPercent: 18, yPercent: 10 }, { autoAlpha: 1, xPercent: -14, yPercent: -6, duration: 1 }, 0.05)
      tl.fromTo(L.girl, { yPercent: 38, scale: 1.12, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, 0.1)
      tl.to(L.girl, { yPercent: -6, duration: 0.35 }, 0.65)
      tl.fromTo(L.front, { yPercent: 55 }, { yPercent: -45, duration: 1 }, 0)
      tl.fromTo(L.steam, { xPercent: -50, yPercent: 20, autoAlpha: 0 }, { xPercent: -50, yPercent: -30, autoAlpha: 1, duration: 0.7 }, 0.25)
      tl.fromTo(L.copy, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.45)
      return () => tl.scrollTrigger?.kill()
    },
    { scope: rootRef },
  )

  // El puntero balancea las capas (más las de adelante).
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const pointer = trackPointer()
    const L = layersRef.current
    let raf = 0
    const s = { x: 0, y: 0 }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      s.x += (pointer.x - s.x) * 0.06
      s.y += (pointer.y - s.y) * 0.06
      if (L.bgWrap) L.bgWrap.style.transform = `translate3d(${s.x * -12}px, ${s.y * -8}px, 0)`
      if (L.wordWrap) L.wordWrap.style.transform = `translate3d(${s.x * -22}px, ${s.y * -12}px, 0)`
      if (L.girlWrap) L.girlWrap.style.transform = `translate3d(${s.x * 14}px, ${s.y * 8}px, 0)`
      if (L.frontWrap) L.frontWrap.style.transform = `translate3d(${s.x * 40}px, ${s.y * 24}px, 0)`
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      pointer.dispose()
    }
  }, [])

  const set = (k) => (el) => (layersRef.current[k] = el)

  return (
    <section ref={rootRef} id="capsula" data-kin-dark className="relative z-[46] h-[280svh]" style={{ background: INK, color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* 1. El local, desenfocado. */}
        <div ref={set('bgWrap')} className="absolute -inset-[4%]">
          <div ref={set('bg')} className="absolute inset-0 opacity-0">
            <img
              src="/studio/capsula33/interior-1344.webp"
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: 'blur(5px) saturate(1.1) brightness(0.75)' }}
            />
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 50% 60%, rgba(17,17,19,0.15), ${INK} 92%)` }} />

        {/* 2. «A BORDO» detrás de la tripulante. */}
        <div ref={set('wordWrap')} className="absolute inset-0 flex items-center justify-center">
          <p
            ref={set('word')}
            aria-hidden="true"
            className="text-[24vw] leading-none font-semibold whitespace-nowrap uppercase opacity-0 md:text-[19vw]"
            style={{ ...ARCHIVO, color: 'transparent', WebkitTextStroke: `2px ${C.orange}` }}
          >
            A bordo
          </p>
        </div>

        {/* 3. La tripulante con su café. */}
        <div ref={set('girlWrap')} className="absolute inset-x-0 bottom-0 flex justify-center">
          <img
            ref={set('girl')}
            src="/studio/capsula33/girl-1360.webp"
            srcSet="/studio/capsula33/girl-760.webp 760w, /studio/capsula33/girl-1360.webp 1360w"
            sizes="(max-width: 768px) 90vw, 60vh"
            alt="Una tripulante de la cápsula, con traje espacial naranja y pelo rosa, tomando café"
            className="h-[88svh] w-auto max-w-none origin-bottom object-contain opacity-0"
            style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))' }}
          />
        </div>

        {/* 4. Adelante: el vapor de la taza y las espirales del salón. */}
        <div ref={set('steam')} aria-hidden="true" className="pointer-events-none absolute top-[38%] left-1/2 h-[30svh] w-[22vw] -translate-x-1/2 opacity-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="c33-steam absolute bottom-0 left-1/2 block h-[60%] w-[40%] rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(255,245,235,0.32), transparent)', filter: 'blur(14px)', animationDelay: `${i * 1.3}s`, marginLeft: `${(i - 1) * 18}%` }}
            />
          ))}
        </div>
        <div ref={set('frontWrap')} className="pointer-events-none absolute inset-0">
          <div ref={set('front')} className="absolute inset-0">
            <Spiral className="absolute top-[12%] -left-[6%] w-[38vw] rotate-[-8deg] opacity-90" />
            <Spiral className="absolute top-[64%] -right-[8%] w-[44vw] rotate-[6deg] opacity-80" style={{ filter: 'blur(2px)' }} />
          </div>
        </div>

        {/* El texto. */}
        <div ref={set('copy')} className="absolute bottom-[6svh] left-[4.5vw] max-w-[30rem] opacity-0 md:left-[3vw]">
          <p className="text-[11px] tracking-[0.2em] uppercase" style={{ fontFamily: "'Roboto Mono', monospace", color: C.neon }}>
            La cápsula
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.6rem)] leading-[0.95] font-semibold uppercase" style={ARCHIVO}>
            Un lugar para reunirnos
          </h2>
          <p className="mt-4 max-w-[34ch] text-[15px] leading-[1.55]" style={{ ...BODY, color: 'rgba(239,230,216,0.8)' }}>
            Café de especialidad, cocina de estación y la colección del dueño en vitrinas. A cuadras del lago Lácar.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes c33-steam { 0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(-50%, -120%) scale(1.4); opacity: 0; } }
        .c33-steam { animation: c33-steam 3.9s ease-out infinite; }
      `}</style>
    </section>
  )
}
