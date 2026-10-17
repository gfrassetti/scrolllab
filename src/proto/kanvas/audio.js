/**
 * Kanvas — el sonido, sin archivos (Web Audio). Arma el mismo diseño que la referencia, no su música:
 *
 *   · una INTRO que crece al abrirse el hero (pad oscuro + riser) y después el LOOP de la página;
 *   · cada tramo tiene su mezcla (`scene()`): el hero con todo, las láminas con el cencerro al frente,
 *     la cordillera filtrada con VIENTO encima;
 *   · efectos: el cajón del menú, la transición a pantalla completa y un clic al pasar por un link.
 *
 * El loop es phonk a medio tiempo (bombo y 808 con glissando, palma en el 3, hats con redobles,
 * cencerro con eco) sobre un pad grave con reverb. El navegador no deja sonar nada hasta un gesto:
 * arranca apagado. Las pistas definitivas serían archivos con licencia en lugar de los osciladores.
 */
export function createAudio() {
  let ctx = null
  let master
  let bus = {}
  let noise
  let timer = 0
  let on = false
  let started = false
  let current = 'intro'
  const subs = new Set()
  const emit = () => subs.forEach((f) => f(on))

  const init = () => {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 5
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(comp)
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

    // reverb: un impulso de ruido que decae (2,8 s)
    const verb = ctx.createConvolver()
    const len = ctx.sampleRate * 2.8
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c)
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
    }
    verb.buffer = ir
    const verbGain = ctx.createGain()
    verbGain.gain.value = 0.38
    verb.connect(verbGain).connect(master)

    // la mezcla: cada capa con su ganancia; el filtro general abre o cierra según el tramo
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 8000
    tone.connect(master)
    const mk = (g, send = 0) => {
      const n = ctx.createGain()
      n.gain.value = g
      n.connect(tone)
      if (send) {
        const s = ctx.createGain()
        s.gain.value = send
        n.connect(s).connect(verb)
      }
      return n
    }
    bus = { tone, verb, pad: mk(0, 0.8), drums: mk(0, 0.08), bass: mk(0), bell: mk(0, 0.5), wind: mk(0, 0.2), fx: mk(0.9, 0.35) }
    // eco del cencerro (corchea con puntillo)
    const dl = ctx.createDelay(1)
    dl.delayTime.value = (60 / BPM) * 0.75
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    bus.bell.connect(dl)
    dl.connect(fb).connect(dl)
    dl.connect(tone)

    startWind()
  }

  const env = (g, t, peak, attack, decay) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }
  const noiseSrc = (t, dur) => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.start(t, Math.random(), dur)
    return s
  }
  const shaper = (() => {
    const c = new Float32Array(1024)
    for (let i = 0; i < 1024; i++) c[i] = Math.tanh(((i / 1023) * 2 - 1) * 4)
    return c
  })()

  // --- el loop: 4 compases de 16 pasos, phonk a medio tiempo ---------------------------------------
  const BPM = 132
  const STEP = 60 / BPM / 4
  const ROOT = 554.37 // do# (cencerro)
  const BASS = 69.3 // do# grave (808)
  const BELL = [
    0, null, 0, 0, 3, null, 0, null, 7, null, 5, null, 3, null, 0, null,
    0, null, 0, 0, 3, null, 0, null, 8, null, 7, 5, 3, null, 2, null,
  ]
  const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
  const BARS = [0, 0, -4, -2] // raíz del 808 por compás: i – i – vi – vii
  const CHORDS = [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]]
  let step = 0
  let nextT = 0
  let lastBass = BASS

  const kick = (t) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(160, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1)
    env(g, t, 1, 0.002, 0.32)
    o.connect(g).connect(bus.drums)
    o.start(t)
    o.stop(t + 0.4)
  }
  const bass808 = (t, freq, dur) => {
    // el 808 entra desde la nota anterior (glissando) y satura
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const ws = ctx.createWaveShaper()
    ws.curve = shaper
    o.frequency.setValueAtTime(lastBass, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.07)
    lastBass = freq
    env(g, t, 0.5, 0.008, dur)
    o.connect(ws).connect(g).connect(bus.bass)
    o.start(t)
    o.stop(t + dur + 0.1)
  }
  const clap = (t) => {
    for (const off of [0, 0.012, 0.026]) {
      const s = noiseSrc(t + off, 0.25)
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1300
      f.Q.value = 0.8
      const g = ctx.createGain()
      env(g, t + off, 0.55, 0.002, 0.18)
      s.connect(f).connect(g).connect(bus.drums)
    }
  }
  const hat = (t, amp, open = false) => {
    const s = noiseSrc(t, open ? 0.3 : 0.06)
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 8200
    const g = ctx.createGain()
    env(g, t, amp, 0.001, open ? 0.22 : 0.03)
    s.connect(f).connect(g).connect(bus.drums)
  }
  const bell = (t, semi) => {
    const f0 = ROOT * 2 ** (semi / 12)
    const g = ctx.createGain()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f0 * 1.3
    bp.Q.value = 2.2
    env(g, t, 0.2, 0.002, 0.34)
    for (const mul of [1, 1.48]) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = f0 * mul
      o.connect(bp)
      o.start(t)
      o.stop(t + 0.4)
    }
    bp.connect(g).connect(bus.bell)
  }
  const pad = (t, bar) => {
    // acorde grave y oscuro: sierras desafinadas por un pasabajos que respira
    const dur = STEP * 16
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.6)
    g.gain.setValueAtTime(0.12, t + dur - 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(380, t)
    lp.frequency.linearRampToValueAtTime(900, t + dur * 0.5)
    lp.frequency.linearRampToValueAtTime(420, t + dur)
    lp.connect(g).connect(bus.pad)
    for (const semi of CHORDS[bar]) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = 138.6 * 2 ** (semi / 12)
        o.detune.value = det
        o.connect(lp)
        o.start(t)
        o.stop(t + dur + 0.7)
      }
    }
  }

  const playStep = (i, t) => {
    const s = i % 16
    const bar = Math.floor(i / 16) % 4
    if (s === 0) pad(t, bar)
    if (KICK[s]) {
      kick(t)
      bass808(t, BASS * 2 ** (BARS[bar] / 12), s === 0 ? 0.9 : 0.45)
    }
    if (s === 8) clap(t)
    if (s % 2 === 0) hat(t, 0.1)
    if (bar % 2 === 1 && s >= 12) hat(t, 0.07) // redoble en semicorcheas
    if (s === 14 && bar === 3) hat(t, 0.08, true)
    const n = BELL[i % 32]
    if (n !== null) bell(t, n)
  }
  const tick = () => {
    while (nextT < ctx.currentTime + 0.15) {
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

  // viento: ruido por un pasabanda que se mueve lento (siempre corre; su volumen lo pone el tramo)
  const startWind = () => {
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    bp.frequency.value = 600
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.13
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 380
    lfo.connect(lfoAmt).connect(bp.frequency)
    const g = ctx.createGain()
    g.gain.value = 0.7
    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.21
    const amt2 = ctx.createGain()
    amt2.gain.value = 0.3
    lfo2.connect(amt2).connect(g.gain)
    s.connect(bp).connect(g).connect(bus.wind)
    s.start()
    lfo.start()
    lfo2.start()
  }

  // las mezclas de cada tramo: [pad, drums, bass, bell, wind, corte del filtro]
  const MIX = {
    intro: [1, 0, 0.6, 0, 0, 1400],
    hero: [0.8, 1, 1, 0.8, 0, 9000],
    tableau: [0.6, 0.85, 0.9, 1.1, 0, 9000],
    ridge: [1, 0.5, 0.8, 0.5, 0.9, 1600],
    relic: [0.7, 1, 1, 1, 0.2, 9000],
  }
  const applyMix = (name, glide = 1.2) => {
    if (!ctx) return
    const m = MIX[name] || MIX.hero
    const t = ctx.currentTime
    ;['pad', 'drums', 'bass', 'bell', 'wind'].forEach((k, i) => bus[k].gain.setTargetAtTime(m[i], t, glide / 3))
    bus.tone.frequency.setTargetAtTime(m[5], t, glide / 3)
  }

  // la intro: un riser de ruido que sube y abre el loop
  const riser = () => {
    const t = ctx.currentTime + 0.02
    const s = noiseSrc(t, 2.6)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 2
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(5200, t + 2.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 2.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    s.connect(f).connect(g).connect(bus.fx)
  }

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
    s.connect(f).connect(g).connect(bus.fx)
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.frequency.setValueAtTime(open ? 120 : 90, t)
    o.frequency.exponentialRampToValueAtTime(open ? 48 : 40, t + 0.22)
    env(og, t + (open ? 0.24 : 0), 0.55, 0.004, 0.3)
    o.connect(og).connect(bus.fx)
    o.start(t)
    o.stop(t + 0.7)
  }
  /** La transición a pantalla completa: un barrido grave con un golpe al cubrir. */
  const sweep = () => {
    if (!on || !ctx) return
    const t = ctx.currentTime + 0.01
    const s = noiseSrc(t, 1.2)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(400, t)
    f.frequency.exponentialRampToValueAtTime(6000, t + 0.5)
    f.frequency.exponentialRampToValueAtTime(300, t + 1.1)
    const g = ctx.createGain()
    env(g, t, 0.6, 0.35, 0.8)
    s.connect(f).connect(g).connect(bus.fx)
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.frequency.setValueAtTime(70, t + 0.4)
    o.frequency.exponentialRampToValueAtTime(34, t + 1.2)
    env(og, t + 0.4, 0.8, 0.005, 0.8)
    o.connect(og).connect(bus.fx)
    o.start(t)
    o.stop(t + 1.4)
  }
  /** El clic al pasar por un link: corto y agudo. */
  let lastTick = 0
  const tickFx = () => {
    if (!on || !ctx || ctx.currentTime - lastTick < 0.05) return
    lastTick = ctx.currentTime
    const t = ctx.currentTime + 0.005
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.setValueAtTime(2600, t)
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.03)
    env(g, t, 0.07, 0.001, 0.04)
    o.connect(g).connect(bus.fx)
    o.start(t)
    o.stop(t + 0.08)
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
      if (!started) {
        started = true
        if (current === 'intro') riser()
      }
      applyMix(current, 0.2)
      master.gain.linearRampToValueAtTime(1, t + 0.8)
    } else {
      master.gain.linearRampToValueAtTime(0, t + 0.4)
      window.setTimeout(() => !on && stopLoop(), 450)
    }
    emit()
  }

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
    sweep,
    tick: tickFx,
    /** El tramo actual: cambia la mezcla con un fundido. 'intro' → 'hero' hace sonar el riser. */
    scene(name) {
      if (name === current) return
      const prev = current
      current = name
      if (!on || !ctx) return
      if (prev === 'intro' && name === 'hero') riser()
      applyMix(name)
    },
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
