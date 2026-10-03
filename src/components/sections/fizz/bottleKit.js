import * as THREE from 'three'

/**
 * FIZZ bottle kit — the glass bottle every FIZZ section draws: the model (GLB
 * or a lathe stand-in), its materials, the studio light, the screen print and
 * the wear on the glass. HeroBubbles and FlavorWorlds share it, so the bottle
 * is the same object all the way down the page.
 *
 * Mesh names the kit dresses: glass, liquid, label, stopper, seal, wire (or
 * cap for a crown cap). Any other GLB keeps its own materials.
 */

export const FOAM = '#fff3e2'

const gltfLoaderMod = () => import('three/examples/jsm/loaders/GLTFLoader.js')
const dracoLoaderMod = () => import('three/examples/jsm/loaders/DRACOLoader.js')
const hdrLoaderMod = () => import('three/examples/jsm/loaders/HDRLoader.js')

const LABEL_ARC = (70 * Math.PI) / 180

// Stand-in bottle (centimetres) for when no GLB is passed: same silhouette as
// public/fizz/soda-bottle.glb, without the flutes and the crimped cap.
const GLASS_PROFILE = [
  [0, 0.42],
  [1.4, 0.36],
  [2.3, 0.12],
  [2.72, 0],
  [2.95, 0.12],
  [3.05, 0.5],
  [3.05, 1.1],
  [3, 1.5],
  [3, 4.6],
  [3.07, 4.75],
  [3.07, 4.95],
  [3, 5.1],
  [3, 10.3],
  [3.07, 10.45],
  [3.07, 10.65],
  [3, 10.8],
  [2.98, 11.4],
  [2.84, 12.6],
  [2.52, 13.9],
  [2.1, 15.2],
  [1.72, 16.5],
  [1.46, 17.8],
  [1.34, 19.2],
  [1.3, 20.6],
  [1.3, 21.3],
  [1.5, 21.45],
  [1.58, 21.7],
  [1.58, 22],
  [1.46, 22.2],
  [1.4, 22.45],
  [1.48, 22.65],
  [1.5, 22.9],
  [1.42, 23.05],
  [1.2, 23.1],
  [0, 23.1],
]
const CAP_PROFILE = [
  [1.8, 22.3],
  [1.78, 22.35],
  [1.66, 22.6],
  [1.62, 22.95],
  [1.52, 23.2],
  [1.3, 23.36],
  [0.9, 23.42],
  [0, 23.42],
]
const LIQUID_BOX = { y0: 0.0103, y1: 0.17, radius: 0.0267 }

const lerp = (a, b, t) => a + (b - a) * t

export function buildStandInBottle() {
  const points = (profile) => profile.map(([r, y]) => new THREE.Vector2(r * 0.01, y * 0.01))
  const group = new THREE.Group()
  const add = (name, geometry) => {
    const mesh = new THREE.Mesh(geometry)
    mesh.name = name
    group.add(mesh)
    return mesh
  }
  add('glass', new THREE.LatheGeometry(points(GLASS_PROFILE), 64))
  add('cap', new THREE.LatheGeometry(points(CAP_PROFILE), 48))
  const label = add(
    'label',
    new THREE.CylinderGeometry(0.0302, 0.0302, 0.048, 40, 1, true, -LABEL_ARC, LABEL_ARC * 2),
  )
  label.position.y = 0.077
  group.userData.liquid = LIQUID_BOX
  group.userData.labelFlipY = true
  return group
}

