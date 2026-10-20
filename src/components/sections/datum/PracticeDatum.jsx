import { Fragment, useRef } from 'react'
import * as THREE from 'three'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget, trackPointer } from '../../../lib/motion'

/**
 * PracticeDatum — what the practice stands for: one long, slow shot through a solid block of cubes.
 *
 * It starts on the black the hero ends with: it overlaps the hero's last screen and only shows once it is
 * pinned, and its first frame has the hero's last word («a wall.») in 3D, exactly where the page left it
 * (it measures a copy of the hero's statement laid out with the same rules). The other two lines of the
 * statement come back faintly above it — also in 3D, so the pointer moves them. They sit on the front faces
 * of three cubes one behind the other, seen through a long lens; the lens widens and the camera moves onto
 * their line of sight, so they slide into each other (the nearest the whitest) and recede, while the block
 * comes out of the dark across the whole screen, words on its faces and light running along a few edges.
 *
 * The block is packed (the cubes touch: one grid of lines). Seen from the front and a little to the right
 * (looking left), the camera climbs and rolls, slowly, over many screens, until it looks straight down on
 * the top of the block like at a wall; then it sinks into one cube whose four walls carry a word each. Its
 * floor is the picture, which opens to the whole screen and carries three states — Weight, Light, Time —
 * with the counter 01 / 03. The pointer (or the finger) tilts the camera a little all along the way.
 *
 * Colours come from the page (`--datum-ink` / `--datum-paper`), so «Invert drawing» turns this over too.
 * Reduced motion: no canvas and no pin; the three states one under the other.
 */
const CSS = `
.dp { position: relative; height: 1800svh; margin-top: -100svh; background: var(--datum-ink); color: var(--datum-paper); }
.dp-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-ink); }
/* until it pins, the hero's last screen is what shows (the same black, the same lines, the same word) */
.dp:not([data-live]) .dp-stage { visibility: hidden; }
.dp:not([data-live]) { background: transparent; }
.dp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
/* a copy of the hero's statement, laid out with the hero's rules, only to be measured */
.dp-measure { position: absolute; visibility: hidden; pointer-events: none; margin: 0; right: calc(100% - var(--datum-l2, 50%)); top: 50%;
  font-size: clamp(44px, 6.4vw, 124px); font-weight: 400; line-height: .98; letter-spacing: -.045em; text-align: right; white-space: nowrap; }
.dp-measure span { display: block; }
@media (max-width: 767px) { .dp-measure { right: 6vw; font-size: 12.5vw; } }
.dp-window { position: absolute; left: 0; top: 0; overflow: hidden; background: var(--datum-ink); will-change: transform, width, height; }
.dp-plan { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity .7s cubic-bezier(.25,1,.5,1); }
.dp-plan[data-on] { opacity: 1; }
.dp-plan svg { width: 100%; height: 100%; display: block; }
.dp-sheet { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: difference; z-index: 3; }
.dp-col { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(239,239,237,.2); }
.dp-level { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(239,239,237,.3); opacity: .6; }
.dp-state { position: absolute; inset: 0; z-index: 4; pointer-events: none; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr));
  align-items: center; padding: 0; }
.dp-title { grid-column: 2 / 5; font-size: clamp(44px, 6.2vw, 112px); line-height: .9; letter-spacing: -.05em; padding-left: 0; }
.dp-text { grid-column: 6 / 8; font-size: clamp(15px, 1.25vw, 20px); line-height: 1.3; letter-spacing: -.01em; max-width: 30ch; }
@media (max-width: 767px) {
  .dp-state { grid-template-columns: 1fr; align-content: center; gap: 18px; padding: 0 6vw; }
  .dp-title, .dp-text { grid-column: 1; }
}
.dp-w { display: inline-block; opacity: 0; transform: translateY(.55em) rotate(3deg); transform-origin: left bottom;
  transition: transform .8s cubic-bezier(.25,1,.5,1), opacity .5s; transition-delay: calc(var(--i) * 24ms); }
.dp-state[data-on] .dp-w { opacity: 1; transform: none; }
.dp-count { position: absolute; z-index: 4; right: calc(12.5% - 4px); bottom: 26px; display: flex; gap: 16px; align-items: baseline;
  font-size: 12px; font-weight: 500; opacity: 0; transition: opacity .5s; }
.dp-count[data-on] { opacity: 1; }
.dp-count b { font-weight: 500; display: inline-block; min-width: 2ch; }
/* reduced motion */
.dp[data-calm] { height: auto; margin-top: 0; }
.dp[data-calm] .dp-stage { position: relative; height: auto; visibility: visible; }
.dp[data-calm] .dp-canvas, .dp[data-calm] .dp-count, .dp[data-calm] .dp-level { display: none; }
.dp[data-calm] .dp-window { position: relative; width: 100% !important; height: 70svh !important; transform: none !important; opacity: 1 !important; }
.dp[data-calm] .dp-state { position: relative; inset: auto; min-height: 60svh; }
.dp[data-calm] .dp-w { opacity: 1; transform: none; }
`

