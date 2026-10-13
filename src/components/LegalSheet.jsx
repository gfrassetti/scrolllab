import { useEffect, useState } from 'react'
import { useMobileMenu } from '../hooks/useMobileMenu'

/**
 * LegalSheet — the legal pages of a one-page site, as a panel over the page.
 *
 * A footer mounts it once with its documents (`{ privacy: { title, body } }`)
 * and links to them by hash: `<a href="#privacy">`. The sheet opens when the
 * hash names one of its documents and closes on Close, Escape or the backdrop,
 * dropping the hash again, so the link works every time and Back does not
 * reopen it. No element carries that id, so the browser never jumps.
 *
 * `body` is plain text: a blank line starts a new paragraph. The panel takes
 * the footer's colours (`bg` / `fg`) and its typeface (it inherits).
 */
export default function LegalSheet({ docs, closeLabel = 'Close', bg, fg }) {
  const { open, toggle, close, panelProps } = useMobileMenu({ breakpoint: null })
  const [current, setCurrent] = useState(null)

  const list = docs && typeof docs === 'object' ? docs : {}
  const doc = current ? list[current] : null

  // The hash drives it: a link (or a shared URL) with #privacy opens it.
  useEffect(() => {
    const read = () => {
      const key = decodeURIComponent(window.location.hash.slice(1))
      if (key && list[key]?.body) setCurrent(key)
      else setCurrent(null)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
    // `list` changes identity on every render; the keys are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(list).join('|')])

  // One direction each, so a close never reopens it: the hash opens the
  // sheet (or closes it, when Back drops the hash) ...
  useEffect(() => {
    if (current && !open) toggle()
    if (!current && open) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  // ... and closing the sheet (Close, Escape, backdrop) drops the hash, so
  // the same link opens it again.
  useEffect(() => {
    if (open || !current) return
    if (window.location.hash.slice(1) === current) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setCurrent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const paragraphs = String(doc?.body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const colors = { '--legal-bg': bg || '#f4f2ee', '--legal-fg': fg || '#141414' }

  return (
    <div
      aria-hidden={open ? undefined : true}
      inert={!open}
      className={`fixed inset-0 z-[90] ${open ? '' : 'pointer-events-none'}`}
      style={colors}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={closeLabel}
        onClick={close}
        className={`absolute inset-0 h-full w-full cursor-default transition-opacity duration-500 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'color-mix(in srgb, var(--legal-fg) 45%, transparent)' }}
      />
      <div
        {...panelProps}
        aria-label={doc?.title || closeLabel}
        data-lenis-prevent
        className={`absolute inset-y-0 right-0 flex w-full max-w-[38rem] flex-col overflow-y-auto overscroll-contain px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-left transition-transform duration-500 motion-reduce:transition-none sm:px-10 sm:pt-8 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--legal-bg)',
          color: 'var(--legal-fg)',
          transitionTimingFunction: 'var(--ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))',
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">{doc?.title}</h2>
          <button
            type="button"
            onClick={close}
            className="tpl-link tpl-hit relative shrink-0 py-1 text-[12px] tracking-[0.14em] uppercase"
          >
            {closeLabel}
          </button>
        </div>
        <div className="mt-8 flex max-w-[60ch] flex-col gap-4 text-[15px] leading-[1.6] opacity-85">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
