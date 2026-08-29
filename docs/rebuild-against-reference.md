# Rebuild-against-reference — playbook

> Caso de uso: un template ya existe, tiene demo y JSX, pero **no está al nivel de la
> referencia** ("quedó mal", handoff de review). No es un template nuevo desde cero
> (eso ya lo cubre el flujo normal de `AGENTS.md` + `template-image-designer`) — es
> reconstruir secciones puntuales contra la ref real, no contra lo que ya hay escrito.
> Caso trabajado: `docs/reference-analysis/atrium.md` (modelo ATRIUM, ago 2026).

## Cuándo usar esto

- El usuario dice "no calza en escala / aire / motion" comparado con la ref.
- Hay capturas del usuario del sitio real que contradicen lo que renderiza el JSX.
- El diagnóstico va a tocar 3+ secciones y el orden de la página, no un solo componente.

Si es un ajuste de una sola sección o un bug puntual, no hace falta todo este proceso —
andá directo a arreglarlo.

## 0. Mentalidad: reconstruir contra los beats, no contra el JSX actual

El error más caro es "pulir lo que hay". Si el JSX actual y la ref difieren en la
escena de fondo (ej. hero con crossfade de 3 fotos cuando la ref usa una sola foto
estática), ajustar props/clamp encima no lo arregla — hay que reescribir el componente
mirando la ref, y borrar lo que no está ahí (aunque sea código que "ya funciona").

## 1. Fuente de verdad, en este orden

1. **Capturas del usuario** — pesan más que cualquier análisis automático; suelen
   mostrar un estado de scroll que el muestreo adaptativo se saltó.
2. `docs/reference-analysis/<sku>.md` + `docs/reference-analysis/<sku>/beats/beat-NN.jpg`
   + `beats.json` — generado por `npm run analyze:ref`. Trae una tabla de headings con
   `tag | texto | font | size` en **px reales** medidos en el DOM de la ref: esa tabla
   es la escala tipográfica del modelo, no hay que inventarla.
3. `docs/motion-cookbook.md` (primitivos P1–P14) — qué mecanismo usar para cada efecto.
4. Skills de craft (`impeccable`, `taste-skill`, `template-image-designer`) — para no
   caer en defaults genéricos al rellenar lo que la ref no cubre.

Un craft-floor genérico (ej. "display tipográfico máx. 6rem") **no gana** si la ref
mide más grande. La ref manda sobre cualquier límite de estilo por defecto.

## 2. Diagnóstico: anotar `beat → primitivo → archivo`

Abrí varios `beat-NN.jpg` espaciados (inicio, cada cambio de fondo, el final) más los
que las capturas del usuario señalan como mal. Por cada uno, anotá:

- Tamaño de tipo real (de la tabla de headings) → mapealo a un token de escala.
- Qué cambia de fondo (papel↔tinta) y en qué beat — eso define los hinges de sección.
- Qué mecanismo de motion es (P1 pin, P2 parallax, P3 crossfade, P6 cutout…).
- Qué componente actual debería cubrir ese beat, y si lo cubre o no.

Con eso sale una tabla mental tipo:

```
beat 0-3   → hero foto + marca chica          → P2                  → HeroMassing
beat 1-9   → manifiesto blanco grande          → P8 reveal            → ManifestoType
beat 19-22 → hinge papel→tinta, diagrama radial→ P1 pin + P13 overlap → ClarityPair
beat 21-27 → arco de fotos inclinadas          → P6 scatter           → PeopleScatter
beat 23-28 → anillo + cifras                   → P1 pin + rotate      → OrbitRing/StatField
```

## 3. Escala tipográfica como tokens, no como clamps sueltos

Convertí los px medidos de la ref (ej. 131.25 / 88.5 / 60 / 12) en variables CSS una
sola vez, con nombres semánticos por rol (display / lead / mid / note), no por
componente. Cada sección consume la clase, no un `clamp()` propio:

