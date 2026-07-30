/**
 * Marca de SCROLLLAB: tres "secciones" apiladas (una página que
 * scrollea) con un bloque accent. Hereda el color del texto, así
 * funciona en light, dark y sobre cualquier fondo.
 *
 * data-logo-bar / data-logo-accent: targets para la intro (apilar).
 */
export default function Logo({ className = 'size-5' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        data-logo-bar
        x="4"
        y="5"
        width="24"
        height="4.5"
        fill="currentColor"
      />
      <rect
        data-logo-bar
        x="4"
        y="13.75"
        width="14"
        height="4.5"
        fill="currentColor"
      />
      <rect
        data-logo-accent
        x="22.5"
        y="13.75"
        width="5.5"
        height="4.5"
        fill="var(--color-accent)"
      />
      <rect
        data-logo-bar
        x="4"
        y="22.5"
        width="19"
        height="4.5"
        fill="currentColor"
      />
    </svg>
  )
}
