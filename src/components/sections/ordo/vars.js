/**
 * The three colours of the sheet as CSS variables (`--od-paper`, `--od-ink`, `--od-rust`, defined in ordo.css).
 * Every section takes `bg` / `fg` / `accent` as props and sets them on its own root, so a section placed alone in a
 * composition, or inside the full page, wears the colours of its fields. Everything else (muted text, rules, the
 * grey of the labels) is derived from these three in ordo.css.
 */
export const sectionVars = ({ bg, fg, accent } = {}) => ({
  ...(bg ? { '--od-paper': bg } : null),
  ...(fg ? { '--od-ink': fg } : null),
  ...(accent ? { '--od-rust': accent } : null),
})

/** A row of a list prop may come half empty from the builder: keep what is there. */
export const rows = (value, fallback) => (Array.isArray(value) ? value : fallback)
