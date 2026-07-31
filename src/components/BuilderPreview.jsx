import { useState } from 'react'
import { getSection } from '../lib/sectionRegistry'
import { getSectionFields, sanitizeProps } from '../lib/sectionFields'
import { recipeHasCommerce } from '../lib/composition'
import CompositionCanvas from './CompositionCanvas'
import CompositionShopShell from './CompositionShopShell'
import { useT } from '../i18n'

/**
 * Live composition preview with a side panel to edit text props per section.
 * When the recipe includes commerce/ProductGrid, shop routes run in a nested router.
 */
export default function BuilderPreview({ items, onChangeProps, onExit }) {
  const t = useT()
  const [editingUid, setEditingUid] = useState(null)
  const editing = items.find((item) => item.uid === editingUid)
  const editingSection = editing ? getSection(editing.sectionId) : null
  const fields = editing ? getSectionFields(editing.sectionId) : []
  const hasCommerce = recipeHasCommerce(items.map((i) => i.sectionId))

  const editLabelFor = (section) => {
    if (section.kind === 'nav') return t('builder.editNav')
    if (section.kind === 'hero') return t('builder.editHero')
    if (section.kind === 'footer') return t('builder.editFooter')
    return t('builder.editSection')
  }

  const home = (
    <CompositionCanvas
      items={items}
      renderChrome={(item, section) => {
        const active = item.uid === editingUid
        return (
          <>
            <button
              type="button"
              onClick={() =>
                setEditingUid((uid) => (uid === item.uid ? null : item.uid))
              }
              className={`absolute top-3 right-3 z-[60] min-h-9 border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] shadow-sm transition-colors ${
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
      {hasCommerce ? <CompositionShopShell home={home} /> : home}

      {editing && editingSection && fields.length > 0 && (
        <aside
          data-native-cursor
          className="fixed top-0 right-0 z-9998 flex h-svh w-full max-w-md flex-col border-l border-ink/20 bg-bone text-ink shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-ink/15 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('builder.editPanel')}
              </p>
              <p className="mt-1 text-sm font-medium">
                {editingSection.name}
              </p>
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
            {fields.map((field) => {
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
              const fieldClass =
                'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'

              if (field.type === 'model' || field.type === 'image') {
                const isImage = field.type === 'image'
                return (
                  <div key={field.key} className="block border-t border-ink/15 pt-4">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
                      {field.label}
                    </span>
                    <input
                      type="text"
                      value={value}
                      placeholder={
                        isImage
                          ? '/can.svg — https://…'
                          : '/model.glb — https://…'
                      }
                      onChange={(e) => onFieldChange(e.target.value)}
                      className={fieldClass}
                    />
                    {isImage && value ? (
                      <img
                        src={value}
                        alt=""
                        className="mt-2 h-20 w-auto max-w-full object-contain"
                      />
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer border border-ink/30 px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors hover:border-ink hover:bg-ink hover:text-bone">
                        {isImage
                          ? t('builder.imageUpload')
                          : t('builder.modelUpload')}
                        <input
                          type="file"
                          accept={
                            isImage
                              ? 'image/*,.svg,.png,.webp,.jpg,.jpeg'
                              : '.glb,.gltf,model/gltf-binary,model/gltf+json'
                          }
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onFieldChange(URL.createObjectURL(file))
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {value && (
                        <button
                          type="button"
                          onClick={() => onFieldChange('')}
                          className="border border-ink/30 px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors hover:border-danger hover:text-danger"
                        >
                          {isImage
                            ? t('builder.imageClear')
                            : t('builder.modelClear')}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink/55">
                      {isImage
                        ? t('builder.imageHelp')
                        : t('builder.modelHelp')}
                    </p>
                  </div>
                )
              }

              return (
                <label key={field.key} className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
                    {field.label}
                  </span>
                  {field.type === 'select' ? (
                    <select
                      value={value}
                      onChange={(e) => onFieldChange(e.target.value)}
                      className={fieldClass}
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={4}
                      value={value}
                      onChange={(e) => onFieldChange(e.target.value)}
                      className={fieldClass}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onFieldChange(e.target.value)}
                      className={fieldClass}
                    />
                  )}
                </label>
              )
            })}
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

      <button
        type="button"
        data-native-cursor
        onClick={onExit}
        className={`fixed left-1/2 z-9999 -translate-x-1/2 border-2 border-ink bg-bone px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] text-ink shadow-lg transition-colors duration-300 hover:bg-ink hover:text-bone ${
          hasCommerce ? 'bottom-20 sm:bottom-5' : 'bottom-5'
        }`}
      >
        {t('builder.exitPreview')} ({items.length})
      </button>
    </div>
  )
}
