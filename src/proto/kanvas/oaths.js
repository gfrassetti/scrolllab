/**
 * Kanvas — los juramentos: dos personajes en capas delante del mundo (2.5D). El fondo es la isla
 * en vivo (la página la dibuja en una textura y la pasa con `setWorld`); delante, un parapeto de piedra,
 * la farolera de cuerpo entero y, bien adelante, el busto del navegante de la marea. Cada capa está a
 * otra profundidad y la cámara se corre con el mouse: el fondo se mueve poco y el frente mucho.
 *
 * Los personajes son los modelos 3D dibujados del hero (2026-10-18): el viejo de los anteojos de cuerpo
 * entero sobre el parapeto y, bien adelante, el protagonista del casco de medio cuerpo, pintados como
 * ilustración (`ink`). El busto respira.
 */

const LAMP = '#f3b04f' // los Faroleros: llevan la luz
const TIDE = '#6fe3d2' // los de la Marea: cuidan la oscuridad entre las islas
const INK = '#140f1c'

/** El parapeto de piedra en el que están parados (2048 × 512): bloques con el borde de arriba claro. */
function drawLedge() {
  const W = 2048
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const lin = g.createLinearGradient(0, 0, 0, H)
  lin.addColorStop(0, '#c9b48c')
  lin.addColorStop(0.08, '#9c8762')
  lin.addColorStop(1, '#5f5038')
  g.fillStyle = lin
  g.beginPath()
  g.moveTo(0, 40)
  g.lineTo(W, 0)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(243,176,79,0.45)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(0, 41)
  g.lineTo(W, 1)
  g.stroke()
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 2
  for (let x = 0; x < W; x += 180) {
    g.beginPath()
    g.moveTo(x, 40 - (x / W) * 40)
    g.lineTo(x - 30, H)
    g.stroke()
  }
  return c
}

