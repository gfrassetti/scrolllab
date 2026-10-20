import { Fragment, useRef } from 'react'
import * as THREE from 'three'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget, trackPointer } from '../../../lib/motion'

/**
 * PracticeDatum — what the practice stands for: one long shot through a field of hairline cubes.
 *
 * It starts on the black the hero ends with (it overlaps the hero's last screen and only shows once it is
 * pinned, so there is no seam): three words come up stacked like a sentence. They are not text on the
 * page — they float at three depths, sized so that from the first camera they read as one block. The
 * camera moves and they slide into each other, the nearest whitest. The cubes come out of the dark, more
 * words appear on their faces and light runs along the edges of a few. The camera rises and rolls until
 * it looks straight down, then sinks into one cube whose four walls carry a word each; its floor is the
 * picture, which opens to the whole screen and carries three states — Weight, Light, Time — with the
 * counter 01 / 03. The pointer (or the finger) tilts the camera a little, so the field answers.
 *
 * Colours come from the page (`--datum-ink` / `--datum-paper`), so «Invert drawing» turns this over too.
 * Reduced motion: no canvas and no pin; the three states one under the other.
 */
const CSS = `
.dp { position: relative; height: 900svh; margin-top: -100svh; background: var(--datum-ink); color: var(--datum-paper); }
.dp-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-ink); }
/* until it pins, the hero's last screen is what shows (the same black, the same lines) */
.dp:not([data-live]) .dp-stage { visibility: hidden; }
.dp:not([data-live]) { background: transparent; }
.dp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
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

// the vocabulary on the faces of the field, and on the four walls of the cube the camera goes into
const WORDS = ['Line', 'Wall', 'Room', 'Measure', 'Shadow', 'Threshold', 'Section', 'Grain', 'Plane', 'Axis', 'Datum', 'Void']
const WALLS = ['Weight', 'Light', 'Time', 'Place']
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

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
 * A word as a texture, white on transparent (the material tints it). The canvas fits the word, so `aspect`
 * is the plane's width / height; the text box is 1.25 × the font size, as on the page. `draw` repaints it
 * once the font is in.
 */
function wordTexture(text, { weight = 500, px = 140, track = -0.01 } = {}) {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  const font = `${weight} ${px}px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif`
  const out = { tex, aspect: 3 }
  const setFont = () => {
    g.font = font
    if ('letterSpacing' in g) g.letterSpacing = `${track * px}px`
  }
  out.draw = () => {
    setFont()
    const w = Math.ceil(g.measureText(text).width + px * 0.16)
    const h = Math.ceil(px * 1.25)
    if (c.width !== w || c.height !== h) {
      tex.dispose() // a new size needs a new GPU texture
      c.width = w
      c.height = h
      setFont()
    } else g.clearRect(0, 0, w, h)
    g.fillStyle = '#fff'
    g.textBaseline = 'middle'
    g.fillText(text, px * 0.08, h * 0.54)
    out.aspect = w / h
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
  float head = fract(uTime * 0.11 + vPhase) * 6.0;
  float d = mod(head - vS + 6.0, 6.0);
  float a = (1.0 - smoothstep(0.0, 1.3, d)) * (1.0 - smoothstep(uFar * 0.45, uFar, vDepth));
  gl_FragColor = vec4(uColor, a * uGlow);
}`

