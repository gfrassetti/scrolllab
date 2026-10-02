import ScrollRail from './ScrollRail'

/**
 * Barra de scroll propia del market: la monta SiteHeader. Es el mismo riel que
 * usan los templates (`ScrollRail`), con la paleta del market, visible también
 * en táctil y sin arrastre — como estaba antes de que existiera ScrollRail.
 */
export default function ScrollProgress() {
  return (
    <ScrollRail trackClassName="bg-ink/10" fillClassName="bg-accent" interactive={false} touch />
  )
}
