/**
 * La superficie de cada planeta de la carta: bandas, cráteres, burbujas o grageas según el
 * rubro, dibujadas en SVG y recortadas al círculo. Giran muy despacio (el planeta rota).
 * El sombreado de esfera lo pone CartaSection encima.
 */

// Una ola cerrada en sí misma (k enteros): al repetirla a la derecha no se ve la costura.
const wave = (y0, A, k, ph = 0, n = 40) => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100
    const y = y0 + A * Math.sin((x / 100) * Math.PI * 2 * k + ph)
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

function Bands({ list, c1, c3 }) {
  return list.map(([y, A, k, ph, w, dark, o], i) => (
    <path key={i} d={wave(y, A, k, ph)} fill="none" stroke={dark ? c3 : c1} strokeWidth={w} strokeOpacity={o} strokeLinecap="round" />
  ))
}

const SEEDS = [
  [8, 20], [22, 44], [35, 70], [47, 28], [58, 82], [70, 52], [82, 18], [91, 64], [14, 78], [64, 36], [40, 52], [76, 88],
]

const CRATERS = [
  [20, 30, 9], [55, 66, 12], [80, 26, 7], [38, 84, 6], [90, 70, 8], [64, 20, 5], [8, 62, 5],
]

const SPRINKLES = [
  [10, 22, 20, '#ff7a1a'], [24, 40, -30, '#d63c8f'], [38, 18, 60, '#ffd58a'], [50, 60, 10, '#ffffff'], [62, 30, -50, '#ff7a1a'],
  [74, 74, 35, '#d63c8f'], [86, 46, -15, '#ffd58a'], [16, 76, -40, '#ffffff'], [44, 86, 25, '#ff7a1a'], [92, 14, 70, '#ffffff'],
  [30, 60, 5, '#d63c8f'], [68, 52, -65, '#ffd58a'],
]

function Surface({ id, c1, c3 }) {
  switch (id) {
    case 'cafeteria':
      return (
        <>
          <Bands
            c1={c1}
            c3={c3}
            list={[
              [20, 4, 1, 0, 5, true, 0.38],
              [36, 5, 2, 1, 3, false, 0.42],
              [52, 6, 1, 2, 6, true, 0.34],
              [67, 4, 3, 0.5, 3, false, 0.4],
              [82, 5, 2, 3, 5, true, 0.36],
            ]}
          />
          <ellipse cx="30" cy="48" rx="10" ry="4" fill={c1} fillOpacity="0.32" />
          <ellipse cx="78" cy="30" rx="8" ry="3.4" fill={c1} fillOpacity="0.28" />
          <ellipse cx="62" cy="74" rx="9" ry="3" fill={c3} fillOpacity="0.3" />
        </>
      )
    case 'smoothies':
      return (
        <>
          <Bands
            c1={c1}
            c3={c3}
            list={[
              [24, 7, 2, 0, 7, false, 0.35],
              [50, 8, 1, 1.5, 9, true, 0.3],
              [74, 6, 3, 0.8, 6, false, 0.4],
            ]}
          />
          {SEEDS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.7} fill={c3} fillOpacity="0.6" />
          ))}
        </>
      )
    case 'laminados':
      return (
        <Bands
          c1={c1}
          c3={c3}
          list={[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y, i) => [y, 1.6 + (i % 3) * 0.6, 1 + (i % 2), i * 0.9, 3.4, i % 2 === 0, 0.42])}
        />
      )
    case 'cervezas':
      return (
        <>
          <Bands
            c1={c1}
            c3={c3}
            list={[
              [24, 3, 2, 0, 6, true, 0.3],
              [46, 4, 1, 1, 7, false, 0.3],
              [68, 3, 3, 2, 6, true, 0.32],
              [86, 2, 2, 0.4, 5, false, 0.3],
            ]}
          />
          {SEEDS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1 + (i % 4) * 0.7} fill="none" stroke={c1} strokeOpacity="0.7" strokeWidth="0.7" />
          ))}
        </>
      )
    case 'platos':
      return (
        <>
          {CRATERS.map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={c3} fillOpacity="0.5" />
              <circle cx={x - r * 0.12} cy={y - r * 0.12} r={r} fill="none" stroke={c1} strokeOpacity="0.4" strokeWidth="1" />
            </g>
          ))}
          <path d="M4 48 L16 56 L28 50 L44 60 L52 54" fill="none" stroke="#ffb067" strokeOpacity="0.55" strokeWidth="1.1" />
          <path d="M60 46 L70 52 L78 44 L96 52" fill="none" stroke="#ffb067" strokeOpacity="0.5" strokeWidth="1" />
        </>
      )
    default:
      // helados
      return (
        <>
          <Bands
            c1="#ffffff"
            c3={c3}
            list={[
              [26, 6, 2, 0, 6, false, 0.42],
              [52, 7, 1, 2, 8, false, 0.34],
              [76, 5, 3, 1, 5, true, 0.2],
            ]}
          />
          {SPRINKLES.map(([x, y, a, col], i) => (
            <rect key={i} x={x - 2.2} y={y - 0.55} width="4.4" height="1.1" rx="0.55" fill={col} transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </>
      )
  }
}

const SPIN = { cafeteria: 110, smoothies: 90, laminados: 140, cervezas: 100, platos: 160, helados: 120 }

export default function PlanetSurface({ id, colors }) {
  const [c1, , c3] = colors
  return (
    <span className="absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
      <svg
        className="c33-surface absolute top-0 left-0 h-full"
        style={{ width: '200%', animationDuration: `${SPIN[id] || 120}s` }}
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <g>
          <Surface id={id} c1={c1} c3={c3} />
        </g>
        <g transform="translate(100 0)">
          <Surface id={id} c1={c1} c3={c3} />
        </g>
      </svg>
      {id === 'cervezas' ? (
        <span
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 38% at 50% 0%, rgba(255,251,238,0.9) 0 45%, rgba(255,251,238,0) 100%)' }}
        />
      ) : null}
      <style>{`
        @keyframes c33-surface { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .c33-surface { animation: c33-surface linear infinite; }
      `}</style>
    </span>
  )
}

/** El anillo: la mitad de atrás va debajo del planeta y la de adelante encima. */
export function PlanetRing({ px, py, R, color, back = false }) {
  const rx = R * 1.42
  const ry = R * 0.3
  const d = back ? `M ${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0` : `M ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0`
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={{ left: px, top: py, width: 1, height: 1 }} aria-hidden="true">
      <g transform="rotate(-14)">
        <path d={d} fill="none" stroke={color} strokeOpacity={back ? 0.28 : 0.42} strokeWidth={R * 0.1} />
        <path d={d} fill="none" stroke="#fff" strokeOpacity={back ? 0.12 : 0.28} strokeWidth={R * 0.025} transform={`scale(1.06 1.06)`} />
      </g>
    </svg>
  )
}
