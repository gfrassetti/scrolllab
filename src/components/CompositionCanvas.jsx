import { getSection } from '../lib/sectionRegistry'
import { resolveSectionTheme } from '../lib/sectionTheme'

/**
 * Renders a builder composition as stacked sections with each model's
 * wrapper (bg/text). Shared by live preview and /preview.
 */
export default function CompositionCanvas({
  items,
  id = 'top',
  renderChrome,
}) {
  const list = items || []
  const modelIds = list.map((item) => getSection(item.sectionId)?.model.id)

  return (
    <div id={id}>
      {list.map((item, index) => {
        const section = getSection(item.sectionId)
        if (!section) return null
        const Component = section.component
        const theme = resolveSectionTheme(
          item.sectionId,
          item.props,
          modelIds,
          index,
        )
        return (
          <div
            key={item.uid}
            className={`relative ${section.model.wrapperClass}`}
          >
            {renderChrome?.(item, section)}
            <Component {...(item.props || {})} {...(theme ? { theme } : {})} />
          </div>
        )
      })}
    </div>
  )
}
