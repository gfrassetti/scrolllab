# APEX — template automotriz (home de una página)

> Template automotriz **en venta** (`/templates/apex`, USD 239, al nivel de FIZZ y MONOLITH: subió
> de 149 el 2026-10-12, cuando sumó la sala 3D, Story y el loader). **Solo la home** (decisión del dueño, 2026-10-12): una página,
> cada link del menú es una sección de ella; no hay vistas internas. Orden: Hero (film, menú-cortina,
> loader) → Statement → Gallery → Models → Footer a pantalla completa. Plan original:
> [`template-plans/apex.txt`](template-plans/apex.txt).
>
> **Registro del SKU** (2026-10-12): precio (`src/domain/catalog.js`), tarjeta
> (`templateMeta.js`), ruta pública, copy del checkout (`server/catalog.js`), ZIP
> (`server/packaging.js`, con README «media de muestra»), textos `templates.apex` es/en,
> portada y OG (`public/catalog/apex.*`, `public/og/apex.jpg`), sitemap, llms.txt, JSON-LD,
> tema del form de contacto y listas de `check:mobile/motion/parity`. `check:visual -- apex`
> instala, compila y abre el ZIP: pasa.
>
> - Referencia (punto de partida, no destino): https://www.esrbespoke.au/ — análisis en
>   [`reference-analysis/apex.md`](reference-analysis/apex.md)
> - Código: `src/components/sections/apex/Hero.jsx` · página: `src/pages/ApexPage.jsx`
> - Film: `scripts/apex-reel.mjs` → `public/apex/`

## 1. De dónde sale la imagen

Cinco tomas de **un mismo auto genérico** (sedán eléctrico, sin marca ni patente) hechas
con Higgsfield:

1. Un still maestro (`gpt_image_2_5`, 0,25 cr) del auto en un estudio oscuro.
2. Cuatro stills derivados **con el maestro como `image_references`** (flanco, llanta,
   interior, trasera): así es el mismo auto en las cinco.
3. Cada still → video con `minimax_h3` (2K, 8 s, `start_image`, 16 cr). Corren de a dos;
   el servicio responde 429 si se lanzan más (ver la nota de la bóveda
   «Higgsfield — costos, límites y trampas»).

Prompt de cámara de todas: *«one single continuous cinematic camera move, no cuts, no
pauses: the camera is already moving on the first frame…»* + qué se mueve (reflejos) y qué
no (el auto). Los originales quedan en `design/masters/cars/` (gitignored).

Costo del set final: ~82 créditos (más lo gastado en un primer auto descartado).

## 2. El film (`scripts/apex-reel.mjs`)

```
node scripts/apex-reel.mjs            # design/masters/cars/shot-1..5.mp4 → public/apex/
FFMPEG=/ruta/a/ffmpeg node …          # si ffmpeg no está en el PATH
```

- **60 fps:** los clips generados son de 24 fps y en una pantalla de 60 Hz un movimiento
  de cámara lento se ve a saltos (3:2 pulldown). El script interpola cada clip a 60 con
  `minterpolate` (mci, bidireccional; un proceso por clip, en paralelo, ~5 min en total) y
  guarda los intermedios casi sin pérdida en `design/masters/cars/60fps/` (gitignored,
  cacheados: borrar la carpeta para rehacer). Se interpola cada clip por separado, no el film
  ya empalmado, porque el estimador de movimiento se confunde con los fundidos. `--fps 24`
  lo saltea. Costo: el film pesa más (más cuadros) pero los cuadros interpolados comprimen
  bien.
- **Cuadros descartados (trabado periódico):** algunos generadores pasan el clip de 30 a
  24 fps *descartando* un cuadro de cada cinco: la imagen tira cada 4.º cuadro y, al
  interpolar sobre un reloj uniforme, ese tirón se vuelve un trabado de 6 Hz. El script lo
  detecta por clip (la diferencia entre cuadros, `signalstats`, trae un salto doble en una
  fase fija; razón ≥ 1,35) y devuelve cada cuadro a su tiempo real con `setpts` antes de
  interpolar. Medido en el film final: razón periódica 2,26 → 1,28 en la toma 1 y 1,80 →
  1,24 en la 4. Los clips que no lo tienen (2 y 5 en la demo) no se tocan.
