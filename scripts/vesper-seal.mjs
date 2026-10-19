#!/usr/bin/env node
/**
 * VESPER (la vitrina del Estudio): sella los modelos y las imágenes para que no se puedan bajar tal cual.
 *
 *   node scripts/vesper-seal.mjs
 *
 * Lee los originales de public/proto/kanvas/ (gitignored: nunca entran al repo ni al build) y escribe:
 *   · public/proto/kanvas/s/<id>.bin — cada archivo cifrado (AES-256-GCM: iv de 12 bytes, el cifrado y
 *     la etiqueta). Archivos estáticos: los sirve la CDN como cualquier otro (rápido y con caché); sin la
 *     clave no sirven de nada. El id sale del contenido, así se pueden cachear para siempre.
 *   · src/proto/kanvas/seal.js — la clave y el mapa nombre → id que usa la página para descifrar en
 *     memoria (src/proto/kanvas/sealed.js). En producción ese código sale ofuscado (vite.config.js).
 *
 * Además firma cada pieza: el GLB lleva el copyright en `asset.copyright` (glTF) y las imágenes, el
 * copyright en sus metadatos y una marca casi invisible en una esquina. Si una aparece en otro sitio,
 * se puede probar de dónde salió.
 *
 * La clave se genera una vez y se reutiliza (si cambiara, cambiarían todos los .bin). El iv sale del
 * contenido: el mismo archivo da el mismo .bin, así git no ve cambios si nada cambió.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'public/proto/kanvas')
const OUT = path.join(ROOT, 'public/proto/kanvas/s')
const SEAL_FILE = path.join(ROOT, 'src/proto/kanvas/seal.js')
const COPYRIGHT = '© 2026 ScrollLab Estudio — VESPER. All rights reserved. scrolllab.com.ar'

const ASSETS = [
  'hero/field.glb',
  'hero/raider.glb',
  'hero/man.glb',
  'hero/card-still.webp',
  'hero/card-reel.webp',
  'hero/rough.webp',
  'isle-drawn.glb',
  'relic-lantern.glb',
  ...Array.from({ length: 12 }, (_, i) => `keepers/k${String(i).padStart(2, '0')}.webp`),
]

function readKey() {
  if (!fs.existsSync(SEAL_FILE)) return crypto.randomBytes(32)
  const m = fs.readFileSync(SEAL_FILE, 'utf8').match(/k: '([0-9a-f]{64})'/)
  return m ? Buffer.from(m[1], 'hex') : crypto.randomBytes(32)
}

/** El copyright dentro del JSON del GLB (`asset.copyright`), con el relleno que pide el formato. */
function signGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('no es un GLB')
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  json.asset = { ...json.asset, copyright: COPYRIGHT }
  let text = Buffer.from(JSON.stringify(json), 'utf8')
  const pad = (4 - (text.length % 4)) % 4
  text = Buffer.concat([text, Buffer.alloc(pad, 0x20)])
  const rest = buf.subarray(20 + jsonLen)
  const head = Buffer.alloc(20)
  head.writeUInt32LE(0x46546c67, 0)
  head.writeUInt32LE(2, 4)
  head.writeUInt32LE(20 + text.length + rest.length, 8)
  head.writeUInt32LE(text.length, 12)
  head.writeUInt32LE(0x4e4f534a, 16)
  return Buffer.concat([head, text, rest])
}

/** La imagen con el copyright en sus metadatos y una marca al 6 % en la esquina de abajo a la derecha. */
async function signImage(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  const fs2 = Math.max(9, Math.round(width / 70))
  const mark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width - fs2}" y="${height - fs2}" text-anchor="end" font-family="monospace" font-size="${fs2}" fill="rgba(31,24,16,0.06)">© ScrollLab Estudio · VESPER</text></svg>`,
  )
  return img
    .composite([{ input: mark }])
    .withExifMerge({ IFD0: { Copyright: COPYRIGHT, Artist: 'ScrollLab Estudio' } })
    .webp({ quality: 88 })
    .toBuffer()
}

function seal(key, plain) {
  const iv = crypto.createHash('sha256').update(key).update(plain).digest().subarray(0, 12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  return Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()])
}

const key = readKey()
fs.mkdirSync(OUT, { recursive: true })
const map = {}
let bytes = 0
for (const name of ASSETS) {
  const file = path.join(SRC, name)
  if (!fs.existsSync(file)) throw new Error(`falta el original: ${path.relative(ROOT, file)}`)
  const signed = name.endsWith('.glb') ? signGlb(fs.readFileSync(file)) : await signImage(file)
  const out = seal(key, signed)
  const id = crypto.createHash('sha256').update(out).digest('hex').slice(0, 20)
  fs.writeFileSync(path.join(OUT, `${id}.bin`), out)
  map[name] = id
  bytes += out.length
}
// los .bin que ya no corresponden a nada
const keep = new Set(Object.values(map).map((id) => `${id}.bin`))
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.bin') && !keep.has(f)) fs.rmSync(path.join(OUT, f))

const body = `// Generado por scripts/vesper-seal.mjs: no editar a mano. La clave y el mapa de las piezas selladas de
// VESPER (src/proto/kanvas/sealed.js las descifra en memoria). En producción, este código sale ofuscado.
export const SEAL = {
  k: '${key.toString('hex')}',
  m: ${JSON.stringify(map, null, 4).replace(/\n}/, '\n  }')},
}
`
fs.writeFileSync(SEAL_FILE, body)
console.log(`sellados ${ASSETS.length} archivos (${(bytes / 1048576).toFixed(1)} MB) → ${path.relative(ROOT, OUT)}`)
