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
 * cāpsula33 — el diorama del local.
 *
 * El modelo sale de Blender con la luz de Cycles horneada en texturas (sombras,
 * rebotes, reflejos): acá se dibuja sin luces, con MeshBasicMaterial, así que
 * se ve como el render y corre en un teléfono. Lo que tiene que vivir (la
 * pantalla de precios) se dibuja en un canvas. El bloom suma el resplandor
 * del neón, que el horneado no trae.
 *
 * Coordenadas: las zonas se escriben en las de Blender (x, y, z con z arriba),
 * que es donde se diseñó el local; `b2t` las pasa a las de three (y arriba).
 */

const BASE = '/studio/capsula33/'

const b2t = ([x, y, z]) => new THREE.Vector3(x, z, -y)

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
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1) // líneas de barrido
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

/** El titular, como un cartel enorme detrás del diorama (el modelo lo tapa en parte). */
function createHeadline(lines, { fonts }) {
  const W = 2048
  const H = 760
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 330px ${fonts.display}`
  lines.forEach(([text, color], i) => {
    ctx.fillStyle = color
    ctx.fillText(text, W / 2, 330 + i * 330)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), mat)
  mesh.renderOrder = -1
  return mesh
}

export function createDioramaScene({
  canvas,
  mount,
  manifest,
  zones,
  headline,
  prices,
  fonts,
  calm = false,
  onProgress = () => {},
  onReady = () => {},
  onHover = () => {},
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070708) // pasa por la gestión de color (el clear color no)
  const camera = new THREE.PerspectiveCamera(20, 1, 0.5, 200)
  const pivot = new THREE.Group() // gira con el puntero; el titular queda afuera (parallax)
  scene.add(pivot)

  // Encuadre de reposo. TARGET es el centro del local (el pivote del giro); la
  // cámara mira un poco más arriba o más abajo según la pantalla. En una
  // pantalla ancha, la vista isométrica desde la esquina de la entrada; en una
  // vertical (teléfono), mirando el local a lo largo desde la puerta, que así
  // ocupa el alto en vez de quedar como una tira angosta.
  const TARGET = b2t(manifest.target)
  const VIEW_DIR = new THREE.Vector3()
  const rest = { pos: new THREE.Vector3(), look: TARGET.clone() }
  const look = TARGET.clone()
  let layout = manifest

  let headlineMesh = null
  if (headline) {
    headlineMesh = createHeadline(headline, { fonts })
    scene.add(headlineMesh)
  }

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // Solo el neón y lo que ya está al blanco: radio corto para no lavar el negro.
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.25, 0.94)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const budget = createFrameBudget({
    dpr,
    apply: (value) => {
      renderer.setPixelRatio(value)
      resize()
    },
  })

  function frameRest() {
    layout = camera.aspect < 0.8 && manifest.tall ? { ...manifest, ...manifest.tall } : manifest
    VIEW_DIR.copy(b2t(layout.viewDir)).normalize()
    rest.look.copy(TARGET)
    rest.look.y += layout.lookLift ?? 0
    const dist = fitCameraDistance({ fov: camera.fov, aspect: camera.aspect, radius: layout.radius, base: layout.distance, fill: 0.92 })
    rest.pos.copy(rest.look).addScaledVector(VIEW_DIR, dist)
    if (headlineMesh) {
      // Detrás del local, de frente a la cámara, más ancho que el diorama.
      headlineMesh.position.copy(rest.look).addScaledVector(VIEW_DIR, -9)
      headlineMesh.position.y += layout.headlineLift ?? 1.4
      headlineMesh.lookAt(rest.pos)
      // Que entre siempre de borde a borde, con aire a los costados.
      const depth = rest.pos.distanceTo(headlineMesh.position)
      const visibleH = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const visibleW = visibleH * camera.aspect
      // Ancho de borde a borde, pero sin pasar del 42 % del alto (pantallas anchas y bajas).
      const ratio = headlineMesh.geometry.parameters.height // alto / ancho del cartel
      const w = Math.min(visibleW * (camera.aspect > 1 ? 0.9 : 0.94), (visibleH * 0.42) / ratio)
      headlineMesh.scale.set(w, w, 1)
    }
  }

  function resize() {
    const w = mount.clientWidth
    const h = mount.clientHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    frameRest()
    if (state.mode === 'rest') camera.position.copy(rest.pos)
  }

  const state = { mode: 'intro', hover: null, progress: 0, dive: 0 }
  const zoneBoxes = zones.map((z) => {
    const a = b2t(z.min)
    const b = b2t(z.max)
    return { zone: z, box: new THREE.Box3(a.clone().min(b), a.clone().max(b)) }
  })

  // --- carga ---------------------------------------------------------------
  let screen = null
  const files = [manifest.model, ...Object.values(manifest.atlases)]
  const loaded = new Map()
  const report = () => {
    let got = 0
    let total = 0
    for (const v of loaded.values()) {
      got += v.got
      total += v.total || v.got || 1
    }
    onProgress(total ? Math.min(1, got / total) : 0)
  }
  files.forEach((f) => loaded.set(f, { got: 0, total: 0 }))

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
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.16, depthWrite: false })
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
    state.mode = calm ? 'rest' : 'intro'
    if (calm) camera.position.copy(rest.pos)
    else placeIntroStart() // detrás de las compuertas ya está en el punto de partida
    onReady()
  })

  // --- interacción ---------------------------------------------------------
  const pointer = trackPointer()
  const ndc = new THREE.Vector2()
  const ray = new THREE.Raycaster()
  const tmp = new THREE.Vector3()

  // El puntero toca el modelo (no el aire): se busca el punto exacto y la zona
  // que lo contiene, de la más chica a la más grande. El follaje no cuenta.
  const pickable = []
  const bySize = () => [...zoneBoxes].sort((a, b) => volume(a.box) - volume(b.box))
  const volume = (b) => {
    const s = b.getSize(tmp)
    return s.x * s.y * s.z
  }
  let ordered = null
  function zoneAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(pickable, false)[0]
    if (!hit) return null
    // Las zonas están escritas con el local quieto: se deshace el giro del puntero.
    const p = pivot.worldToLocal(hit.point.clone()).add(TARGET)
    ordered = ordered || bySize()
    return ordered.find((z) => z.box.containsPoint(p)) || null
  }

  function screenOf(z) {
    const c = z.box.getCenter(new THREE.Vector3()).sub(TARGET)
    c.y = z.box.max.y - TARGET.y
    c.applyMatrix4(pivot.matrixWorld)
    c.project(camera)
    const r = canvas.getBoundingClientRect()
    return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height }
  }

  const onMove = (e) => {
    if (state.mode !== 'rest' || e.pointerType === 'touch') return
    const z = zoneAt(e.clientX, e.clientY)
    if (z?.zone.id !== state.hover?.zone.id) {
      state.hover = z
      canvas.style.cursor = z ? 'pointer' : ''
    }
    onHover(z ? z.zone : null, z ? screenOf(z) : null)
  }
  const onLeave = () => {
    state.hover = null
    canvas.style.cursor = ''
    onHover(null, null)
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)

  // --- intro y vuelos -------------------------------------------------------
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() }

  // Llega desde arriba y lejos, como una nave que baja sobre el local.
  function placeIntroStart() {
    const from = rest.pos.clone().addScaledVector(VIEW_DIR, 18)
    from.y += 14
    cam.pos.copy(from)
    cam.look.copy(rest.look).add(new THREE.Vector3(0, -2, 0))
  }

  function intro() {
    if (calm) return
    state.mode = 'intro'
    placeIntroStart()
    gsap.to(cam.pos, { x: rest.pos.x, y: rest.pos.y, z: rest.pos.z, duration: 2.6, ease: 'expo.out' })
    gsap.to(cam.look, {
      x: rest.look.x,
      y: rest.look.y,
      z: rest.look.z,
      duration: 2.6,
      ease: 'expo.out',
      onComplete: () => {
        state.mode = 'rest'
      },
    })
  }

  /** Vuela a una zona (el mismo lugar al que lleva el scroll) y avisa al llegar. */
  function dive(id, done) {
    const z = zoneBoxes.find((x) => x.zone.id === id)
    if (!z || calm) {
      done?.()
      return
    }
    state.mode = 'dive'
    state.hover = null
    onHover(null, null)
    const center = z.box.getCenter(new THREE.Vector3())
    const station = z.zone.station
    const toLook = station ? b2t(station.look) : center
    const toPos = station ? b2t(station.pos) : center.clone().addScaledVector(VIEW_DIR, 6)
    cam.pos.copy(camera.position)
    cam.look.copy(look)
    const tl = gsap.timeline({ onComplete: () => done?.() })
    tl.to(pivot.rotation, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' }, 0)
    tl.to(cam.look, { x: toLook.x, y: toLook.y, z: toLook.z, duration: 1.5, ease: 'power3.inOut' }, 0)
    tl.to(cam.pos, { x: toPos.x, y: toPos.y, z: toPos.z, duration: 1.5, ease: 'power3.inOut' }, 0)
  }

  function reset() {
    state.mode = 'rest'
    camera.position.copy(rest.pos)
    look.copy(rest.look)
  }

  // --- bucle ----------------------------------------------------------------
  let raf = 0
  let last = performance.now()
  const clock = new THREE.Clock()
  function tick(now) {
    raf = requestAnimationFrame(tick)
    const dt = now - last
    last = now
    const t = clock.getElapsedTime()
    if (state.mode === 'intro' || state.mode === 'dive') {
      camera.position.copy(cam.pos)
      look.copy(cam.look)
    } else if (state.mode === 'rest') {
      // Respira y sigue al puntero; al salir del hero sube y se aleja.
      const p = state.progress
      camera.position.copy(rest.pos)
      camera.position.y += p * 3
      look.copy(rest.look)
      look.y += p * 2.4
      if (!calm) {
        pivot.rotation.y += (pointer.x * 0.16 - pivot.rotation.y) * 0.05
        pivot.rotation.x += (pointer.y * 0.04 - pivot.rotation.x) * 0.05
        pivot.position.y = TARGET.y + Math.sin(t * 0.7) * 0.08
      }
    }
    camera.lookAt(look)
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
    dive,
    reset,
    pick(e) {
      if (state.mode !== 'rest') return null
      const z = zoneAt(e.clientX, e.clientY)
      return z ? z.zone : null
    },
    setProgress(p) {
      state.progress = p
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      pointer.dispose()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
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
