import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCartNotice } from '../lib/cart'
import { useT } from '../i18n'
import ProductThumbnail from './ProductThumbnail'

export default function CartToast() {
  const notice = useCartNotice((state) => state.notice)
  const clear = useCartNotice((state) => state.clear)
  const [visible, setVisible] = useState(false)
  const t = useT()

  useEffect(() => {
    if (!notice) return undefined

    const enter = requestAnimationFrame(() => setVisible(true))
    const leave = window.setTimeout(() => setVisible(false), 2600)
    const remove = window.setTimeout(clear, 3000)

    return () => {
      cancelAnimationFrame(enter)
      window.clearTimeout(leave)
      window.clearTimeout(remove)
    }
  }, [notice, clear])

  if (!notice) return null

  return (
    <aside
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-9999 w-[min(22rem,calc(100vw-2.5rem))] border border-ink/20 bg-bone p-3 text-ink shadow-[0_18px_55px_rgba(0,0,0,0.2)] transition duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <ProductThumbnail
          sku={notice.sku}
          title={notice.title}
          className="h-14 w-16"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/50">
            {notice.already
              ? t('common.alreadyInCart')
              : t('common.addedToCart')}
          </p>
          <p className="mt-1 truncate text-sm font-medium">{notice.title}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false)
            window.setTimeout(clear, 300)
          }}
          aria-label={t('common.close')}
          className="self-start px-1 text-lg leading-none text-ink/40 transition-colors hover:text-ink"
        >
          ×
        </button>
      </div>
      <Link
        to="/cart"
        onClick={clear}
        className="mt-3 block border border-ink bg-ink px-3 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-bone transition-colors hover:border-accent hover:bg-accent"
      >
        {t('common.goToCart')}
      </Link>
    </aside>
  )
}
