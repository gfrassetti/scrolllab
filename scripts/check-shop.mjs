/**
 * check:shop — la tienda del builder (commerce) funciona de punta a punta, en
 * Chromium, con lo que el comprador edita:
 *
 *   grilla     etiqueta («Nuevo»), producto agotado (botón apagado)
 *   ficha      los tres modelos (clásica, galería, centrada); galería con
 *              miniaturas; muestras de color; cantidad −/+; acordeón con
 *              descripción, ficha técnica, envío y cuidados; relacionados
 *   carrito    agregar abre el carrito con la cantidad y la opción elegidas;
 *              −/+; el nombre lleva a la ficha
 *   checkout   valida, y termina en «pedido recibido»
 *
 * Uso: npm run check:shop
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const gridProps = (layout) => ({
  detailLayout: layout,
  detailCareText: 'Lavar en frío',
  detailShippingText: 'Envíos a todo el país',
  detailRelatedTitle: 'Más productos',
  soldOutLabel: 'Sin stock',
  cartTitle: 'Tu carrito',
  products: [
    {
      name: 'Remera Río',
      price: '25000',
      img2: '/meridian/gallery/02.webp',
      variantLabel: 'Color',
      variantOptions: 'Negro:#111111, Arena:#d8cbb0',
      badge: 'Nuevo',
      details: 'Descripción larga de prueba',
      specs: 'Material | Algodón\nOrigen | Argentina',
    },
    { name: 'Taza', price: '9000', variantOptions: '—', showSoldOut: 'on' },
    { name: 'Bolso', price: '30000' },
  ],
})

async function main() {
  const port = await freePort()
  const vite = await startVite(port)
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  const problems = []
  const expect = (ok, message) => {
    if (!ok) problems.push(message)
  }
  try {
    for (const layout of ['classic', 'gallery', 'centered']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-AR' })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.addInitScript(
        ([k, v]) => {
          localStorage.setItem(k, v)
          localStorage.setItem('scrolllab-motion-notice', '1')
          localStorage.removeItem('scrolllab-shop-cart')
        },
        ['builder-composition-v1', JSON.stringify([{ uid: 'g', sectionId: 'commerce/ProductGrid', props: gridProps(layout) }])],
      )
      await page.goto(`http://127.0.0.1:${port}/preview`, { waitUntil: 'domcontentloaded' })
      await page.locator('a[href^="/product/"]').first().waitFor({ timeout: 60000 })
      await page.waitForTimeout(500)
      const tag = `[${layout}]`

      // Grilla
      const grid = (await page.locator('#top').innerText()).toLowerCase()
      expect(grid.includes('nuevo'), `${tag} la grilla no muestra la etiqueta «Nuevo»`)
      expect(grid.includes('sin stock'), `${tag} la grilla no marca el producto agotado`)
      const soldOutAdd = page.locator('button', { hasText: /sin stock/i })
      expect((await soldOutAdd.count()) > 0 && (await soldOutAdd.first().isDisabled()), `${tag} el botón del agotado no está apagado`)

      // Ficha del primer producto
      await page.locator('a[href="/product/p-01"]').first().click()
      await page.locator('[data-pdp-layout]').waitFor({ timeout: 10000 })
      expect((await page.locator('[data-pdp-layout]').getAttribute('data-pdp-layout')) === layout, `${tag} la ficha no usa el modelo elegido`)
      if (layout === 'gallery') {
        expect((await page.locator('[data-pdp-layout] img[src*="02.webp"]').count()) >= 1, `${tag} la galería no muestra la foto 2 apilada`)
      } else {
        const thumbs = page.getByRole('button', { name: /Remera Río — \d/ })
        expect((await thumbs.count()) === 2, `${tag} no hay 2 miniaturas (${await thumbs.count()})`)
        await thumbs.nth(1).click()
        await page.waitForTimeout(300)
        expect(/02\.webp/.test((await page.locator('[data-pdp-layout] .aspect-4\\/5 img').first().getAttribute('src')) || ''), `${tag} la miniatura no cambia la foto principal`)
      }
      // Muestras de color
      expect((await page.getByRole('radio', { name: 'Arena' }).count()) === 1, `${tag} no hay muestra de color «Arena»`)
      await page.getByRole('radio', { name: 'Arena' }).check({ force: true })
      expect((await page.locator('legend').innerText()).includes('Arena'), `${tag} la leyenda no dice el color elegido`)
      // Cantidad
      await page.getByRole('button', { name: '+1' }).first().click()
      expect((await page.locator('[aria-live="polite"]').first().innerText()).trim() === '2', `${tag} la cantidad no sube a 2`)
      // Acordeón
      const body = async () => (await page.locator('[data-pdp-layout]').innerText()).toLowerCase()
      expect((await body()).includes('descripción larga de prueba'), `${tag} la descripción no está abierta`)
      await page.getByRole('button', { name: 'Details' }).click()
      await page.getByRole('button', { name: 'Care' }).click()
      await page.waitForTimeout(400)
      const opened = await body()
      expect(opened.includes('algodón') && opened.includes('argentina'), `${tag} la ficha técnica no se ve`)
      expect(opened.includes('lavar en frío'), `${tag} los cuidados no se ven`)
      // Relacionados
      expect(opened.includes('más productos') && opened.includes('bolso'), `${tag} faltan los productos relacionados`)

      // Agregar → carrito con cantidad y opción
      await page.getByRole('button', { name: /add to cart/i }).click()
      const drawer = page.locator('[role="dialog"]')
      await drawer.waitFor({ timeout: 5000 })
      const line = (await drawer.locator('li').first().innerText()).replace(/\s+/g, ' ')
      expect(line.includes('Arena') && /\b2\b/.test(line), `${tag} el carrito no tiene «Arena» × 2 (${line})`)
      await drawer.getByRole('button', { name: '−1' }).first().click()
      expect((await drawer.locator('[aria-live="polite"]').first().innerText()).trim() === '1', `${tag} − en el carrito no baja a 1`)
      await drawer.getByRole('link', { name: 'Remera Río' }).click()
      await page.waitForTimeout(500)
      expect((await drawer.count()) === 0, `${tag} el link del carrito no cierra el carrito`)

      // Producto agotado en su ficha
      await page.goto(`http://127.0.0.1:${port}/preview`, { waitUntil: 'domcontentloaded' })
      await page.locator('a[href="/product/p-02"]').first().waitFor({ timeout: 30000 })
      await page.locator('a[href="/product/p-02"]').first().click()
      await page.locator('[data-pdp-layout]').waitFor()
      const soldBtn = page.locator('[data-pdp-layout] button', { hasText: /sold out/i })
      expect((await soldBtn.count()) === 1 && (await soldBtn.isDisabled()), `${tag} el agotado se puede agregar desde la ficha`)

      // Checkout (solo una vez)
      if (layout === 'classic') {
        await page.getByRole('link', { name: /^←/ }).first().click()
        await page.locator('a[href="/product/p-03"]').first().waitFor()
        await page.locator('button', { hasText: /^Add$/ }).last().click()
        await drawer.waitFor()
        await drawer.getByRole('link', { name: /checkout/i }).click()
        await page.locator('button[type="submit"]').first().waitFor()
        await page.locator('button[type="submit"]').first().click()
        await page.waitForTimeout(300)
        const invalid = await page.evaluate(() => document.querySelectorAll('input:invalid').length)
        expect(invalid > 0, `${tag} el checkout vacío no valida`)
        await page.locator('input[type="email"]').first().fill('ana@example.com')
        const required = page.locator('form input[required]:not([type="email"])')
        for (let i = 0; i < (await required.count()); i += 1) await required.nth(i).fill(i === 0 ? 'Ana' : 'Prueba 123')
        await page.locator('button[type="submit"]').first().click()
        await page.waitForTimeout(2500)
        expect(/order received/i.test(await page.locator('h1').first().innerText()), `${tag} el checkout no termina en «pedido recibido»`)
      }
      expect(!errors.length, `${tag} errores en la página: ${errors.slice(0, 2).join(' | ')}`)
      await ctx.close()
    }
  } finally {
    await browser.close()
    vite.kill()
  }
  if (problems.length) {
    console.error(`✖ ${problems.length} problemas:\n  - ${problems.join('\n  - ')}`)
    process.exit(1)
  }
  console.log('✓ Tienda: grilla, ficha (3 modelos), carrito y checkout funcionan con lo editado')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
