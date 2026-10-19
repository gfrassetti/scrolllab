/**
 * Kanvas — las piezas de la película de HOLD. Mientras se mantiene apretado, cada tanda muestra tres
 * paneles; varios llevan una pieza del mundo girando sola: 3D en código, sin imágenes, provisorias
 * hasta tener los modelos generados. Una escena con una pieza visible por vez y fondo transparente:
 * `render(renderer, name, target, now, style)` la dibuja en la textura del panel.
 *
 * `style`: 'paint' (los colores del mundo, en toon) o 'scan' (en grises según la altura, con una banda
 * que recorre la pieza: la lectura de un escáner).
 */
export const ARTIFACTS = ['shard', 'astrolabe', 'key', 'bell', 'seal', 'hook']

export function createArtifacts(THREE) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
  camera.position.set(0, 0.25, 9)
  camera.lookAt(0, 0, 0)
  const disposables = []
  const keep = (x) => (disposables.push(x), x)

  const ramp = keep(new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]), 3, 1))
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  const toon = (c, emissive) => keep(new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, emissive: emissive || '#000000' }))
  const brass = toon('#c8904a')
  const bronze = toon('#8a5a34')
  const iron = toon('#3a3226')
  const bone = toon('#e9dcc4')

  scene.add(new THREE.HemisphereLight('#fff4e2', '#5a4a32', 1.3))
  const key = new THREE.DirectionalLight('#ffe0bd', 2.4)
  key.position.set(3, 4, 5)
  scene.add(key)
  const rim = new THREE.DirectionalLight('#ffd9a0', 1.6)
  rim.position.set(-4, 2, -3)
  scene.add(rim)

  // el escáner: gris según la altura (en el espacio de la pieza) y una banda que sube
  const scanMat = keep(
    new THREE.ShaderMaterial({
      vertexShader:
        'varying float vY; varying vec3 vN; void main(){ vY = position.y; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying float vY; varying vec3 vN; uniform float uT; void main(){ float g = 0.35 + 0.55 * smoothstep(-1.6, 1.6, vY); float lit = 0.55 + 0.45 * max(dot(vN, normalize(vec3(0.4, 0.7, 0.6))), 0.0); float band = 1.0 - smoothstep(0.0, 0.06, abs(fract(vY * 0.35 - uT * 0.3) - 0.5)); gl_FragColor = vec4(vec3(g * lit + band * 0.5), 1.0); }',
      uniforms: { uT: { value: 0 } },
    }),
  )

  const pieces = {}
  const piece = (name) => {
    const g = new THREE.Group()
    g.visible = false
    scene.add(g)
    pieces[name] = g
    return g
  }
  const add = (g, geo, mat, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(keep(geo), mat)
    o.position.set(x, y, z)
    g.add(o)
    return o
  }

  // 1) la astilla de lumen: tres cristales sobre una roca; laten
  const shard = piece('shard')
  const lumen = toon('#5fe0c8', '#1f8f80')
  const s1 = add(shard, new THREE.OctahedronGeometry(0.62, 0), lumen, 0, 0.35, 0)
  s1.scale.set(0.9, 2.4, 0.9)
  const s2 = add(shard, new THREE.OctahedronGeometry(0.4, 0), lumen, -0.55, -0.35, 0.15)
  s2.scale.set(0.8, 1.9, 0.8)
  s2.rotation.z = 0.5
  const s3 = add(shard, new THREE.OctahedronGeometry(0.34, 0), lumen, 0.5, -0.45, -0.1)
  s3.scale.set(0.8, 1.7, 0.8)
  s3.rotation.z = -0.55
  add(shard, new THREE.DodecahedronGeometry(0.8, 0), iron, 0, -1.25, 0).scale.set(1.5, 0.55, 1.2)

  // 2) el astrolabio del caminante: tres aros que giran en ejes distintos, marcas y una aguja
  const astro = piece('astrolabe')
  const r1 = add(astro, new THREE.TorusGeometry(1.45, 0.06, 10, 72), brass)
  const r2 = add(astro, new THREE.TorusGeometry(1.15, 0.05, 10, 64), bronze)
  const r3 = add(astro, new THREE.TorusGeometry(0.85, 0.045, 10, 56), brass)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const t = add(r1, new THREE.BoxGeometry(0.05, i % 6 ? 0.14 : 0.3, 0.05), brass, Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0)
    t.rotation.z = a + Math.PI / 2
  }
  add(astro, new THREE.SphereGeometry(0.18, 20, 14), toon('#f3b04f', '#7a4a10'))
  const needle = add(astro, new THREE.ConeGeometry(0.07, 1.5, 8), iron, 0, 0, 0)
  needle.rotation.z = -Math.PI / 2

  // 3) la llave de la Puerta Baja: aro con ornamento, caña y dientes
  const keyG = piece('key')
  add(keyG, new THREE.TorusGeometry(0.5, 0.12, 12, 40), brass, 0, 1.15, 0)
  add(keyG, new THREE.OctahedronGeometry(0.2, 0), toon('#5fe0c8', '#1f8f80'), 0, 1.15, 0)
  add(keyG, new THREE.CylinderGeometry(0.1, 0.1, 2.3, 14), brass, 0, -0.35, 0)
  add(keyG, new THREE.TorusGeometry(0.16, 0.05, 8, 20), bronze, 0, 0.55, 0).rotation.x = Math.PI / 2
  add(keyG, new THREE.BoxGeometry(0.42, 0.14, 0.1), brass, 0.25, -1.25, 0)
  add(keyG, new THREE.BoxGeometry(0.3, 0.12, 0.1), brass, 0.19, -1.0, 0)
  add(keyG, new THREE.BoxGeometry(0.22, 0.1, 0.1), brass, 0.15, -0.78, 0)
  keyG.rotation.z = 0.35

  // 4) la campana de tormenta: perfil torneado, yugo y badajo que se mece
  const bell = piece('bell')
  const prof = [
    [0.0, 1.0], [0.28, 1.0], [0.42, 0.85], [0.5, 0.5], [0.58, 0.0], [0.78, -0.55], [1.02, -0.8], [1.05, -0.92], [0.95, -0.92], [0.7, -0.62], [0.5, -0.2], [0.42, 0.4], [0.3, 0.85], [0.0, 0.88],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const bellBody = new THREE.Group()
  bell.add(bellBody)
  add(bellBody, new THREE.LatheGeometry(prof, 40), keep(new THREE.MeshToonMaterial({ color: '#8a5a34', gradientMap: ramp, side: THREE.DoubleSide })))
  add(bellBody, new THREE.SphereGeometry(0.16, 16, 12), iron, 0, -0.78, 0)
  add(bellBody, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), iron, 0, -0.3, 0)
  add(bell, new THREE.BoxGeometry(1.6, 0.16, 0.22), iron, 0, 1.18, 0)
  add(bell, new THREE.TorusGeometry(0.22, 0.05, 8, 24), brass, 0, 1.4, 0)

  // 5) el sello del juramento: un disco con una estrella de ocho puntas en relieve
  const seal = piece('seal')
  const disc = add(seal, new THREE.CylinderGeometry(1.3, 1.3, 0.2, 64), bronze)
  disc.rotation.x = Math.PI / 2
  add(seal, new THREE.TorusGeometry(1.3, 0.07, 10, 64), brass)
  const star = new THREE.Shape()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 2
    const rr = i % 2 ? 0.38 : 0.95
    if (i === 0) star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 })
  add(seal, starGeo, toon('#f3b04f', '#6a3c0c'), 0, 0, 0.08)
  add(seal, starGeo, toon('#f3b04f', '#6a3c0c'), 0, 0, -0.24)

  // 6) el garfio de marea: una hoja curva con mango envuelto
  const hook = piece('hook')
  const blade = add(hook, new THREE.TorusGeometry(1.0, 0.11, 10, 48, Math.PI * 1.15), bone, 0, 0.55, 0)
  blade.scale.set(1, 1, 0.35)
  blade.rotation.z = -0.2
  add(hook, new THREE.CylinderGeometry(0.09, 0.09, 1.9, 12), iron, 0.95, -0.7, 0).rotation.z = 0.1
  for (let i = 0; i < 6; i++) add(hook, new THREE.TorusGeometry(0.11, 0.035, 6, 16), brass, 0.93 + i * 0.012, -0.2 - i * 0.18, 0).rotation.x = Math.PI / 2
  add(hook, new THREE.OctahedronGeometry(0.14, 0), toon('#5fe0c8', '#1f8f80'), 0.86, 0.32, 0)

  const animate = (name, t) => {
    const g = pieces[name]
    g.rotation.y = t * 0.6
    if (name === 'shard') {
      lumen.emissiveIntensity = 0.9 + Math.sin(t * 2.4) * 0.5
      g.position.y = Math.sin(t * 1.2) * 0.08
    } else if (name === 'astrolabe') {
      g.rotation.y = 0
      r1.rotation.set(t * 0.35, t * 0.5, 0)
      r2.rotation.set(Math.PI / 2 + t * 0.6, 0, t * 0.2)
      r3.rotation.set(t * 0.9, Math.PI / 3, 0)
      needle.rotation.x = t * 1.4
    } else if (name === 'bell') {
      g.rotation.y = t * 0.4
      bellBody.rotation.z = Math.sin(t * 1.8) * 0.18
      bellBody.position.y = 0
    } else if (name === 'seal') {
      g.rotation.y = t * 0.9
      g.rotation.x = Math.sin(t * 0.7) * 0.15
    } else if (name === 'hook') {
      g.rotation.y = t * 0.5
      g.rotation.z = Math.sin(t * 0.8) * 0.08
    }
  }

  return {
    /** Dibuja una pieza en `target` (fondo transparente). */
    render(renderer, name, target, now, style = 'paint') {
      const t = now / 1000
      for (const k of ARTIFACTS) pieces[k].visible = k === name
      animate(name, t)
      scene.overrideMaterial = style === 'scan' ? scanMat : null
      scanMat.uniforms.uT.value = t
      camera.aspect = target.width / target.height
      // en un panel apaisado la pieza no puede crecer más que el alto: se aleja la cámara si es angosto
      camera.position.z = 9 / Math.min(1, camera.aspect / 0.8)
      camera.updateProjectionMatrix()
      const prev = renderer.getClearAlpha()
      const prevC = renderer.getClearColor(new THREE.Color())
      renderer.setClearColor(0x000000, 0)
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.setClearColor(prevC, prev)
      scene.overrideMaterial = null
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}