```css
.atrium-world {
  --atrium-display: clamp(3rem, 9.1vw, 9.5rem);   /* 131px: manifiesto, centro del anillo, cifras */
  --atrium-lead: clamp(2rem, 6.15vw, 6.6rem);      /* 88.5px: parrafos de alcance, People, labels */
  --atrium-mid: clamp(1.7rem, 4.17vw, 4.6rem);     /* 60px: titulos de seccion, marca del hero */
  --atrium-note: clamp(11px, 0.9vw, 13px);         /* 12-13px: labels, pies de foto, columnas */
}
.atrium-display { font-family: var(--font-grotesk); font-size: var(--atrium-display); line-height: 0.92; letter-spacing: -0.045em; }
```

Ventaja: si más adelante la ref pide ajustar el 131px, se toca un solo lugar y todas
las secciones que lo usan (manifiesto, anillo, stats) se mueven juntas.

## 4. Patrones de motion que se repiten al portar una ref real

### Hero: una foto, no una historia
Si la ref tiene un solo `<img>` con `matrix(...)` variando en scroll, es **P2**
(parallax de un solo elemento). No inventes un crossfade de 2-3 fotos si la ref no
lo tiene — es una escena distinta, no una "mejora".

### Hinge de color (papel↔tinta) en un solo pin
Cuando la ref invierte fondo a mitad de una sección pinned (blanco→negro sin corte
duro), es un solo `ScrollTrigger` con `pin` + una timeline que cruza `opacity` de una
capa de color de fondo — no dos secciones distintas con un salto entre ellas (P13).

### Scatter / arco de fotos: rotar en un wrapper, nunca en el nodo con `yPercent`
Si una placa necesita `rotate` fijo **y** un drift de `yPercent` en scroll, ponelos en
nodos distintos (uno adentro del otro). Animar ambos con GSAP en el mismo nodo hace
que el `set`/`to` de una tween pise el `transform` de la otra intermitentemente.

```
<figure style="rotate(Ndeg)">        ← rotación fija de la placa (CSS, no anima)
  <div data-drift>                    ← GSAP anima yPercent acá
    <img data-media />                ← GSAP anima un yPercent propio (parallax de la foto)
```

### Anillo/wreath de fotos en pin: dos bugs típicos
1. **`width: 0` fantasma**: si el contenedor del anillo es `w-0 h-0` (para que
   `top-1/2 left-1/2` sea el centro) y las imágenes tienen `max-width: 100%` de un
   reset global, cada tile mide 0×0. Fix: `max-w-none` en el `<img>` + ancho fijo en
   el tile. **Verificar con `getBoundingClientRect()` en Playwright**, no a ojo — a
   ojo el navegador puede mostrar la imagen igual por otros motivos de layout.
2. **Radio más grande que el viewport**: si `--orbit-r` (o análogo) supera la mitad
   de la altura del viewport, la mitad superior/inferior del anillo queda fuera de
   cuadro y en pantalla se ven islas dispersas en las esquinas con un hueco enorme en
   el medio — no una guirnalda. Acotá el radio a algo como `min(30vw, 46vh)` para que
   el círculo completo entre en un viewport de referencia (1440×900), y calculá el
   ancho del tile para que `2 * r * sin(π / n)` (cuerda entre tiles adyacentes) sea
   cercano al ancho real del tile — si no, quedan huecos entre fotos aunque el radio
   esté bien.
3. Rotar el anillo entero (wrapper) en scrub, nunca el tile individual si el tile ya
   tiene su propio `rotate` fijo de tangente — mismo problema que el scatter de arriba.

## 5. Verificación: Playwright headless a 1440×900, no "se ve bien" a ojo

Los proyectos con `playwright` ya en `node_modules` (revisar `package.json`) permiten
un script chico y desechable (`storage/shot.mjs`, gitignored porque `storage/` lo
está) que:

1. Abre la demo (`http://localhost:5173/templates/<sku>`), viewport 1440×900.
2. Recorre stops de scroll como fracción del `scrollHeight` total (no como beats fijos
   — la altura total cambia según lo que uno reescribe), usando `window.__lenis` /
   `window.lenis` si existe (`scrollTo(y, { immediate: true })`) en vez de
   `window.scrollTo`, porque el smooth-scroll (Lenis) puede ignorar el scroll nativo.
3. Screenshotea cada stop.
4. Corre un probe de `getBoundingClientRect()` sobre los selectores `data-*` clave
   (tiles del anillo, placas del scatter) para pescar el bug de `width: 0` sin tener
   que mirar cada captura.
5. Loguea errores de consola.

