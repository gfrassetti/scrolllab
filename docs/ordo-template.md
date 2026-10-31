# ORDO — template de estudio de arquitectura e interiorismo (home de una página + páginas de proyecto)

> **Estado (2026-10-30): en obra, solo en local; en el builder solo con `VITE_BUILDER_SHOW_HIDDEN=1`.** Está en `COMING_SOON_SKUS` / `LOCAL_ONLY_SKUS` / `BUILDER_HIDDEN_SKUS`
> (`src/domain/catalog.js`): `/templates/ordo` renderiza en local y en producción redirige a la home. Precio propuesto:
> **USD 349** (`TEMPLATE_PRICES_USD.ordo`), por debajo de la base del builder (549) y de KIN / MERIDIAN (379). Para
> ponerlo a la venta: precio aprobado por el dueño, sacarlo de las tres listas, tarjeta en `templateMeta.js`, textos
> `templates.ordo` en `src/i18n/locales`, OG (`npm run gen:og`), sitemap / llms.txt / JSON-LD, y las listas de
> `check:mobile`, `check:motion` y `check:parity`. Después, `npm run check:visual -- ordo`.

Sale del sitio que se armó para un estudio cliente («elStudio»): el cliente lo descartó, el código se quedó y se convirtió en
producto. Nada del cliente viaja: marca, textos y fotos son de un negocio inventado.

## El negocio inventado

**ORDO** — estudio de arquitectura e interiorismo (también dirección creativa) de **Lisboa**, fundado en 2014: 14 personas, 68
obras construidas. Voz sobria, frases cortas. Proyectos de la demo:

| # | Proyecto | Tipo | Lugar | Año | m² |
|---|---|---|---|---|---|
| 01 | Linho | concept store | Sintra | 2025 | 68 |
| 02 | Casa Muralha | casa privada (tierra apisonada) | Alentejo | 2024 | 240 |
| 03 | Maré | restaurante (barra de azulejo azul) | Lisboa | 2024 | 110 |

Contacto de ficción: `hello@ordo.studio`, `+351 21 555 0142`, Rua do Poço 14. Privacy / Terms abren `LegalSheet`
(`#privacy`, `#terms`); los textos son de muestra. Cada link del nav lleva a una sección: `#projects`, `#studio`, `#services`,
`#contact` (ver [`template-copy.md`](template-copy.md)).

## Qué tiene

Orden de la home: **Loader → Nav → Hero (cuatro hojas) → Sketch (salida a boceto) → Projects → Studio → Services → Contact**.
Cada proyecto es una página (`/projects/<slug>`): tira horizontal con parallax (≥ 768 px), vertical en teléfono.

- **Loader** (`Loader.jsx`, `Logo.jsx`, `logoPaths.js`): la primera O de ORDO se dibuja con un trazo (stroke-dashoffset) y se
  rellena; R D O suben desde una línea; la tapa de óxido cae sobre la R y la D; se escribe «Architecture & Interiors»; la hoja
  sube como cortina y el logo viaja al nav. Los contornos salen de Jost Medium (OFL) con fontTools (la tapa es un polígono
  propio). Para otra marca hay que regenerar `logoPaths.js` y ajustar `RISE` / la firma en `Loader.jsx` y `Nav.jsx`.
- **Hero** (`Hero.jsx`, `localScene.js`, `designPieces.js`): un alzado 21:9 de un local en cuatro hojas (The space, Design,
  Matter & light, Experience). Cuatro imágenes alineadas pixel a pixel: `sketch-raw` (la obra gris), `sketch-empty` (el local
  vacío), `sketch-room` (el boceto completo) y `room-photo`. Un shader de Three.js las combina por regiones: cada pieza de
  `designPieces.js` (rectángulos en px) pasa de un estado a otro. En pantallas angostas la cámara recorre el dibujo. Con el
  mouse aparecen las líneas de construcción; en la última hoja, clic y arrastre muestra el «antes». Sale con una vuelta a
  boceto (`Sketch.jsx`). El 3D que queda debajo solo mide (`planProbe.js`).
