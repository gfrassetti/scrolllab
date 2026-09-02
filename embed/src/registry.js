/**
 * Secciones hosteables. Fase 1: solo el piloto.
 * `inlineDynamicImports` del build mete todo en un archivo igual — el import()
 * es para mantener el registro declarativo, no para code-splitting real todavía.
 */
export async function loadSection(sectionId) {
  switch (sectionId) {
    case 'chapters/FooterCTA':
      return (
        await import('../../src/components/sections/chapters/FooterCTA.jsx')
      ).default
    // `chapters/HorizontalPanels` NO va: scrolljack pineada, se rompe dentro
    // del iframe acotado del embed. Ver HOSTABLE_SECTIONS en server/sections.js.
    default:
      return null
  }
}
