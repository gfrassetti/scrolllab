import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { models, getSection } from '../lib/sectionRegistry'
import {
  formatPriceFromUsd,
  formatNextSectionPrice,
  COMMERCE_PACK_SURCHARGE_USD,
  CUSTOM_BASE_SECTIONS,
  MAX_CUSTOM_SECTIONS,
} from '../lib/pricing'
import { useFxRate } from '../lib/fx'
import { useBuilderComposition } from '../hooks/useBuilderComposition'
import { sectionKind, recipeHasCommerce } from '../lib/composition'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import BuilderPreview from '../components/BuilderPreview'
import CartPopover from '../components/CartPopover'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSelector from '../components/LanguageSelector'
import { useCart } from '../lib/cart'
import { startCheckout } from '../lib/startCheckout'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'

const kindLabelKeys = {
  nav: 'builder.kind.nav',
  hero: 'builder.kind.hero',
  section: 'builder.kind.section',
  footer: 'builder.kind.footer',
}

const DND_MIME = 'text/plain'

function sectionCopyKey(sectionId, field) {
  return `builder.sections.${sectionId.replace('/', '.')}.${field}`
}

/**
 * BuilderPage — UI del builder. La lógica vive en useBuilderComposition
 * + src/lib/composition.js (persistencia, receta, chrome único).
 */
