import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * PLUM no sale a producción (no se va a terminar; LOCAL_ONLY_SKUS en
 * src/lib/pricing.js): sus ~32 MB de frames en public/plum quedan para la demo
 * local y no viajan en el build.
 */
let outDir = fileURLToPath(new URL('./dist', import.meta.url))
const skipLocalOnlyAssets = {
  name: 'skip-local-only-assets',
  apply: 'build',
  configResolved(config) {
    outDir = path.resolve(config.root, config.build.outDir)
  },
  closeBundle() {
    fs.rmSync(fileURLToPath(new URL('./dist/plum', import.meta.url)), {
      recursive: true,
      force: true,
    })
    // VESPER: los originales sin cifrar (si hay una copia local) no viajan; solo el decodificador Draco.
    // Las piezas van selladas por la API (scripts/vesper-seal.mjs).
    const kanvas = path.join(outDir, 'proto/kanvas')
    if (fs.existsSync(kanvas)) {
      for (const f of fs.readdirSync(kanvas)) {
        if (f !== 'draco') fs.rmSync(`${kanvas}/${f}`, { recursive: true, force: true })
      }
    }
  },
}

/**
 * VESPER es la vitrina del Estudio, no se vende: su código sale ofuscado en producción (no se puede leer
 * para copiarlo). Solo los chunks con módulos de src/proto/kanvas/; el resto del sitio queda igual. Los
 * templates que se venden nunca se ofuscan (el ZIP es código fuente).
 */
const obfuscateShowcase = {
  name: 'obfuscate-showcase',
  apply: 'build',
  async renderChunk(code, chunk) {
    const ids = chunk.moduleIds || Object.keys(chunk.modules || {})
    if (!ids.some((id) => id.replace(/\\/g, '/').includes('/src/proto/kanvas/'))) return null
    const { default: JavaScriptObfuscator } = await import('javascript-obfuscator')
    const out = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      target: 'browser',
      identifierNamesGenerator: 'hexadecimal',
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      splitStrings: true,
      splitStringsChunkLength: 12,
      // lo que cuesta en cada cuadro queda afuera: el bucle corre 60 veces por segundo
      controlFlowFlattening: false,
      deadCodeInjection: false,
      selfDefending: false,
      renameGlobals: false,
      sourceMap: false,
    })
    return { code: out.getObfuscatedCode(), map: null }
  },
}

export default defineConfig(({ mode }) => {
  // Configurable para cuando el puerto 8787 ya está tomado por otra cosa en
  // la máquina — por defecto sigue siendo el mismo de siempre.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8787'

  return {
    // El caché de dependencias, configurable: el barrido de QA corre en una copia
    // limpia del repo que usa el node_modules real por un link, y dos Vite con el
    // mismo `node_modules/.vite` se borran el caché entre sí (EPERM / ENOTEMPTY /
    // 504 en /node_modules/.vite/deps). Cada copia le pasa el suyo (ADR 0007).
    ...(process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {}),
    plugins: [react(), tailwindcss(), skipLocalOnlyAssets, obfuscateShowcase],
    resolve: {
      // Alias `@/` → src/. Lo pide el CLI/MCP de shadcn (componentry.dev).
      // OJO: NO usar `@/` dentro de src/components/sections/* — esas secciones
      // se copian verbatim al ZIP que compra el cliente y su proyecto no tiene
      // este alias. Ahí van imports relativos. Ver docs/motion-componentry.md.
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
