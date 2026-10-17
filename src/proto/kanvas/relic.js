/**
 * Kanvas — la reliquia: el último farol, en 3D y en código (sin imágenes). Una jaula de bronce con
 * vidrio, la llama encendida (con su halo y la luz que pinta la jaula desde adentro) y chispas que
 * suben. Se dibuja en una textura que la página muestra dentro de la carta que gira con el scroll.
 *
 * `update({ now, turn })`: `turn` es el giro extra (el scroll y el mouse) además del giro lento propio.
 */
export function createRelic(THREE) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  camera.position.set(0, 1.35, 7)
  camera.lookAt(0, 1.05, 0)
  const disposables = []
  const keep = (x) => (disposables.push(x), x)

  // fondo: un degradado violeta oscuro con el centro más claro (detrás del farol)
  const bg = document.createElement('canvas')
  bg.width = 256
  bg.height = 320
  const g = bg.getContext('2d')
  const lin = g.createLinearGradient(0, 0, 0, 320)
  lin.addColorStop(0, '#1f1838')
  lin.addColorStop(1, '#4a3670')
  g.fillStyle = lin
  g.fillRect(0, 0, 256, 320)
  const rad = g.createRadialGradient(128, 150, 10, 128, 150, 170)
  rad.addColorStop(0, 'rgba(255,190,120,0.45)')
  rad.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = rad
  g.fillRect(0, 0, 256, 320)
  const bgTex = keep(new THREE.CanvasTexture(bg))
  bgTex.colorSpace = THREE.SRGBColorSpace
  scene.background = bgTex

  const ramp = keep(new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1))
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  const toon = (c, emissive) => keep(new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, emissive: emissive || '#000000' }))
  const brass = toon('#c8904a')
  const iron = toon('#2b2238')

  scene.add(new THREE.HemisphereLight('#b9a6ff', '#2a1d3a', 1.1))
  const rim = new THREE.DirectionalLight('#ff9a6a', 2.2)
  rim.position.set(-3, 3, -2)
  scene.add(rim)
  const fill = new THREE.DirectionalLight('#a48cff', 0.8)
  fill.position.set(3, 2, 4)
  scene.add(fill)

  const lantern = new THREE.Group()
  scene.add(lantern)
  const mesh = (geo, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(keep(geo), m)
    o.position.set(x, y, z)
    lantern.add(o)
    return o
  }
  // base, aro, jaula, techo, argolla
  mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.28, 32), iron, 0, 0.14, 0)
  mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 40), brass, 0, 0.3, 0).rotation.x = Math.PI / 2
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), brass, Math.cos(a) * 0.52, 1.05, Math.sin(a) * 0.52)
  }
  mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), brass, 0, 1.8, 0).rotation.x = Math.PI / 2
  mesh(new THREE.ConeGeometry(0.72, 0.6, 32), iron, 0, 2.1, 0)
  mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.18, 12), brass, 0, 2.46, 0)
  mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 32), brass, 0, 2.72, 0)
  // vidrio
  const glass = keep(new THREE.MeshBasicMaterial({ color: '#ffd7a0', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }))
  mesh(new THREE.CylinderGeometry(0.47, 0.47, 1.45, 32, 1, true), glass, 0, 1.05, 0)
  // la llama: núcleo, cuerpo y halo (sprite aditivo), y la luz que pinta la jaula desde adentro
  const flameMat = keep(new THREE.MeshBasicMaterial({ color: '#ffb950' }))
  const flame = mesh(new THREE.SphereGeometry(0.17, 20, 16), flameMat, 0, 1.0, 0)
  flame.scale.set(1, 1.6, 1)
  mesh(new THREE.SphereGeometry(0.08, 16, 12), keep(new THREE.MeshBasicMaterial({ color: '#fff4dc' })), 0, 0.98, 0)
  const halo = document.createElement('canvas')
  halo.width = halo.height = 128
  const hg = halo.getContext('2d')
  const hr = hg.createRadialGradient(64, 64, 0, 64, 64, 64)
  hr.addColorStop(0, 'rgba(255,210,140,0.95)')
  hr.addColorStop(0.35, 'rgba(255,160,80,0.35)')
  hr.addColorStop(1, 'rgba(255,140,60,0)')
  hg.fillStyle = hr
  hg.fillRect(0, 0, 128, 128)
  const haloTex = keep(new THREE.CanvasTexture(halo))
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })))
  glow.position.set(0, 1.0, 0)
  glow.scale.set(2.6, 2.6, 1)
  lantern.add(glow)
  const light = new THREE.PointLight('#ffb15e', 6, 5, 1.6)
  light.position.set(0, 1.0, 0)
  lantern.add(light)

  // chispas que suben y se apagan
  const N = 70
  const pos = new Float32Array(N * 3)
  const seeds = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: 0.2 + Math.random() * 1.2, s: 0.25 + Math.random() * 0.5, o: Math.random() }))
  const pg = keep(new THREE.BufferGeometry())
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const sparks = new THREE.Points(pg, keep(new THREE.PointsMaterial({ color: '#ffc27a', size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })))
  scene.add(sparks)

  return {
    scene,
    camera,
    update({ now, turn = 0 }) {
      const t = now / 1000
      lantern.rotation.y = t * 0.35 + turn
      lantern.rotation.z = Math.sin(t * 0.9) * 0.04
      lantern.position.y = Math.sin(t * 1.1) * 0.06
      const flick = 0.85 + Math.sin(t * 13) * 0.06 + Math.sin(t * 23.7) * 0.05
      flame.scale.set(flick, 1.6 * (2 - flick), flick)
      light.intensity = 6 * flick
      glow.scale.setScalar(2.6 * flick)
      seeds.forEach((s, i) => {
        const life = (t * s.s + s.o) % 1
        pos[i * 3] = Math.cos(s.a + t * 0.3) * s.r * (0.5 + life)
        pos[i * 3 + 1] = 0.6 + life * 3
        pos[i * 3 + 2] = Math.sin(s.a + t * 0.3) * s.r * (0.5 + life)
      })
      pg.attributes.position.needsUpdate = true
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
