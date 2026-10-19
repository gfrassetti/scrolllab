import express from 'express'
import { allowedOrigins } from '../../middleware.js'
import { fromOurSite, issuePass, passIsValid, sealedAssetPath } from '../../services/showcase/vesperAssets.js'

/**
 * La vitrina del Estudio (VESPER, /estudio/vesper): el pase que vence y las piezas selladas. Sin sesión:
 * la página es pública, lo que se cuida es que los archivos no se bajen sueltos ni se usen desde otro
 * sitio. Reglas en services/showcase/vesperAssets.js.
 */
export function createShowcaseRouter({ config, limits }) {
  const router = express.Router()
  const allowed = new Set(allowedOrigins(config))
  const guard = (req, res, next) => {
    if (!fromOurSite(req.headers, allowed)) return res.status(403).json({ error: 'Origen no permitido' })
    res.set('Cache-Control', 'private, no-store')
    res.set('Cross-Origin-Resource-Policy', 'same-site')
    return next()
  }
  const limit = limits?.api ? [limits.api] : []

  router.get('/api/showcase/vesper/pass', ...limit, guard, (_req, res) => {
    res.json(issuePass(config.sessionSecret))
  })

  router.get('/api/showcase/vesper/a/:id', guard, (req, res) => {
    if (!passIsValid(config.sessionSecret, req.query.p)) return res.status(403).json({ error: 'Pase vencido' })
    const file = sealedAssetPath(req.params.id)
    if (!file) return res.status(404).json({ error: 'No existe' })
    res.type('application/octet-stream')
    return res.sendFile(file)
  })

  return router
}
