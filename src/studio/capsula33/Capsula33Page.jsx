import { useCallback, useEffect, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { prefersReducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import Loader from './Loader'
import C33Hero from './C33Hero'
import CapsulaScene from './CapsulaScene'
import Hero from './Hero'
import Visit from './Visit'
import ScrollRail from './ScrollRail'
import { BODY, C, FONTS_HREF } from './brand'

/*
THESIS: el sitio cuenta la llegada a la cápsula — se aborda (loader con salto
  al hiperespacio), aparece «C33» armado con barras, se desarma en la puerta
  de la cápsula, se entra y adentro está la tripulante con su café; después,
  el local en miniatura y cómo llegar.
OWN-WORLD: papel crema, tinta negra y naranja de fachada; Archivo ancha (el
  C33 y los títulos) + mono técnica + Barlow; la tripulante cyberpunk de su
  tarjeta (generada, original), las espirales de neón del salón.
STORY: C33 → puerta → «A bordo» (capas en parallax) → el local (diorama) →
  te esperamos (dirección, horarios).
FIRST VIEWPORT: «C33» gigante, la barra de navegación con borde, el titular
  con la frase de la pared y «Scroll para entrar».
FORM: brief fijado por el dueño (hero estilo KIN con C33, la chica en
  parallax, el local abajo), sin tirada.
*/

/**
 * cāpsula33 — demo privado del Estudio (sitio a medida para el café de San
 * Martín de los Andes). Solo en local: la ruta no existe en producción y el
 * modelo y las imágenes no viajan al repo (public/studio está en .gitignore).
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
      <div className="min-h-svh" style={{ background: '#111113', color: C.cream, ...BODY }}>
        <Loader progress={progress} ready={ready} calm={calm} onBoard={() => setBoarded(true)} />
        {/* El hero de C33 arma su palabra al montarse: entra después del salto. */}
        {boarded ? <C33Hero /> : <div className="h-svh" />}
        {/* El tramo en papel donde C33 se desarma y arma la puerta de la cápsula. */}
        <div aria-hidden="true" className="h-[210svh]" style={{ background: '#efe6d8' }} />
        <CapsulaScene />
        <Hero boarded={boarded} calm={calm} onProgress={onProgress} onReady={onReady} />
        <Visit />
        <ScrollRail visible={boarded} />
      </div>
    </SmoothScrollProvider>
  )
}