// the vocabulary on the faces of the block, and on the four walls of the cube the camera goes into
const WORDS = ['Line', 'Wall', 'Room', 'Measure', 'Shadow', 'Threshold', 'Section', 'Grain', 'Plane', 'Axis', 'Datum', 'Void']
const WALLS = ['Weight', 'Light', 'Time', 'Place']
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
const DEG = Math.PI / 180

// three plan drawings (placeholders until the photographs): plain line work, in the page colour
function Plan({ kind }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' }
  const t = { ...s, strokeWidth: 0.6, opacity: 0.55 }
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="40" y="40" width="320" height="320" {...s} strokeWidth="3" />
      {kind === 0 && (
        <>
          <path d="M40 200H220M220 120V360M300 40V160H360" {...s} strokeWidth="3" />
          <rect x="80" y="240" width="100" height="70" {...t} />
          <circle cx="130" cy="120" r="34" {...t} />
          <path d="M250 260h70v60h-70z M262 272h46v36" {...t} />
          <path d="M220 200a40 40 0 0 1 40 -40" {...t} />
        </>
      )}
      {kind === 1 && (
        <>
          <path d="M40 140H360M160 140V360" {...s} strokeWidth="3" />
          <path d="M60 40V140M100 40V140M140 40V140M180 40V140M220 40V140M260 40V140M300 40V140M340 40V140" {...t} />
          <rect x="200" y="200" width="120" height="120" {...t} />
          <path d="M200 200L320 320M320 200L200 320" {...t} />
          <path d="M70 180h60v140h-60z" {...t} />
        </>
      )}
      {kind === 2 && (
        <>
          <path d="M40 260H260V40M260 260V360" {...s} strokeWidth="3" />
          <circle cx="150" cy="150" r="70" {...t} />
          <circle cx="150" cy="150" r="40" {...t} />
          <path d="M290 80h50v150h-50z M60 290h160v50H60z" {...t} />
          <path d="M260 300a40 40 0 0 0 40 40" {...t} />
        </>
      )}
      <path d="M40 380h80M40 375v10M80 377v6M120 375v10" {...t} />
    </svg>
  )
}

/**
 * A word as a texture, white on transparent (the material tints it). The canvas is the word's text box
 * (the font's ascent + descent, as the page lays it out) plus an even margin, so a plane `aspect` wide and
 * `box` × the text box high, centred on the page's text box, draws the word where the page had it. `draw`
 * repaints it once the font is in.
 */
function wordTexture(text, { weight = 500, px = 140, track = -0.01 } = {}) {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  const font = `${weight} ${px}px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif`
  const out = { tex, aspect: 3, box: 1.2 }
  const setFont = () => {
    g.font = font
    if ('letterSpacing' in g) g.letterSpacing = `${track * px}px`
  }
  out.draw = () => {
    setFont()
    const m = g.measureText(text)
    const asc = m.fontBoundingBoxAscent ?? px * 0.97
    const desc = m.fontBoundingBoxDescent ?? px * 0.24
    const pad = Math.round(px * 0.12)
    const w = Math.ceil(m.width + pad * 2)
    const h = Math.ceil(asc + desc + pad * 2)
    if (c.width !== w || c.height !== h) {
      tex.dispose() // a new size needs a new GPU texture
      c.width = w
      c.height = h
      setFont()
    } else g.clearRect(0, 0, w, h)
    g.fillStyle = '#fff'
    g.textBaseline = 'alphabetic'
    g.fillText(text, pad, pad + asc)
    out.aspect = w / h
    out.box = h / (asc + desc)
    tex.needsUpdate = true
  }
  out.draw()
  return out
}

