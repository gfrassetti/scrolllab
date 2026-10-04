import { getSection } from '../../lib/sectionRegistry'
import { sectionCopyKey, kindLabelKeys } from './sectionCopy.js'

/**
 * Lista de la composición: reordenar arrastrando o con flechas, quitar, y los destinos de drop.
 */
export default function CompositionList({ items, allowDropAt, setDragOver, handleDrop, dragOver, t, startReorderDrag, commerceSurcharge, moveItem, removeItem, limitNotice }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {items.length === 0 ? (
          <div
            onDragOver={allowDropAt('end')}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, 0)}
            className={`flex min-h-60 flex-col items-center justify-center gap-4 border-2 border-dashed p-10 text-center transition-colors duration-200 ${
                  dragOver === 'end' ? 'border-accent bg-accent/5' : 'border-ink/20'
                }`}
          >
            <p className="max-w-[36ch] text-body text-ink/55">
              {t('builder.emptyCanvas')}
            </p>
          </div>
        ) : (
          <div
            onDragOver={allowDropAt('end')}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, items.length)}
          >
            <ol className="border-t border-ink/15">
              {items.map((item, i) => {
                const section = getSection(item.sectionId)
                return (
                  <li
                    key={item.uid}
                    draggable
                    onDragStart={(e) => startReorderDrag(e, item.uid)}
                    onDragEnd={() => setDragOver(null)}
                    onDragOver={allowDropAt(i)}
                    onDrop={(e) => handleDrop(e, i)}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-ink/15 py-4 sm:flex-nowrap sm:cursor-grab sm:active:cursor-grabbing ${
                          dragOver === i
                            ? 'shadow-[inset_0_2px_0_0_var(--color-accent)]'
                            : ''
                        }`}
                  >
                    <span
                      aria-hidden="true"
                      className="hidden text-ink/30 sm:inline"
                    >
                      ⠿
                    </span>

                    <span className="w-8 text-eyebrow text-ink/45">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <span
                      aria-hidden="true"
                      className="inline-block size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: section.model.accent }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-title-sm font-medium">
                        {t(sectionCopyKey(section.id, 'name'))}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-eyebrow text-ink/45">
                        <span className="uppercase">
                          {section.model.name} ·{' '}
                          {t(kindLabelKeys[section.kind])}
                        </span>
                        {section.model.id === 'commerce' && (
                          <span className="border border-accent/50 px-1.5 py-0.5 text-eyebrow text-accent">
                            {t('builder.commerceBadge', {
                              price: commerceSurcharge,
                            })}
                          </span>
                        )}
                        {section.beat && (
                          <span className="border border-accent/50 px-1.5 py-0.5 text-eyebrow text-accent">
                            {t('builder.beatBadge')}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => moveItem(item.uid, -1)}
                        disabled={i === 0}
                        aria-label={t('builder.moveUp')}
                        className="grid size-10 place-items-center border border-ink/30 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.uid, 1)}
                        disabled={i === items.length - 1}
                        aria-label={t('builder.moveDown')}
                        className="grid size-10 place-items-center border border-ink/30 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.uid)}
                        aria-label={t('builder.remove')}
                        className="grid size-10 place-items-center border border-ink/30 text-xs transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-bone"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div
              aria-hidden="true"
              className={`h-1 transition-colors duration-200 ${
                    dragOver === 'end' ? 'bg-accent' : 'bg-transparent'
                  }`}
            />
          </div>
        )}

        {limitNotice && (
          <p className="mt-4 border border-accent/40 bg-accent/10 px-4 py-3 text-body">
            {limitNotice}
          </p>
        )}
      </div>
    </>
  )
}
