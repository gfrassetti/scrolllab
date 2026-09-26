import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import es from '../i18n/locales/es.json'
import { applyDocumentSeo, seoForPath } from '../lib/site.js'
import { productSeoForPath } from '../lib/productPages.js'
import { trackPageView } from '../lib/gtm.js'

/** Actualiza title, description, robots y canonical al cambiar de ruta. */
export default function DocumentHead() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    // Las páginas de producto llevan su propio texto (siempre en español).
    const seo = productSeoForPath(pathname, es) ?? seoForPath(pathname)
    applyDocumentSeo(seo)
    trackPageView({ path: pathname, title: seo.title })
  }, [pathname])
  return null
}
