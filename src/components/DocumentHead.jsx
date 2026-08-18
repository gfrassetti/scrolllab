import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDocumentSeo, seoForPath } from '../lib/site.js'

/** Actualiza title, description, robots y canonical al cambiar de ruta. */
export default function DocumentHead() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    applyDocumentSeo(seoForPath(pathname))
  }, [pathname])
  return null
}
