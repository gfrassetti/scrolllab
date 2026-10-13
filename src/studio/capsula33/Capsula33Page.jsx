import { useCallback, useEffect, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { prefersReducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import Loader from './Loader'
import FacadeHero from './FacadeHero'
import ScrollRail from './ScrollRail'
import { BODY, C, FONTS_HREF } from './brand'

/*
THESIS: el sitio es llegar a la cápsula y entrar — se aborda (loader con salto
  al hiperespacio), aparece la fachada naranja en la calle de noche con la
  cordillera atrás, las puertas se abren con el scroll y se entra al café.
OWN-WORLD: la cápsula naranja de su fachada, la noche patagónica, el neón
  naranja de adentro; mono liviana minúscula (logo) + cuadrada técnica.
STORY: fachada → las puertas se abren → acercarse → adentro.
FIRST VIEWPORT: la cápsula en la calle, entre sus plantas, con el cartel; el
  titular abajo a la izquierda y «Scroll para entrar».
FORM: brief fijado por el dueño (hero multicapa con imágenes, puertas que se
  abren al scrollear, parallax y efectos al pasar el puntero), sin tirada.
*/

/**
 * cāpsula33 — demo privado del Estudio (sitio a medida para el café de San
 * Martín de los Andes). Solo en local: la ruta no existe en producción y las
 * imágenes no viajan al repo (public/studio está en .gitignore).
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
      <div className="min-h-svh" style={{ background: '#05070d', color: C.cream, ...BODY }}>
        <Loader progress={progress} ready={ready} calm={calm} onBoard={() => setBoarded(true)} />
        <FacadeHero boarded={boarded} onProgress={onProgress} onReady={onReady} />
        <ScrollRail visible={boarded} />
      </div>
    </SmoothScrollProvider>
  )
}
