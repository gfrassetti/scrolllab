#!/usr/bin/env node
/**
 * FOLD — the phone tier.
 *
 * A phone held upright shows about a quarter of a 16:9 frame (the canvas is
 * covered by the frame, cropped at the shot's `focus`): three quarters of every
 * picture a phone downloads is never drawn. This cuts a band around each shot's
 * focus out of the 768 px frames — only the ORIGINAL pictures (every
 * `interp`-th: the engine blends each one into the next on a phone) — and
 * writes them as `public/fold/film/phone/f_NNNN.webp`, plus a `phone` entry in
 * the manifest that says where each band came from. About 2.5× fewer bytes for
 * exactly the same picture on the screen.
 *
 *   node scripts/fold-phone-tier.mjs                       # reel in public/fold/film
 *   node scripts/fold-phone-tier.mjs --reel public/fold/film --half 0.22 --quality 55
 *   node scripts/fold-phone-tier.mjs --focus build=0.64,town=0.55   # override score.js
 *
 * `focus` comes from score.js (`scenes[].focus`, else `portraitFocus`), so the
 * band follows the score. The engine only uses this tier on a portrait screen
 * (aspect ≤ 0.6); wider screens keep using the 768 tier.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const reelDir = path.resolve(root, opt('reel', 'public/fold/film'))
const half = Number(opt('half', '0.22'))
const quality = Number(opt('quality', '55'))
const manifestPath = path.join(reelDir, 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error(`No manifest at ${manifestPath} — build the reel first (npm run fold:reel).`)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const srcTier = '768'
if (!manifest.tiers?.[srcTier]) {
  console.error(`The reel has no ${srcTier} tier.`)
  process.exit(1)
}
const interp = manifest.interp || 1
const pad = 4

// Focus per take: score.js (one source of truth), or --focus build=0.64,town=0.55.
const scoreText = fs.readFileSync(path.join(root, 'src/components/sections/fold/score.js'), 'utf8')
const portraitFocus = Number(/portraitFocus:\s*([0-9.]+)/.exec(scoreText)?.[1] ?? 0.5)
const focus = {}
for (const m of scoreText.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?focus:\s*([0-9.]+)/g)) focus[m[1]] = Number(m[2])
for (const pair of opt('focus', '').split(',').filter(Boolean)) {
  const [id, v] = pair.split('=')
  focus[id] = Number(v)
}

const outDir = path.join(reelDir, 'phone')
fs.mkdirSync(outDir, { recursive: true })
const name = (i) => `f_${String(i + 1).padStart(pad, '0')}.webp`

const crop = {}
let files = 0
let bytes = 0
let width = 0
let height = 0
for (const scene of manifest.scenes) {
  const f = focus[scene.id] ?? portraitFocus
  const x0 = Math.min(1 - 2 * half, Math.max(0, f - half))
  crop[scene.id] = [Number(x0.toFixed(4)), Number((x0 + 2 * half).toFixed(4))]
  const wanted = []
  for (let k = scene.start; k < scene.start + scene.count; k += interp) wanted.push(k)
  const last = scene.start + scene.count - 1
  if (wanted[wanted.length - 1] !== last) wanted.push(last)
  for (const i of wanted) {
    const src = path.join(reelDir, srcTier, name(i))
    const meta = await sharp(src).metadata()
    const left = Math.round(crop[scene.id][0] * meta.width)
    const w = Math.min(meta.width - left, Math.round(2 * half * meta.width))
    width = w
    height = meta.height
    const buf = await sharp(src).extract({ left, top: 0, width: w, height: meta.height }).webp({ quality, effort: 5 }).toBuffer()
    fs.writeFileSync(path.join(outDir, name(i)), buf)
    files += 1
    bytes += buf.length
  }
  console.log(`${scene.id}: focus ${f} → band ${crop[scene.id][0]}–${crop[scene.id][1]}, ${wanted.length} pictures`)
}

manifest.phone = { step: interp, half, width, height, quality, crop }
const tmp = `${manifestPath}.tmp`
fs.writeFileSync(tmp, JSON.stringify(manifest))
fs.renameSync(tmp, manifestPath)

// Long cache for the new folder, next to the others (Cloudflare / Netlify `_headers`).
const headersPath = path.join(reelDir, '_headers')
if (fs.existsSync(headersPath)) {
  const text = fs.readFileSync(headersPath, 'utf8')
  if (!/^\/phone\/\*/m.test(text)) {
    fs.writeFileSync(headersPath, `${text.replace(/\s*$/, '\n')}\n/phone/*\n  Cache-Control: public, max-age=31536000, immutable\n`)
  }
}

const mb = (bytes / 1e6).toFixed(1)
const all768 = fs.readdirSync(path.join(reelDir, srcTier)).length
console.log(`\n${files} pictures, ${width}×${height}, ${mb} MB (avg ${(bytes / files / 1024).toFixed(1)} KB) — the 768 tier's originals are ~${((files / all768) * 100).toFixed(0)}% of its files`)
