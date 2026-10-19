/**
 * Kanvas — el mundo: el archipiélago de VESPER visto desde lo alto de un acantilado. Islas flotantes
 * sobre un mar de nubes, unidas por rutas por las que viajan botes-linterna (puntos de luz que van y
 * vienen), y la isla del hero en el centro (la página la pasa con `setCenter` cuando carga el GLB).
 *
 * El primer plano va pegado a la cámara: el acantilado de la izquierda, el de la derecha con alguien
 * escalando (bufanda al viento). Con el mouse la cámara se corre y el primer plano se corre más, al revés:
 * eso da la profundidad. Provisorio hasta tener el arte generado (Canvas 2D y 3D en código).
 *
 * `cameras.extra` es otra cámara (de costado, más baja) para la lámina del cierre.
 */

const INK = '#2b2318'
const LAMP = '#f3b04f'

const rnd = (seed) => {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** El acantilado de un lado (1024 × 2048), con alguien escalando si `climber`. */
function drawCliff(side, climber) {
  const W = 1024
  const H = 2048
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const r = rnd(side === 'left' ? 4 : 9)
  // la roca: un borde serrucho que entra desde el costado
  const rock = new Path2D()
  const out = side === 'left' ? 0 : W
  const dir = side === 'left' ? 1 : -1
  rock.moveTo(out, 0)
  let y = 0
  let x = out + dir * W * 0.32
  rock.lineTo(x, 0)
  while (y < H) {
    y += 90 + r() * 160
    x = out + dir * W * (0.18 + r() * 0.42 + (y / H) * 0.32)
    rock.lineTo(x, Math.min(H, y))
  }
  rock.lineTo(out, H)
  rock.closePath()
  const lin = g.createLinearGradient(0, 0, 0, H)
  lin.addColorStop(0, '#8a7350')
  lin.addColorStop(0.5, '#5c4a32')
  lin.addColorStop(1, INK)
  g.fillStyle = lin
  g.fill(rock)
  // vetas de luz en las aristas (la luz viene de adentro de la escena)
  g.save()
  g.clip(rock)
  g.strokeStyle = 'rgba(236,214,170,0.3)'
  g.lineWidth = 3
  for (let i = 0; i < 22; i++) {
    const yy = r() * H
    const xx = out + dir * W * (0.1 + r() * 0.5)
    g.beginPath()
    g.moveTo(xx, yy)
    g.lineTo(xx + dir * (40 + r() * 120), yy + 60 + r() * 140)
    g.stroke()
  }
  g.restore()
  g.save()
  g.strokeStyle = 'rgba(246,226,184,0.55)'
  g.lineWidth = 4
  g.stroke(rock)
  g.restore()

  if (climber) {
    // alguien escalando la arista: cuerpo inclinado hacia la roca, un brazo arriba, bufanda al viento
    const cx = side === 'left' ? W * 0.5 : W * 0.46
    const cy = H * 0.5
    g.save()
    g.fillStyle = INK
    g.translate(cx, cy)
    g.rotate(dir * -0.18)
    const body = new Path2D()
    body.ellipse(0, 0, 46, 110, 0, 0, Math.PI * 2) // torso
    body.ellipse(-dir * 6, -150, 34, 40, 0, 0, Math.PI * 2) // cabeza
    g.fill(body)
    g.lineCap = 'round'
    g.strokeStyle = INK
    g.lineWidth = 28
    g.beginPath()
    g.moveTo(dir * 20, -70)
    g.lineTo(dir * 70, -210) // el brazo que se agarra arriba
    g.moveTo(-dir * 24, -60)
    g.lineTo(-dir * 70, 40) // el otro brazo
    g.moveTo(dir * 10, 90)
    g.lineTo(dir * 70, 230) // pierna apoyada
    g.moveTo(-dir * 16, 90)
    g.lineTo(-dir * 50, 260)
    g.stroke()
    // la bufanda: una cinta ámbar que vuela hacia afuera
    g.fillStyle = LAMP
    g.beginPath()
    g.moveTo(-dir * 10, -110)
    g.bezierCurveTo(-dir * 120, -150, -dir * 200, -60, -dir * 300, -120)
    g.bezierCurveTo(-dir * 210, -40, -dir * 120, -90, -dir * 10, -90)
    g.closePath()
    g.fill()
    // borde encendido del lado de la escena
    g.shadowColor = '#ffe2a8'
    g.shadowBlur = 14
    g.strokeStyle = 'rgba(255,232,190,0.8)'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(-dir * 6, -150, 34, 40, 0, Math.PI * (dir > 0 ? 0.6 : 1.4), Math.PI * (dir > 0 ? 1.4 : 2.6))
    g.stroke()
    g.restore()
    // chispas del farol que lleva colgado
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(255,200,120,${0.4 + r() * 0.5})`
      g.fillRect(cx - dir * (40 + r() * 140), cy + 40 + r() * 160, 4, 4)
    }
  }
  return c
}

/** Una nube suave (sprite). */
function drawPuff() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = rnd(3)
  for (let i = 0; i < 9; i++) {
    const x = 34 + r() * 60
    const y = 44 + r() * 40
    const rad = 18 + r() * 26
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, 'rgba(255,248,232,0.9)')
    gr.addColorStop(1, 'rgba(255,248,232,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
  }
  return c
}

export function createWorld(THREE) {
  const scene = new THREE.Scene()
  const disposables = []
  const keep = (x) => (disposables.push(x), x)
  const tex = (cv) => {
    const t = keep(new THREE.CanvasTexture(cv))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  // el fondo: mirando hacia abajo se ve el mar de nubes, rosado cerca y violeta lejos
  const sky = document.createElement('canvas')
  sky.width = 4
  sky.height = 256
  const sg = sky.getContext('2d')
  const grd = sg.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0, '#8fa9bf')
  grd.addColorStop(0.5, '#ead8b4')
  grd.addColorStop(1, '#e9c58e')
  sg.fillStyle = grd
  sg.fillRect(0, 0, 4, 256)
  scene.background = tex(sky)
  scene.fog = new THREE.Fog('#ecdcbc', 34, 110)

  const ramp = keep(new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1))
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  const toon = (c, e) => keep(new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, emissive: e || '#000000' }))
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8ccb0', 1.3))
  const sun = new THREE.DirectionalLight('#fff6e8', 0.9)
  sun.position.set(10, 20, 6)
  scene.add(sun)

  // el piso de nubes
  const floorCv = document.createElement('canvas')
  floorCv.width = floorCv.height = 512
  const fg = floorCv.getContext('2d')
  fg.fillStyle = '#efe2c8'
  fg.fillRect(0, 0, 512, 512)
  const fr = rnd(21)
  for (let i = 0; i < 220; i++) {
    const x = fr() * 512
    const y = fr() * 512
    const rad = 10 + fr() * 50
    const gr = fg.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, fr() > 0.5 ? 'rgba(255,250,238,0.6)' : 'rgba(170,180,190,0.3)')
    gr.addColorStop(1, 'rgba(255,250,238,0)')
    fg.fillStyle = gr
    fg.fillRect(0, 0, 512, 512)
  }
  const floorTex = tex(floorCv)
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
  floorTex.repeat.set(5, 5)
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(260, 260)), keep(new THREE.MeshBasicMaterial({ map: floorTex })))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -9
  scene.add(floor)

  // las islas: arriba pasto en facetas, abajo roca en punta; algunas con torre y farol
  const grass = toon('#8cc489')
  const grass2 = toon('#b9d48a')
  const rock = toon('#7a5a8a')
  const stone = toon('#f2b98a')
  const roof = toon('#ef7a4a')
  const glow = toon('#ffe2a0', '#ffb347')
  const isles = []
  const ir = rnd(7)
  const SPOTS = [
    [-14, 1, -6, 2.6], [12, -1, -9, 3.2], [-9, 2.5, 10, 2.0], [15, 1.5, 8, 2.4], [-20, -2, 4, 1.8], [3, -3, 18, 2.2], [22, 0, -2, 1.6], [-4, 3, -18, 2.8], [6, 2, -24, 2.0],
  ]
  SPOTS.forEach(([x, y, z, s], i) => {
    const g = new THREE.Group()
    const top = new THREE.Mesh(keep(new THREE.CylinderGeometry(s, s * 0.92, s * 0.35, 7)), i % 3 ? grass : grass2)
    g.add(top)
    const under = new THREE.Mesh(keep(new THREE.ConeGeometry(s * 0.95, s * 2.2, 7)), rock)
    under.rotation.x = Math.PI
    under.position.y = -s * 1.25
    g.add(under)
    if (i % 2 === 0) {
      const tw = new THREE.Mesh(keep(new THREE.CylinderGeometry(s * 0.14, s * 0.18, s * 1.3, 8)), stone)
      tw.position.set(s * 0.3, s * 0.8, 0)
      g.add(tw)
      const rf = new THREE.Mesh(keep(new THREE.ConeGeometry(s * 0.22, s * 0.4, 8)), roof)
      rf.position.set(s * 0.3, s * 1.65, 0)
      g.add(rf)
      const lamp = new THREE.Mesh(keep(new THREE.SphereGeometry(s * 0.08, 8, 6)), glow)
      lamp.position.set(s * 0.3, s * 1.95, 0)
      g.add(lamp)
    }
    g.position.set(x, y, z)
    g.rotation.y = ir() * Math.PI
    g.userData = { y, ph: ir() * 6 }
    scene.add(g)
    isles.push(g)
  })

  // la isla del hero al centro (llega con el GLB)
  const center = new THREE.Group()
  center.scale.setScalar(1.6)
  scene.add(center)

  // las rutas: curvas entre islas, con botes-linterna que van y vienen
  const hub = new THREE.Vector3(0, 0.5, 0)
  const routes = isles.map((g, i) => {
    const a = g.position.clone()
    const b = i % 3 === 0 ? hub : isles[(i + 2) % isles.length].position.clone()
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y += 3 + (i % 3)
    return new THREE.QuadraticBezierCurve3(a, mid, b)
  })
  routes.forEach((cv) => {
    const geo = keep(new THREE.BufferGeometry().setFromPoints(cv.getPoints(40)))
    const line = new THREE.Line(geo, keep(new THREE.LineDashedMaterial({ color: '#ffd9a0', dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.55 })))
    line.computeLineDistances()
    scene.add(line)
  })
  const BOATS = routes.length * 2
  const bp = new Float32Array(BOATS * 3)
  const bg = keep(new THREE.BufferGeometry())
  bg.setAttribute('position', new THREE.BufferAttribute(bp, 3))
  const boats = new THREE.Points(bg, keep(new THREE.PointsMaterial({ color: '#ffcf7a', size: 0.45, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })))
  scene.add(boats)
  const tmp = new THREE.Vector3()

  // nubes sueltas entre las islas
  const puffTex = tex(drawPuff())
  const puffs = []
  const pr = rnd(13)
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0.85, depthWrite: false })))
    const sc = 5 + pr() * 9
    s.scale.set(sc, sc * 0.6, 1)
    s.position.set((pr() - 0.5) * 70, -6 + pr() * 6, (pr() - 0.5) * 70)
    s.userData = { x: s.position.x, sp: 0.2 + pr() * 0.4 }
    scene.add(s)
    puffs.push(s)
  }

  // las cámaras: la principal mira desde lo alto del acantilado; la extra, para la lámina del cierre
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  scene.add(camera)
  const extra = new THREE.PerspectiveCamera(36, 1, 0.1, 200)
  extra.position.set(26, 6, 22)
  extra.lookAt(0, -1, 0)

  // el primer plano, pegado a la cámara: dos acantilados (el de la derecha, con quien escala)
  const fgMat = (cv) => keep(new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, depthWrite: false, depthTest: false, fog: false }))
  const cliffL = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 2)), fgMat(drawCliff('left', false)))
  const cliffR = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 2)), fgMat(drawCliff('right', true)))
  cliffL.renderOrder = cliffR.renderOrder = 10
  camera.add(cliffL, cliffR)

  const look = { x: 0, y: 0 }
  return {
    scene,
    camera,
    extra,
    /** El primer plano (los acantilados) se ve solo con la cámara principal. */
    showForeground(v) {
      cliffL.visible = cliffR.visible = v
    },
    /**
     * La isla dibujada (una copia) al centro del archipiélago; las demás islas pasan a ser copias de la
     * misma (sin la torre las impares), en vez de las de facetas.
     */
    setCenter(obj) {
      isles.forEach((g, i) => {
        g.children.forEach((m) => (m.visible = false))
        g.getObjectByName('drawn')?.removeFromParent()
        const c = obj.clone(true)
        c.name = 'drawn'
        c.scale.setScalar(SPOTS[i][3] / 2.5)
        c.position.y = -SPOTS[i][3] * 0.15
        if (i % 2) c.getObjectByName('tower')?.removeFromParent()
        g.add(c)
      })
      center.clear()
      const c = obj.clone(true)
      c.position.set(0, 0, 0)
      c.quaternion.identity()
      // sin las nubes del hero: vistas desde arriba son discos (acá el mar de nubes es otro)
      c.traverse((o) => {
        const col = o.isMesh && o.geometry.attributes.color
        if (!col?.count) return
        const [r, g, b] = [col.getX(0), col.getY(0), col.getZ(0)]
        if (r > 0.95 && g > 0.75 && b > 0.65) o.visible = false // las nubes (la torre es apenas más oscura)
      })
      center.add(c)
    },
    /** `q` 0..1 (el scroll: la cámara gira y baja un poco), `pointer` de −1 a 1. */
    update({ now, dt, aspect, pointer, q = 0 }) {
      const t = now / 1000
      const k = 1 - Math.exp(-2.2 * dt)
      look.x += (pointer.x - look.x) * k
      look.y += (pointer.y - look.y) * k
      const ang = -0.5 + q * 0.7 + look.x * 0.06
      const rad = 34 - q * 6
      camera.position.set(Math.sin(ang) * rad, 20 - q * 5 - look.y * 1.2, Math.cos(ang) * rad)
      camera.lookAt(look.x * 2, -2 - look.y, 0)
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      // el primer plano, a 2 unidades de la cámara, del alto de la pantalla y un poco más
      const h = 2 * 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.15
      const w = h * aspect
      // en vertical los acantilados se angostan y se corren afuera: si no, tapan el archipiélago
      const portrait = aspect < 1
      const cw = portrait ? w * 0.5 : Math.max(w * 0.34, h * 0.42)
      const inset = portrait ? 0.2 : 0.38
      cliffL.scale.set(cw, h / 2, 1)
      cliffR.scale.set(cw, h / 2, 1)
      cliffL.position.set(-w / 2 + cw * (inset - 0.08) - look.x * 0.12, -look.y * 0.06, -2)
      cliffR.position.set(w / 2 - cw * inset - look.x * 0.2, -h * 0.04 - look.y * 0.08, -2)
      isles.forEach((g) => (g.position.y = g.userData.y + Math.sin(t * 0.5 + g.userData.ph) * 0.25))
      center.position.y = Math.sin(t * 0.4) * 0.2
      puffs.forEach((s) => (s.position.x = s.userData.x + ((t * s.userData.sp) % 20) - 10))
      routes.forEach((cv, i) => {
        for (let j = 0; j < 2; j++) {
          const u = (t * 0.05 * (1 + (i % 3) * 0.3) + j * 0.5 + i * 0.13) % 1
          cv.getPoint(j ? 1 - u : u, tmp)
          bp.set([tmp.x, tmp.y + 0.2, tmp.z], (i * 2 + j) * 3)
        }
      })
      bg.attributes.position.needsUpdate = true
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
