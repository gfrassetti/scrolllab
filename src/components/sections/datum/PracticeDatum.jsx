import { useRef } from 'react'
import * as THREE from 'three'
import { useGSAP, ScrollTrigger } from '../../../lib/gsap'

/**
 * PracticeDatum — what the practice stands for, in three words.
 *
 * A field of hairline cubes (Three.js), each with a word of the trade on one face. The camera drifts through
 * the field tilted, levels out, and goes into the cube at the centre: its far face is a window. The window
 * (DOM, so its pictures are plain images) grows to the whole screen and carries three states — Weight,
 * Light, Time — each with its plan drawing, a line of text and the counter 01 / 03.
 *
 * Colours come from the page (`--datum-ink` / `--datum-paper`), so «Invert drawing» turns this over too.
 * Reduced motion: no canvas and no pin; the three states one under the other.
 */
const CSS = `
.dp { position: relative; height: 640svh; background: var(--datum-ink); color: var(--datum-paper); }
.dp-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--datum-ink); }
.dp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.dp-window { position: absolute; left: 0; top: 0; overflow: hidden; background: var(--datum-ink); will-change: transform, width, height; }
.dp-plan { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity .7s cubic-bezier(.25,1,.5,1); }
.dp-plan[data-on] { opacity: 1; }
.dp-plan svg { width: 100%; height: 100%; display: block; }
.dp-sheet { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: difference; z-index: 3; }
.dp-col { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(239,239,237,.08); }
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
.dp[data-calm] { height: auto; }
.dp[data-calm] .dp-stage { position: relative; height: auto; }
.dp[data-calm] .dp-canvas, .dp[data-calm] .dp-count { display: none; }
.dp[data-calm] .dp-window { position: relative; width: 100% !important; height: 70svh !important; transform: none !important; }
.dp[data-calm] .dp-state { position: relative; inset: auto; min-height: 60svh; }
.dp[data-calm] .dp-w { opacity: 1; transform: none; }
`

