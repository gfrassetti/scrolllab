/**
 * Lugar de algo que todavía se está cargando (.ui-skeleton en index.css): la
 * pantalla tiene su forma desde el primer cuadro y no salta cuando llegan los
 * datos. Para lectores de pantalla, el contenedor que lo usa avisa «Cargando…».
 */
export default function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`ui-skeleton block ${className}`} />
}

/** Filas de una lista o tabla mientras llega la data: misma altura que las reales. */
export function SkeletonRows({ rows = 4, label, className = '' }) {
  return (
    <div role="status" aria-live="polite" className={className} data-skeleton>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-ink/10 py-4">
          <Skeleton className="size-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-6 w-20 shrink-0 sm:block" />
        </div>
      ))}
    </div>
  )
}
