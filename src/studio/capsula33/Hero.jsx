import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../hooks/useLenis'
import { createDioramaScene } from './dioramaScene'
import { MANIFEST, STATIONS } from './stations'
import { tour } from './tour'
import { cursor } from './cursorBus'
import { sfx } from './sfx'
import { C, DISPLAY, MONO, BODY, HOURS, openStatus } from './brand'

/**
 * cāpsula33 — Hero: el local en miniatura, flotando en el espacio.
 *
 * Vista general: se arrastra para girarlo y cada zona se elige con el puntero.
 * El scroll es el recorrido: la cámara entra a cada estación (PAGE 001–005) y
 * un panel cuenta lo que hay ahí. Tocar una zona, el menú o la barra de scroll
 * llevan a la misma página: el scroll hace el viaje.
 */

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

const DAY = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }
const N = STATIONS.length

export default function Hero({ boarded, onProgress, onReady, calm }) {
  const rootRef = useRef(null)
  const mountRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const overviewRef = useRef(null)
  const [page, setPage] = useState(0)
  const [failed, setFailed] = useState(false)
  const [status] = useState(() => openStatus())

  useEffect(() => tour.onPage(setPage), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const mount = mountRef.current
    if (!canvas || !mount) return undefined
    let scene = null
    let disposed = false
    Promise.race([document.fonts.load(`600 32px 'Chakra Petch'`), new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (disposed) return
      try {
        scene = createDioramaScene({
          canvas,
          mount,
          manifest: MANIFEST,
          stations: STATIONS,
          prices: PRICES,
          calm,
          onProgress,
          onHover: (station) => {
            cursor.set(station ? 'lock' : 'idle', station ? station.label : '')
            if (station) sfx.lock()
          },
          onDrag: (on) => {
            cursor.set(on ? 'drag' : 'idle')
            if (on) sfx.grab()
          },
          onPick: (index) => {
            sfx.select()
            tour.goTo(index)
          },
        })
        sceneRef.current = scene
        scene.load.then(() => !disposed && onReady()).catch((err) => {
          console.error('[capsula33] el local no cargó', err)
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

  // El local llega (la cámara baja sobre él) cuando la sección entra en pantalla.
  useEffect(() => {
    if (!boarded) return undefined
    const st = ScrollTrigger.create({
      trigger: rootRef.current,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        sceneRef.current?.intro()
        gsap.fromTo(
          rootRef.current.querySelectorAll('[data-c33-in]'),
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: calm ? 0 : 1.2 },
        )
      },
    })
    return () => st.kill()
  }, [boarded, calm])

  // El recorrido: el hero queda fijo y el scroll mueve la cámara.
  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: calm ? true : 0.6,
        onUpdate: (self) => {
          const p = self.progress
          sceneRef.current?.setProgress(p)
          // En una estación (cerca de un entero), viajando entre dos o saliendo (−1).
          const T = p * (N + 1)
          const near = Math.round(T)
          const next = Math.abs(T - near) < 0.2 && near <= N ? near : -1
          if (next !== tour.page) {
            if (next > 0) sfx.page()
            tour.setPage(next)
          }
          gsap.set(overviewRef.current, { autoAlpha: Math.max(0, 1 - p * (N + 1) * 4) })
        },
      })
      tour.register((i, { immediate = false } = {}) => {
        const top = st.start
        const y = top + ((st.end - st.start) * i) / (N + 1)
        const lenis = getLenis()
        if (lenis) lenis.scrollTo(y, { immediate, duration: immediate ? 0 : 1.6 + Math.abs(i - Math.max(0, tour.page)) * 0.35, force: true })
        else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
      })
      return () => st.kill()
    },
    { scope: rootRef },
  )

  const station = page > 0 ? STATIONS[page - 1] : null

  return (
    <section ref={rootRef} id="local" className="relative" style={{ height: `${(N + 2) * 100}svh`, background: '#050506', color: C.cream }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={mountRef} className="absolute inset-0">
          <canvas
            ref={canvasRef}
            aria-label="El local de cāpsula33 en miniatura: arrastralo para girarlo y tocá una zona para entrar"
            className={`absolute inset-0 h-full w-full touch-pan-y ${failed ? 'invisible' : ''}`}
          />
        </div>

        {/* HUD: esquinas. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 md:inset-6">
          {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
            <span key={c} className={`absolute h-4 w-4 ${c}`} style={{ borderColor: 'rgba(228,96,29,0.7)' }} />
          ))}
        </div>

        {/* Sombra en la esquina del texto, para leerlo sobre el local. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 0% 100%, rgba(5,5,6,0.88), rgba(5,5,6,0) 70%)' }}
        />

        {/* Vista general: la frase de la pared del local. */}
        <div ref={overviewRef} className="pointer-events-none absolute inset-x-0 bottom-0 grid items-end gap-6 px-6 pb-8 md:grid-cols-12 md:px-12 md:pb-12">
          <div className="md:col-span-5">
            <p data-c33-in className="text-[11px] tracking-[0.2em] uppercase opacity-0" style={{ ...MONO, color: C.neon }}>
              El local · en miniatura
            </p>
            <h2 data-c33-in className="mt-4 max-w-[19ch] text-[clamp(1.5rem,2.6vw,2.35rem)] leading-[1.12] font-semibold opacity-0" style={DISPLAY}>
              Así es la cápsula por dentro.
            </h2>
            <p data-c33-in className="mt-3 text-[12px] tracking-[0.14em] uppercase opacity-0" style={{ ...DISPLAY, color: 'rgba(242,233,220,0.55)' }}>
              Av. Gral. Roca 1120
            </p>
            <div data-c33-in className="pointer-events-auto mt-6 flex items-center gap-4 opacity-0">
              <button
                type="button"
                onClick={() => {
                  sfx.select()
                  tour.goTo(1)
                }}
                onMouseEnter={() => sfx.buttonHover()}
                className="group relative h-11 overflow-hidden rounded-full px-6 text-[12px] font-semibold tracking-[0.18em] whitespace-nowrap uppercase active:scale-[0.97]"
                style={{ ...DISPLAY, background: C.orange, color: '#070708' }}
              >
                Iniciar recorrido
              </button>
              <span className="text-[11px] tracking-[0.16em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
                {String(N).padStart(2, '0')} estaciones
              </span>
            </div>
          </div>
          <div data-c33-in className="pointer-events-auto flex flex-col items-start gap-3 opacity-0 md:col-span-4 md:col-start-9 md:items-end">
            <ZoomControls sceneRef={sceneRef} />
            <span className="hidden text-right text-[11px] tracking-[0.16em] uppercase md:block" style={{ ...MONO, color: C.neon }}>
              Arrastrá para girar · pellizcá o Ctrl + rueda para acercar
            </span>
          </div>
        </div>

        {/* El panel de cada estación. */}
        <StationPanel station={station} status={status} />

        {failed ? (
          <p className="absolute inset-x-6 top-1/3 text-center text-[clamp(1.6rem,4vw,2.6rem)] font-semibold" style={DISPLAY}>
            Así es la cápsula por dentro.
          </p>
        ) : null}
      </div>

      {/* Las páginas, para quien no ve el 3D. */}
      <ol className="sr-only">
        {STATIONS.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => tour.goTo(i + 1)}>
              {s.page} {s.label}: {s.text}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function StationPanel({ station, status }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(station)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (station) {
      setShown(station)
      sfx.panel()
      gsap.fromTo(el, { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'expo.out' })
    } else {
      gsap.to(el, { autoAlpha: 0, x: 16, duration: 0.35, ease: 'power2.out' })
    }
  }, [station])

  const s = shown
  return (
    <aside
      ref={ref}
      aria-live="polite"
      className="invisible absolute right-4 bottom-6 left-4 border p-6 opacity-0 md:top-1/2 md:right-12 md:bottom-auto md:left-auto md:w-[24rem] md:-translate-y-1/2 md:p-7"
      style={{ background: 'rgba(5,5,6,0.78)', borderColor: 'rgba(228,96,29,0.45)', backdropFilter: 'blur(10px)', clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)' }}
    >
      {s ? (
        <>
          <p className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase" style={{ ...MONO, color: C.neon }}>
            <span>{s.kicker}</span>
          </p>
          <h2 className="mt-4 text-[clamp(1.8rem,3vw,2.6rem)] leading-[0.95] font-bold tracking-[-0.02em] uppercase" style={DISPLAY}>
            {s.label}
          </h2>
          <p className="mt-4 text-[15px] leading-[1.55]" style={{ ...BODY, color: 'rgba(242,233,220,0.82)' }}>
            {s.text}
          </p>
          {s.list ? (
            <ul className="mt-5 grid gap-1.5 border-t pt-4 text-[13px] tracking-[0.06em] uppercase" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.12)' }}>
              {s.list.map((it, i) => (
                <li key={it} className="flex gap-3">
                  <span style={{ color: C.neon }}>{String(i + 1).padStart(2, '0')}</span>
                  {it}
                </li>
              ))}
            </ul>
          ) : null}
          {s.hours ? (
            <div className="mt-5 border-t pt-4 text-[12px] tracking-[0.08em] uppercase" style={{ ...MONO, borderColor: 'rgba(242,233,220,0.12)' }}>
              <p className="mb-2 flex items-center gap-2" style={{ color: status.open ? '#7dffa8' : C.neon }}>
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
                {status.label}
              </p>
              <p className="opacity-70">
                {HOURS.map((h) => `${DAY[h.day]} ${h.open}–${h.close}`).join(' · ')} · Dom cerrado
              </p>
            </div>
          ) : null}
          {s.link ? (
            <a
              href={s.link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sfx.select()}
              onMouseEnter={() => sfx.buttonHover()}
              className="mt-6 inline-flex h-11 items-center gap-3 rounded-full px-6 text-[12px] font-semibold tracking-[0.18em] uppercase active:scale-[0.97]"
              style={{ ...DISPLAY, background: C.orange, color: '#070708' }}
            >
              {s.link.label}
            </a>
          ) : null}
        </>
      ) : null}
    </aside>
  )
}

/** Acercar, alejar y volver al encuadre (en la vista general). */
function ZoomControls({ sceneRef }) {
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full border text-[16px] transition-colors duration-300 hover:border-[#e4601d] active:scale-[0.94]'
  const style = { ...MONO, borderColor: 'rgba(242,233,220,0.25)', background: 'rgba(5,5,6,0.55)', color: C.cream }
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Zoom del local">
      <button
        type="button"
        aria-label="Alejar"
        className={btn}
        style={style}
        onMouseEnter={() => sfx.railHover()}
        onClick={() => {
          sfx.zoom(false)
          sceneRef.current?.zoomBy(1.25)
        }}
      >
        −
      </button>
      <button
        type="button"
        aria-label="Volver al encuadre"
        className={btn}
        style={style}
        onMouseEnter={() => sfx.railHover()}
        onClick={() => {
          sfx.select()
          sceneRef.current?.resetView()
        }}
      >
        ⟲
      </button>
      <button
        type="button"
        aria-label="Acercar"
        className={btn}
        style={style}
        onMouseEnter={() => sfx.railHover()}
        onClick={() => {
          sfx.zoom(true)
          sceneRef.current?.zoomBy(0.8)
        }}
      >
        +
      </button>
    </div>
  )
}
