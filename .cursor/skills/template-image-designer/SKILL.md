---
name: template-image-designer
description: >-
  Diseñador / generador de piezas de imagen realistas para templates scrollytelling
  SCROLLLAB. Usar al crear o portar un template nuevo, al armar mosaicos, heroes,
  cutouts PNG transparentes, ventanas de LanguageBlock, o cualquier beat que en la
  referencia sea fotografía u objeto 3D/foto animado. Sustituye picsum/stock random
  por assets locales coherentes con el mundo del SKU.
---

# Template image designer

Rol: **art director + generador de imágenes** para un modelo vendible. El código anima piezas; sin piezas reales el template no se vende.

## Cuándo activarse

- Template nuevo / port desde URL de referencia
- Sección con muchas fotos distintas (mosaico, grid, language bands, slider)
- Objeto foreground que sube/cruza tipografía (trophy, product, orb → PNG alpha)
- El usuario pide “assets”, “imágenes”, “cutouts”, “piezas” o que se vea “como la ref”

## Flujo

1. **Inventario** (desde analyze:ref, screenshots, o la ref en vivo): una fila por pieza.

| id | rol | formato | notas de animación |
|----|-----|---------|-------------------|
| `m1` | mosaico tile | jpg/webp foto | pan / scale en scrub |
| `rising-mark` | foreground | png alpha | yPercent rise sobre type |

2. **Brief visual del SKU** (1 párrafo): sujeto, luz, paleta, época, qué NO (logos de marcas reales, caras de celebridades, trofeos FIFA™, etc.). Preferir genérico creíble.

3. **Generar** cada pieza con **Higgsfield** (plugin MCP `plugin-higgsfield-higgsfield`), no picsum:
   - Fotos: `generate_image` (si el modelo no está claro, `models_explore`). Prompt: sujeto concreto + lente/luz + fondo + “photorealistic, no text, no watermark, no logo”.
   - Cutouts: generar y luego `remove_background`; **verificar** esquina `A=0`.
   - Fallback si el plugin no está: tool `GenerateImage` de Cursor; si sale sin alpha, post-procesar (Pillow / rembg).
   - Variedad: mosaicos = tomas distintas del mismo mundo, no el mismo crop 8 veces
   - Aspecto cercano al uso (portrait 3:4, landscape 16:9, square)
   - Video / GLB: `get_cost:true` y confirmar créditos con el usuario antes de `generate_video` / `generate_3d`

4. **Colocar** en `src/components/sections/<sku>/assets/<nombre>.{png,jpg,webp}` e **import** en el componente (default props). No URLs externas frágiles.

5. **Cablear motion** después: parallax, scrub, pin, mask — la pieza ya existe.

6. Anotar en Obsidian (`<Name> - mapa de referencia.md` o nota de assets) la lista final de archivos.

## Estándares de calidad

- Realista / editorial sports-lifestyle-product según el brief — no illustration flat ni 3D toy si la ref es foto
- Coherencia de color grading entre piezas del mismo SKU
- PNG alpha obligatorio para objetos encima de tipo
- Tamaño razonable para web (evitar 8K innecesario; ~1–2k px en el lado largo suele bastar)
- Copy del marketplace sigue en inglés placeholder; las imágenes no llevan texto

## Anti-patrones

```text
❌ default = 'https://picsum.photos/seed/…'
❌ un SVG geométrico donde la ref usa un objeto fotográfico
❌ “ya lo animamos, las fotos después”
❌ un solo asset repetido en todo el mosaico
```

```text
✅ import tile1 from './assets/mosaic-01.jpg'
✅ rising-mark.png con alpha verificado
✅ inventario completo antes de dar el template por cerrado
```

## Checklist de cierre de template

- [ ] Inventario de piezas = archivos en `assets/`
- [ ] Ningún default vendible apunta a picsum/unsplash random
- [ ] Cutouts con alpha real
- [ ] Packaging incluye la carpeta (walk recursivo en `server/packaging.js`)
