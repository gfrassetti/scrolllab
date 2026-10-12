/**
 * Movimiento completo para todo el que entra al market (MotionToggle +
 * src/lib/motionOverride.js), en un navegador real.
 *
 * Decisión del dueño (2026-10-12): quien abre ScrollLab, en el celular o en la
 * compu, ve las demos con todas sus animaciones, también con «reducir
 * movimiento» prendido en el dispositivo. Lo que tiene que cumplir:
 *
 * - primera visita con «reducir movimiento»: movimiento completo YA, sin
 *   aviso ni pregunta (`<html data-motion="full">`, `matchMedia` no avisa
 *   «reducir»: es lo que hace andar a las ~70 secciones que leen el ajuste
 *   directo), en el home y en cada demo, sin guardar nada;
 * - sin «reducir movimiento»: igual de completo y sin fila de animaciones
 *   (no hay nada que elegir);
 * - la salida para quien lo necesita: la fila «Animaciones: Sí / No» del menú
 *   de preferencias (escritorio) y del menú del teléfono, con texto; «No»
 *   guarda `calm`, recarga y desde ahí manda el ajuste del dispositivo, en
 *   todas las pantallas; «Sí» vuelve;
 * - el tema siempre a la vista en el header de escritorio;
 * - con el storage bloqueado la página no se rompe y es completa igual.
 *
 * Uso:
 *   npm run check:motion-notice
 *   BASE=http://localhost:5173 npm run check:motion-notice   # un server ya levantado
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium …
 */
import { devices } from 'playwright'

import { freePort, launchChromium, startVite } from './lib/servers.mjs'

const GROUP = 'Ver las demos con animaciones'
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
  return context
}

async function open(context, base, path) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // Vite en frío optimiza dependencias nuevas y recarga la página una vez: se
  // espera a que la red se calme antes de medir (si no, «execution context destroyed»).
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1200)
  page.errors = errors
  return page
}

const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)
const dataMotion = (page) => page.evaluate(() => document.documentElement.dataset.motion ?? null)
/** Lo que ven las secciones cuando preguntan por «reducir movimiento». */
const sectionsSeeReduce = (page) =>
  page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const spaGo = (page, path) =>
  page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
const asksNothing = (page) =>
  page
    .locator('aside[aria-label="Movimiento"]')
    .count()
    .then((n) => n === 0)

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
    for (const [phone, name] of [
      [true, 'celular'],
      [false, 'compu'],
    ]) {
      console.log(`\nPrimera visita en el ${name}, con «reducir movimiento» en el dispositivo`)
      const ctx = await newContext(browser, { phone })
      const page = await open(ctx, base, '/')
      check('movimiento completo desde el primer render (data-motion=full)', (await dataMotion(page)) === 'full')
      check('las secciones no ven «reducir movimiento»', (await sectionsSeeReduce(page)) === false)
      check('no se pregunta nada', await asksNothing(page))
      check('no se guardó nada', (await stored(page, 'scrolllab-motion')) === null)
      check('sin errores de página', page.errors.length === 0, page.errors.join(' | ').slice(0, 160))
      for (const t of TEMPLATES) {
        const p = await open(ctx, base, `/templates/${t}`)
        check(`/templates/${t}: completo y sin aviso`, (await dataMotion(p)) === 'full' && (await asksNothing(p)))
        check(`/templates/${t}: sin errores de página`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160))
        await p.close()
      }
      await spaGo(page, '/templates/chapters')
      await page.waitForTimeout(600)
      check('navegando dentro del sitio sigue completo', (await dataMotion(page)) === 'full' && (await asksNothing(page)))
      await ctx.close()
    }

    console.log('\nDispositivo sin «reducir movimiento»')
    {
      const ctx = await newContext(browser, { reduce: false, phone: false })
      const page = await open(ctx, base, '/')
      check('movimiento completo', (await dataMotion(page)) === 'full')
      check('no se pregunta nada', await asksNothing(page))
      await page.locator('[data-preferences] > button').click()
      check(
        'ni fila de animaciones (no hay nada que elegir)',
        (await page.getByRole('group', { name: GROUP }).count()) === 0,
      )
      await ctx.close()
    }

    console.log('\nFila «Animaciones» del menú de preferencias (escritorio)')
    {
      const ctx = await newContext(browser, { phone: false })
      const page = await open(ctx, base, '/')
      const prefs = page.locator('[data-preferences] > button')
      const group = page.getByRole('group', { name: GROUP })
      const yes = group.getByRole('button', { name: 'Sí', exact: true })
      const no = group.getByRole('button', { name: 'No', exact: true })
      check(
        'el tema se ve en el header sin abrir ningún menú',
        await page.getByRole('button', { name: /Cambiar a tema/ }).first().isVisible(),
      )
      await prefs.click()
      check('con «reducir movimiento» la fila se ve', await group.isVisible())
      check('y dice qué es: «Animaciones»', (await group.innerText()).includes('Animaciones'))
      check(
        'arranca en «Sí» (completo)',
        (await yes.getAttribute('aria-pressed')) === 'true' && (await no.getAttribute('aria-pressed')) === 'false',
      )
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), no.click()])
      await page.waitForTimeout(1200)
      check('«No»: guarda calma y recarga', (await stored(page, 'scrolllab-motion')) === 'calm')
      check('sin override en <html>', (await dataMotion(page)) === null)
      check('las secciones vuelven a ver el ajuste del dispositivo', (await sectionsSeeReduce(page)) === true)
      check('no pregunta', await asksNothing(page))
      const demo = await open(ctx, base, '/templates/chapters')
      check('en una demo también manda el dispositivo', (await dataMotion(demo)) === null)
      await demo.close()
      await prefs.click()
      check('«No» queda marcado', (await no.getAttribute('aria-pressed')) === 'true')
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), yes.click()])
      await page.waitForTimeout(1200)
      check('«Sí»: vuelve al movimiento completo', (await dataMotion(page)) === 'full')
      await ctx.close()
    }

    console.log('\nMenú del teléfono')
    {
      const ctx = await newContext(browser, { phone: true })
      const page = await open(ctx, base, '/')
      await page.getByRole('button', { name: /^Menú$/i }).first().tap()
      await page.waitForTimeout(700)
      const group = page.getByRole('group', { name: GROUP })
      check('la fila «Animaciones» está en el menú', await group.isVisible())
      check('con texto, no un ícono suelto', (await group.innerText()).includes('Animaciones'))
      await ctx.close()
    }

    console.log('\nStorage bloqueado')
    {
      const ctx = await newContext(browser, { storageBlocked: true })
      const page = await open(ctx, base, '/')
      check('la página carga sin errores', page.errors.length === 0, page.errors.join(' | ').slice(0, 160))
      check('y se ve (no queda en blanco)', await page.evaluate(() => document.body.innerText.trim().length > 40))
      check('movimiento completo igual (el default no necesita memoria)', (await dataMotion(page)) === 'full')
      check('no se pregunta', await asksNothing(page))
      await ctx.close()
    }
  } finally {
    await browser.close()
    vite?.kill()
  }

  console.log(`\n${total - failures.length}/${total} controles OK`)
  if (failures.length) {
    console.error(`\n${failures.length} fallas:`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
