---
name: Scroll Lab
description: Webs que se mueven. Marketplace de templates de scroll cinematográfico, builder y LAB.
colors:
  ink: "#161412"
  bone: "#f2efe9"
  orange: "#ff4b00"
  orange-ink: "#c23a00"
  on-accent: "#161412"
  mist: "#c7c1b6"
  graphite: "#2b2825"
  success: "#157347"
  warning: "#8a5a00"
  danger: "#b42318"
  ink-dark-theme: "#e8e5df"
  bone-dark-theme: "#131313"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 7rem)"
    fontWeight: 600
    lineHeight: 0.85
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 1.2rem + 2.6vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.14em"
rounded:
  none: "0"
  sm: "4px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.orange}"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  badge-plan:
    textColor: "{colors.orange}"
    rounded: "{rounded.sm}"
---

# Design System: Scroll Lab

Este archivo documenta dos cosas que conviven y hay que no mezclar:

1. **El sistema vigente del marketplace** (`src/index.css`, `src/styles/tpl.css`): lo que hoy está en producción.
2. **La identidad de marca v1** (octubre 2026): la capa que ordena logo, color, tipografía y piezas de redes y video. Hoy se aplica en Instagram, videos y portadas; en el sitio, la migración es una decisión pendiente (ver «Pendientes»).

`PRODUCT.md` manda sobre el posicionamiento; este archivo sobre cómo se ve.

## Overview

**Creative North Star: «Una página que scrollea».** La marca es el gesto de recorrer una página: secciones apiladas y una que entra en vista. El naranja es esa sección en vista, y es la única voz de acción de todo el sistema. El resto es silencio: tinta, hueso y mucho aire, para que los templates (que son los que tienen que brillar) no compitan con el marco.

Personalidad: editorial, preciso, cinematográfico. Voz en «vos», directa y de oficio. Nada de no-code, nada de ThemeForest.

Referencias visuales negativas: degradés violeta, tarjetas genéricas con sombra, emojis, ilustraciones de stock, gradientes de «agencia».

## Colors

Dos neutros cálidos hacen el 90% de cada pieza; el naranja es el 8–10%.

| Rol | Color | Uso |
|---|---|---|
| Tinta `#161412` | 55% | Fondo oscuro y texto. El negro cálido de la marca. |
| Hueso `#F2EFE9` | 35% | Fondo claro y texto sobre tinta. |
| Naranja `#FF4B00` | ≤10% | Acción, marcador, punto final, bloque del isotipo. |
| Naranja tinta `#C23A00` | texto | El naranja legible como texto chico sobre hueso. |
| Sobre naranja `#161412` | texto | `text-on-accent`: tinta fija sobre naranja (5,5:1). No flipea con el tema, a diferencia de ink/bone. |
| Bruma `#C7C1B6` | 2% | Líneas, estados deshabilitados, apoyo. |
| Grafito `#2B2825` | superficie | Superficie sobre tinta (paneles, bandas). |

Contrastes medidos: hueso sobre tinta 16,8:1 · tinta sobre naranja 5,5:1 · naranja sobre tinta 5,5:1 · naranja tinta sobre hueso 4,7:1 · **naranja sobre hueso 2,9:1** (solo títulos grandes y elementos gráficos).

En tema oscuro del market (`html.dark`) tinta y hueso se invierten (`#E8E5DF` sobre `#131313`) y el naranja de texto pasa a `#FF5C1F`; los colores de estado (`success`, `warning`, `danger`) también flipean para llegar a 4,5:1.

**Paletas invitadas.** Cada modelo del catálogo trae su propia paleta (`--color-noir/acid`, `--color-klein`, `--color-fizz`, etc. en `src/index.css`). Son de los templates, no de la marca: no se mezclan con los colores de marca en una misma pieza.

## Typography

Tres voces y un acento.

- **Voz alta — Bricolage Grotesque 600**, mayúsculas, −3% a −4% de tracking, interlineado 0,85–0,9. Es la clase `.voice` (`src/index.css`; tamaño, interlineado y tracking se declaran en cada uso). La usan el título del hero, la marca de zona (`ZoneHeadline`: «TEMPLATES.», «BUILDER.», «LAB.») y el wordmark gigante del footer. El wordmark del header y del builder va en Bricolage 700, mayúsculas, +14%. En redes y video la voz alta va en 700 con tracking −0,5% y `opsz` 28: a tamaños grandes el eje óptico por defecto aprieta las letras hasta tocarse. Punto final naranja en las piezas de marca. **Excepción:** la serie del mosaico de Instagram «WEBS QUE SE MUEVEN.» (ya publicada) está en Zalando Sans 800; las portadas de «ARMÁ. PUBLICÁ. PEGÁ.» la siguen para que la grilla sea una sola serie.
- **Neutra — Geist** (`--font-ui`). Cuerpo y títulos del market, builder, LAB, carrito y cuenta.
- **Máquina — JetBrains Mono** (`--font-mono`). Contadores («01 — 03»), rótulos, código.
- **Acento — Playfair Display itálica** (`--font-display`). Una palabra por pieza, en minúscula.

