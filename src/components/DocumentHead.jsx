import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDocumentSeo, seoForPath } from '../lib/site.js'
import { trackPageView } from '../lib/gtm.js'

/** Actualiza title, description, robots y canonical al cambiar de ruta. */
export default function DocumentHead() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const seo = seoForPath(pathname)
    applyDocumentSeo(seo)
    trackPageView({ path: pathname, title: seo.title })
  }, [pathname])
  return null
}