/** Soft boxes around the bottle: what the glass has to reflect. */
export function buildStudioEnv(renderer, tint) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  // Casi negro: el vidrio necesita algo oscuro que reflejar para tener bordes.
  envScene.background = new THREE.Color(0x05060e)

  const softbox = (w, h, intensity, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(intensity, intensity, intensity),
        side: THREE.DoubleSide,
      }),
    )
    mesh.position.set(x, y, z)
    mesh.lookAt(0, 0, 0)
    envScene.add(mesh)
  }
  softbox(1.8, 11, 16, -6, 1, 3.5)
  softbox(0.55, 11, 12, -2.8, 0.5, 6.5)
  softbox(1.1, 11, 9, 6.5, 0, -2)
  softbox(0.45, 11, 8, 3.4, 0.5, 6)
  softbox(6, 2.6, 7, 0, 7, 1)
  softbox(9, 2, 1.1, 0, -5, 6)
  // El color del escenario, detrás: lo que el vidrio ve al otro lado.
  const stage = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(0.7) }),
  )
  stage.position.set(0, 0, -11)
  envScene.add(stage)

  const envMap = pmrem.fromScene(envScene, 0.02).texture
  envScene.traverse((n) => {
    n.geometry?.dispose?.()
    n.material?.dispose?.()
  })
  pmrem.dispose()
  return envMap
}

export function disposeObject(root) {
  root.traverse((n) => {
    n.geometry?.dispose?.()
    const mats = Array.isArray(n.material) ? n.material : [n.material]
    mats.forEach((m) => {
      if (!m) return
      m.map?.dispose?.()
      m.dispose?.()
    })
  })
}

/**
 * Screen print straight on the glass, in white ink, like a returnable bottle:
 * a bubble emblem, `canLabel` as the wordmark and a little small print. The
 * texture is transparent; the glass shows through everywhere else.
 */
export function drawPrint(brand, { family, subtitle = 'SPARKLING SODA' }) {
  const S = 2048
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const cx = S / 2
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  const track = (px) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
  }

  // Bubbles rising out of the wordmark.
  ;[
    [cx - 170, 700, 46],
    [cx - 30, 590, 74],
    [cx + 120, 690, 40],
    [cx + 205, 520, 30],
    [cx - 150, 470, 24],
    [cx + 40, 405, 18],
    [cx - 60, 330, 11],
  ].forEach(([x, y, r]) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.lineWidth = Math.max(6, r * 0.16)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(x - r * 0.38, y - r * 0.38, r * 0.22, r * 0.13, -Math.PI / 4, 0, Math.PI * 2)
    ctx.fill()
  })

  const text = String(brand || '').toUpperCase()
  track(0)
  ctx.font = `800 100px ${family}`
  const size = Math.min(380, ((S * 0.56) / Math.max(ctx.measureText(text).width, 1)) * 100)
  ctx.font = `800 ${size}px ${family}`
  ctx.fillText(text, cx, 1080)

  ctx.fillRect(cx - S * 0.19, 1150, S * 0.38, 7)
  track(20)
  ctx.font = `700 58px ${family}`
  ctx.fillText(String(subtitle).toUpperCase(), cx + 10, 1265)
  track(14)
  ctx.font = `500 44px ${family}`
  ctx.fillText('EST. 2026  ·  1 L  ·  RETURNABLE', cx + 7, 1345)

  // A short column of small print on the right, a number on the left.
  track(2)
  ctx.textAlign = 'left'
  ctx.font = `600 40px ${family}`
  ;['BUBBLES', 'FIRST,', 'QUESTIONS', 'LATER.', '', 'SERVE', 'ICE COLD.'].forEach((line, i) => {
    ctx.fillText(line, S * 0.79, 760 + i * 52)
  })
  ctx.save()
  ctx.translate(S * 0.2, 1000)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  track(16)
  ctx.font = `700 48px ${family}`
  ctx.fillText('N° 01  —  FIZZ CO.', 0, 0)
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16
  return texture
}

/**
 * Wear for the glass: smudges, a couple of fingerprints and fine scratches.
 * Barely there head-on, they light up when the bottle turns into the light.
 * Returns a roughness map and the normal map derived from the same marks.
 */
