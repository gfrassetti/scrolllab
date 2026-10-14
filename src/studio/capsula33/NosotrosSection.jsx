import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY } from './brand'
import { MAP_BG } from './mapScene'
import { useLang } from './i18nCore'

/**
 * cāpsula33 — «Nosotros».
 *
 * Una sola frase grande que se enciende palabra por palabra con el scroll
 * (como el manifiesto de APEX o los capítulos de CHAPTERS). Todo sale de lo que
 * el local ya dice de sí mismo: la cápsula naranja, el café de especialidad, la
 * colección de figuras en vitrinas. Cuando la frase termina
 * de encenderse entra una foto del salón (se destapa de abajo hacia arriba).
 * Abajo, tres datos.
 * `*` marca el tramo en naranja.
 */

const STATEMENT =
  'Somos una *cápsula naranja* de *café de especialidad* en San Martín de los Andes: espresso, laminados de todos los días y *figuras de colección* de cine y series en vitrinas de ojo de buey. Un lugar para reunirnos.'

/** Las palabras de la frase; `*` marca el tramo en naranja (funciona en cualquier idioma). */
const wordsOf = (statement) => {
  let accent = false
  return statement.split(' ').map((raw) => {
    const starts = raw.startsWith('*')
    const ends = raw.replace(/[.,:»]+$/, '').endsWith('*')
    if (starts) accent = true
    const word = { text: raw.replace(/\*/g, ''), accent }
    if (ends) accent = false
    return word
  })
}

const FACTS = [
  ['6', 'días abiertos por semana'],
  ['9–21', 'horas, de martes a sábado'],
  ['1120', 'Av. Gral. Roca, San Martín de los Andes'],
]

