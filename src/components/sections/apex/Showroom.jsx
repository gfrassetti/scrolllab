import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../../../lib/gsap'
import { createFrameBudget, prefersReducedMotion } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { showroom1, showroom2, showroom3, showroomEntry, variants } from './assets/images'

/**
 * APEX — Showroom (3D)
 *
 * A round night showroom built in Blender (lighting baked into the textures,
 * scripts and source in docs/apex-template.md) and three cars on plinths.
 * The scroll is the camera: it comes down from outside, walks in through the
 * door and stops beside each car in turn, then backs out of the room.
 *
 * At a car the pointer reads "Drag": dragging turns the car on its plinth;
 * "Close" puts it back and brings the spec card. Scrolling on moves to the
 * next car, scrolling back to the previous one.
 *
 *  - Assets: `sceneUrl` (the room) and one GLB per car (`modelUrl`), Draco
 *    compressed; the decoder is in /public/apex/draco/.
 *  - The cars stand on the three plinths in order; up to three.
 *  - Calm (reduce motion) or no WebGL: the same story as stills (rendered in
 *    Blender) with the spec cards. Never a hole.
 *  - The scene loads only when the section is a screen and a half away.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_CARS = [
  { name: 'Model 1', modelUrl: '/apex/showroom/car-1.glb', image: showroom1, specs: 'Year | 2026\nPower | 000 kW\nRange | 000 km\nTop speed | 000 km/h\nWeight | 0,000 kg' },
  { name: 'Model 2', modelUrl: '/apex/showroom/car-2.glb', image: showroom2, specs: 'Year | 2026\nPower | 000 kW\nRange | 000 km\nTop speed | 000 km/h\nWeight | 0,000 kg' },
  { name: 'Model 3', modelUrl: '/apex/showroom/car-3.glb', image: showroom3, specs: 'Year | 2026\nPower | 000 kW\nRange | 000 km\nTop speed | 000 km/h\nWeight | 0,000 kg' },
]

// Scroll budget, in screens.
const APPROACH = 1.7
const HOLD = 1.1
const TRAVEL = 0.9
const EXIT = 1.5

// The room (metres, three.js axes, the door on +Z). Stations: angle around
// the centre measured from +Z toward +X, all on a 5 m circle.
const STATION_PHI = [Math.PI, (-60 * Math.PI) / 180, (60 * Math.PI) / 180]
const STATION_R = 5
const PLINTH_TOP = 0.14

const specRows = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((r) => r[0])
    .map(([label, value = '']) => ({ label, value }))

/** Camera keyframes in polar form around the room centre: { s (screens), cam: [phi, r, y], look: [phi, r, y] }. */
function buildKeys(count, camR = 1.4) {
  const deg = (d) => (d * Math.PI) / 180
  const keys = []
  const look = (k) => [deg(180 + 120 * k), STATION_R, 0.78]
  const cam = (k) => [deg(360 + 120 * k), camR, 1.3]
  keys.push({ s: 0, cam: [deg(360), 30, 9], look: [deg(180), 1.5, 1.4] })
  keys.push({ s: APPROACH * 0.55, cam: [deg(360), 11.2, 1.7], look: [deg(180), 2.5, 1.1] })
  let s = APPROACH
  for (let k = 0; k < count; k += 1) {
    if (k > 0) s += TRAVEL
    keys.push({ s, cam: cam(k), look: look(k) })
    s += HOLD
    keys.push({ s, cam: cam(k), look: look(k) })
  }
  // Leaving: step back to the wall and look over all the cars, follow the
  // wall round to the door with the eyes on the room, then back out of it.
  const lastCam = 360 + 120 * (count - 1)
  const door = Math.max(lastCam + 60, Math.ceil((lastCam + 1) / 360) * 360)
  keys.push({ s: s + EXIT * 0.3, cam: [deg(lastCam), 7.6, 2.5], look: [deg(lastCam + 180), 0, 1.0] })
  keys.push({ s: s + EXIT * 0.65, cam: [deg(door), 8.8, 2.1], look: [deg(door + 180), 0, 0.9] })
  keys.push({ s: s + EXIT, cam: [deg(door), 24, 7], look: [deg(door + 180), 0, 1.2] })
  return { keys, total: s + EXIT }
}

