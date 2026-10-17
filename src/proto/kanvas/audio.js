/**
 * Kanvas — el sonido, sin archivos: la música de fondo y los efectos del menú se sintetizan con Web Audio.
 *
 * El navegador no deja sonar nada hasta un gesto del visitante, así que arranca apagado y se prende con
 * un toque (el botón de la carga o el de la onda, abajo a la izquierda). La música es un loop de phonk
 * hecho con osciladores (bombo 808, bajo saturado, cencerro con melodía, palmas y hats): sirve para la
 * mecánica. La pista real es un archivo con licencia que reemplaza a `startLoop`.
 */
export function createAudio() {
  let ctx = null
  let master
  let music
  let sfx
  let noise
  let timer = 0
  let on = false
  const subs = new Set()
  const emit = () => subs.forEach((f) => f(on))

  const init = () => {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 4
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(comp)
    music = ctx.createGain()
    music.gain.value = 0.34
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 6000
    music.connect(tone)
    tone.connect(master)
    sfx = ctx.createGain()
    sfx.gain.value = 0.8
    sfx.connect(master)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }

  const env = (g, t, peak, attack, decay) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }
  const noiseSrc = (t, dur) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.start(t, Math.random() * 0.5, dur)
    return s
  }

  // --- la música: 4 compases de 16 pasos a 138 bpm --------------------------------------------------
  const BPM = 138
  const STEP = 60 / BPM / 4
  const ROOT = 587.33 // re (cencerro)
  const BASS = 73.42 // re grave (808)
  // melodía del cencerro, en semitonos sobre ROOT (null = silencio)
  const BELL = [
    0, null, 0, 3, null, 5, null, 3, 0, null, 0, -2, null, null, 3, null,
    0, null, 0, 3, null, 7, null, 5, 3, null, 0, null, -2, null, 0, null,
  ]
  const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]
  const CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
  const BARS = [0, 0, -4, -2] // raíz del bajo por compás
  let step = 0
  let nextT = 0

  const shaper = (() => {
    const c = new Float32Array(1024)
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1
      c[i] = Math.tanh(x * 3.2)
    }
    return c
  })()

  const kick = (t, bar) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12)
    env(g, t, 0.9, 0.003, 0.4)
    o.connect(g).connect(music)
    o.start(t)
    o.stop(t + 0.5)
    // el 808: el bajo largo y saturado que sigue al bombo
    const b = ctx.createOscillator()
    const bg = ctx.createGain()
    const ws = ctx.createWaveShaper()
    ws.curve = shaper
    b.frequency.value = BASS * 2 ** (BARS[bar] / 12)
    env(bg, t, 0.42, 0.01, 0.75)
    b.connect(ws).connect(bg).connect(music)
    b.start(t)
    b.stop(t + 0.9)
  }
  const clap = (t) => {
    for (const off of [0, 0.011, 0.023]) {
      const s = noiseSrc(t + off, 0.2)
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1500
      f.Q.value = 0.9
      const g = ctx.createGain()
      env(g, t + off, 0.32, 0.002, 0.14)
      s.connect(f).connect(g).connect(music)
    }
  }
  const hat = (t, amp) => {
    const s = noiseSrc(t, 0.06)
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7600
    const g = ctx.createGain()
    env(g, t, amp, 0.001, 0.035)
    s.connect(f).connect(g).connect(music)
  }
  const bell = (t, semi) => {
    // el cencerro del 808: dos cuadradas en relación 1 : 1,48, por un pasabanda
    const f0 = ROOT * 2 ** (semi / 12)
    const g = ctx.createGain()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f0 * 1.25
    bp.Q.value = 1.6
    env(g, t, 0.16, 0.002, 0.22)
    for (const mul of [1, 1.48]) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = f0 * mul
      o.connect(bp)
      o.start(t)
      o.stop(t + 0.3)
    }
    bp.connect(g).connect(music)
  }

  const playStep = (i, t) => {
    const s = i % 16
    const bar = Math.floor(i / 16) % 4
    if (KICK[s]) kick(t, bar)
    if (CLAP[s]) clap(t)
    if (s % 2 === 0) hat(t, 0.09)
    else if (s >= 13 && bar === 3) hat(t, 0.06) // el redoble del final
    const n = BELL[i % 32]
    if (n !== null) bell(t, n)
  }
  const tick = () => {
    while (nextT < ctx.currentTime + 0.14) {
      playStep(step, nextT)
      nextT += STEP
      step = (step + 1) % 64
    }
  }
  const startLoop = () => {
    if (timer) return
    nextT = ctx.currentTime + 0.06
    timer = window.setInterval(tick, 25)
  }
  const stopLoop = () => {
    window.clearInterval(timer)
    timer = 0
  }

  // --- efectos: el cajón del menú -------------------------------------------------------------------
  /** Abrir: aire que sube y un golpe grave. Cerrar: el mismo aire, bajando. */
  const drawer = (open) => {
    if (!on || !ctx) return
    const t = ctx.currentTime + 0.01
    const s = noiseSrc(t, 0.6)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.4
    f.frequency.setValueAtTime(open ? 380 : 2800, t)
    f.frequency.exponentialRampToValueAtTime(open ? 2800 : 340, t + 0.38)
    const g = ctx.createGain()
    env(g, t, 0.5, 0.06, 0.4)
    s.connect(f).connect(g).connect(sfx)
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.frequency.setValueAtTime(open ? 120 : 90, t)
    o.frequency.exponentialRampToValueAtTime(open ? 48 : 40, t + 0.22)
    env(og, t + (open ? 0.24 : 0), 0.55, 0.004, 0.3)
    o.connect(og).connect(sfx)
    o.start(t)
    o.stop(t + 0.7)
    // el «clic» metálico del cierre del cajón
    const c = ctx.createOscillator()
    const cg = ctx.createGain()
    c.type = 'square'
    c.frequency.value = open ? 2400 : 1800
    env(cg, t + (open ? 0.26 : 0.02), 0.05, 0.001, 0.04)
    c.connect(cg).connect(sfx)
    c.start(t)
    c.stop(t + 0.4)
  }

  const set = (v) => {
    init()
    on = v
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    if (on) {
      ctx.resume()
      startLoop()
      master.gain.linearRampToValueAtTime(1, t + 0.8)
    } else {
      master.gain.linearRampToValueAtTime(0, t + 0.4)
      window.setTimeout(() => !on && stopLoop(), 450)
    }
    emit()
  }

  // con la pestaña oculta, silencio (y sin cola de notas al volver)
  const onVis = () => {
    if (!ctx || !on) return
    if (document.hidden) {
      stopLoop()
      ctx.suspend()
    } else {
      ctx.resume().then(startLoop)
    }
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    get on() {
      return on
    },
    set,
    toggle: () => set(!on),
    drawer,
    subscribe(f) {
      subs.add(f)
      return () => subs.delete(f)
    },
    dispose() {
      document.removeEventListener('visibilitychange', onVis)
      stopLoop()
      ctx?.close()
    },
  }
}
