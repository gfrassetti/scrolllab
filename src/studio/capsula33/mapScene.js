import * as THREE from 'three'
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
    id: 'jardin',
    img: '/studio/capsula33/zones/jardin.webp',
    label: 'Jardín',
    box: [[-7.5, -3, 0], [-3.9, -1, 3.2]],
    kicker: 'Pulmón de manzana',
    title: 'El jardín',
  },
  {
    id: 'vitrinas',
    img: '/studio/capsula33/zones/vitrinas.webp',
    label: 'Vitrinas',
    box: [[-9.6, 2.2, 0], [-4.05, 3, 3]],
    kicker: 'La colección',
    title: 'Las vitrinas',
  },
  {
    id: 'mesas',
    img: '/studio/capsula33/zones/mesas.webp',
    label: 'Mesas',
    box: [[-9.5, -3, 0], [-7.55, -0.93, 1.3]],
    kicker: 'Al entrar',
    title: 'Las mesas de la entrada',
  },
  {
    id: 'pantalla',
    label: 'Menú',
    box: null, // sale de la malla de la pantalla
    kicker: 'Cafetería',
    title: 'El menú',
    prices: true,
  },
  {
    id: 'barra',
    img: '/studio/capsula33/zones/barra.webp',
    label: 'Barra',
    box: [[-1.0, 0.15, 0], [3.2, 3, 3.1]],
    kicker: 'Café de especialidad',
    title: 'La barra',
  },
  {
    id: 'salon',
    img: '/studio/capsula33/zones/salon.webp',
    label: 'Salón',
    box: [[-3.8, -3, 0], [6, 0.4, 2.9]],
    kicker: 'Un lugar para reunirse',
    title: 'El salón',
  },
]

export const MAP_BG = '#0b0c0f'

// El ojo de buey en la foto de la fachada (u, v desde arriba a la izquierda; r en fracción del ancho).
const PORT = { u: 0.166, v: 0.55, r: 0.075, aspect: 1400 / 640 }
// La pared de la entrada en el modelo: 6 m de ancho, centrada; el piso en y = 0; la cara de afuera en x ≈ −9,7.
const FACADE = { w: 6.0, floor: 0, x: -9.75 }
const ISO = new THREE.Vector3(-0.62, 0.92, 1).normalize() // de la esquina de la entrada, abierto al salón
const TOP = new THREE.Vector3(0, 1, 0.0001)
// En el teléfono (pantalla vertical) se mira más de frente a la fachada: el largo del local
// corre hacia el fondo y el diorama llena el alto en vez de quedar como una tira angosta.
const ISO_PHONE = new THREE.Vector3(-1.9, 1.35, 0.78).normalize()
const isoFor = (w) => (w < 640 ? ISO_PHONE : ISO)
// Topes del giro (absolutos): de la fachada de la entrada (-74°) a apenas pasado el frente; de
// casi a ras del piso a casi desde arriba.
const LIMIT = { az: [-1.85, 0.25], el: [0.2, 1.3], zoom: [1, 1.8] } // hasta ver la fachada de frente (−90°) y un poco más
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (t) => t * t * (3 - 2 * t)

/**
 * @param {{ canvas: HTMLCanvasElement, area: () => { x:number, y:number, w:number, h:number }, onProgress?: (p:number)=>void, onReady?: ()=>void, onHover?: (id:string|null)=>void, onFrame?: ()=>void }} opts
 *   `area`: el rectángulo de la pantalla (px CSS) donde tiene que entrar el diorama.
 */
