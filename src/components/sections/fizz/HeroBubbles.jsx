import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/** Curated flavor presets — label color + bubble / backdrop tint. */
export const FIZZ_FLAVORS = {
  berry: { base: '#ff3ea5', dark: '#b81f74', bubbles: 0xffd1ec, back: '#5b1a8a' },
  citrus: { base: '#ffb02e', dark: '#e08a00', bubbles: 0xffe9c0, back: '#8a4a10' },
  tropical: { base: '#ff6b35', dark: '#d14a17', bubbles: 0xffd6c4, back: '#7a2a40' },
  mint: { base: '#3ddc97', dark: '#1fa96d', bubbles: 0xd2ffe9, back: '#1a5a48' },
}

const CHAR_COLORS = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

/** Flat, illustrated can label drawn to a canvas (no external assets). */
function buildLabelTexture(flavorKey, label) {
  const flavor = FIZZ_FLAVORS[flavorKey] || FIZZ_FLAVORS.berry
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = flavor.base
  ctx.fillRect(0, 0, size, size)

  // Soft highlight strip (reads as aluminum glare under PBR)
  const shine = ctx.createLinearGradient(0, 0, size * 0.35, 0)
  shine.addColorStop(0, 'rgba(255,255,255,0)')
  shine.addColorStop(0.45, 'rgba(255,255,255,0.22)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.fillRect(0, 0, size * 0.35, size)

  ctx.fillStyle = '#fff3e2'
  ctx.beginPath()
  ctx.moveTo(0, size * 0.62)
  for (let x = 0; x <= size; x += 12) {
    ctx.lineTo(x, size * 0.62 + Math.sin((x / size) * Math.PI * 4) * 22)
  }
  ctx.lineTo(size, size)
  ctx.lineTo(0, size)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#241352'
  ctx.font = '800 170px "Bricolage Grotesque", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, size * 0.06, size * 0.3)
  ctx.fillText(label, size * 0.56, size * 0.3)

  ctx.fillStyle = flavor.dark || '#241352'
  ctx.font = '700 56px "Bricolage Grotesque", sans-serif'
  ctx.fillText('placeholder flavor', size * 0.06, size * 0.82)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

/** Cheap studio env map so metal rims pick up reflections without HDR files. */
function buildStudioEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x1a1028)

  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x2a1840, 1.2)
  envScene.add(hemi)

  const key = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  )
  key.position.set(4, 6, 3)
  envScene.add(key)

  const fill = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xaaccff }),
  )
  fill.position.set(-5, 2, -2)
  envScene.add(fill)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: 0x3a2048 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -3
  envScene.add(ground)

  const envMap = pmrem.fromScene(envScene, 0.04).texture
  envScene.traverse((n) => {
    n.geometry?.dispose?.()
    n.material?.dispose?.()
  })
  pmrem.dispose()
  return envMap
}

/**
 * Fit any loaded model into the same visual footprint as the can,
 * so scroll/pointer animations keep working regardless of source scale.
 */
function fitObjectToScene(obj, targetSize = 4.6) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  obj.scale.setScalar(targetSize / maxAxis)
  box.setFromObject(obj)
  const center = box.getCenter(new THREE.Vector3())
  obj.position.sub(center)
}

function boostPbrMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh || !node.material) return
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    mats.forEach((m) => {
      if (!m) return
      if ('envMapIntensity' in m) m.envMapIntensity = 1.35
      if ('metalness' in m && m.metalness < 0.05) {
        // Keep painted labels matte; bump bare metal-looking greys a bit.
        const c = m.color
        if (c && c.r > 0.7 && c.g > 0.7 && c.b > 0.7) {
          m.metalness = 0.85
          m.roughness = Math.min(m.roughness ?? 0.4, 0.35)
        }
      }
      m.needsUpdate = true
    })
  })
}

function disposeObject(obj) {
  obj.traverse((node) => {
    node.geometry?.dispose?.()
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    mats.forEach((m) => {
      if (!m) return
      Object.values(m).forEach((v) => v?.isTexture && v.dispose())
      m.dispose?.()
    })
  })
}

/**
 * Decorative backdrop that rotates with scroll — soft discs + petal shapes
 * behind the can (MANA-like motion without external illustration assets).
 */
