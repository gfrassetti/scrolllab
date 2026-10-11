import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Pestañas accesibles (tablist ARIA): flechas ←/→, Home y End mueven el foco y
 * eligen; cada pestaña controla su panel (`tabs.id` → `${idBase}-panel-${id}`).
 * El subrayado se desliza entre pestañas (ease-out, ~200ms); con «reducir
 * movimiento» salta sin animar.
 *
 * `tabs`: [{ id, label, count? }]. Los paneles los dibuja quien la usa con
 * <TabPanel>, para que cada uno tenga su propio contenido y estado.
 */
export default function Tabs({ tabs, value, onChange, idBase, label, className = '' }) {
  const listRef = useRef(null)
  const [bar, setBar] = useState(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const active = list?.querySelector(`[data-tab-id="${value}"]`)
    if (!list || !active) return undefined
    const measure = () => setBar({ left: active.offsetLeft, width: active.offsetWidth })
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(list)
    return () => ro?.disconnect()
  }, [value, tabs])

  const onKeyDown = (e) => {
    const i = tabs.findIndex((tab) => tab.id === value)
    const next =
      e.key === 'ArrowRight'
        ? tabs[(i + 1) % tabs.length]
        : e.key === 'ArrowLeft'
          ? tabs[(i - 1 + tabs.length) % tabs.length]
          : e.key === 'Home'
            ? tabs[0]
            : e.key === 'End'
              ? tabs[tabs.length - 1]
              : null
    if (!next) return
    e.preventDefault()
    onChange(next.id)
    listRef.current?.querySelector(`[data-tab-id="${next.id}"]`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative flex gap-8 border-b border-ink/15 ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.id}`}
            data-tab-id={tab.id}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex min-h-11 items-baseline gap-2 pb-3 text-title-sm font-medium tracking-[-0.01em] transition-colors duration-200 focus-visible:outline-offset-4 ${
              selected ? 'text-ink' : 'text-ink/40 hover:text-ink/70'
            }`}
          >
            {tab.label}
            {Number.isFinite(tab.count) ? (
              <span className="font-mono text-body-sm font-normal tabular-nums text-ink/45">{tab.count}</span>
            ) : null}
          </button>
        )
      })}
      {bar ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-1px] left-0 h-[2px] bg-accent transition-[transform,width] duration-200 ease-out-strong motion-reduce:transition-none"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
        />
      ) : null}
    </div>
  )
}

/** El panel de una pestaña: solo se dibuja el activo. */
export function TabPanel({ id, idBase, value, children, className = '' }) {
  if (id !== value) return null
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={0}
      className={`outline-none ${className}`}
    >
      {children}
    </div>
  )
}
