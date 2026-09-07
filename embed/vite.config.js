import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// Las secciones importan assets por default (import png from './assets/x.png').
// En el embed las imágenes vienen SIEMPRE de la config (props con URLs), así que
// los defaults se stubean a `''` para no arrastrar PNGs de MB al bundle. String
// vacío = falsy: cada sección hosteable guarda su `<img>` con `src ? <img> :
// fallback`, así que un default sin imagen cae al SVG/estado sin foto en vez de
// mostrar un pixel roto.
const stubMedia = {
  name: 'embed-stub-media',
  enforce: 'pre',
  resolveId(id) {
    if (/\.(png|jpe?g|webp|gif|avif|svg|glb|gltf|mp4|webm)(\?.*)?$/.test(id)) {
      return '\0stub-media:empty'
    }
    return null
  },
  load(id) {
    if (id === '\0stub-media:empty') return 'export default ""'
    return null
  },
}

/**
 * Build de la página que va DENTRO del iframe (embed/frame/index.html).
 * App normal (no lib): Vite maneja HTML, CSS y hashing. Corre en nuestro
 * origen, así que sin hacks de shadow root.
 *
 * Sale a `embed-dist/` (fuera de `dist/`) para que `vite build` del sitio, que
 * vacía `dist/`, no se lo lleve puesto.
 *
 * `npm run build:embed`  → embed-dist/v1/frame/
 * `npm run build:loader` → embed-dist/v1/loader.js  (embed/build-loader.mjs)
 */
export default defineConfig({
  root: path.resolve(here, 'frame'),
  base: './', // se sirve desde /frame/ o /embed/v1/frame/ — rutas relativas
  publicDir: false,
  plugins: [stubMedia, tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: [
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/jsx-dev-runtime' },
      // gsap del sitio → versión sin MotionPath ni wrapper de debug
      {
        find: '../../../lib/gsap',
        replacement: path.resolve(here, 'src/gsap.js'),
      },
    ],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    // Versionado inmutable: /embed/v1/frame/… nunca cambia de bytes.
    outDir: path.resolve(here, '../embed-dist/v1/frame'),
    emptyOutDir: true,
    target: 'es2019',
    modulePreload: { polyfill: false },
  },
})
