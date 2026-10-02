/**
 * El aviso «Ver con animaciones» (MotionNotice / MotionToggle), en un
 * navegador real con «reducir movimiento» prendido.
 *
 * Lo que tiene que cumplir — cada punto salió de un reclamo de verdad:
 *
 * - se pregunta UNA sola vez, en total: no al navegar entre pantallas, no al
 *   recargar, no en una pestaña nueva, tampoco si se lo ignora;
 * - «Dejarlo así» no recarga la página;
 * - «Ver con animaciones» recarga una vez y desde ahí TODO ScrollLab corre con
 *   el movimiento completo: `<html data-motion="full">` y `matchMedia` ya no
 *   avisa «reducir» (es lo que hace andar a las ~70 secciones que leen el
 *   ajuste directo: antes solo andaba en las ya migradas);
 * - el toggle del header cambia de idea después, y solo se ve si el
 *   dispositivo pide reducir;
 * - sin «reducir movimiento» nada de esto aparece; con el storage bloqueado la
 *   página no se rompe y no se pregunta (no habría dónde recordar la respuesta).
 *
 * Uso:
 *   npm run check:motion-notice
 *   BASE=http://localhost:5173 npm run check:motion-notice   # un server ya levantado
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium …
 */
import { devices } from 'playwright'

import { freePort, launchChromium, routePicsum, startVite } from './lib/servers.mjs'

const NOTICE = 'aside[aria-label="Movimiento"]'
const SHOW_FULL = 'Ver con animaciones'
const KEEP_CALM = 'Dejarlo así'
const TEMPLATES = ['chapters', 'nocturne', 'monolith']

const failures = []
let total = 0

function check(label, ok, detail = '') {
  total += 1
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function newContext(browser, { reduce = true, phone = true, storageBlocked = false } = {}) {
  const base = phone ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 } }
  const context = await browser.newContext({
    ...base,
    reducedMotion: reduce ? 'reduce' : 'no-preference',
    // El market elige el idioma por el del navegador: los textos de abajo son los de es.
    locale: 'es-AR',
    serviceWorkers: 'block',
  })
  await context.addInitScript((blocked) => {
    try {
      // La splash de marca tapa la pantalla la primera vez de cada pestaña.
      sessionStorage.setItem('scrolllab-splash-seen', '1')
    } catch {
      /* ignore */
    }
    if (blocked) {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError')
        },
      })
    }
  }, storageBlocked)
  // Google Fonts no responde en un contenedor sin red: no se espera.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await routePicsum(context)
  return context
}

async function open(context, base, path) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1200)
  page.errors = errors
  return page
}

const noticeVisible = (page) => page.locator(NOTICE).isVisible().catch(() => false)
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)
const dataMotion = (page) => page.evaluate(() => document.documentElement.dataset.motion ?? null)
const spaGo = (page, path) =>
  page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)

