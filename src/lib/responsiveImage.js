/**
 * Props de <img> para las fotos de un template.
 *
 * Las fotos de ejemplo vienen en WebP y en varios anchos
 * (scripts/gen-image-variants.mjs → `assets/images.js` de cada modelo): con
 * `srcSet` el teléfono baja la de 640 o 1080 px en vez de la completa, y
 * `width`/`height` reservan el lugar antes de que cargue. Si el comprador puso
 * otra imagen (builder, LAB, props) va como `src` simple: de esa no hay
 * versiones.
 *
 *   <img {...imgAttrs(img, variants)} sizes="(min-width: 768px) 50vw, 100vw" alt="" />
 *
 * con `variants` importado del `assets/images.js` del modelo.
 *
 * `sizes` lo pone cada sección: es el ancho con el que se ve la foto.
 */
export function imgAttrs(src, variants) {
  const v = src ? variants?.[src] : undefined
  if (!v) return { src }
  return { src, srcSet: v.srcSet, width: v.width, height: v.height }
}
