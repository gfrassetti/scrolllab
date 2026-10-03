/**
 * `npm test`: corre cada `*.test.js` de las carpetas de tests con `node --test`.
 * Descubre los archivos en vez de listarlos en package.json — con la lista a
 * mano, un test nuevo que nadie sumaba no corría nunca (webgl.test.js).
 * Los e2e (`*.e2e.mjs`) no entran: van por `npm run test:e2e`.
 * Args extra pasan a `node --test` (p. ej. `npm test -- --test-only`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TEST_DIRS = [
  'server/__tests__',
  'src/lib/__tests__',
  'embed/loader/__tests__',
  'embed/__tests__',
]

const files = TEST_DIRS.flatMap((dir) =>
  fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.test.js'))
    .sort()
    .map((f) => `${dir}/${f}`),
)

// `gsap/ScrollTrigger.js` es ESM en un paquete sin `"type": "module"`: Node
// ≥ 22.7 lo detecta solo; en Node 20 hace falta el flag (motion.js lo importa).
const nodeMajor = Number(process.versions.node.split('.')[0])
const nodeFlags = nodeMajor < 22 ? ['--experimental-detect-module'] : []

const result = spawnSync(
  process.execPath,
  [...nodeFlags, '--test', ...process.argv.slice(2), ...files],
  { cwd: ROOT, stdio: 'inherit' },
)
process.exit(result.status ?? 1)