- **Marco** (`Nav.jsx`, `ScrollRuler.jsx`, `Cursor.jsx`): nav con celdas de un módulo (`--mod`, medido desde el borde derecho)
  que alinea sus divisiones con las líneas del hero; regla de scroll propia (marcas por sección); cursor de mira / punto.
- **Projects** (`Projects.jsx`): sección fija con ScrollTrigger (`pin`, `scrub`, `snap`): un timeline con una unidad por proyecto; el cambio ocupa el 60 % central de cada unidad y la etapa descansa en los números enteros. Solo el proyecto visible es alcanzable (`inert` en los otros). La foto lleva `sizes` de 230vw en el teléfono porque la tarjeta es alta y recorta la imagen.
- **ProjectPage** (`projects.js`): agregar un proyecto = un objeto en `projects.js` con seis fotos
  (`cover`, `hero`, `thumb`, `light`, `colour`, `craft`; cada una con WebP grande y `-s`) y tres notas.
- **Studio / Services / Contact**: copy al principio de cada archivo; `reveal.js` los entra con el pincel (`paint.js`).
- **Studio — frase con cotas**: la frase se lee con el scroll (cada palabra pasa de tenue a tinta, GSAP scrub); las palabras entre
  `*asteriscos*` llevan una barra de óxido; arriba una etiqueta con marcas de corte (`.od-crop`) y abajo una cota (`.od-dim`).
- **Contact — llamada + pie alto**: la llamada (frase grande sobre la tapa, botón con marcas de corte, el email debajo) y un pie
  rayado como plano: frase y registro, cuatro columnas de enlaces (`Texto | #sección` por renglón), boletín (valida, estados, honeypot;
  sin `endpoint` simula el éxito, con uno hace POST `{ formType: 'newsletter', email }`), tres bloques de datos, el nombre gigante
  en contorno con sus líneas de construcción (se dibuja al entrar), reloj de Lisboa con coordenadas y la barra legal.
  Los enlaces apilados del pie son cajas reales de 44 px (`.od-ft__a`): las zonas `tpl-hit` de vecinos se pisan entre sí.

## Cómo se hicieron las imágenes

Higgsfield `gpt_image_2_5` (2k, calidad media, ~1 crédito cada una). Los originales viven en `design/masters/ordo/` (los PNG
están en `.gitignore`; el README de esa carpeta cuenta la procedencia y las correcciones). Los WebP van a
`src/components/sections/ordo/assets/` (`<proyecto>-<pieza>.webp`, `-s` o `-900` para pantallas chicas). Proyectos 2 y 3:
primero la portada y, con ella de referencia (`image_references`), las otras cinco, para que sean el mismo lugar.

## Reduce movimiento, teléfono y paridad

Sigue las reglas de AGENTS.md: con «reducir movimiento» el hero queda quieto con la foto y las secciones se ven sin barrido
(`calm`); la tira de proyecto pasa a vertical; el hero entra con `trackPointer` / el toque. Pendientes de medir: `check:mobile`,
`check:motion` y `check:parity` todavía no tienen a ORDO en sus listas (se suman al salir a la venta).

## En el builder (2026-10-30)

ORDO tiene cinco secciones en el builder, todas con todo editable (`src/domain/sectionFields/fields/ordo.js`):

| Sección | Qué es | Campos |
|---|---|---|
| `ordo/Hero` | loader + nav + el dibujo en cuatro hojas + salida a boceto + regla de scroll + cursor (`Hero.jsx` arma el conjunto; el dibujo es `Drawing.jsx`) | marca y bajada, línea de lugar, links del nav (hasta 3), botón de contacto, red social, las cuatro hojas (título y texto), las cuatro partes del titular, rótulos, las cuatro capas del dibujo (imágenes), 4 interruptores (loader, cursor, regla, líneas de construcción), colores |
| `ordo/Projects` | una etapa **fija** (pin de GSAP): los proyectos (hasta 6) se apilan en el mismo lugar y el scroll cambia el que se ve: la foto nueva se abre desde abajo, la ficha anterior se hunde, el scroll se pega a cada proyecto; con «reducir movimiento», una lista | nombre, tipo, lugar, año, m², foto, descripción de la foto y enlace por fila; rótulos; grano; colores |
| `ordo/Studio` | frase con cotas, tres cifras, tres principios | todos los textos; marcas y cota (interruptor); colores |
| `ordo/Services` | hasta 6 disciplinas | nombre, descripción, etiquetas; tapa al pasar el mouse; colores |
| `ordo/Contact` | cierre: llamada + pie alto | frase, botón, email, columnas de enlaces, boletín, cuatro bloques, nombre gigante, reloj, derechos, Privacy / Terms (panel), «volver arriba»; interruptores (tapa, marcas, boletín, registro, nombre, reloj); colores |

