/**
 * Kanvas — la reliquia: el último farol. Es una pieza dibujada en 3D (imagen generada → SAM 3D,
 * public/proto/kanvas/relic-lantern.glb) pintada como ilustración (`ink`), con un halo que late donde
 * está la llama, la luz que sale de adentro y chispas que suben. Se dibuja en una textura que la página
 * muestra dentro de la carta que gira con el scroll (el plano la pasa a sRGB).
 *
 * `update({ now, turn })`: `turn` es el giro extra (el scroll y el mouse) además del giro lento propio.
 */
export function createRelic(THREE, { loader, ink } = {}) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  camera.position.set(0, 1.35, 7)
  camera.lookAt(0, 1.05, 0)
  const disposables = []
  const keep = (x) => (disposables.push(x), x)

  // fondo: la tarde clara de las ilustraciones, con el centro más cálido (detrás del farol)
  const bg = document.createElement('canvas')
  bg.width = 256
  bg.height = 320
  const g = bg.getContext('2d')
  const lin = g.createLinearGradient(0, 0, 0, 320)
  lin.addColorStop(0, '#9fb3c2')
  lin.addColorStop(1, '#e8d3a8')
  g.fillStyle = lin
  g.fillRect(0, 0, 256, 320)
  const rad = g.createRadialGradient(128, 150, 10, 128, 150, 170)
  rad.addColorStop(0, 'rgba(255,226,170,0.75)')
  rad.addColorStop(1, 'rgba(255,226,170,0)')
  g.fillStyle = rad
  g.fillRect(0, 0, 256, 320)
  const bgTex = keep(new THREE.CanvasTexture(bg))
  bgTex.colorSpace = THREE.SRGBColorSpace
  scene.background = bgTex

  scene.add(new THREE.HemisphereLight('#ffffff', '#d8ccb0', 1.3))
  const key = new THREE.DirectionalLight('#fff6e8', 0.9)
  key.position.set(3, 4, 5)
  scene.add(key)

  const lantern = new THREE.Group()
  scene.add(lantern)
  loader?.load('/proto/kanvas/relic-lantern.glb', (gl) => {
    const box = new THREE.Box3().setFromObject(gl.scene)
    const size = box.getSize(new THREE.Vector3())
    const s = 2.8 / size.y
    gl.scene.scale.setScalar(s)
    const c = box.getCenter(new THREE.Vector3())
    gl.scene.position.set(-c.x * s, -box.min.y * s, -c.z * s)
    ink?.apply(gl.scene)
    lantern.add(gl.scene)
  })

  // la llama: halo aditivo que late y la luz que sale de adentro (a la altura del vidrio)
  const halo = document.createElement('canvas')
  halo.width = halo.height = 128
  const hg = halo.getContext('2d')
  const hr = hg.createRadialGradient(64, 64, 0, 64, 64, 64)
  hr.addColorStop(0, 'rgba(255,214,140,0.85)')
  hr.addColorStop(0.35, 'rgba(255,170,80,0.3)')
  hr.addColorStop(1, 'rgba(255,150,60,0)')
  hg.fillStyle = hr
  hg.fillRect(0, 0, 128, 128)
  const haloTex = keep(new THREE.CanvasTexture(halo))
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })))
  glow.position.set(0, 1.25, 0)
  glow.scale.set(2.2, 2.2, 1)
  lantern.add(glow)
  const light = new THREE.PointLight('#ffb15e', 2.5, 5, 1.6)
  light.position.set(0, 1.25, 0.6)
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
      light.intensity = 2.5 * flick
      glow.scale.setScalar(2.2 * flick)
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
