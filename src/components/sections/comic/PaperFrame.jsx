/**
 * Torn comic panel shell — irregular clip + white edge + optional paper shadow.
 */
export default function PaperFrame({
  children,
  className = '',
  fullBleed = false,
  shadow = true,
}) {
  return (
    <div
      className={`relative ${fullBleed ? 'h-full w-full' : 'mx-auto w-[min(94vw,1180px)]'} ${className}`}
    >
      <div
        className={`relative h-full overflow-hidden bg-[#1a1816] ${shadow ? 'shadow-[0_24px_80px_rgba(30,25,20,0.35)]' : ''}`}
        style={{
          clipPath: fullBleed
            ? 'none'
            : 'polygon(0.8% 1.2%, 98.8% 0.2%, 100% 2.5%, 99.4% 50%, 100% 97.5%, 97.5% 100%, 50% 99.4%, 1.5% 100%, 0% 97%, 0.5% 50%, 0% 3%)',
        }}
      >
        {children}
        {!fullBleed && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <path
              d="M0.8 1.2 L98.8 0.2 L100 2.5 L99.4 50 L100 97.5 L97.5 100 L50 99.4 L1.5 100 L0 97 L0.5 50 L0 3 Z"
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