- **Empalme:** cada unión es un fundido de 0,5 s (`xfade`) y la primera toma se agrega una
  vez más al final, así la última funde *dentro* de la primera: el loop no salta. El film
  empieza medio segundo adentro de la toma 1, justo donde está esa copia cuando termina el
  último fundido. Duración del loop: `n × (largo − 0,5)` = 37,5 s con tomas de 8 s.
- **Grade horneado** (curva S suave, saturación 0,92, sombras frías, luces apenas cálidas):
  cuesta cero en runtime y queda igual en todos los navegadores. El overlay (lavado de
  color, sombras, viñeta, grano) está en CSS, como variables.
- **Dos archivos:** `hero.mp4` 1080p (~1,8 Mbps, 8,6 MB) y `hero-m.mp4` 720×1280 con un
  **recorte vertical por toma** y su propio foco (`SHOTS[i].focus`), 3,5 MB. Un teléfono
  no tiene que bajar píxeles que no va a mostrar.
- **Posters:** el primer cuadro de cada film. `manifest.json`: dónde empieza cada toma en el
  reloj del loop (lo lee el indicador de capítulos).
- **Medición antes de empalmar:** la diferencia entre cuadros de cada clip (`signalstats`)
  confirmó que ninguno tiene cola congelada (en FOLD ese fue el problema); solo arrancan
  con una leve aceleración.

## 3. El hero (`Hero.jsx`)

