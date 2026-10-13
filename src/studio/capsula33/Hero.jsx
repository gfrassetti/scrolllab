import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { createDioramaScene } from './dioramaScene'
import { C, DISPLAY, MONO, BODY } from './brand'

/**
 * cāpsula33 — Hero.
 *
 * El local en miniatura, flotando, con la luz de Cycles horneada. Detrás, el
 * titular enorme (el diorama lo tapa en parte). Cada zona del local es una
 * puerta: al pasar el puntero se nombra, al tocarla la cámara entra ahí y la
 * página aterriza en esa sección; el scroll lleva a los mismos lugares.
 *
 * Coordenadas de Blender (x hacia el fondo, y hacia la pared de la barra, z arriba).
 */

const MANIFEST = {
  model: 'room.glb',
  atlases: { shell: 'bake-shell.webp', props: 'bake-props.webp' },
  target: [-1, 0, 1.2], // el centro del local
  // Pantalla ancha: isométrica desde la esquina de la entrada. La cámara mira
  // por encima del local, que así baja en la pantalla y deja aire al titular.
  viewDir: [-1, -1, 1],
  lookLift: 1.2,
  radius: 8.2,
  distance: 46,
  headlineLift: 4.6,
  // Teléfono en vertical: mirando el local a lo largo desde la puerta.
  tall: { viewDir: [-1.55, -0.5, 1.35], lookLift: 1.6, radius: 5.4, distance: 34, headlineLift: 7.2 },
}

// El plano del local: entrando, a la izquierda la pared de figuras y la barra
// (punta redonda hacia la puerta); a la derecha el jardín en su caja blanca y
// después el salón; al fondo la pared naranja con arcos.
const ZONES = [
  { id: 'menu', label: 'La barra', note: 'El menú', min: [-1.0, 0.15, 0], max: [3.2, 3, 3.1] },
  { id: 'coleccion', label: 'Las vitrinas', note: 'La colección', min: [-8, 2.2, 0], max: [-2.05, 3, 3] },
  { id: 'experiencia', label: 'El salón', note: 'La cápsula', min: [-4.3, -3, 0], max: [6, 0.4, 2.9] },
  { id: 'jardin', label: 'El pulmón', note: 'El jardín', min: [-8, -3, 0], max: [-4.4, -1, 3.2] },
  { id: 'mapa', label: 'La entrada', note: 'Cómo llegar', min: [-8.5, -0.9, 0], max: [-7.4, 2.2, 2.6] },
]

const PRICES = [
  ['ESPRESSO', '3200'],
  ['FLAT WHITE', '4500'],
  ['CAPUCCINO', '4800'],
  ['LATTE', '4800'],
  ['CHOCOLATE', '5200'],
  ['TÉ EN HEBRAS', '3600'],
  ['MEDIALUNA', '1400'],
  ['TOSTÓN', '9800'],
]

