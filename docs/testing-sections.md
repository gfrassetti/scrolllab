# Probar secciones del builder y widgets de LAB

Qué correr cuando entra un template nuevo, una sección nueva o se toca una que
ya existe, para saber dos cosas: que **se descarga bien** (el ZIP es un
proyecto que instala, compila y arranca) y que **se ve bien** (PC, tablet,
teléfono, con y sin movimiento, en el builder y embebida como widget de LAB).

Caso con el que se armó: APEX (2026-10-12). Ver «Lo que encontró la primera
corrida» al final: varias pruebas daban «ok» sin haber visto la página.

## El comando

```bash
npm run check:sections -- apex            # un template entero
npm run check:sections -- apex/Hero       # una o varias secciones
npm run check:sections -- apex --fast     # solo lo rápido (ZIP + campos), sin navegador pesado
npm run check:sections -- apex --skip=parity,motion
```

Corre los pasos en orden, sigue aunque uno falle y deja un informe en
`storage/section-check/<objetivo>.md` (la salida de cada paso en
`storage/section-check/<objetivo>/<paso>.log`). Un modelo entero tarda
~15–25 min; `--fast`, menos de un minuto.

| Paso | Herramienta | Qué mide |
|---|---|---|
| zip | `node --test server/__tests__/packagingEverySection.test.js` | El ZIP de cada sección **sola**, de todas las del modelo juntas y del template suelto: archivos de arranque, imports, dependencias, archivos de `public/`, licencia |
| editable | `npm run check:editable -- <sección>` | Todo texto, foto, link y color visible es un campo |
| builder | `npm run check:builder -- <modelo>` | Lo editado en el panel aparece en la vista previa (también dentro de listas) y no hay errores de consola |
| colors | `npm run check:colors -- <modelo>` | Todo lo visible sigue a sus campos de color (lo de canvas/WebGL va a mano) |
| visual | `npm run check:visual -- <modelo> custom:<modelo>` | Lo que hace el comprador: `npm install` + `vite build` + Chromium, del ZIP del template y de la composición del builder con todas sus secciones. Capturas en `storage/visual-check/` |
| mobile | `npm run check:mobile -- <modelo> --quick` | 320/390/768/1280 + «reducir movimiento»: desbordes, texto cortado o chico, zonas de toque, imágenes |
| motion | `npm run check:motion -- <modelo> --quick` | Teléfono emulado (gestos táctiles, CPU ×4): huecos, trabas, texto que nunca aparece |
| parity | `npm run check:parity -- <modelo>` | Lo que anima en PC anima en el teléfono y la tablet |
| lab-screen | `npm run screen:lab -- <ids> --deep --jobs 1` | Solo los widgets de LAB: embebidos en un sitio ajeno, FLOW/PIN, alto estable, texto oculto o cortado, fotos rotas, fuentes, red. Láminas en `storage/lab-screen/` |
| lab-flow | `npm run check:lab -- <ids>` | Editar → vista previa con el embed real → publicar → verse en un sitio ajeno |
| lab-e2e | `test:e2e` filtrado a esos ids | El embed real a 375/768/1280 con sus props |

## Cuándo

- **Sección o template nuevo:** `check:sections -- <modelo>` completo antes del commit.
- **Se toca una sección:** `check:sections -- <modelo/Sección>`. Si es widget de
  LAB, **siempre** con los pasos de LAB (no usar `--skip=lab-*`): la revisión de
  widgets (`screen:lab`) tiene que correr cada vez que se suma o se cambia uno.
- **Antes de cada commit:** `npm run verify` (incluye el paso zip de todas las
  secciones y la guarda de abajo).
- **Antes de un deploy grande o al tocar el embed / el empaquetador:**
  `npm run check:visual` y `npm run test:e2e` completos.

## Lo que corre solo (en `npm run verify`)

- `packagingEverySection.test.js`: una sección o un template nuevo entran solos
  (salen de las tablas de dominio); nadie tiene que acordarse de sumarlos.
- `npm run check`: cada widget de LAB tiene su caso en `CASES`
  (`embed/test/e2e/hosted-sections.e2e.mjs`). Si falta, falla ahí y no recién
  cuando alguien corre la suite larga.

## Lo que hay que mirar a ojo

Las herramientas dan números; el «se ve bien» lo confirma una persona:

1. Las láminas de `storage/lab-screen/<modelo>-<Sección>.png` (4 momentos por
   pasada, 6 pasadas con `--deep`).
2. Las capturas de `storage/visual-check/` (`<modelo>` y `custom-<modelo>`): el
   proyecto bajado, compilado.
3. Las hojas de `storage/responsive-check/mobile/<modelo>/sheet-normal.html`.
4. Para canvas/WebGL, un teléfono real con `?motion-debug`: un emulador no prueba
   la GPU ni Safari.

## Reglas para que las pruebas vean la página

- **Pantalla de carga de un template:** el elemento lleva `data-page-loader`
  (o `role="status"` + `aria-label="Loading"`, como MERIDIAN). `check:mobile`,
  `check:motion` y `check:parity` esperan a que se vaya
  (`waitForPageLoaders`, `scripts/lib/page-helpers.mjs`); sin la marca miden la
  pantalla de carga.
- **`id="top"` en una sección** (el ancla de «volver arriba», APEX y KIN): el
  recorrido de secciones usa `<main>`. Las secciones del template van en `<main>`.
- **Un caso de LAB por widget** en `CASES`, con un marcador que se vea sin
  animación de por medio (el titular que entra letra por letra no sirve).
- **Excepciones con motivo:** `ALLOW` (check-mobile), `ACCEPTED` (check-parity),
  `NOT_IN_DOM` (check-builder). Una por una y con el porqué.

## Lo que encontró la primera corrida (APEX, 2026-10-12)

- `check:parity` decía «2 secciones, 0 ScrollTriggers» y `check:motion` probaba 8
  gestos: medían el loader (bloquea el scroll) y, como el hero de APEX es
  `id="top"`, solo recorrían lo de adentro del hero. Con la espera del loader y
  el recorrido por `<main>`: 7 secciones, 19 ScrollTriggers, 18 gestos. KIN tenía
  el mismo problema (`kin/Hero` también es `id="top"`).
- `check:mobile` marcaba el titular «recortado»: lo medía con el loader encima.
  Ya viendo la página, encontró dos cosas reales: etiquetas a 10 px en PC
  (`max(10px, 0.6vw)` → `max(11px, 0.6vw)`) y el encabezado del menú abierto que
  se salía 16 px a 320 de ancho.
- `packaging.test.js` solo armaba los 8 ZIP del bundle: ATRIUM, MERIDIAN, KIN,
  FOLD y APEX (los que se venden sueltos) y las secciones de a una no tenían
  red en `npm test`. Ahora `packagingEverySection.test.js` las cubre a todas.
- `test:e2e` completo: 3 casos de `atelier/VisionShutter` fallan solo dentro de la
  suite entera (también antes de estos cambios, en 9470163); quedó como tarea
  aparte.
