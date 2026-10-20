import { Fragment, useRef } from 'react'
import * as THREE from 'three'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget, trackPointer } from '../../../lib/motion'

/**
 * PracticeDatum — what the practice stands for: one long shot through a solid block of cubes.
 *
 * It starts on the black the hero ends with: it overlaps the hero's last screen and only shows once it is
 * pinned, and its first frame has the hero's last word («a wall.») in 3D, exactly where the page left it
 * (it measures a copy of the hero's statement laid out with the same rules). The other two lines come back
 * above it, also in 3D (the pointer moves them): the three sit on the front faces of three cubes one
 * behind the other, seen from a little below, so the nearest reads on top. The camera only climbs: level
 * with them they fall onto each other — no zoom, the front one keeps its size and the others shrink behind
 * it — while the block comes out of the dark across the whole screen, words on its faces, light running
 * along a few edges. On up over the rows (looking a little to the left), rolling, slowly, until it looks
 * straight down on the block. Then the nine columns around a shaft rise out of the block, faster than the
 * rest, and pass the camera: it is inside the shaft, words on its walls, and the picture at the bottom
 * comes up to fill the screen and carries three states — Weight, Light, Time — with the counter 01 / 03.
 *
 * Colours come from the page (`--datum-ink` / `--datum-paper`), so «Invert drawing» turns this over too.
 * Reduced motion: no canvas and no pin; the three states one under the other.
 */
