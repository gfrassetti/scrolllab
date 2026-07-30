import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { models, getSection } from '../lib/sectionRegistry'
import {
  loadComposition,
  saveComposition,
  compositionToRecipe,
  recipeHasCommerce,
  dedupeUniqueKinds,
} from '../lib/composition'
import {
  estimateCustomPrice,
  formatArs,
  COMMERCE_PACK_SURCHARGE,
  CUSTOM_BASE_PRICE,
} from '../lib/pricing'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import BuilderPreview from '../components/BuilderPreview'
import CartPopover from '../components/CartPopover'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSelector from '../components/LanguageSelector'
import { useCart } from '../lib/cart'
import { useAuth } from '../lib/auth'
import { useT } from '../i18n'

const kindLabelKeys = {
  nav: 'builder.kind.nav',
  hero: 'builder.kind.hero',
  section: 'builder.kind.section',
  footer: 'builder.kind.footer',
}

/** Una sola nav / hero / footer por página. Las secciones narrativas sí se pueden repetir. */
const UNIQUE_KINDS = new Set(['nav', 'hero', 'footer'])

const DND_MIME = 'text/plain'

/** Clave i18n de name/blurb a partir del id `model/Component`. */
function sectionCopyKey(sectionId, field) {
  return `builder.sections.${sectionId.replace('/', '.')}.${field}`
}

/**
 * BuilderPage — armá una página propia eligiendo secciones de
 * cualquier modelo: arrastrá desde la paleta al lienzo (o usá
 * "+ Agregar" en touch), reordená arrastrando o con flechas y
 * previsualizá la página real. Persiste en localStorage.
 */
function bootstrapComposition() {
  const loaded = loadComposition()
  const items = dedupeUniqueKinds(loaded)
  return { items, cleaned: items.length < loaded.length }
}

