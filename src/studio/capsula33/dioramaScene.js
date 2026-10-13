import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { gsap } from '../../lib/gsap'
import { createFrameBudget, fitCameraDistance, trackPointer } from '../../lib/motion'

/**
 * cāpsula33 — el local en miniatura, flotando en el espacio.
 *
 * El modelo sale de Blender con la luz de Cycles horneada en texturas (sombras,
 * rebotes, reflejos): acá se dibuja sin luces, con MeshBasicMaterial, así que
 * se ve como el render y corre en un teléfono. La pantalla de precios de la
 * barra es un canvas vivo; el bloom suma el resplandor del neón.
 *
 * - Arrastrar gira el local (con inercia); tocar una zona la elige.
 * - `setProgress(p)` lleva la cámara por las estaciones del recorrido: 0 es la
 *   vista general, 1 la última estación. La página lo maneja con el scroll.
 *
 * Coordenadas de Blender (z arriba); `b2t` las pasa a three (y arriba).
 */

const BASE = '/studio/capsula33/'
const b2t = ([x, y, z]) => new THREE.Vector3(x, z, -y)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)

/** Baja un archivo contando bytes, para que el loader muestre un progreso real. */
async function fetchBytes(url, onBytes) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || !total) {
    const buf = await res.arrayBuffer()
    onBytes(buf.byteLength, buf.byteLength)
    return buf
  }
  const reader = res.body.getReader()
  const chunks = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    got += value.byteLength
    onBytes(got, total)
  }
  const out = new Uint8Array(got)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.byteLength
  }
  return out.buffer
}

async function textureFrom(buffer, type = 'image/webp') {
  const bitmap = await createImageBitmap(new Blob([buffer], { type }), { imageOrientation: 'none' })
  const tex = new THREE.Texture(bitmap)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

/** La pantalla de precios de la barra: LCD oscuro con filas en celeste. */
function createPriceScreen({ items, width, height }) {
  const W = 512
  const H = Math.round((W * height) / width)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const rowH = Math.max(34, Math.round(H / 12))
  let offset = 0
  let last = 0
  const draw = (t) => {
    if (t - last < 60) return
    last = t
    offset = (offset + 1.1) % (rowH * items.length)
    ctx.fillStyle = '#04070d'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0f2a44'
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
    ctx.font = `600 ${Math.round(rowH * 0.62)}px 'Chakra Petch', monospace`
    ctx.fillStyle = '#ff7a1a'
    ctx.fillText('ELEGIDOS', 24, rowH * 0.95)
    ctx.fillRect(24, rowH * 1.2, W - 48, 2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, rowH * 1.4, W, H - rowH * 1.4)
    ctx.clip()
    ctx.font = `500 ${Math.round(rowH * 0.5)}px 'Roboto Mono', monospace`
    for (let i = 0; i < items.length * 2; i += 1) {
      const [name, price] = items[i % items.length]
      const y = rowH * 2.2 + i * rowH - offset
      if (y < rowH || y > H + rowH) continue
      ctx.fillStyle = '#7fd4ff'
      ctx.fillText(name, 24, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#c9ecff'
      ctx.fillText(price, W - 24, y)
      ctx.textAlign = 'left'
    }
    ctx.restore()
    tex.needsUpdate = true
  }
  draw(1000)
  return { tex, draw }
}

/** Campo de estrellas en capas, alrededor del local. */
function createStars(center) {
  const group = new THREE.Group()
  const layers = [
    { count: 1800, rMin: 60, rMax: 140, size: 0.32, opacity: 0.85 },
    { count: 500, rMin: 30, rMax: 60, size: 0.22, opacity: 0.6 },
  ]
  for (const L of layers) {
    const pos = new Float32Array(L.count * 3)
    const col = new Float32Array(L.count * 3)
    for (let i = 0; i < L.count; i += 1) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const r = L.rMin + Math.random() * (L.rMax - L.rMin)
      const s = Math.sqrt(1 - u * u)
      pos.set([center.x + r * s * Math.cos(th), center.y + r * u, center.z + r * s * Math.sin(th)], i * 3)
      const warm = Math.random()
      const c = warm > 0.85 ? [1, 0.72, 0.5] : warm < 0.15 ? [0.65, 0.8, 1] : [1, 1, 1]
      col.set(c, i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({ size: L.size, vertexColors: true, transparent: true, opacity: L.opacity, depthWrite: false })
    group.add(new THREE.Points(geo, mat))
  }
  return group
}

/** Nebulosas: dos manchas de luz muy suaves, lejos (naranja de la marca y un azul frío). */
function createNebula(center, viewDir) {
  const make = (rgb) => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, `rgba(${rgb},0.35)`)
    grad.addColorStop(0.4, `rgba(${rgb},0.08)`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }))
  }
  const group = new THREE.Group()
  const back = center.clone().addScaledVector(viewDir, -110)
  const a = make('228,96,29')
  a.position.copy(back).add(new THREE.Vector3(-34, 18, 10))
  a.scale.setScalar(60)
  const b = make('61,100,140')
  b.position.copy(back).add(new THREE.Vector3(38, -14, -16))
  b.scale.setScalar(70)
  group.add(a, b)
  return group
}