export function drawGlassWear() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)

  for (let i = 0; i < 30; i += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    const r = 30 + Math.random() * 120
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${0.08 + Math.random() * 0.16})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let f = 0; f < 4; f += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    for (let k = 0; k < 14; k += 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.1})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(x, y, 6 + k * 3.2, 4 + k * 2.4, 0.5, 0.2, Math.PI * 1.7)
      ctx.stroke()
    }
  }
  for (let i = 0; i < 170; i += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    const len = 8 + Math.random() * 110
    const a = (Math.random() - 0.5) * 0.7
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.55})`
    ctx.lineWidth = 0.5 + Math.random() * 1.1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }

  const height = ctx.getImageData(0, 0, S, S).data
  const rough = ctx.createImageData(S, S)
  const normal = ctx.createImageData(S, S)
  const h = (x, y) => height[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4
      const v = h(x, y)
      // Roughness lives in G: clean glass 0.04, smudges and scratches up to ~0.55.
      const r = Math.round((0.04 + v * 0.5) * 255)
      rough.data[i] = r
      rough.data[i + 1] = r
      rough.data[i + 2] = r
      rough.data[i + 3] = 255
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.4
      const dy = (h(x, y + 1) - h(x, y - 1)) * 2.4
      const len = Math.hypot(dx, dy, 1)
      normal.data[i] = Math.round((-dx / len) * 127.5 + 127.5)
      normal.data[i + 1] = Math.round((dy / len) * 127.5 + 127.5)
      normal.data[i + 2] = Math.round((1 / len) * 127.5 + 127.5)
      normal.data[i + 3] = 255
    }
  }
  const toTexture = (data) => {
    const c = document.createElement('canvas')
    c.width = S
    c.height = S
    c.getContext('2d').putImageData(data, 0, 0)
    const texture = new THREE.CanvasTexture(c)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    return texture
  }
  return { roughness: toTexture(rough), normal: toTexture(normal) }
}

/** One line of the headline as an alpha mask, sized to `targetWidth` CSS px. */
export function drawTitleLine(text, { family, weight, tracking, targetWidth, maxSize, dpr }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const setFont = (px) => {
    ctx.font = `${weight} ${px}px ${family}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px * tracking}px`
  }
  setFont(100)
  const size = Math.min(maxSize, (targetWidth / Math.max(ctx.measureText(text).width, 1)) * 100)
  setFont(size)
  const m = ctx.measureText(text)
  const pad = size * 0.08
  const width = m.width + pad * 2
  const height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2
  const scale = Math.min(dpr, 4096 / width)
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  ctx.scale(scale, scale)
  setFont(size)
  ctx.fillStyle = '#fff'
  ctx.fillText(text, pad, pad + m.actualBoundingBoxAscent)

  // Where each letter sits in the line, so every one can fly in on its own.
  const advance = (n) => ctx.measureText(text.slice(0, n)).width
  const cuts = []
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === ' ') continue
    // Cut along the glyph's own ink, so a neighbour's edge never rides along.
    const glyph = ctx.measureText(text[i])
    const origin = pad + advance(i + 1) - glyph.width
    const x0 = Math.max(0, origin - glyph.actualBoundingBoxLeft - 1)
    const x1 = Math.min(width, origin + glyph.actualBoundingBoxRight + 1)
    cuts.push({ x0, x1, u0: x0 / width, u1: x1 / width })
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  return { texture, width, height, cuts }
}

export const TITLE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Opaque on purpose: the glass only refracts what the opaque pass drew, so the
// headline lives in the canvas instead of the DOM. Each letter is its own quad
// reading its slice of the line (`uUv0`..`uUv1`); `uIn` fades it up as it lands.
export const TITLE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uUv0;
  uniform float uUv1;
  uniform float uIn;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(mix(uUv0, uUv1, vUv.x), vUv.y);
    float a = texture2D(map, uv).a * uFade * uIn;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uPaper, uInk, a), 1.0);
    #include <colorspace_fragment>
  }
`

/** Loads a GLB/GLTF (Draco-compressed or not) and resolves with its scene. */
export function loadBottleModel(url, dracoPath) {
  return Promise.all([gltfLoaderMod(), dracoLoaderMod()]).then(
    ([{ GLTFLoader }, { DRACOLoader }]) =>
      new Promise((resolve, reject) => {
        const draco = new DRACOLoader().setDecoderPath(dracoPath)
        new GLTFLoader().setDRACOLoader(draco).load(
          url,
          (gltf) => {
            draco.dispose()
            resolve(gltf.scene)
          },
          undefined,
          (error) => {
            draco.dispose()
            reject(error)
          },
        )
      }),
  )
}

