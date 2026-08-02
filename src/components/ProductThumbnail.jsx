const styles = {
  chapters: {
    background: '#f2efe8',
    color: '#181715',
    accent: '#ff4b00',
    code: 'CH',
  },
  nocturne: {
    background: '#111014',
    color: '#f3f0e8',
    accent: '#d9ff3f',
    code: 'NO',
  },
  monolith: {
    background: '#d1d1cd',
    color: '#111214',
    accent: '#2b3cff',
    code: 'MO',
  },
  velocity: {
    background: '#0a1a12',
    color: '#ece9e2',
    accent: '#d9ff3f',
    code: 'VE',
  },
  fizz: {
    background: '#241352',
    color: '#fff3e2',
    accent: '#ff3ea5',
    code: 'FZ',
  },
  atelier: {
    background: '#0b0c10',
    color: '#f2f2f2',
    accent: '#c8d0dc',
    code: 'AT',
  },
  comic: {
    background: '#d8d4cc',
    color: '#2a2622',
    accent: '#e85a24',
    code: 'CM',
  },
  unity: {
    background: '#f3efe6',
    color: '#0a0a0a',
    accent: '#f4c518',
    code: 'UN',
  },
  custom: {
    background: '#181715',
    color: '#f2efe8',
    accent: '#ff4b00',
    code: 'BLD',
  },
}

function productKey(sku) {
  return String(sku).startsWith('custom:') ? 'custom' : sku
}

export default function ProductThumbnail({
  sku,
  title,
  className = 'h-14 w-16',
}) {
  const style = styles[productKey(sku)] || styles.custom

  return (
    <div
      aria-label={title}
      className={`relative shrink-0 overflow-hidden border border-black/15 ${className}`}
      style={{ background: style.background, color: style.color }}
    >
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 h-full w-[18%]"
        style={{ background: style.accent }}
      />
      <span className="absolute bottom-1.5 left-2 text-[8px] font-semibold tracking-[0.18em]">
        {style.code}
      </span>
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 h-px w-7"
        style={{ background: style.color }}
      />
      <span
        aria-hidden="true"
        className="absolute left-2 top-3.5 h-px w-4 opacity-40"
        style={{ background: style.color }}
      />
    </div>
  )
}