Los templates y el ZIP usan `--font-grotesk` (Space Grotesk) y las familias propias de cada modelo; el atributo `data-surface='market'` es lo que separa ambos mundos.

Escala del market (`src/index.css`): `text-eyebrow` 12 px (+14%), `text-body-sm` 14, `text-body` 16/1,65, `text-body-lg` 19/1,55, `text-title-sm` 20–26, `text-title` 30–44, `text-display` 44–84, `text-mega` 56–176. Regla de la casa: los títulos son de 2 a 5 palabras; la oración larga va debajo como `text-body-lg`.

## Layout

Breakpoints de Tailwind v4 por defecto: mobile `<640`, tablet 640–1023 (`md:` es refinamiento dentro de tablet), desktop `≥1024`. El `SiteHeader` del market colapsa en `lg`; entre 1024 y 1279 va más compacto y el rótulo «· WIDGETS» de LAB aparece desde 1100 px.

Piso en mobile: micro-labels ≥ 11 px, cuerpo ≥ 14 px, zonas de toque ≥ 44 px, alturas en `svh`.

**Composición de piezas de marca:** bandas apiladas (como el isotipo), alineadas a la izquierda, con márgenes generosos. Un solo foco por pieza.

## Elevation & Depth

Casi plano. La profundidad se resuelve con tono (tinta / grafito / hueso) e hilos de 1 px (`ink` al 10–25%). La única sombra del sistema es la de los popovers del market (carrito, cuenta, preferencias): `0 16px 40px rgba(0,0,0,.12)`. En piezas de marca no hay sombras.

## Shapes

Esquinas rectas (radio 0) en botones, tarjetas, campos, popovers y ventanas. Único radio en el header: `rounded-sm` (4 px en Tailwind v4) en la insignia del plan. Bordes de 1 px.

## Components

- **Botón** (`.btn` en `src/index.css`): `min-h-11`, `px-5 py-3`, borde de 1 px, texto 14 px / 500. Variantes: `btn-primary` (tinta; en hover pasa a naranja con texto `on-accent`), `btn-ghost` (borde tinta al 25%; en hover se rellena), `btn-danger`. Pulsado: `scale(.97)` en 140 ms.
- **Acción de texto** (`.action`): 14 px, subrayado sutil, hover naranja. Reemplaza a los «EDITAR / BORRAR» en mayúsculas de 11 px.
- **Ventana de demo** (en redes y video): marco con franja de tinta arriba y el isotipo, contenido adentro. Todo trabajo real se muestra así.
- **Riel de scroll**: hilo de 1 px con un marcador naranja de 26 × 11 px. Separa, enmarca y sugiere avance.
- **Contador**: JetBrains Mono, siempre dos cifras («01 — 03»).

**Movimiento** (`src/index.css`): `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`; pulsado 140 ms, popover 200 ms, aviso 280 ms, entrada de titulares 500 ms (`--duration-reveal`). El isotipo entra con las barras primero y el bloque naranja al final. Nunca `ease-in` en UI, nunca rebotes. Con «reducir movimiento»: fundido corto, nunca contenido oculto.

## Do's and Don'ts

Do
- Terminar cada frase de titular con el **punto naranja**.
- Un solo naranja por pieza: si hay dos cosas en naranja, una sobra.
- Mostrar trabajo real dentro de la **ventana** con el isotipo.
- Aire mínimo alrededor del isotipo: 2× el alto de una barra. Tamaño mínimo: 16 px de ancho.
- Hablar con «vos», sin promesas de negocio, sin nombrar tecnologías.

Don't
- Estirar, recolorear, sombrear ni contornear el isotipo; no ponerlo sobre degradés ni fotos sin velo.
- Usar el naranja de marca para texto chico sobre hueso (usar `orange-ink`).
- Mezclar la paleta de un modelo con la de la marca en una misma pieza.
- Emojis, signos de exclamación en cadena, «la mejor plantilla», «duplicá tus ventas».

## Piezas y dónde viven

- Tablero completo, logos (SVG), tokens (`tokens.css`) y kit de Instagram: `OneDrive\scrolllab\Identidad-visual\`.
- Portadas del mosaico «ARMÁ. PUBLICÁ. PEGÁ.»: `OneDrive\scrolllab\Instagram\portadas-arma-publica-pega\`.
- Isotipo en el sitio: `src/components/Logo.jsx` (misma geometría que `public/logo.svg`).

## Pendientes

- **Punto naranja en el wordmark animado:** el hero y el footer animan el wordmark con SplitText; sumarle el punto exige tocar esa animación, así que quedó afuera. `ZoneHeadline` sí lo lleva.
- **Pósters de template** (`TemplatePoster`): usan Bricolage sin mayúsculas ni `.voice`; se dejaron como están.
- **Instagram:** el kit de `Identidad-visualinstagram` va en Bricolage. La serie del mosaico («WEBS QUE SE MUEVEN.» y «ARMÁ. PUBLICÁ. PEGÁ.») se queda en Zalando Sans 800 para ser una sola grilla.
