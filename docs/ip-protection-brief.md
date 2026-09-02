# IP Protection — brief (que nadie copie SCROLLLAB)

> Política de protección del producto: **cada template y cada section** que
> SCROLLLAB vende o muestra. Cubre código, diseño, motion, y el mini-motor
> (`Beat`, `webgl`). Este doc es la política; el EULA real lo redacta un abogado,
> el código y el flujo de venta lo implementan.

---

## 1. Qué se protege

- **Código de cada section** (`src/components/sections/<sku>/`) y de cada
  **template** (`src/pages/<Sku>Page.jsx` + composición).
- **El mini-motor de motion** — `src/lib/beat/` (riel + seek), `src/lib/webgl/`
  (stage + orbit + cover plane). Es el diferencial técnico.
- **El builder** — la lógica de composición, pricing, packaging.
- **El diseño** — escala tipográfica, paletas-firma, coreografía de scroll,
  arte propio de cada modelo.
- **El sitio demo** — `/templates/*`, los previews del builder.

---

## 2. Modelo de amenaza

| Amenaza | Vector |
|---|---|
| Comprador redistribuye el ZIP | Sube el código a GitHub, lo revende, lo regala |
| Comprador arma su propio "template" con nuestras sections y lo vende | Repackaging |
| Competidor scrapea el sitio demo | Copia el bundle minificado del preview |
| Reconstrucción desde el render | Alguien mira el demo y reescribe la section |
| Clonado asistido por IA | "Reconstruí esta section a partir de estos scripts" |
| Ingeniería inversa del builder | Para clonar el servicio, no una section |

---

## 3. Capas de protección

### 3.1 Legal — EULA por venta (una sola licencia por compra)

El comprador **puede**: usar la section/template en **1 proyecto** (o N según
tier), modificarlo, deployarlo, quedárselo para siempre.

El comprador **no puede**:
- Redistribuir el código (público o privado), revenderlo, regalarlo, sublicenciarlo.
- Crear templates/sections **para vender** que deriven del código comprado.
- Publicar el código en un repo abierto, un marketplace, un "starter kit".
- Hacer ingeniería inversa del **builder** o del pipeline de packaging.
- Usar el mismo ZIP en más proyectos que los que cubre el tier.

Cada venta lleva un **número de licencia** atado al comprador (ya existe:
`LicensePage`, `docs/legal`). El EULA se acepta en el checkout y viaja en el ZIP
(`LICENSE.txt` con el número y los términos).

### 3.2 El motor NO viaja en el ZIP vendido

`src/lib/beat/*` **nunca** se empaqueta al comprador — es plusvalía del builder/
demo (ya es política: `docs/scrolllab-beat.md`, `SHARED` en `server/packaging.js`).
El comprador recibe el motion **porteado a GSAP plano**, no el riel + seek. Idem
cualquier subsistema que sea el diferencial: si una section lo necesita para el
ZIP, se porta a una versión sin el motor.

`src/lib/webgl/*` sí viaja **solo si** la section lo importa — es más commodity
(Three.js stock), pero aun así minificado en el build.

### 3.3 Hosted Component — el moat real

Para las sections que se ofrecen hosteadas (`docs/hosted-component-plan.md`): el
código **nunca sale de nuestro lado**. Se sirve desde el CDN con un `<script>`,
con **key revocable** + **domain-lock**. Suscripción. Si el cliente deja de pagar
o abusa, la key se corta y el embed deja de renderizar. Esta es la vía donde el
código es genuinamente inaccesible; el ZIP siempre es "confianza + EULA".

### 3.4 Sitio demo — reducir la superficie

- `/templates/*` y `/builder` marcados **`noindex`** (ya está — `check-consistency`
  valida el sitemap/robots).
- Bundle del demo **minificado + sin sourcemaps** en producción (`vite build`).
- El demo muestra el resultado; el **source completo** solo está en el ZIP pago /
  el hosted. Nunca un `/src` navegable ni un repo público del front.
- Assets del demo servidos con `Cache-Control` corto y, para el hosted, detrás de
  la validación de `Origin`/`Referer`.
- Opcional (teatro, poco valor real): deshabilitar menú contextual / devtools —
  no frena a nadie serio, no vale el costo de UX.

### 3.5 Fingerprint / trazabilidad

- El número de licencia embebido en el ZIP (`LICENSE.txt` **y** un encabezado
  `SCROLLLAB-LICENSE <orden>` en `src/App.jsx` — `stampApp` en
  `server/packaging.js`) hace que una copia filtrada sea **trazable** al comprador
  original aunque borren el `LICENSE.txt`. El token es estable a propósito para
  buscar filtraciones en GitHub / marketplaces.
- Log de descargas por orden (`order.downloads[]`: fecha + IP de cada descarga,
  últimas 50; `db.consumeDownloadAtomic`) — quién bajó qué y cuándo.

---

## 4. Qué SÍ puede hacer un comprador (para que la licencia no sea hostil)

- Usar la section/template en su proyecto y modificarlo todo lo que quiera.
- Deployarlo en cualquier host, con o sin cambios.
- Reusar componentes internos dentro **del mismo proyecto**.
- Contratar a un tercero para que lo modifique **para ese proyecto** (el tercero
  no puede quedarse el código para otros).

La línea es **redistribución y reventa**, no uso.

---

## 5. Enforcement

1. **DMCA / takedown** sobre repos públicos o listings que redistribuyan el código
   (el fingerprint identifica la fuente).
2. **Revocación de key** inmediata para instancias hosteadas que violen el domain-
   lock o el pago.
3. **Baneo de cuenta** + bloqueo de compras futuras para redistribución probada.
4. El EULA habilita reclamo por daños; el número de licencia es la evidencia.

---

## 6. Qué implementar (estado)

| Item | Estado |
|---|---|
| `LICENSE.txt` con número + términos en cada ZIP | ✅ (`server/packaging.js` → `buildLicenseText` en fixed / bundle / custom) |
| EULA completo en el ZIP (permisos + prohibiciones + enforcement, espeja `LicensePage`) | ✅ borrador en `server/license.js` — **falta revisión de abogado** para la redacción final |
| `noindex` en `/templates/*` + `/builder` | ✅ (validado en `check-consistency`) |
| Minificación + sin sourcemaps en prod | ✅ (`vite build` default) |
| `src/lib/beat` fuera del ZIP | ✅ política + test en `packaging.test.js` |
| Fingerprint trazable en el ZIP | ✅ (`LICENSE.txt` + encabezado `SCROLLLAB-LICENSE <orden>` embebido en `src/App.jsx`, test en `packaging.test.js`) |
| Hosted Component (key + domain-lock) | pendiente (`docs/hosted-component-plan.md`) |
| Log de descargas por orden | ✅ (`order.downloads[]` con fecha + IP, últimas 50; `consumeDownloadAtomic`, test en `api.test.js`) |

---

## 7. Relación con [`reference-ip-brief.md`](reference-ip-brief.md)

Son las dos caras:
- **`reference-ip-brief.md`** — SCROLLLAB no copia material de otros.
- **este doc** — nadie copia material de SCROLLLAB.

Ambas se aplican siempre.
