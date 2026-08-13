import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const BLOCKS = [
  { value: 'h1', label: 'Heading 1', short: 'H1' },
  { value: 'h2', label: 'Heading 2', short: 'H2' },
  { value: 'h3', label: 'Heading 3', short: 'H3' },
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
 * Título jugable estilo Orionix.
 * Menús en portal (body) → opacos de verdad, sin heredar opacity del hero GSAP.
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
  const blockBtnRef = useRef(null)
  const colorBtnRef = useRef(null)
  const blockMenuRef = useRef(null)
  const colorMenuRef = useRef(null)
  const toolbarId = useId()
  const [block, setBlock] = useState('h1')
  const [blockOpen, setBlockOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [blockPos, setBlockPos] = useState({ top: 0, left: 0 })
  const [colorPos, setColorPos] = useState({ top: 0, left: 0 })

  const syncMenuPositions = () => {
    if (blockOpen && blockBtnRef.current) {
      const r = blockBtnRef.current.getBoundingClientRect()
      setBlockPos({ top: r.bottom + 8, left: r.left })
    }
    if (colorOpen && colorBtnRef.current) {
      const r = colorBtnRef.current.getBoundingClientRect()
      setColorPos({ top: r.bottom + 8, left: r.right })
    }
  }

  useLayoutEffect(() => {
    syncMenuPositions()
  }, [blockOpen, colorOpen])

  useEffect(() => {
    if (!blockOpen && !colorOpen) return undefined
    const onScrollOrResize = () => syncMenuPositions()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [blockOpen, colorOpen])

  useEffect(() => {
    if (!blockOpen && !colorOpen) return undefined
    const onPointerDown = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t)) return
      if (blockMenuRef.current?.contains(t)) return
      if (colorMenuRef.current?.contains(t)) return
      setBlockOpen(false)
      setColorOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setBlockOpen(false)
        setColorOpen(false)
      }
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown)
    }, 0)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
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
  }

  const paint = (hex) => {
    withSelection(() => run('foreColor', hex))
    setColorOpen(false)
  }

  const current = BLOCKS.find((b) => b.value === block) || BLOCKS[0]
  const canPortal = typeof document !== 'undefined'

  const blockMenu =
    blockOpen && canPortal
      ? createPortal(
          <div
            ref={blockMenuRef}
            role="menu"
            aria-label="Turn into"
            className="playable-block-menu fixed z-[200] min-w-[12rem] rounded-2xl border border-black/10 py-1.5 text-[#161412] shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
            style={{
              top: blockPos.top,
              left: blockPos.left,
              backgroundColor: '#ffffff',
              opacity: 1,
            }}
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
                  // pointerdown: aplica antes de que un outside-close cancele el click
                  e.preventDefault()
                  e.stopPropagation()
                  applyBlock(b.value)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left whitespace-nowrap transition-colors hover:bg-black/5 ${
                  block === b.value ? 'bg-black/[0.04]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/10 bg-white font-semibold text-black/55"
                  style={{
                    fontSize:
                      b.value === 'h1' ? 12 : b.value === 'h2' ? 10 : 9,
                  }}
                >
                  {b.short}
                </span>
                <span
                  className="font-medium text-[#161412]"
                  style={{
                    fontSize:
                      b.value === 'h1' ? 16 : b.value === 'h2' ? 14 : 12,
                    lineHeight: 1.2,
                  }}
                >
                  {b.label}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  const colorMenu =
    colorOpen && canPortal
      ? createPortal(
          <div
            ref={colorMenuRef}
            className="fixed z-[200] flex gap-1.5 rounded-full border border-black/10 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
            style={{
              top: colorPos.top,
              left: colorPos.left,
              transform: 'translateX(-100%)',
              backgroundColor: '#ffffff',
              opacity: 1,
            }}
          >
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
          </div>,
          document.body,
        )
      : null

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
        className={`playable-headline outline-none transition-[font-size] duration-200 ease-[var(--ease-out)] ${className}`}
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

      <div className="relative mt-4 w-max max-w-full">
        <div
          id={toolbarId}
          role="toolbar"
          aria-label="Text formatting"
          className="playable-toolbar inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-white px-2 py-1.5 text-[#161412] shadow-[0_10px_32px_rgba(0,0,0,0.12)]"
          onMouseDown={(e) => {
            if (e.target.closest('button')) return
            e.preventDefault()
          }}
        >
          <button
            ref={blockBtnRef}
            type="button"
            title="Turn into"
            aria-label="Turn into"
            aria-haspopup="menu"
            aria-expanded={blockOpen}
            onClick={() => {
              setBlockOpen((v) => !v)
              setColorOpen(false)
            }}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-black/5"
          >
            {current.label}
            <span aria-hidden="true" className="text-[9px] opacity-50">
              ▾
            </span>
          </button>

          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-black/10" />

          <ToolbarBtn
            label="Bold"
            onClick={() => withSelection(() => run('bold'))}
          >
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

          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-black/10" />

          <ToolbarBtn
            ref={colorBtnRef}
            label="Text color"
            onClick={() => {
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
        </div>
      </div>

      {blockMenu}
      {colorMenu}
    </div>
  )
}

function ToolbarBtn({ label, onClick, children, ref }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] transition-colors duration-[var(--duration-press)] ease-[var(--ease-out)] hover:bg-black/5 active:scale-95"
    >
      {children}
    </button>
  )
}
