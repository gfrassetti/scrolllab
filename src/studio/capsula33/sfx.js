/**
 * cāpsula33 — sonidos de la interfaz, sintetizados (Web Audio, sin archivos).
 *
 * El navegador no deja sonar nada hasta que la persona toca algo: `unlock()` se
 * llama en «Abordar». Solo dos sonidos: el salto del loader y la puerta (pedido
 * del dueño: nada de pitidos en hovers). La elección de apagarlo se recuerda.
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

export const sfx = {
  /** Salto al hiperespacio (al abordar). */
  warp() {
    noise({ dur: 1.4, from: 120, to: 6000, gain: 0.5, type: 'lowpass' })
    tone({ freq: 60, to: 420, dur: 1.2, type: 'sawtooth', gain: 0.12, q: 3 })
    tone({ freq: 1200, to: 80, dur: 0.9, type: 'sine', gain: 0.18, delay: 1.1 })
  },
  /** La puerta del módulo se abre: un soplido de presión, grave y corto. */
  open() {
    noise({ dur: 0.7, from: 2400, to: 260, gain: 0.16, type: 'lowpass' })
  },
}
