/**
 * Fondo y color de texto de cada modelo cuando sus secciones se mezclan en una
 * composición del builder. Una sola tabla para el preview (sectionRegistry) y
 * para el App.jsx del ZIP (server/packaging.js): eran dos y se despegaron, y
 * UNITY y MERIDIAN se descargaban con otro fondo que el aprobado en pantalla.
 *
 * contact y commerce no ponen fondo ni color a propósito: pintan su propio tema.
 *
 * Todos fijan font-grotesk: en el ZIP es lo mismo que hereda del body, y en el
 * builder / LAB la vista previa no depende de la fuente propia del market.
 */
export const MODEL_WRAPPER_CLASS = {
  chapters: 'bg-bone font-grotesk text-ink',
  nocturne: 'bg-noir font-grotesk text-salt',
  monolith: 'bg-concrete font-grotesk text-carbon',
  fizz: 'bg-grape font-grotesk text-foam',
  velocity: 'bg-[#0a1a12] font-grotesk text-[#ece9e2]',
  atelier: 'bg-white font-grotesk text-[#111111]',
  unity: 'bg-[#e7e4dc] font-grotesk text-[#0a0a0a]',
  ratio: 'bg-ratio-paper font-grotesk text-ratio-ink',
  atrium: 'bg-[#f4f1ea] font-grotesk text-[#111111]',
  plum: 'bg-plum-void font-grotesk text-plum-mist',
  meridian: 'bg-[#dfd8cf] font-grotesk text-[#2a2622]',
  // La fuente va en el wrapper: en una composición del builder no hay KinPage que la ponga.
  kin: "bg-[#e1e2de] font-['Inter_Tight',_'Helvetica_Neue',_Arial,_sans-serif] text-[#141414]",
  apex: "bg-[#04070d] font-['Inter_Tight',_'Helvetica_Neue',_Arial,_sans-serif] text-[#e8edf6]",
  // La fuente va en el wrapper (Poppins la carga el Hero); sin KinPage-style página que la ponga.
  ordo: "bg-[#f3f1ea] font-['Poppins',_Arial,_sans-serif] text-[#161513]",
  signal: 'bg-signal-ink font-grotesk text-signal-paper',
  // Pintan su propio tema, pero la fuente es la del body del template.
  contact: 'font-grotesk',
  commerce: 'font-grotesk',
}

export function modelWrapperClass(model) {
  return MODEL_WRAPPER_CLASS[model] ?? 'bg-bone text-ink'
}
