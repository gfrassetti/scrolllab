import PaperFrame from './PaperFrame'
import { imgAttrs } from '../../../lib/responsiveImage'

/**
 * ComicPanel — una viñeta: imagen a sangre + ficha de texto, en el mismo
 * lenguaje que las cards pinneadas de ChapterBond. La usan las versiones
 * calmas de ChapterDusty y ChapterBond: ahí cada viñeta es un bloque normal
 * del documento (sin pin ni scrub), así que entran en fila sin solaparse.
 */
export default function ComicPanel({ img, variants, sizes, kicker, title, lines = [] }) {
  return (
    <article className="mx-auto mb-6 max-w-4xl px-5 last:mb-0 md:px-10">
      <PaperFrame className="h-full !w-full">
        <div className="grid md:grid-cols-[1.4fr_0.6fr]">
          <div className="relative h-[42svh] min-h-56 overflow-hidden md:h-[min(50svh,32rem)]">
            <img
              {...imgAttrs(img, variants)}
              sizes={sizes}
              loading="lazy"
              decoding="async"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="flex flex-col justify-center gap-3 bg-[#f7f4ee] p-6 text-[#2a2622] md:p-8">
            {kicker && (
              <p className="text-[11px] tracking-[0.25em] text-comic-flare uppercase">{kicker}</p>
            )}
            {title && (
              <h2 className="font-brico text-2xl font-bold tracking-[-0.03em] md:text-3xl">{title}</h2>
            )}
            {lines.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-[#2a2622]/75">
                {line}
              </p>
            ))}
          </div>
        </div>
      </PaperFrame>
    </article>
  )
}
