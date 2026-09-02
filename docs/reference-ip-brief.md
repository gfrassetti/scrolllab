# Reference IP — brief (política explícita)

> Aplica a **todo** trabajo hecho contra un sitio de referencia: kprverse, sitios
> Readymag/Framer, ganadores de Awwwards, cualquier landing que se toma como modelo.
> Generaliza el §6 de [`kprverse-handoff.md`](kprverse-handoff.md) para que sea la
> regla del repo, no un párrafo de un handoff puntual.

---

## 1. El principio

Se clona la **sensación**: el arco de la página, la mecánica de motion, el ritmo,
la jerarquía, la escala tipográfica.

**Nunca** se clona el **material**: el código, los assets, el copy, los datos de
animación exportados.

La diferencia práctica: mirás la ref para entender *qué hace* y *cómo se siente*,
lo reconstruís con **primitivos y código propios del repo**
([`motion-cookbook.md`](motion-cookbook.md), [`scrolllab-beat.md`](scrolllab-beat.md),
[`scrolllab-webgl.md`](scrolllab-webgl.md)) y **arte propio**.

---

## 2. Qué SÍ se puede tomar de una referencia

| Cosa | Cómo | Por qué es OK |
|---|---|---|
| El **stack** que usa | DevTools → Network / `data-engine` / bundles | Es un hecho público. "Usa Three r150 stock + GSAP" no es propiedad de nadie. |
| Las **técnicas** de un efecto | Observar el comportamiento, leer el patrón (pin+scrub, atlas de sprites, replay de keyframes, órbita de cámara con damp) | Las técnicas son conocimiento general de la industria. |
| **Medidas** del DOM de la ref | `npm run analyze:ref` — tamaños de tipo en px reales, colores de fondo, orden de secciones, beats donde cambia la firma | Medir para calibrar tu propia escala no copia nada. |
| El **arco** / orden de la página | Mapa beat→primitivo→archivo | La estructura narrativa de "boot → hero → tableaux → footer" es un patrón, no una obra. |
| **Capturas** de la ref para comparar | `docs/reference-analysis/<sku>/beats/*.jpg` como referencia visual **interna**, nunca embebidas en el producto | Uso de referencia, no redistribución. |

---

## 3. Qué NO se toca — nunca

- **El bundle / los scripts JS de la ref.** Minificados o no. No se piden, no se
  pegan al repo, no se "reconstruye desde ahí", no se usa como base de un motor
  propio. Es código propietario con copyright.
- **Sus imágenes, video, audio, fuentes.** Ni como placeholder "temporal". Los
  `.webp` / `.mp4` / `.ktx2` / `.mp3` de la ref no entran al repo ni al ZIP.
- **Sus datos de motion exportados** — p.ej. un `2ndlayer.ae.json` (export literal
  de After Effects), descriptores de atlas, timelines serializadas. Se replica la
  *receta* (keyframes de posición/escala sobre un riel con seek al scroll) con
  nuestro motor, no el archivo.
- **Su copy.** Titulares, párrafos, nombres de personajes, URLs de "protocolo",
  microcopy. Todo se reemplaza por texto genérico en inglés (Headline N / lorem
  corto / placeholder).
- **Su identidad** — nombre, marca, logo, paleta-como-firma si es reconocible.
- **Su arte** — personajes, ilustraciones, world-building. Se genera un set
  **original** (Higgsfield / Meshy / encargo) inspirado en el *estilo general*
  (p.ej. "cyberpunk anime painterly"), nunca los mismos personajes ni composiciones
  calcadas.

---

## 4. Por qué esta línea, y no más laxa

1. **Es un producto que se vende.** Un template o un motor con código/assets
   derivados de un sitio propietario es un pasivo legal para cada comprador y para
   SCROLLLAB. El valor está en construirlo bien, no en copiarlo.
2. **El moat es el craft, no el atajo.** Si el diferencial fuera "tenemos su
   código", cualquiera lo tiene. El diferencial real es el mini-motor propio
   (`beat`, `webgl`), el builder, y saber reproducir la sensación con eso.
3. **"Inspirado en el patrón" es defendible; "port del bundle" no.** Un engine de
   scrollytelling WebGL hecho de cero (canvas persistente + scene director +
   binding de scroll + transiciones) es un activo nuestro aunque el patrón venga de
   mirar KPR. Un fork de su implementación no lo es.

---

## 5. El flujo que se mantiene limpio

```
1. analyze:ref  → comportamiento + medidas + beats (docs/reference-analysis/<sku>/)
2. mapa         → beat → primitivo (motion-cookbook / beat / webgl) → archivo propio
3. código       → componentes nuevos en src/components/sections/<sku>/, motor del repo
4. arte         → set original generado o encargado; copy genérico en inglés
5. verificación → capturas propias a 1440×900 vs los beats de la ref
```

Nada del paso 1 entra al ZIP vendido salvo lo que uno escribió. Los `beats/*.jpg`
y los `.md` de análisis son material interno de trabajo.

---

## 6. Si el usuario ofrece el código / los assets de la ref

Respuesta estándar: **no**, y por qué (esta política). No es negociable por
urgencia ni por "es solo para arrancar". Lo que sí se acepta:

- Screenshots o video (Loom) de la ref → referencia visual interna, OK.
- Que describa el comportamiento con palabras → OK.
- Acceso a la ref en vivo para inspeccionar el Network tab → OK (ya es público).

Lo que no se acepta: pegar sus `.js`, sus imágenes, su `ae.json`, y pedir
"reconstruilo a partir de esto".

---

## 7. Checklist de IP al cerrar un template contra ref

- [ ] Cero archivos de la ref en el repo (JS, imágenes, video, audio, fuentes, JSON de motion).
- [ ] Copy 100% genérico/placeholder — ningún titular ni nombre propio de la ref.
- [ ] Arte propio (generado/encargado), no composiciones calcadas de la ref.
- [ ] El motion usa primitivos del repo, no una timeline portada.
- [ ] Nombre/marca/logo del template son propios, no evocan la identidad de la ref.
- [ ] Los `docs/reference-analysis/<sku>/` quedan como material interno (no se empaquetan).
