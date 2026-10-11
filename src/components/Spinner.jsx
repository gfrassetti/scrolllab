/**
 * Indicador de una acción en curso (guardar, borrar, abrir, pagar): va al
 * lado del texto del botón, del tamaño del texto. Con «reducir movimiento»
 * no gira; el texto («Guardando…») ya dice qué pasa.
 */
export default function Spinner({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`inline-block size-[1em] shrink-0 animate-spin [animation-duration:700ms] motion-reduce:animate-none ${className}`}
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
