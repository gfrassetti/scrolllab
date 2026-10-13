import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { createFrameBudget } from '../../lib/motion'
import { b2t, loadRoom } from './roomModel'

/**
 * cāpsula33 — el mapa vivo del local (capítulo 2), a la manera de un diorama
 * isométrico: cámara ortográfica de esquina, el local sobre una losa, zonas que
 * se iluminan al pasar el puntero y etiquetas que las nombran.
 *
 * `state.rise` (0–1, lo maneja el scroll): 0 es el plano visto desde arriba con
 * las paredes aplastadas; 1, el diorama en isométrico con todo levantado.
 *
 * Coordenadas de Blender en las zonas (x: de la entrada −9,6 al fondo 6; y: del
 * salón −3 a la pared de la barra 3; z arriba).
 */

export const ZONES = [
  {
    id: 'entrada',
    label: 'Entrada',
    box: [[-10, -3, 0], [-8.05, 3, 3.2]],
    kicker: 'Av. Gral. Roca 1120',
    title: 'La entrada',
    text: 'Pasando la puerta, la mesa naranja; después, el jardín a la derecha y la colección a la izquierda.',
  },
  {
    id: 'jardin',
    label: 'Jardín',
    box: [[-8, -3, 0], [-4.4, -1, 3.2]],
    kicker: 'Pulmón de manzana',
    title: 'El jardín',
    text: 'Plantas dentro de una caja blanca con arcos negros. Se ve desde el pasillo de entrada y desde el salón.',
  },
  {
    id: 'vitrinas',
    label: 'Vitrinas',
    box: [[-9.6, 2.2, 0], [-2.05, 3, 3]],
    kicker: 'La colección',
    title: 'Las vitrinas',
    text: 'Las figuras de cine del dueño, en vitrinas de ojo de buey. Algunas, a la altura de los más chicos.',
  },
  {
    id: 'pantalla',
    label: 'Pantalla',
    box: null, // sale de la malla de la pantalla
    kicker: 'Cafetería',
    title: 'La pantalla',
    text: 'Los precios de hoy, como los muestra la pantalla LED de la barra.',
    prices: true,
  },
  {
    id: 'barra',
    label: 'Barra',
    box: [[-1.0, 0.15, 0], [3.2, 3, 3.1]],
    kicker: 'Café de especialidad',
    title: 'La barra',
    text: 'Abajo, la luz de la barra plisada; arriba, el pasillo de neón y el cartel colgante.',
  },
  {
    id: 'salon',
    label: 'Salón',
    box: [[-4.3, -3, 0], [6, 0.4, 2.9]],
    kicker: 'Un lugar para reunirse',
    title: 'El salón',
    text: 'Mesas bajo las espirales de luz, hasta la pared naranja de los arcos.',
  },
]

export const MAP_BG = '#0b0c0f'
const ISO = new THREE.Vector3(-0.62, 0.92, 1).normalize() // de la esquina de la entrada, abierto al salón
const TOP = new THREE.Vector3(0, 1, 0.0001)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (t) => t * t * (3 - 2 * t)

/**
 * @param {{ canvas: HTMLCanvasElement, area: () => { x:number, y:number, w:number, h:number }, onProgress?: (p:number)=>void, onReady?: ()=>void, onHover?: (id:string|null)=>void, onFrame?: ()=>void }} opts
 *   `area`: el rectángulo de la pantalla (px CSS) donde tiene que entrar el diorama.
 */
