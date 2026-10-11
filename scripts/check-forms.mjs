/**
 * check:forms — los formularios de contacto del builder funcionan de verdad.
 *
 * Para cada uno (contact/ContactForm, meridian/Contact, fizz/ContactSteps), en
 * Chromium, con un endpoint simulado (page.route): enviar vacío muestra los
 * errores con los textos editados; enviar completo hace el POST con
 * { name, email, message } y muestra el mensaje de éxito editado; si el
 * servidor responde 500, muestra el de error.
 *
 * Uso: npm run check:forms
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EP = 'https://forms.example.test/contact'
const MESSAGE = 'Hola, quiero un sitio para mi marca.'

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

function startVite(port) {
  const bin = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
  const proc = spawn(process.execPath, [bin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('vite no arrancó'))
    }, 60000)
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('ready in')) {
        clearTimeout(timer)
        resolve(proc)
      }
    })
  })
}

/** Cada formulario: sus textos editados y cómo se completa. */
const FORMS = [
  {
    id: 'contact/ContactForm',
    props: { requiredError: 'Falta tu nombre', emailError: 'Email inválido', messageError: 'Escribí un poco más', successMessage: 'Listo, enviado', errorMessage: 'No se pudo enviar' },
    emptyErrors: ['Falta tu nombre', 'Email inválido', 'Escribí un poco más'],
    ok: 'Listo, enviado',
    fail: 'No se pudo enviar',
    async fill(page) {
      await page.locator('input[autocomplete="name"]').fill('Ana Prueba')
      await page.locator('input[type="email"]').fill('ana@example.com')
      await page.locator('textarea').fill(MESSAGE)
      await page.locator('form button[type="submit"]').first().click()
    },
  },
  {
    id: 'meridian/Contact',
    props: { requiredError: 'Falta completar', sentMessage: 'Recibido', errorMessage: 'Falló el envío' },
    emptyErrors: ['Falta completar'],
    ok: 'Recibido',
    fail: 'Falló el envío',
    async fill(page) {
      const inputs = page.locator('form input:not([tabindex="-1"]):not([type="hidden"]), form textarea')
      for (let i = 0; i < (await inputs.count()); i += 1) {
        const type = await inputs.nth(i).getAttribute('type')
        const tag = await inputs.nth(i).evaluate((el) => el.tagName)
        await inputs.nth(i).fill(type === 'email' ? 'ana@example.com' : tag === 'TEXTAREA' ? MESSAGE : 'Ana Prueba')
      }
      await page.locator('form button[type="submit"]').first().click()
    },
  },
  {
    id: 'fizz/ContactSteps',
    props: { nameError: 'Decime tu nombre', successTitle: 'Gracias, {name}!', failureMessage: 'No salió' },
    emptyErrors: ['Decime tu nombre'],
    ok: 'Gracias, Ana!',
    fail: 'No salió',
    async fill(page) {
      const next = page.locator('form button[type="submit"]').first()
      const field = () => page.locator('form input:not([tabindex="-1"]), form textarea').first()
      for (const value of ['Ana', 'ana@example.com', MESSAGE]) {
        await field().fill(value)
        await next.click()
        await page.waitForTimeout(900)
      }
    },
  },
]

async function main() {
  const port = await freePort()
  const vite = await startVite(port)
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  const problems = []
  try {
    for (const form of FORMS) {
      for (const status of [200, 500]) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-AR', reducedMotion: 'reduce' })
        const page = await ctx.newPage()
        const posts = []
        await page.route(EP, async (route) => {
          posts.push(route.request().postDataJSON())
          await route.fulfill({ status, contentType: 'application/json', body: '{}' })
        })
        await page.addInitScript(
          ([k, v]) => {
            localStorage.setItem(k, v)
            localStorage.setItem('scrolllab-motion-notice', '1')
          },
          ['builder-composition-v1', JSON.stringify([{ uid: 'f', sectionId: form.id, props: { endpoint: EP, ...form.props } }])],
        )
        await page.goto(`http://127.0.0.1:${port}/preview`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1800)
        // innerText aplica text-transform: se compara en minúsculas.
        const text = async () => (await page.locator('#top').innerText()).replace(/\s+/g, ' ').toLowerCase()

        await page.locator('form button[type="submit"]').first().click()
        await page.waitForTimeout(400)
        const afterEmpty = await text()
        for (const message of form.emptyErrors) {
          if (!afterEmpty.includes(message.toLowerCase())) problems.push(`${form.id}: enviar vacío no muestra «${message}»`)
        }
        if (posts.length) problems.push(`${form.id}: enviar vacío llegó al servidor`)

        await form.fill(page)
        await page.waitForTimeout(1500)
        const after = await text()
        const sent = posts[0]
        if (!sent || sent.email !== 'ana@example.com' || sent.message !== MESSAGE || !sent.name) {
          problems.push(`${form.id} (${status}): el POST no trae { name, email, message } (${JSON.stringify(sent)})`)
        }
        const expected = status === 200 ? form.ok : form.fail
        if (!after.includes(expected.toLowerCase())) problems.push(`${form.id} (${status}): no aparece «${expected}»`)
        await ctx.close()
      }
    }
  } finally {
    await browser.close()
    vite.kill()
  }
  if (problems.length) {
    console.error(`✖ ${problems.length} problemas:\n  - ${problems.join('\n  - ')}`)
    process.exit(1)
  }
  console.log(`✓ ${FORMS.length} formularios: validan, envían y muestran éxito o error con sus textos`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
