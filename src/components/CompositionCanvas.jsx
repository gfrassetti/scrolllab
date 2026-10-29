import { useMemo } from 'react'
import { getSection } from '../lib/sectionRegistry'
import { resolveSectionTheme } from '../lib/sectionTheme'
import { withoutEmptyRows } from '../lib/sectionFields'
import { linkedFizzProps } from '../domain/fizzPalette'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { fontChoiceById } from '../domain/design'

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

/**
 * Lo que de verdad recibe cada sección: sus props, sin filas vacías, más lo que
 * FIZZ toma del hero cuando el comprador lo dejó vacío (el mismo cálculo del
 * empaquetador, para que el ZIP se parezca a esto). Entra en la firma de
 * remontaje: cambiar el sabor del hero tiene que remontar también a las
 * secciones que lo siguen.
 */
function effectiveProps(item, items) {
  const own = withoutEmptyRows(item.props)
  const linked = linkedFizzProps(item.sectionId, own, items)
  return Object.keys(linked).length ? { ...linked, ...(own || {}) } : own
}

function signatures(items) {
  return JSON.stringify(
    Object.fromEntries(items.map((item) => [item.uid, effectiveProps(item, items) || null])),
  )
}

export default function CompositionCanvas({
  items,
  id = 'top',
  renderChrome,
  /** Tipografía global (src/domain/design.js); null = la de cada sección. */
  font = null,
}) {
  const fontChoice = fontChoiceById(font)
  const list = useMemo(() => items || [], [items])
  const live = useMemo(() => signatures(list), [list])
  const settled = useDebouncedValue(live, REMOUNT_DELAY_MS)

  const modelIds = list.map((item) => getSection(item.sectionId)?.model.id)
  // Una sección recién agregada todavía no está en el mapa estabilizado: se usa
  // su firma actual para que monte una sola vez, con la key definitiva.
  const settledProps = useMemo(() => JSON.parse(settled), [settled])
  const liveProps = useMemo(() => JSON.parse(live), [live])

  return (
    <div
      id={id}
      {...(fontChoice ? { 'data-user-font': '' } : {})}
      style={fontChoice ? { '--user-font': fontChoice.stack } : undefined}
    >
      {list.map((item, index) => {
        const section = getSection(item.sectionId)
        if (!section) return null
        const Component = section.component
        // Lo mismo que manda la receta: una fila de lista recién agregada y
        // todavía vacía no se dibuja (tampoco viaja al ZIP).
        const props = effectiveProps(item, list)
        const theme = resolveSectionTheme(
          item.sectionId,
          props,
          modelIds,
          index,
        )
        const signature = JSON.stringify(
          item.uid in settledProps ? settledProps[item.uid] : liveProps[item.uid],
        )
        return (
          <div
            key={item.uid}
            data-section-uid={item.uid}
            className={`relative ${section.model.wrapperClass}`}
          >
            {renderChrome?.(item, section)}
            <Component
              key={signature}
              {...(props || {})}
              {...(theme ? { theme } : {})}
            />
          </div>
        )
      })}
    </div>
  )
}
