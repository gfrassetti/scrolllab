import { useEffect, useMemo, useState } from 'react'
import { getSection } from '../lib/sectionRegistry'
import { getSectionFieldGroups, getSectionFields, sanitizeProps } from '../lib/sectionFields'
import { recipeHasCommerce } from '../lib/composition'
import { resolveSectionTheme } from '../lib/sectionTheme'
import { commerceThemeFromItems } from '../lib/shop/theme'
import { checkoutPropsFromItems } from '../lib/shop/checkoutProps'
import { productsFromItems } from '../lib/shop/catalog'
import CompositionCanvas from './CompositionCanvas'
import CompositionShopShell from './CompositionShopShell'
import SectionFieldRow from './SectionFieldRow'
import FieldGroups from './FieldGroups'
import ModelTryout from './ModelTryout'
import FontPicker from './FontPicker'
import Collapse from './Collapse'
import { fontChoiceById } from '../domain/design'
import { useLocalModel } from '../lib/localModel'
import { useT } from '../i18n'

/**
 * Ayudas del builder bajo cada tipo de campo. Una imagen viaja al ZIP como la
 * URL o ruta que se escribe (antes había un «probar archivo local» que solo se
 * veía en el preview y no llegaba a la descarga). Una lista reemplaza entera a
 * la de ejemplo de la sección.
 */
const FIELD_HINT_KEY = {
  image: 'builder.assetHint',
  list: 'builder.listHint',
}

/**
 * Dónde va el botón «Editar» de cada sección. La nav es `fixed` y su wrapper
 * mide 0: en el mismo lugar que el resto, su botón quedaba tapado por el del
 * hero y no había forma de editarla. Todos bajan por debajo de la barra de la
 * nav (así no tapan su menú); el de la nav va a la izquierda.
 */
const CHIP_POSITION = {
  nav: 'top-24 left-3',
  section: 'top-24 right-3',
}

/**
 * Live composition preview with a side panel to edit text props per section.
 * When the recipe includes commerce/ProductGrid, shop routes run in a nested router.
 */
