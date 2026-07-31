import { getSection } from '../lib/sectionRegistry'

/**
 * Renders a builder composition as stacked sections with each model's
 * wrapper (bg/text). Shared by live preview and /preview.
 */
export default function CompositionCanvas({
  items,
  id = 'top',
  renderChrome,
}) {
  return (
    <div id={id}>
      {(items || []).map((item) => {
        const section = getSection(item.sectionId)
        if (!section) return null
        const Component = section.component
        return (
          <div
            key={item.uid}
            className={`relative ${section.model.wrapperClass}`}
          >
            {renderChrome?.(item, section)}
            <Component {...(item.props || {})} />
          </div>
        )
      })}
    </div>
  )
}
