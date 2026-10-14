/**
 * cāpsula33 — el fondo de «Nosotros»: el espejo infinito del ojo de buey, a lo grande.
 *
 * Aros que se repiten hacia adentro como en el espejo del local (en el teléfono,
 * un poco más abajo para no pisar el texto). El scroll empuja el túnel hacia la
 * pantalla (`state.p`, 0–1) y, al final, aparece la cuadrícula de plano que sigue
 * en «La ruta». Canvas 2D: el dibujo es poco y corre en cualquier teléfono.
 */

const ORANGE = '255,122,26'
const CREAM = '242,233,220'
const RINGS = 16

export function createMirrorTunnel(canvas) {
  const ctx = canvas.getContext('2d')
  const state = { p: 0, shown: 0 }
  let w = 0
  let h = 0
  let dpr = 1
  let raf = 0
  let visible = false

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }

  const draw = (now) => {
    raf = requestAnimationFrame(draw)
    if (!visible) return
    // El scroll manda; el movimiento propio es mínimo (el aro de puntos gira).
    state.shown += (state.p - state.shown) * 0.1
    const p = state.shown
    const phone = w < 700
    const cx = phone ? w * 0.5 : w * 0.7
    const cy = phone ? h * 0.72 : h * 0.5
    const R = Math.max(w, h) * (phone ? 0.75 : 0.62)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Brillo del fondo del túnel.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45)
    glow.addColorStop(0, `rgba(${CREAM},${0.1 + 0.05 * p})`)
    glow.addColorStop(0.35, `rgba(${ORANGE},0.05)`)
    glow.addColorStop(1, `rgba(${ORANGE},0)`)
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    // Los aros: cada uno con su profundidad z (1 cerca, 0 al fondo); el scroll los acerca.
    const travel = p * 5.5
    for (let i = 0; i < RINGS; i++) {
      let z = ((i + travel) % RINGS) / RINGS // 0 → fondo, 1 → pegado a la pantalla
      z = z * z * z
      const r = R * (0.04 + z * 1.6)
      const fadeIn = Math.min(1, z * 9)
      const fadeOut = 1 - Math.max(0, (z - 0.55) / 0.45)
      const a = fadeIn * fadeOut
      if (a <= 0.01 || r < 2) continue
      const warm = i % 2 === 0
      ctx.lineWidth = 0.8 + z * 3.5
      ctx.strokeStyle = `rgba(${warm ? ORANGE : CREAM},${(warm ? 0.55 : 0.32) * a})`
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      // Cada cuatro aros, una corona de puntos: las luces del marco del espejo.
      if (i % 4 === 1) {
        const n = 48
        const rot = now * 0.00004 + i
        ctx.fillStyle = `rgba(${CREAM},${0.5 * a})`
        for (let k = 0; k < n; k++) {
          const t = rot + (k / n) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(cx + Math.cos(t) * r, cy + Math.sin(t) * r, 0.6 + z * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // El marco del ojo de buey, quieto: lo que da la escala.
    ctx.lineWidth = 2
    ctx.strokeStyle = `rgba(${ORANGE},${0.22 + 0.1 * Math.sin(now * 0.0012)})`
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.33, 0, Math.PI * 2)
    ctx.stroke()

    // Al final, la cuadrícula del plano (lo que sigue es «La ruta»).
    const grid = Math.max(0, Math.min(1, (p - 0.72) / 0.25))
    if (grid > 0) {
      const step = phone ? 28 : 36
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(169,214,255,${0.09 * grid})`
      ctx.beginPath()
      for (let x = (cx % step) - step; x < w; x += step) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h * grid)
      }
      for (let y = (cy % step) - step; y < h * grid; y += step) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
    }
  }

  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
  io.observe(canvas)
  raf = requestAnimationFrame(draw)
  return {
    state,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    },
  }
}
