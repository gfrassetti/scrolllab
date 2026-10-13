import { useCallback, useEffect, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { prefersReducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import Hero from './Hero'
import Loader from './Loader'
import Header from './Header'
import Cursor from './Cursor'
import ScrollRail from './ScrollRail'
import Visit from './Visit'
import { BODY, C, FONTS_HREF } from './brand'

/*
THESIS: el sitio es un viaje a bordo del local — se aborda (loader con salto
  al hiperespacio), se ve la nave entera (el diorama flotando en el espacio) y
  se recorre estación por estación; rechaza el "hero foto + menú en PDF" de
  toda cafetería.
OWN-WORLD: negro espacio con estrellas, naranja de fachada, neón naranja; mono
  liviana minúscula (logo) + cuadrada técnica (sus impresos) + Barlow; el local
  en miniatura con la luz de Cycles horneada; HUD (mira, PAGE 00N, riel).
  Sin fotos: todo es el modelo.
STORY: el visitante aborda, ve el local, lo gira, y el scroll lo lleva por la
  entrada, el pulmón, las vitrinas, la barra y el salón; sale sabiendo dónde
  queda y si está abierto.
FIRST VIEWPORT: el local flotando sobre su anillo, la frase de la pared abajo a
  la izquierda (chica), «Iniciar recorrido».
FORM: brief fijado por el dueño (diorama del local real, loader espacial, menú
  estilo kprverse con sonido, cursor y scroll propios), sin tirada.
*/

/**
 * cāpsula33 — demo privado del Estudio (sitio a medida para el café de San
 * Martín de los Andes). Solo en local: la ruta no existe en producción y el
 * modelo no viaja al repo (public/studio está en .gitignore).
 */
export default function Capsula33Page() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'cāpsula33 · San Martín de los Andes'
    return () => {
      link.remove()
      document.title = prevTitle
    }
  }, [])

  const [calm] = useState(() => prefersReducedMotion())
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [boarded, setBoarded] = useState(false)
  const onProgress = useCallback((p) => setProgress(p), [])
  const onReady = useCallback(() => setReady(true), [])

  // Hasta abordar la página no se mueve (el loader la tapa entera).
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) lenis?.start()
    else lenis?.stop()
  }, [boarded])

  return (
    <SmoothScrollProvider>
      <div className="min-h-svh" style={{ background: '#050506', color: C.cream, ...BODY }}>
        <Loader progress={progress} ready={ready} calm={calm} onBoard={() => setBoarded(true)} />
        <Header visible={boarded} />
        <Hero boarded={boarded} calm={calm} onProgress={onProgress} onReady={onReady} />
        <Visit />
        <ScrollRail visible={boarded} />
        <Cursor />
      </div>
    </SmoothScrollProvider>
  )
}
