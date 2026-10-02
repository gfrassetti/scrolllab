/**
 * Fondo y color de texto de cada modelo cuando sus secciones se mezclan en una
 * composición del builder. Una sola tabla para el preview (sectionRegistry) y
 * para el App.jsx del ZIP (server/packaging.js): eran dos y se despegaron, y
 * UNITY y MERIDIAN se descargaban con otro fondo que el aprobado en pantalla.
 *
 * contact y commerce van vacíos a propósito: pintan su propio tema.
 */
export const MODEL_WRAPPER_CLASS = {
  chapters: 'bg-bone text-ink',
  nocturne: 'bg-noir text-salt',
  monolith: 'bg-concrete text-carbon',
  fizz: 'bg-grape text-foam',
  velocity: 'bg-[#0a1a12] text-[#ece9e2]',
  atelier: 'bg-[#0b0c10] text-white',
  unity: 'bg-[#e7e4dc] text-[#0a0a0a]',
  ratio: 'bg-ratio-paper text-ratio-ink',
  atrium: 'bg-[#f4f1ea] text-[#111111]',
  plum: 'bg-plum-void text-plum-mist',
  meridian: 'bg-[#dfd8cf] text-[#2a2622]',
  signal: 'bg-signal-ink text-signal-paper',
  contact: '',
  commerce: '',
}

export function modelWrapperClass(model) {
  return MODEL_WRAPPER_CLASS[model] ?? 'bg-bone text-ink'
}
