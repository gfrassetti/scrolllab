/**
 * Plate — the construction drawing behind a chapter.
 *
 * Four ways a studio can rule a page, drawn as SVG so they stretch with the
 * band and stay hairline-thin at any width. `preserveAspectRatio="none"` is
 * deliberate: these are guides, not artwork, and they should reach the edges.
 */

const STROKE = 'currentColor'

function Column({ count = 8 }) {
  const gutter = 1.6
  const margin = 3
  const span = (100 - margin * 2 - gutter * (count - 1)) / count
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = margin + i * (span + gutter)
        return (
          <rect
            key={i}
            x={x}
            y={6}
            width={span}
            height={88}
            fill="none"
            stroke={STROKE}
            strokeWidth={0.12}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      <line x1={margin} y1={6} x2={100 - margin} y2={6} stroke={STROKE} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
      <line x1={margin} y1={94} x2={100 - margin} y2={94} stroke={STROKE} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
    </>
  )
}

function Canon() {
  const lines = [
    [0, 0, 100, 100],
    [100, 0, 0, 100],
    [0, 0, 50, 100],
    [100, 0, 50, 100],
    [0, 100, 50, 0],
    [100, 100, 50, 0],
  ]
  return (
    <>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={STROKE}
          strokeWidth={0.12}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {[16.6, 33.3, 50, 66.6, 83.3].map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke={STROKE} strokeWidth={0.1} opacity={0.6} vectorEffect="non-scaling-stroke" />
      ))}
      {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={100} stroke={STROKE} strokeWidth={0.1} opacity={0.6} vectorEffect="non-scaling-stroke" />
      ))}
    </>
  )
}

function Module({ cols = 24, rows = 12 }) {
  return (
    <>
      {Array.from({ length: cols + 1 }, (_, i) => {
        const x = (i * 100) / cols
        return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={100} stroke={STROKE} strokeWidth={0.1} vectorEffect="non-scaling-stroke" />
      })}
      {Array.from({ length: rows + 1 }, (_, i) => {
        const y = (i * 100) / rows
        return <line key={`h${i}`} x1={0} y1={y} x2={100} y2={y} stroke={STROKE} strokeWidth={0.1} vectorEffect="non-scaling-stroke" />
      })}
    </>
  )
}

function Radial({ spokes = 24 }) {
  return (
    <>
      {Array.from({ length: spokes }, (_, i) => {
        const angle = (i / spokes) * Math.PI * 2
        return (
          <line
            key={i}
            x1={50}
            y1={50}
            x2={50 + Math.cos(angle) * 80}
            y2={50 + Math.sin(angle) * 80}
            stroke={STROKE}
            strokeWidth={0.1}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {[10, 20, 30, 40].map((r) => (
        <ellipse
          key={r}
          cx={50}
          cy={50}
          rx={r}
          ry={r}
          fill="none"
          stroke={STROKE}
          strokeWidth={0.1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </>
  )
}

const VARIANTS = { column: Column, canon: Canon, module: Module, radial: Radial }

export default function Plate({ variant = 'column', className = '' }) {
  const Shape = VARIANTS[variant] || Column
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none h-full w-full ${className}`}
    >
      <Shape />
    </svg>
  )
}