export default function BuilderPage() {
  const { t, locale } = useI18n()
  const addToCart = useCart((s) => s.addItem)
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const navigate = useNavigate()

  const {
    items,
    preview,
    dragOver,
    setDragOver,
    limitNotice,
    setLimitNotice,
    bootCleaned,
    recipe,
    hasCommerce,
    sectionCount,
    atMaxSections,
    estimatedPriceUsd,
    hasDuplicateChrome,
    addSection,
    updateItemProps,
    removeItem,
    moveItem,
    reorderItem,
    clearItems,
    isKindBlocked,
    openPreview,
    closePreview,
  } = useBuilderComposition()

  const { rate } = useFxRate()
  const commerceSurcharge = formatPriceFromUsd(
    COMMERCE_PACK_SURCHARGE_USD,
    locale,
    rate,
  )
  // Por qué el total es ese: qué incluye la base, cuánto llevás, cuánto suma
  // la próxima. En el tope se explica el límite en vez de ofrecer un precio.
  const priceHint = (() => {
    const next = formatNextSectionPrice(
      sectionCount,
      hasCommerce,
      locale,
      rate,
    )
    const included = CUSTOM_BASE_SECTIONS
    if (atMaxSections) {
      return t('builder.priceMax', { max: MAX_CUSTOM_SECTIONS })
    }
    if (sectionCount < included) {
      return t('builder.priceRoom', { included, left: included - sectionCount })
    }
    if (sectionCount === included) {
      return t('builder.priceNext', { included, next })
    }
    return t('builder.priceExtras', { included, count: sectionCount, next })
  })()

  useEffect(() => {
    if (bootCleaned) setLimitNotice(t('builder.cleanedChrome'))
  }, [bootCleaned, setLimitNotice, t])

  useEffect(() => {
    if (hasDuplicateChrome) setLimitNotice(t('builder.cleanedChrome'))
  }, [hasDuplicateChrome, setLimitNotice, t])

  const sectionCounts = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      counts.set(item.sectionId, (counts.get(item.sectionId) || 0) + 1)
    }
    return counts
  }, [items])

  const structure = useMemo(() => {
    let nav = 0
    let hero = 0
    let section = 0
    let footer = 0
    for (const item of items) {
      const kind = sectionKind(item.sectionId)
      if (kind === 'nav') nav += 1
      else if (kind === 'hero') hero += 1
      else if (kind === 'footer') footer += 1
      else if (kind === 'section') section += 1
    }
    return { nav, hero, section, footer }
  }, [items])

  const compositionCartItem = () => ({
    sku: 'custom',
    title: t('builder.compositionTitle'),
    recipe,
  })

  const addCompositionToCart = () => {
    if (items.length === 0) return
    addToCart(compositionCartItem())
  }

  const buyComposition = async () => {
    if (items.length === 0) return
    const cartItem = compositionCartItem()
    addToCart(cartItem)
    try {
      await startCheckout({
        items: useCart.getState().items,
        user,
        navigate,
      })
    } catch {
      // Si falla el redirect, el carrito ya tiene la composición para reintentar.
      navigate('/cart')
    }
  }

  const handleAddSection = (sectionId, atIndex) => {
    const firstCommerce = !hasCommerce && recipeHasCommerce([sectionId])
    const blocked = addSection(sectionId, atIndex)
    if (blocked) {
      if (blocked.reason === 'max') {
        setLimitNotice(
          t('builder.maxSectionsLimit', { max: MAX_CUSTOM_SECTIONS }),
        )
        return
      }
      setLimitNotice(
        t('builder.uniqueKindLimit', {
          kind: t(kindLabelKeys[blocked.kind]),
        }),
      )
      return
    }
    // El salto del total no es la grilla: es el kit (ficha, carrito, checkout).
    if (firstCommerce) {
      setLimitNotice(
        t('builder.commerceAdded', { price: commerceSurcharge }),
      )
    }
  }

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
      handleAddSection(payload.sectionId, index)
    } else if (payload?.type === 'move') {
      reorderItem(payload.uid, index)
    }
  }

  const allowDropAt = (index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(index)
  }

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

  return (
    <div className="min-h-svh bg-bone px-5 pb-10 text-ink md:px-10">
      <header className="sticky top-0 z-30 -mx-5 mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/15 bg-bone/95 px-5 py-4 backdrop-blur-sm md:-mx-10 md:px-10">
        <nav className="flex items-baseline gap-5">
          <Link
            to="/"
            className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
          >
            {t('builder.back')}
          </Link>
          <Link
            to="/lab"
            className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
          >
            {t('nav.lab')}
          </Link>
          <p
            aria-current="page"
            className="text-body-sm font-medium uppercase tracking-[0.15em] text-ink"
          >
            {t('builder.title')}
          </p>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearItems}
            disabled={items.length === 0}
            className="btn btn-ghost disabled:opacity-30"
          >
            {t('builder.clear')}
          </button>
          <button
            type="button"
            onClick={openPreview}
            disabled={items.length === 0}
            className="btn btn-primary disabled:opacity-30"
          >
            {t('builder.preview')}
          </button>
          {looksLoggedIn && (
            <Link
              to="/account"
              className="text-eyebrow uppercase text-ink/50 transition-colors duration-300 hover:text-accent"
            >
              {t('nav.account')}
            </Link>
          )}
          <CartPopover />
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Franja de precio: visible antes de bajar a las columnas, no solo al
          fondo del panel sticky. */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pt-6 pb-6 md:pt-8">
        <p className="text-eyebrow uppercase text-ink/45">{t('builder.title')}</p>
        <div className="text-right">
          <p className="text-eyebrow uppercase text-ink/45">
            {t('builder.estimatedPrice')}
          </p>
          <p className="mt-1 text-title-sm font-medium tracking-[-0.02em]">
            {formatPriceFromUsd(estimatedPriceUsd, locale, rate)}
          </p>
          <p className="mt-1 max-w-[42ch] text-body-sm text-ink/55">
            {priceHint}
          </p>
        </div>
      </div>

      <div className="space-y-12 pt-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
        <div className="min-w-0 lg:col-span-5">
          <p className="mb-6 text-title-sm font-medium tracking-[-0.01em]">
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
                  <p className="text-body-sm font-semibold tracking-[0.08em]">
                    {model.name}
                  </p>
                </div>
                {model.id === 'commerce' && (
                  <p className="mb-3 text-body-sm text-ink/55">
                    {t('builder.commerceHint', {
                      price: commerceSurcharge,
                    })}
                  </p>
                )}
                {model.sections.some((s) => s.beat) && (
                  <p className="mb-3 text-body-sm text-ink/55">
                    {t('builder.beatHint')}
                  </p>
                )}

                <ul>
                  {model.sections.map((section) => {
                    const kindBlocked = isKindBlocked(section.id)
                    const blocked = kindBlocked || atMaxSections
                    const count = sectionCounts.get(section.id) || 0
                    const added = count > 0
                    const name = t(sectionCopyKey(section.id, 'name'))
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
                        } ${added ? 'bg-ink/[0.03]' : ''}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className={`grid size-5 shrink-0 place-items-center text-[11px] ${
                              added
                                ? 'border border-accent/50 text-accent'
                                : 'text-ink/30'
                            }`}
                          >
                            {added ? '✓' : '⠿'}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body font-medium">
                              {name}
                              <span className="text-eyebrow text-ink/40">
                                {t(kindLabelKeys[section.kind])}
                              </span>
                              {section.beat && (
                                <span className="border border-accent/50 px-1.5 py-0.5 text-eyebrow text-accent">
                                  {t('builder.beatBadge')}
                                </span>
                              )}
                              {added && (
                                <span className="text-eyebrow text-accent">
                                  {t('builder.addedCount', { count })}
                                </span>
                              )}
                            </p>
                            <p className="truncate text-body-sm text-ink/55">
                              {kindBlocked
                                ? t('builder.uniqueKindShort', {
                                    kind: t(kindLabelKeys[section.kind]),
                                  })
                                : atMaxSections
                                  ? t('builder.maxSectionsShort', {
                                      max: MAX_CUSTOM_SECTIONS,
                                    })
                                  : t(sectionCopyKey(section.id, 'blurb'))}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSection(section.id)}
                          disabled={blocked}
                          aria-label={
                            added
                              ? t('builder.addedAria', { name, count })
                              : t('builder.addAria', { name })
                          }
                          className={`min-h-10 shrink-0 border px-3 py-2 text-body-sm transition-colors duration-200 disabled:opacity-40 ${
                            added
                              ? 'border-accent/60 text-accent not-disabled:hover:border-accent not-disabled:hover:bg-accent not-disabled:hover:text-ink'
                              : 'border-ink/30 not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-bone'
                          }`}
                        >
                          {added ? `✓ ${count}` : t('builder.add')}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky en desktop: acompaña el scroll de la paleta. Solo la lista
            scrollea; el precio y los botones quedan siempre a la vista.
            El max-h deja aire bajo el header sticky y sobre el borde inferior. */}
        <div className="min-w-0 lg:sticky lg:top-[4.75rem] lg:col-span-7 lg:flex lg:max-h-[calc(100svh-7.5rem)] lg:flex-col lg:self-start">
          <div className="shrink-0">
            <p className="mb-3 text-title-sm font-medium tracking-[-0.01em]">
              {t('builder.canvasTitle')} ({items.length}{' '}
              {items.length === 1
                ? t('builder.sectionCountOne')
                : t('builder.sectionCountMany')})
            </p>

            <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-eyebrow text-ink/45">
              {[
                { key: 'nav', label: t('builder.emptyStepNav'), count: structure.nav },
                { key: 'hero', label: t('builder.emptyStepHero'), count: structure.hero },
                {
                  key: 'section',
                  label: t('builder.emptyStepSections'),
                  count: structure.section,
                },
                {
                  key: 'footer',
                  label: t('builder.emptyStepFooter'),
                  count: structure.footer,
                },
              ].map((step) => (
                <li
                  key={step.key}
                  className={`flex items-center gap-1.5 uppercase ${
                    step.count > 0 ? 'text-accent' : ''
                  }`}
                >
                  <span aria-hidden="true">{step.count > 0 ? '✓' : '○'}</span>
                  <span>
                    {step.label}
                    {step.count > 0 ? ` · ${step.count}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>

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

          {items.length > 0 && (
            <div className="mt-3 shrink-0 space-y-3 border border-ink/15 bg-bone p-4 md:p-5">
              {hasDuplicateChrome && (
                <p className="text-body-sm text-accent">
                  {t('builder.duplicateChromeWarn')}
                </p>
              )}

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-eyebrow uppercase text-ink/50">
                    {t('builder.estimatedPrice')}
                  </p>
                  <p className="mt-1 text-title font-medium tracking-[-0.02em]">
                    {formatPriceFromUsd(estimatedPriceUsd, locale, rate)}
                  </p>
                  <p
                    className={`mt-1 max-w-[46ch] text-body-sm ${
                      atMaxSections ? 'text-accent' : 'text-ink/55'
                    }`}
                  >
                    {priceHint}
                  </p>
                  {hasCommerce && (
                    <p className="mt-0.5 text-body-sm text-ink/55">
                      {t('builder.commerceIncluded', {
                        price: commerceSurcharge,
                      })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openPreview}
                  className="btn btn-ghost"
                >
                  {t('builder.previewBeforeBuy')}
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={addCompositionToCart}
                  className="btn btn-ghost sm:flex-1"
                >
                  {t('common.addToCart')}
                </button>
                <button
                  type="button"
                  onClick={buyComposition}
                  className="btn border-accent bg-accent text-ink transition-opacity hover:opacity-80 sm:flex-1"
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
