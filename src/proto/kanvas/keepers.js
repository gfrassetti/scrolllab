/**
 * Kanvas — las cartas de los guardianes, pintadas con Canvas 2D (provisorias hasta tener los retratos
 * generados). Cada una: fondo de su color con pinceladas, un halo, el busto en silueta con el borde
 * encendido (capucha, pelo largo o corto según el personaje), su luz y, abajo, número, nombre y oficio.
 *
 * También las caras de las tres cartas del Faro (`drawSigil`): un emblema geométrico por carta.
 */

export const KEEPERS = [
  { name: 'Aurel Vane', role: 'Lamplighter', bg: ['#2b2318', '#7a5a3a'], halo: '#f3b04f', hair: 'hood' },
  { name: 'Ysolde Marr', role: 'Cartographer', bg: ['#1f3a3a', '#4f8a7c'], halo: '#a9d6c4', hair: 'long' },
  { name: 'Teo Brannik', role: 'Ferryman', bg: ['#3a2430', '#8a4b55'], halo: '#ffb07a', hair: 'short' },
  { name: 'Ilsa Corve', role: 'Signal-keeper', bg: ['#1f2e33', '#4f7480'], halo: '#e8c07a', hair: 'long' },
  { name: 'Dov Hale', role: 'Bellwright', bg: ['#2f2a22', '#7a6a48'], halo: '#ffd27a', hair: 'short' },
  { name: 'Mira Tesk', role: 'Tidewatcher', bg: ['#1c2c3d', '#3f6f8f'], halo: '#9cc4d2', hair: 'hood' },
  { name: 'Oren Vasq', role: 'Ashwalker', bg: ['#341f1f', '#86423a'], halo: '#ff8a5a', hair: 'short' },
  { name: 'Lune Adair', role: 'Stargazer', bg: ['#2a2a20', '#6f6a48'], halo: '#f1e2c0', hair: 'long' },
  { name: 'Kestrel Moy', role: 'Wind-reader', bg: ['#22332a', '#5c8a5f'], halo: '#bcd08e', hair: 'hood' },
  { name: 'Brannoc Weld', role: 'Smith of locks', bg: ['#2e2b33', '#6b6575'], halo: '#ffc06a', hair: 'short' },
  { name: 'Sefa Rhun', role: 'Ferry-witch', bg: ['#3a2420', '#8a4f3a'], halo: '#e98a5c', hair: 'long' },
  { name: 'Idris Calloway', role: 'Last scribe', bg: ['#1f2433', '#46516e'], halo: '#f3e1b0', hair: 'hood' },
]

