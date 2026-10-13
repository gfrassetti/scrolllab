/**
 * cāpsula33 — sonidos de la interfaz, sintetizados (Web Audio, sin archivos).
 *
 * El navegador no deja sonar nada hasta que la persona toca algo: `unlock()` se
 * llama en «Abordar». Se puede apagar desde el header; la elección se recuerda.
 */

const KEY = 'c33-sound'
let ctx = null
let master = null
let enabled = true
try {
  enabled = window.localStorage.getItem(KEY) !== 'off'
} catch {
  /* sin storage: queda prendido */
}
const listeners = new Set()

export function unlock() {
  if (typeof window === 'undefined') return
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

export function soundEnabled() {
  return enabled
}

export function setSound(on) {
  enabled = on
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* nada */
  }
  listeners.forEach((fn) => fn(on))
}

export function onSoundChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const ready = () => enabled && ctx && ctx.state === 'running'

function tone({ freq, to = freq, dur = 0.08, type = 'sine', gain = 0.5, delay = 0, q }) {
  if (!ready()) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur / 4))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let out = g
  if (q) {
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    g.connect(f)
    out = f
  }
  osc.connect(g)
  out.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.3, from = 400, to = 4000, gain = 0.4, delay = 0, type = 'bandpass' }) {
  if (!ready()) return
  const t = ctx.currentTime + delay
  const len = Math.ceil(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.Q.value = 0.9
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(t)
  src.stop(t + dur + 0.02)
}

let lastTick = 0
export const sfx = {
  /** Pasar sobre un ítem del menú. */
  hover() {
    tone({ freq: 1400, to: 2100, dur: 0.06, type: 'triangle', gain: 0.35 })
    tone({ freq: 2800, dur: 0.03, type: 'square', gain: 0.05, delay: 0.02 })
  },
  /** Cada letra que se acomoda (con tope de frecuencia, que no sature). */
  tick() {
    if (!ready()) return
    const now = ctx.currentTime
    if (now - lastTick < 0.028) return
    lastTick = now
    tone({ freq: 3200 + Math.random() * 1600, dur: 0.012, type: 'square', gain: 0.045 })
  },
  open() {
    noise({ dur: 0.35, from: 300, to: 3200, gain: 0.25 })
    tone({ freq: 220, to: 880, dur: 0.28, type: 'sawtooth', gain: 0.08, q: 6 })
  },
  close() {
    noise({ dur: 0.3, from: 3000, to: 250, gain: 0.22 })
    tone({ freq: 880, to: 200, dur: 0.24, type: 'sawtooth', gain: 0.07, q: 6 })
  },
  /** La mira se fija sobre una zona del local. */
  lock() {
    tone({ freq: 900, dur: 0.05, type: 'sine', gain: 0.25 })
    tone({ freq: 1350, dur: 0.07, type: 'sine', gain: 0.22, delay: 0.055 })
  },
  select() {
    tone({ freq: 660, to: 990, dur: 0.12, type: 'triangle', gain: 0.35 })
    tone({ freq: 1980, dur: 0.06, type: 'sine', gain: 0.12, delay: 0.08 })
  },
  /** Salto al hiperespacio (al abordar). */
  warp() {
    noise({ dur: 1.4, from: 120, to: 6000, gain: 0.5, type: 'lowpass' })
    tone({ freq: 60, to: 420, dur: 1.2, type: 'sawtooth', gain: 0.12, q: 3 })
    tone({ freq: 1200, to: 80, dur: 0.9, type: 'sine', gain: 0.18, delay: 1.1 })
  },
  /** Llegar a una estación del recorrido. */
  page() {
    tone({ freq: 520, to: 780, dur: 0.09, type: 'triangle', gain: 0.18 })
    tone({ freq: 1040, dur: 0.05, type: 'sine', gain: 0.08, delay: 0.07 })
  },
  /** El riel de la derecha: un clic grave y seco, distinto al del menú. */
  railHover() {
    tone({ freq: 340, to: 300, dur: 0.035, type: 'square', gain: 0.07, q: 4 })
  },
  railSelect() {
    tone({ freq: 300, to: 600, dur: 0.1, type: 'square', gain: 0.1, q: 5 })
  },
  /** Botones (Iniciar recorrido, Cómo llegar): un pulso suave. */
  buttonHover() {
    tone({ freq: 760, dur: 0.05, type: 'sine', gain: 0.12 })
  },
  /** Zoom: sube al acercar, baja al alejar. */
  zoom(closer) {
    tone({ freq: closer ? 500 : 900, to: closer ? 900 : 500, dur: 0.12, type: 'sine', gain: 0.14 })
  },
  /** Agarrar el local para girarlo. */
  grab() {
    noise({ dur: 0.08, from: 1800, to: 900, gain: 0.12 })
  },
  /** El panel de una estación se despliega. */
  panel() {
    noise({ dur: 0.22, from: 600, to: 2400, gain: 0.08 })
  },
  /** Prender el sonido. */
  soundOn() {
    tone({ freq: 440, dur: 0.06, type: 'triangle', gain: 0.2 })
    tone({ freq: 660, dur: 0.06, type: 'triangle', gain: 0.2, delay: 0.06 })
    tone({ freq: 880, dur: 0.09, type: 'triangle', gain: 0.2, delay: 0.12 })
  },
}
