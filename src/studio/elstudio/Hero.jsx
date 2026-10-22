import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { C, DISPLAY } from './brand'
import { PLAN_AREA, ROOMS } from './planData'
import { setPlanProbe } from './planProbe'
import { createPlanScene } from './planScene'

/**
 * El hero: del plano a la maqueta.
 *
 * Cuando termina el loader, la planta de un departamento se dibuja sola en tinta sobre la hoja
 * (contornos, ventanas, puertas con su arco) y los muros cortados se rellenan, como la S del logo.
 * Los ambientes aparecen con su nombre y su superficie. Al scrollear, el hero queda fijo, los
 * muros suben desde el plano y la cámara gira de la planta a una vista 3/4: la maqueta en papel
 * blanco, con sus sombras sobre la hoja. La mira del cursor lee metros del plano.
 *
 * Con «reducir movimiento»: la maqueta terminada, quieta, en una pantalla (sin fijar el scroll).
 */
const DRAW_SECONDS = 2.8

export default function Hero({ boarded, calm }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const labelRefs = useRef([])
  const hintRef = useRef(null)
  const sceneRef = useRef(null)

  // La escena: se arma una vez y dibuja solo cuando algo cambió.
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    const phone = window.matchMedia('(max-width: 767px)').matches
    const scene = createPlanScene({ canvas, phone })
    sceneRef.current = scene
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2)
    scene.setPixelRatio(dpr)
    const budget = createFrameBudget({ dpr, apply: (v) => scene.setPixelRatio(v) })

    const resize = () => scene.resize(stage.clientWidth, stage.clientHeight)
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(stage)

    // El scroll del hero (0→1 mientras está fijo), suavizado en cada cuadro.
    let target = calm ? 1 : 0
    let current = target
    const trigger = calm
      ? null
      : ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            target = self.progress
          },
        })

    const paintLabels = () => {
      scene.labels.forEach((l, i) => {
        const el = labelRefs.current[i]
        if (!el) return
        el.style.transform = `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -50%)`
        el.style.opacity = String(l.alpha)
      })
      if (hintRef.current) hintRef.current.style.opacity = String(1 - Math.min(1, current / 0.06))
    }

    const tick = (_time, deltaMs) => {
      current += (target - current) * (1 - Math.exp(-deltaMs / 110))
      if (Math.abs(target - current) < 1e-4) current = target
      scene.setProgress(current)
      if (scene.render()) {
        paintLabels()
        budget.tick(deltaMs)
      }
    }
    gsap.ticker.add(tick)

    // La mira del cursor pregunta acá en qué punto del plano está.
    setPlanProbe((x, y) => {
      const r = canvas.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null
      return scene.probe(x - r.left, y - r.top)
    })

    return () => {
      gsap.ticker.remove(tick)
      trigger?.kill()
      ro.disconnect()
      setPlanProbe(null)
      scene.dispose()
      sceneRef.current = null
    }
  }, [calm])

  // El plano se dibuja cuando termina el loader (antes, la hoja está en blanco).
  useEffect(() => {
    const scene = sceneRef.current
    if (!boarded || !scene) return undefined
    if (calm) {
      scene.setDraw(1)
      return undefined
    }
    const pen = { v: 0 }
    const tween = gsap.to(pen, { v: 1, duration: DRAW_SECONDS, ease: 'power1.inOut', onUpdate: () => scene.setDraw(pen.v) })
    return () => tween.kill()
  }, [boarded, calm])

  return (
    <section ref={sectionRef} id="inicio" aria-label="Inicio" className="relative h-[340vh] calm:h-svh">
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label={`Planta de un departamento de ${PLAN_AREA} m² que se convierte en una maqueta`}
        />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={DISPLAY}>
          {ROOMS.map((r, i) => (
            <span
              key={r.name}
              ref={(el) => {
                labelRefs.current[i] = el
              }}
              className="absolute top-0 left-0 flex flex-col items-center gap-0.5 text-center whitespace-nowrap opacity-0"
              style={{ color: C.ink }}
            >
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase sm:text-[11px]">{r.name}</span>
              <span className="text-[10px] tabular-nums sm:text-[11px]" style={{ color: C.mute, fontFamily: "'DM Mono', ui-monospace, monospace" }}>
                {r.area.toLocaleString('es-AR')} m²
              </span>
            </span>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-6 text-[11px] font-medium tracking-[0.16em] uppercase sm:px-9 sm:pb-8"
          style={{ ...DISPLAY, color: C.mute }}
        >
          <span>Planta tipo · {PLAN_AREA} m²</span>
          <span ref={hintRef} className="flex items-center gap-3 calm:hidden">
            <span className="block h-px w-10" style={{ background: C.ink }} />
            Scroll
          </span>
        </div>
      </div>
    </section>
  )
}
