/**
 * PLUM — offline frame renderer for the scroll film.
 *
 * Reads public/plum/story.json, loads scripts/plum/scene.html (a deterministic
 * three.js form driven by a 0..1 param) in headless Chromium, and renders the
 * whole story as one continuous move — split into the per-chapter folders the
 * story config declares:
 *
 *   public/plum/seq/<chapter.id>/0001.webp ...
 *
 * This is the abstract placeholder sequence. To ship real imagery, replace a
 * chapter folder with your own numbered webp frames (or run
 * `node scripts/plum-frames-from-video.mjs <chapter> <video>` to slice a clip)
 * and keep story.json's frame count in sync.
 *
 *   npm run gen:plum
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const SCENE = path.join(HERE, 'plum', 'scene.html')
const STORY = path.join(REPO, 'public', 'plum', 'story.json')

const QUALITY = 0.72

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript' }
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0])
    const file = path.join(dir, rel === '/' ? 'scene.html' : rel)
    if (!file.startsWith(dir)) return res.writeHead(403).end()
    try {
      res.writeHead(200, {
        'content-type': types[path.extname(file)] || 'application/octet-stream',
      })
      res.end(await fs.promises.readFile(file))
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port }),
    )
  })
}

async function main() {
  void SCENE
  const story = JSON.parse(fs.readFileSync(STORY, 'utf8'))
  const { basePath, pad, ext } = story.frames
  const outRoot = path.join(REPO, 'public', basePath.replace(/^\//, ''))
  const chapters = story.chapters
  const total = chapters.reduce((n, c) => n + c.frames, 0)

  const { server, port } = await serve(path.join(HERE, 'plum'))
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1700, height: 1100 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (e) => console.error('[scene]', e.message))

  await page.goto(`http://127.0.0.1:${port}/scene.html`, {
    waitUntil: 'load',
    timeout: 60_000,
  })
  await page.waitForFunction(() => window.__ready === true, { timeout: 60_000 })
  const meta = await page.evaluate(() => window.__meta)

  process.stdout.write(
    `Rendering ${total} frames across ${chapters.length} chapters (${meta.w}x${meta.h})\n`,
  )

  let g = 0
  for (const ch of chapters) {
    const dir = path.join(outRoot, ch.id)
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    for (let local = 1; local <= ch.frames; local++) {
      const t = total === 1 ? 0 : g / (total - 1)
      const dataUrl = await page.evaluate(
        ({ t, q }) => {
          window.__setFrame(t)
          return document.getElementById('c').toDataURL('image/webp', q)
        },
        { t, q: QUALITY },
      )
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      const name = `${String(local).padStart(pad, '0')}.${ext}`
      fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'))
      g++
    }
    process.stdout.write(`  ${ch.id}: ${ch.frames} frames\n`)
  }

  const bytes = chapters.reduce((sum, ch) => {
    const dir = path.join(outRoot, ch.id)
    return (
      sum +
      fs
        .readdirSync(dir)
        .reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0)
    )
  }, 0)
  process.stdout.write(
    `Done → ${basePath}/ (${(bytes / 1024 / 1024).toFixed(1)} MB total)\n`,
  )

  await browser.close()
  server.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