function buildScrollBackdrop(flavor) {
  const group = new THREE.Group()
  group.position.z = -2.4

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(flavor.back || '#5b1a8a'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  group.add(disc)

  const petalMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(flavor.base),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const accentMat = new THREE.MeshBasicMaterial({
    color: 0xfff3e2,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(1.1 + (i % 3) * 0.25, 28),
      i % 2 === 0 ? petalMat : accentMat,
    )
    petal.position.set(Math.cos(angle) * 4.1, Math.sin(angle) * 3.4, -0.2)
    petal.rotation.z = angle
    petal.scale.set(1, 1.55, 1)
    group.add(petal)
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 5.55, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.position.z = -0.4
  group.add(ring)

  return group
}

/**
 * HeroBubbles — PBR soda can with studio reflections over a scroll-driven
 * illustrated backdrop and rising bubbles. Flavor is a preset.
 *
 * `modelUrl` (optional): URL or path to a GLB/GLTF file. When set, the
 * placeholder can is replaced by the custom model (auto-centered and
 * auto-scaled). Buyers drop their file in `public/` and point to it,
 * e.g. modelUrl="/my-can.glb".
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D can are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  flavor = 'berry',
  canLabel = 'BRAND*',
  modelUrl = '',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'berry'

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const flavorCfg = FIZZ_FLAVORS[resolvedFlavor] || FIZZ_FLAVORS.berry

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(0, 0.15, 10)

      const envMap = buildStudioEnv(renderer)
      scene.environment = envMap

      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.6)
      keyLight.position.set(4.5, 6, 7)
      scene.add(keyLight)
      const rimLight = new THREE.DirectionalLight(0xc9b6ff, 1.1)
      rimLight.position.set(-5, 2, -4)
      scene.add(rimLight)
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.55)
      fillLight.position.set(-2, -3, 5)
      scene.add(fillLight)

      const backdrop = buildScrollBackdrop(flavorCfg)
      scene.add(backdrop)

      const labelTexture = buildLabelTexture(resolvedFlavor, canLabel)
      const bodyGeo = new THREE.CylinderGeometry(1.45, 1.45, 3.9, 64, 1, false)
      const bodyMat = new THREE.MeshStandardMaterial({
        map: labelTexture,
        roughness: 0.38,
        metalness: 0.22,
        envMapIntensity: 1.1,
      })
      const body = new THREE.Mesh(bodyGeo, bodyMat)

      const metalMat = new THREE.MeshStandardMaterial({
        color: 0xd6d2cd,
        metalness: 0.92,
        roughness: 0.22,
        envMapIntensity: 1.5,
      })
      const lidGeo = new THREE.CylinderGeometry(1.34, 1.45, 0.22, 64)
      const lidTop = new THREE.Mesh(lidGeo, metalMat)
      lidTop.position.y = 2.05
      const lidBottom = new THREE.Mesh(lidGeo, metalMat)
      lidBottom.rotation.x = Math.PI
      lidBottom.position.y = -2.05

      const rimGeo = new THREE.TorusGeometry(1.4, 0.045, 12, 64)
      const rimTop = new THREE.Mesh(rimGeo, metalMat)
      rimTop.rotation.x = Math.PI / 2
      rimTop.position.y = 1.96

      const can = new THREE.Group()
      can.add(body, lidTop, lidBottom, rimTop)
      can.rotation.set(0.18, -0.55, -0.1)
      can.userData.liftY = 0
      scene.add(can)

      let customModel = null
      let cancelled = false
      if (modelUrl && typeof modelUrl === 'string') {
        import('three/examples/jsm/loaders/GLTFLoader.js')
          .then(({ GLTFLoader }) => {
            if (cancelled) return
            new GLTFLoader().load(
              modelUrl,
              (gltf) => {
                if (cancelled) {
                  disposeObject(gltf.scene)
                  return
                }
                customModel = gltf.scene
                fitObjectToScene(customModel)
                boostPbrMaterials(customModel)
                can.remove(body, lidTop, lidBottom, rimTop)
                can.add(customModel)
                render()
              },
              undefined,
              () => {
                console.warn(`HeroBubbles: could not load model "${modelUrl}"`)
              },
            )
          })
          .catch(() => {})
      }

      const bubbleCount = 120
      const positions = new Float32Array(bubbleCount * 3)
      const speeds = new Float32Array(bubbleCount)
      for (let i = 0; i < bubbleCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 16
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1.5
        speeds[i] = 0.008 + (i % 7) * 0.004
      }
      const bubbleGeo = new THREE.BufferGeometry()
      bubbleGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      )
      const bubbleMat = new THREE.PointsMaterial({
        size: 0.09,
        color: flavorCfg.bubbles,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        sizeAttenuation: true,
      })
      const bubbles = new THREE.Points(bubbleGeo, bubbleMat)
      scene.add(bubbles)

      // Scroll-driven density proxy (sparse → dense mid → lift away)
      const fizzState = { density: 0.35, rise: 1 }

      const pointer = { x: 0, y: 0 }

      const resize = () => {
        const host = canvasRef.current?.parentElement || root.current
        if (!host) return
        const { clientWidth: w, clientHeight: h } = host
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
      }
      resize()

      const render = () => renderer.render(scene, camera)

      const onPointerMove = (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      }

      const tick = () => {
        // Idle bob — scroll scrub owns the big moves
        can.position.y =
          Math.sin(gsap.ticker.time * 1.1) * 0.1 + (can.userData.liftY || 0)
        can.rotation.z += (pointer.x * 0.1 - 0.1 - can.rotation.z) * 0.05
        can.rotation.x += (pointer.y * 0.1 + 0.12 - can.rotation.x) * 0.05

        bubbleMat.opacity = 0.25 + fizzState.density * 0.7
        bubbleMat.size = 0.07 + fizzState.density * 0.12

        const pos = bubbleGeo.attributes.position
        for (let i = 0; i < bubbleCount; i += 1) {
          let y = pos.getY(i) + speeds[i] * fizzState.rise
          if (y > 6) y = -6
          pos.setY(i, y)
        }
        pos.needsUpdate = true
        render()
      }

      window.addEventListener('resize', resize)

      if (reduced) {
        camera.position.set(0, 0.2, 8.5)
        can.scale.setScalar(1.1)
        render()
      } else {
        window.addEventListener('pointermove', onPointerMove)
        gsap.ticker.add(tick)

        // Longer scrub: approach → orbit → lift (camera + can + bubbles)
        const camTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.55,
          },
        })

        // Act 1 — approach (pull in)
        camTl.fromTo(
          camera.position,
          { x: 0.35, y: 0.4, z: 12.2 },
          { x: 0, y: 0.1, z: 8.2, duration: 1 },
          0,
        )
        camTl.fromTo(
          can.scale,
          { x: 0.92, y: 0.92, z: 0.92 },
          { x: 1.12, y: 1.12, z: 1.12, duration: 1 },
          0,
        )
        camTl.fromTo(fizzState, { density: 0.25, rise: 0.7 }, { density: 0.55, rise: 1.1, duration: 1 }, 0)

        // Act 2 — orbit (world turns with product)
        camTl.to(can.rotation, { y: '+=2.8', duration: 1.4 }, 0.85)
        camTl.to(
          camera.position,
          { x: -1.1, y: 0.35, z: 7.4, duration: 1.4 },
          0.85,
        )
        camTl.to(backdrop.rotation, { z: Math.PI * 1.25, duration: 1.4 }, 0.85)
        camTl.to(
          backdrop.scale,
          { x: 1.22, y: 1.22, z: 1.22, duration: 1.4 },
          0.85,
        )
        camTl.to(fizzState, { density: 1, rise: 1.85, duration: 1.2 }, 0.9)

        // Act 3 — lift + tight close-up, bubbles rush past
        camTl.to(
          camera.position,
          { x: 0.2, y: 1.15, z: 5.6, duration: 1.1 },
          2.1,
        )
        camTl.to(
          can.scale,
          { x: 1.38, y: 1.38, z: 1.38, duration: 1.1 },
          2.1,
        )
        camTl.to(
          can.userData,
          { liftY: 0.55, duration: 1.1 },
          2.1,
        )
        camTl.to(can.rotation, { y: '+=1.4', duration: 1.1 }, 2.1)
        camTl.to(fizzState, { density: 0.4, rise: 2.6, duration: 1 }, 2.2)
        camTl.to(
          '[data-fizz-title]',
          { opacity: 0.15, y: -40, duration: 0.9 },
          2.3,
        )
        camTl.to(
          '[data-fizz-fade]',
          { opacity: 0, y: -18, stagger: 0.05, duration: 0.7 },
          2.35,
        )

        const split = new SplitText('[data-fizz-title]', {
          type: 'chars',
          mask: 'chars',
        })
        split.chars.forEach((char, i) => {
          char.style.color = CHAR_COLORS[i % CHAR_COLORS.length]
        })
        gsap.from(split.chars, {
          yPercent: 120,
          rotate: 8,
          duration: 0.9,
          ease: 'back.out(1.6)',
          stagger: 0.035,
          delay: 0.25,
        })
        gsap.from('[data-fizz-fade]', {
          opacity: 0,
          y: 14,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.9,
        })
      }

      return () => {
        cancelled = true
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        gsap.ticker.remove(tick)
        bodyGeo.dispose()
        lidGeo.dispose()
        rimGeo.dispose()
        bubbleGeo.dispose()
        labelTexture.dispose()
        bodyMat.dispose()
        metalMat.dispose()
        bubbleMat.dispose()
        envMap.dispose()
        disposeObject(backdrop)
        if (customModel) disposeObject(customModel)
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, canLabel],
      revertOnUpdate: true,
    },
  )

  return (
    <section ref={root} className="relative h-[240svh] md:h-[280svh]">
      <div className="sticky top-0 h-svh overflow-hidden px-5 pt-28 pb-6 md:px-10">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        />

        <div className="pointer-events-none relative flex h-full flex-col justify-between">
          <p
            data-fizz-fade
            className="max-w-[34ch] text-xs font-semibold uppercase tracking-[0.22em] text-foam/70 md:text-sm"
          >
            {tagline}
          </p>

          <h1
            data-fizz-title
            className="font-brico text-[clamp(3rem,15vw,12rem)] leading-[0.92] font-extrabold tracking-[-0.03em] uppercase select-none"
          >
            {title}
          </h1>

          <div className="flex items-end justify-between gap-4 border-t border-foam/20 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-foam/60 md:text-xs">
            <p data-fizz-fade>{meta}</p>
            <p
              data-fizz-fade
              className="rounded-full bg-foam px-3 py-1.5 text-grape"
            >
              {hint} <span aria-hidden="true">↓</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