export default function PracticeDatum({
  label = 'Our practice',
  phrase = ['Walls', 'Hold', 'Light'],
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
      const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80)
      const fog = new THREE.Fog(0x101010, 3, 15)
      scene.fog = fog
      const bg = new THREE.Color(0x101010)
      const fg = new THREE.Color(0xefefed)

      // --- the field: two layers of cubes, 9 × 8 each ------------------------------------------------
      const STEP = 2.4
      const SIZE = 1.6
      const HALF = SIZE / 2
      const target = new THREE.Vector3(0, 0, -STEP) // the cube the camera goes into
      let seed = 11
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      const cubes = []
      for (let y = 0; y >= -1; y--) for (let x = -4; x <= 4; x++) for (let z = -7; z <= 0; z++) cubes.push(new THREE.Vector3(x * STEP, y * STEP, z * STEP))
      const isTarget = (c) => c.distanceToSquared(target) < 0.01

      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE))
      const ep = edges.attributes.position.array
      const all = []
      for (const c of cubes) for (let i = 0; i < ep.length; i += 3) all.push(ep[i] + c.x, ep[i + 1] + c.y, ep[i + 2] + c.z)
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(all, 3))
      const lineMat = new THREE.LineBasicMaterial({ color: 0xefefed, transparent: true, opacity: 0, fog: true, depthWrite: false })
      scene.add(new THREE.LineSegments(lineGeo, lineMat))

      // light along the edges of a few cubes
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
      const lit = cubes.filter((c) => !isTarget(c) && c.y === 0 && rnd() < 0.2)
      for (const c of lit) {
        const ph = rnd()
        for (let k = 0; k < 6; k++) {
          const a = LOOP[k]
          const b = LOOP[(k + 1) % 6]
          gPos.push(c.x + a[0] * HALF, c.y + a[1] * HALF, c.z + a[2] * HALF, c.x + b[0] * HALF, c.y + b[1] * HALF, c.z + b[2] * HALF)
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
        uniforms: { uTime: { value: 0 }, uGlow: { value: 0 }, uFar: { value: 15 }, uColor: { value: new THREE.Color(0xefefed) } },
      })
      scene.add(new THREE.LineSegments(glowGeo, glowMat))

      // words on the faces: one instanced plane per word, each instance with its own brightness
      const FACES = {
        front: [new THREE.Vector3(0, 0, 1), new THREE.Euler(0, 0, 0)],
        back: [new THREE.Vector3(0, 0, -1), new THREE.Euler(0, Math.PI, 0)],
        right: [new THREE.Vector3(1, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
        left: [new THREE.Vector3(-1, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
        top: [new THREE.Vector3(0, 1, 0), new THREE.Euler(-Math.PI / 2, 0, 0)],
      }
      const spots = [] // { k, centre, face, spin, delay, tier, inner }
      for (const c of cubes) {
        if (isTarget(c)) continue
        const n = rnd() < 0.22 ? 0 : rnd() < 0.6 ? 1 : 2
        const used = new Set()
        for (let i = 0; i < n; i++) {
          const r = rnd()
          const face = c.y === 0 && r < 0.42 ? 'top' : r < 0.62 ? 'front' : r < 0.74 ? 'right' : r < 0.86 ? 'left' : 'back'
          if (used.has(face)) continue
          used.add(face)
          spots.push({ k: Math.floor(rnd() * WORDS.length), c, face, spin: face === 'top' && rnd() < 0.5 ? Math.PI / 2 : 0, delay: rnd(), tier: 0.3 + rnd() * 0.7 })
        }
      }
      // the four walls of the target cube, facing in, at full brightness
      const INNER = [
        [new THREE.Vector3(HALF - 0.004, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
        [new THREE.Vector3(-HALF + 0.004, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
        [new THREE.Vector3(0, 0, HALF - 0.004), new THREE.Euler(0, Math.PI, 0)],
        [new THREE.Vector3(0, 0, -HALF + 0.004), new THREE.Euler(0, 0, 0)],
      ]

      const fieldTex = WORDS.map((w) => wordTexture(w))
      const wallTex = WALLS.map((w) => wordTexture(w, { weight: 500, px: 160, track: -0.03 }))
      const phraseTex = phrase.map((w) => wordTexture(w, { weight: 400, px: 200, track: -0.045 }))
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
      const phraseMeshes = phraseTex.map((t) => {
        const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, fog: false }))
        m.renderOrder = 2
        scene.add(m)
        return m
      })

      const dummy = new THREE.Object3D()
      // where each word sits: the plane's size follows its texture (a word fits the face, never wider)
      const place = () => {
        for (const g of groups) {
          const h = Math.min(SIZE * 0.24, (SIZE * 0.92) / g.t.aspect)
          g.list.forEach((s, i) => {
            const [n, rot] = FACES[s.face]
            dummy.position.copy(s.c).addScaledVector(n, HALF + 0.004)
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
          const h = Math.min(SIZE * 0.3, (SIZE * 0.9) / wallTex[i].aspect)
          m.scale.set(h * wallTex[i].aspect, h, 1)
        })
      }

      // --- the camera ---------------------------------------------------------------------------------
      // C0: straight on, far enough that the field is still in the dark. The three words sit at three depths
      // along the rays of a stepped block of text (sized to read alike from here); Cm is on the line through
      // the nearest and the farthest, so from there they fall onto each other.
      const C0 = new THREE.Vector3(0, 0.4, 11)
      const DEPTH = [3, 5.6, 9.2]
      const P = phrase.map(() => new THREE.Vector3())
      const Cm = new THREE.Vector3()
      const M1 = new THREE.Vector3(3.4, 3.2, 4.2)
      const A = target.clone().add(new THREE.Vector3(0, 7.4, 0))
      const I = target.clone().add(new THREE.Vector3(0, 0.98, 0))
      const look = (eye, at, up) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, at, up))
      const q0 = new THREE.Quaternion()
      let qm = new THREE.Quaternion()
      let qMid = new THREE.Quaternion()
      // straight down, the world's x pointing up the screen: the words on the tops stand upright
      const qTop = look(A, target, new THREE.Vector3(1, 0, 0))
      let rise = new THREE.CatmullRomCurve3([Cm, M1, A])
      const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.55)

      let W = 1
      let H = 1
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        renderer.setSize(W, H, false)
        camera.aspect = W / H
        camera.updateProjectionMatrix()
        // the stepped block, in screen pixels, centred like the hero's statement
        const f = W < 768 ? W * 0.12 : Math.min(96, Math.max(40, W * 0.052))
        const steps = [
          [-0.9, -1.05],
          [0.95, 0],
          [-0.55, 1.05],
        ]
        const tanH = Math.tan((camera.fov * Math.PI) / 360)
        phraseMeshes.forEach((m, i) => {
          const D = DEPTH[i]
          const sx = W / 2 + steps[i][0] * f
          const sy = H / 2 + steps[i][1] * f
          const wpp = (2 * D * tanH) / H // world units per pixel at that depth
          P[i].set(C0.x + (sx - W / 2) * wpp, C0.y - (sy - H / 2) * wpp, C0.z - D)
          m.position.copy(P[i])
          const hpx = f * 1.25
          m.scale.set(hpx * wpp * phraseTex[i].aspect, hpx * wpp, 1)
        })
        const dir = P[0].clone().sub(P[2]).normalize()
        Cm.copy(P[0]).addScaledVector(dir, 2.4)
        qm = look(Cm, P[2], new THREE.Vector3(0, 1, 0))
        qMid = look(M1, target.clone().add(new THREE.Vector3(0, -2, -1)), new THREE.Vector3(0, 1, 0)).multiply(roll)
        rise = new THREE.CatmullRomCurve3([Cm.clone(), M1, A], false, 'centripetal')
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
        walls.forEach((m) => m.material.color.copy(fg))
        tint(lastQ)
        dirty = true
      }

      // brightness of every word for the scroll position: a mix from the background to the paper colour
      const col = new THREE.Color()
      const tint = (q) => {
        const merge = seg(q, 0.05, 0.16)
        // they leave as the camera starts to rise (it passes right by the nearest one)
        const gone = seg(q, 0.19, 0.25)
        const TIER = [1, 0.5, 0.3]
        phraseMeshes.forEach((m, i) => {
          const k = seg(q, i * 0.008, 0.022 + i * 0.008) * lerp(1, TIER[i], merge) * (1 - gone)
          m.material.color.copy(bg).lerp(fg, k)
          m.visible = k > 0.002
        })
        for (const g of groups) {
          g.list.forEach((s, i) => {
            const a = seg(q, 0.1 + s.delay * 0.16, 0.15 + s.delay * 0.16)
            g.mesh.setColorAt(i, col.copy(bg).lerp(fg, a * s.tier))
          })
          if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true
        }
        const w = seg(q, 0.3, 0.46)
        walls.forEach((m) => m.material.color.copy(bg).lerp(fg, w))
      }

      // --- scroll → camera, words, window, states ----------------------------------------------------
      const base = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), tilt: 1 }
      let lastQ = 0
      let dirty = true
      const qa = new THREE.Quaternion()
      const apply = (q) => {
        lastQ = q
        dirty = true
        // the words slide into each other
        const m = ease(seg(q, 0.03, 0.17))
        // up and over, rolling, until the camera looks straight down
        const r = ease(seg(q, 0.19, 0.5))
        // down into the cube
        const d = smooth(seg(q, 0.52, 0.68))
        if (r <= 0) {
          base.pos.copy(C0).lerp(Cm, m)
          base.quat.copy(q0).slerp(qm, m)
        } else if (d <= 0) {
          rise.getPoint(r, base.pos)
          if (r < 0.5) base.quat.copy(qm).slerp(qMid, smooth(r * 2))
          else base.quat.copy(qMid).slerp(qTop, smooth((r - 0.5) * 2))
        } else {
          base.pos.copy(A).lerp(I, d)
          base.quat.copy(qTop)
        }
        // the pointer tilts the camera until it is over the cube (then the floor has to stay square)
        base.tilt = 1 - seg(q, 0.44, 0.5)
        lineMat.opacity = seg(q, 0.04, 0.2) * 0.22
        glowMat.uniforms.uGlow.value = seg(q, 0.13, 0.22) * (1 - seg(q, 0.6, 0.68))
        level.style.opacity = String(0.6 * (1 - seg(q, 0.01, 0.08)))
        tint(q)

        // C: three states over the open floor
        const s = q < 0.76 ? -1 : q < 0.84 ? 0 : q < 0.92 ? 1 : 2
        stateEls.forEach((n, i) => (i === s ? (n.dataset.on = '') : delete n.dataset.on))
        plans.forEach((n, i) => (i === Math.max(0, s) ? (n.dataset.on = '') : delete n.dataset.on))
        if (s >= 0) {
          count.dataset.on = ''
          countN.textContent = String(s + 1).padStart(2, '0')
        } else delete count.dataset.on
      }

      // the floor of the target cube, projected: the window (the picture) sits exactly on it, then opens
      const floor = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => target.clone().add(new THREE.Vector3(sx * HALF, -HALF, sz * HALF))))
      const v = new THREE.Vector3()
      const frameWindow = () => {
        const q = lastQ
        const shown = seg(q, 0.5, 0.56)
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
        const open = ease(seg(q, 0.68, 0.76))
        win.style.transform = `translate3d(${lerp(x0, 0, open)}px, ${lerp(y0, 0, open)}px, 0)`
        win.style.width = `${Math.max(0, lerp(x1 - x0, W, open))}px`
        win.style.height = `${Math.max(0, lerp(y1 - y0, H, open))}px`
        win.style.opacity = String(shown)
        canvas.style.opacity = String(1 - open)
      }

      // --- the loop: camera = scroll pose + a little of the pointer; light on the edges ------------------
      const pointer = trackPointer()
      const sp = { x: 0, y: 0 }
      let raf = 0
      let visible = false
      let prev = performance.now()
      const loop = (now) => {
        raf = requestAnimationFrame(loop)
        const dt = now - prev
        prev = now
        if (!visible) return
        sp.x += (pointer.x - sp.x) * 0.06
        sp.y += (pointer.y - sp.y) * 0.06
        const moving = Math.abs(pointer.x - sp.x) + Math.abs(pointer.y - sp.y) > 0.0005
        const live = lastQ < 0.76
        if (!(live || dirty || moving)) return
        camera.position.copy(base.pos)
        qa.setFromEuler(new THREE.Euler(-sp.y * 0.045 * base.tilt, -sp.x * 0.07 * base.tilt, 0))
        camera.quaternion.copy(base.quat).multiply(qa)
        camera.updateMatrixWorld()
        glowMat.uniforms.uTime.value = now / 1000
        frameWindow()
        if (lastQ < 0.77) {
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

      // the words are painted in the page's face: if it has not arrived yet, they are painted again when it does
      Promise.all([document.fonts?.load("500 140px 'Inter Tight'"), document.fonts?.load("400 200px 'Inter Tight'")]).then(() => {
        ;[...fieldTex, ...wallTex, ...phraseTex].forEach((t) => t.draw())
        place()
        layout()
        apply(lastQ)
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
      const ro = new ResizeObserver(() => {
        layout()
        apply(lastQ)
      })
      ro.observe(stage)
      return () => {
        cancelAnimationFrame(raf)
        pointer.dispose()
        st.kill()
        ro.disconnect()
        io.disconnect()
        mo.disconnect()
        renderer.dispose()
        ;[lineGeo, edges, plane, glowGeo].forEach((g) => g.dispose())
        ;[lineMat, glowMat].forEach((mt) => mt.dispose())
        groups.forEach((g) => g.mesh.material.dispose())
        ;[...walls, ...phraseMeshes].forEach((m) => m.material.dispose())
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
        <p className="sr-only">{phrase.join(' ')}</p>
        <div data-window="" className="dp-window" aria-hidden="true" style={{ opacity: 0 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} data-plan="" className="dp-plan">
              <Plan kind={k} />
            </div>
          ))}
        </div>
        <div className="dp-sheet" aria-hidden="true">
          {/* the same two lines as the hero (it measures them on the name and writes the variables), and its
              level datum, which fades as the field comes out of the dark */}
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