async function main() {
  let vite = null
  let base = process.env.BASE
  if (!base) {
    const port = await freePort()
    vite = await startVite(port)
    base = `http://127.0.0.1:${port}`
  }
  const browser = await launchChromium()

  try {
    console.log('\nPrimera visita, «Dejarlo así»')
    {
      const ctx = await newContext(browser)
      const page = await open(ctx, base, '/')
      check('aparece el aviso', await noticeVisible(page))
      check(
        'dice que no cambia el ajuste del dispositivo',
        /sin cambiar ese ajuste/.test((await page.locator(NOTICE).textContent()) || ''),
      )
      check('queda marcado como visto', (await stored(page, 'scrolllab-motion-notice')) === '1')
      await page.evaluate(() => (window.__marker = 'sigo acá'))
      await page.getByRole('button', { name: KEEP_CALM }).click()
      await page.waitForTimeout(400)
      check('«Dejarlo así» no recarga la página', (await page.evaluate(() => window.__marker)) === 'sigo acá')
      check('se cierra', !(await noticeVisible(page)))
      check('guarda «calma»', (await stored(page, 'scrolllab-motion')) === 'calm')
      check('sin override en <html>', (await dataMotion(page)) === null)
      for (const t of TEMPLATES) {
        const p = await open(ctx, base, `/templates/${t}`)
        check(`/templates/${t}: no vuelve a preguntar`, !(await noticeVisible(p)))
        await p.close()
      }
      const again = await open(ctx, base, '/')
      check('home en una pestaña nueva: no vuelve', !(await noticeVisible(again)))
      await ctx.close()
    }

    console.log('\nPrimera visita, ignorarlo y seguir navegando')
    {
      const ctx = await newContext(browser)
      const page = await open(ctx, base, '/')
      check('aparece el aviso', await noticeVisible(page))
      await spaGo(page, '/templates/nocturne')
      await page.waitForTimeout(600)
      check('al navegar sin responder, se va', !(await noticeVisible(page)))
      await spaGo(page, '/')
      await page.waitForTimeout(600)
      check('y al volver al home no reaparece', !(await noticeVisible(page)))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      check('ni al recargar', !(await noticeVisible(page)))
      check('sin respuesta guardada (sigue en calma)', (await stored(page, 'scrolllab-motion')) === null)
      await ctx.close()
    }

    console.log('\nPrimera visita, «Ver con animaciones»')
    {
      const ctx = await newContext(browser)
      const page = await open(ctx, base, '/')
      check('aparece el aviso', await noticeVisible(page))
      await page.evaluate(() => (window.__marker = 'sigo acá'))
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.getByRole('button', { name: SHOW_FULL }).click(),
      ])
      await page.waitForTimeout(1200)
      check('recarga la página', (await page.evaluate(() => window.__marker)) === undefined)
      check('guarda «full»', (await stored(page, 'scrolllab-motion')) === 'full')
      check('<html data-motion="full">', (await dataMotion(page)) === 'full')
      check('no vuelve a preguntar', !(await noticeVisible(page)))
      const mm = await page.evaluate(() => ({
        reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
        noPref: matchMedia('(prefers-reduced-motion: no-preference)').matches,
        gsapStyle: matchMedia('(max-width: 767px) and (prefers-reduced-motion: no-preference)').matches,
      }))
      check('matchMedia ya no avisa «reducir»', mm.reduce === false && mm.noPref === true, JSON.stringify(mm))
      check('las condiciones combinadas con otro ancho siguen andando', mm.gsapStyle === true, JSON.stringify(mm))
      for (const t of TEMPLATES) {
        const p = await open(ctx, base, `/templates/${t}`)
        check(`/templates/${t}: movimiento completo y sin aviso`, (await dataMotion(p)) === 'full' && !(await noticeVisible(p)))
        check(`/templates/${t}: sin errores de página`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160))
        await p.close()
      }
      await ctx.close()
    }

    console.log('\nToggle del header (escritorio)')
    {
      const ctx = await newContext(browser, { phone: false })
      const page = await open(ctx, base, '/')
      await page.getByRole('button', { name: KEEP_CALM }).click()
      const toggle = page.getByRole('button', { name: 'Ver las demos con animaciones' })
      check('con «reducir movimiento» el toggle se ve', await toggle.isVisible())
      check('arranca apagado (aria-pressed=false)', (await toggle.getAttribute('aria-pressed')) === 'false')
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), toggle.click()])
      await page.waitForTimeout(1200)
      const on = page.getByRole('button', { name: 'Ver las demos con animaciones' })
      check('prende: recarga con data-motion=full y aria-pressed=true', (await dataMotion(page)) === 'full' && (await on.getAttribute('aria-pressed')) === 'true')
      check('sigue sin preguntar', !(await noticeVisible(page)))
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), on.click()])
      await page.waitForTimeout(1200)
      check('apaga: vuelve a la versión con menos movimiento', (await dataMotion(page)) === null && (await stored(page, 'scrolllab-motion')) === 'calm')
      await ctx.close()
    }

    console.log('\nSin «reducir movimiento»')
    {
      const ctx = await newContext(browser, { reduce: false, phone: false })
      const page = await open(ctx, base, '/')
      check('no hay aviso', !(await noticeVisible(page)))
      check('ni toggle', (await page.getByRole('button', { name: 'Ver las demos con animaciones' }).count()) === 0)
      check('nada guardado', (await stored(page, 'scrolllab-motion-notice')) === null)
      await ctx.close()
    }

    console.log('\nStorage bloqueado')
    {
      const ctx = await newContext(browser, { storageBlocked: true })
      const page = await open(ctx, base, '/')
      check('la página carga sin errores', page.errors.length === 0, page.errors.join(' | ').slice(0, 160))
      check('y se ve (no queda en blanco)', await page.evaluate(() => document.body.innerText.trim().length > 40))
      check('no se pregunta (no habría dónde recordar la respuesta)', !(await noticeVisible(page)))
      await ctx.close()
    }
  } finally {
    await browser.close()
    if (vite) vite.kill()
  }

  console.log(`\n${total - failures.length}/${total} controles OK`)
  if (failures.length) {
    console.log('\nFallaron:')
    for (const f of failures) console.log(`  - ${f}`)
  }
  process.exit(failures.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