/** Loads an equirectangular .hdr and resolves with a PMREM environment map. */
export function loadHdrEnv(renderer, url) {
  return hdrLoaderMod().then(
    ({ HDRLoader }) =>
      new Promise((resolve, reject) => {
        new HDRLoader().load(
          url,
          (texture) => {
            const pmrem = new THREE.PMREMGenerator(renderer)
            const env = pmrem.fromEquirectangular(texture).texture
            pmrem.dispose()
            texture.dispose()
            resolve(env)
          },
          undefined,
          reject,
        )
      }),
  )
}

/**
 * Materials + dressing for one bottle. `liquid` tints the drink, `stage` is
 * the color behind the bottle (it sets the milky veil and the seal). The
 * returned `colors` are live THREE.Colors: tween their r/g/b to change flavor.
 */
export function createBottle({ narrow = false, liquid, stage }) {
  const liquidUniforms = {
    uFizzFill: { value: 1e6 },
    uFizzEdge: { value: 0.001 },
    uFizzTint: { value: new THREE.Color(liquid) },
    // La capa lechosa: el color del escenario aclarado.
    uFizzVeil: { value: new THREE.Color(stage).lerp(new THREE.Color(0xffffff), 0.6) },
  }
  const wear = drawGlassWear()
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xf4fffa,
    transmission: 1,
    // La aspereza la pone el mapa: vidrio limpio y nítido, salvo huellas y rayones.
    roughness: 1,
    roughnessMap: wear.roughness,
    normalMap: wear.normal,
    normalScale: new THREE.Vector2(0.1, 0.1),
    ior: 1.5,
    thickness: 0.016,
    envMapIntensity: 1.25,
    specularIntensity: 1,
  })
  // El vidrio y el líquido no pueden ser dos mallas con transmisión (una
  // tapa a la otra): el líquido es un tinte del mismo vidrio por debajo de
  // la línea de llenado.
  glass.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, liquidUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vFizzY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFizzY = position.y;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vFizzY;\nuniform float uFizzFill;\nuniform float uFizzEdge;\nuniform vec3 uFizzTint;\nuniform vec3 uFizzVeil;',
      )
      .replace(
        '#include <transmission_fragment>',
        `#include <transmission_fragment>
        float fizzLiquid = 1.0 - smoothstep(uFizzFill - uFizzEdge, uFizzFill + uFizzEdge, vFizzY);
        float fizzLine = 1.0 - smoothstep(0.0, uFizzEdge * 4.0, abs(vFizzY - uFizzFill));
        totalDiffuse = mix(totalDiffuse, totalDiffuse * mix(vec3(1.0), uFizzTint, 0.35), fizzLiquid) + fizzLine * 0.22;
        totalDiffuse = mix(totalDiffuse, uFizzVeil, 0.05 + fizzLiquid * 0.12);`,
      )
  }
  const cap = new THREE.MeshStandardMaterial({
    color: FOAM,
    metalness: 0.85,
    roughness: 0.3,
    envMapIntensity: 1.2,
  })
  const stopper = new THREE.MeshPhysicalMaterial({
    color: 0xece6d8,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.85,
  })
  const seal = new THREE.MeshStandardMaterial({
    color: new THREE.Color(stage).multiplyScalar(0.5),
    roughness: 0.5,
  })
  const wire = new THREE.MeshStandardMaterial({
    color: 0xdcdde2,
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1.4,
  })
  // Serigrafía: tinta blanca sobre el vidrio. Va en la pasada transparente,
  // después del vidrio: si estuviera en la opaca, el vidrio la volvería a
  // refractar entre los trazos y se vería doble.
  const label = new THREE.MeshStandardMaterial({
    color: 0xf6f3ea,
    roughness: 0.38,
    envMapIntensity: 0.6,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })

  let labelFlipY = false
  let fizz = null

  /** Hilos de burbujas que suben por dentro del líquido. */
  const buildFizz = (host, box) => {
    const count = narrow ? 50 : 90
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial({ color: FOAM, toneMapped: false, transparent: true, opacity: 0.85 }),
      count,
    )
    const streams = Array.from({ length: 11 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.2 + Math.random() * 0.62,
    }))
    const items = Array.from({ length: count }, (_, i) => ({
      stream: streams[i % streams.length],
      t: Math.random(),
      speed: 0.2 + Math.random() * 0.22,
      size: (0.012 + Math.random() * 0.02) * box.radius,
      jitter: Math.random() * Math.PI * 2,
    }))
    const dummy = new THREE.Object3D()
    const span = box.y1 - box.y0
    const update = (time, dt) => {
      items.forEach((b, i) => {
        b.t += b.speed * dt
        if (b.t > 1) b.t -= 1
        // El hombro angosta la botella: las burbujas se cierran al subir.
        const reach = b.t < 0.78 ? 1 : lerp(1, 0.5, (b.t - 0.78) / 0.22)
        const r = b.stream.radius * box.radius * reach
        const a = b.stream.angle + Math.sin(time * 1.7 + b.jitter) * 0.12
        dummy.position.set(Math.cos(a) * r, box.y0 + span * b.t, Math.sin(a) * r)
        dummy.scale.setScalar(b.size * (0.55 + b.t * 0.6) * Math.min(1, (1 - b.t) * 12))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    update(0, 0)
    host.add(mesh)
    return { mesh, update }
  }

  return {
    materials: { glass, cap, stopper, seal, wire, label },
    /** Live colors to tween when the flavor changes. */
    colors: {
      tint: liquidUniforms.uFizzTint.value,
      veil: liquidUniforms.uFizzVeil.value,
      seal: seal.color,
    },

    /**
     * Puts the materials on a loaded model, scales it to height 1 and centers
     * it. `image` replaces the drawn print with the buyer's artwork.
     */
    dress(model, { image = '', isDisposed = () => false, onImage } = {}) {
      const glassMesh = model.getObjectByName('glass')
      if (glassMesh) {
        const liquidMesh = model.getObjectByName('liquid')
        let box = model.userData.liquid
        if (liquidMesh) {
          liquidMesh.visible = false
          liquidMesh.geometry.computeBoundingBox()
          const b = liquidMesh.geometry.boundingBox
          box = { y0: b.min.y, y1: b.max.y, radius: b.max.x }
        }
        glassMesh.material = glass
        if (box) {
          liquidUniforms.uFizzFill.value = box.y1
          liquidUniforms.uFizzEdge.value = (box.y1 - box.y0) * 0.006
          fizz = buildFizz(glassMesh.parent, box)
        }
        Object.entries({ cap, stopper, seal, wire }).forEach(([name, mat]) => {
          const part = model.getObjectByName(name)
          if (part) part.material = mat
        })
        const labelMesh = model.getObjectByName('label')
        if (labelMesh) {
          labelMesh.material = label
          labelFlipY = Boolean(model.userData.labelFlipY)
          if (image) {
            new THREE.TextureLoader().load(image, (texture) => {
              if (isDisposed()) return texture.dispose()
              texture.colorSpace = THREE.SRGBColorSpace
              texture.flipY = labelFlipY
              label.map = texture
              label.needsUpdate = true
              onImage?.()
            })
          }
        }
      }
      // Altura 1, centrada: quien la usa la escala a píxeles.
      const bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      const center = bounds.getCenter(new THREE.Vector3())
      const fit = 1 / (size.y || 1)
      model.scale.setScalar(fit)
      model.position.copy(center).multiplyScalar(-fit)
      // `thickness` se mide en unidades del modelo: la refracción escala con él.
      glass.thickness = 0.034 / fit
    },

    /** Draws the white screen print (brand + optional flavor line). */
    paintPrint({ family, brand, subtitle }) {
      label.map?.dispose()
      label.map = drawPrint(brand, { family, subtitle })
      label.map.flipY = labelFlipY
      label.needsUpdate = true
    },

    update(time, dt) {
      fizz?.update(time, dt)
    },

    dispose() {
      if (fizz) {
        fizz.mesh.geometry.dispose()
        fizz.mesh.material.dispose()
      }
      ;[glass, cap, stopper, seal, wire, label].forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
      wear.roughness.dispose()
      wear.normal.dispose()
    },
  }
}