/** La plataforma: un anillo holográfico con marcas, debajo del local. */
function createRing(center) {
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.55 })
  const circle = (r, seg = 256) => {
    const pts = []
    for (let i = 0; i <= seg; i += 1) {
      const a = (i / seg) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat)
  }
  group.add(circle(8.9), circle(9.8))
  const ticks = []
  for (let i = 0; i < 144; i += 1) {
    const a = (i / 144) * Math.PI * 2
    const long = i % 12 === 0
    const r0 = 8.9
    const r1 = long ? 9.8 : 9.25
    ticks.push(new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1))
  }
  const tickMat = new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.35 })
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), tickMat))
  group.position.set(center.x, -1.1, center.z)
  return group
}

export function createDioramaScene({
  canvas,
  mount,
  manifest,
  stations,
  prices,
  calm = false,
  onProgress = () => {},
  onHover = () => {},
  onDrag = () => {},
  onPick = () => {},
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050506) // pasa por la gestión de color (el clear color no)
  const camera = new THREE.PerspectiveCamera(20, 1, 0.5, 400)
  const pivot = new THREE.Group() // gira con el arrastre y respira con el puntero
  scene.add(pivot)

  const TARGET = b2t(manifest.target)
  const VIEW_DIR = new THREE.Vector3()
  const rest = { pos: new THREE.Vector3(), look: TARGET.clone() }
  const look = TARGET.clone()

  scene.add(createStars(TARGET))
  const nebula = createNebula(TARGET, b2t(manifest.viewDir).normalize())
  scene.add(nebula)
  const ring = createRing(TARGET)
  scene.add(ring)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // Solo el neón y lo que ya está al blanco: radio corto para no lavar el negro.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.3, 0.92))
  composer.addPass(new OutputPass())

  const budget = createFrameBudget({
    dpr,
    apply: (value) => {
      renderer.setPixelRatio(value)
      resize()
    },
  })

  // Estaciones: la vista general (0, con la órbita de la persona), una toma
  // por zona y la salida (la cámara se aleja y mira al espacio).
  const view = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  const exit = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  const poses = [view, ...stations.map((s) => ({ pos: b2t(s.cam.pos), look: b2t(s.cam.look) })), exit]
  const zoneBoxes = stations.map((s, i) => {
    const a = b2t(s.zone.min)
    const b = b2t(s.zone.max)
    return { index: i + 1, station: s, box: new THREE.Box3(a.clone().min(b), a.clone().max(b)) }
  })
  const zonesBySize = [...zoneBoxes].sort((a, b) => {
    const va = a.box.getSize(new THREE.Vector3())
    const vb = b.box.getSize(new THREE.Vector3())
    return va.x * va.y * va.z - vb.x * vb.y * vb.z
  })

  function frameRest() {
    const layout = camera.aspect < 0.8 && manifest.tall ? { ...manifest, ...manifest.tall } : manifest
    VIEW_DIR.copy(b2t(layout.viewDir)).normalize()
    rest.look.copy(TARGET)
    rest.look.y += layout.lookLift ?? 0
    const dist = fitCameraDistance({ fov: camera.fov, aspect: camera.aspect, radius: layout.radius, base: layout.distance, fill: 0.92 })
    rest.dist = dist
    rest.pos.copy(rest.look).addScaledVector(VIEW_DIR, dist)
    rest.azimuth = Math.atan2(VIEW_DIR.x, VIEW_DIR.z)
    rest.elevation = Math.asin(VIEW_DIR.y)
    // La cámara no sale del cuadrante de las paredes abiertas (−90°…0°): así
    // nunca ve el dorso de la pared de la barra ni el de la pared del fondo.
    LIM.yaw = [-1.42 - rest.azimuth, -0.14 - rest.azimuth]
    // Salida: se aleja y levanta la vista; el local baja y queda atrás.
    exit.pos.copy(rest.look).addScaledVector(VIEW_DIR, dist * 2.2)
    exit.look.copy(rest.look).add(new THREE.Vector3(0, dist * 1.25, 0))
  }

  // Órbita de la vista general, con topes: es un corte (dos paredes abiertas),
  // así que nunca se ve de atrás; el zoom acerca hasta la mitad, no más.
  const LIM = { yaw: [-0.6, 0.6], elev: [0.3, 1.25], zoom: [0.5, 1.15] }
  const orbit = { yaw: 0, elev: 0, zoom: 1, tYaw: 0, tElev: 0, tZoom: 1 }
  const clampTo = (v, [a, b]) => Math.min(b, Math.max(a, v))
  function orbitPose(out) {
    const az = rest.azimuth + orbit.yaw
    const el = clampTo(rest.elevation + orbit.elev, LIM.elev)
    const d = rest.dist * orbit.zoom
    out.look.copy(rest.look)
    out.pos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(rest.look)
  }

  function resize() {
    const w = mount.clientWidth
    const h = mount.clientHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    frameRest()
  }

  const state = { mode: 'intro', progress: 0, hover: null, ready: false }

  // --- carga ---------------------------------------------------------------
  let screen = null
  const pickable = []
  const files = [manifest.model, ...Object.values(manifest.atlases)]
  const loaded = new Map(files.map((f) => [f, { got: 0, total: 0 }]))
  const report = () => {
    let got = 0
    let total = 0
    for (const v of loaded.values()) {
      got += v.got
      total += v.total || v.got || 1
    }
    onProgress(total ? Math.min(1, got / total) : 0)
  }

  const draco = new DRACOLoader().setDecoderPath(`${BASE}draco/`)
  const gltfLoader = new GLTFLoader().setDRACOLoader(draco)

  const load = Promise.all(
    files.map((f) =>
      fetchBytes(BASE + f, (got, total) => {
        loaded.set(f, { got, total })
        report()
      }),
    ),
  ).then(async ([modelBuf, ...atlasBufs]) => {
    const atlasNames = Object.keys(manifest.atlases)
    const atlases = {}
    await Promise.all(atlasNames.map(async (name, i) => (atlases[name] = await textureFrom(atlasBufs[i]))))
    const gltf = await gltfLoader.parseAsync(modelBuf, BASE)
    const root = gltf.scene
    const glass = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false })
    root.traverse((o) => {
      if (!o.isMesh) return
      // Una malla con varios materiales llega como grupo: los datos van en el padre.
      const data = o.userData.c33 ? o.userData : o.parent?.userData || {}
      const kind = data.c33
      const prev = o.material
      if (kind === 'bake') {
        o.material = new THREE.MeshBasicMaterial({ map: atlases[data.atlas || atlasNames[0]] })
        pickable.push(o)
      } else if (kind === 'foliage') {
        o.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
      } else if (kind === 'glass') {
        o.material = glass
      } else if (kind === 'flat') {
        const c = prev.emissive && prev.emissive.getHex() ? prev.emissive : prev.color
        o.material = new THREE.MeshBasicMaterial({ color: c.clone() })
      } else if (kind === 'screen') {
        const box = new THREE.Box3().setFromObject(o)
        const size = box.getSize(new THREE.Vector3())
        screen = createPriceScreen({ items: prices, width: size.x, height: size.y })
        o.material = new THREE.MeshBasicMaterial({ color: 0x04070d })
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.94, size.y * 0.94), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }))
        plane.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + 0.004)
        o.parent.add(plane)
      }
      if (prev && prev !== o.material && prev.dispose) prev.dispose()
    })
    pivot.add(root)
    pivot.position.copy(TARGET)
    root.position.sub(TARGET)
    resize()
    state.ready = true
    state.mode = calm ? 'rest' : 'intro'
    placeIntroStart()
  })

  // --- puntero: arrastrar orbita, pellizcar acerca, tocar elige --------------
  const pointer = trackPointer()
  const ndc = new THREE.Vector2()
  const ray = new THREE.Raycaster()
  const press = { down: false, id: null, x: 0, y: 0, lastX: 0, lastY: 0, dragging: false }
  const pinch = { on: false, d0: 0, z0: 1 }

  const overview = () => state.mode === 'rest' && state.progress < 0.02

  function zoneAt(clientX, clientY) {
    if (!pickable.length) return null
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(pickable, false)[0]
    if (!hit) return null
    // Las zonas están escritas con el local quieto: se deshace el balanceo.
    const p = pivot.worldToLocal(hit.point.clone()).add(TARGET)
    return zonesBySize.find((z) => z.box.containsPoint(p)) || null
  }

  const setHover = (z) => {
    if (z?.index === state.hover?.index) return
    state.hover = z
    onHover(z ? z.station : null)
  }

  const zoomTo = (z) => {
    orbit.tZoom = clampTo(z, LIM.zoom)
  }

  const onDown = (e) => {
    if (!overview() || pinch.on) return
    press.down = true
    press.id = e.pointerId
    press.x = press.lastX = e.clientX
    press.y = press.lastY = e.clientY
    press.dragging = false
  }
  const onMove = (e) => {
    if (press.down && e.pointerId === press.id && !pinch.on) {
      const dx = e.clientX - press.lastX
      const dy = e.clientY - press.lastY
      if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
        press.dragging = true
        canvas.setPointerCapture?.(e.pointerId)
        onDrag(true)
        setHover(null)
      }
      if (press.dragging) {
        orbit.tYaw = clampTo(orbit.tYaw - dx * 0.006, LIM.yaw)
        orbit.tElev = clampTo(rest.elevation + orbit.tElev + dy * 0.004, LIM.elev) - rest.elevation
      }
      press.lastX = e.clientX
      press.lastY = e.clientY
      return
    }
    if (e.pointerType === 'touch' || !overview()) return
    setHover(zoneAt(e.clientX, e.clientY))
  }
  const onUp = (e) => {
    if (!press.down || e.pointerId !== press.id) return
    const wasDrag = press.dragging
    press.down = false
    press.dragging = false
    if (wasDrag) {
      onDrag(false)
      return
    }
    const z = zoneAt(e.clientX, e.clientY)
    if (z) onPick(z.index)
  }
  const onLeave = () => setHover(null)
  // Ctrl + rueda (y el pellizco del trackpad, que llega así): zoom. La rueda
  // sola sigue siendo el scroll del recorrido.
  const onWheel = (e) => {
    if (!e.ctrlKey || !overview()) return
    e.preventDefault()
    zoomTo(orbit.tZoom * Math.exp(e.deltaY * 0.004))
  }
  // Dos dedos: zoom (uno solo sigue scrolleando la página).
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
  const onTouchStart = (e) => {
    if (e.touches.length === 2 && overview()) {
      pinch.on = true
      pinch.d0 = touchDist(e.touches)
      pinch.z0 = orbit.tZoom
      press.down = false
      press.dragging = false
    }
  }
  const onTouchMove = (e) => {
    if (!pinch.on || e.touches.length < 2) return
    e.preventDefault()
    zoomTo(pinch.z0 * (pinch.d0 / Math.max(1, touchDist(e.touches))))
  }
  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinch.on = false
  }
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: true })

  // --- intro ----------------------------------------------------------------
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() }

  // Llega desde lejos y arriba, como una nave que se acerca al módulo.
  function placeIntroStart() {
    cam.pos.copy(rest.pos).addScaledVector(VIEW_DIR, 60)
    cam.pos.y += 18
    cam.look.copy(rest.look).add(new THREE.Vector3(0, -3, 0))
  }

  function intro() {
    if (calm || !state.ready) {
      state.mode = 'rest'
      return
    }
    state.mode = 'intro'
    placeIntroStart()
    gsap.to(cam.pos, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: 3.2, ease: 'expo.out' })
    gsap.to(cam.look, {
      x: rest.look.x,
      y: rest.look.y,
      z: rest.look.z,
      duration: 3.2,
      ease: 'expo.out',
      onComplete: () => {
        state.mode = 'rest'
      },
    })
  }

  // --- bucle ----------------------------------------------------------------
  const tmpA = new THREE.Vector3()
  const tmpB = new THREE.Vector3()
  let raf = 0
  let last = performance.now()
  const clock = new THREE.Clock()
  function tick(now) {
    raf = requestAnimationFrame(tick)
    const dt = now - last
    last = now
    const t = clock.getElapsedTime()

    // La órbita sigue a su objetivo con suavidad; fuera de la vista general
    // vuelve sola al encuadre de siempre.
    const away = state.progress > 0.02
    if (away || calm) {
      orbit.tYaw = 0
      orbit.tElev = 0
      orbit.tZoom = 1
    }
    orbit.yaw += (orbit.tYaw - orbit.yaw) * 0.1
    orbit.elev += (orbit.tElev - orbit.elev) * 0.1
    orbit.zoom += (orbit.tZoom - orbit.zoom) * 0.1
    orbitPose(view)

    if (state.mode === 'intro') {
      camera.position.copy(cam.pos)
      look.copy(cam.look)
    } else {
      // El recorrido: 0 la vista general; cada entero, una estación; el último,
      // la salida. Entre dos estaciones la cámara se queda un rato y viaja.
      const T = state.progress * (poses.length - 1)
      const i = Math.min(poses.length - 2, Math.floor(T))
      const f = T - i
      const e = smoother(clamp01((f - 0.18) / 0.64))
      tmpA.lerpVectors(poses[i].pos, poses[i + 1].pos, e)
      tmpB.lerpVectors(poses[i].look, poses[i + 1].look, e)
      camera.position.copy(tmpA)
      look.copy(tmpB)
    }

    // Un balanceo chico con el puntero y la flotación.
    const sway = !calm && !away && !press.dragging
    pivot.rotation.y += ((sway ? pointer.x * 0.05 : 0) - pivot.rotation.y) * 0.05
    pivot.rotation.x += ((sway ? pointer.y * 0.02 : 0) - pivot.rotation.x) * 0.05
    pivot.position.y = TARGET.y + (calm ? 0 : Math.sin(t * 0.7) * 0.08)

    ring.rotation.y = t * 0.04
    nebula.rotation.z = t * 0.01
    camera.lookAt(look)
    // En pantalla ancha el cuadro se corre: en la vista general el local va a la
    // derecha (la frase está a la izquierda); en las estaciones, a la izquierda
    // (el panel está a la derecha).
    if (camera.aspect > 1.1) {
      const w = mount.clientWidth
      const h = mount.clientHeight
      const k = smoother(clamp01(state.progress * (poses.length - 1) * 2.5))
      const shift = (-0.1 + k * 0.24) * w
      camera.setViewOffset(w, h, shift, 0, w, h)
    } else if (camera.view) camera.clearViewOffset()
    screen?.draw(now)
    composer.render()
    budget.tick(dt)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(mount)
  resize()
  raf = requestAnimationFrame(tick)

  return {
    load,
    intro,
    setProgress(p) {
      state.progress = p
      if (p > 0.02) setHover(null)
    },
    /** Botones de zoom: factor relativo (0.8 acerca, 1.25 aleja). */
    zoomBy(f) {
      if (overview()) zoomTo(orbit.tZoom * f)
    },
    resetView() {
      orbit.tYaw = 0
      orbit.tElev = 0
      orbit.tZoom = 1
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      pointer.dispose()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      draco.dispose()
      scene.traverse((o) => {
        o.geometry?.dispose()
        if (o.material) {
          o.material.map?.dispose()
          o.material.dispose()
        }
      })
      composer.dispose?.()
      renderer.dispose()
    },
  }
}
