import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { createFrameBudget } from '../../lib/motion'
import { setPlanProbe } from './planProbe'
import { createLocalScene, FRAME_ASPECT } from './localScene'
import { BAND_H, NAV_H } from './brand'

/**
 * El hero: del boceto al local decorado.
 *
 * Cuando termina el loader, un local (café / showroom) se dibuja a lápiz y carbonilla desde el
 * centro hacia afuera: contornos en grafito, rayado en las sombras. Mientras termina, el marco se
 * abre (Nav). Al scrollear el hero queda fijo y el boceto se vuelve la maqueta 3D (es la misma
 * escena, así que cada trazo cae sobre su objeto); después el local se decora pieza por pieza:
 * piso, muros, barra, estantes, lámparas que se encienden, y entran los objetos. Al final la
 * cámara se acerca un poco.
 *
 * Con «reducir movimiento»: el local decorado, quieto, en una pantalla.
 */
const REVEAL_SECONDS = 3.2

/** El cuadro del local dentro del escenario: 16:9 entero, entre el nav y la franja de abajo. */
function frameRect(w, h) {
  const desk = w >= 640
  const top = (desk ? NAV_H.desk : NAV_H.phone) + (desk ? 24 : 16)
  const bottom = (desk ? BAND_H.desk : BAND_H.phone) + (desk ? 12 : 16)
  // En el teléfono el cuadro se pasa un poco del ancho: el local tiene aire propio a los costados,
  // así se ve más grande en una pantalla angosta.
  const side = desk ? 40 : -Math.round(w * 0.17)
  const aw = w - side * 2
  const ah = h - top - bottom
  const fw = Math.min(aw, ah * FRAME_ASPECT)
  const fh = fw / FRAME_ASPECT
  return { x: (w - fw) / 2, y: top + (ah - fh) / 2, w: fw, h: fh }
}

export default function Hero({ boarded, calm }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    const phone = window.matchMedia('(max-width: 767px)').matches
    const scene = createLocalScene({ canvas, phone })
    sceneRef.current = scene
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2)
    scene.setPixelRatio(dpr)
    const budget = createFrameBudget({ dpr, apply: (v) => scene.setPixelRatio(v) })
    const resize = () => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      scene.resize(w, h)
      const f = frameRect(w, h)
      scene.setFrame(f.x, f.y, f.w, f.h)
    }
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
    const apply = (p) => {
      // Boceto → maqueta → decorado → la cámara se acerca.
      scene.setSketch(1 - Math.min(1, Math.max(0, (p - 0.03) / 0.22)))
      scene.setDecor(Math.min(1, Math.max(0, (p - 0.22) / 0.56)))
      scene.setCamera(Math.min(1, Math.max(0, (p - 0.78) / 0.22)))
    }
    apply(current)
    if (calm) scene.setReveal(1)
    const tick = (_t, deltaMs) => {
      current += (target - current) * (1 - Math.exp(-deltaMs / 110))
      if (Math.abs(target - current) < 1e-4) current = target
      apply(current)
      if (scene.render()) budget.tick(deltaMs)
    }
    gsap.ticker.add(tick)
    // La mira del cursor pregunta acá en qué punto del local está (en metros).
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

  // El boceto se pinta cuando termina el loader (antes, la hoja está en blanco).
  useEffect(() => {
    const scene = sceneRef.current
    if (!boarded || !scene || calm) return undefined
    const pen = { v: 0 }
    const tween = gsap.to(pen, { v: 1, duration: REVEAL_SECONDS, ease: 'power1.inOut', onUpdate: () => scene.setReveal(pen.v) })
    return () => tween.kill()
  }, [boarded, calm])

  return (
    <section ref={sectionRef} id="inicio" aria-label="Inicio" className="relative h-[420vh] calm:h-svh">
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          role="img"
          aria-label="Boceto a lápiz de un local que se convierte en una maqueta 3D y se va decorando"
        />
      </div>
    </section>
  )
}
