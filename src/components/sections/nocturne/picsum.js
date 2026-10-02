/**
 * Las fotos de ejemplo de NOCTURNE salen de picsum.photos, que sirve cualquier
 * tamaño: el srcset pide cada ancho a la misma semilla, así un teléfono no baja
 * la de 1920 px. Una URL propia (builder, LAB, props) queda como `src` simple.
 */
export function picsumAttrs(src, widths = [640, 1080]) {
  const m = /^(https:\/\/picsum\.photos\/seed\/[^/?#]+)\/(\d+)\/(\d+)$/.exec(src || '')
  if (!m) return { src }
  const [, base, w, h] = m
  const W = Number(w)
  const H = Number(h)
  const candidates = widths
    .filter((x) => x < W * 0.87)
    .map((x) => `${base}/${x}/${Math.round((H * x) / W)} ${x}w`)
  return { src, srcSet: [...candidates, `${src} ${W}w`].join(', '), width: W, height: H }
}
