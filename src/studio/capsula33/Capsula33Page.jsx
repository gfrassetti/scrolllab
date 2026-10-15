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
import ContactSection from './ContactSection'
import LlegarSection from './LlegarSection'
import GaleriaSection from './GaleriaSection'
import { BODY, C, FONTS_HREF } from './brand'
import { LangProvider } from './i18n'
import { useLang } from './i18nCore'

const LOADER_MIN_MS = 2800

// La carta: la pared de cápsulas por defecto; `?carta=consola` muestra la consola de pedidos.
const CartaView =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('carta') === 'consola' ? CartaSection : CartaPared

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
  // Las fuentes, una sola vez.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
    return () => link.remove()
  }, [])
  // El título, la descripción y los datos del local, en el idioma elegido.
  useEffect(() => {
    const prevTitle = document.title
    document.title = t('cāpsula33 · Café de especialidad en San Martín de los Andes')
    // Lo que muestran los buscadores y los datos del local (horario, dirección, ubicación).
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = t(
      'Cafetería de especialidad en Av. Gral. Roca 1120, San Martín de los Andes: espresso, laminados, brunch y figuras de colección en una cápsula naranja. Martes a sábado de 9 a 21, lunes de 9 a 15.',
    )
    const prevMeta = document.querySelector('meta[name="description"]')
    if (prevMeta) prevMeta.remove()
    document.head.appendChild(meta)
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CafeOrCoffeeShop',
      name: 'cāpsula33',
      servesCuisine: [t('Café de especialidad'), t('Pastelería'), 'Brunch'],
      address: { '@type': 'PostalAddress', streetAddress: 'Av. Gral. Roca 1120', addressLocality: 'San Martín de los Andes', addressRegion: 'Neuquén', addressCountry: 'AR' },
      geo: { '@type': 'GeoCoordinates', latitude: -40.1542728, longitude: -71.347478 },
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '21:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '15:00' },
      ],
      sameAs: ['https://www.instagram.com/capsulas33/'],
    })
    document.head.appendChild(ld)
    return () => {
      meta.remove()
      if (prevMeta) document.head.appendChild(prevMeta)
      ld.remove()
      document.title = prevTitle
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
        <Loader progress={progress} ready={ready} calm={calm} bridge={bridge} onBoard={() => setBoarded(true)} />
        <ShipHero boarded={boarded} bridge={bridge} onProgress={onProgress} onReady={onReady} />
        <NosotrosSection />
        <MapSection onProgress={onMapProgress} onReady={onMapReady} />
        <CartaView />
        <GaleriaSection />
        {/* La ruta va después de las fotos, antes de Cómo llegar (es lo menos importante para quien viene al local). */}
        <LagosSection />
        <LlegarSection />
        <ContactSection />
        <Nav visible={boarded} />
        <ScrollRail visible={boarded} />
      </div>
    </SmoothScrollProvider>
  )
}
