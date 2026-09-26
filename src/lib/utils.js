import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Une clases condicionales (clsx) y resuelve conflictos de Tailwind
 * (tailwind-merge). Es el helper `cn` que esperan los componentes copiados
 * de registros shadcn — p. ej. componentry.dev.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
