import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSection } from '../lib/sectionRegistry'
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
import { useCart } from '../lib/cart'
import { startCheckout } from '../lib/startCheckout'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'
import { useCurrency } from '../lib/currency'
import { prefersReducedMotion } from '../lib/motion'
import { kindLabelKeys } from '../features/builder/sectionCopy.js'
import BuilderHeader from '../features/builder/BuilderHeader.jsx'
import BuilderPriceStrip from '../features/builder/BuilderPriceStrip.jsx'
import SectionPalette from '../features/builder/SectionPalette.jsx'
import CompositionHeader from '../features/builder/CompositionHeader.jsx'
import CompositionList from '../features/builder/CompositionList.jsx'
import CompositionCheckout from '../features/builder/CompositionCheckout.jsx'
import MobileSummaryBar from '../features/builder/MobileSummaryBar.jsx'
import { formatArs } from '../lib/pricing'
import {
  QA_CUSTOM_SKU,
  QA_BUILDER_BASE_ARS,
  QA_BUILDER_EXTRA_SECTION_ARS,
  QA_BUILDER_COMMERCE_ARS,
  qaCustomPriceArs,
} from '../domain/qa'


const DND_MIME = 'text/plain'


/**
 * BuilderPage — UI del builder. La lógica vive en useBuilderComposition
 * + src/lib/composition.js (persistencia, receta, chrome único).
 * `qa`: /builder-test (src/domain/qa.js) — precio de prueba en pesos y compra
 * directa con Mercado Pago, sin carrito.
 */
export default function BuilderPage({ qa = false }) {
  const { t } = useI18n()
  const { currency } = useCurrency()
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

  // Mobile: la paleta va primero y son ~80 filas, así que el total y la compra
  // quedaban a miles de px. Una barra fija los trae hasta que el resumen de
  // verdad entra en pantalla.
  const summaryRef = useRef(null)
  const [summaryInView, setSummaryInView] = useState(false)
  const hasItems = items.length > 0
  useEffect(() => {
    const el = summaryRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) =>
      setSummaryInView(entry.isIntersecting),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasItems, preview])

  const goToCanvas = () => {
    const reduce = prefersReducedMotion()
    document
      .getElementById('builder-canvas')
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const commerceSurcharge = formatPriceFromUsd(
    COMMERCE_PACK_SURCHARGE_USD,
    currency,
    rate,
  )
  // Por qué el total es ese: qué incluye la base, cuánto llevás, cuánto suma
  // la próxima. En el tope se explica el límite en vez de ofrecer un precio.
  const qaPriceLabel = qa ? formatArs(qaCustomPriceArs(recipe)) : null
  const priceHint = (() => {
    if (qa) {
      return `Prueba: ${formatArs(QA_BUILDER_BASE_ARS)} con ${CUSTOM_BASE_SECTIONS} secciones, ${formatArs(QA_BUILDER_EXTRA_SECTION_ARS)} por sección extra y ${formatArs(QA_BUILDER_COMMERCE_ARS)} con commerce.`
    }
    const next = formatNextSectionPrice(
      sectionCount,
      hasCommerce,
      currency,
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
    if (qa) {
      // Sin carrito: un producto de prueba se compra solo.
      try {
        await startCheckout({
          items: [{ sku: QA_CUSTOM_SKU, title: 'PRUEBA — composición del builder', recipe }],
          user,
          navigate,
          loginNext: '/builder-test',
          provider: 'mercadopago',
        })
      } catch (err) {
        setLimitNotice(err?.message || 'No se pudo iniciar el pago de prueba')
      }
      return
    }
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
    // El panel de edición tiene scroll propio: sin scroll táctil normalizado.
    return (
      <SmoothScrollProvider normalizeTouch={false}>
        <BuilderPreview
          items={items}
          onChangeProps={updateItemProps}
          onExit={closePreview}
        />
      </SmoothScrollProvider>
    )
  }

  return (
    <div className="min-h-svh bg-bone px-5 pb-28 text-ink md:px-10 lg:pb-10">
      <BuilderHeader
        t={t}
        clearItems={clearItems}
        items={items}
        openPreview={openPreview}
        looksLoggedIn={looksLoggedIn}
      />

      <BuilderPriceStrip
        t={t}
        fixedPriceLabel={qaPriceLabel}
        estimatedPriceUsd={estimatedPriceUsd}
        currency={currency}
        rate={rate}
        priceHint={priceHint}
      />

      <div className="space-y-12 pt-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
        <SectionPalette
          t={t}
          commerceSurcharge={commerceSurcharge}
          isKindBlocked={isKindBlocked}
          atMaxSections={atMaxSections}
          sectionCounts={sectionCounts}
          startPaletteDrag={startPaletteDrag}
          setDragOver={setDragOver}
          handleAddSection={handleAddSection}
        />

        {/* Sticky en desktop: acompaña el scroll de la paleta. Solo la lista
            scrollea; el precio y los botones quedan siempre a la vista.
            El max-h deja aire bajo el header sticky y sobre el borde inferior. */}
        <div
          id="builder-canvas"
          className="min-w-0 scroll-mt-4 lg:sticky lg:top-[4.75rem] lg:col-span-7 lg:flex lg:max-h-[calc(100svh-7.5rem)] lg:flex-col lg:self-start"
        >
          <CompositionHeader t={t} items={items} structure={structure} />

          <CompositionList
            items={items}
            allowDropAt={allowDropAt}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            dragOver={dragOver}
            t={t}
            startReorderDrag={startReorderDrag}
            commerceSurcharge={commerceSurcharge}
            moveItem={moveItem}
            removeItem={removeItem}
            limitNotice={limitNotice}
          />

          <CompositionCheckout
            fixedPriceLabel={qaPriceLabel}
            items={items}
            summaryRef={summaryRef}
            hasDuplicateChrome={hasDuplicateChrome}
            t={t}
            estimatedPriceUsd={estimatedPriceUsd}
            currency={currency}
            rate={rate}
            atMaxSections={atMaxSections}
            priceHint={priceHint}
            hasCommerce={hasCommerce}
            commerceSurcharge={commerceSurcharge}
            openPreview={openPreview}
            addCompositionToCart={qa ? null : addCompositionToCart}
            buyComposition={buyComposition}
            looksLoggedIn={looksLoggedIn}
          />
        </div>
      </div>

      <MobileSummaryBar
        fixedPriceLabel={qaPriceLabel}
        hasItems={hasItems}
        summaryInView={summaryInView}
        items={items}
        t={t}
        estimatedPriceUsd={estimatedPriceUsd}
        currency={currency}
        rate={rate}
        goToCanvas={goToCanvas}
      />
    </div>
  )
}