// light running along the edges of a cube: a closed path of six edges (its Petrie polygon), the head of the
// light at `fract(time · speed + phase) · 6` and a tail behind it
const GLOW_VERT = `
attribute float aS;
attribute float aPhase;
varying float vS;
varying float vPhase;
varying float vDepth;
void main() {
  vS = aS;
  vPhase = aPhase;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const GLOW_FRAG = `
uniform float uTime;
uniform float uGlow;
uniform float uFar;
uniform vec3 uColor;
varying float vS;
varying float vPhase;
varying float vDepth;
void main() {
  float head = fract(uTime * 0.09 + vPhase) * 6.0;
  float d = mod(head - vS + 6.0, 6.0);
  float a = (1.0 - smoothstep(0.0, 1.2, d)) * (1.0 - smoothstep(uFar * 0.5, uFar, vDepth));
  gl_FragColor = vec4(uColor, a * uGlow);
}`

export default function PracticeDatum({
  label = 'Our practice',
  // the hero's statement: its last line is the word the hero hands over
  statement = ['Every line', 'becomes', 'a wall.'],
  states = [
    { title: 'Weight', text: 'Mass placed where it carries something: a wall, a shadow, a reason to stay.' },
    { title: 'Light', text: 'Openings drawn from the path of the sun first and the façade second. Rooms that change by the hour.' },
    { title: 'Time', text: 'Materials chosen to age well. A building should look better at thirty than at three.' },
  ],
}) {
  const root = useRef(null)

  useGSAP(
    () => {
      const el = root.current
      const stage = el.querySelector('[data-stage]')
      const canvas = el.querySelector('canvas')
      const win = el.querySelector('[data-window]')
      const level = el.querySelector('[data-level]')
      const measure = el.querySelector('[data-measure]')
      const plans = [...el.querySelectorAll('[data-plan]')]
      const stateEls = [...el.querySelectorAll('[data-state]')]
      const count = el.querySelector('[data-count]')
      const countN = count.querySelector('b')
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.dataset.calm = ''
        plans[0].dataset.on = ''
        stateEls.forEach((s) => (s.dataset.on = ''))
        return undefined
      }

      // --- renderer -------------------------------------------------------------------------------
      const phone = window.matchMedia('(max-width: 767px)').matches
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
      const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      const budget = createFrameBudget({ dpr, apply: (v) => renderer.setPixelRatio(v) })
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 120)
      const fog = new THREE.Fog(0x101010, 40, 90)
      scene.fog = fog
      const bg = new THREE.Color(0x101010)
      const fg = new THREE.Color(0xefefed)

      // --- the block: packed cubes, one grid of lines -----------------------------------------------
      const S = 1.6 // cube size = grid step: the cubes touch
      const H2 = S / 2
      const X = [-7, 7]
      const Y = [-6, 0] // the top layer is y = 0: its top faces are the wall seen from above
      const Z = [-10, 0] // the front layer is z = 0
      const cell = (i, j, k) => new THREE.Vector3(i * S, j * S, k * S)
      const COL = { i: 0, j: -3 } // the column of the three words of the statement (front to back)
      const TARGET = { i: 0, j: 0, k: -4 } // the cube the camera goes into
      const target = cell(TARGET.i, TARGET.j, TARGET.k)

      const grid = []
      const xs = [X[0] * S - H2, X[1] * S + H2]
      const ys = [Y[0] * S - H2, Y[1] * S + H2]
      const zs = [Z[0] * S - H2, Z[1] * S + H2]
      for (let j = Y[0]; j <= Y[1] + 1; j++) {
        for (let k = Z[0]; k <= Z[1] + 1; k++) grid.push(xs[0], j * S - H2, k * S - H2, xs[1], j * S - H2, k * S - H2)
      }
      for (let i = X[0]; i <= X[1] + 1; i++) {
        for (let k = Z[0]; k <= Z[1] + 1; k++) grid.push(i * S - H2, ys[0], k * S - H2, i * S - H2, ys[1], k * S - H2)
        for (let j = Y[0]; j <= Y[1] + 1; j++) grid.push(i * S - H2, j * S - H2, zs[0], i * S - H2, j * S - H2, zs[1])
      }
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3))
      const lineMat = new THREE.LineBasicMaterial({ color: 0xefefed, transparent: true, opacity: 0, fog: true, depthWrite: false })
      scene.add(new THREE.LineSegments(lineGeo, lineMat))

      let seed = 23
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

      // light along the edges of a few cubes, near the surfaces the camera sees
      const LOOP = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [1, 1, 1],
        [-1, 1, 1],
        [-1, -1, 1],
      ]
      const gPos = []
      const gS = []
      const gPhase = []
      for (let n = 0; n < 34; n++) {
        const top = n % 2 === 0
        const c = top
          ? cell(Math.round(lerp(X[0], X[1], rnd())), 0, Math.round(lerp(Z[0], Z[1], rnd())))
          : cell(Math.round(lerp(X[0], X[1], rnd())), Math.round(lerp(Y[0], Y[1], rnd())), -Math.floor(rnd() * 3))
        const ph = rnd()
        for (let k = 0; k < 6; k++) {
          const a = LOOP[k]
          const b = LOOP[(k + 1) % 6]
          gPos.push(c.x + a[0] * H2, c.y + a[1] * H2, c.z + a[2] * H2, c.x + b[0] * H2, c.y + b[1] * H2, c.z + b[2] * H2)
          gS.push(k, k + 1)
          gPhase.push(ph, ph)
        }
      }
      const glowGeo = new THREE.BufferGeometry()
      glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3))
      glowGeo.setAttribute('aS', new THREE.Float32BufferAttribute(gS, 1))
      glowGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(gPhase, 1))
      const glowMat = new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uGlow: { value: 0 }, uFar: { value: 22 }, uColor: { value: new THREE.Color(0xefefed) } },
      })
      scene.add(new THREE.LineSegments(glowGeo, glowMat))

      // words on the faces: front faces of the first layers (rows, like lines of a drawing), the tops of the
      // top layer (the wall seen from above) and a few sides, turned. One instanced plane per word.
      const FACES = {
        front: [new THREE.Vector3(0, 0, 1), new THREE.Euler(0, 0, 0)],
        top: [new THREE.Vector3(0, 1, 0), new THREE.Euler(-Math.PI / 2, 0, 0)],
        right: [new THREE.Vector3(1, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
        left: [new THREE.Vector3(-1, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
      }
      const near = (i, j, k, o) => Math.abs(i - o.i) + Math.abs(j - o.j) + Math.abs(k - (o.k ?? k)) === 0
      const spots = []
      for (let i = X[0]; i <= X[1]; i++) {
        for (let j = Y[0]; j <= Y[1]; j++) {
          for (let k = Z[0]; k <= Z[1]; k++) {
            const inPhrase = i === COL.i && j === COL.j && k >= -2
            const isTarget = near(i, j, k, TARGET)
            const nextToTarget = j === TARGET.j && Math.abs(i - TARGET.i) + Math.abs(k - TARGET.k) === 1
            if (k >= -3 && !inPhrase && rnd() < 0.6 - -k * 0.08) spots.push({ c: cell(i, j, k), face: 'front', spin: 0, delay: rnd(), tier: k === 0 ? 0.55 + rnd() * 0.45 : 0.25 + rnd() * 0.4 })
            if (j === 0 && !isTarget && rnd() < 0.62) spots.push({ c: cell(i, j, k), face: 'top', spin: rnd() < 0.8 ? 0 : Math.PI / 2, delay: rnd(), tier: 0.3 + rnd() * 0.7 })
            if (!isTarget && !nextToTarget && k >= -3 && rnd() < 0.05) spots.push({ c: cell(i, j, k), face: rnd() < 0.5 ? 'right' : 'left', spin: Math.PI / 2, delay: rnd(), tier: 0.2 + rnd() * 0.3 })
          }
        }
      }
      spots.forEach((s) => (s.k = Math.floor(rnd() * WORDS.length)))
      // the four walls of the target cube, facing in
      const INNER = [
        [new THREE.Vector3(H2 - 0.004, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
        [new THREE.Vector3(-H2 + 0.004, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
        [new THREE.Vector3(0, 0, H2 - 0.004), new THREE.Euler(0, Math.PI, 0)],
        [new THREE.Vector3(0, 0, -H2 + 0.004), new THREE.Euler(0, 0, 0)],
      ]

      const fieldTex = WORDS.map((w) => wordTexture(w))
      const wallTex = WALLS.map((w) => wordTexture(w, { weight: 500, px: 160, track: -0.03 }))
      const phraseTex = statement.map((w) => wordTexture(w, { weight: 400, px: 220, track: -0.045 }))
      const plane = new THREE.PlaneGeometry(1, 1)
      const wordMat = (t) => new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true })
      const groups = fieldTex.map((t, k) => {
        const list = spots.filter((s) => s.k === k)
        const mesh = new THREE.InstancedMesh(plane, wordMat(t), Math.max(1, list.length))
        mesh.count = list.length
        mesh.frustumCulled = false
        scene.add(mesh)
        return { t, list, mesh }
      })
      const walls = wallTex.map((t, i) => {
        const m = new THREE.Mesh(plane, wordMat(t))
        m.position.copy(target).add(INNER[i][0])
        m.rotation.copy(INNER[i][1])
        scene.add(m)
        return m
      })
      // the statement, front to back: the last line is the front word
      const phraseMeshes = phraseTex.map((t) => {
        const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, fog: true }))
        m.renderOrder = 2
        scene.add(m)
        return m
      })

      const dummy = new THREE.Object3D()
      const place = () => {
        for (const g of groups) {
          g.list.forEach((s, i) => {
            const [n, rot] = FACES[s.face]
            const h = Math.min(S * 0.2, (S * 0.8) / g.t.aspect)
            dummy.position.copy(s.c).addScaledVector(n, H2 + 0.004)
            dummy.rotation.copy(rot)
            if (s.spin) dummy.rotateZ(s.spin)
            dummy.scale.set(h * g.t.aspect, h, 1)
            dummy.updateMatrix()
            g.mesh.setMatrixAt(i, dummy.matrix)
            g.mesh.setColorAt(i, bg)
          })
          g.mesh.instanceMatrix.needsUpdate = true
          if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true
        }
        walls.forEach((m, i) => {
          const h = Math.min(S * 0.32, (S * 0.9) / wallTex[i].aspect)
          m.scale.set(h * wallTex[i].aspect, h, 1)
        })
      }

      // --- the camera ---------------------------------------------------------------------------------
      // C0: a long lens, straight on, placed so the front word (the hero's last line) lands on the front face
      // of its cube exactly where the page left it; the other two lines sit on the faces of the two cubes
      // behind, along their rays. Cm: on the line through the front and back words, a wide lens — from there
      // they fall onto each other. Then the orbit: from the front, a little to the right, up and over, rolling
      // until the camera looks straight down on the top of the block.
      const FOV0 = 9
      const FOVM = 42
      const look = (eye, at, up) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, at, up))
      const C0 = new THREE.Vector3()
      const P = statement.map(() => new THREE.Vector3())
      const Cm = new THREE.Vector3()
      const Cb = new THREE.Vector3()
      let qm = new THREE.Quaternion()
      const q0 = new THREE.Quaternion()
      const pivot0 = new THREE.Vector3()
      const pivot1 = target.clone().add(new THREE.Vector3(0, H2, 0))
      const R0 = 9
      const R1 = 9.5
      const orbit = (t, pos, quat) => {
        const pv = new THREE.Vector3().lerpVectors(pivot0, pivot1, smooth(t))
        const el = lerp(5, 90, t) * DEG
        const az = lerp(16, 0, smooth(t)) * DEG
        const r = lerp(R0, R1, t)
        pos.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(r).add(pv)
        // the roll grows with the climb: at the top the world's x points up the screen and the words stand up
        const roll = lerp(0, 90, smooth(t)) * DEG
        quat.copy(look(pos, pv, new THREE.Vector3(Math.sin(roll), Math.cos(roll), 0)))
      }
      const O1 = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }
      const inside = target.clone().add(new THREE.Vector3(0, H2 * 1.15, 0))

      let W = 1
      let H = 1
      const ray = new THREE.Vector3()
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        renderer.setSize(W, H, false)
        camera.aspect = W / H
        // where the page lays the statement out (the hero's last word a hair under the level line)
        const spans = [...measure.children]
        const fs = parseFloat(getComputedStyle(measure).fontSize)
        const box = stage.getBoundingClientRect()
        const lastTop = spans[spans.length - 1].getBoundingClientRect().top
        const dy = H / 2 + fs * 0.02 - (lastTop - box.top)
        const rects = spans.map((sp) => {
          const range = document.createRange()
          range.selectNodeContents(sp)
          const r = range.getBoundingClientRect()
          return { x: r.left - box.left + r.width / 2, y: r.top - box.top + dy + r.height / 2, h: r.height }
        })
        const tan0 = Math.tan((FOV0 * DEG) / 2)
        const dirOf = (rc) => ray.set(((rc.x - W / 2) / (H / 2)) * tan0, -((rc.y - H / 2) / (H / 2)) * tan0, -1)
        // the front word, on the front face of the front cube of the column, centred there
        const n = statement.length
        const front = n - 1
        const face0 = cell(COL.i, COL.j, 0).add(new THREE.Vector3(0, 0, H2 + 0.004))
        // distance chosen so the longest line still fits its cube face from this lens
        let D0 = 30
        statement.forEach((_, i) => {
          const back = front - i
          const wpx = (rects[i].h * phraseTex[i].aspect) / phraseTex[i].box
          const fit = (0.86 * S * H) / (2 * tan0 * wpx) - back * S
          D0 = Math.min(D0, fit)
        })
        D0 = Math.max(6, D0)
        C0.copy(face0).addScaledVector(dirOf(rects[front]), -D0)
        statement.forEach((_, i) => {
          const back = front - i
          const D = D0 + back * S
          P[i].copy(C0).addScaledVector(dirOf(rects[i]), D)
          const wpp = (2 * D * tan0) / H
          const h = rects[i].h * phraseTex[i].box * wpp
          phraseMeshes[i].position.copy(P[i])
          phraseMeshes[i].scale.set(h * phraseTex[i].aspect, h, 1)
        })
        const u = P[0].clone().sub(P[front]).normalize()
        Cm.copy(P[front]).addScaledVector(u, -5)
        qm = look(Cm, P[0], new THREE.Vector3(0, 1, 0))
        // straight back along the same line: the three stay one on top of the other while the block opens
        Cb.copy(P[front]).addScaledVector(u, -9)
        pivot0.copy(P[front]).setZ(H2)
        orbit(1, O1.pos, O1.quat)
        dirty = true
      }

      const colours = () => {
        const cs = getComputedStyle(stage)
        bg.set(cs.getPropertyValue('--datum-ink').trim() || '#101010')
        fg.set(cs.getPropertyValue('--datum-paper').trim() || '#efefed')
        renderer.setClearColor(bg, 1)
        fog.color.copy(bg)
        lineMat.color.copy(fg)
        glowMat.uniforms.uColor.value.copy(fg)
        tint(lastQ)
        dirty = true
      }

      // brightness of every word for the scroll position: a mix from the background to the paper colour
      const col = new THREE.Color()
      const tint = (q) => {
        const front = statement.length - 1
        const come = seg(q, 0.004, 0.03)
        const bright = seg(q, 0.035, 0.06)
        const merge = seg(q, 0.07, 0.16)
        phraseMeshes.forEach((m, i) => {
          const back = front - i
          // the front word is the hero's, at full strength from the first frame; the other two come back faintly,
          // brighten, then settle by depth as they slide behind it
          const k = back === 0 ? lerp(1, 0.95, merge) : come * lerp(lerp(0.32, 0.72, bright), back === 1 ? 0.5 : 0.32, merge)
          m.material.color.copy(bg).lerp(fg, k)
          m.visible = k > 0.002
        })
        for (const g of groups) {
          g.list.forEach((s, i) => {
            const a = seg(q, 0.1 + s.delay * 0.12, 0.14 + s.delay * 0.12)
            g.mesh.setColorAt(i, col.copy(bg).lerp(fg, a * s.tier))
          })
          if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true
        }
        const w = seg(q, 0.42, 0.56)
        walls.forEach((m) => m.material.color.copy(bg).lerp(fg, w))
      }

      // --- scroll → camera, words, window, states ----------------------------------------------------
      const base = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: FOVM, tilt: 1 }
      let lastQ = 0
      let dirty = true
      const tmpQ = new THREE.Quaternion()
      const apply = (q) => {
        lastQ = q
        dirty = true
        // 1 · the long lens widens and the camera moves onto the words' line: they slide into each other
        const m = ease(seg(q, 0.06, 0.18))
        // 2 · back a little and to the right, looking left at the block
        const b = smooth(seg(q, 0.18, 0.25))
        // 3 · up and over, rolling, slowly, until straight down on the top
        const o = seg(q, 0.25, 0.56)
        // 4 · down into the cube
        const d = smooth(seg(q, 0.58, 0.7))
        if (b <= 0) {
          base.pos.copy(C0).lerp(Cm, m)
          base.quat.copy(q0).slerp(qm, m)
          base.fov = lerp(FOV0, FOVM, m)
        } else if (o <= 0) {
          base.pos.copy(Cm).lerp(Cb, b)
          base.quat.copy(qm)
          base.fov = FOVM
        } else if (d <= 0) {
          // from that line into the orbit (from the front, a little to the right, looking left), then up
          orbit(smooth(o), base.pos, base.quat)
          const w = smooth(seg(o, 0, 0.22))
          base.pos.lerpVectors(Cb, base.pos, w)
          // (slerp from a copy: slerpQuaternions(qm, base.quat) would overwrite base.quat before reading it)
          base.quat.copy(tmpQ.copy(qm).slerp(base.quat, w))
          base.fov = FOVM
        } else {
          base.pos.copy(O1.pos).lerp(inside, d)
          base.quat.copy(O1.quat)
          base.fov = FOVM
        }
        // the pointer tilts the camera until it is over the cube (then the floor has to stay square)
        base.tilt = 1 - seg(q, 0.52, 0.57)
        // the dark gives way as the lens widens: the block comes out across the whole screen
        const f = seg(q, 0.07, 0.2)
        fog.near = lerp(40, 3, f)
        fog.far = lerp(90, lerp(15, 21, seg(q, 0.3, 0.5)), f)
        lineMat.opacity = seg(q, 0.08, 0.2) * 0.13
        glowMat.uniforms.uGlow.value = seg(q, 0.14, 0.22) * (1 - seg(q, 0.62, 0.7))
        level.style.opacity = String(0.6 * (1 - seg(q, 0.005, 0.05)))
        tint(q)

        // three states over the open floor
        const s = q < 0.78 ? -1 : q < 0.855 ? 0 : q < 0.93 ? 1 : 2
        stateEls.forEach((n, i) => (i === s ? (n.dataset.on = '') : delete n.dataset.on))
        plans.forEach((n, i) => (i === Math.max(0, s) ? (n.dataset.on = '') : delete n.dataset.on))
        if (s >= 0) {
          count.dataset.on = ''
          countN.textContent = String(s + 1).padStart(2, '0')
        } else delete count.dataset.on
      }

      // the floor of the target cube, projected: the window (the picture) sits exactly on it, then opens
      const floor = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => target.clone().add(new THREE.Vector3(sx * H2, -H2, sz * H2))))
      const v = new THREE.Vector3()
      const frameWindow = () => {
        const q = lastQ
        const shown = seg(q, 0.57, 0.61)
        if (shown <= 0) {
          win.style.opacity = '0'
          canvas.style.opacity = '1'
          return
        }
        let x0 = Infinity
        let y0 = Infinity
        let x1 = -Infinity
        let y1 = -Infinity
        for (const c of floor) {
          v.copy(c).project(camera)
          const sx = ((v.x + 1) / 2) * W
          const sy = ((1 - v.y) / 2) * H
          x0 = Math.min(x0, sx)
          x1 = Math.max(x1, sx)
          y0 = Math.min(y0, sy)
          y1 = Math.max(y1, sy)
        }
        const open = ease(seg(q, 0.7, 0.77))
        win.style.transform = `translate3d(${lerp(x0, 0, open)}px, ${lerp(y0, 0, open)}px, 0)`
        win.style.width = `${Math.max(0, lerp(x1 - x0, W, open))}px`
        win.style.height = `${Math.max(0, lerp(y1 - y0, H, open))}px`
        win.style.opacity = String(shown)
        canvas.style.opacity = String(1 - open)
      }

      // --- the loop: camera = scroll pose + a little of the pointer; light on the edges ------------------
      const pointer = trackPointer()
      const sp = { x: 0, y: 0 }
      const euler = new THREE.Euler()
      let raf = 0
      let visible = false
      let prev = performance.now()
      const loop = (now) => {
        raf = requestAnimationFrame(loop)
        const dt = now - prev
        prev = now
        if (!visible) return
        sp.x += (pointer.x - sp.x) * 0.05
        sp.y += (pointer.y - sp.y) * 0.05
        const moving = Math.abs(pointer.x - sp.x) + Math.abs(pointer.y - sp.y) > 0.0005
        if (!(lastQ < 0.78 || dirty || moving)) return
        camera.position.copy(base.pos)
        // the pointer turns the view a little; with the long lens of the first frames a little goes a long way
        const k = (base.tilt * base.fov) / FOVM
        euler.set(-sp.y * 0.05 * k, -sp.x * 0.075 * k, 0)
        camera.quaternion.copy(base.quat).multiply(tmpQ.setFromEuler(euler))
        if (camera.fov !== base.fov) {
          camera.fov = base.fov
          camera.updateProjectionMatrix()
        }
        camera.updateMatrixWorld()
        glowMat.uniforms.uTime.value = now / 1000
        frameWindow()
        if (lastQ < 0.79) {
          renderer.render(scene, camera)
          budget.tick(dt)
        }
        dirty = false
      }
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' })
      io.observe(el)
      const mo = new MutationObserver(() => setTimeout(colours, 650))
      const world = el.closest('.datum-world')
      if (world) mo.observe(world, { attributes: true, attributeFilter: ['data-theme'] })

      const refit = () => {
        layout()
        apply(lastQ)
      }
      // the words are painted in the page's face: if it has not arrived yet, they are painted again when it does
      Promise.all([document.fonts?.load("500 140px 'Inter Tight'"), document.fonts?.load("400 220px 'Inter Tight'")]).then(() => {
        ;[...fieldTex, ...wallTex, ...phraseTex].forEach((t) => t.draw())
        place()
        refit()
      })
      place()
      layout()
      colours()
      apply(0)
      raf = requestAnimationFrame(loop)
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (self.progress > 0) el.dataset.live = ''
          else delete el.dataset.live
          apply(self.progress)
        },
        onRefresh: (self) => {
          if (self.progress > 0) el.dataset.live = ''
        },
      })
      const ro = new ResizeObserver(refit)
      ro.observe(stage)
      return () => {
        cancelAnimationFrame(raf)
        pointer.dispose()
        st.kill()
        ro.disconnect()
        io.disconnect()
        mo.disconnect()
        renderer.dispose()
        ;[lineGeo, plane, glowGeo].forEach((g) => g.dispose())
        ;[lineMat, glowMat].forEach((mt) => mt.dispose())
        groups.forEach((g) => g.mesh.material.dispose())
        ;[...walls, ...phraseMeshes].forEach((mesh) => mesh.material.dispose())
        ;[...fieldTex, ...wallTex, ...phraseTex].forEach((t) => t.tex.dispose())
      }
    },
    { scope: root },
  )

  const split = (t) =>
    t.split(' ').map((w, i) => (
      // the space goes between the spans: inside an inline-block it collapses and the words run together
      <Fragment key={i}>
        <span className="dp-w" style={{ '--i': i }}>
          {w}
        </span>{' '}
      </Fragment>
    ))

  return (
    <section ref={root} id="practice" className="dp" aria-label={label}>
      <style>{CSS}</style>
      <div data-stage="" className="dp-stage">
        <canvas className="dp-canvas" aria-hidden="true" />
        <h2 data-measure="" className="dp-measure" aria-hidden="true">
          {statement.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h2>
        <div data-window="" className="dp-window" aria-hidden="true" style={{ opacity: 0 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} data-plan="" className="dp-plan">
              <Plan kind={k} />
            </div>
          ))}
        </div>
        <div className="dp-sheet" aria-hidden="true">
          {/* the same two lines as the hero (it measures them on the name and writes the variables), and its
              level datum, which fades as the block comes out of the dark */}
          <i className="dp-col" style={{ left: 'var(--datum-l1, 12.5%)' }} />
          <i className="dp-col" style={{ left: 'var(--datum-l2, 50%)' }} />
          <i data-level="" className="dp-level" />
        </div>
        {states.map((s, i) => (
          <div key={s.title} data-state="" className="dp-state">
            <h2 className="dp-title">{split(s.title)}</h2>
            <p className="dp-text">{split(s.text)}</p>
            <span className="sr-only">{`${String(i + 1).padStart(2, '0')} / ${String(states.length).padStart(2, '0')}`}</span>
          </div>
        ))}
        <p data-count="" className="dp-count" aria-hidden="true">
          <span>{label}</span>
          <span>
            <b>01</b> / {String(states.length).padStart(2, '0')}
          </span>
        </p>
      </div>
    </section>
  )
}
