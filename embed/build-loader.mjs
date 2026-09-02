/*
 * Minifica embed/loader/loader.js → embed-dist/v1/loader.js
 * El loader es el archivo que el cliente pinea con SRI: chico, sin deps,
 * estable. `npm run build:loader`
 *
 * Escribe también embed-dist/v1/manifest.json { version, integrity, bytes }
 * para que el server lo lea y arme el snippet con el hash correcto.
 *
 * Y embed-dist/_headers + _redirects para Cloudflare Pages / Netlify: CORS
 * abierto (el <script> se pide con crossorigin por el SRI) y un rewrite de
 * /embed/* → /* para que la URL pública sea .../embed/v1/loader.js igual que
 * en el self-host desde la API. Ver embed/README.md#deploy.
 */
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import crypto from 'node:crypto'

const here = path.dirname(fileURLToPath(import.meta.url))
const VERSION = 'v1'
const embedRoot = path.resolve(here, '../embed-dist')
const outDir = path.join(embedRoot, VERSION)
const outfile = path.join(outDir, 'loader.js')
mkdirSync(outDir, { recursive: true })

await build({
  entryPoints: [path.resolve(here, 'loader/loader.js')],
  outfile,
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2018',
  legalComments: 'none',
})

const bytes = readFileSync(outfile)
const integrity =
  'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64')

writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({ version: VERSION, integrity, bytes: bytes.length }, null, 2) + '\n',
)

// Cloudflare Pages / Netlify leen estos en la raíz del publish (embed-dist/).
writeFileSync(
  path.join(embedRoot, '_headers'),
  [
    '/*',
    '  Access-Control-Allow-Origin: *',
    '  Cross-Origin-Resource-Policy: cross-origin',
    // Corto mientras se itera pre-lanzamiento. En producción: subir a
    // `immutable` con disciplina de versión (v2/ = carpeta nueva).
    '  Cache-Control: public, max-age=60',
    '',
  ].join('\n'),
)
writeFileSync(
  path.join(embedRoot, '_redirects'),
  '/embed/*  /:splat  200\n',
)

console.log(`loader.js  ${bytes.length} B`)
console.log(`integrity  ${integrity}`)
