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
npm run pack:templates # prebuild catalog ZIPs for chapters/nocturne/monolith
```

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