const CSS = `
.dp { position: relative; height: 1400svh; margin-top: -100svh; background: var(--datum-ink); color: var(--datum-paper); }
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
      const FOV = 40
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 120)
      const fog = new THREE.Fog(0x101010, 5, 21)
      scene.fog = fog
      const bg = new THREE.Color(0x101010)
      const fg = new THREE.Color(0xefefed)

      // --- the block -----------------------------------------------------------------------------------
      // Packed cubes (they touch). The top layer is y = 0, the front row z = 0. Around the cube the camera
      // ends in stands a 3 × 3 tower (the column in the middle is empty all the way down: a shaft, its walls
      // carrying words, the picture at the bottom); late in the shot the tower rises out of the block, faster
      // than the rest, and passes the camera.
      const S = 1.6
      const H2 = S / 2
      const X = [-6, 6]
      const Y = [-2, 0]
      const Z = [-12, 0]
      const T = { i: 0, k: -6 } // the shaft
      const cellPos = (i, j, k) => new THREE.Vector3(i * S, j * S, k * S)
      const inShaft = (i, k) => i === T.i && k === T.k
      const inTower = (i, k) => Math.abs(i - T.i) <= 1 && Math.abs(k - T.k) <= 1 && !inShaft(i, k)
      const shaftTop = cellPos(T.i, 0, T.k).add(new THREE.Vector3(0, H2, 0))
      const floorY = Y[0] * S - H2

      const still = new THREE.Group() // the block
      const tower = new THREE.Group() // the nine columns that rise
      scene.add(still, tower)

      // the edges of a set of cubes, each shared edge once
      const edgesOf = (cells) => {
        const seen = new Set()
        const pos = []
        const add = (key, a, b) => {
          if (seen.has(key)) return
          seen.add(key)
          pos.push(...a, ...b)
        }
        for (const [i, j, k] of cells) {
          const x0 = i * S - H2
          const x1 = i * S + H2
          const y0 = j * S - H2
          const y1 = j * S + H2
          const z0 = k * S - H2
          const z1 = k * S + H2
          for (const [y, sy] of [
            [y0, 2 * j - 1],
            [y1, 2 * j + 1],
          ]) {
            for (const [z, sz] of [
              [z0, 2 * k - 1],
              [z1, 2 * k + 1],
            ]) add(`x${i},${sy},${sz}`, [x0, y, z], [x1, y, z])
          }
          for (const [x, sx] of [
            [x0, 2 * i - 1],
            [x1, 2 * i + 1],
          ]) {
            for (const [z, sz] of [
              [z0, 2 * k - 1],
              [z1, 2 * k + 1],
            ]) add(`y${sx},${j},${sz}`, [x, y0, z], [x, y1, z])
            for (const [y, sy] of [
              [y0, 2 * j - 1],
              [y1, 2 * j + 1],
            ]) add(`z${sx},${sy},${k}`, [x, y, z0], [x, y, z1])
          }
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        return g
      }
      const stillCells = []
      const towerCells = []
      for (let i = X[0]; i <= X[1]; i++) {
        for (let j = Y[0]; j <= Y[1]; j++) {
          for (let k = Z[0]; k <= Z[1]; k++) {
            if (inShaft(i, k)) continue
            ;(inTower(i, k) ? towerCells : stillCells).push([i, j, k])
          }
        }
      }
      const lineMat = new THREE.LineBasicMaterial({ color: 0xefefed, transparent: true, opacity: 0, fog: true, depthWrite: false })
      const stillLines = edgesOf(stillCells)
      const towerLines = edgesOf(towerCells)
      still.add(new THREE.LineSegments(stillLines, lineMat))
      tower.add(new THREE.LineSegments(towerLines, lineMat))

      let seed = 23
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

      // light running along the edges of a few cubes of the top layer
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
      for (let n = 0; n < 30; n++) {
        const i = Math.round(lerp(X[0], X[1], rnd()))
        const k = Math.round(lerp(Z[0], Z[1], rnd()))
        if (inShaft(i, k) || inTower(i, k)) continue
        const c = cellPos(i, n % 3 === 0 ? -1 : 0, k)
        const ph = rnd()
        for (let e = 0; e < 6; e++) {
          const a = LOOP[e]
          const b = LOOP[(e + 1) % 6]
          gPos.push(c.x + a[0] * H2, c.y + a[1] * H2, c.z + a[2] * H2, c.x + b[0] * H2, c.y + b[1] * H2, c.z + b[2] * H2)
          gS.push(e, e + 1)
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
        uniforms: { uTime: { value: 0 }, uGlow: { value: 0 }, uFar: { value: 21 }, uColor: { value: new THREE.Color(0xefefed) } },
      })
      still.add(new THREE.LineSegments(glowGeo, glowMat))

      // words on the faces. Front faces of the first rows of the top layers (rows of words, like the lines of a
      // drawing), the tops of the top layer, a few sides; the shaft's walls inside the tower.
      const FACES = {
        front: [new THREE.Vector3(0, 0, 1), new THREE.Euler(0, 0, 0)],
        top: [new THREE.Vector3(0, 1, 0), new THREE.Euler(-Math.PI / 2, 0, 0)],
        right: [new THREE.Vector3(1, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
        left: [new THREE.Vector3(-1, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
        back: [new THREE.Vector3(0, 0, -1), new THREE.Euler(0, Math.PI, 0)],
      }
      const stillSpots = []
      const towerSpots = []
      for (let i = X[0]; i <= X[1]; i++) {
        for (let j = Y[0]; j <= Y[1]; j++) {
          for (let k = Z[0]; k <= Z[1]; k++) {
            if (inShaft(i, k)) continue
            const list = inTower(i, k) ? towerSpots : stillSpots
            const c = cellPos(i, j, k)
            const phraseCell = i === 0 && j === 0 && k >= -2
            if (!inTower(i, k) && !phraseCell && j >= -1 && rnd() < (j === 0 ? 0.55 : 0.3)) {
              list.push({ c, face: 'front', spin: 0, delay: rnd(), tier: j === 0 ? 0.45 + rnd() * 0.55 : 0.2 + rnd() * 0.3 })
            }
            if (j === 0 && rnd() < 0.55) list.push({ c, face: 'top', spin: rnd() < 0.75 ? 0 : Math.PI / 2, delay: rnd(), tier: 0.3 + rnd() * 0.6 })
            if (!inTower(i, k) && j >= -1 && rnd() < 0.05) list.push({ c, face: rnd() < 0.5 ? 'right' : 'left', spin: Math.PI / 2, delay: rnd(), tier: 0.2 + rnd() * 0.3 })
            // the shaft's walls: the faces of the tower that look into it, one word each, every layer
            if (inTower(i, k)) {
              const di = T.i - i
              const dk = T.k - k
              if (Math.abs(di) + Math.abs(dk) === 1) {
                const face = di === 1 ? 'right' : di === -1 ? 'left' : dk === 1 ? 'front' : 'back'
                list.push({ c, face, spin: 0, delay: rnd(), tier: 1, wall: true })
              }
            }
          }
        }
      }
      ;[...stillSpots, ...towerSpots].forEach((s) => (s.k = s.wall ? WORDS.length + Math.floor(rnd() * WALLS.length) : Math.floor(rnd() * WORDS.length)))

      const allTex = [...WORDS.map((w) => wordTexture(w)), ...WALLS.map((w) => wordTexture(w, { weight: 500, px: 160, track: -0.03 }))]
      const phraseTex = statement.map((w) => wordTexture(w, { weight: 400, px: 220, track: -0.045 }))
      const plane = new THREE.PlaneGeometry(1, 1)
      const wordMat = (t) => new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true })
      const makeGroups = (spots, parent) =>
        allTex.map((t, k) => {
          const list = spots.filter((s) => s.k === k)
          const mesh = new THREE.InstancedMesh(plane, wordMat(t), Math.max(1, list.length))
          mesh.count = list.length
          mesh.frustumCulled = false
          parent.add(mesh)
          return { t, list, mesh }
        })
      const groups = [...makeGroups(stillSpots, still), ...makeGroups(towerSpots, tower)]
      // the statement: line i on the front face of the cube i rows back, in the column x = 0 of the top layer
      const phraseMeshes = phraseTex.map((t) => {
        const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, fog: true }))
        m.renderOrder = 2
        still.add(m)
        return m
      })

      const dummy = new THREE.Object3D()
      const place = () => {
        for (const g of groups) {
          g.list.forEach((s, i) => {
            const [n, rot] = FACES[s.face]
            // (a wall of the shaft is the face of a tower cube that looks into it: its normal points into the shaft)
            const big = s.wall ? 0.34 : 0.2
            const h = Math.min(S * big, (S * (s.wall ? 0.9 : 0.8)) / g.t.aspect)
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
      }

      // --- the camera ---------------------------------------------------------------------------------
      // C0: a little below the words and looking up at them, so the nearest («Every line») reads on top and
      // the farthest («a wall.», the hero's word) at the bottom — each placed on its face along the ray through
      // where the page laid it out, sized to read alike. Cm: level with them, on their line: they fall onto
      // each other, the back ones shrinking to their true size behind the front one. Then the camera only
      // climbs: over the rows, rolling, until it looks straight down on the block.
      const look = (eye, at, up) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, at, up))
      const XAXIS = new THREE.Vector3(1, 0, 0)
      const C0 = new THREE.Vector3()
      const q0 = new THREE.Quaternion()
      const Cm = new THREE.Vector3()
      let qm = new THREE.Quaternion()
      const P = statement.map(() => new THREE.Vector3())
      const scale0 = statement.map(() => new THREE.Vector2(1, 1))
      const scale1 = statement.map(() => new THREE.Vector2(1, 1))
      // the orbit looks first at the rows just behind the words, then moves its eye to the shaft
      const pivotA = new THREE.Vector3(0, -0.6, -2 * S)
      const pivot = new THREE.Vector3()
      const EL0 = 30
      const AZ0 = 14
      const R0 = 7
      const R1 = 8
      const orbit = (t, pos, quat) => {
        pivot.lerpVectors(pivotA, shaftTop, smooth(t))
        const el = lerp(EL0, 90, t) * DEG
        const az = lerp(AZ0, 0, smooth(t)) * DEG
        const r = lerp(R0, R1, t)
        pos.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(r).add(pivot)
        // the roll grows with the climb: at the top the world's x points up the screen and the words stand up
        const roll = lerp(0, 90, smooth(t)) * DEG
        quat.copy(look(pos, pivot, new THREE.Vector3(Math.sin(roll), Math.cos(roll), 0)))
      }
      const O0 = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }
      const O1 = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }
      orbit(0, O0.pos, O0.quat)
      orbit(1, O1.pos, O1.quat)

      let W = 1
      let H = 1
      const ray = new THREE.Vector3()
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        renderer.setSize(W, H, false)
        camera.aspect = W / H
        camera.fov = FOV
        camera.updateProjectionMatrix()
        // where the page lays the statement out (the hero's last word just under the level line)
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
        const tanH = Math.tan((FOV * DEG) / 2)
        const rayAt = (rc, pitch) => ray.set(((rc.x - W / 2) / (H / 2)) * tanH, -((rc.y - H / 2) / (H / 2)) * tanH, -1).applyAxisAngle(XAXIS, pitch)
        const n = statement.length
        const faceZ = (i) => -i * S + H2 + 0.004
        const zc = faceZ(0) + 3.4
        // the pitch at which the first and the last line both land at the height of their faces (y = 0)
        const miss = (pitch) => {
          const r0 = rayAt(rects[0], pitch).clone()
          const t0 = (faceZ(0) - zc) / r0.z
          const y0 = -t0 * r0.y
          const r2 = rayAt(rects[n - 1], pitch)
          const t2 = (faceZ(n - 1) - zc) / r2.z
          return { y0, err: y0 + t2 * r2.y }
        }
        let lo = -0.2
        let hi = 0.8
        let pitch = 0.16
        if (Math.sign(miss(lo).err) !== Math.sign(miss(hi).err)) {
          for (let it = 0; it < 40; it++) {
            const mid = (lo + hi) / 2
            if (Math.sign(miss(mid).err) === Math.sign(miss(lo).err)) lo = mid
            else hi = mid
          }
          pitch = (lo + hi) / 2
        }
        const y0 = miss(pitch).y0
        q0.setFromAxisAngle(XAXIS, pitch)
        C0.set(0, y0, zc)
        const ts = rects.map((rc, i) => {
          const r = rayAt(rc, pitch)
          return [r.clone(), (faceZ(i) - zc) / r.z]
        })
        // centre the column on the middle line
        const mid = ts[Math.floor(n / 2)]
        C0.x = -mid[0].x * mid[1]
        statement.forEach((_, i) => {
          const [r, t] = ts[i]
          P[i].copy(C0).addScaledVector(r, t)
          // depth along the view is t (the ray has −1 on the camera's own z)
          const wpp = (2 * t * tanH) / H
          const h = rects[i].h * phraseTex[i].box * wpp
          scale0[i].set(h * phraseTex[i].aspect, h)
        })
        // their true size: all as the front one is
        statement.forEach((_, i) => scale1[i].copy(scale0[0]).multiplyScalar(phraseTex[i].aspect / phraseTex[0].aspect).setY(scale0[0].y))
        // as far from the front word as the first camera was: it keeps its size while the others fall behind it
        const dir = P[0].clone().sub(P[n - 1]).normalize()
        Cm.copy(P[0]).addScaledVector(dir, P[0].distanceTo(C0))
        qm = look(Cm, P[n - 1], new THREE.Vector3(0, 1, 0))
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
        const n = statement.length
        const come = seg(q, 0.0, 0.02)
        const merge = seg(q, 0.02, 0.07)
        phraseMeshes.forEach((m, i) => {
          // the hero's word is there from the first frame; the other two come back, a little dimmer; once they
          // fall into line the front one is the whitest
          const start = i === n - 1 ? 1 : lerp(0, 0.78, come)
          const end = i === 0 ? 1 : i === n - 1 ? 0.42 : 0.6
          const k = lerp(start, end, merge)
          m.material.color.copy(bg).lerp(fg, k)
          m.visible = k > 0.002
        })
        for (const g of groups) {
          g.list.forEach((s, i) => {
            const a = s.wall ? seg(q, 0.36, 0.46) : seg(q, 0.04 + s.delay * 0.08, 0.07 + s.delay * 0.08)
            g.mesh.setColorAt(i, col.copy(bg).lerp(fg, a * s.tier))
          })
          if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true
        }
      }

      // --- scroll → camera, block, window, states ----------------------------------------------------
      const base = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), tilt: 1 }
      let lastQ = 0
      let dirty = true
      let rise = 0
      const tmpQ = new THREE.Quaternion()
      const apply = (q) => {
        lastQ = q
        dirty = true
        // 1 · up to the words' level: they fall into line (no zoom: the front one keeps its size)
        const m = ease(seg(q, 0.004, 0.07))
        // 2 · on up over the rows, looking down at them and a little to the left
        const b = smooth(seg(q, 0.07, 0.13))
        // 3 · climbing and rolling until straight down on the block
        const o = seg(q, 0.13, 0.36)
        if (b <= 0) {
          base.pos.copy(C0).lerp(Cm, m)
          base.quat.copy(tmpQ.copy(q0).slerp(qm, m))
        } else if (o <= 0) {
          base.pos.copy(Cm).lerp(O0.pos, b)
          base.quat.copy(tmpQ.copy(qm).slerp(O0.quat, b))
        } else {
          orbit(o - Math.sin(o * 2 * Math.PI) / (2 * Math.PI), base.pos, base.quat)
        }
        phraseMeshes.forEach((mesh, i) => {
          mesh.position.copy(P[i])
          mesh.scale.set(lerp(scale0[i].x, scale1[i].x, m), lerp(scale0[i].y, scale1[i].y, m), 1)
        })
        // 4 · from above, the nine columns around the shaft rise out of the block, faster than the rest, and
        // pass the camera: it is inside the shaft, its walls go by, the picture at the bottom comes up to fill
        // the screen
        const camY = O1.pos.y
        // (the floor fills the screen's height when it is H2 / tan(fov / 2) below the camera)
        const lift = camY - H2 / Math.tan((FOV * DEG) / 2) - floorY
        rise = 3 * smooth(seg(q, 0.38, 0.45)) + (lift - 3) * ease(seg(q, 0.45, 0.62))
        tower.position.y = rise
        still.position.y = 0.9 * smooth(seg(q, 0.38, 0.5))
        base.tilt = 1 - seg(q, 0.34, 0.38)
        lineMat.opacity = seg(q, 0.03, 0.09) * 0.16
        glowMat.uniforms.uGlow.value = seg(q, 0.07, 0.13) * (1 - seg(q, 0.5, 0.58))
        level.style.opacity = String(0.6 * (1 - seg(q, 0.002, 0.03)))
        tint(q)

        // three states over the open floor
        const s = q < 0.68 ? -1 : q < 0.785 ? 0 : q < 0.89 ? 1 : 2
        stateEls.forEach((nd, i) => (i === s ? (nd.dataset.on = '') : delete nd.dataset.on))
        plans.forEach((nd, i) => (i === Math.max(0, s) ? (nd.dataset.on = '') : delete nd.dataset.on))
        if (s >= 0) {
          count.dataset.on = ''
          countN.textContent = String(s + 1).padStart(2, '0')
        } else delete count.dataset.on
      }

      // the floor of the shaft, projected: the window (the picture) sits exactly on it, then opens
      const corner = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [T.i * S + sx * H2, T.k * S + sz * H2]))
      const v = new THREE.Vector3()
      const frameWindow = () => {
        const q = lastQ
        const shown = seg(q, 0.42, 0.54)
        if (shown <= 0) {
          win.style.opacity = '0'
          canvas.style.opacity = '1'
          return
        }
        let x0 = Infinity
        let y0 = Infinity
        let x1 = -Infinity
        let y1 = -Infinity
        for (const [cx, cz] of corner) {
          v.set(cx, floorY + rise, cz).project(camera)
          const sx = ((v.x + 1) / 2) * W
          const sy = ((1 - v.y) / 2) * H
          x0 = Math.min(x0, sx)
          x1 = Math.max(x1, sx)
          y0 = Math.min(y0, sy)
          y1 = Math.max(y1, sy)
        }
        const open = ease(seg(q, 0.61, 0.67))
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
        if (!(lastQ < 0.68 || dirty || moving)) return
        camera.position.copy(base.pos)
        euler.set(-sp.y * 0.045 * base.tilt, -sp.x * 0.07 * base.tilt, 0)
        camera.quaternion.copy(base.quat).multiply(tmpQ.setFromEuler(euler))
        camera.updateMatrixWorld()
        glowMat.uniforms.uTime.value = now / 1000
        frameWindow()
        if (lastQ < 0.68) {
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
        ;[...allTex, ...phraseTex].forEach((t) => t.draw())
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
        ;[stillLines, towerLines, plane, glowGeo].forEach((g) => g.dispose())
        ;[lineMat, glowMat].forEach((mt) => mt.dispose())
        groups.forEach((g) => g.mesh.material.dispose())
        phraseMeshes.forEach((mesh) => mesh.material.dispose())
        ;[...allTex, ...phraseTex].forEach((t) => t.tex.dispose())
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