export default function Hero({ boarded, onProgress, onReady, calm }) {
  const rootRef = useRef(null)
  const mountRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const veilRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const mount = mountRef.current
    if (!canvas || !mount) return undefined
    let scene = null
    let disposed = false
    const fontsReady = Promise.race([
      Promise.all([document.fonts.load(`700 64px 'Chakra Petch'`), document.fonts.load(`500 32px 'Roboto Mono'`)]),
      new Promise((r) => setTimeout(r, 2000)),
    ])
    fontsReady.then(() => {
      if (disposed) return
      try {
        scene = createDioramaScene({
          canvas,
          mount,
          manifest: MANIFEST,
          zones: ZONES,
          prices: PRICES,
          calm,
          fonts: { display: `'Chakra Petch', sans-serif` },
          headline: [
            ['CAFÉ, CINE', C.cream],
            ['Y ALGO MÁS.', C.orange],
          ],
          onProgress,
          onHover: (zone, screen) => setHover(zone ? { zone, screen } : null),
        })
        sceneRef.current = scene
        scene.load.then(() => !disposed && onReady()).catch((err) => {
          console.error('[capsula33] el diorama no cargó', err)
          setFailed(true)
          onReady()
        })
      } catch (err) {
        console.error('[capsula33] sin WebGL', err)
        setFailed(true)
        onReady()
      }
    })
    return () => {
      disposed = true
      scene?.dispose()
      sceneRef.current = null
    }
    // La escena se arma una vez; los callbacks son estables en la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al abordar: la cámara baja sobre el local y entra el texto.
  useEffect(() => {
    if (!boarded) return
    sceneRef.current?.intro()
    gsap.fromTo('[data-c33-in]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: calm ? 0 : 1.2 })
  }, [boarded, calm])

  // Al salir del hero el local sube y se aleja (scrub).
  useGSAP(
    () => {
      if (calm) return undefined
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => sceneRef.current?.setProgress(self.progress),
      })
      return () => st.kill()
    },
    { scope: rootRef },
  )

  // Tocar una zona: la cámara entra, el velo se cierra y la página ya está en
  // esa sección cuando se vuelve a abrir.
  const go = (id) => {
    const target = document.getElementById(id)
    const scene = sceneRef.current
    if (!target) return
    const land = () => {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true })
      else target.scrollIntoView()
      scene?.reset()
      gsap.to(veilRef.current, { autoAlpha: 0, duration: 0.7, ease: 'power2.out', delay: 0.05 })
    }
    if (!scene || calm) {
      land()
      return
    }
    gsap.fromTo(veilRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, delay: 1.0, ease: 'power2.inOut' })
    scene.dive(id, () => window.setTimeout(land, 150))
  }

  const onClick = (e) => {
    const zone = sceneRef.current?.pick(e)
    if (zone) go(zone.id === 'jardin' ? 'experiencia' : zone.id)
  }

  return (
    <section ref={rootRef} id="top" className="relative h-svh min-h-[36rem] overflow-hidden" style={{ background: C.void, color: C.cream }}>
      <div ref={mountRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          onClick={onClick}
          aria-label="El local de cāpsula33 en miniatura: tocá una zona para entrar"
          className={`absolute inset-0 h-full w-full touch-pan-y ${failed ? 'invisible' : ''}`}
        />
      </div>

      <h1 className="sr-only">cāpsula33 — café, cine y algo más. San Martín de los Andes.</h1>

      {failed ? (
        <p className="absolute inset-x-6 top-1/3 text-center text-[clamp(2.6rem,8vw,6rem)] leading-[0.9] font-semibold uppercase" style={DISPLAY}>
          Café, cine <span style={{ color: C.orange }}>y algo más.</span>
        </p>
      ) : null}

      {/* Para que el texto de abajo se lea sobre el local. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] md:h-[30%]"
        style={{ background: `linear-gradient(to top, ${C.void} 18%, rgba(7,7,8,0.75) 55%, transparent)` }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid items-end gap-6 px-6 pb-7 md:grid-cols-12 md:px-10 md:pb-9">
        <div className="md:col-span-6">
          <p data-c33-in className="max-w-[36ch] text-[14px] leading-[1.5] opacity-0 md:text-[15px]" style={{ ...BODY, color: 'rgba(242,233,220,0.8)' }}>
            Una cápsula para reunirnos, a cuadras del lago Lácar. Café de especialidad, cocina de estación y la colección del dueño en vitrinas.
          </p>
          <div data-c33-in className="pointer-events-auto mt-4 flex gap-3 opacity-0 md:mt-5">
            <button
              type="button"
              onClick={() => go('experiencia')}
              className="group relative h-11 overflow-hidden rounded-full px-5 text-[12px] whitespace-nowrap md:px-6 font-semibold tracking-[0.18em] uppercase active:scale-[0.97]"
              style={{ ...DISPLAY, background: C.orange, color: C.void }}
            >
              Conocé el local
            </button>
            <button
              type="button"
              onClick={() => go('menu')}
              className="relative h-11 rounded-full border px-5 text-[12px] whitespace-nowrap md:px-6 font-semibold tracking-[0.18em] uppercase transition-colors duration-300 hover:border-[#e4601d] active:scale-[0.97]"
              style={{ ...DISPLAY, borderColor: 'rgba(242,233,220,0.3)' }}
            >
              Ver el menú
            </button>
          </div>
        </div>
        <div data-c33-in className="flex flex-col items-start gap-2 text-[11px] tracking-[0.16em] uppercase opacity-0 md:col-span-4 md:col-start-9 md:items-end md:text-right" style={DISPLAY}>
          <span className="flex items-center gap-3" style={{ color: C.orange }}>
            <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: C.orange }} />
            Tocá una zona del local
          </span>
          <span className="hidden opacity-55 md:inline">C33.02 · Av. Gral. Roca 1120 · 40°09′S 71°21′O</span>
        </div>
      </div>

      {hover?.screen ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-[calc(100%+1.25rem)] rounded-full border px-5 py-2 text-center"
          style={{ left: hover.screen.x, top: hover.screen.y, background: 'rgba(7,7,8,0.88)', borderColor: C.orange }}
        >
          <p className="text-[16px] font-semibold tracking-[0.06em] uppercase" style={{ ...DISPLAY, color: C.cream }}>
            {hover.zone.label}
          </p>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ ...MONO, color: C.neon }}>
            {hover.zone.note} →
          </p>
        </div>
      ) : null}

      <ul className="sr-only">
        {ZONES.map((z) => (
          <li key={z.id}>
            <a href={`#${z.id === 'jardin' ? 'experiencia' : z.id}`}>
              {z.label}: {z.note}
            </a>
          </li>
        ))}
      </ul>

      <div ref={veilRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 opacity-0" style={{ background: C.void, visibility: 'hidden' }} />
    </section>
  )
}
