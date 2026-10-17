import { useCallback, useEffect, useRef, useState } from 'react'
import SmoothScrollProvider from '../../components/SmoothScrollProvider'
import { prefersReducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useLenis'
import Loader from './Loader'
import ShipHero from './ShipHero'
import ScrollRail from './ScrollRail'
import MapSection from './MapSection'
import Nav from './Nav'
import NosotrosSection from './NosotrosSection'
import LagosSection from './LagosSection'
import CartaSection from './CartaSection'
import CartaPared from './CartaPared'
import CartaLibro from './CartaLibro'
import ContactSection from './ContactSection'
import LlegarSection from './LlegarSection'
import GaleriaSection from './GaleriaSection'
import { BODY, C, FONTS_HREF } from './brand'
import { LangProvider } from './i18n'
import { useLang } from './i18nCore'

const LOADER_MIN_MS = 2800

// La carta: el libro por defecto; `?carta=consola` o `?carta=pared` muestran las otras versiones.
const CARTA_VIEWS = { consola: CartaSection, pared: CartaPared, libro: CartaLibro }
const CartaView =
  CARTA_VIEWS[typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('carta') : null] || CartaLibro

/*
THESIS: el café es un módulo acoplado a una nave — se aborda (loader con salto
  al hiperespacio), del otro lado está el hangar con el espacio detrás del
  ventanal, y la entrada naranja real del local espera en la cubierta. El
  scroll cruza la puerta y deja adentro, en el pasillo.
OWN-WORLD: la entrada real (cartel crema, ojo de buey «c̄33», puerta de
  ventanas en pastilla, ventanal con listones), el ventanal negro del edificio
  convertido en espacio, piso mojado; mono liviana minúscula (logo) + grotesca
  ancha para el titular.
STORY: hangar → el titular se desarma → la puerta se abre → entramos.
FIRST VIEWPORT: el módulo en el centro de la cubierta, el titular flotando
  sobre las estrellas, «Scroll para entrar».
FORM: brief del dueño (hero multicapa como el de NEON, fondo de nave espacial,
  titular flotante con parallax y efecto al pasar, se desvanece al scrollear).
*/

/**
 * cāpsula33 — demo privado del Estudio (sitio a medida para el café de San
 * Martín de los Andes). Solo en local: la ruta no existe en producción y las
 * imágenes no viajan al repo (public/studio está en .gitignore).
 */
export default function Capsula33Page() {
  return (
    <LangProvider>
      <Capsula33 />
    </LangProvider>
  )
}

function Capsula33() {
  const { t } = useLang()
  // Las fuentes, una sola vez (el sitio publicado ya las trae en el HTML).
  useEffect(() => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === FONTS_HREF)) return undefined
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    return () => link.remove()
  }, [])
  // El título y la descripción, en el idioma elegido (en el buscador y al compartir). Los datos del
  // local (JSON-LD) viven en el HTML: capsula33.html.
  useEffect(() => {
    const prevTitle = document.title
    const title = t('cāpsula33 · Café de especialidad en San Martín de los Andes')
    const description = t(
      'Cafetería de especialidad en Av. Gral. Roca 1120, San Martín de los Andes: espresso, laminados, brunch y figuras de colección en una cápsula naranja. Martes a sábado de 9 a 21, lunes de 9 a 15.',
    )
    document.title = title
    let meta = document.head.querySelector('meta[name="description"]')
    const created = !meta
    if (created) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    const prevDescription = meta.content
    meta.content = description
    const social = [
      ['meta[property="og:title"]', title],
      ['meta[name="twitter:title"]', title],
    ]
    const prevSocial = social.map(([sel]) => document.head.querySelector(sel)?.content)
    social.forEach(([sel, v]) => document.head.querySelector(sel)?.setAttribute('content', v))
    return () => {
      document.title = prevTitle
      if (created) meta.remove()
      else meta.content = prevDescription
      social.forEach(([sel], k) => prevSocial[k] != null && document.head.querySelector(sel)?.setAttribute('content', prevSocial[k]))
    }
  }, [t])

  const [calm] = useState(() => prefersReducedMotion())
  // Loader ↔ hero: la marca del loader vuela hasta el cartel de la entrada.
  const bridge = useRef({})
  // Dos cargas: el pasillo (hero) y el local en miniatura (mapa).
  const [loadedHero, setLoadedHero] = useState(0)
  const [loadedMap, setLoadedMap] = useState(0)
  const [heroReady, setHeroReady] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [boarded, setBoarded] = useState(false)
  const onProgress = useCallback((p) => setLoadedHero(p), [])
  const onReady = useCallback(() => setHeroReady(true), [])
  const onMapProgress = useCallback((p) => setLoadedMap(p), [])
  const onMapReady = useCallback(() => setMapReady(true), [])

  // La secuencia de abordaje dura lo que tiene que durar, aunque la descarga sea instantánea
  // (pedido del dueño): el progreso que se ve es el menor entre la descarga y el reloj.
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / LOADER_MIN_MS)
      setElapsed(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const progress = Math.min((loadedHero + loadedMap) / 2, elapsed)
  const ready = heroReady && mapReady && elapsed >= 1

  // Hasta abordar la página no se mueve (el loader la tapa entera).
  useEffect(() => {
    const lenis = getLenis()
    if (boarded) lenis?.start()
    else lenis?.stop()
  }, [boarded])

  return (
    <SmoothScrollProvider>
      <div className="min-h-svh" style={{ background: '#05070d', color: C.cream, ...BODY }}>
        <a
          href="#contenido"
          className="fixed top-3 left-3 z-[200] -translate-y-[200%] rounded-full px-4 py-2.5 text-[14px] font-semibold transition-transform focus:translate-y-0"
          style={{ background: C.orange, color: '#111113' }}
        >
          {t('Saltar al contenido')}
        </a>
        <Loader progress={progress} ready={ready} calm={calm} bridge={bridge} onBoard={() => setBoarded(true)} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          <ShipHero boarded={boarded} bridge={bridge} onProgress={onProgress} onReady={onReady} />
          <NosotrosSection />
          <MapSection onProgress={onMapProgress} onReady={onMapReady} />
          <CartaView />
          <GaleriaSection />
          {/* La ruta va después de las fotos, antes de Cómo llegar (es lo menos importante para quien viene al local). */}
          <LagosSection />
          <LlegarSection />
          <ContactSection />
        </main>
        <Nav visible={boarded} />
        <ScrollRail visible={boarded} />
      </div>
    </SmoothScrollProvider>
  )
}
