import { useRef } from 'react'
import { useGSAP, ScrollTrigger } from '../../lib/gsap'
import { C, MONO, DISPLAY } from './brand'
import { MAP_BG } from './mapScene'

/**
 * cāpsula33 — «Nosotros».
 *
 * Una sola frase grande que se enciende palabra por palabra con el scroll
 * (como el manifiesto de APEX o los capítulos de CHAPTERS). Todo sale de lo que
 * el local ya dice de sí mismo: la cápsula naranja, el café de especialidad, la
 * frase de la pared y la colección del dueño en vitrinas. Abajo, tres datos.
 * `*` marca el tramo en naranja.
 */

const STATEMENT =
  'Somos una *cápsula naranja* de *café de especialidad* en San Martín de los Andes. En la pared lo dice: «No somos lo que razonamos, somos lo que *imaginamos*». Un lugar para reunirnos, con la colección de cine del dueño en vitrinas.'

const WORDS = (() => {
  let accent = false
  return STATEMENT.split(' ').map((raw) => {
    const starts = raw.startsWith('*')
    const ends = raw.replace(/[.,:»]+$/, '').endsWith('*')
    if (starts) accent = true
    const word = { text: raw.replace(/\*/g, ''), accent }
    if (ends) accent = false
    return word
  })
})()

const FACTS = [
  ['6', 'días abiertos por semana'],
  ['9–21', 'horas, de martes a sábado'],
  ['1120', 'Av. Gral. Roca, San Martín de los Andes'],
]

export default function NosotrosSection() {
  const rootRef = useRef(null)
  const R = useRef({})

  useGSAP(
    () => {
      const r = R.current
      const words = [...r.text.querySelectorAll('[data-w]')]
      const n = words.length
      const paint = (p) => {
        // Cada palabra pasa de apagada a prendida en su tramo; el frente es suave.
        const f = p * (n + 6)
        words.forEach((el, i) => {
          const k = Math.max(0, Math.min(1, (f - i) / 6))
          el.style.opacity = String(0.16 + 0.84 * k)
        })
        const facts = Math.max(0, Math.min(1, (p - 0.78) / 0.2))
        r.facts.style.opacity = String(facts)
        r.facts.style.transform = `translate3d(0, ${(1 - facts) * 22}px, 0)`
        const poem = Math.max(0, Math.min(1, (p - 0.62) / 0.18))
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
    { scope: rootRef },
  )

  const set = (k) => (el) => (R.current[k] = el)

  return (
    <section ref={rootRef} id="nosotros" className="relative h-[250svh]" style={{ background: MAP_BG, color: C.cream }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center px-6 md:px-10 lg:px-[5vw]">
        <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.6)' }}>
          <span className="h-px w-8" style={{ background: C.neon }} />
          Nosotros
        </p>
        <p
          ref={set('text')}
          className="mt-6 max-w-[26ch] text-[clamp(1.5rem,3.7vw,3.9rem)] leading-[1.08] font-semibold tracking-[-0.005em] uppercase md:max-w-[34ch]"
          style={DISPLAY}
        >
          {WORDS.map((w, i) => (
            <span key={i} data-w className="inline-block whitespace-pre" style={{ opacity: 0.16, color: w.accent ? C.neon : undefined }}>
              {w.text}
              {i < WORDS.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>

        {/* Lo que dice la pared, junto al ojo de buey (texto del local). */}
        <figure ref={set('poem')} className="mt-8 max-w-[44rem] border-l-2 pl-5 opacity-0" style={{ borderColor: C.neon }}>
          <blockquote className="text-[13px] leading-[1.75] md:text-[14px]" style={{ ...MONO, color: 'rgba(242,233,220,0.78)' }}>
            El ser humano es la única fuerza en el universo que habita las historias que cuenta sobre sí mismo. Este espacio es una cápsula de preservación de mitos de nuestra especie, un lugar para reunirnos y compartir lo que queremos ser, para no morir de realidad.
          </blockquote>
          <figcaption className="mt-2 text-[11px] tracking-[0.18em] uppercase" style={{ ...MONO, color: C.neon }}>
            En la pared, junto al ojo de buey
          </figcaption>
        </figure>

        <ul ref={set('facts')} className="mt-8 grid max-w-[60rem] grid-cols-1 gap-x-10 gap-y-6 border-t pt-6 opacity-0 sm:grid-cols-3" style={{ borderColor: 'rgba(242,233,220,0.16)' }}>
          {FACTS.map(([big, small]) => (
            <li key={big}>
              <p className="text-[clamp(2rem,3.2vw,3.2rem)] leading-none font-semibold tabular-nums" style={DISPLAY}>
                {big}
              </p>
              <p className="mt-2 text-[11px] leading-[1.5] tracking-[0.14em] uppercase" style={{ ...MONO, color: 'rgba(242,233,220,0.55)' }}>
                {small}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
