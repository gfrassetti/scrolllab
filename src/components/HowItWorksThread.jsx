/**
 * HowItWorksThread — hilo verde decorativo que recorre la sección
 * `#como-funciona`. El trazo se dibuja hacia adelante al scrollear hacia
 * abajo y se repliega hacia atrás al subir (draw scrubbeado con el scroll,
 * estilo linearity.io). La animación vive en TemplatesIndex vía
 * `[data-how-thread-path]`; acá solo va el SVG.
 *
 * preserveAspectRatio="none" + vector-effect no-scaling-stroke: la curva
 * estira a lo alto/ancho de la sección sin deformar el grosor del trazo.
 */
export default function HowItWorksThread() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 h-full w-full"
      viewBox="0 0 100 1000"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        data-how-thread-path
        d="M50 -4 C 90 92, 10 210, 52 322 C 86 416, 6 528, 46 662 C 80 774, 18 884, 60 1004"
        stroke="var(--color-spring)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
