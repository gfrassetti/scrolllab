import { useRef } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'

const defaultRows = [
  { time: '14:00', home: 'Harbourside FC', away: 'Atlético Lumen', pitch: 'Pitch 1' },
  { time: '15:30', home: 'Red Star Kollo', away: 'Bristol Wanderers', pitch: 'Pitch 2' },
  { time: '17:00', home: 'Ubuntu United', away: 'FC Nordlys', pitch: 'Pitch 1' },
  { time: '18:30', home: 'Club Ceibo', away: 'Sakura Kickers', pitch: 'Pitch 3' },
]

const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:'

/**
 * MatchBoard — the day's fixtures on a split-flap board, like a station
 * departures board: every letter is a tile, and when the board comes into view
 * the tiles spin through the alphabet before they settle on the match, row by
 * row. Passing the pointer over a row (or tapping it) spins it again.
 *
 * Calma: el tablero ya está asentado; las filas entran con un fundido.
 */
export default function MatchBoard({
  eyebrow = 'MATCH DAY 7',
  title = 'QUARTER-FINALS',
  note = 'Free entry. Gates open an hour before the first kick-off.',
  /** Lo que va entre los dos clubes. */
  vsLabel = 'VS',
  rows,
  bg,
  fg,
  /** Las fichas del tablero y la hora de cada partido. */
  cardBg,
  accent,
}) {
  const root = useRef(null)
  const valid = rows?.filter((r) => r?.home || r?.away)
  const list = valid?.length ? valid : defaultRows
  // como un tablero de verdad: cada columna tiene el mismo ancho en todas las filas
  const width = (key) => Math.max(...list.map((r) => String(r[key] || '').length), 1)
  const cols = { time: width('time'), home: width('home'), away: width('away'), pitch: width('pitch') }

  useGSAP(
    () => {
      if (prefersReducedMotion()) return calmReveal('[data-board-row]', { y: 14, stagger: 0.08 })

      // cada ficha gira por letras al azar y se asienta en la suya
      const spin = (row, delay = 0) => {
        const tiles = row.querySelectorAll('[data-flap]')
        tiles.forEach((tile, i) => {
          const final = tile.dataset.flap
          if (final === ' ') return
          const proxy = { n: 0 }
          const turns = 6 + Math.floor(Math.random() * 6)
          gsap.to(proxy, {
            n: turns,
            duration: 0.05 * turns,
            delay: delay + i * 0.025,
            ease: 'none',
            onUpdate: () => {
              const k = Math.floor(proxy.n)
              tile.textContent = k >= turns ? final : FLAP[Math.floor(Math.random() * FLAP.length)]
              tile.style.setProperty('--flip', String(proxy.n % 1))
            },
            onComplete: () => {
              tile.textContent = final
              tile.style.setProperty('--flip', '0')
            },
          })
        })
      }

      const boardRows = gsap.utils.toArray('[data-board-row]', root.current)
      const st = gsap.to({}, {
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          once: true,
          onEnter: () => boardRows.forEach((row, i) => spin(row, i * 0.25)),
        },
      })
      const handlers = boardRows.map((row) => {
        let busy = false
        const again = () => {
          if (busy) return
          busy = true
          spin(row)
          gsap.delayedCall(0.9, () => {
            busy = false
          })
        }
        // el mouse la dispara al pasar; el dedo, al tocar la fila (pointerenter no llega con scroll táctil)
        row.addEventListener('pointerenter', again)
        row.addEventListener('pointerdown', again)
        return () => {
          row.removeEventListener('pointerenter', again)
          row.removeEventListener('pointerdown', again)
        }
      })
      return () => {
        st.scrollTrigger?.kill()
        handlers.forEach((off) => off())
      }
    },
    { scope: root, dependencies: [list.length], revertOnUpdate: true },
  )

  const tiles = (text, size, extra = '') =>
    [...String(text || '').toUpperCase().padEnd(size, ' ')].map((c, i) => (
      <span
        key={i}
        data-flap={c}
        className={`relative inline-flex h-[1.45em] w-[0.92em] items-center justify-center rounded-[3px] bg-(--board-tile) leading-none ${extra}`}
        style={{
          // la línea del medio de la ficha y una sombra que baja mientras gira
          backgroundImage:
            'linear-gradient(to bottom, transparent calc(50% - 0.5px), rgba(0,0,0,0.55) calc(50% - 0.5px), rgba(0,0,0,0.55) calc(50% + 0.5px), transparent calc(50% + 0.5px)), linear-gradient(to bottom, rgba(255,255,255,0.06), transparent 50%, rgba(0,0,0,calc(var(--flip, 0) * 0.5)) 50%)',
        }}
      >
        {c === ' ' ? ' ' : c}
      </span>
    ))

  return (
    <section
      ref={root}
      id="fixtures"
      className="relative overflow-hidden px-4 py-20 md:px-10 md:py-28"
      style={{
        background: bg || '#101614',
        color: fg || '#f2ede2',
        '--board-tile': cardBg || '#1d2522',
        '--board-accent': accent || '#c9a24a',
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
          <div>
            <p className="mb-2 text-[11px] tracking-[0.28em] uppercase opacity-60">{eyebrow}</p>
            <h2 className="font-anton text-[clamp(2.6rem,8vw,6rem)] leading-[0.9] uppercase">{title}</h2>
          </div>
          <p className="max-w-[34ch] text-sm leading-relaxed opacity-70">{note}</p>
        </div>

        <ol className="space-y-2 font-mono text-[max(11px,3.3vw)] font-semibold sm:text-[2.4vw] md:space-y-3 md:text-[1.7vw] xl:text-[1.3rem]">
          {list.map((row, i) => (
            <li
              key={i}
              data-board-row
              className="grid cursor-default grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 rounded-md p-2 transition-colors duration-300 hover:bg-white/5 md:grid-cols-[auto_auto_auto_auto_auto] md:justify-between md:gap-x-5"
            >
              <span className="flex gap-[0.12em] text-(--board-accent)">{tiles(row.time, cols.time)}</span>
              <span className="flex gap-[0.12em]">{tiles(row.home, cols.home)}</span>
              <span className="hidden text-[max(11px,0.8em)] opacity-60 md:block">{vsLabel}</span>
              <span className="col-start-2 flex gap-[0.12em] md:col-start-auto">{tiles(row.away, cols.away)}</span>
              <span className="col-start-2 hidden gap-[0.12em] opacity-70 md:col-start-auto md:flex">{tiles(row.pitch, cols.pitch)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
