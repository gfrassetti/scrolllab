/**
 * cāpsula33 — la marca en código: colores, tipografías y el horario.
 *
 * Naranja y negro, como el local. El nombre va en una mono liviana en
 * minúscula (su logo); los títulos en una cuadrada técnica, la de sus piezas
 * impresas (ELEGIDOS, CAPSULA33); el texto corrido en una sans de lectura.
 */

export const C = {
  void: '#070708',
  ink: '#111113',
  orange: '#e4601d',
  neon: '#ff7a1a',
  cream: '#f2e9dc',
  paper: '#e9dcc6',
  blueprint: '#3d6472',
}

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Roboto+Mono:wght@300;400;600;700&family=Barlow:wght@400;500&display=swap'

export const MONO = { fontFamily: "'Roboto Mono', ui-monospace, monospace" }
export const DISPLAY = { fontFamily: "'Chakra Petch', 'Barlow', sans-serif" }
export const BODY = { fontFamily: "'Barlow', 'Helvetica Neue', Arial, sans-serif" }

/** Martes a sábados 9–21, lunes 9–15, domingo cerrado (su sitio actual). */
export const HOURS = [
  { day: 1, open: 9, close: 15 },
  { day: 2, open: 9, close: 21 },
  { day: 3, open: 9, close: 21 },
  { day: 4, open: 9, close: 21 },
  { day: 5, open: 9, close: 21 },
  { day: 6, open: 9, close: 21 },
]

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Abierto ahora (hora de San Martín de los Andes, UTC−3), y si no, cuándo abre. */
export function openStatus(now = new Date()) {
  const local = new Date(now.getTime() + now.getTimezoneOffset() * 60_000 - 3 * 3_600_000)
  const day = local.getDay()
  const hour = local.getHours() + local.getMinutes() / 60
  const today = HOURS.find((h) => h.day === day)
  if (today && hour >= today.open && hour < today.close) {
    return { open: true, label: `Abierto · hasta las ${today.close}:00` }
  }
  for (let i = 0; i < 8; i += 1) {
    const d = (day + i) % 7
    const h = HOURS.find((x) => x.day === d)
    if (!h) continue
    if (i === 0 && hour >= h.open) continue
    return { open: false, label: `Cerrado · abre ${i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${DAYS[d]}`} a las ${h.open}:00` }
  }
  return { open: false, label: 'Cerrado' }
}