const rnd = (seed) => {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * Una carta de guardián (384 × 512). `font` es la familia de los rótulos. Con `portrait` (el retrato
 * dibujado, de la grilla generada en design/masters/kanvas/3d/keepers-ref.png) la carta es ese dibujo
 * con el nombre encima; sin él, el busto en silueta de antes.
 */
export function drawKeeper(i, { font = 'sans-serif', display = 'sans-serif' } = {}, portrait = null) {
  const k = KEEPERS[i % KEEPERS.length]
  const W = 384
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const r = rnd(i + 3)
  if (portrait) {
    g.drawImage(portrait, 0, 0, W, H)
    const fade = g.createLinearGradient(0, H - 150, 0, H)
    fade.addColorStop(0, 'rgba(32,24,16,0)')
    fade.addColorStop(1, 'rgba(32,24,16,0.82)')
    g.fillStyle = fade
    g.fillRect(0, H - 150, W, 150)
    g.fillStyle = k.halo
    g.font = `600 13px ${font}`
    g.fillText(`Nº ${String(140 + i * 37).padStart(4, '0')}  ·  ${k.role.toUpperCase()}`, 22, H - 60)
    g.fillStyle = '#fbf3e4'
    g.font = `800 38px ${display}`
    g.fillText(k.name.toUpperCase(), 20, H - 22)
    return c
  }

  // fondo y pinceladas en diagonal
  const lin = g.createLinearGradient(0, 0, W * 0.4, H)
  lin.addColorStop(0, k.bg[1])
  lin.addColorStop(1, k.bg[0])
  g.fillStyle = lin
  g.fillRect(0, 0, W, H)
  g.globalAlpha = 0.12
  for (let s = 0; s < 26; s++) {
    g.strokeStyle = r() > 0.5 ? '#ffffff' : '#000000'
    g.lineWidth = 6 + r() * 26
    g.lineCap = 'round'
    g.beginPath()
    const x = r() * W
    const y = r() * H
    g.moveTo(x, y)
    g.lineTo(x + 60 + r() * 120, y - 40 - r() * 90)
    g.stroke()
  }
  g.globalAlpha = 1

  // halo detrás de la cabeza
  const hx = W * (0.46 + r() * 0.08)
  const hy = H * 0.36
  const halo = g.createRadialGradient(hx, hy, 6, hx, hy, 170)
  halo.addColorStop(0, k.halo)
  halo.addColorStop(0.35, `${k.halo}88`)
  halo.addColorStop(1, `${k.halo}00`)
  g.fillStyle = halo
  g.fillRect(0, 0, W, H)
  g.strokeStyle = `${k.halo}aa`
  g.lineWidth = 2
  g.beginPath()
  g.arc(hx, hy, 92, 0, Math.PI * 2)
  g.stroke()

  // el busto: hombros, cuello, cabeza y pelo / capucha
  const ink = '#140f1c'
  const bust = new Path2D()
  bust.moveTo(W * 0.04, H)
  bust.bezierCurveTo(W * 0.08, H * 0.7, W * 0.3, H * 0.62, W * 0.42, H * 0.6)
  bust.lineTo(W * 0.44, H * 0.52)
  bust.lineTo(W * 0.56, H * 0.52)
  bust.lineTo(W * 0.58, H * 0.6)
  bust.bezierCurveTo(W * 0.72, H * 0.62, W * 0.93, H * 0.7, W * 0.97, H)
  bust.closePath()
  const head = new Path2D()
  head.ellipse(hx, H * 0.4, 46, 58, 0, 0, Math.PI * 2)
  const hairP = new Path2D()
  if (k.hair === 'hood') {
    hairP.moveTo(hx - 78, H * 0.62)
    hairP.quadraticCurveTo(hx - 92, H * 0.26, hx + 4, H * 0.22)
    hairP.quadraticCurveTo(hx + 88, H * 0.27, hx + 76, H * 0.62)
    hairP.quadraticCurveTo(hx, H * 0.5, hx - 78, H * 0.62)
  } else if (k.hair === 'long') {
    hairP.moveTo(hx - 60, H * 0.7)
    hairP.quadraticCurveTo(hx - 82, H * 0.3, hx, H * 0.27)
    hairP.quadraticCurveTo(hx + 84, H * 0.3, hx + 66, H * 0.72)
    hairP.quadraticCurveTo(hx + 20, H * 0.5, hx - 60, H * 0.7)
  } else {
    for (let s = 0; s < 9; s++) {
      const a = Math.PI * (1.05 + (s / 8) * 0.9)
      hairP.moveTo(hx + Math.cos(a) * 40, H * 0.38 + Math.sin(a) * 52)
      hairP.lineTo(hx + Math.cos(a) * 74, H * 0.36 + Math.sin(a) * 82)
      hairP.lineTo(hx + Math.cos(a + 0.25) * 42, H * 0.38 + Math.sin(a + 0.25) * 54)
    }
  }
  g.fillStyle = ink
  g.fill(bust)
  g.fill(hairP)
  g.fill(head)
  // borde encendido del lado del halo
  g.save()
  g.shadowColor = k.halo
  g.shadowBlur = 18
  g.strokeStyle = k.halo
  g.lineWidth = 2.5
  g.stroke(head)
  g.stroke(hairP)
  g.restore()

  // su luz: un farol o una chispa en la mano
  const lx = W * (r() > 0.5 ? 0.22 : 0.78)
  const ly = H * 0.78
  const lg = g.createRadialGradient(lx, ly, 2, lx, ly, 46)
  lg.addColorStop(0, '#fff6dc')
  lg.addColorStop(0.3, k.halo)
  lg.addColorStop(1, `${k.halo}00`)
  g.fillStyle = lg
  g.beginPath()
  g.arc(lx, ly, 46, 0, Math.PI * 2)
  g.fill()

  // rótulos
  g.fillStyle = 'rgba(10,8,16,0.55)'
  g.fillRect(0, H - 92, W, 92)
  g.fillStyle = k.halo
  g.font = `600 13px ${font}`
  g.fillText(`Nº ${String(140 + i * 37).padStart(4, '0')}  ·  ${k.role.toUpperCase()}`, 22, H - 60)
  g.fillStyle = '#f6efe4'
  g.font = `800 38px ${display}`
  g.fillText(k.name.toUpperCase(), 20, H - 22)
  return c
}

/** La cara de una carta del Faro: un emblema geométrico, el número romano y el nombre del lugar. */
export function drawSigil(i, label, { font = 'sans-serif', display = 'sans-serif' } = {}) {
  const W = 384
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#1a1428'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(243,176,79,0.9)'
  g.fillStyle = 'rgba(243,176,79,0.9)'
  g.lineWidth = 2
  const cx = W / 2
  const cy = H * 0.44
  // grilla fina
  g.globalAlpha = 0.12
  for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 1, H)
  for (let y = 0; y < H; y += 24) g.fillRect(0, y, W, 1)
  g.globalAlpha = 1
  g.beginPath()
  g.arc(cx, cy, 120, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.arc(cx, cy, 84, 0, Math.PI * 2)
  g.setLineDash([3, 7])
  g.stroke()
  g.setLineDash([])
  // un emblema distinto por carta: puerta, torre, puerto
  g.lineWidth = 3
  g.beginPath()
  if (i === 0) {
    g.moveTo(cx - 44, cy + 60)
    g.lineTo(cx - 44, cy - 20)
    g.arc(cx, cy - 20, 44, Math.PI, 0)
    g.lineTo(cx + 44, cy + 60)
    g.moveTo(cx, cy + 60)
    g.lineTo(cx, cy - 64)
  } else if (i === 1) {
    g.moveTo(cx - 22, cy + 70)
    g.lineTo(cx - 14, cy - 40)
    g.lineTo(cx, cy - 90)
    g.lineTo(cx + 14, cy - 40)
    g.lineTo(cx + 22, cy + 70)
    g.moveTo(cx - 30, cy - 40)
    g.lineTo(cx + 30, cy - 40)
  } else {
    g.moveTo(cx - 70, cy + 30)
    g.quadraticCurveTo(cx, cy + 80, cx + 70, cy + 30)
    g.moveTo(cx, cy + 50)
    g.lineTo(cx, cy - 60)
    g.lineTo(cx + 50, cy + 10)
    g.lineTo(cx, cy + 10)
  }
  g.stroke()
  g.fillStyle = '#f3b04f'
  g.font = `600 14px ${font}`
  g.textAlign = 'center'
  g.fillText(['I', 'II', 'III'][i] + '  ·  BEACON', cx, H - 92)
  g.fillStyle = '#f6efe4'
  g.font = `800 44px ${display}`
  g.fillText(label.toUpperCase(), cx, H - 50)
  return c
}

/**
 * Una muestra de pintura (256 × 256) con los colores de un guardián: pinceladas anchas y claras sobre su
 * fondo, con su halo. Rellena las letras de los títulos verticales cuando se mantiene HOLD.
 */
export function drawSwatch(i) {
  const k = KEEPERS[i % KEEPERS.length]
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const r = rnd(i + 11)
  const lin = g.createLinearGradient(0, S, S, 0)
  lin.addColorStop(0, k.bg[0])
  lin.addColorStop(0.55, k.bg[1])
  lin.addColorStop(1, k.halo)
  g.fillStyle = lin
  g.fillRect(0, 0, S, S)
  g.lineCap = 'round'
  for (let s = 0; s < 34; s++) {
    const pick = r()
    g.strokeStyle = pick > 0.7 ? k.halo : pick > 0.4 ? '#ffffff' : k.bg[0]
    g.globalAlpha = 0.15 + r() * 0.35
    g.lineWidth = 8 + r() * 30
    const x = r() * S
    const y = r() * S
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 30 + r() * 60, y - 20 - r() * 40, x + 60 + r() * 90, y - 50 - r() * 60)
    g.stroke()
  }
  g.globalAlpha = 1
  const h = g.createRadialGradient(S * 0.6, S * 0.35, 4, S * 0.6, S * 0.35, S * 0.5)
  h.addColorStop(0, '#fff6dc')
  h.addColorStop(0.25, `${k.halo}cc`)
  h.addColorStop(1, `${k.halo}00`)
  g.fillStyle = h
  g.fillRect(0, 0, S, S)
  return c
}
