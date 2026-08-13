import { useId, useRef, useState } from 'react'

const BLOCKS = [
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'p', label: 'Paragraph' },
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
 * El texto se puede formatear; no persiste.
 */
export default function PlayableHeadline({
  as: Tag = 'h1',
  className = '',
  lineClassName = '',
  lines = [],
  'aria-label': ariaLabel = 'Editable headline',
}) {
  const editorRef = useRef(null)
  const toolbarId = useId()
  const [block, setBlock] = useState('h1')
  const [colorOpen, setColorOpen] = useState(false)

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
    // Sin caret visible: soltamos el foco tras aplicar (como Orionix).
    window.requestAnimationFrame(() => {
      el.blur()
      window.getSelection()?.removeAllRanges()
    })
  }

  const applyBlock = (value) => {
    setBlock(value)
    withSelection(() => run('formatBlock', value === 'p' ? 'p' : value))
  }

  const paint = (hex) => {
    withSelection(() => run('foreColor', hex))
    setColorOpen(false)
  }

  return (
    <div className="relative">
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
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-controls={toolbarId}
        className={`playable-headline outline-none ${className}`}
        onMouseUp={() => {
          /* selección para formatear; el caret queda oculto por CSS */
        }}
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
        className="mt-4 inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-black/10 bg-white px-2 py-1.5 text-[#161412] shadow-[0_10px_32px_rgba(0,0,0,0.12)]"
        onPointerDown={(e) => e.preventDefault()}
      >
        <label className="relative flex items-center">
          <span className="sr-only">Block type</span>
          <select
            value={block}
            onChange={(e) => applyBlock(e.target.value)}
            className="cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pr-6 pl-3 text-[12px] font-medium outline-none hover:bg-black/5"
          >
            {BLOCKS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 text-[10px] opacity-50"
          >
            ▾
          </span>
        </label>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-black/10" />

        <ToolbarBtn label="Bold" onClick={() => withSelection(() => run('bold'))}>
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn
          label="Italic"
          onClick={() => withSelection(() => run('italic'))}
        >
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn
          label="Underline"
          onClick={() => withSelection(() => run('underline'))}
        >
          <span className="underline">U</span>
        </ToolbarBtn>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-black/10" />

        <div className="relative">
          <ToolbarBtn
            label="Text color"
            onClick={() => setColorOpen((v) => !v)}
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
            <div className="absolute top-full left-1/2 z-[70] mt-2 flex -translate-x-1/2 gap-1.5 rounded-full border border-black/10 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => paint(c.value)}
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

function ToolbarBtn({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2 text-[13px] transition-colors duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-black/5 active:scale-95"
    >
      {children}
    </button>
  )
}