export default function BuilderPreview({ items, font = null, onChangeFont = null, onChangeProps, onExit }) {
  const t = useT()
  const [editingUid, setEditingUid] = useState(null)
  const [fontOpen, setFontOpen] = useState(false)
  const fontChoice = fontChoiceById(font)
  const editing = items.find((item) => item.uid === editingUid)
  const editingSection = editing ? getSection(editing.sectionId) : null
  const fields = editing ? getSectionFields(editing.sectionId) : []
  // Secciones con muchos campos (la grilla de la tienda): grupos plegables.
  const fieldGroups = editing ? getSectionFieldGroups(editing.sectionId) : null
  // La ayuda de imágenes va una vez por panel, no repetida en cada campo.
  const firstAssetKey = fields.find((f) => f.type === 'image')?.key
  // Un .glb de la computadora probado en el panel: solo cambia lo que se ve acá
  // (no entra en las props de la composición ni viaja al carrito o al ZIP).
  const localModels = useLocalModel((s) => s.byUid)
  const clearLocalModels = useLocalModel((s) => s.clearAll)
  useEffect(() => clearLocalModels, [clearLocalModels])
  const canvasItems = useMemo(
    () =>
      items.map((item) =>
        localModels[item.uid]
          ? { ...item, props: { ...(item.props || {}), modelUrl: localModels[item.uid].url } }
          : item,
      ),
    [items, localModels],
  )
  const hasCommerce = recipeHasCommerce(items.map((i) => i.sectionId))
  const shopTheme = commerceThemeFromItems(items, resolveSectionTheme)
  const checkoutProps = checkoutPropsFromItems(items)
  const shopProducts = productsFromItems(items)

  const editLabelFor = (section) => {
    if (section.kind === 'nav') return t('builder.editNav')
    if (section.kind === 'hero') return t('builder.editHero')
    if (section.kind === 'footer') return t('builder.editFooter')
    return t('builder.editSection')
  }

  const home = (
    <CompositionCanvas
      items={canvasItems}
      font={font}
      renderChrome={(item, section) => {
        const active = item.uid === editingUid
        return (
          <>
            <button
              type="button"
              data-sl-ui
              onClick={() =>
                setEditingUid((uid) => (uid === item.uid ? null : item.uid))
              }
              className={`absolute z-[60] min-h-9 border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] shadow-sm transition-colors ${
                section.kind === 'nav' ? CHIP_POSITION.nav : CHIP_POSITION.section
              } ${
                active
                  ? 'border-accent bg-accent text-bone'
                  : 'border-ink/30 bg-bone/90 text-ink hover:border-ink'
              }`}
            >
              {active ? t('builder.editing') : editLabelFor(section)}
            </button>
            {active && (
              <div
                aria-hidden="true"
                data-sl-ui
                className="pointer-events-none absolute inset-0 z-10 ring-2 ring-accent/70 ring-inset"
              />
            )}
          </>
        )
      }}
    />
  )

  return (
    <div className="relative">
      {hasCommerce ? (
        <CompositionShopShell
          font={font}
          home={home}
          theme={shopTheme}
          checkoutProps={checkoutProps}
          items={items}
          products={shopProducts}
        />
      ) : (
        home
      )}

      {editing && editingSection && fields.length > 0 && (
        <aside
          data-native-cursor
          className="fixed inset-x-0 bottom-0 z-9998 flex max-h-[62svh] flex-col border-t border-ink/20 bg-bone text-ink shadow-xl md:top-0 md:right-0 md:left-auto md:h-svh md:max-h-none md:w-full md:max-w-md md:border-t-0 md:border-l"
        >
          <div className="flex items-center justify-between border-b border-ink/15 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('builder.editPanel')}
              </p>
              <p className="mt-1 text-sm font-medium">
                {editingSection.name}
              </p>
              {editingSection.beat && (
                <p className="mt-2 max-w-[36ch] text-xs leading-relaxed text-ink/50">
                  {t('builder.beatEditHint')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditingUid(null)}
              className="min-h-11 px-2 text-[11px] uppercase tracking-[0.2em] text-ink/50 hover:text-ink"
            >
              {t('common.close')}
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {(() => {
              const renderField = (field) => {
                const value =
                  editing.props?.[field.key] ??
                  (field.type === 'select' ? field.options?.[0]?.value : '') ??
                  ''
                const onFieldChange = (nextValue) => {
                  const nextProps = sanitizeProps(editing.sectionId, {
                    ...(editing.props || {}),
                    [field.key]: nextValue,
                  })
                  onChangeProps(editing.uid, nextProps)
                }

                return (
                  <div key={field.key} className="space-y-2">
                    <SectionFieldRow
                      field={field}
                      value={value}
                      onChange={onFieldChange}
                      hint={
                        FIELD_HINT_KEY[field.type] &&
                        (field.type === 'list' || field.key === firstAssetKey)
                          ? t(FIELD_HINT_KEY[field.type])
                          : undefined
                      }
                    />
                    {field.key === 'modelUrl' && field.type === 'url' ? (
                      <ModelTryout uid={editing.uid} value={value} onUseRoute={onFieldChange} />
                    ) : null}
                  </div>
                )
              }
              const editField = (key, nextValue) =>
                onChangeProps(
                  editing.uid,
                  sanitizeProps(editing.sectionId, { ...(editing.props || {}), [key]: nextValue }),
                )
              return fieldGroups ? (
                <FieldGroups
                  key={editing.uid}
                  groups={fieldGroups}
                  fields={fields}
                  props={editing.props}
                  renderField={renderField}
                  onSwitch={editField}
                />
              ) : (
                fields.map(renderField)
              )
            })()}
          </div>
        </aside>
      )}

      {editing && fields.length === 0 && (
        <aside
          data-native-cursor
          className="fixed top-4 right-4 z-9998 max-w-xs border border-ink/20 bg-bone p-4 text-sm text-ink/70 shadow-xl"
        >
          {t('builder.noEditableFields')}
          <button
            type="button"
            onClick={() => setEditingUid(null)}
            className="mt-3 block text-[11px] uppercase tracking-[0.2em] hover:text-accent"
          >
            {t('common.close')}
          </button>
        </aside>
      )}

      {onChangeFont ? (
        <div
          data-native-cursor
          data-sl-ui
          className={`fixed left-3 z-9999 w-[min(34rem,calc(100vw-1.5rem))] ${
            hasCommerce ? 'bottom-20 sm:bottom-5' : 'bottom-5'
          } ${editing ? 'max-md:hidden' : ''}`}
        >
          <Collapse open={fontOpen} className="mb-2">
            <div className="border border-ink/20 bg-bone p-3 text-ink shadow-xl">
              <p className="mb-3 max-w-[48ch] text-xs leading-relaxed text-ink/60">{t('builder.fontHint')}</p>
              <FontPicker value={font} onChange={onChangeFont} t={t} />
            </div>
          </Collapse>
          <button
            type="button"
            aria-expanded={fontOpen}
            onClick={() => setFontOpen((v) => !v)}
            className="min-h-11 border-2 border-ink bg-bone px-4 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-ink shadow-lg transition-colors hover:bg-ink hover:text-bone"
          >
            {t('builder.fontTitle')}
            <span className="ml-2 normal-case tracking-normal opacity-70">
              {fontChoice ? fontChoice.label : t('builder.fontOriginal')}
            </span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        data-native-cursor
        onClick={onExit}
        className={`fixed left-1/2 z-9999 -translate-x-1/2 border-2 border-ink bg-bone px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] text-ink shadow-lg transition-colors duration-300 hover:bg-ink hover:text-bone ${
          hasCommerce ? 'bottom-20 sm:bottom-5' : 'bottom-5'
        } ${editing ? 'max-md:hidden' : ''}`}
      >
        {t('builder.exitPreview')} ({items.length})
      </button>
    </div>
  )
}
