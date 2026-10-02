/**
 * Rising mark — transparent PNG cutout.
 * Override with `src` / builder `orbSrc` for a custom asset.
 */
import { risingMark as defaultMark, variants } from './assets/images'
import { imgAttrs } from '../../../lib/responsiveImage'

export default function RisingOrb({ src, className = '' }) {
  return (
    <img
      {...imgAttrs(src || defaultMark, variants)}
      sizes="(min-width: 768px) 580px, 78vw"
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`h-auto w-full select-none object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)] ${className}`}
    />
  )
}
