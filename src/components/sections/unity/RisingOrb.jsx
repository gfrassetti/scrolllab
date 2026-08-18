/**
 * Rising mark — transparent PNG cutout.
 * Override with `src` / builder `orbSrc` for a custom asset.
 */
import defaultMark from './assets/rising-mark.png'

export default function RisingOrb({ src, className = '' }) {
  return (
    <img
      src={src || defaultMark}
      alt=""
      loading="lazy"
      draggable={false}
      className={`h-auto w-full select-none object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)] ${className}`}
    />
  )
}
