import { useId } from 'react'

const PATHS = {
  left:
    'M0.02,0.1 H0.1 L0.14,0.02 H0.38 L0.42,0.1 H0.98 Q1,0.1,1,0.14 V0.96 Q1,1,0.96,1 H0.04 Q0,1,0,0.96 V0.14 Q0,0.1,0.02,0.1 Z',
  right:
    'M0.02,0.1 H0.58 L0.62,0.02 H0.86 L0.9,0.1 H0.98 Q1,0.1,1,0.14 V0.96 Q1,1,0.96,1 H0.04 Q0,1,0,0.96 V0.14 Q0,0.1,0.02,0.1 Z',
  top:
    'M0.03,0.12 H0.07 L0.11,0.02 H0.4 L0.44,0.12 H0.97 Q1,0.12,1,0.16 V0.97 Q1,1,0.97,1 H0.03 Q0,1,0,0.97 V0.16 Q0,0.12,0.03,0.12 Z',
  topRight:
    'M0.03,0.12 H0.56 L0.6,0.02 H0.89 L0.93,0.12 H0.97 Q1,0.12,1,0.16 V0.97 Q1,1,0.97,1 H0.03 Q0,1,0,0.97 V0.16 Q0,0.12,0.03,0.12 Z',
  notch:
    'M0.04,0 H0.72 L0.78,0.07 H0.96 Q1,0.07,1,0.12 V0.9 Q1,0.97,0.92,1 H0.08 Q0,1,0,0.92 V0.08 Q0,0,0.04,0 Z',
}

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
  const kind = PATHS[tab] ? tab : 'left'
  const id = `vanta-folder-${kind}-${uid}`

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          <path d={PATHS[kind]} />
        </clipPath>
      </svg>
      <div className="h-full w-full" style={{ clipPath: `url(#${id})` }}>
        {children}
      </div>
    </div>
  )
}