export default function NosotrosSection() {
  const rootRef = useRef(null)
  const R = useRef({})
  const { t } = useLang()
  const WORDS = wordsOf(t(STATEMENT))

  useGSAP(
    () => {
      const r = R.current
      const words = [...r.text.querySelectorAll('[data-w]')]
      const n = words.length
      const wide = window.matchMedia('(min-width: 1024px)')
      const paint = (p) => {
        // Cada palabra pasa de apagada a prendida en su tramo; el frente es suave.
        // En el teléfono la foto y el poema se turnan el mismo lugar: todo arranca un poco antes.
        const pc = wide.matches
        const f = Math.min(1, p / (pc ? 0.55 : 0.42)) * (n + 6)
        words.forEach((el, i) => {
          const k = Math.max(0, Math.min(1, (f - i) / 6))
          el.style.opacity = String(0.16 + 0.84 * k)
        })
        // La foto: entra justo cuando la frase terminó de encenderse.
        const ph = Math.max(0, Math.min(1, (p - (pc ? 0.5 : 0.4)) / (pc ? 0.2 : 0.14)))
        const e = 1 - (1 - ph) ** 3
        r.photo.style.clipPath = `inset(${(1 - e) * 100}% 0 0 0)`
        r.photoImg.style.transform = `scale(${1.18 - 0.18 * e})`
        // En el teléfono comparte lugar con el poema: se va cuando el poema entra.
        r.photoBox.style.opacity = pc ? '1' : String(1 - Math.max(0, Math.min(1, (p - 0.64) / 0.06)))
        r.photoCap.style.opacity = String(Math.max(0, Math.min(1, (p - 0.66) / 0.08)))
        const facts = Math.max(0, Math.min(1, (p - 0.78) / 0.2))
        r.facts.style.opacity = String(facts)
        r.facts.style.transform = `translate3d(0, ${(1 - facts) * 22}px, 0)`
        const poem = Math.max(0, Math.min(1, (p - (pc ? 0.62 : 0.7)) / (pc ? 0.18 : 0.12)))
        r.poem.style.opacity = String(poem)
        r.poem.style.transform = `translate3d(0, ${(1 - poem) * 16}px, 0)`
      }
      paint(0)
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top 30%',
        end: 'bottom bottom',
        onUpdate: (self) => paint(self.progress),
      })
    },
    // Al cambiar de idioma las palabras son otras: se vuelve a armar el encendido.
    { scope: rootRef, dependencies: [t], revertOnUpdate: true },
  )

  const set = (k) => (el) => (R.current[k] = el)

  return (
    <section ref={rootRef} id="nosotros" className="relative h-[250svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden px-6 md:px-10 lg:px-[5vw]">
        <p className="relative flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
          <span className="h-px w-8" style={{ background: C.neon }} />
          {t('Nosotros')}
        </p>
        <p
          ref={set('text')}
          className="relative mt-6 max-w-[26ch] text-[clamp(1.5rem,3.7vw,3.9rem)] leading-[1.08] font-semibold tracking-[-0.005em] uppercase md:max-w-[34ch] lg:max-w-[56vw] lg:text-[clamp(1.5rem,2.9vw,3.4rem)]"
          style={DISPLAY}
        >
          {WORDS.map((w, i) => (
            <span key={i} data-w className="inline-block whitespace-pre" style={{ opacity: 0.16, color: w.accent ? C.neon : undefined }}>
              {w.text}
              {i < WORDS.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>

        {/* En el teléfono la foto y el poema comparten lugar: la foto deja paso al poema. En PC la foto va al lado de la frase. */}
        <div className="mt-6 grid lg:mt-8 lg:block">
          <figure
            ref={set('photoBox')}
            className="relative col-start-1 row-start-1 self-start lg:absolute lg:top-1/2 lg:right-[5vw] lg:mt-0 lg:w-[31vw] lg:-translate-y-1/2"
          >
            <div ref={set('photo')} className="aspect-[16/9] overflow-hidden rounded-[3px] lg:aspect-[4/5]" style={{ clipPath: 'inset(100% 0 0 0)' }}>
              <img
                ref={set('photoImg')}
                src="/studio/capsula33/nosotros-1200.webp"
                alt={t('Mesas negras frente a la banqueta naranja del salón')}
                width="1200"
                height="1500"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-[50%_45%]"
                style={{ transform: 'scale(1.18)', transformOrigin: '50% 100%' }}
              />
            </div>
            <figcaption
              ref={set('photoCap')}
              className="mt-3 hidden items-center gap-3 text-[11px] tracking-[0.18em] uppercase opacity-0 lg:flex"
              style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}
            >
              <span className="h-px w-6" style={{ background: C.neon }} />
              {t('El salón, adentro de la cápsula')}
            </figcaption>
          </figure>

          {/* Lo que dice la pared, junto al ojo de buey (texto del local). */}
          <figure
            ref={set('poem')}
            className="relative col-start-1 row-start-1 max-w-[44rem] border-l-2 pl-5 opacity-0 lg:max-w-[min(44rem,56vw)]"
            style={{ borderColor: C.neon }}
          >
            <blockquote className="text-[13px] leading-[1.75] md:text-[14px]" style={{ ...MONO, color: 'rgba(242,233,220,0.78)' }}>
              {t(
                'El ser humano es la única fuerza en el universo que habita las historias que cuenta sobre sí mismo. Este espacio es una cápsula de preservación de mitos de nuestra especie, un lugar para reunirnos y compartir lo que queremos ser, para no morir de realidad.',
              )}
            </blockquote>
            <figcaption className="mt-2 text-[11px] tracking-[0.18em] uppercase" style={{ ...MONO, color: C.neon }}>
              {t('En la pared, junto al ojo de buey')}
            </figcaption>
          </figure>
        </div>

        <ul
          ref={set('facts')}
          className="relative mt-8 grid max-w-[60rem] grid-cols-1 lg:max-w-[56vw] gap-x-10 gap-y-6 border-t pt-6 opacity-0 sm:grid-cols-3"
          style={{ borderColor: 'rgba(242,233,220,0.16)' }}
        >
          {FACTS.map(([big, small]) => (
            <li key={big}>
              <p className="text-[clamp(2rem,3.2vw,3.2rem)] leading-none font-semibold tabular-nums" style={DISPLAY}>
                {big}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
                {t(small)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
