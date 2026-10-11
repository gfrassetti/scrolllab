import ScrollRail from './ScrollRail'

/**
 * Barra de scroll propia del market (la monta SiteHeader; las pantallas sin
 * SiteHeader —builder, vista previa, legales— la montan solas). Es el mismo
 * riel de los templates (`ScrollRail`) con la paleta del market y sin arrastre.
 */
export default function ScrollProgress() {
  return (
    <ScrollRail trackClassName="bg-ink/10" fillClassName="bg-accent" interactive={false} />
  )
}
