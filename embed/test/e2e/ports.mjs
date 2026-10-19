/**
 * Puerto de la API de los e2e del embed. Las páginas de prueba
 * (embed/test/*.html) apuntan a :8787, el mismo puerto que `npm run dev`: con
 * el dev server prendido, el e2e reusaba esa API (otra base, sin el login de
 * prueba ni el mock de MP). Por eso la API del e2e va por defecto en :8797 y
 * cada contexto del navegador manda ahí lo que pide a :8787 (páginas, loader y
 * frame), sin tocar los HTML. Con el default en :8787, un `npm run dev`
 * levantado en medio del barrido nocturno (2026-10-19) hizo que todo lab-e2e
 * diera 402 contra la base de desarrollo. `E2E_API_PORT` lo pisa.
 */
export const API_PORT = Number(process.env.E2E_API_PORT) || 8797
// La API del e2e (embed/test/e2e-api.mjs) lee el mismo env al arrancar.
process.env.E2E_API_PORT = String(API_PORT)
export const API = `http://localhost:${API_PORT}`

/** Cada contexto nuevo de `browser` manda lo de :8787 a la API del e2e. */
export function redirectDefaultApi(browser) {
  if (API_PORT === 8787) return browser
  const newContext = browser.newContext.bind(browser)
  browser.newContext = async (options) => {
    const context = await newContext(options)
    await context.route('http://localhost:8787/**', (route) =>
      route.continue({ url: route.request().url().replace('http://localhost:8787', API) }),
    )
    return context
  }
  return browser
}
