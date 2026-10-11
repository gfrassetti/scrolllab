import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useBuilderProjects } from '../hooks/useBuilderProjects'
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
import ProjectBar from '../features/builder/ProjectBar.jsx'
import SectionPalette from '../features/builder/SectionPalette.jsx'
import CompositionHeader from '../features/builder/CompositionHeader.jsx'
import CompositionList from '../features/builder/CompositionList.jsx'
import CompositionCheckout from '../features/builder/CompositionCheckout.jsx'
import MobileSummaryBar from '../features/builder/MobileSummaryBar.jsx'
import { formatArs } from '../lib/pricing'
import { separateModelsPriceUsd } from '../domain/catalog'
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
  const { t, locale } = useI18n()
  const { currency } = useCurrency()
  const addToCart = useCart((s) => s.addItem)
  const { user, loading: authLoading, hadSession } = useAuth()
  const looksLoggedIn = user ? true : authLoading ? hadSession : false
  const navigate = useNavigate()

  const {
    compositionId,
    inCart,
    switchComposition,
    renameComposition,
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

  // Proyectos guardados en la cuenta (solo con sesión; /builder-test no los usa).
  const projects = useBuilderProjects({
    enabled: Boolean(user) && !qa,
    recipe,
    compositionId,
    switchComposition,
    renameComposition,
    startFresh: clearItems,
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const openRequest = searchParams.get('project')
  const clearOpenRequest = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('project')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

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

  // En el teléfono la paleta y tu página no entran una abajo de la otra (la
  // página quedaba a ~8 pantallas): un selector «Secciones | Tu página».
  const [mobileView, setMobileView] = useState('palette')
  const goToCanvas = () => {
    setMobileView('page')
    const reduce = prefersReducedMotion()
    requestAnimationFrame(() =>
      document
        .getElementById('builder-canvas')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    )
  }
  const commerceSurcharge = formatPriceFromUsd(
    COMMERCE_PACK_SURCHARGE_USD,
    currency,
    rate,
  )
  // Ancla: lo que costarían por separado los templates de los que sacás
  // secciones. Solo cuando mezclás modelos y el builder sale más barato.
  const separate = useMemo(() => separateModelsPriceUsd(recipe), [recipe])
  const anchor =
    !qa && separate.models.length >= 2 && separate.usd > estimatedPriceUsd
      ? t('builder.separateAnchor', {
          models: separate.models.map((m) => m.toUpperCase()).join(' + '),
          price: formatPriceFromUsd(separate.usd, currency, rate),
        })
      : null
  // Por qué el total es ese: qué incluye la base, cuánto llevás, cuánto suma
  // la próxima. En el tope se explica el límite en vez de ofrecer un precio.
  const qaPriceLabel = qa ? formatArs(qaCustomPriceArs(recipe)) : null
  const priceHint = (() => {
    if (qa) {
      return QA_BUILDER_EXTRA_SECTION_ARS || QA_BUILDER_COMMERCE_ARS
        ? `Prueba: ${formatArs(QA_BUILDER_BASE_ARS)} con ${CUSTOM_BASE_SECTIONS} secciones, ${formatArs(QA_BUILDER_EXTRA_SECTION_ARS)} por sección extra y ${formatArs(QA_BUILDER_COMMERCE_ARS)} con commerce.`
        : `Prueba: cualquier composición cuesta ${formatArs(QA_BUILDER_BASE_ARS)}.`
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
    compositionId,
    projectName: projects.project?.name || undefined,
    recipe,
  })

  // Renombrar el proyecto abierto renombra su línea del carrito.
  const projectName = projects.project?.name || ''
  useEffect(() => {
    if (projectName) useCart.getState().setCompositionName(compositionId, projectName)
  }, [projectName, compositionId])

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
        clearItems={projects.startNew}
        items={items}
        openPreview={openPreview}
        looksLoggedIn={looksLoggedIn}
      />

      {qa ? null : (
        <ProjectBar
          t={t}
          locale={locale}
          loggedIn={Boolean(user)}
          authPending={authLoading}
          itemsCount={items.length}
          projects={projects}
          openRequest={openRequest}
          onOpenRequestHandled={clearOpenRequest}
        />
      )}

      {/* Teléfono: una cosa a la vez. En desktop van las dos columnas. */}
      <div
        role="group"
        aria-label={t('builder.mobileViewLabel')}
        className="sticky top-0 z-20 -mx-5 mt-4 grid grid-cols-2 border-y border-ink/15 bg-bone/95 backdrop-blur-sm lg:hidden"
        data-builder-mobile-switch
      >
        {[
          { id: 'palette', label: t('builder.mobileViewPalette') },
          { id: 'page', label: t('builder.mobileViewPage', { n: items.length }) },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={mobileView === v.id}
            onClick={() => setMobileView(v.id)}
            className={`min-h-12 text-body-sm font-medium transition-colors ${
              mobileView === v.id ? 'text-ink shadow-[inset_0_-2px_0_0_var(--color-accent)]' : 'text-ink/45'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="pt-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:pt-10">
        <SectionPalette
          className={mobileView === 'page' ? 'hidden lg:block' : ''}
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
          className={`min-w-0 scroll-mt-16 lg:sticky ${mobileView === 'palette' ? 'hidden' : ''} lg:top-[4.75rem] lg:col-span-7 lg:flex lg:max-h-[calc(100svh-7.5rem)] lg:flex-col lg:self-start`}
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
            emptyPriceLine={
              qa
                ? null
                : t('builder.emptyPriceLine', {
                    price: formatPriceFromUsd(estimatedPriceUsd, currency, rate),
                    included: CUSTOM_BASE_SECTIONS,
                  })
            }
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
            anchor={anchor}
            hasCommerce={hasCommerce}
            commerceSurcharge={commerceSurcharge}
            openPreview={openPreview}
            addCompositionToCart={qa ? null : addCompositionToCart}
            inCart={!qa && inCart}
            startAnother={projects.startNew}
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
