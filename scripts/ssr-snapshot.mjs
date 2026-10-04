/**
 * Red para refactors de UI: el HTML que React renderiza en el servidor para una
 * página, sin efectos (ni GSAP, ni scroll, ni nada que corra en el navegador).
 * Sirve para comprobar que partir un componente en otros, o mover JSX de lugar,
 * no cambió lo que se dibuja: se saca una foto antes, otra después y se
 * comparan. Cubre estructura, clases, textos, atributos y props; NO cubre
 * animaciones ni lo que pasa al scrollear (eso lo miran check:motion,
 * check:builder y check:mobile en un navegador real).
 *
 * Uso:
 *   npm run ssr:snapshot -- <página> <es|en> <salida.html>
 *   p. ej.  npm run ssr:snapshot -- pages/TemplatesIndex.jsx es antes.html
 *
 *   SSR_STORAGE_FILE=estado.json  arranca con localStorage precargado
 *     ({ "clave": "valor" }; p. ej. { "builder-composition-v1": "[…]" } para
 *     renderizar el builder con una composición armada).
 *
 * El HTML sale con una etiqueta por línea (los diffs se leen). Los ids de
 * `useId()` (`_R_…_`) dependen de la profundidad del árbol: si partís un
 * componente cambian aunque el HTML sea el mismo; normalizalos antes de
 * comparar: sed -E 's/_R_[a-z0-9]+_/<useId>/g'
 *
 * Dos corridas sobre el mismo código tienen que dar el mismo archivo: si no, la
 * página tiene algo no determinista (fechas, ids al azar) y esta foto no sirve
 * para comparar hasta fijarlo.
 */
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'

// gsap es ESM en un paquete sin "type": "module": Node ≥ 22.7 lo detecta solo;
// en Node 20 hace falta el flag (mismo criterio que scripts/run-tests.mjs).
const major = Number(process.versions.node.split('.')[0])
if (major < 22 && !process.execArgv.includes('--experimental-detect-module')) {
  const rerun = spawnSync(
    process.execPath,
    ['--experimental-detect-module', ...process.argv.slice(1)],
    { stdio: 'inherit' },
  )
  process.exit(rerun.status ?? 1)
}

const [page, locale, out] = process.argv.slice(2)
if (!page || !['es', 'en'].includes(locale) || !out) {
  console.error('Uso: npm run ssr:snapshot -- <página relativa a src/> <es|en> <salida.html>')
  process.exit(2)
}

const seeded = process.env.SSR_STORAGE_FILE
  ? JSON.parse(fs.readFileSync(process.env.SSR_STORAGE_FILE, 'utf8'))
  : {}
globalThis.localStorage = {
  getItem: (key) => (key === 'scrolllab-locale' ? locale : key in seeded ? seeded[key] : null),
  setItem() {},
  removeItem() {},
}
// Lo mínimo para módulos que tocan el documento al cargarse (theme.js).
const noop = () => {}
globalThis.document = {
  documentElement: {
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    style: {},
    dataset: {},
    setAttribute: noop,
    lang: '',
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
}

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})
try {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const { I18nProvider } = await vite.ssrLoadModule('/src/i18n/index.jsx')
  const { AuthProvider } = await vite.ssrLoadModule('/src/lib/auth.jsx')
  const { PlanProvider } = await vite.ssrLoadModule('/src/lib/plan.jsx')
  const { default: Page } = await vite.ssrLoadModule(`/src/${page}`)
  const h = React.createElement
  const html = renderToStaticMarkup(
    h(
      I18nProvider,
      null,
      h(AuthProvider, null, h(PlanProvider, null, h(MemoryRouter, { initialEntries: ['/'] }, h(Page)))),
    ),
  )
  fs.writeFileSync(out, html.replace(/></g, '>\n<'))
  const dataAttrs = (html.match(/data-[a-z-]+/g) || []).length
  console.log(`${page} [${locale}]: ${html.length} caracteres, ${dataAttrs} atributos data-*`)
} finally {
  await vite.close()
}
