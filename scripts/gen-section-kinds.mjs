/**
 * Regenera src/lib/sectionKinds.js desde sectionRegistry.jsx.
 * Uso: node scripts/gen-section-kinds.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(ROOT, 'src/lib/sectionRegistry.jsx'), 'utf8')

const map = new Map()
for (const match of src.matchAll(
  /id:\s*'([a-z]+\/[A-Za-z0-9]+)'[\s\S]*?kind:\s*'([^']+)'/g,
)) {
  if (!map.has(match[1])) map.set(match[1], match[2])
}

const lines = [...map].map(([id, kind]) => `  '${id}': '${kind}',`).join('\n')

const out = `/**
 * Mapa plano id → kind. Vive aparte del registry (que importa React) para que
 * composition.js y sus tests puedan correr en Node sin transformar JSX.
 *
 * Mantener en sync con src/lib/sectionRegistry.jsx:
 *   node scripts/gen-section-kinds.mjs
 * \`npm run check\` también lo verifica.
 */
export const SECTION_KINDS = {
${lines}
}

export function sectionKindOf(sectionId) {
  return SECTION_KINDS[sectionId]
}

export function isKnownSection(sectionId) {
  return Object.prototype.hasOwnProperty.call(SECTION_KINDS, sectionId)
}
`

fs.writeFileSync(path.join(ROOT, 'src/lib/sectionKinds.js'), out)
console.log(`sectionKinds.js — ${map.size} secciones`)