Esto reemplaza mirar el sitio manualmente stop por stop — permite iterar rápido
(cambiar un CSS, volver a correr, comparar 3-4 capturas puntuales) sin abrir el
browser cada vez. `npm run check:visual` (del repo) sirve para el flujo de compra end
to end, no para esto — este script es más chico y vive solo durante la sesión.

## 6. Assets reciclados: jerarquía de qué repetición es peor

Con un pool finito de fotos (assets ya generados, sin presupuesto para generar más),
no siempre alcanza para que **ninguna** sección repita una foto con otra. Orden de
prioridad para decidir qué recorte de repetición vale la pena:

1. **Peor**: la misma foto dos veces **dentro del mismo componente visible a la vez**
   (ej. dos tiles idénticos en el mismo anillo, visibles simultáneamente). Arreglar
   siempre primero.
2. **Malo**: la foto del hero (primera impresión) reaparece en cualquier otra sección.
3. **Malo**: dos secciones **adyacentes en el scroll** (una inmediatamente después de
   la otra) comparten el mismo set completo de fotos — se lee como "el mismo lote".
4. **Aceptable si no alcanza el pool**: dos secciones lejanas en el scroll (separadas
   por 1500px+ y un cambio de fondo papel/tinta de por medio) comparten una foto
   puntual — un usuario scrolleando no las conecta conscientemente.

Si después de aplicar esta jerarquía sigue quedando reciclaje real, **decirlo
explícito** en vez de dejarlo pasar en silencio — no es un detalle menor, es el punto
9 típico de un brief de este tipo ("un solo batch de IA").

## 7. Generar assets nuevos con Higgsfield (Claude Code)

- Tools: `higgsfield_list_models`, `higgsfield_generate`, `higgsfield_status`,
  `higgsfield_download`, `higgsfield_cancel` (server local, ver `AGENTS.md` →
  sección Higgsfield / Claude Code).
- **El schema que devuelve `higgsfield_list_models` puede no ser el que la API
  realmente acepta.** Para `/higgsfield-ai/soul/standard`, el filtro documentaba
  `aspect_ratio` con valores tipo `5:4`/`4:5` y `resolution: 2K/4K`, pero la API en
  vivo devolvió 422 pidiendo `aspect_ratio` en `{9:16, 16:9, 4:3, 3:4, 1:1, 2:3, 3:2}`
  y `resolution` en `{720p, 1080p}`. Probar con **un** request antes de commitear un
  batch de 10+ prompts a un aspect ratio que la API va a rechazar.
- Probar el estilo con 1-2 imágenes de test antes de tirar el batch completo — así no
  se gasta crédito en 15 variantes de un prompt que no da la estética que se busca.
- Si la cuenta no tiene crédito (`403 not_enough_credits`), **no es un problema de
  conexión** — no tiene sentido reintentar. Preguntarle al usuario si quiere cargar
  crédito antes de seguir insistiendo.
- Criterio para decidir si vale la pena pagar: si el SKU está en
  `COMING_SOON_SKUS` / `BUILDER_HIDDEN_SKUS` (no se vende todavía), el reciclaje de
  fotos es el ítem más cosmético del review — no amerita gasto real de crédito.
  Dejarlo con la mejor reasignación posible del pool existente (sección 6) y anotarlo
  como pendiente para cuando el modelo pase a venta real (ahí sí conviene fotografía
  propia del comprador antes que más renders IA).

## 8. Checklist de cierre

- [ ] Cada beat de la ref (o cada captura del usuario) tiene un componente que lo
      cubre — no "algo parecido en otro lado de la página".
- [ ] El orden de secciones sigue el de la ref (o el orden pedido), sección de
      contacto en su lugar (no partiendo un bloque de color).
- [ ] Escala tipográfica en tokens, no en clamps repetidos por componente.
- [ ] Ningún `getBoundingClientRect()` en 0 sobre los tiles/placas clave a 1440×900.
- [ ] `npm run check` + `npx eslint <archivos tocados>` en verde.
- [ ] Capturas a 1440×900 en los stops de scroll clave, comparadas contra
      `beat-NN.jpg` / las capturas del usuario — no "se scrollea bien".
- [ ] Reciclaje de assets documentado si no se pudo eliminar del todo (sección 6).
