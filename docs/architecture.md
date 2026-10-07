# Arquitectura

Cómo está armado SCROLLLAB, dónde va cada cosa y cómo tocarlo sin romper nada.
Las decisiones y su porqué están en [`docs/adr/`](adr/README.md); acá va el mapa.

## Tres mundos y un núcleo compartido

| Mundo | Qué es | Corre en |
|---|---|---|
| **Market** (`src/`) | El sitio: home, builder, carrito, cuenta, LAB y las demos de los templates | Navegador (Vite + React) |
| **API** (`server/`) | Pagos, órdenes, descargas, login, LAB y suscripciones | Node (Express + Mongo) |
| **ZIP** (lo que se vende) | Código fuente de un template o de una composición | La máquina del comprador |

Los dos primeros comparten un **dominio** (`src/domain/`): JavaScript puro, sin React ni `window`, que importan
el navegador y Node. Ahí vive lo que no puede quedar distinto entre lo que muestra el sitio y lo que cobra el
servidor.

```
src/domain/            precios, qué se vende, secciones (sin dependencias)
      ▲        ▲
      │        └─────────────────────────────┐
src/lib · src/features · src/pages     server/services ← server/http/routes
      │                                      │
 componentes del market                server/repositories ← server/db.js
```

## Regla de dependencia

Se importa **solo hacia abajo**. Lo primero lo hace cumplir ESLint; el resto es convención de revisión:

- `src/domain/` no importa React, GSAP, three, ni `components/`, `pages/`, `hooks/` ni `server/`.
- `server/http/routes/*` traduce HTTP ↔ casos de uso: lee el request, llama a un servicio y responde. **Sin reglas de negocio.**
- `server/services/*` son las reglas de negocio. **No conocen `req` ni `res`.**
- `server/repositories/*` son la persistencia (archivos en desarrollo, Mongo en producción).

## Mapa del servidor

| Dónde | Qué |
|---|---|
| `server/app.js` | Composition root (~135 líneas): middlewares, sesión, Passport y el montaje de los routers |
| `server/http/routes/` | `health`, `auth`, `orders`, `checkout`, `webhooks`, `hosted`, `subscriptions`, `coupons` |
| `server/services/checkout.js` | `createCheckoutOrder`: precios del servidor, cupón, orden y el checkout de la pasarela elegida (Mercado Pago en ARS, Paddle en USD) |
| `server/services/payments.js` | `handleMercadoPagoNotification`: el webhook (pago, reembolso, upgrade de LAB, suscripción) |
| `server/services/paddle.js` · `paddlePayments.js` | Paddle: el adaptador de la API y la firma del webhook (`paddle.js`, como `mercadoPago.js`) y sus casos de uso: cumplir una orden, reembolsos y el webhook (`paddlePayments.js`). Ver [`paddle.md`](paddle.md) |
| `server/services/subscriptions/` | `billing` (períodos y reglas base), `entitlement` (qué puede usar el usuario), `planChange`, `lifecycle` (activar y reemplazar, igual en toda pasarela), `mpSync` (Mercado Pago) y `paddleSync` (Paddle) |
| `server/services/email.js` · `emailTemplates.js` | El envío (Resend, idempotencia) y el contenido de los mails (puro) |
| `server/repositories/` | `users`, `leads`, `orders`, `hosted`, `subscriptions` y `mode` (archivos o Mongo) |
| `server/db.js` | Conexión y ciclo de vida; compone el facade `db` |
| `server/packaging.js` | Arma el ZIP. La marca de agua está en `licenseWatermark.js` y el link firmado en `downloadToken.js` |
| `server/sections.js` · `sectionFields.js` · `catalog.js` | Derivan del dominio qué secciones y props acepta el servidor y el copy de cada producto |
| `server/errors.js` | `HttpError`: una sola clase (el `errorHandler` y el webhook deciden por `instanceof`) |

## Mapa del market

| Dónde | Qué |
|---|---|
| `src/domain/catalog.js` | **Única fuente** de precios, tramos del builder, bundle, cupón y qué SKUs se venden |
| `src/domain/sections.js` | **Única fuente** de las secciones: id, tipo y orden de la paleta |
| `src/lib/sectionFields.js` | **Única fuente** de los campos editables de cada sección (el servidor deriva de acá lo que acepta) |
| `src/pages/` | Una página por ruta: estado, datos y las animaciones de scroll |
| `src/features/home/`, `src/features/builder/` | Los bloques de la home y del builder; la página los compone |
| `src/components/sections/<modelo>/` | Las secciones de cada template. **Viajan al ZIP tal cual** |

## Restricciones que vienen del ZIP

Lo que se vende es el ZIP, no el repo. Por eso:

- Las secciones se copian **verbatim**: no se reescriben rutas de import al empaquetar.
- `server/packaging.js` copia `SHARED` + la carpeta de la sección y **no sigue imports relativos**: una sección de un template a la venta no puede importar `components/ui/*` ni `lib/utils`.
- No se mueven de lugar los archivos de `SHARED` (`src/lib/gsap.js`, `motion.js`, `hooks/useLenis.js`, `components/SmoothScrollProvider.jsx`, `index.css`, `main.jsx`…) ni `src/components/sections/**`.
- `src/lib/beat/` no entra al ZIP (es parte del valor del builder).

