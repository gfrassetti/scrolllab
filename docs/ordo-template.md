# ORDO — template de estudio de arquitectura e interiorismo (home de una página + páginas de proyecto)

> **Estado (2026-10-30): en obra, solo en local.** Está en `COMING_SOON_SKUS` / `LOCAL_ONLY_SKUS` / `BUILDER_HIDDEN_SKUS`
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
- **Projects / ProjectPage** (`projects.js`): agregar un proyecto = un objeto en `projects.js` con seis fotos
  (`cover`, `hero`, `thumb`, `light`, `colour`, `craft`; cada una con WebP grande y `-s`) y tres notas.
- **Studio / Services / Contact**: copy al principio de cada archivo; `reveal.js` los entra con el pincel (`paint.js`).

## Cómo se hicieron las imágenes

Higgsfield `gpt_image_2_5` (2k, calidad media, ~1 crédito cada una). Los originales viven en `design/masters/ordo/` (los PNG
están en `.gitignore`; el README de esa carpeta cuenta la procedencia y las correcciones). Los WebP van a
`src/components/sections/ordo/assets/` (`<proyecto>-<pieza>.webp`, `-s` o `-900` para pantallas chicas). Proyectos 2 y 3:
primero la portada y, con ella de referencia (`image_references`), las otras cinco, para que sean el mismo lugar.

## Reduce movimiento, teléfono y paridad

Sigue las reglas de AGENTS.md: con «reducir movimiento» el hero queda quieto con la foto y las secciones se ven sin barrido
(`calm`); la tira de proyecto pasa a vertical; el hero entra con `trackPointer` / el toque. Pendientes de medir: `check:mobile`,
`check:motion` y `check:parity` todavía no tienen a ORDO en sus listas (se suman al salir a la venta).

## Pendientes antes de la venta

1. Decisión del dueño: precio y salida a la venta (ver arriba).
2. Campos del builder: hoy ORDO está **fuera del builder** (`BUILDER_HIDDEN_SKUS`) y sin campos editables en
   `src/domain/sectionFields`. Si entra, cada texto / foto / link / color es un campo (regla «todo lo visible se edita»);
   Hero, Loader y Nav dependen del estado de la página (`Site.jsx`) y habría que separarlos.
3. `npm run check:sections -- ordo`, `check:visual -- ordo`, `check:mobile`, `check:motion`, `check:parity`.
4. Poster (`public/catalog/ordo.*`, 4:5): hoy es una captura de la hoja 04 del hero; rehacerlo con `npm run capture:catalog`
   cuando ORDO esté en `SCROLL_AT`.
5. Un favicon propio en el ZIP (el de la demo, la R bajo la tapa, está en `src/studio/ordo/public/favicon.svg`, solo para el
   build de preview `npm run build:ordo`).
