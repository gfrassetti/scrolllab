/**
 * LAB — mismo mark que LabSplash (SVG, no texto HTML: no depende de que
 * cargue un web font). Acá vive suelto porque también se usa como
 * watermark de fondo en la card de home, no solo en el splash a pantalla
 * completa. `currentColor` hereda del texto del contenedor; los corchetes
 * quedan siempre accent para que se lea como el mismo tag en cualquier lado.
 */
export default function LabMark({ className = 'h-24 w-auto' }) {
  return (
    <svg viewBox="0 0 400 110" role="img" aria-label="LAB" className={className}>
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="88"
        letterSpacing="-3"
      >
        <tspan fill="var(--color-accent, #ff4b00)">&lt;</tspan>
        <tspan fill="currentColor">LAB</tspan>
        <tspan fill="var(--color-accent, #ff4b00)">&gt;</tspan>
      </text>
    </svg>
  )
}
