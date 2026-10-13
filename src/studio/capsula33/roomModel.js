import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

/**
 * cāpsula33 — el local en miniatura (Blender) listo para dibujar.
 *
 * El modelo trae la luz de Cycles horneada en dos atlas: se dibuja sin luces,
 * con MeshBasicMaterial, así que se ve como el render y corre en un teléfono.
 * La pantalla de la barra es un canvas vivo con los precios reales.
 *
 * Coordenadas de Blender (z arriba); `b2t` las pasa a three (y arriba).
 */

const BASE = '/studio/capsula33/'
export const b2t = ([x, y, z]) => new THREE.Vector3(x, z, -y)

/** La pantalla LED de la barra, con los precios que tiene hoy el local. */
export const PRICES = {
  calientes: [
    ['Americano', '4800'],
    ['Lágrima', '4500'],
    ['Flat white', '5500'],
    ['Capuccino', '6000'],
    ['Latte', '5500'],
    ['Chocolate', '6500'],
    ['Golden milk', '6500'],
  ],
  frios: [
    ['Americano', '5500'],
    ['Latte', '6000'],
    ['Affogato', '6500'],
  ],
}

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

async function textureFrom(buffer) {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/webp' }), { imageOrientation: 'none' })
  const tex = new THREE.Texture(bitmap)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** LCD oscuro con las filas en celeste que se desplazan, como la pantalla del local. */
function createPriceScreen({ width, height }) {
  const rows = [['CALIENTES', ''], ...PRICES.calientes, ['FRÍOS', ''], ...PRICES.frios]
  const W = 512
  const H = Math.round((W * height) / width)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const rowH = Math.max(34, Math.round(H / 10))
  let offset = 0
  let last = 0
  const draw = (t) => {
    if (t - last < 60) return
    last = t
    offset = (offset + 1) % (rowH * rows.length)
    ctx.fillStyle = '#04070d'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0f2a44'
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
    ctx.font = `600 ${Math.round(rowH * 0.62)}px 'Chakra Petch', monospace`
    ctx.fillStyle = '#ff7a1a'
    ctx.fillText('CAFETERÍA', 24, rowH * 0.95)
    ctx.fillRect(24, rowH * 1.2, W - 48, 2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, rowH * 1.4, W, H - rowH * 1.4)
    ctx.clip()
    ctx.font = `500 ${Math.round(rowH * 0.5)}px 'Roboto Mono', monospace`
    for (let i = 0; i < rows.length * 2; i += 1) {
      const [name, price] = rows[i % rows.length]
      const y = rowH * 2.2 + i * rowH - offset
      if (y < rowH || y > H + rowH) continue
      ctx.fillStyle = price ? '#7fd4ff' : '#ff7a1a'
      ctx.fillText(name, 24, y)
      if (price) {
        ctx.textAlign = 'right'
        ctx.fillStyle = '#c9ecff'
        ctx.fillText(price, W - 24, y)
        ctx.textAlign = 'left'
      }
    }
    ctx.restore()
    tex.needsUpdate = true
  }
  draw(1000)
  return { tex, draw }
}

/**
 * Baja y arma el local. `onProgress` recibe 0–1 por bytes reales.
 * Devuelve { root, pickable, screen, screenBox, dispose }.
 */
export async function loadRoom({ onProgress = () => {} } = {}) {
  const manifest = { model: 'room.glb', atlases: { shell: 'bake-shell.webp', props: 'bake-props.webp' } }
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
  const [modelBuf, ...atlasBufs] = await Promise.all(
    files.map((f) =>
      fetchBytes(BASE + f, (got, total) => {
        loaded.set(f, { got, total })
        report()
      }),
    ),
  )
  const atlasNames = Object.keys(manifest.atlases)
  const atlases = {}
  await Promise.all(atlasNames.map(async (name, i) => (atlases[name] = await textureFrom(atlasBufs[i]))))
  const gltf = await gltfLoader.parseAsync(modelBuf, BASE)
  draco.dispose()
  const root = gltf.scene
  const pickable = []
  let screen = null
  let screenBox = null
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
      screen = createPriceScreen({ width: size.x, height: size.y })
      screenBox = box
      o.material = new THREE.MeshBasicMaterial({ color: 0x04070d })
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.94, size.y * 0.94), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }))
      plane.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + 0.004)
      o.parent.add(plane)
    }
    if (prev && prev !== o.material && prev.dispose) prev.dispose()
  })
  return {
    root,
    pickable,
    screen,
    screenBox,
    dispose() {
      root.traverse((o) => {
        o.geometry?.dispose()
        if (o.material) {
          o.material.map?.dispose()
          o.material.dispose()
        }
      })
    },
  }
}
