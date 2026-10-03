/**
 * Rutas de una app Express 5 en orden de registro: `MÉTODO path`.
 * Baja a los routers montados con `app.use(router)` (sin prefijo: los
 * routers de dominio declaran el path completo, `/api/...`).
 */
export function registeredRoutes(app) {
  const out = []
  const walk = (stack) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          out.push({ method: method.toUpperCase(), path: layer.route.path })
        }
      } else if (layer.handle?.stack) {
        walk(layer.handle.stack)
      }
    }
  }
  walk(app.router.stack)
  return out
}

export function routeInventory(app) {
  return registeredRoutes(app)
    .map((r) => `${r.method} ${r.path}`)
    .sort()
}

/**
 * Rutas estáticas que una ruta con parámetro registrada ANTES se tragaría
 * (p. ej. `GET /api/hosted/:id` antes de `GET /api/hosted/sections`).
 */
export function shadowedRoutes(app) {
  const routes = registeredRoutes(app)
  const toRegex = (p) =>
    new RegExp(`^${p.replace(/:[^/]+/g, '[^/]+')}$`)
  const shadowed = []
  routes.forEach((r, i) => {
    if (!r.path.includes(':')) return
    const re = toRegex(r.path)
    for (const later of routes.slice(i + 1)) {
      if (later.method === r.method && !later.path.includes(':') && re.test(later.path)) {
        shadowed.push(`${later.method} ${later.path} (tapada por ${r.path})`)
      }
    }
  })
  return shadowed
}