export function createMapScene({ canvas, area, onProgress = () => {}, onReady = () => {}, onHover = () => {}, onDrag = () => {}, onFrame = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(maxDpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  const budget = createFrameBudget({
    dpr: maxDpr,
    apply: (d) => {
      renderer.setPixelRatio(d)
      resize()
    },
  })

  // yaw/elev/zoom: lo que la persona giró y acercó (t* es el objetivo, se sigue con suavidad).
  const state = { rise: 0, px: 0, py: 0, hover: null, active: null, yaw: 0, elev: 0, zoom: 1, tYaw: 0, tElev: 0, tZoom: 1 }
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

    // La fachada real sobre la pared de la entrada (la misma del pasillo: cartel, ojo de buey,
    // puerta de ventanas en pastilla y ventanal con listones). Va dentro del modelo, así se
    // levanta con él.
    new THREE.TextureLoader().load('/studio/capsula33/facade-front-1400.webp', (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      // Apoyada en el piso y del ancho de la pared de la entrada (Blender: y −3 … 3, z desde 0), igual
      // que la usa pipeline/c33-entrance-match.py para calzar la puerta, el ojo de buey y el ventanal
      // de adentro con los de afuera.
      const aspect = 2418 / 1105
      const w = FACADE.w
      const h = w / aspect
      const facade = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.02 }))
      facade.rotation.y = -Math.PI / 2 // mira hacia afuera (−x), como la entrada
      facade.position.set(FACADE.x, FACADE.floor + h / 2, 0) // pegada a la cara de afuera de la pared
      r.root.add(facade)
      // El ojo de buey (en la foto: centro en 16,6 % × 55 %, radio 7,5 % del ancho) late con un aro
      // naranja: es la puerta del easter egg.
      const pr = PORT.r * w
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(pr * 0.9, pr * 1.18, 48),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      ring.position.set((PORT.u - 0.5) * w, (0.5 - PORT.v) * h, 0.01)
      // Las dos son transparentes: el aro se dibuja después de la foto (si no, la foto lo tapa).
      facade.renderOrder = 1
      ring.renderOrder = 2
      facade.add(ring)
      parts.facade = facade
      parts.portRing = ring
    })

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
  const aim = (d) => {
    camera.position.copy(parts.center).addScaledVector(d, 80)
    camera.lookAt(parts.center)
    camera.updateMatrixWorld()
  }
  const fit = () => {
    if (!parts.bounds) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const rise = smooth(clamp01(state.rise))
    // De arriba (plano) a la esquina (isométrico). El tamaño se mide con esta vista base, así
    // el local no cambia de tamaño mientras la persona lo gira.
    dir.copy(TOP).lerp(isoFor(w), rise).normalize()
    up.set(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), rise).normalize()
    camera.up.copy(up)
    aim(dir)
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
    // Unidades por px; el zoom de la persona acerca alrededor del centro del área (no de la pantalla).
    const k = Math.max((maxX - minX) / A.w, (maxY - minY) / A.h) / state.zoom
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const acx = A.x + A.w / 2
    const acy = A.y + A.h / 2
    camera.left = cx - acx * k
    camera.right = camera.left + w * k
    camera.top = cy + acy * k
    camera.bottom = camera.top - h * k
    camera.updateProjectionMatrix()
    // Ahora sí, el giro de la persona (y un poco el puntero) sobre la vista base, con topes:
    // es un corte con dos paredes abiertas, nunca se ve de atrás.
    if (rise > 0.5) {
      const k2 = (rise - 0.5) * 2
      let az = Math.atan2(dir.x, dir.z) + (state.yaw + state.px * 0.05) * k2
      let el = Math.asin(dir.y) + (state.elev - state.py * 0.03) * k2
      az = Math.min(LIMIT.az[1], Math.max(LIMIT.az[0], az))
      el = Math.min(LIMIT.el[1], Math.max(LIMIT.el[0], el))
      dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      aim(dir)
    }
  }

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
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

  /** ¿El puntero está sobre el ojo de buey de la fachada (y nada lo tapa)? */
  const portAt = (clientX, clientY) => {
    if (!built || !parts.facade || state.rise < 0.92) return false
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects([parts.facade, ...room.pickable], false)[0]
    if (!hit || hit.object !== parts.facade || !hit.uv) return false
    const dx = (hit.uv.x - PORT.u) / PORT.r
    const dy = ((1 - hit.uv.y - PORT.v) / PORT.r) / PORT.aspect
    return dx * dx + dy * dy < 1.15
  }

  // --- girar y acercar ----------------------------------------------------------
  // Arrastrar gira (en el teléfono, solo de costado: lo vertical sigue scrolleando la página);
  // Ctrl + rueda o el pellizco acercan. Un toque sin arrastrar sigue eligiendo zona.
  const press = { id: null, x: 0, y: 0, lx: 0, ly: 0, drag: false, touch: false, justDragged: false }
  const pinch = { on: false, d0: 0, z0: 1 }
  const clampT = () => {
    const iso = isoFor(canvas.clientWidth)
    const base = Math.atan2(iso.x, iso.z)
    const baseEl = Math.asin(iso.y)
    state.tYaw = Math.min(LIMIT.az[1] - base, Math.max(LIMIT.az[0] - base, state.tYaw))
    state.tElev = Math.min(LIMIT.el[1] - baseEl, Math.max(LIMIT.el[0] - baseEl, state.tElev))
    state.tZoom = Math.min(LIMIT.zoom[1], Math.max(LIMIT.zoom[0], state.tZoom))
  }
  const canOrbit = () => built && state.rise > 0.92
  const onDown = (e) => {
    if (!canOrbit() || pinch.on) return
    press.id = e.pointerId
    press.x = press.lx = e.clientX
    press.y = press.ly = e.clientY
    press.drag = false
    press.touch = e.pointerType === 'touch'
  }
  const onMove = (e) => {
    if (e.pointerId !== press.id || pinch.on) return
    const dx = e.clientX - press.lx
    const dy = e.clientY - press.ly
    if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
      press.drag = true
      canvas.setPointerCapture?.(e.pointerId)
      setHover(null)
      onDrag(true)
    }
    if (press.drag) {
      state.tYaw -= dx * 0.0065
      if (!press.touch) state.tElev += dy * 0.004
      clampT()
    }
    press.lx = e.clientX
    press.ly = e.clientY
  }
  const onUp = (e) => {
    if (e.pointerId !== press.id) return
    press.id = null
    if (press.drag) {
      press.drag = false
      onDrag(false)
      press.justDragged = true
      setTimeout(() => (press.justDragged = false), 0)
    }
  }
  const onWheel = (e) => {
    if (!canOrbit()) return
    if (!e.ctrlKey) {
      const A = area()
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      if (x < A.x || x > A.x + A.w || y < A.y || y > A.y + A.h) return
      const zoomIn = e.deltaY < 0
      if ((zoomIn && state.tZoom >= LIMIT.zoom[1] - 0.001) || (!zoomIn && state.tZoom <= LIMIT.zoom[0] + 0.001)) return
    }
    e.preventDefault()
    // Que Lenis no la tome como scroll (lo revisa más arriba, en el mismo evento).
    canvas.setAttribute('data-lenis-prevent-wheel', '')
    requestAnimationFrame(() => canvas.removeAttribute('data-lenis-prevent-wheel'))
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    state.tZoom *= Math.exp(-dy * (e.ctrlKey ? 0.0025 : 0.0016))
    clampT()
  }
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
  const onTouchStart = (e) => {
    if (e.touches.length === 2 && canOrbit()) {
      pinch.on = true
      pinch.d0 = touchDist(e.touches)
      pinch.z0 = state.tZoom
      press.id = null
    }
  }
  const onTouchMove = (e) => {
    if (!pinch.on || e.touches.length < 2) return
    e.preventDefault()
    state.tZoom = pinch.z0 * (touchDist(e.touches) / Math.max(1, pinch.d0))
    clampT()
  }
  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinch.on = false
  }
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: true })

  const setHover = (id) => {
    if (id === state.hover) return
    state.hover = id
    onHover(id)
  }

  // --- bucle ------------------------------------------------------------------
  const v = new THREE.Vector3()
  let raf = 0
  let last = performance.now()
  // Fuera de pantalla no se dibuja.
  let onScreen = false
  const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting))
  io.observe(canvas)
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (!onScreen) {
      last = now
      return
    }
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
      if (parts.portRing) {
        // Late suave siempre; con el puntero encima se enciende.
        const target = state.portHover ? 1 : 0.45 + 0.4 * Math.sin(now * 0.004)
        parts.portRing.material.opacity += (target * rise - parts.portRing.material.opacity) * 0.2
      }
      room.screen?.draw(now)
      state.yaw += (state.tYaw - state.yaw) * 0.12
      state.elev += (state.tElev - state.elev) * 0.12
      state.zoom += (state.tZoom - state.zoom) * 0.12
      fit()
    }
    renderer.render(scene, camera)
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
    /** Hubo arrastre recién (el click que lo termina no tiene que elegir zona). */
    dragged: () => press.justDragged || press.drag,
    /** Botones de zoom: factor relativo. */
    zoomBy(f) {
      state.tZoom *= f
      clampT()
    },
    resetView() {
      state.tYaw = 0
      state.tElev = 0
      state.tZoom = 1
    },
    zoneAt,
    portAt,
    setHover,
    labelAt,
    zoneIds: () => parts.zones.map((z) => z.zone.id),
    dispose() {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      room?.dispose()
      scene.traverse((o) => {
        if (o.isMesh || o.isLineSegments) {
          o.geometry?.dispose()
          ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose())
        }
      })
      renderer.dispose()
    },
  }
}
