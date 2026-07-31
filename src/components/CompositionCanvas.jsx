import { useMemo } from 'react'
import { getSection } from '../lib/sectionRegistry'
import { resolveSectionTheme } from '../lib/sectionTheme'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

/**
 * Renders a builder composition as stacked sections with each model's
 * wrapper (bg/text). Shared by live preview and /preview.
 *
 * Las secciones se remontan cuando cambian sus props porque varias animan el
 * texto con SplitText, que reemplaza el contenido del nodo por divs de
 * caracteres: a partir de ahí React ya no puede actualizar ese texto y el
 * editor parecía no hacer nada. El remonte se posterga hasta que el usuario
 * deja de tipear — reconstruir un hero con WebGL en cada tecla es caro.
 */
const REMOUNT_DELAY_MS = 350

function signatures(items) {
  return JSON.stringify(
    Object.fromEntries(items.map((item) => [item.uid, item.props || null])),
  )
}

export default function CompositionCanvas({
  items,
  id = 'top',
  renderChrome,
}) {
  const list = useMemo(() => items || [], [items])
  const live = useMemo(() => signatures(list), [list])
  const settled = useDebouncedValue(live, REMOUNT_DELAY_MS)

  const modelIds = list.map((item) => getSection(item.sectionId)?.model.id)
  // Una sección recién agregada todavía no está en el mapa estabilizado: se usa
  // su firma actual para que monte una sola vez, con la key definitiva.
  const settledProps = useMemo(() => JSON.parse(settled), [settled])
  const liveProps = useMemo(() => JSON.parse(live), [live])

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
        const signature = JSON.stringify(
          item.uid in settledProps ? settledProps[item.uid] : liveProps[item.uid],
        )
        return (
          <div
            key={item.uid}
            className={`relative ${section.model.wrapperClass}`}
          >
            {renderChrome?.(item, section)}
            <Component
              key={signature}
              {...(item.props || {})}
              {...(theme ? { theme } : {})}
            />
          </div>
        )
      })}
    </div>
  )
}