const smooth = (t) => t * t * (3 - 2 * t)
function poseAt(keys, s) {
  if (s <= keys[0].s) return keys[0]
  for (let i = 1; i < keys.length; i += 1) {
    const a = keys[i - 1]
    const b = keys[i]
    if (s <= b.s) {
      const t = smooth((s - a.s) / Math.max(1e-6, b.s - a.s))
      const mix = (u, v) => u.map((x, j) => x + (v[j] - x) * t)
      return { cam: mix(a.cam, b.cam), look: mix(a.look, b.look) }
    }
  }
  return keys[keys.length - 1]
}
const polar = ([phi, r, y], out) => out.set(Math.sin(phi) * r, y, Math.cos(phi) * r)

export default function Showroom({
  eyebrow = 'Section label',
  title = 'Headline 1',
  intro = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  cars,
  sceneUrl = '/apex/showroom/showroom.glb',
  poster,
  dracoPath = '/apex/draco/',
  dragLabel = 'Drag',
  closeLabel = 'Close',
  loadingLabel = 'Loading the showroom',
  scrollLabel = 'Scroll',
  showReflections = 'on',
  bg,
  fg,
  accent,
}) {
  const rootRef = useRef(null)
  const stickyRef = useRef(null)
  const canvasRef = useRef(null)
  const cursorRef = useRef(null)
  const stateRef = useRef({ progress: 0, inspecting: false, active: -1, camR: 1.4 })
  const [calm] = useState(() => typeof window !== 'undefined' && prefersReducedMotion())
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(-1)
  const [inspecting, setInspecting] = useState(false)
  const [intro0, setIntro0] = useState(true)

  const edited = Array.isArray(cars)
    ? cars
        .slice(0, 3)
        .map((c, i) => ({
          name: c?.name || DEFAULT_CARS[i]?.name || '',
          modelUrl: c?.modelUrl || DEFAULT_CARS[i]?.modelUrl || '',
          image: c?.image || DEFAULT_CARS[i]?.image,
          specs: c?.specs ?? DEFAULT_CARS[i]?.specs ?? '',
        }))
        .filter((c) => c.modelUrl)
    : []
  const list = edited.length ? edited : DEFAULT_CARS
  const { keys, total } = buildKeys(list.length, stateRef.current.camR)
  const posterSrc = poster || showroomEntry
  const still = calm || failed
  const keysRef = useRef(keys)
  keysRef.current = keys
  const carsKey = list.map((c) => c.modelUrl).join('|')

  // Scroll → progress (0..1 over the pinned stretch).
  useEffect(() => {
    const root = rootRef.current
    if (!root || still) return undefined
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        stateRef.current.progress = self.progress
      },
    })
    return () => st.kill()
  }, [still])

  // The scene: loaded when the section is near, rendered while it is on screen.
  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (still || !root || !canvas) return undefined
    let disposed = false
    let cleanup = () => {}

    const boot = async () => {
      const THREE = await import('three')
      const [{ GLTFLoader }, { DRACOLoader }, { Reflector }, { RectAreaLightUniformsLib }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/objects/Reflector.js'),
        import('three/examples/jsm/lights/RectAreaLightUniformsLib.js'),
      ])
      RectAreaLightUniformsLib.init()
      if (disposed) return

      const phone = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' })
      const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75)
      renderer.setPixelRatio(dpr)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.AgXToneMapping
      renderer.toneMappingExposure = 1.3
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#020306')
      scene.fog = new THREE.Fog('#020306', 18, 46)
      const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 120)

      const draco = new DRACOLoader().setDecoderPath(dracoPath)
      const loader = new GLTFLoader().setDRACOLoader(draco)
      const load = (url) => new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject))

      const [room, ...carScenes] = await Promise.all([load(sceneUrl), ...list.map((c) => load(c.modelUrl))])
      draco.dispose()
      if (disposed) return

      // Baked parts are drawn as they came out of Blender (light already in the texture).
      let floor = null
      room.traverse((node) => {
        if (!node.isMesh) return
        const m = node.material
        const name = `${m?.name || ''} ${node.name}`
        if (/_baked/.test(name)) {
          const map = m.map || m.emissiveMap
          node.material = new THREE.MeshBasicMaterial({ map, toneMapped: false })
          if (/SR_Floor/.test(name)) floor = node
        } else if (/Glass/i.test(name)) {
          node.material = new THREE.MeshBasicMaterial({ color: '#0b1220', transparent: true, opacity: 0.18, depthWrite: false })
        } else if (m?.emissive) {
          m.emissiveIntensity = 2.2
        }
      })
      scene.add(room)

      // Reflections in the paint: the room itself, rendered once into an environment map.
      const pmrem = new THREE.PMREMGenerator(renderer)
      const envScene = new THREE.Scene()
      envScene.add(room.clone())
      const env = pmrem.fromScene(envScene, 0.03).texture
      scene.environment = env
      pmrem.dispose()

      // Glossy floor: a mirror under the baked floor (desktop only).
      let mirror = null
      if (!phone && showReflections !== 'off' && floor) {
        mirror = new Reflector(new THREE.CircleGeometry(10, 96), {
          textureWidth: Math.round(window.innerWidth * dpr * 0.5),
          textureHeight: Math.round(window.innerHeight * dpr * 0.5),
          color: '#1b222c',
        })
        mirror.rotation.x = -Math.PI / 2
        mirror.position.y = -0.004
        scene.add(mirror)
        floor.material.transparent = true
        floor.material.opacity = 0.86
      }

      // Cars on their plinths, side on to the centre (length tangent to the circle).
      const turn = []
      carScenes.forEach((car, k) => {
        const holder = new THREE.Group()
        const phi = STATION_PHI[k]
        holder.position.set(Math.sin(phi) * STATION_R, PLINTH_TOP, Math.cos(phi) * STATION_R)
        holder.rotation.y = phi + Math.PI / 2
        car.traverse((node) => {
          if (!node.isMesh || !node.material) return
          const m = node.material
          m.envMapIntensity = 1.6
          // Blender exports a 2× specular for Principled defaults: back to physical.
          if (m.specularColor) m.specularColor.setScalar(1)
          if (m.isMeshPhysicalMaterial && m.clearcoat > 0) m.clearcoatRoughness = Math.min(m.clearcoatRoughness, 0.05)
        })
        holder.add(car)
        scene.add(holder)
        turn.push({ holder, base: holder.rotation.y, offset: 0, target: 0, vel: 0 })
      })

      // A soft light panel over each plinth (the area lights of the Blender
      // scene): it lights the paint and draws a long highlight on the roof.
      scene.add(new THREE.HemisphereLight('#9fb8ff', '#05070a', 0.25))
      STATION_PHI.slice(0, carScenes.length).forEach((phi, k) => {
        const x = Math.sin(phi) * STATION_R
        const z = Math.cos(phi) * STATION_R
        const panel = new THREE.RectAreaLight('#eef3ff', 7, 5.6, 2.4)
        panel.position.set(x, 4.1, z)
        panel.lookAt(x, 0, z)
        panel.rotation.z = phi + Math.PI / 2 - (k === 0 ? 0 : 0)
        scene.add(panel)
        // a low rim from the room centre so the flank facing the camera reads
        const rim = new THREE.RectAreaLight('#dfe8ff', 2.2, 4.5, 1.2)
        rim.position.set(x * 0.35, 1.4, z * 0.35)
        rim.lookAt(x, 0.8, z)
        scene.add(rim)
      })

      const size = () => {
        const w = canvas.clientWidth || window.innerWidth
        const h = canvas.clientHeight || window.innerHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        // Narrow screens: a wider lens and the camera further back (past the
        // centre of the room) so a whole car still fits side on.
        camera.fov = camera.aspect < 0.8 ? 60 : camera.aspect < 1.2 ? 52 : 42
        camera.updateProjectionMatrix()
        const half = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
        const need = (5.8 / 2) / Math.tan(half)
        const camR = Math.min(4.6, Math.max(1.4, need - STATION_R))
        stateRef.current.camR = camR
        keysRef.current = buildKeys(list.length, camR).keys
        if (camera.aspect < 0.8) camera.setViewOffset(w, h, 0, Math.round(h * 0.17), w, h)
        else camera.clearViewOffset()
      }
      size()
      const ro = new ResizeObserver(size)
      ro.observe(canvas)

      const budget = createFrameBudget({ dpr, apply: (v) => renderer.setPixelRatio(v) })
      const camPos = new THREE.Vector3()
      const camLook = new THREE.Vector3()
      const wantPos = new THREE.Vector3()
      const wantLook = new THREE.Vector3()
      let first = true
      let raf = 0
      let visible = false
      let last = performance.now()

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const st = stateRef.current
        const s = st.progress * keysRef.current.reduce((m, k) => Math.max(m, k.s), 0)
        const pose = poseAt(keysRef.current, s)
        polar(pose.cam, wantPos)
        polar(pose.look, wantLook)
        if (first) {
          camPos.copy(wantPos)
          camLook.copy(wantLook)
          first = false
        }
        const k = 1 - Math.exp(-dt * 6)
        camPos.lerp(wantPos, k)
        camLook.lerp(wantLook, k)
        camera.position.copy(camPos)
        camera.lookAt(camLook)

        turn.forEach((t, i) => {
          if (!st.inspecting || st.active !== i) t.target = 0
          if (!st.dragging) t.offset += (t.target - t.offset) * (1 - Math.exp(-dt * 5)) + t.vel * dt
          t.vel *= Math.exp(-dt * 3)
          t.holder.rotation.y = t.base + t.offset
        })

        renderer.render(scene, camera)
        budget.tick(dt * 1000)
        raf = requestAnimationFrame(frame)
      }

      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        cancelAnimationFrame(raf)
        if (visible) {
          last = performance.now()
          raf = requestAnimationFrame(frame)
        }
      })
      io.observe(canvas)

      // Drag to turn the car you are standing at.
      let startX = 0
      let startOffset = 0
      let lastX = 0
      const down = (e) => {
        const st = stateRef.current
        if (st.active < 0) return
        st.dragging = true
        st.inspecting = true
        setInspecting(true)
        startX = lastX = e.clientX
        startOffset = turn[st.active].offset
        canvas.setPointerCapture?.(e.pointerId)
      }
      const move = (e) => {
        const st = stateRef.current
        if (cursorRef.current && e.pointerType === 'mouse') {
          const r = canvas.getBoundingClientRect()
          cursorRef.current.style.transform = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0)`
        }
        if (!st.dragging || st.active < 0) return
        const t = turn[st.active]
        t.offset = startOffset + (e.clientX - startX) * 0.009
        t.target = t.offset
        t.vel = (e.clientX - lastX) * 0.4
        lastX = e.clientX
      }
      const up = () => {
        const st = stateRef.current
        if (!st.dragging) return
        st.dragging = false
        if (st.active >= 0) turn[st.active].target = turn[st.active].offset
      }
      canvas.addEventListener('pointerdown', down)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)

      setReady(true)
      cleanup = () => {
        io.disconnect()
        ro.disconnect()
        cancelAnimationFrame(raf)
        canvas.removeEventListener('pointerdown', down)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        mirror?.dispose?.()
        env.dispose()
        scene.traverse((node) => {
          node.geometry?.dispose?.()
          const mats = Array.isArray(node.material) ? node.material : [node.material]
          mats.forEach((m) => {
            if (!m) return
            Object.values(m).forEach((v) => v?.isTexture && v.dispose())
            m.dispose?.()
          })
        })
        renderer.dispose()
      }
    }

    // Only fetch the scene when the visitor is getting close.
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        near.disconnect()
        boot().catch(() => {
          if (!disposed) setFailed(true)
        })
      },
      { rootMargin: '150% 0px' },
    )
    near.observe(root)
    return () => {
      disposed = true
      near.disconnect()
      cleanup()
    }
  }, [still, sceneUrl, dracoPath, carsKey, showReflections]) // eslint-disable-line react-hooks/exhaustive-deps

  // Which car the camera is standing at (drives the card, the cursor and Close).
  useEffect(() => {
    if (still) return undefined
    let raf = 0
    const tick = () => {
      const st = stateRef.current
      const s = st.progress * total
      setIntro0(s < APPROACH * 0.62)
      let a = -1
      let t = APPROACH
      for (let k = 0; k < list.length; k += 1) {
        if (k > 0) t += TRAVEL
        if (s >= t - 0.25 && s <= t + HOLD + 0.2) a = k
        t += HOLD
      }
      if (a !== st.active) {
        st.active = a
        st.inspecting = false
        setActive(a)
        setInspecting(false)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [still, total, list.length])

  const close = () => {
    stateRef.current.inspecting = false
    setInspecting(false)
  }

  const vars = { '--sr-bg': bg || '#020306', '--sr-fg': fg || '#e8edf6', '--sr-accent': accent || '#9cc3ff' }

  // Calm / no WebGL: the same tour as stills.
  if (still) {
    return (
      <section id="showroom" className="apex-showroom relative" style={{ ...vars, background: 'var(--sr-bg)', color: 'var(--sr-fg)' }}>
        <div className="relative">
          <img {...imgAttrs(posterSrc, variants)} sizes="100vw" alt="" loading="lazy" className="block aspect-[16/9] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 px-[5vw] pb-8 md:px-[2.4vw]">
            <p className="text-[11px] tracking-[0.16em] uppercase opacity-70" style={LABEL}>{eyebrow}</p>
            <h2 className="mt-3 text-[1.6rem] md:text-[clamp(2rem,5vw,4.5rem)] leading-[0.98] font-medium tracking-[-0.035em]" style={DISPLAY}>{title}</h2>
          </div>
        </div>
        {list.map((c, i) => (
          <article key={i} className="grid gap-6 px-[5vw] py-10 md:grid-cols-12 md:px-[2.4vw]">
            <img {...imgAttrs(c.image, variants)} sizes="(min-width: 768px) 66vw, 100vw" alt={c.name} loading="lazy" className="aspect-[16/9] w-full object-cover md:col-span-8" />
            <SpecCard car={c} index={i} count={list.length} />
          </article>
        ))}
      </section>
    )
  }

  const cardFor = active >= 0 ? active : -1
  return (
    <section
      ref={rootRef}
      id="showroom"
      className="apex-showroom relative"
      style={{ ...vars, height: `${(total + 1) * 100}svh`, background: 'var(--sr-bg)', color: 'var(--sr-fg)' }}
    >
      <div ref={stickyRef} className="sticky top-0 h-svh overflow-hidden">
        {/* Poster until the scene is in. */}
        <img
          {...imgAttrs(posterSrc, variants)}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="apex-sr-poster absolute inset-0 h-full w-full object-cover"
          data-ready={ready ? 'true' : 'false'}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-pan-y"
          data-drag={active >= 0 && !inspecting ? 'true' : 'false'}
          aria-label={title}
          role="img"
        />

        {/* Intro, while the camera comes in. */}
        <div className="apex-sr-intro pointer-events-none absolute inset-x-0 bottom-0 px-[5vw] pb-[max(2rem,6svh)] md:px-[2.4vw]" data-on={intro0 ? 'true' : 'false'}>
          <p className="text-[11px] tracking-[0.16em] uppercase opacity-70 lg:text-[max(10px,0.6vw)]" style={LABEL}>{eyebrow}</p>
          <h2 className="mt-3 max-w-[18ch] text-[1.75rem] md:text-[clamp(2.2rem,6vw,6rem)] leading-[0.95] font-medium tracking-[-0.04em]" style={DISPLAY}>{title}</h2>
          <p className="mt-4 max-w-[40ch] text-[14px] leading-[1.5] opacity-80 md:text-[max(14px,1vw)]">{intro}</p>
          {!ready ? (
            <p className="mt-6 text-[11px] tracking-[0.16em] uppercase opacity-60" style={LABEL} role="status">{loadingLabel}…</p>
          ) : (
            <p className="mt-6 text-[11px] tracking-[0.16em] uppercase opacity-60" style={LABEL}>{scrollLabel} ↓</p>
          )}
        </div>

        {/* One spec card per car (all in the DOM; the active one shows). */}
        <div className="pointer-events-none absolute bottom-[max(1.5rem,4svh)] left-[5vw] w-[min(19rem,74vw)] md:w-[min(26rem,90vw)] md:left-[2.4vw]">
          {list.map((c, i) => (
            <div key={i} className="apex-sr-card absolute bottom-0 left-0 w-full" data-on={cardFor === i && !inspecting ? 'true' : 'false'}>
              <SpecCard car={c} index={i} count={list.length} />
            </div>
          ))}
        </div>

        {/* Close: back from turning the car. */}
        <button
          type="button"
          onClick={close}
          className="apex-sr-close tpl-hit absolute top-[max(1.25rem,3svh)] right-[5vw] border border-current px-[1em] py-[0.62em] text-[11px] tracking-[0.16em] uppercase md:right-[2.4vw] lg:text-[max(10px,0.6vw)]"
          style={LABEL}
          data-on={inspecting ? 'true' : 'false'}
          tabIndex={inspecting ? 0 : -1}
          aria-hidden={inspecting ? undefined : true}
        >
          {closeLabel}
        </button>

        {/* Pointer label (mouse only). */}
        <div ref={cursorRef} aria-hidden="true" className="apex-sr-cursor pointer-events-none absolute top-0 left-0" data-on={active >= 0 && !inspecting ? 'true' : 'false'}>
          <span className="-translate-x-1/2 -translate-y-1/2 flex items-center gap-3 text-[11px] tracking-[0.16em] uppercase" style={LABEL}>
            <span aria-hidden="true">←</span>
            {dragLabel}
            <span aria-hidden="true">→</span>
          </span>
        </div>
        {/* Touch: the same hint, fixed. */}
        <p className="apex-sr-touch pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.16em] uppercase opacity-80" style={LABEL} data-on={active >= 0 && !inspecting ? 'true' : 'false'} aria-hidden="true">
          ← {dragLabel} →
        </p>
      </div>

      <style>{`
        .apex-sr-poster { transition: opacity 900ms var(--ease-out, ease); }
        .apex-sr-poster[data-ready='true'] { opacity: 0; }
        .apex-sr-intro, .apex-sr-card, .apex-sr-close, .apex-sr-cursor, .apex-sr-touch {
          transition: opacity 450ms var(--ease-out, ease), transform 600ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
        }
        .apex-sr-intro[data-on='false'] { opacity: 0; transform: translateY(-12px); }
        .apex-sr-card { opacity: 0; transform: translateY(14px); }
        .apex-sr-card[data-on='true'] { opacity: 1; transform: none; }
        .apex-sr-close { opacity: 0; pointer-events: none; }
        .apex-sr-close[data-on='true'] { opacity: 1; pointer-events: auto; }
        .apex-sr-cursor { opacity: 0; display: none; }
        .apex-sr-touch { opacity: 0; }
        @media (hover: hover) and (pointer: fine) {
          .apex-sr-cursor { display: block; }
          .apex-sr-cursor[data-on='true'] { opacity: 1; }
          canvas[data-drag='true'] { cursor: grab; }
          canvas[data-drag='true']:active { cursor: grabbing; }
        }
        @media (hover: none), (pointer: coarse) {
          .apex-sr-touch[data-on='true'] { opacity: 0.8; }
        }
      `}</style>
    </section>
  )
}

function SpecCard({ car, index, count }) {
  const rows = specRows(car.specs)
  return (
    <div className="apex-sr-spec border border-current/40 p-3.5 md:col-span-4 md:p-5" style={{ background: 'color-mix(in srgb, var(--sr-bg) 72%, transparent)' }}>
      <p className="text-[11px] tracking-[0.16em] tabular-nums uppercase opacity-60 lg:text-[max(10px,0.6vw)]" style={LABEL}>
        {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
      </p>
      <p className="mt-1.5 text-[1.05rem] md:text-[clamp(1.2rem,2vw,1.8rem)] leading-[1.05] font-medium tracking-[-0.02em]" style={DISPLAY}>
        {car.name}
      </p>
      <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 md:mt-4 md:gap-y-1.5 text-[11px] tracking-[0.12em] uppercase lg:text-[max(10px,0.6vw)]" style={LABEL}>
        {rows.map((r, i) => (
          <div key={i} className="contents">
            <dt style={{ color: 'var(--sr-accent)' }}>{r.label}</dt>
            <dd className="text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
