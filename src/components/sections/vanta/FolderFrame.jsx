import { useId } from 'react'

/**
 * FolderFrame — tabbed “file” clip used on KPR-style tableaux.
 * SVG clipPath in objectBoundingBox so it scales with any plate.
 */
export default function FolderFrame({
  className = '',
  tab = 'left',
  children,
}) {
  const uid = useId().replace(/:/g, '')
  const id = `vanta-folder-${tab}-${uid}`
  const d =
    tab === 'right'
      ? 'M0.02,0.1 H0.58 L0.62,0.02 H0.86 L0.9,0.1 H0.98 Q1,0.1,1,0.14 V0.96 Q1,1,0.96,1 H0.04 Q0,1,0,0.96 V0.14 Q0,0.1,0.02,0.1 Z'
      : 'M0.02,0.1 H0.1 L0.14,0.02 H0.38 L0.42,0.1 H0.98 Q1,0.1,1,0.14 V0.96 Q1,1,0.96,1 H0.04 Q0,1,0,0.96 V0.14 Q0,0.1,0.02,0.1 Z'

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          <path d={d} />
        </clipPath>
      </svg>
      <div className="h-full w-full" style={{ clipPath: `url(#${id})` }}>
        {children}
      </div>
    </div>
  )
}
