# VANTA — cómo está hecho KPR realmente (evidencia de red)

Análisis mecánico de `https://kprverse.com/` hecho el 2026-08-28 leyendo **network requests reales**, no inspección visual. Complementa `docs/reference-analysis/vanta.md` (38 beats del analyzer) y corrige una imprecisión de `docs/scroll-media.md`.

> **Conclusión corta:** KPR no es "WebGL puro" ni "secuencia de WebP". Son **tres motores distintos conviviendo**, y el que más define su estética — el *second layer* — no estaba documentado en el repo.

---

## Los tres motores

### 1. Three.js + texturas KTX2 (escena en tiempo real)

```
/images/compressed/ktx/tableau/keep/kai/kai-3.ktx2
/images/compressed/ktx/tableau/keep/beam-ship/beam-ship-0.ktx2
/images/compressed/ktx/tableau/keep/beam-ship/beam-ship-1.ktx2
/images/compressed/ktx/tableau/keep/beam-ship/beam-ship-2.ktx2
```

`.ktx2` = Basis Universal, textura **comprimida para GPU**. Se transcodifica en un worker (de ahí las decenas de `blob:` en el waterfall) y se sube directo a VRAM sin pasar por decode de imagen.

Es la familia A de `docs/scroll-media.md` y está bien identificada ahí.

**Ojo con el arte:** el retrato del hero es **ilustración 2D painterly sobre un plano**, no un mesh. KPR no tiene arte 3D. Esto explica por qué el `hero-card.glb` de Meshy quedó feo en la iteración anterior: se intentó resolver con geometría algo que en la referencia es una textura plana con órbita de cámara.

### 2. Sprite atlas frame-by-frame (el wordmark)

```
/images/sheets/logo-anim-low-res-0.json    ← descriptor TexturePacker
/images/compressed/ktx/sheets/logo-anim-low-res-0.ktx2  ← el atlas
```

| Dato | Valor |
|---|---|
| Formato | TexturePacker (`codeandweb.com`), `RGBA8888` |
| Atlas | 2048 × 2048 |
| Frames | **101** (`logo_anim_downscaled_00000.png` … `00100`) |
| Frame | 206 × 124 (trimmed, con `spriteSourceSize`) |

**Acá sí hay frame-by-frame** — es la intuición correcta, pero la implementación no es "un webp tras otro". Son 101 fotogramas empaquetados en **un solo archivo**, reproducidos moviendo el offset de UV en el shader. Una request, cero stutter de decode, rewind perfecto.

Es la animación del logo/wordmark (el zoom por la A del boot).

### 3. After Effects → JSON (el *second layer*) ← **el que faltaba**

```
/data/2ndlayer.ae.json
```

Export literal de un proyecto de After Effects, replayado en el browser:

```json
{ "project": { "totalDuration": 180.18, "compositions": [
  { "name": "keep0", "duration": 30.03, "numLayers": 8, "size": [1920,1080],
    "layers": [ { "name": "5", "type": "ADBE AV Layer",
                  "inOut": [5.47, 7.47],
                  "properties": { "position": {"keyframes":[...]},
                                  "scale":    {"keyframes":[...]},
                                  "anchorpoint": {...}, "marker": {...} } } ] } ] } }
```

`ADBE AV Layer` es el identificador de tipo de capa de AE. Seis composiciones, desktop + mobile por tableau:

| Composición | Size | Layers |
|---|---|---|
| `universe0` / `universeMobile0` | 1920×1080 / 375×630 | 8 / 9 |
| `keep0` / `keepMobile0` | 1920×1080 / 375×630 | 8 / 6 |
| `factions0` / `factionsMobile0` | 1920×1080 / 375×630 | 11 / 10 |

Propiedades animadas por capa: `position`, `scale`, `anchorpoint`, `marker`. Un motion designer lo animó en AE; el sitio interpola esos keyframes contra el playhead del scroll.

#### Las fuentes de esas capas son los WebP

```
/images/compressed/webp/tableau/{keep,factions,universe}/second-layer/flow-0/set-{0..5}/{slot}.webp
```

Nueve slots con nombre de **ancla de pantalla**, no de fotograma:

`trc` `brc` `blc` · `crl` `crs` · `cbl` `cbs` · `cl` `cs`
(top/bottom + right/left corner; center right/bottom, large/small)

Bajé los 27 archivos de `keep/set-{0,3,5}` y medí:

