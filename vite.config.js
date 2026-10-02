import fs from 'node:fs'
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
const skipLocalOnlyAssets = {
  name: 'skip-local-only-assets',
  apply: 'build',
  closeBundle() {
    fs.rmSync(fileURLToPath(new URL('./dist/plum', import.meta.url)), {
      recursive: true,
      force: true,
    })
  },
}

export default defineConfig(({ mode }) => {
  // Configurable para cuando el puerto 8787 ya está tomado por otra cosa en
  // la máquina — por defecto sigue siendo el mismo de siempre.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8787'

  return {
    plugins: [react(), tailwindcss(), skipLocalOnlyAssets],
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
