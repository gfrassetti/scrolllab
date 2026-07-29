import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { models, getSection } from '../lib/sectionRegistry'
import { loadComposition, saveComposition } from '../lib/composition'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
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

const DND_MIME = 'text/plain'

/**
 * BuilderPage — armá una página propia eligiendo secciones de
 * cualquier modelo: arrastrá desde la paleta al lienzo (o usá
 * "+ Agregar" en touch), reordená arrastrando o con flechas,
 * previsualizá la página real acá o en una pestaña nueva y copiá
 * la receta JSON de lo que armaste. Persiste en localStorage.
 */
export default function BuilderPage() {
  const [items, setItems] = useState(loadComposition)
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  // null | index de inserción | 'end'
  const [dragOver, setDragOver] = useState(null)
  const addToCart = useCart((s) => s.addItem)
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = useT()

  useEffect(() => {
    saveComposition(items)
  }, [items])

  const buyComposition = () => {
    if (items.length === 0) return
    const recipe = items.map((item) => item.sectionId)
    addToCart({
      sku: `custom:${recipe.join('+').slice(0, 80)}`,
      title: t('builder.compositionTitle'),
      recipe,
    })
    navigate(user ? '/cart' : '/login')
  }

  const addSection = (sectionId, index = items.length) => {
    setItems((prev) => {
      const next = [...prev]
      next.splice(index, 0, { uid: crypto.randomUUID(), sectionId })
      return next
    })
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

  const copyRecipe = async () => {
    const recipe = {
      name: 'Composición propia',
      createdAt: new Date().toISOString(),
      sections: items.map((item) => item.sectionId),
    }
    await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const openPreview = () => {
    window.scrollTo(0, 0)
    setPreview(true)
  }

  const closePreview = () => {
    window.scrollTo(0, 0)
    setPreview(false)
  }

  /* ——— Preview en vivo: la página real, animaciones incluidas ——— */
  if (preview) {
    return (
      <SmoothScrollProvider>
        <div id="top">
          {items.map((item) => {
            const section = getSection(item.sectionId)
            const Component = section.component
            return (
              <div key={item.uid} className={section.model.wrapperClass}>
                <Component />
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={closePreview}
          className="fixed bottom-5 left-1/2 z-100 -translate-x-1/2 border-2 border-ink bg-bone px-6 py-3 text-xs font-medium uppercase tracking-[0.25em] text-ink shadow-lg transition-colors duration-300 hover:bg-ink hover:text-bone"
        >
          {t('builder.exitPreview')} ({items.length})
        </button>
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
            onClick={copyRecipe}
            disabled={items.length === 0}
            className="border border-ink/30 px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors duration-300 not-disabled:hover:border-ink disabled:opacity-30 md:text-xs"
          >
            {copied ? t('builder.copied') : t('builder.copyRecipe')}
          </button>
          {items.length > 0 ? (
            <a
              href="/preview"
              target="_blank"
              rel="noreferrer"
              className="border border-ink/30 px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors duration-300 hover:border-ink md:text-xs"
            >
              {t('builder.newTab')}
            </a>
          ) : (
            <span className="border border-ink/30 px-4 py-2 text-[11px] uppercase tracking-[0.25em] opacity-30 md:text-xs">
              {t('builder.newTab')}
            </span>
          )}
          <button
            type="button"
            onClick={openPreview}
            disabled={items.length === 0}
            className="border-2 border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-bone transition-colors duration-300 not-disabled:hover:bg-accent not-disabled:hover:border-accent disabled:opacity-30 md:text-xs"
          >
            {t('builder.preview')}
          </button>
          <button
            type="button"
            onClick={buyComposition}
            disabled={items.length === 0}
            className="border-2 border-accent bg-accent px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-ink transition-opacity duration-300 not-disabled:hover:opacity-80 disabled:opacity-30 md:text-xs"
          >
            {user ? t('builder.buyLoggedIn') : t('builder.buyLoggedOut')}
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
                <div className="mb-2 flex items-center gap-3 border-b border-ink/15 pb-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: model.accent }}
                  />
                  <p className="text-sm font-medium tracking-[0.15em]">{model.name}</p>
                </div>

                <ul>
                  {model.sections.map((section) => (
                    <li
                      key={section.id}
                      draggable
                      onDragStart={(e) => startPaletteDrag(e, section.id)}
                      onDragEnd={() => setDragOver(null)}
                      className="flex cursor-grab items-center justify-between gap-4 border-b border-ink/10 py-2.5 active:cursor-grabbing"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="shrink-0 text-ink/30">
                          ⠿
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-baseline gap-2 text-sm font-medium">
                            {section.name}
                            <span className="text-[9px] tracking-[0.2em] text-ink/40">
                              {t(kindLabelKeys[section.kind])}
                            </span>
                          </p>
                          <p className="truncate text-xs text-ink/50">{section.blurb}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSection(section.id)}
                        aria-label={`Agregar ${section.name}`}
                        className="shrink-0 border border-ink/30 px-3 py-1.5 text-xs transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-bone"
                      >
                        {t('builder.add')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ——— Lienzo / composición ——— */}
        <div className="lg:col-span-7">
          <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:text-xs">
            {t('builder.canvasTitle')} ({items.length}{' '}
            {items.length === 1 ? t('builder.section') : t('builder.sections')})
          </p>

          {items.length === 0 ? (
            <div
              onDragOver={allowDropAt('end')}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, 0)}
              className={`flex min-h-60 items-center justify-center border-2 border-dashed p-10 text-center transition-colors duration-200 ${
                dragOver === 'end' ? 'border-accent bg-accent/5' : 'border-ink/20'
              }`}
            >
              <p className="max-w-[36ch] text-sm text-ink/50">
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
                          {section.name}
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
                          aria-label="Subir"
                          className="border border-ink/30 px-2.5 py-1.5 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.uid, 1)}
                          disabled={i === items.length - 1}
                          aria-label="Bajar"
                          className="border border-ink/30 px-2.5 py-1.5 text-xs transition-colors duration-200 not-disabled:hover:bg-ink not-disabled:hover:text-bone disabled:opacity-25"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.uid)}
                          aria-label="Quitar"
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

          {items.length > 0 && (
            <div className="mt-8 border border-ink/15 bg-ink/2 p-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink/50">
                {t('builder.recipeLabel')}
              </p>
              <code className="block text-xs leading-relaxed break-all text-ink/70">
                [{items.map((item) => `"${item.sectionId}"`).join(', ')}]
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
