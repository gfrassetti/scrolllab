import { useEffect, useId, useRef, useState } from 'react'

function parseItems(value, fallback) {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return fallback
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`size-2.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M2.5 4.25 L6 7.75 L9.5 4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Dropdown({ label, items, open, onOpen, onClose }) {
  const id = useId()
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!wrap.current?.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      ref={wrap}
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose() : onOpen())}
        className="inline-flex items-center gap-1.5 rounded-full border border-foam/15 bg-foam/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foam transition-colors duration-200 hover:bg-foam/20"
      >
        {label}
        <Chevron open={open} />
      </button>

      <div
        id={id}
        role="menu"
        className={`absolute top-full left-1/2 z-50 mt-2 w-48 origin-top -translate-x-1/2 rounded-2xl border border-foam/15 bg-grape/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[opacity,transform] duration-200 ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item}>
              <a
                href="#"
                role="menuitem"
                className="block rounded-xl px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foam/75 transition-colors duration-150 hover:bg-foam/10 hover:text-fizz"
                onClick={onClose}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * NavFizz — floating pill header with MANA-style dropdowns (Shop / Learn)
 * that deploy downward on hover or tap.
 */
export default function NavFizz({
  brand = 'BRAND*',
  shopLabel = 'Shop',
  shopItems = 'All flavors\nBundles\nMerch',
  learnLabel = 'Learn',
  learnItems = 'Our story\nIngredients\nFAQ',
  linkLabel = 'Subscription',
  cta = 'Your CTA',
}) {
  const shop = parseItems(shopItems, ['All flavors', 'Bundles', 'Merch'])
  const learn = parseItems(learnItems, ['Our story', 'Ingredients', 'FAQ'])
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 md:top-6 md:px-8">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-foam/20 bg-grape/80 py-2 pr-2 pl-5 backdrop-blur-md md:pl-7">
        <a
          href="#top"
          className="font-brico text-lg font-extrabold tracking-tight text-foam"
        >
          {brand}
        </a>

        <div className="hidden items-center gap-2 md:flex">
          <Dropdown
            label={shopLabel}
            items={shop}
            open={openMenu === 'shop'}
            onOpen={() => setOpenMenu('shop')}
            onClose={() => setOpenMenu(null)}
          />
          <Dropdown
            label={learnLabel}
            items={learn}
            open={openMenu === 'learn'}
            onOpen={() => setOpenMenu('learn')}
            onClose={() => setOpenMenu(null)}
          />
          <a
            href="#"
            className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foam/70 transition-colors duration-200 hover:text-foam"
          >
            {linkLabel}
          </a>
          <a
            href="#"
            className="rounded-full bg-fizz px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-grape transition-transform duration-200 hover:scale-105"
          >
            {cta}
          </a>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-foam/20 text-foam md:hidden"
          aria-expanded={mobileOpen}
          aria-label="Menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="font-brico text-sm font-bold">{mobileOpen ? '×' : '≡'}</span>
        </button>
      </nav>

      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-5xl rounded-3xl border border-foam/15 bg-grape/95 p-4 backdrop-blur-md md:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foam/45">
            {shopLabel}
          </p>
          <ul className="mt-2 space-y-1">
            {shop.map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foam/85"
                  onClick={() => setMobileOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-foam/45">
            {learnLabel}
          </p>
          <ul className="mt-2 space-y-1">
            {learn.map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foam/85"
                  onClick={() => setMobileOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#"
            className="mt-4 block rounded-full border border-foam/20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-foam"
            onClick={() => setMobileOpen(false)}
          >
            {linkLabel}
          </a>
          <a
            href="#"
            className="mt-2 block rounded-full bg-fizz px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-grape"
            onClick={() => setMobileOpen(false)}
          >
            {cta}
          </a>
        </div>
      )}
    </header>
  )
}
