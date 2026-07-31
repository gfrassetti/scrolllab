# AGENTS.md — SCROLLLAB (storytelling-pages-templates)

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un **ZIP con código fuente** + `LICENSE.txt` (watermark con orden/email). Pagos: Mercado Pago Checkout Pro. Auth: Google (o login de desarrollo).

**Language convention**: product chrome (catalog, builder, cart, account) in Spanish with rioplatense voseo; template placeholder content stays in English. Brand: `src/lib/site.js` → `SCROLLLAB`.

## Stack & commands

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three (vanilla in monolith)
- Express API (`server/`) + MongoDB + Passport Google OAuth + Mercado Pago SDK
- Zustand cart (UX only; prices validated server-side)

```
npm run dev            # Vite + API (concurrently)
npm run dev:web        # only Vite
npm run dev:api        # only Express
npm run build
npm run start          # API production
npm test               # API unit + HTTP tests
npm run check          # invariantes cruzadas (precios, secciones, props, i18n, rutas)
npm run pack:templates # prebuild catalog ZIPs for chapters/nocturne/monolith
npm run check:visual   # instala, compila y fotografía cada ZIP (lento, ~2 min)
npm run check:builder  # el editor del builder aplica los cambios (Chromium)
```

Lo que se vende es el ZIP, no el repo, y el repo compila aunque el ZIP esté
roto. Dos redes lo cubren:

- `server/__tests__/packaging.test.js` (dentro de `npm test`) empaqueta cada
  modelo, lo abre y verifica imports, archivos de arranque y dependencias.
- `npm run check:visual` hace lo que haría el comprador: `npm install`, `vite
  build` y Chromium, con capturas en `storage/visual-check/`.

El editor del builder tiene su propia red: `check:builder`. Varias secciones
animan el texto con SplitText, que reemplaza el DOM del nodo; a partir de ahí
React no puede actualizar ese texto. El preview remonta la sección cuando las
props se estabilizan (`CompositionCanvas`). Si tocás esa lógica, corré
`npm run check:builder`.

Reglas que salen de bugs reales: las secciones se copian **verbatim** (nunca
reescribas rutas de import al empaquetar) y el `package.json` del template se
**genera** a partir de los imports del código — copiar el del marketplace le
mandaba al comprador un `npm run dev` que arrancaba `nodemon server/index.js`.

Copy `.env.example` → `.env`. Without `MP_ACCESS_TOKEN`, checkout uses mock pay. Without Google creds, use “Login de desarrollo”. Deploy notes: `docs/DEPLOY.md`.

## Market flow

1. User logs in (`/login`) → session cookie.
2. Adds SKU to cart (Zustand) or buys builder recipe (`custom:` + recipe array).
3. `POST /api/checkout` creates Order + MP preference (or mock URL).
4. Webhook / mock-pay marks `paid` and packs ZIP into `storage/orders/` with watermarked LICENSE.
5. `/account` → signed download token → `GET /api/download/:token` (TTL + max 10 downloads).

## Architecture (extra)

```
server/
├── index.js              # boot + graceful shutdown
├── app.js                # Express app factory (testable)
├── config.js             # env validation (fail-fast in prod)
├── middleware.js         # helmet, CORS, origin CSRF, rate limits
├── validation.js         # cart / recipe allowlist
├── sections.js           # sellable section IDs
├── catalog.js            # server prices (ARS)
├── models.js             # User, Order (mongoose)
├── packaging.js          # ZIP pack + signed tokens
├── license.js
├── services/
│   ├── mercadoPago.js
│   └── orders.js
└── __tests__/
src/lib/
├── api.js
├── auth.jsx
└── cart.js
```

Never trust client prices. Never obfuscate sold JSX — license + account + signed links + watermark.
In production: Mongo required (no silent file fallback), mock/dev auth off, MP webhook signature required, persistent `STORAGE_DIR`.

## Template models / section conventions

(Same as before: self-contained sections, `lib/gsap.js`, reduced motion, matchMedia for heavy scroll.)

Register new sellable SKUs in `server/catalog.js` and pack logic in `server/packaging.js`. Keep `server/sections.js` in sync with `src/lib/sectionRegistry.jsx`.

## Second brain — graphify + Obsidian

Cursor, graphify y Obsidian se usan **juntos**, no como alternativas:

| Capa | Rol | Dónde |
|---|---|---|
| **graphify** (máquina) | Orientación del agente antes de explorar código | `graphify-out/` + CLI |
| **Obsidian** (humano + notas) | Segundo cerebro visual: Graph view, canvas, anotaciones | bóveda **ScrollLab** |
| **Cursor** | Implementa; se apoya en graphify primero y en notas Obsidian si aportan decisión/contexto | este repo |

### Flow obligatorio para el agente

1. Pregunta de arquitectura / “dónde está X” / dependencias → `graphify query`, `path` o `explain` (ver `.cursor/rules/graphify.mdc`).
2. Si hace falta narrativa o decisión ya anotada → leer notas en la bóveda Obsidian (abajo).
3. Recién después: `Read` / `Grep` sobre archivos concretos para editar.
4. Tras cambiar código estructuralmente → `graphify update .` (AST, sin API key).
5. Si el usuario pide re-sync del vault →  
   `graphify export obsidian --graph graphify-out/graph.json --dir "C:\Users\Guido\Documents\Obsidian\ScrollLab"`

### Bóveda canónica (usar solo esta)

- **ScrollLab** → `C:\Users\Guido\Documents\Obsidian\ScrollLab`
- Entrada visual: `graph.canvas` o Graph view (`Ctrl+G`)
- Ignorar bóvedas duplicadas `graphify` / `obsidian` salvo que el usuario diga lo contrario

Obsidian **no reemplaza** `graphify-out/`; lo complementa. El agente no “abre” Obsidian UI: lee los `.md` del vault cuando aportan contexto.