export function createMapScene({ canvas, area, onProgress = () => {}, onReady = () => {}, onHover = () => {}, onFrame = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(maxDpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(MAP_BG) // opaco: el bloom no se lleva bien con el fondo transparente
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.3, 0.9))
  composer.addPass(new OutputPass())
  const budget = createFrameBudget({
    dpr: maxDpr,
    apply: (d) => {
      renderer.setPixelRatio(d)
      resize()
    },
  })

  const state = { rise: 0, px: 0, py: 0, hover: null, active: null }
  const world = new THREE.Group()
  scene.add(world)
  const parts = { zones: [] }
  let built = false
  let room = null

  const zoneBox = ([a, b]) => {
    const p = b2t(a)
    const q = b2t(b)
    return new THREE.Box3(p.clone().min(q), p.clone().max(q))
  }

  loadRoom({ onProgress }).then((r) => {
    room = r
    world.add(r.root)
    const bounds = new THREE.Box3().setFromObject(r.root)
    parts.bounds = bounds
    parts.center = bounds.getCenter(new THREE.Vector3())

    // La losa: el local apoyado sobre un bloque oscuro con el borde de luz naranja.
    const size = bounds.getSize(new THREE.Vector3())
    const slabH = 0.9
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(size.x + 0.6, slabH, size.z + 0.6),
      [0x1a1b20, 0x1a1b20, 0x24252b, 0x0d0e11, 0x15161a, 0x15161a].map((c) => new THREE.MeshBasicMaterial({ color: c })),
    )
    slab.position.set(parts.center.x, bounds.min.y - slabH / 2 - 0.01, parts.center.z)
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.5 }))
    edge.position.copy(slab.position)
    world.add(slab, edge)

    // Zonas: caja para el puntero, contorno que se enciende y el punto donde va la etiqueta.
    const lineMat = () => new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0 })
    for (const z of ZONES) {
      let box
      if (z.box) box = zoneBox(z.box)
      else if (r.screenBox) box = r.screenBox.clone().expandByScalar(0.25)
      else continue
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...box.getSize(new THREE.Vector3()).toArray())), lineMat())
      outline.position.copy(box.getCenter(new THREE.Vector3()))
      world.add(outline)
      const c = box.getCenter(new THREE.Vector3())
      const anchor = new THREE.Vector3(c.x, box.max.y + 0.35, c.z)
      const vol = box.getSize(new THREE.Vector3())
      parts.zones.push({ zone: z, box, outline, anchor, glow: 0, volume: vol.x * vol.y * vol.z })
    }
    parts.zones.sort((a, b) => a.volume - b.volume) // la más chica gana (la pantalla dentro de la barra)
    built = true
    resize()
    onReady()
  })

  // --- encuadre ---------------------------------------------------------------
  const dir = new THREE.Vector3()
  const up = new THREE.Vector3()
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3())
  const fit = () => {
    if (!parts.bounds) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const rise = smooth(clamp01(state.rise))
    // De arriba (plano) a la esquina (isométrico); el puntero corre apenas la vista.
    dir.copy(TOP).lerp(ISO, rise).normalize()
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.px * 0.06 * rise)
    dir.y += state.py * 0.03 * rise
    dir.normalize()
    up.set(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), rise).normalize()
    camera.up.copy(up)
    camera.position.copy(parts.center).addScaledVector(dir, 80)
    camera.lookAt(parts.center)
    camera.updateMatrixWorld()
    // Lo que ocupa el diorama visto desde acá (la losa incluida).
    const b = parts.bounds
    let i = 0
    for (const x of [b.min.x - 0.3, b.max.x + 0.3])
      for (const y of [b.min.y - 0.9, b.max.y])
        for (const z of [b.min.z - 0.3, b.max.z + 0.3]) corners[i++].set(x, y, z).applyMatrix4(camera.matrixWorldInverse)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const v of corners) {
      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    }
    const A = area()
    const k = Math.max((maxX - minX) / A.w, (maxY - minY) / A.h) // unidades por px
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const acx = A.x + A.w / 2
    const acy = A.y + A.h / 2
    camera.left = cx - acx * k
    camera.right = camera.left + w * k
    camera.top = cy + acy * k
    camera.bottom = camera.top - h * k
    camera.updateProjectionMatrix()
  }

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    fit()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  // --- puntero ----------------------------------------------------------------
  const ndc = new THREE.Vector2()
  const ray = new THREE.Raycaster()
  const zoneAt = (clientX, clientY) => {
    if (!built || state.rise < 0.92) return null
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(room.pickable, false)[0]
    if (!hit) return null
    return parts.zones.find((z) => z.box.containsPoint(hit.point))?.zone.id ?? null
  }

  const setHover = (id) => {
    if (id === state.hover) return
    state.hover = id
    onHover(id)
  }

  // --- bucle ------------------------------------------------------------------
  const v = new THREE.Vector3()
  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    budget.tick(now - last)
    last = now
    if (built) {
      const rise = smooth(clamp01(state.rise))
      // Del plano al diorama: las paredes y los muebles se levantan desde el piso.
      room.root.scale.y = 0.02 + 0.98 * rise
      for (const z of parts.zones) {
        const on = z.zone.id === state.hover || z.zone.id === state.active ? 1 : 0
        z.glow += (on - z.glow) * 0.15
        z.outline.material.opacity = z.glow * 0.9
        z.outline.scale.y = room.root.scale.y
        z.outline.position.y = z.box.getCenter(v).y * room.root.scale.y
      }
      room.screen?.draw(now)
      fit()
    }
    composer.render()
    if (built) onFrame()
  }
  raf = requestAnimationFrame(frame)

  /** Dónde cae en pantalla la etiqueta de una zona (px CSS). */
  const labelAt = (id) => {
    const z = parts.zones.find((q) => q.zone.id === id)
    if (!z) return null
    v.copy(z.anchor)
    v.y *= room.root.scale.y
    v.project(camera)
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (1 - (v.y * 0.5 + 0.5)) * canvas.clientHeight }
  }

  return {
    state,
    zoneAt,
    setHover,
    labelAt,
    zoneIds: () => parts.zones.map((z) => z.zone.id),
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      room?.dispose()
      scene.traverse((o) => {
        if (o.isMesh || o.isLineSegments) {
          o.geometry?.dispose()
          ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose())
        }
      })
      composer.dispose?.()
      renderer.dispose()
    },
  }
}
