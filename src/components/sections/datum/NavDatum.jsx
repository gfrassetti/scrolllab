import { useMobileMenu } from '../../../hooks/useMobileMenu'
import { parseNavLinks } from '../../../lib/navLinks'

/**
 * NavDatum — the menu sits on the baseline under the name, a tick under each link (one per column of
 * the sheet). When the name leaves, it rises to the top and stays (the hero writes `--datum-nav-top` and
 * `--datum-nav-y`). It is drawn in paper colour with `mix-blend-mode: difference`, so it reads ink on
 * paper and paper on the black poché without changing anything. Hover: the letters roll up one after the
 * other and the tick grows. Phone: the mark and «Menu», which opens the links over the sheet.
 *
 * InvertDatum (below) turns the drawing over: paper ↔ ink, with the colours easing across.
 */
const CSS = `
.datum-nav { position: fixed; left: 0; right: 0; z-index: 90; color: #efefed; mix-blend-mode: difference;
  top: max(0px, calc(var(--datum-nav-top, 30svh) + var(--datum-nav-y, 0px))); }
.datum-nav-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); align-items: end; padding: 12px 0 13px;
  border-bottom: 1px solid rgba(239,239,237,.3); }
.datum-nav a, .datum-nav button { position: relative; color: inherit; text-decoration: none; font-weight: 500;
  font-size: clamp(14px, 1.15vw, 18px); letter-spacing: -.01em; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
.datum-nav-link::after { content: ''; position: absolute; left: 0; bottom: -14px; width: 1px; height: 9px; background: currentColor;
  transition: height .35s var(--ease-out, cubic-bezier(.25,1,.5,1)); }
.datum-roll { display: inline-flex; overflow: hidden; height: 1.3em; line-height: 1.3; vertical-align: top; }
.datum-roll > span { display: inline-block; white-space: pre; text-shadow: 0 1.3em currentColor;
  transition: transform .5s cubic-bezier(.25,1,.5,1); transition-delay: calc(var(--i) * 18ms); }
@media (hover: hover) {
  .datum-nav-link:hover::after { height: 17px; }
  .datum-nav-link:hover .datum-roll > span { transform: translateY(-1.3em); }
}
.datum-nav-link:focus-visible { outline: 1px solid currentColor; outline-offset: 4px; }
.datum-nav-link:focus-visible .datum-roll > span { transform: translateY(-1.3em); }
.datum-mark { padding-left: 16px !important; display: inline-flex; align-items: center; }
.datum-sheetmenu { position: fixed; inset: 0; z-index: 95; background: var(--datum-ink); color: var(--datum-paper); padding: 88px 6vw 40px;
  display: flex; flex-direction: column; gap: 6px; }
.datum-sheetmenu a { color: inherit; text-decoration: none; font-size: 11vw; line-height: 1; letter-spacing: -.04em; }
.datum-invert { position: fixed; left: 16px; bottom: 20px; z-index: 90; color: #efefed; mix-blend-mode: difference; background: none;
  border: 0; padding: 8px 0; font: 500 14px 'Inter Tight', sans-serif; letter-spacing: -.01em; cursor: pointer; }
.datum-invert::after { content: ''; position: absolute; left: 0; right: 0; bottom: 5px; height: 1px; background: currentColor;
  transform-origin: left; transition: transform .6s cubic-bezier(.25,1,.5,1); }
@media (hover: hover) { .datum-invert:hover::after { transform: scaleX(0); } }
.datum-invert:focus-visible { outline: 1px solid currentColor; outline-offset: 4px; }
`

function Roll({ text }) {
  return (
    <span className="datum-roll" aria-hidden="true">
      {[...text].map((c, i) => (
        <span key={i} style={{ '--i': i }}>
          {c}
        </span>
      ))}
    </span>
  )
}

export default function NavDatum({
  links = ['Practice | #practice', 'Buildings | #buildings', 'Services | #services', 'Method | #method', 'Studio | #studio', 'Contact | #contact'],
  linksText,
  menuLabel = 'Menu',
  closeLabel = 'Close',
}) {
  const items = parseNavLinks(links, linksText)
  const { open, close, panelProps, triggerProps } = useMobileMenu()

  return (
    <>
      <style>{CSS}</style>
      <header className="datum-nav">
        <nav className="datum-nav-row" aria-label="Sections">
          <a href="#top" className="datum-mark" aria-label="Back to the top">
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
              <path d="M6.5 0h2v6.5H15v2H8.5V15h-2V8.5H0v-2h6.5z" fill="currentColor" />
            </svg>
          </a>
          {items.map((it) => (
            <a key={it.href} href={it.href} className="datum-nav-link hidden md:inline-block" aria-label={it.label}>
              <Roll text={it.label} />
            </a>
          ))}
          <button type="button" className="col-start-8 justify-self-end pr-4 md:hidden" {...triggerProps}>
            {open ? closeLabel : menuLabel}
          </button>
        </nav>
      </header>
      {open && (
        <div className="datum-sheetmenu md:hidden" {...panelProps}>
          {items.map((it) => (
            <a key={it.href} href={it.href} onClick={close}>
              {it.label}
            </a>
          ))}
        </div>
      )}
    </>
  )
}

export function InvertDatum({ label = 'Invert drawing', target = '.datum-world' }) {
  return (
    <button
      type="button"
      className="datum-invert"
      onClick={() => {
        const w = document.querySelector(target)
        if (w) w.dataset.theme = w.dataset.theme === 'dark' ? 'light' : 'dark'
      }}
    >
      {label}
    </button>
  )
}