- **Colores.** Todo sale de tres variables en `.od-root` (`--od-paper`, `--od-ink`, `--od-rust`) y de sus derivados (`--od-mute`,
  `--od-soft`, `--od-faint`, las líneas). Cada sección pone `bg` / `fg` / `accent` en su propia raíz (`vars.js`). Lo que se dibuja en
  el canvas (la foto y el boceto) trae su propio papel (#efebe3): con otro fondo el borde de la foto se nota (el campo lo avisa).
- **Marca.** Con el nombre `ORDO` se dibuja el logo vectorial; con otro nombre se arma un wordmark en Jost, mayúsculas, con la
  tapa de óxido arriba; en el loader las letras suben una por una (sin trazo). `Logo.jsx` (`VECTOR_BRAND`), `Loader.jsx`, `Nav.jsx`.
- **Proyectos.** En la página completa (`Site.jsx`, `routed`) cada tarjeta abre su página (`/projects/<slug>`). En una composición
  no hay rutas: cada tarjeta va al `href` de su fila (por defecto `#contact`).
- **No entran** al builder las páginas de proyecto ni el cambio de ruta: son de la página completa.

### Verlo en local, con ORDO en el builder

ORDO sigue en `BUILDER_HIDDEN_SKUS` (la paleta pública no lo muestra y el servidor rechaza sus secciones). Para probarlo:

```bash
VITE_BUILDER_SHOW_HIDDEN=1 BUILDER_SHOW_HIDDEN=1 npm run dev   # web :5173, API :8787; ORDO aparece en /builder
```

`VITE_BUILDER_SHOW_HIDDEN` (front, `sectionRegistry.jsx`) y `BUILDER_SHOW_HIDDEN` (servidor, `validation.js`, nunca en producción).
La página completa está en `/templates/ordo`. Los chequeos aceptan `SHOW_HIDDEN=1` para incluir modelos en obra:

```bash
SHOW_HIDDEN=1 npm run check:editable -- ordo      # 5/5 al 100 %
SHOW_HIDDEN=1 npm run check:builder -- ordo       # lo editado aparece en la vista previa
SHOW_HIDDEN=1 npm run check:colors -- ordo        # 5/5
SHOW_HIDDEN=1 npm run check:builder-save -- ordo
SHOW_HIDDEN=1 npm run check:visual -- ordo custom:ordo
npm run check:mobile -- ordo --quick && npm run check:motion -- ordo --quick && npm run check:parity -- ordo
```

Estado al 2026-10-30: todo en verde. `check:editable` necesita que `react-router-dom` cargue en el SSR de Vite: en un Node 22
con `react-router-dom` 7.18 puede fallar con «Named export 'Link' not found» (es del entorno, le pasa a todas las secciones).

## Pendientes antes de la venta

1. Decisión del dueño: precio y salida a la venta (ver arriba). Sacarlo de las tres listas lo muestra en el builder público.
2. Un favicon propio en el ZIP (el de la demo, la R bajo la tapa, está en `src/studio/ordo/public/favicon.svg`, solo para el
   build de preview `npm run build:ordo`).
3. Poster (`public/catalog/ordo.*`, 4:5): hoy es una captura de la hoja 04 del hero; rehacerlo con `npm run capture:catalog`
   cuando ORDO esté en `SCROLL_AT`.
4. LAB: ORDO no es un widget (el hero se fija a pantalla y trae su loader); no entra a `HOSTABLE_SECTIONS`.