| Capa | Qué hace |
|---|---|
| `<video>` | `muted loop playsInline`, un solo archivo por viewport (se elige al montar y se cambia, conservando el tiempo, si se cruza el breakpoint). Pausa fuera de pantalla (IntersectionObserver). |
| Overlay | `.apex-wash` (soft-light), `.apex-shade` (legibilidad: arriba, abajo, radial a la izquierda), `.apex-vignette`, `.apex-grain` (feTurbulence en pasos, apagado en calma). |
| Texto | Marca, una frase, 3 links y **un** CTA; titular de dos líneas (línea que sube enmascarada), bajada + «Discover». |
| Capítulos | 5 segmentos que siguen `video.currentTime` (sin renders de React); tocar uno salta a esa toma. |
| Entrada | cortina → titular → pausa → bajada → chrome (orden del Detalle #5). |
| Salida | parallax en tres velocidades: el film se queda atrás de la página (baja un 12 % y se acerca 8 %), la bajada va a mitad de camino y el titular corre adelantado (36 % de la pantalla extra): el texto flota delante de la imagen. Después el texto se apaga y el film se hunde en el negro de la sección siguiente. El film es un 16 % más alto que el hero para que el borde no se vea. Sin scrub en LAB ni en calma. |

### Carga y costo
- **Film diferido:** el `src` se pone recién cuando la página terminó de cargar (con tope de
  2,5 s) **y** el hero está a menos de una pantalla del viewport (`IntersectionObserver`,
  `rootMargin: 100%`). El póster (el primer cuadro) pinta con la página; el archivo de 10 MB
  no compite con fuentes ni con el resto. En una composición con el hero lejos del inicio
  no se baja hasta que el visitante se acerca. En una pestaña en segundo plano tampoco.
- **Bucle de capítulos:** sigue el reloj del video pero no toca el DOM si el cuadro no
  cambió.
- **Teléfono:** sin grano y con el lavado en mezcla normal (dos capas con `mix-blend-mode`
  sobre un video a pantalla completa cuestan GPU en un teléfono real). `disableRemotePlayback`
  evita el menú de transmisión.
- **Etiquetas:** nav, CTA y contador a `max(10px, 0.6vw)` en escritorio; 11 px en teléfono
  (piso de AGENTS).

### Calma (reducir movimiento / ahorro de datos / 2G)
El film **no se reproduce** (`preload="none"`): queda el poster con el grade; el texto entra con
fundidos cortos; el grano queda quieto; los segmentos quedan deshabilitados. Nunca un hueco.

## 4. Reemplazar el film (para el comprador)

1. Poné cinco clips 16:9 de ≥ 4 s en `design/masters/cars/` como `shot-1.mp4 … shot-5.mp4`.
2. `node scripts/apex-reel.mjs` (ajustá `SHOTS` para los nombres y el foco del teléfono).
3. Listo: `public/apex/` se regenera (films, posters y manifest).

**El film de la demo es media de muestra** (canon 18): el aviso va antes del precio, en el
checkout, en el código y en el README cuando el template se registre.

## 5. Verificación (fase 1)

- Navegador integrado (visible, con códecs): carga, reproduce, capítulos y salto, menú del
  teléfono, 1440×900 y 390×844 sin desborde, etiquetas ≥ 11 px.
- Calma (Playwright, `reducedMotion`): video en pausa, poster, texto visible, cortina fuera.
- `npm run verify` completo (1496 tests).
- **Pendiente al registrar:** listas de `check:mobile/motion/parity`, `check:visual`, ZIP
  (`publicDirAssets('apex')`), tarjeta, precio, i18n, sitemap, `gen:og`.

## 6. Lecciones

- Chrome no carga video en una pestaña en segundo plano (`visibilityState: hidden`):
  para medir reproducción hace falta una pestaña visible (el navegador integrado sirve).
- El Chromium de Playwright no trae H.264: sirve para la versión calma, no para ver el film.
- Elegir el archivo por `matchMedia` al montar es frágil con ventanas que cambian de ancho
  (un navegador integrado reportó 0 px al montar y quedó con el film de teléfono estirado):
  por eso se escucha el cambio de breakpoint.

## 6b. Menú, loader, Statement y Gallery

**Menú (en el hero).** Botón hamburguesa de dos líneas que se *juntan* al pasar el mouse (y
forman una X con el menú abierto). El panel baja desde el borde superior como una cortina
(`clip-path`, 800 ms, `--ease-in-out`) y al cerrar el mismo borde sube: misma animación a la
ida y a la vuelta. Los links son grandes, suben enmascarados con un escalonado, y al pasar el
mouse por uno **los demás se atenúan**. La marca también reacciona (se abre el tracking). El film
chico es el mismo del hero, **espejado** y en vertical (para no copiar la referencia), usa el
archivo liviano, se baja recién al abrir y solo se reproduce con el panel arriba. El nav del
hero no cambió; el menú está en escritorio y teléfono.

**Loader (en el hero).** Negro, la palabra de la marca enorme abajo a la izquierda subiendo
enmascarada, rótulos arriba y un contador `000 → 100`. Termina cuando el film está listo (con
tope de 4,5 s) y el **hero lo tapa de abajo hacia arriba** (`clip-path` del escenario, 1,15 s),
con el film asentándose desde un zoom de 1,16. Mientras corre, la página está quieta. Corre
**una vez por carga de página** (un remonte del builder o volver a la ruta no lo repite). No
corre en LAB, en calma, con ahorro de datos ni si la página se abre scrolleada. Todo es campo:
interruptor, los cuatro textos y los dos colores.

**Statement (`apex/Statement`).** La declaración a escala de afiche sobre la misma tinta del
hero (no una pared blanca): cada palabra pasa de fantasma a plena con el scroll, las palabras
entre `*asteriscos*` toman el acento; tres cifras que cuentan al aparecer (mantienen separador
de miles) y un enlace. Líneas finas que se dibujan, con interruptor.

**Gallery (`apex/Gallery`).** Carrusel a 100 svh. El puntero lleva una miniatura vertical de la
imagen **siguiente** con «Next →» (sobre el cuarto izquierdo, la **anterior** con «← Previous»);
el clic abre la imagen *desde el rectángulo de la miniatura* hasta la pantalla completa con un
zoom de 1,45 → 1. El cuarto izquierdo vuelve atrás; flechas del teclado, swipe y dos botones
reales hacen lo mismo. Sin mouse: sin miniatura, mismas zonas. Calma: fundido corto. Solo la
activa y sus dos vecinas cargan el archivo.

**Imágenes.** Siete fotos generadas con Higgsfield (`gpt_image_2_5`, calidad alta, 2K, 16:9,
2,75 cr c/u; las del auto con la foto maestra como referencia para que sea el mismo auto del
film). Originales en `design/masters/apex/` (JPG), variantes con `npm run images -- apex`.
**Son media de muestra** (canon 18).

## 6c. Models y Footer

**Models (`apex/Models`).** La gama como lista de nombres a escala de afiche sobre un panel
**claro** (el corte visual entre dos secciones oscuras). Con mouse, el nombre bajo el puntero queda
a pleno y su foto aparece en un cuadrado que **sigue al nombre** por la columna (sin `sticky`: un
widget de LAB lo leería como pineado); en el teléfono, el nombre que cruza el medio de la pantalla
es el activo y lleva su foto chica a la derecha. Hasta 10 modelos (nombre, imagen, enlace).

**Footer (`apex/Footer`).** A pantalla completa: marca y líneas simples arriba, menú y un
newsletter **que funciona** (sin `endpoint` simula el éxito; con uno hace POST
`{ formType: 'newsletter', email }`), bloques de contacto abajo a la derecha y la palabra enorme
abajo a la izquierda (interruptor). No es hosteable en LAB: es el cierre de una página.

## 6d. Story (misión / visión) y Showroom 3D

**Texto de la demo:** todo es placeholder (convención del catálogo: «Brand name», «Headline 1»,
«Lorem ipsum…», «Link 1», «Model 1», «Section label»), para que el comprador lo reemplace sin
borrar copy de otra marca. Los capítulos del film se llaman «Chapter 1…5» (manifest y script).

**Story (`apex/Story`).** Inspirado en «Our mission / Our vision» de klausen.com: hasta tres
bloques (rótulo, titular, texto, imagen, palabra de fondo) con parallax en tres profundidades
(palabra gigante que se desliza de costado, imagen que corre dentro de su marco, texto quieto) y
lados alternados. Hosteable en LAB (FLOW).

**Showroom (`apex/Showroom`).** Sala redonda de noche hecha en Blender + tres autos:

1. **Autos:** foto de producto limpia (auto entero, 3/4, fondo gris; `gpt_image_2_5` medium 2k,
   1 cr) → **Hunyuan3D v3** con PBR (15 cr c/u; Tripo detallado 18, Meshy 7 38). El sedán sale de
   la foto maestra del film (mismo auto). La camioneta se regeneró porque la primera era una
   Rivian casi idéntica (faros ovales): nada que se parezca tanto a un modelo real.
2. **Blender** (`design/blender/apex-showroom.blend`, solo la sala; el .blend completo con autos y
   los GLB crudos están en `design/masters/apex-3d/`, ignorado): piso de hormigón pulido, aletas
   verticales, tres anillos de luz, plataformas con LED, puerta al sur. Autos importados, escalados
   a largo real (4,95 / 4,55 / 5,6 m), diezmados a 140k caras, de costado al centro.
3. **Luz horneada:** Cycles en GPU (OptiX), `COMBINED` sin glossy, 256 muestras + denoise, en
   ~35 s: piso y paredes 2048, el resto 1024. Las sombras de contacto de los autos quedan en las
   plataformas.
4. **Export:** GLB con Draco y texturas WebP: `showroom.glb` 231 KB, autos ~1,25 MB c/u →
   `public/apex/showroom/`; decoder en `public/apex/draco/`.
5. **Web (Three.js):** los materiales `*_baked` se dibujan como `MeshBasicMaterial` (la luz ya está
   en la textura, sin tone mapping); el entorno de los autos es la sala misma (`PMREMGenerator.
   fromScene`) → los anillos se reflejan en la pintura; piso espejado con `Reflector` debajo del
   piso horneado (solo escritorio). La cámara sigue keyframes polares alrededor del centro
   (afuera → puerta → auto 1 → 2 → 3 → vuelta por la pared → sale), con suavizado por cuadro.
   En pantallas angostas la cámara se aleja hasta que el auto entra entero.
5b. **Calidad de los autos (2ª pasada, sin créditos):** el generador hornea la pintura como
   metal (~0,7) y en una sala oscura se ve casi negra. `scripts/car-paint-mask.py` arma una
   máscara de pintura por cromaticidad + luminancia (con el color de pintura como pista: arena
   `0.65,0.6,0.55`, azul `0.108,0.31,0.582`, grafito `0.3,0.3,0.31`) y reescribe el mapa
   metal/rugosidad: pintura → metal 0,12 / rugosidad 0,38 con **barniz** (la máscara va en el
   canal R del mismo mapa: el exportador de glTF lo toma de ahí para `KHR_materials_clearcoat`),
   cubiertas → rugosidad 0,9. Autos a 300k caras y color/relieve en 4K: ~2,6–2,9 MB cada uno.
   En la web, paneles `RectAreaLight` sobre cada plataforma (como las luces de área de Blender) y
   `specularColor` a 1 (Blender exporta ×2).
5c. **Detalles (3ª pasada, en Blender, sin créditos):** un auto recién generado no trae logo ni
   luces. Piezas hijas de cada auto, apoyadas sobre la carrocería por raycast (en espacio del
   objeto):
   - **Emblema inventado** (anillo + chevrón cromado, sin marca real) adelante y atrás.
   - **LED blancos adelante:** cinta que sigue los texeles claros y poco saturados del frente
     (donde el generador pintó los faros).
   - **Barra roja atrás** a todo el ancho. En la camioneta, solo los impactos a menos de 10 cm
     del portón; si no, la cinta se va por las barandas de la caja.
   - **Camioneta:** catadióptricos en el paragolpe.
   - **Cupé:** dos franjas negras de capot a alerón. Se cortan en los vidrios, porque el color
     del parabrisas se parece a la pintura gris y la máscara no alcanza: se recorta por largo.

   Se exportan con el auto (seleccionar el auto y sus hijos, el auto en el origen sin
   rotación). En three, todo material con `emissiveIntensity > 1` pasa a `MeshBasicMaterial`
   sin tone mapping y de dos caras. Sin eso, AgX lava el rojo a rosa y las cintas se cullean
   según el sentido de las caras.
6. **Interacción:** en cada auto, «← Drag →» en el cursor; arrastrar gira el auto (también con el
   dedo: `touch-action: pan-y`); «Close» lo devuelve y muestra la ficha. Seguir bajando pasa al
   siguiente; subir, al anterior.
7. **Calma / sin WebGL:** fotos de costado renderizadas en Blender con las mismas fichas.
8. **Builder sí, LAB no** (decisión del dueño): 10–20 MB de escena y un scroll fijado no van en
   el sitio de un cliente. Campos: autos (nombre, GLB, foto, ficha), sala (GLB), póster, textos,
   reflejo on/off, colores; ayuda con cómo exportar desde Blender.

## 7. Builder y LAB (sección por sección)

Regla del dueño: cada sección de APEX entra al **builder** y se evalúa para **LAB** al
construirse, no al final.

| Sección | Builder | LAB | Notas |
|---|---|---|---|
| `apex/Hero` | sí (paleta, grupo APEX) | sí (`HOSTABLE_SECTIONS`, FLOW) | ~35 campos: texto, links, capítulos (lista, tope 8), film/póster (URL), menú (datos al pie, film on/off), loader (interruptor, 4 textos, 2 colores), grano on/off, 4 colores |
| `apex/Statement` | sí | sí (FLOW) | rótulo, número, declaración (`*acento*`), cifras (lista, tope 4), enlace, líneas on/off, 3 colores |
| `apex/Gallery` | sí | sí (FLOW) | rótulo, número, imágenes (lista, tope 12: imagen/título/texto), botones, miniatura on/off, 3 colores |
| `apex/Models` | sí | sí (FLOW) | rótulo, número, texto, modelos (lista, tope 10: nombre/imagen/enlace), 3 colores |
| `apex/Story` | sí | sí (FLOW) | bloques (lista, tope 3: rótulo/titular/texto/imagen/palabra), palabra on/off, línea on/off, 3 colores |
| `apex/Showroom` | sí | no (3D pesado + scroll fijado) | rótulo, titular, intro, autos (lista, tope 3: nombre/GLB/foto/ficha), sala GLB, póster, 4 textos, reflejo on/off, 3 colores |
| `apex/Footer` | sí | no (cierre de página) | marca, líneas, menú (lista), newsletter (6 textos + endpoint), bloques de contacto (lista), red social, privacidad, palabra grande on/off, 3 colores |

- **Campos:** `src/domain/sectionFields/fields/apex.js`. El servidor valida por nombre:
  `washColor` es color; `filmSrc`, `filmSrcMobile`, `poster`, `posterMobile` son URL de
  assets (https o ruta del sitio).
- **Fuente:** el wrapper del modelo trae Inter Tight (`modelWrappers.js`): una
  composición no tiene `ApexPage`.
- **ZIP:** `publicAssets` del modelo lleva `public/apex/*` y `scripts/apex-reel.mjs`.
  Una composición con el hero se lleva el film de muestra y el script para rehacerlo.
- **LAB:** ver `docs/hosted-component-plan.md` (Fase K). El menú del teléfono usa un
  alias liviano en el embed; la entrada va al doble de velocidad en el widget.
- **Check:** `check:builder` mira el atributo `poster` del video; el póster del teléfono
  está exento (solo se aplica con el viewport angosto).