export default function BuilderPage() {
  const [boot] = useState(bootstrapComposition)
  const [items, setItems] = useState(boot.items)
  const [preview, setPreview] = useState(false)
  // null | index de inserción | 'end'
  const [dragOver, setDragOver] = useState(null)
  const [limitNotice, setLimitNotice] = useState('')
  const addToCart = useCart((s) => s.addItem)
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const navigate = useNavigate()
  const t = useT()

  useEffect(() => {
    saveComposition(items)
  }, [items])

  useEffect(() => {
    if (boot.cleaned) setLimitNotice(t('builder.cleanedChrome'))
  }, [boot.cleaned, t])

  useEffect(() => {
    if (!limitNotice) return undefined
    const id = window.setTimeout(() => setLimitNotice(''), 3200)
    return () => window.clearTimeout(id)
  }, [limitNotice])

  const recipe = useMemo(() => compositionToRecipe(items), [items])
  const hasCommerce = useMemo(() => recipeHasCommerce(recipe), [recipe])
  const estimatedPrice = estimateCustomPrice(hasCommerce)

  const takenKinds = useMemo(() => {
    const taken = new Set()
    for (const item of items) {
      const kind = getSection(item.sectionId)?.kind
      if (kind && UNIQUE_KINDS.has(kind)) taken.add(kind)
    }
    return taken
  }, [items])

  const hasDuplicateChrome = useMemo(() => {
    const counts = { nav: 0, hero: 0, footer: 0 }
    for (const item of items) {
      const kind = getSection(item.sectionId)?.kind
      if (kind && kind in counts) counts[kind] += 1
    }
    return Object.values(counts).some((n) => n > 1)
  }, [items])

  const kindBlocked = (sectionId) => {
    const kind = getSection(sectionId)?.kind
    return Boolean(kind && UNIQUE_KINDS.has(kind) && takenKinds.has(kind))
  }

  const compositionCartItem = () => ({
    sku: 'custom',
    title: t('builder.compositionTitle'),
    recipe,
  })

  const addCompositionToCart = () => {
    if (items.length === 0) return
    addToCart(compositionCartItem())
  }

  const buyComposition = () => {
    if (items.length === 0) return
    addToCart(compositionCartItem())
    navigate(user ? '/cart' : '/login')
  }

  const addSection = (sectionId, index = items.length) => {
    const section = getSection(sectionId)
    if (!section) return
    if (
      UNIQUE_KINDS.has(section.kind) &&
      items.some((item) => getSection(item.sectionId)?.kind === section.kind)
    ) {
      setLimitNotice(
        t('builder.uniqueKindLimit', {
          kind: t(kindLabelKeys[section.kind]),
        }),
      )
      return
    }
    setItems((prev) => {
      const next = [...prev]
      next.splice(index, 0, { uid: crypto.randomUUID(), sectionId, props: {} })
      return next
    })
  }

  const updateItemProps = (uid, props) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item
        const next = { uid: item.uid, sectionId: item.sectionId }
        if (props && Object.keys(props).length) next.props = props
        return next
      }),
    )
  }

  const removeItem = (uid) => {
    setItems((prev) => prev.filter((item) => item.uid !== uid))
  }

  const moveItem = (uid, delta) => {
    setItems((prev) => {
      const from = prev.findIndex((item) => item.uid === uid)
      const to = from + delta
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })
  }

  /* ——— Drag & drop nativo ——— */

  const startPaletteDrag = (e, sectionId) => {
    e.dataTransfer.setData(DND_MIME, JSON.stringify({ type: 'add', sectionId }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const startReorderDrag = (e, uid) => {
    e.dataTransfer.setData(DND_MIME, JSON.stringify({ type: 'move', uid }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)

    let payload
    try {
      payload = JSON.parse(e.dataTransfer.getData(DND_MIME))
    } catch {
      return
    }

    if (payload?.type === 'add' && getSection(payload.sectionId)) {
      addSection(payload.sectionId, index)
    } else if (payload?.type === 'move') {
      setItems((prev) => {
        const from = prev.findIndex((item) => item.uid === payload.uid)
        if (from === -1) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(from < index ? index - 1 : index, 0, moved)
        return next
      })
    }
  }

  const allowDropAt = (index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(index)
  }

  const openPreview = () => {
    window.scrollTo(0, 0)
    setPreview(true)
  }

  const closePreview = () => {
    window.scrollTo(0, 0)
    setPreview(false)
  }

  /* ——— Preview en vivo + edición de textos ——— */
  if (preview) {
    return (
      <SmoothScrollProvider>
        <BuilderPreview
          items={items}
          onChangeProps={updateItemProps}
          onExit={closePreview}
        />
      </SmoothScrollProvider>
    )
  }

  /* ——— UI del builder ——— */
  return (
    <div className="min-h-svh bg-bone px-5 py-10 text-ink md:px-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/15 pb-4">
        <div className="flex items-baseline gap-6">
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors duration-300 hover:text-accent md:text-xs"
          >
            {t('builder.back')}
          </Link>
          <p className="text-sm font-medium uppercase tracking-[0.25em]">
            {t('builder.title')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setItems([])}
            disabled={items.length === 0}
            className="border border-ink/30 px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors duration-300 not-disabled:hover:border-ink disabled:opacity-30 md:text-xs"
          >
            {t('builder.clear')}
          </button>
          <button
            type="button"
            onClick={openPreview}
            disabled={items.length === 0}
            className="border-2 border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors duration-300 not-disabled:hover:bg-accent not-disabled:hover:border-accent disabled:opacity-30 md:text-xs"
          >
            {t('builder.preview')}
          </button>
          <CartPopover />
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        {/* ——— Paleta ——— */}
        <div className="lg:col-span-5">
          <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
            {t('builder.paletteTitle')}
          </p>

          <div className="space-y-10">
            {models.map((model) => (
              <div key={model.id}>
                <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-ink/15 pb-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: model.accent }}
                  />
                  <p className="text-sm font-medium tracking-[0.15em]">{model.name}</p>
                </div>
                {model.id === 'commerce' && (
                  <p className="mb-3 text-xs leading-relaxed text-ink/50">
                    {t('builder.commerceHint', {
                      price: formatArs(COMMERCE_PACK_SURCHARGE),
                    })}
                  </p>
                )}

                <ul>
                  {model.sections.map((section) => {
                    const blocked = kindBlocked(section.id)
                    return (
                      <li
                        key={section.id}
                        draggable={!blocked}
                        onDragStart={(e) => {
                          if (blocked) {
                            e.preventDefault()
                            return
                          }
                          startPaletteDrag(e, section.id)
                        }}
                        onDragEnd={() => setDragOver(null)}
                        className={`flex items-center justify-between gap-4 border-b border-ink/10 py-2.5 ${
                          blocked
                            ? 'cursor-not-allowed opacity-40'
                            : 'cursor-grab active:cursor-grabbing'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-ink/30"
                          >
                            ⠿
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-baseline gap-2 text-sm font-medium">
                              {t(sectionCopyKey(section.id, 'name'))}
                              <span className="text-[9px] tracking-[0.2em] text-ink/40">
                                {t(kindLabelKeys[section.kind])}
                              </span>
                            </p>
                            <p className="truncate text-xs text-ink/50">
                              {blocked
                                ? t('builder.uniqueKindShort', {
                                    kind: t(kindLabelKeys[section.kind]),
                                  })
                                : t(sectionCopyKey(section.id, 'blurb'))}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addSection(section.id)}
                          disabled={blocked}
                          aria-label={t('builder.addAria', {
                            name: t(sectionCopyKey(section.id, 'name')),
                          })}
                          className="shrink-0 border border-ink/30 px-3 py-1.5 text-xs transition-colors duration-200 not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-40"
                        >
                          {t('builder.add')}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ——— Lienzo / composición ——— */}
        <div className="lg:col-span-7">
          <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
            {t('builder.canvasTitle')} ({items.length}{' '}
            {items.length === 1
              ? t('builder.sectionCountOne')
              : t('builder.sectionCountMany')})
          </p>

          {items.length === 0 ? (
            <div
              onDragOver={allowDropAt('end')}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, 0)}
              className={`flex min-h-60 flex-col items-center justify-center gap-6 border-2 border-dashed p-10 text-center transition-colors duration-200 ${
                dragOver === 'end' ? 'border-accent bg-accent/5' : 'border-ink/20'
              }`}
            >
              <p className="max-w-[36ch] text-sm text-ink/50">
                {t('builder.emptyCanvas')}
              </p>
              <ol className="w-full max-w-[28ch] space-y-2 text-left text-xs uppercase tracking-[0.2em] text-ink/45">
                <li className="border-b border-ink/10 pb-2">
                  01 — {t('builder.emptyStepNav')}
                </li>
                <li className="border-b border-ink/10 pb-2">
                  02 — {t('builder.emptyStepHero')}
                </li>
                <li className="border-b border-ink/10 pb-2">
                  03 — {t('builder.emptyStepSections')}
                </li>
                <li>04 — {t('builder.emptyStepFooter')}</li>
              </ol>
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
                      className={`flex cursor-grab items-center gap-4 border-b border-ink/15 py-4 active:cursor-grabbing ${
                        dragOver === i
                          ? 'shadow-[inset_0_2px_0_0_var(--color-accent)]'
                          : ''
                      }`}
                    >
                      <span aria-hidden="true" className="text-ink/30">
                        ⠿
                      </span>

                      <span className="w-8 text-[11px] tracking-[0.2em] text-ink/40">
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      <span
                        aria-hidden="true"
                        className="inline-block size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: section.model.accent }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium md:text-lg">
                          {t(sectionCopyKey(section.id, 'name'))}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                          {section.model.name} · {t(kindLabelKeys[section.kind])}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(item.uid, -1)}
                          disabled={i === 0}
                          aria-label={t('builder.moveUp')}
                          className="border border-ink/30 px-2.5 py-1.5 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.uid, 1)}
                          disabled={i === items.length - 1}
                          aria-label={t('builder.moveDown')}
                          className="border border-ink/30 px-2.5 py-1.5 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.uid)}
                          aria-label={t('builder.remove')}
                          className="border border-ink/30 px-2.5 py-1.5 text-xs transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-bone"
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
            <p className="mt-6 border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
              {limitNotice}
            </p>
          )}

          {items.length > 0 && (
            <div className="mt-8 space-y-5 border border-ink/15 p-5 md:p-6">
              <div>
                <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink/50">
                  {t('builder.recipeLabel')}
                </p>
                <code className="block text-xs leading-relaxed break-all text-ink/70">
                  {JSON.stringify(recipe)}
                </code>
              </div>

              <p className="text-xs leading-relaxed text-ink/55">
                {t('builder.structureHint')}
              </p>
              {hasDuplicateChrome && (
                <p className="text-xs leading-relaxed text-accent">
                  {t('builder.duplicateChromeWarn')}
                </p>
              )}

              <div className="border-t border-ink/15 pt-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
                  {t('builder.estimatedPrice')}
                </p>
                <p className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.02em]">
                  {formatArs(estimatedPrice)}
                </p>
                {hasCommerce ? (
                  <p className="mt-1 text-xs text-ink/55">
                    {t('builder.commerceIncluded', {
                      price: formatArs(COMMERCE_PACK_SURCHARGE),
                    })}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ink/55">
                    {t('builder.priceLadder', {
                      base: formatArs(CUSTOM_BASE_PRICE),
                      surcharge: formatArs(COMMERCE_PACK_SURCHARGE),
                      total: formatArs(estimateCustomPrice(true)),
                    })}
                  </p>
                )}
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink/40">
                  {t('builder.priceNote')}
                </p>
              </div>

              <button
                type="button"
                onClick={openPreview}
                className="w-full border-2 border-ink bg-ink px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent"
              >
                {t('builder.previewBeforeBuy')}
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={addCompositionToCart}
                  className="border-2 border-ink px-5 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone sm:flex-1"
                >
                  {t('common.addToCart')}
                </button>
                <button
                  type="button"
                  onClick={buyComposition}
                  className="border-2 border-accent bg-accent px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-ink transition-opacity hover:opacity-80 sm:flex-1"
                >
                  {looksLoggedIn
                    ? t('builder.buyLoggedIn')
                    : t('builder.buyLoggedOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