const WORDS = ['Light', 'Mass', 'Void', 'Axis', 'Plane', 'Grain', 'Edge', 'Threshold', 'Shadow', 'Section', 'Datum', 'Room']
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const seg = (q, a, b) => clamp01((q - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
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

/** Texture of a word, white on transparent (tinted by the material). `draw` repaints it once the font is in. */
function wordTexture(word) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 4
  const draw = () => {
    g.clearRect(0, 0, 512, 128)
    g.font = "500 86px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif"
    g.fillStyle = '#fff'
    g.textBaseline = 'middle'
    g.fillText(word, 14, 66)
    t.needsUpdate = true
  }
  draw()
  return { tex: t, draw }
}

export default function PracticeDatum({
  label = 'Our practice',
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

      // --- the field --------------------------------------------------------------------------------
      const phone = window.matchMedia('(max-width: 767px)').matches
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60)
      const fog = new THREE.Fog(0x101010, 2.2, 11)
      scene.fog = fog

      const STEP = 2.4
      const SIZE = 1.6
      const N = 1 // −N..N on x and y: 3 × 3 per layer
      const LAYERS = 5
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE))
      const edgePos = edges.attributes.position.array
      const all = []
      for (let z = 0; z < LAYERS; z++) {
        for (let x = -N; x <= N; x++) {
          for (let y = -N; y <= N; y++) {
            const cx = x * STEP
            const cy = y * STEP
            const cz = -z * STEP
            for (let i = 0; i < edgePos.length; i += 3) all.push(edgePos[i] + cx, edgePos[i + 1] + cy, edgePos[i + 2] + cz)
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(all, 3))
      const lineMat = new THREE.LineBasicMaterial({ color: 0xefefed, transparent: true, opacity: 0.2, fog: true })
      scene.add(new THREE.LineSegments(lineGeo, lineMat))

      // a word on one face of most cubes (the four sides, the front or the back)
      const tex = WORDS.map(wordTexture)
      const wordMats = tex.map((t) => new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, color: 0xefefed, fog: true }))
      const quad = new THREE.PlaneGeometry(1, 0.25)
      let seed = 7
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      const words = new THREE.Group()
      for (let z = 0; z < LAYERS; z++) {
        for (let x = -N; x <= N; x++) {
          for (let y = -N; y <= N; y++) {
            if (x === 0 && y === 0 && z === 0) continue // the cube we go into stays clear
            if (rnd() < 0.15) continue
            const k = Math.floor(rnd() * WORDS.length)
            const m = new THREE.Mesh(quad, wordMats[k])
            // la textura es 4:1 y el plano también: escala pareja, la palabra ocupa ~ el ancho de la cara
            m.scale.setScalar(SIZE * 0.95)
            const face = Math.floor(rnd() * 5)
            const h = SIZE / 2 + 0.002
            m.position.set(x * STEP, y * STEP, -z * STEP)
            if (face === 0) m.position.z += h
            else if (face === 1) {
              m.position.x += h
              m.rotation.y = Math.PI / 2
            } else if (face === 2) {
              m.position.x -= h
              m.rotation.y = -Math.PI / 2
            } else if (face === 3) {
              m.position.y += h
              m.rotation.x = -Math.PI / 2
            } else {
              m.position.y -= h
              m.rotation.x = Math.PI / 2
            }
            m.rotation.z += rnd() < 0.5 ? 0 : Math.PI / 2
            words.add(m)
          }
        }
      }
      scene.add(words)

      // --- camera path -----------------------------------------------------------------------------
      const start = new THREE.Vector3(1.7, 1.2, 4.0)
      const level = new THREE.Vector3(0, 0, 2.6)
      const inside = new THREE.Vector3(0, 0, 0.5)
      const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0.5, 0.75))
      const qFront = new THREE.Quaternion()
      const qNow = new THREE.Quaternion()
      const far = SIZE / 2 // the far face of the centre cube is at z = −far
      const corners = [new THREE.Vector3(-far, -far, -far), new THREE.Vector3(far, far, -far)]
      const v = new THREE.Vector3()

      let W = 1
      let H = 1
      const resize = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        renderer.setSize(W, H, false)
        camera.aspect = W / H
        camera.updateProjectionMatrix()
        apply(lastQ)
      }

      const colours = () => {
        const cs = getComputedStyle(stage)
        const ink = cs.getPropertyValue('--datum-ink').trim() || '#101010'
        const paper = cs.getPropertyValue('--datum-paper').trim() || '#efefed'
        fog.color.set(ink)
        lineMat.color.set(paper)
        wordMats.forEach((m) => m.color.set(paper))
      }

      let lastQ = 0
      let dirty = true
      const apply = (q) => {
        lastQ = q
        dirty = true
        // A: through the field, tilted, levelling out
        const a = ease(seg(q, 0, 0.42))
        // B: straight on, into the centre cube
        const b = ease(seg(q, 0.42, 0.58))
        camera.position.copy(start).lerp(level, a).lerp(inside, b)
        qNow.copy(qTilt).slerp(qFront, a)
        camera.quaternion.copy(qNow)
        camera.updateMatrixWorld()
        // the far face, projected: the window sits exactly on it, then opens to the whole screen
        let x0 = Infinity
        let y0 = Infinity
        let x1 = -Infinity
        let y1 = -Infinity
        for (const c of corners) {
          v.copy(c).project(camera)
          const sx = ((v.x + 1) / 2) * W
          const sy = ((1 - v.y) / 2) * H
          x0 = Math.min(x0, sx)
          x1 = Math.max(x1, sx)
          y0 = Math.min(y0, sy)
          y1 = Math.max(y1, sy)
        }
        const behind = v.z > 1 || !isFinite(x0)
        const open = ease(seg(q, 0.58, 0.68))
        const shown = seg(q, 0.44, 0.52)
        const rx = behind ? 0 : lerp(x0, 0, open)
        const ry = behind ? 0 : lerp(y0, 0, open)
        const rw = behind ? W : lerp(x1 - x0, W, open)
        const rh = behind ? H : lerp(y1 - y0, H, open)
        win.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
        win.style.width = `${Math.max(0, rw)}px`
        win.style.height = `${Math.max(0, rh)}px`
        win.style.opacity = String(shown)
        canvas.style.opacity = String(1 - open)
        // C: three states over the open window
        const s = q < 0.68 ? -1 : q < 0.79 ? 0 : q < 0.9 ? 1 : 2
        stateEls.forEach((n, i) => (i === s ? (n.dataset.on = '') : delete n.dataset.on))
        plans.forEach((n, i) => (i === Math.max(0, s) ? (n.dataset.on = '') : delete n.dataset.on))
        if (s >= 0) {
          count.dataset.on = ''
          countN.textContent = String(s + 1).padStart(2, '0')
        } else delete count.dataset.on
      }

      let raf = 0
      let visible = false
      let t0 = performance.now()
      const loop = (now) => {
        raf = requestAnimationFrame(loop)
        if (!visible) return
        // the field breathes a little even when the page is still
        words.rotation.z = Math.sin((now - t0) * 0.00012) * 0.02
        if (lastQ < 0.7 || dirty) {
          renderer.render(scene, camera)
          dirty = false
        }
      }
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' })
      io.observe(el)
      const mo = new MutationObserver(() => setTimeout(colours, 650))
      const world = el.closest('.datum-world')
      if (world) mo.observe(world, { attributes: true, attributeFilter: ['data-theme'] })

      // las palabras se pintan con la tipografía de la página: si todavía no llegó, se repintan cuando llega
      document.fonts?.load("500 86px 'Inter Tight'").then(() => {
        tex.forEach((t) => t.draw())
        dirty = true
      })
      colours()
      resize()
      t0 = performance.now()
      raf = requestAnimationFrame(loop)
      const st = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', onUpdate: (self) => apply(self.progress) })
      const ro = new ResizeObserver(resize)
      ro.observe(stage)
      return () => {
        cancelAnimationFrame(raf)
        st.kill()
        ro.disconnect()
        io.disconnect()
        mo.disconnect()
        renderer.dispose()
        lineGeo.dispose()
        edges.dispose()
        quad.dispose()
        lineMat.dispose()
        wordMats.forEach((m) => m.dispose())
        tex.forEach((t) => t.tex.dispose())
      }
    },
    { scope: root },
  )

  const split = (t) =>
    t.split(' ').map((w, i) => (
      <span key={i} className="dp-w" style={{ '--i': i }}>
        {w}
        {' '}
      </span>
    ))

  return (
    <section ref={root} id="practice" className="dp" aria-label={label}>
      <style>{CSS}</style>
      <div data-stage="" className="dp-stage">
        <canvas className="dp-canvas" aria-hidden="true" />
        <div data-window="" className="dp-window" aria-hidden="true" style={{ opacity: 0 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} data-plan="" className="dp-plan">
              <Plan kind={k} />
            </div>
          ))}
        </div>
        <div className="dp-sheet" aria-hidden="true">
          {/* the same two lines as the hero (it measures them on the name and writes the variables) */}
          <i className="dp-col" style={{ left: 'var(--datum-l1, 12.5%)' }} />
          <i className="dp-col" style={{ left: 'var(--datum-l2, 50%)' }} />
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