| Archivo | Peso | Dimensiones |
|---|---|---|
| `set-0/crs.webp` | 3.6 KB | 1000×1000, alpha |
| `set-0/blc.webp` | 2.3 KB | 500×500, alpha |
| `set-3/brc.webp` | 1.1 KB | 500×500, alpha |
| `set-5/blc.webp` | 3.5 KB | 500×500, alpha |
| **el resto (21 de 27)** | **0.1 KB** | **1×1 transparente** |

Los 1×1 son **stubs**: el grid de slots es fijo, casi todas las posiciones van vacías. Solo unas pocas llevan arte real, siempre **cutout con alpha**.

**Entonces el *second layer* es un collage de recortes con alpha, anclados a posiciones nombradas, animados con keyframes de AE.** No es un flipbook. Los `set-0..5` son pasos de profundidad/parallax, no frames consecutivos.

### 4. (bonus) Audio por tableau

```
INTROx_song.mp3 · INTROx_AFTER_loop.mp3
TBL1_song.mp3   · TBL1_AFTER_loop.mp3     ← idem TBL2, TBL3
FX_Wind.mp3 · FX_TBL_Transition.mp3 · FX_press_sheen.mp3
```

Cada tableau tiene tema + loop de permanencia, más FX de transición y de press. El click-to-sound del boot existe para poder arrancar el `AudioContext`.

---

## Qué significa para VANTA

### Corrección a `docs/scroll-media.md`

Ese doc lista `kprverse` como ejemplo de **familia A (tiempo real 3D)** y contrapone la **familia B (secuencia de fotogramas, pear.no/Apple)**. Es correcto pero incompleto: KPR usa A **y** una variante de B (atlas, no archivos sueltos) **y** un tercer sistema (AE→JSON) que el doc no contempla.

### Qué sí replicamos y con qué

| Mecanismo KPR | En VANTA | Por qué |
|---|---|---|
| Three.js + plano texturizado + órbita damp | **igual** — `src/lib/webgl/` | Ya existe el mini motor. El arte es 2D painterly, no GLB. |
| KTX2 / Basis | **no** en v1 | Es optimización de carga, no estética. Textura normal alcanza a nuestra escala, y el comprador no debería necesitar un transcoder en el ZIP. |
| Atlas 101 frames del wordmark | **no como atlas** — máscara SVG | Nuestro wordmark es vectorial. Animar el clip-path de la A es más nítido, pesa nada y es editable por el comprador. El resultado en pantalla es el mismo. |
| AE → JSON | **no** — **Beat** | No tenemos motion designer ni AE. Pero el *contenido* de ese JSON es exactamente lo que Beat ya hace: keyframes de position/scale sobre un riel con seek al scroll. |
| Cutouts con alpha en anclas nombradas | **sí, y es prioritario** | Es la firma visual de KPR. Higgsfield + `remove_background`, colocados en slots con nombre. |
| Audio por tableau | **decidir** | Suma muchísimo a la sensación "live-service", pero pesa en el ZIP y hay que licenciarlo. |

### La implicancia que cambia el plan del handoff

El handoff dedica el Paso 4 entero al hero WebGL y no menciona el *second layer* ni una vez. Pero mirando la evidencia, **buena parte de lo que hace sentir "KPR" a KPR es el collage de recortes en parallax sobre cada tableau**, no el retrato del hero.

Traducción práctica: después de boot + hero, el siguiente entregable de mayor impacto no es KeeperVista como sección aislada, sino un **componente `SecondLayer`** reutilizable —grid de slots con nombre + riel Beat— que las secciones Keeper / Factions / World consumen con distinto arte. Eso es un subsistema, no una sección, y conviene construirlo una vez.

---

## Cómo reproducir este análisis

```bash
curl -s https://kprverse.com/data/2ndlayer.ae.json | node -e "…"
curl -s https://kprverse.com/images/sheets/logo-anim-low-res-0.json | node -e "…"
```

O con el browser pane: `preview_start` en la URL → `read_network_requests` con `limit: 200` una vez que pasó el boot.

## Qué NO portar (recordatorio de licencia)

Nada de esto viaja al ZIP: bundle Nuxt/Vue, los `.ktx2` de KPR, los WebP de sus tableaux, `2ndlayer.ae.json`, los MP3, el arte de Kai/Keepers, el copy y las URLs de protocolo. Se extrae la **receta de motion**, no el material.