## Cómo agregar…

| Quiero… | Tocar |
|---|---|
| Un precio o un tramo del builder | Solo `src/domain/catalog.js`. `npm run check` valida que la base supere al template más caro en venta |
| Una sección nueva | `src/domain/sections.js` (id y tipo) → `src/lib/sectionRegistry.jsx` (componente, nombre, blurb) → sumar el id a `APPROVED` en `server/__tests__/sections.test.js` → campos editables en `src/lib/sectionFields.js` → i18n del builder. Ver el detalle en `AGENTS.md` |
| Un campo editable | Solo `src/lib/sectionFields.js`. Un campo de color se llama `bg`/`fg`/`accent`… y uno de link termina en `Href`: el servidor valida por nombre y `check` lo exige |
| Una ruta de la API | Un servicio en `server/services/` y la ruta en el router de su dominio. Sumarla a `EXPECTED` en `server/__tests__/routes.test.js` |
| Un mail | La plantilla en `emailTemplates.js` y el envío en `email.js` |
| Una zona de la home o un bloque del builder | Un componente en `src/features/<feature>/`; la página lo monta |

## Cómo se verifica

`npm run verify` es el gate antes de cada commit: **lint → typecheck → test → check**.

| Red | Qué cubre |
|---|---|
| `npm run lint` | Reglas de React y de Node; el dominio sin dependencias de UI; `crypto` explícito en el servidor |
| `npm run typecheck` | Tipos JSDoc sobre `src/domain/` y `server/` (ver [ADR 0004](adr/0004-tipos-jsdoc.md)) |
| `npm test` | Unitarios, API con el Mercado Pago simulado, empaquetado de cada modelo |
| `npm run check` | Invariantes que ningún test cubre: precios, secciones, props editables, i18n, rutas |
| `npm run check:builder` | El editor del builder cambia lo que se ve (Chromium) |
| `npm run check:lab` | LAB de punta a punta: editar, previsualizar, publicar, verlo en un sitio ajeno |
| `npm run check:visual` | Lo que haría el comprador: `npm install`, `vite build` y Chromium sobre cada ZIP (lento) |
| `npm run check:mp-sandbox` | Suscripciones contra el sandbox real de Mercado Pago (pide credenciales de prueba) |
| `npm run ssr:snapshot` | El HTML que React renderiza en el servidor: la red de los refactors de UI |

Ninguna de estas redes reemplaza mirar en pantalla un cambio visual.

## Refactorizar sin romper

El método con el que se hizo esta reorganización ([ADR 0005](adr/0005-refactors-con-foto.md)):

1. **Foto antes.** Un script que ejercita el comportamiento y guarda el resultado normalizado (ids y fechas
   enmascarados): la API de la base en archivos y en Mongo real, los 17 ZIP por SHA-256, los mails, el flujo de
   dinero con el Mercado Pago simulado, el HTML de las páginas.
2. **Comprobar que la foto es determinista** (dos corridas, mismo resultado) y que **detecta un cambio hecho a
   propósito**. Una foto que no muerde no prueba nada.
3. **Mover literal**, con sustituciones contadas: el script aborta si el número de reemplazos no es el esperado.
4. **Foto después** y comparar. `verify` en cada commit, uno por paso.

## Deuda conocida y próximos pasos

- **`strict` completo**: `strictNullChecks` ya está prendido (los 21 errores iniciales se revisaron de a uno: ninguno era un
  bug, todos eran un chequeo que el código ya hacía y TypeScript no veía). Falta `noImplicitAny` y el resto de `strict`, y
  sumar carpetas a `include` (`src/lib`, `src/features`).
- **Mongo en los tests**: no hay. Las ramas de Mongo de `server/repositories/` se probaron contra un `mongod` descartable
  con una foto de 105 pasos, pero esa foto no vive en el repo. Sumar `mongodb-memory-server` o un `mongod` en CI la
  volvería permanente.
- **El almacén de archivos (solo desarrollo) no replica a Mongo**: acepta duplicados y un pago ya usado en otra orden
  (Mongo los rechaza con sus índices únicos). En producción no importa; en desarrollo puede esconder un error.
- **Cuatro campos de color de FIZZ** (`NavFizz.menuBg/menuInk`, `FlavorWorlds.startBg/startInk`) se validan en el servidor
  como texto libre: no se llaman como las claves de color que reconoce. Están listados en `scripts/check-consistency.mjs`.
- **Componentes sueltos de `src/components/`** (carrito, LAB, cuenta…) siguen en una sola carpeta. Moverlos por feature
  toca muchos imports en archivos que se editan seguido; el beneficio es menor que el de lo ya hecho.
- **Node ≥ 22**: con Node 20 los tests y `ssr:snapshot` se relanzan con `--experimental-detect-module` (gsap es ESM en un
  paquete sin `"type": "module"`).