export function createOaths(THREE, { loader, ink } = {}) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 6)
  const disposables = []
  const keep = (x) => (disposables.push(x), x)
  const tex = (cv) => {
    const t = keep(new THREE.CanvasTexture(cv))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }

  // el viento: los vértices de arriba se corren más que los de abajo
  const sway = { value: 0 }
  const layerMat = (map, wind = 0) => {
    const m = keep(new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }))
    if (wind) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uSway = sway
        sh.vertexShader = 'uniform float uSway;\n' + sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float wy = clamp(uv.y, 0.0, 1.0);
          transformed.x += (sin(uSway * 1.6 + position.y * 3.0) * 0.06 + sin(uSway * 2.7 + position.y * 7.0) * 0.025) * (1.0 - wy) * ${wind.toFixed(2)};`,
        )
      }
    }
    return m
  }
  const quad = (w, h, seg = 1) => keep(new THREE.PlaneGeometry(w, h, seg, seg * 6))

  // capa 0: el mundo (la textura llega de la página); se agranda para tener lugar al correrse
  const worldMat = keep(new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false }))
  const world = new THREE.Mesh(quad(1, 1), worldMat)
  world.position.z = -16
  scene.add(world)
  // capa 1: una bruma crema entre el mundo y el parapeto
  const hazeCv = document.createElement('canvas')
  hazeCv.width = 4
  hazeCv.height = 256
  const hg = hazeCv.getContext('2d')
  const hl = hg.createLinearGradient(0, 0, 0, 256)
  hl.addColorStop(0, 'rgba(236,220,188,0)')
  hl.addColorStop(0.6, 'rgba(236,220,188,0.4)')
  hl.addColorStop(1, 'rgba(201,180,140,0.55)')
  hg.fillStyle = hl
  hg.fillRect(0, 0, 4, 256)
  const haze = new THREE.Mesh(quad(1, 1), layerMat(tex(hazeCv)))
  haze.position.z = -9
  scene.add(haze)
  // capa 2: el parapeto
  const ledge = new THREE.Mesh(quad(1, 1), layerMat(tex(drawLedge())))
  ledge.position.z = -4.2
  scene.add(ledge)
  // capa 3: el viejo de cuerpo entero, sobre el parapeto; capa 4: el protagonista, bien adelante. Los GLB
  // miden 1 de alto con el origen en el centro y miran a +x (rotY ≈ -π/2 los pone de frente).
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8ccb0', 1.2))
  const lamp = new THREE.Group()
  lamp.position.z = -4
  scene.add(lamp)
  const tide = new THREE.Group()
  tide.position.z = -0.6
  scene.add(tide)
  const fig = (url, into, rotY, phase) =>
    loader?.load(url, (gl) => {
      ink?.apply(gl.scene, { breathe: true, phase }) // respiran (el reloj lo lleva ink.tick)
      gl.scene.rotation.y = rotY
      into.add(gl.scene)
    })
  fig('/proto/kanvas/hero/man.glb', lamp, -1.25, 1.9)
  fig('/proto/kanvas/hero/raider.glb', tide, -1.9, 0)

  // motas de luz entre las capas
  const N = 50
  const mp = new Float32Array(N * 3)
  const seeds = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 6, z: -2 - Math.random() * 10, s: 0.1 + Math.random() * 0.3, o: Math.random() * 6 }))
  const mg = keep(new THREE.BufferGeometry())
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3))
  const motes = new THREE.Points(mg, keep(new THREE.PointsMaterial({ color: '#ffd28a', size: 0.05, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })))
  scene.add(motes)

  /** Ancho y alto visibles a la distancia `z` (la cámara en z = 6). */
  const view = (z) => {
    const h = 2 * (6 - z) * Math.tan((camera.fov * Math.PI) / 360)
    return { w: h * camera.aspect, h }
  }
  const look = { x: 0, y: 0 }

  return {
    scene,
    camera,
    /** La textura del mundo en vivo (la isla) y su relación de aspecto. */
    setWorld(texture) {
      worldMat.map = texture
      worldMat.needsUpdate = true
    },
    /** `aspect` de la textura; `pointer` de −1 a 1; `push` 0..1 (el scroll acerca la cámara). */
    update({ now, dt, aspect, pointer, push = 0 }) {
      const t = now / 1000
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      const k = 1 - Math.exp(-2.4 * dt)
      look.x += (pointer.x - look.x) * k
      look.y += (pointer.y - look.y) * k
      // la cámara se corre y mira al fondo: el frente se mueve mucho, el mundo casi nada
      camera.position.set(look.x * 0.95, -look.y * 0.45, 6 - push * 0.6) // y con el scroll se acerca
      camera.lookAt(look.x * 0.1, -look.y * 0.05, -16)
      const portrait = aspect < 1
      const w0 = view(-16)
      world.scale.set(w0.w * 1.18, w0.h * 1.18, 1)
      const wh = view(-9)
      haze.scale.set(wh.w * 1.3, wh.h * 0.7, 1)
      haze.position.y = -wh.h * 0.2
      const wl = view(-4.2)
      ledge.scale.set(wl.w * 1.3, wl.h * 0.42, 1)
      ledge.position.set(0, -wl.h * 0.5 + wl.h * 0.12, -4.2)
      const v4 = view(-4)
      const lh = v4.h * (portrait ? 0.4 : 0.56)
      lamp.scale.setScalar(lh)
      lamp.position.set(-v4.w * (portrait ? 0.2 : 0.17), -v4.h * 0.5 + v4.h * 0.12 + lh / 2 - lh * 0.03, -4)
      // el protagonista de medio cuerpo: el modelo entero es el doble de alto y la cabeza queda arriba
      const v0 = view(-0.6)
      const th = v0.h * (portrait ? 0.62 : 0.98)
      tide.scale.setScalar(th * 1.9)
      tide.position.set(v0.w * (portrait ? 0.14 : 0.2), -v0.h * 0.5 + th - th * 0.95 + Math.sin(t * 1.3) * 0.012, -0.6)
      tide.rotation.z = Math.sin(t * 0.6) * 0.006
      sway.value = t
      seeds.forEach((s, i) => {
        mp[i * 3] = s.x + Math.sin(t * s.s + s.o) * 0.6
        mp[i * 3 + 1] = s.y + ((t * s.s * 0.4 + s.o) % 6) - 3
        mp[i * 3 + 2] = s.z
      })
      mg.attributes.position.needsUpdate = true
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
