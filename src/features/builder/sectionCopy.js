/** Claves de i18n del builder: el tipo de cada sección y el copy de cada una. */
export const kindLabelKeys = {
  nav: 'builder.kind.nav',
  hero: 'builder.kind.hero',
  section: 'builder.kind.section',
  footer: 'builder.kind.footer',
}

export function sectionCopyKey(sectionId, field) {
  return `builder.sections.${sectionId.replace('/', '.')}.${field}`
}
