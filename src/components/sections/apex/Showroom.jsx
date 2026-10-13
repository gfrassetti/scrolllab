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
 *  - The cars stand on the three plinths in order; up to three. Any object
 *    works (a motorbike, a chair, a product): `fitToPlinth` lays its long
 *    side along the plinth, stands it on the floor and scales whatever is
 *    not car-sized to fill the plinth.
 *  - The room can be any GLB (`sceneUrl`): `readLayout` measures it and the
 *    camera's walk is laid over it (empties named Spot_1…3 say where the
 *    objects stand). `showRoom` off: a neutral stage instead of a room;
 *    `showCars` off: the room alone.
 *  - Calm (reduce motion) or no WebGL: the same story as stills (rendered in
 *    Blender) with the spec cards. Never a hole.
 *  - The scene loads only when the section is a screen and a half away.
 */

const DISPLAY = { fontFamily: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif" }
const LABEL = { fontFamily: "'Archivo', 'Inter Tight', sans-serif", fontStretch: '112%', fontVariationSettings: "'wdth' 112" }

const DEFAULT_CARS = [
  { name: 'Apex Saloon', modelUrl: '/apex/showroom/car-1.glb', image: showroom1, specs: 'Year | 2026\nPower | 580 kW\nRange | 620 km\nTop speed | 250 km/h\nWeight | 2,140 kg' },
  { name: 'Apex Coupé', modelUrl: '/apex/showroom/car-2.glb', image: showroom2, specs: 'Year | 2027\nPower | 720 kW\nRange | 540 km\nTop speed | 290 km/h\nWeight | 1,960 kg' },
  { name: 'Apex Terra', modelUrl: '/apex/showroom/car-3.glb', image: showroom3, specs: 'Year | 2026\nPower | 610 kW\nRange | 560 km\nTop speed | 210 km/h\nWeight | 2,690 kg' },
]

// Scroll budget, in screens.
const APPROACH = 1.7
const HOLD = 1.1
const TRAVEL = 0.9
const EXIT = 1.5

// The demo room (metres, three.js axes, the door on +Z): 10.5 m radius, three
// plinths 5 m out. Stations: angle around the centre measured from +Z toward +X.
const DEMO_ROOM_R = 10.5
const STATION_PHI = [Math.PI, (-60 * Math.PI) / 180, (60 * Math.PI) / 180]
const STATION_R = 5
const PLINTH_TOP = 0.14
// What the camera frames at a plinth: a car (3.5–6.2 m long) is left at its
// real size; anything else is scaled to FIT_LENGTH, and nothing gets taller
// than FIT_HEIGHT (the light panel hangs above). In a smaller room all of it
// shrinks with the room (layout.s).
const CAR_LENGTH = [3.5, 6.2]
const FIT_LENGTH = 4.8
const FIT_HEIGHT = 2.6
const FRAME_WIDTH = 5.8

/**
 * Where things stand, read from whatever room was loaded:
 *  - our room (or one edited from its .blend: it still has SR_Walls) → the
 *    demo plan, exactly;
 *  - no room (showRoom off) → the demo plan on a neutral stage;
 *  - any other room → measured: centre and radius from its walls (meshes taller
 *    than half a metre), floor at their foot, and the plinths either where the
 *    model says (empties named Spot_1, Spot_2, Spot_3) or on the demo's three
 *    angles, scaled to the room.
 * `s` scales what is car-sized (≤ 1: a big hall keeps real-size cars), `sr`
 * scales the walk in and out (the room's own size).
 */
function readLayout(THREE, room) {
  const demo = (y) => ({
    cx: 0,
    cz: 0,
    floor: 0,
    r: DEMO_ROOM_R,
    s: 1,
    sr: 1,
    stations: STATION_PHI.map((phi) => ({ phi, r: STATION_R, y })),
  })
  if (!room) return demo(PLINTH_TOP)
  let ours = false
  const spots = []
  room.updateMatrixWorld(true)
  room.traverse((node) => {
    if (node.name === 'SR_Walls') ours = true
    const m = /^spot[\s_.-]*(\d+)/i.exec(node.name)
    if (m) spots.push({ n: Number(m[1]), p: node.getWorldPosition(new THREE.Vector3()) })
  })
  if (ours && !spots.length) return demo(PLINTH_TOP)

  const walls = new THREE.Box3()
  const part = new THREE.Box3()
  const size = new THREE.Vector3()
  room.traverse((node) => {
    if (!node.isMesh) return
    part.setFromObject(node)
    part.getSize(size)
    if (size.y > 0.5) walls.union(part)
  })
  if (walls.isEmpty()) walls.setFromObject(room)
  const centre = walls.getCenter(new THREE.Vector3())
  walls.getSize(size)
  const r = Math.max(0.5, Math.min(size.x, size.z) / 2)
  // Cars keep their real size down to a ~16 m room; below that, everything shrinks with it.
  const s = Math.min(1, Math.max(0.05, (1.3 * r) / DEMO_ROOM_R))
  const floor = walls.min.y
  const fromSpots = spots
    .sort((a, b) => a.n - b.n)
    .slice(0, 3)
    .map(({ p }) => ({ phi: Math.atan2(p.x - centre.x, p.z - centre.z), r: Math.hypot(p.x - centre.x, p.z - centre.z), y: p.y }))
  // Always three stations: the model's spots first, the demo's angles after.
  const stations = [0, 1, 2].map((k) => fromSpots[k] || { phi: STATION_PHI[k], r: STATION_R * Math.min(1, r / DEMO_ROOM_R), y: floor })
  return { cx: centre.x, cz: centre.z, floor, r, s, sr: r / DEMO_ROOM_R, stations }
}

/**
 * Puts any model on a plinth: long side along Z (the plinth's length), centred,
 * standing on the floor, at a size the camera can frame.
 */
function fitToPlinth(THREE, object, s = 1) {
  const box = new THREE.Box3()
  const size = new THREE.Vector3()
  const measure = () => {
    object.updateMatrixWorld(true)
    box.setFromObject(object)
    box.getSize(size)
  }
  measure()
  if (size.x > size.z * 1.15) {
    object.rotation.y += Math.PI / 2
    measure()
  }
  const length = Math.max(size.x, size.z)
  if (!(length > 0)) return
  // A real-size car keeps its size (shrunk with a small room, all by the same
  // factor); anything else is scaled to a car's length.
  let k = length >= CAR_LENGTH[0] && length <= CAR_LENGTH[1] ? s : (FIT_LENGTH * s) / length
  if (size.y * k > FIT_HEIGHT * s) k = (FIT_HEIGHT * s) / size.y
  if (k !== 1) {
    object.scale.multiplyScalar(k)
    measure()
  }
  const centre = box.getCenter(new THREE.Vector3())
  object.position.x -= centre.x
  object.position.z -= centre.z
  object.position.y -= box.min.y
}

const specRows = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((r) => r[0])
    .map(([label, value = '']) => ({ label, value }))

/** Scroll length of the tour, in screens. */
const tourLength = (count) => APPROACH + count * HOLD + Math.max(0, count - 1) * TRAVEL + EXIT

/**
 * Camera keyframes in polar form around the room centre:
 * { s (screens), cam: [phi, r, y], look: [phi, r, y] } — y is absolute.
 * In from +Z (the door), a stop beside each station looking across the room
 * at it (`need`: how far back the camera has to be for a car-wide frame),
 * then back to the wall, round to the door and out.
 */
function buildKeys(L, count, need = 7.5) {
  const TAU = Math.PI * 2
  const { s: k, sr, floor } = L
  const keys = []
  keys.push({ s: 0, cam: [TAU, 30 * sr, floor + 9 * sr], look: [Math.PI, 1.5 * sr, floor + 1.4 * sr] })
  keys.push({ s: APPROACH * 0.55, cam: [TAU, 11.2 * sr, floor + 1.7 * sr], look: [Math.PI, 2.5 * sr, floor + 1.1 * sr] })
  let s = APPROACH
  let camPhi = TAU
  for (let i = 0; i < count; i += 1) {
    const st = L.stations[i]
    // The camera stands across the centre from the station; its angle only
    // ever grows, so it turns round the room one way.
    const raw = st.phi + Math.PI
    camPhi = i === 0 ? raw + TAU * Math.round((TAU - raw) / TAU) : camPhi + ((((raw - camPhi) % TAU) + TAU) % TAU)
    const camR = Math.min(4.6 * k, Math.max(1.4 * k, need - st.r))
    const cam = [camPhi, camR, st.y + 1.16 * k]
    const look = [camPhi - Math.PI, st.r, st.y + 0.64 * k]
    if (i > 0) s += TRAVEL
    keys.push({ s, cam, look })
    s += HOLD
    keys.push({ s, cam, look })
  }
  // Leaving: step back to the wall and look over the room, follow the wall
  // round to the door with the eyes on the room, then back out of it.
  const last = count ? camPhi : TAU
  const door = Math.max(last + Math.PI / 3, Math.ceil((last + 1e-3) / TAU) * TAU)
  keys.push({ s: s + EXIT * 0.3, cam: [last, 7.6 * sr, floor + 2.5 * sr], look: [last + Math.PI, 0, floor + 1.0 * sr] })
  keys.push({ s: s + EXIT * 0.65, cam: [door, 8.8 * sr, floor + 2.1 * sr], look: [door + Math.PI, 0, floor + 0.9 * sr] })
  keys.push({ s: s + EXIT, cam: [door, 24 * sr, floor + 7 * sr], look: [door + Math.PI, 0, floor + 1.2 * sr] })
  return keys
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
const polar = ([phi, r, y], L, out) => out.set(L.cx + Math.sin(phi) * r, y, L.cz + Math.cos(phi) * r)

export default function Showroom({
  eyebrow = 'Showroom',
  title = 'Three cars, one room',
  intro = 'The whole range on the floor tonight. Walk around each one and read its sheet.',
  cars,
  sceneUrl,
  showRoom = 'on',
  showCars = 'on',
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
  const stateRef = useRef({ progress: 0, inspecting: false, active: -1 })
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
  // Off: only the room, the camera still walks past the three stations.
  const list = showCars === 'off' ? [] : edited.length ? edited : DEFAULT_CARS
  const stops = list.length || 3
  const total = tourLength(stops)
  // Off: no room, a neutral stage (floor, three plinths, studio reflections).
  const roomUrl = showRoom === 'off' ? '' : sceneUrl || '/apex/showroom/showroom.glb'
  const posterSrc = poster || showroomEntry
  const still = calm || failed
  const keysRef = useRef([])
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
      const [{ GLTFLoader }, { DRACOLoader }, { Reflector }, { RectAreaLightUniformsLib }, { RoomEnvironment }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/objects/Reflector.js'),
        import('three/examples/jsm/lights/RectAreaLightUniformsLib.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
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
      const ink = new THREE.Color(bg || '#020306')
      const scene = new THREE.Scene()
      scene.background = ink
      const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 120)

      const draco = new DRACOLoader().setDecoderPath(dracoPath)
      const loader = new GLTFLoader().setDRACOLoader(draco)
      const load = (url) => new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject))

      // A model that does not load (a wrong URL) leaves its plinth empty; only
      // a room that does not load drops the section to its still version.
      const [room, ...carScenes] = await Promise.all([
        roomUrl ? load(roomUrl) : null,
        ...list.map((c) => load(c.modelUrl).catch(() => new THREE.Group())),
      ])
      draco.dispose()
      if (disposed) return

      const L = readLayout(THREE, room)
      scene.fog = new THREE.Fog(ink, 18 * L.sr, 46 * Math.max(1, L.sr))
      camera.near = 0.05 * L.s
      camera.far = 120 * Math.max(1, L.sr)

      // The room. Baked parts are drawn as they came out of Blender (light
      // already in the texture); a room without baked light gets real lights.
      let floor = null
      let baked = 0
      if (room) {
        room.traverse((node) => {
          if (!node.isMesh) return
          const m = node.material
          const name = `${m?.name || ''} ${node.name}`
          if (/_baked/.test(name)) {
            baked += 1
            const map = m.map || m.emissiveMap
            node.material = new THREE.MeshBasicMaterial({ map, toneMapped: false })
            if (/SR_Floor/.test(name)) floor = node
          } else if (/Glass/i.test(name)) {
            node.material = new THREE.MeshBasicMaterial({ color: '#0b1220', transparent: true, opacity: 0.18, depthWrite: false })
          } else if (m?.emissive) {
            m.emissiveIntensity = 2.2
          }
        })
        // A room without baked light: the studio reflections are for the
        // objects; on the room's own surfaces they would wash it out.
        if (!baked) {
          room.traverse((node) => {
            if (node.isMesh && node.material && 'envMapIntensity' in node.material) node.material.envMapIntensity = 0.35
          })
        }
        scene.add(room)
      } else {
        // No room: a floor and three plinths with a line of light, in the
        // section's colours. Matte (Lambert): the area lights over the plinths
        // would paint a grey sheen over a glossy floor; the mirror gives the gloss.
        const stageFloor = new THREE.Mesh(
          new THREE.CircleGeometry(L.r, 96),
          new THREE.MeshLambertMaterial({ color: ink.clone().offsetHSL(0, 0, 0.02) }),
        )
        stageFloor.rotation.x = -Math.PI / 2
        scene.add(stageFloor)
        floor = stageFloor
        const plinthMat = new THREE.MeshLambertMaterial({ color: ink.clone().offsetHSL(0, 0, 0.05) })
        const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(fg || '#e8edf6'), toneMapped: false })
        L.stations.forEach((st) => {
          const x = L.cx + Math.sin(st.phi) * st.r
          const z = L.cz + Math.cos(st.phi) * st.r
          const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, PLINTH_TOP, 96), plinthMat)
          plinth.position.set(x, PLINTH_TOP / 2, z)
          const line = new THREE.Mesh(new THREE.TorusGeometry(3.005, 0.012, 8, 160), lineMat)
          line.rotation.x = Math.PI / 2
          line.position.set(x, PLINTH_TOP - 0.02, z)
          scene.add(plinth, line)
        })
      }

      // Reflections in the paint: our room, rendered once into an environment
      // map (its light rings show in the cars); any other room or none, a
      // neutral studio.
      const pmrem = new THREE.PMREMGenerator(renderer)
      let env
      if (room && baked) {
        const envScene = new THREE.Scene()
        envScene.add(room.clone())
        env = pmrem.fromScene(envScene, 0.03).texture
      } else {
        const studio = new RoomEnvironment()
        env = pmrem.fromScene(studio, 0.04).texture
        studio.traverse((n) => n.geometry?.dispose?.())
      }
      scene.environment = env
      pmrem.dispose()
      if (room && !baked) {
        scene.add(new THREE.HemisphereLight('#ffffff', '#30343c', 0.55))
        const sun = new THREE.DirectionalLight('#ffffff', 0.9)
        sun.position.set(L.cx + 4 * L.sr, L.floor + 9 * L.sr, L.cz + 6 * L.sr)
        scene.add(sun)
      }

      // Glossy floor: a mirror under the floor (desktop only).
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

      // The objects on their stations, side on to the centre (length tangent to the circle).
      const turn = []
      let longest = 0
      const measured = new THREE.Box3()
      carScenes.forEach((car, k) => {
        const st = L.stations[k]
        const holder = new THREE.Group()
        holder.position.set(L.cx + Math.sin(st.phi) * st.r, st.y, L.cz + Math.cos(st.phi) * st.r)
        holder.rotation.y = st.phi + Math.PI / 2
        fitToPlinth(THREE, car, L.s)
        const fitted = measured.setFromObject(car).getSize(new THREE.Vector3())
        longest = Math.max(longest, fitted.x, fitted.z)
        car.traverse((node) => {
          if (!node.isMesh || !node.material) return
          const m = node.material
          // LED strips (emissive strength > 1 in the GLB): flat light, outside tone
          // mapping, or AgX washes the red tail lights out to pink. Both faces: the
          // strips are thin ribbons laid on the body, their winding is not reliable.
          if (m.emissiveIntensity > 1) {
            node.material = new THREE.MeshBasicMaterial({ color: m.emissive.clone(), toneMapped: false, side: THREE.DoubleSide })
            m.dispose()
            return
          }
          m.envMapIntensity = 1.6
          // Blender exports a 2× specular for Principled defaults: back to physical.
          if (m.specularColor) m.specularColor.setScalar(1)
          if (m.isMeshPhysicalMaterial && m.clearcoat > 0) m.clearcoatRoughness = Math.min(m.clearcoatRoughness, 0.05)
        })
        holder.add(car)
        scene.add(holder)
        turn.push({ holder, base: holder.rotation.y, offset: 0, target: 0, vel: 0 })
      })

      // A soft light panel over each station (the area lights of the Blender
      // scene): it lights the paint and draws a long highlight on the roof.
      scene.add(new THREE.HemisphereLight('#9fb8ff', '#05070a', 0.25))
      L.stations.slice(0, carScenes.length).forEach((st) => {
        const x = L.cx + Math.sin(st.phi) * st.r
        const z = L.cz + Math.cos(st.phi) * st.r
        const panel = new THREE.RectAreaLight('#eef3ff', 7, 5.6 * L.s, 2.4 * L.s)
        panel.position.set(x, st.y + 3.96 * L.s, z)
        panel.lookAt(x, st.y, z)
        panel.rotation.z = st.phi + Math.PI / 2
        scene.add(panel)
        // a low rim from the room centre so the flank facing the camera reads
        const rim = new THREE.RectAreaLight('#dfe8ff', 2.2, 4.5 * L.s, 1.2 * L.s)
        rim.position.set(L.cx + (x - L.cx) * 0.35, st.y + 1.26 * L.s, L.cz + (z - L.cz) * 0.35)
        rim.lookAt(x, st.y + 0.66 * L.s, z)
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
        // The frame holds the longest object on show (a car-wide frame at least).
        const need = Math.max(FRAME_WIDTH * L.s, longest * 1.04) / 2 / Math.tan(half)
        keysRef.current = buildKeys(L, stops, need)
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
        polar(pose.cam, L, wantPos)
        polar(pose.look, L, wantLook)
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
  }, [still, roomUrl, dracoPath, carsKey, stops, showReflections, bg, fg]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {intro ? <p className="max-w-[40ch] px-[5vw] pt-8 text-[14px] leading-[1.5] opacity-80 md:px-[2.4vw] md:text-[max(14px,1vw)]">{intro}</p> : null}
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
          <p className="text-[11px] tracking-[0.16em] uppercase opacity-70 lg:text-[max(11px,0.6vw)]" style={LABEL}>{eyebrow}</p>
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
          className="apex-sr-close tpl-hit absolute top-[max(1.25rem,3svh)] right-[5vw] border border-current px-[1em] py-[0.62em] text-[11px] tracking-[0.16em] uppercase md:right-[2.4vw] lg:text-[max(11px,0.6vw)]"
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
      <p className="text-[11px] tracking-[0.16em] tabular-nums uppercase opacity-60 lg:text-[max(11px,0.6vw)]" style={LABEL}>
        {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
      </p>
      <p className="mt-1.5 text-[1.05rem] md:text-[clamp(1.2rem,2vw,1.8rem)] leading-[1.05] font-medium tracking-[-0.02em]" style={DISPLAY}>
        {car.name}
      </p>
      <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 md:mt-4 md:gap-y-1.5 text-[11px] tracking-[0.12em] uppercase lg:text-[max(11px,0.6vw)]" style={LABEL}>
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
