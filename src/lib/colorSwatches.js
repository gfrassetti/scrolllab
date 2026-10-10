/**
 * Muestras rápidas de los campos de color (builder y LAB). Una sola lista: si
 * cambia la paleta, cambia acá y la toman todos los campos (ColorField).
 * `key` es la clave de i18n del nombre (`fields.swatch.<key>`).
 */
export const COLOR_SWATCHES = Object.freeze([
  { key: 'black', value: '#0a0a0a' },
  { key: 'graphite', value: '#2b2b2b' },
  { key: 'gray', value: '#8a8a8a' },
  { key: 'bone', value: '#f2efe9' },
  { key: 'white', value: '#ffffff' },
])

/** `#abc` / `#aabbcc(dd)` → `#aabbcc` para el `<input type="color">` (no acepta otra cosa). */
export function toPickerHex(value) {
  const v = String(value || '')
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  if (/^#[0-9a-f]{6,8}$/i.test(v)) return v.slice(0, 7)
  return '#000000'
}

/** ¿Es la misma muestra? (sin distinguir mayúsculas ni #abc de #aabbcc). */
export function sameColor(a, b) {
  if (!a || !b) return false
  return toPickerHex(String(a).toLowerCase()) === toPickerHex(String(b).toLowerCase())
}
