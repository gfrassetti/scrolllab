import { useEffect, useId, useRef, useState } from 'react'

const BLOCKS = [
  { value: 'h1', label: 'Heading 1', short: 'H1', scale: 1 },
  { value: 'h2', label: 'Heading 2', short: 'H2', scale: 0.78 },
  { value: 'h3', label: 'Heading 3', short: 'H3', scale: 0.62 },
]

const COLORS = [
  { value: '#161412', label: 'Ink' },
  { value: '#f2efe9', label: 'Bone' },
  { value: '#ff4b00', label: 'Accent' },
  { value: '#2b3cff', label: 'Klein' },
  { value: '#d9ff3f', label: 'Acid' },
  { value: '#ff3ea5', label: 'Fizz' },
]

function run(command, value) {
  try {
    document.execCommand(command, false, value)
  } catch {
    /* ignore */
  }
}

function selectEditorContents(el) {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * Título jugable estilo Orionix: toolbar siempre visible, sin caret de input.
 * Turn into → H1 / H2 / H3. No persiste.
 */
export default function PlayableHeadline({
  as: Tag = 'h1',
  className = '',
  lineClassName = '',
  lines = [],
  'aria-label': ariaLabel = 'Editable headline',
}) {
  const editorRef = useRef(null)
  const rootRef = useRef(null)
  const toolbarId = useId()
  const [block, setBlock] = useState('h1')
  const [blockOpen, setBlockOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)

  useEffect(() => {
    if (!blockOpen && !colorOpen) return undefined
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setBlockOpen(false)
        setColorOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setBlockOpen(false)
        setColorOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [blockOpen, colorOpen])

  const withSelection = (fn) => {
    const el = editorRef.current
    if (!el) return
    const sel = window.getSelection()
    const inside =
      sel &&
      sel.rangeCount > 0 &&
      el.contains(sel.anchorNode) &&
      !sel.isCollapsed
    if (!inside) selectEditorContents(el)
    el.focus({ preventScroll: true })
    fn()
    window.requestAnimationFrame(() => {
      el.blur()
      window.getSelection()?.removeAllRanges()
    })
  }

  const applyBlock = (value) => {
    setBlock(value)
    setBlockOpen(false)
    // Chrome acepta "h2" o "<h2>"; probamos ambos formatos vía scale visual + formatBlock.
    withSelection(() => {
      run('formatBlock', value)
      run('formatBlock', `<${value}>`)
    })
  }

  const paint = (hex) => {
    withSelection(() => run('foreColor', hex))
    setColorOpen(false)
  }

  const current = BLOCKS.find((b) => b.value === block) || BLOCKS[0]

  return (
    <div ref={rootRef} className="relative">
      <Tag
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        data-block={block}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-controls={toolbarId}
        className={`playable-headline origin-top-left outline-none transition-transform duration-200 ease-[var(--ease-out)] ${className}`}
        style={{ transform: `scale(${current.scale})` }}
      >
        {lines.map((line, i) => {
          const text = typeof line === 'string' ? line : line?.text
          const extra =
            typeof line === 'object' && line?.className ? line.className : ''
          return (
            <span
              key={`${text}-${i}`}
              className={`block ${lineClassName} ${extra}`.trim()}
            >
              {text}
            </span>
          )
        })}
      </Tag>

      <div
        id={toolbarId}
        role="toolbar"
        aria-label="Text formatting"
        className="playable-toolbar mt-4 inline-flex w-max max-w-full shrink-0 items-center gap-0.5 overflow-hidden rounded-full border border-black/10 bg-white px-2 py-1.5 text-[#161412] shadow-[0_10px_32px_rgba(0,0,0,0.12)]"
        onPointerDown={(e) => {
          // Evita robar el foco del contentEditable; los botones manejan su propio pointerdown.
          if (e.target.closest('button, [role="menu"]')) {
            e.stopPropagation()
            return
          }
          e.preventDefault()
        }}
      >
        <div className="relative shrink-0">
          <button
            type="button"
            title="Turn into"
            aria-label="Turn into"
            aria-haspopup="menu"
            aria-expanded={blockOpen}
            onPointerDown={(e) => {
              // pointerdown (no click): más fiable en toolbars con preventDefault
              e.preventDefault()
              e.stopPropagation()
              setBlockOpen((v) => !v)
              setColorOpen(false)
            }}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-black/5"
          >
            {current.label}
            <span aria-hidden="true" className="text-[9px] opacity-50">
              ▾
            </span>
          </button>
          {blockOpen && (
            <div
              role="menu"
              aria-label="Turn into"
              className="absolute top-full left-0 z-[80] mt-2 min-w-[12rem] overflow-hidden rounded-2xl border border-black/10 bg-white py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
            >
              <p className="px-3 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-black/40">
                Turn into
              </p>
              {BLOCKS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  role="menuitem"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    applyBlock(b.value)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] whitespace-nowrap transition-colors hover:bg-black/5 ${
                    block === b.value ? 'bg-black/[0.04]' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/10 text-[10px] font-semibold text-black/55"
                  >
                    {b.short}
                  </span>
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-black/10" />

        <ToolbarBtn
          label="Bold"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            withSelection(() => run('bold'))
          }}
        >
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn
          label="Italic"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            withSelection(() => run('italic'))
          }}
        >
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn
          label="Underline"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            withSelection(() => run('underline'))
          }}
        >
          <span className="underline">U</span>
        </ToolbarBtn>

        <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-black/10" />

        <div className="relative shrink-0">
          <ToolbarBtn
            label="Text color"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setColorOpen((v) => !v)
              setBlockOpen(false)
            }}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[13px] font-semibold">A</span>
              <span className="mt-0.5 h-0.5 w-3 rounded-full bg-[#ff4b00]" />
            </span>
            <span aria-hidden="true" className="ml-0.5 text-[9px] opacity-50">
              ▾
            </span>
          </ToolbarBtn>
          {colorOpen && (
            <div className="absolute top-full left-1/2 z-[80] mt-2 flex -translate-x-1/2 gap-1.5 rounded-full border border-black/10 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    paint(c.value)
                  }}
                  className="h-6 w-6 rounded-full border border-black/15 ui-press"
                  style={{ background: c.value }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({ label, onPointerDown, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-[13px] transition-colors duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-black/5 active:scale-95"
    >
      {children}
    </button>
  )
}
