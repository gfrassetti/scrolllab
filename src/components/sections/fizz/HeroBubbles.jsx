import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

const gltfLoaderMod = () =>
  import('three/examples/jsm/loaders/GLTFLoader.js')
import canCitrus from './assets/soda-can-01.png'
import canBerry from './assets/soda-can-02.png'
import canMint from './assets/soda-can-03.png'
import canTropical from './assets/soda-can-04.png'
import canPurple from './assets/soda-can-05.png'

/** Curated flavor presets — PNG cutout + bubble / backdrop tint. */
export const FIZZ_FLAVORS = {
  berry: {
    base: '#ff3ea5',
    dark: '#b81f74',
    bubbles: 0xffd1ec,
    back: '#5b1a8a',
    can: canBerry,
  },
  citrus: {
    base: '#ffb02e',
    dark: '#e08a00',
    bubbles: 0xffe9c0,
    back: '#8a4a10',
    can: canCitrus,
  },
  tropical: {
    base: '#ff6b35',
    dark: '#d14a17',
    bubbles: 0xffd6c4,
    back: '#7a2a40',
    can: canTropical,
  },
  mint: {
    base: '#3ddc97',
    dark: '#1fa96d',
    bubbles: 0xd2ffe9,
    back: '#1a5a48',
    can: canMint,
  },
}

const CHAR_COLORS = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

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
    if (!node.isMesh) return
    // Avoid alpha-blend ghosting from Meshy textures (looks like a second can).
    node.castShadow = false
    node.receiveShadow = false
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    mats.forEach((m) => {
      if (!m) return
      m.transparent = false
      m.opacity = 1
      m.depthWrite = true
      m.depthTest = true
      m.side = THREE.FrontSide
      m.alphaTest = 0
      if ('envMapIntensity' in m) m.envMapIntensity = 1.35
      if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 0.45, 0.55)
      if ('metalness' in m) m.metalness = Math.max(m.metalness ?? 0.2, 0.15)
      m.needsUpdate = true
    })
  })
}

function disposeObject(root) {
  root.traverse((n) => {
    n.geometry?.dispose?.()
    if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose?.())
    else n.material?.dispose?.()
  })
}

/**
 * Decorative backdrop that rotates with scroll — soft discs + petal shapes
 * behind the can (MANA-like motion).
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
 * HeroBubbles — photorealistic can PNG (alpha cutout) over a scroll-driven
 * Three.js backdrop + bubbles. Optional `modelUrl` swaps in a custom GLB.
 *
 * `canImage` overrides the flavor default PNG.
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D can are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  flavor = 'berry',
  canLabel = 'BRAND*',
  canImage = '',
  modelUrl = '',
}) {
  void canLabel
  const root = useRef(null)
  const canvasRef = useRef(null)
  const canImgRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'berry'
  const flavorCfg = FIZZ_FLAVORS[resolvedFlavor]
  const useGlb = Boolean(modelUrl && typeof modelUrl === 'string')
  const heroCanSrc = canImage || flavorCfg.can || canPurple
  // Never bridge with PNG when a GLB is set — different pose = ghost can.
  const showPngCan = !useGlb

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

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
      renderer.setClearColor(0x000000, 0)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(0, 0.15, 10)

      const backdrop = buildScrollBackdrop(flavorCfg)
      scene.add(backdrop)

      // GLB path: no PNG stand-in — only show the can once the model is ready.
      let can = null
      let envMap
      let customModel = null
      let cancelled = false
      let modelLoaded = false

      if (useGlb) {
        envMap = buildStudioEnv(renderer)
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

        can = new THREE.Group()
        can.visible = false
        can.rotation.set(0.18, -0.55, -0.1)
        can.userData.liftY = 0
        scene.add(can)

        gltfLoaderMod()
          .then(({ GLTFLoader }) => {
            if (cancelled) return
            new GLTFLoader().load(
              modelUrl,
              (gltf) => {
                if (cancelled) {
                  disposeObject(gltf.scene)
                  return
                }
                // Drop any prior child (Strict Mode / HMR remount) before attach.
                while (can.children.length) {
                  const child = can.children[0]
                  can.remove(child)
                  disposeObject(child)
                }
                customModel = gltf.scene
                fitObjectToScene(customModel)
                boostPbrMaterials(customModel)
                can.add(customModel)
                can.visible = true
                modelLoaded = true
                if (!reduced) {
                  can.scale.setScalar(0.94)
                  gsap.to(can.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.4,
                    ease: 'power2.out',
                  })
                }
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

      const fizzState = { density: 0.35, rise: 1 }
      const pointer = { x: 0, y: 0 }
      // Start small/low — ticker owns transform; CSS only hides opacity to avoid FOUC.
      const canDom = { liftY: 40, rotX: 8, rotY: -12, rotZ: -4, scale: 0.85 }

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

      const applyCanDom = () => {
        const el = canImgRef.current
        if (!el) return
        const bob = Math.sin(gsap.ticker.time * 1.1) * 6
        const px = pointer.x * 8
        const py = pointer.y * 6
        el.style.transform = `translate3d(${px}px, ${canDom.liftY + bob + py}px, 0) rotateX(${canDom.rotX + pointer.y * 4}deg) rotateY(${canDom.rotY + pointer.x * 10}deg) rotateZ(${canDom.rotZ}deg) scale(${canDom.scale})`
      }

      const tick = () => {
        if (can && modelLoaded) {
          can.position.y =
            Math.sin(gsap.ticker.time * 1.1) * 0.1 + (can.userData.liftY || 0)
          can.rotation.z += (pointer.x * 0.1 - 0.1 - can.rotation.z) * 0.05
          can.rotation.x += (pointer.y * 0.1 + 0.12 - can.rotation.x) * 0.05
        } else {
          applyCanDom()
        }

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
        if (can) can.scale.setScalar(1.1)
        else {
          canDom.scale = 1.08
          applyCanDom()
        }
        gsap.set('[data-fizz-can]', { opacity: 1, scale: 1, y: 0 })
        render()
      } else {
        window.addEventListener('pointermove', onPointerMove)
        gsap.ticker.add(tick)

        const camTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.55,
          },
        })

        camTl.fromTo(
          camera.position,
          { x: 0.35, y: 0.4, z: 12.2 },
          { x: 0, y: 0.1, z: 8.2, duration: 1 },
          0,
        )
        camTl.fromTo(
          fizzState,
          { density: 0.25, rise: 0.7 },
          { density: 0.55, rise: 1.1, duration: 1 },
          0,
        )

        if (can) {
          camTl.fromTo(
            can.scale,
            { x: 0.92, y: 0.92, z: 0.92 },
            { x: 1.12, y: 1.12, z: 1.12, duration: 1 },
            0,
          )
          camTl.to(can.rotation, { y: '+=2.8', duration: 1.4 }, 0.85)
          camTl.to(
            camera.position,
            { x: -1.1, y: 0.35, z: 7.4, duration: 1.4 },
            0.85,
          )
          camTl.to(
            can.scale,
            { x: 1.38, y: 1.38, z: 1.38, duration: 1.1 },
            2.1,
          )
          camTl.to(can.userData, { liftY: 0.55, duration: 1.1 }, 2.1)
          camTl.to(can.rotation, { y: '+=1.4', duration: 1.1 }, 2.1)
        }

        if (!useGlb) {
          camTl.fromTo(canDom, { scale: 0.88 }, { scale: 1.06, duration: 1 }, 0)
          camTl.to(
            canDom,
            { rotY: 18, rotZ: 2, rotX: 4, duration: 1.4 },
            0.85,
          )
          camTl.to(
            camera.position,
            { x: -0.6, y: 0.25, z: 7.6, duration: 1.4 },
            0.85,
          )
          camTl.to(
            canDom,
            { scale: 1.28, liftY: -28, rotY: -8, duration: 1.1 },
            2.1,
          )
        }

        camTl.to(backdrop.rotation, { z: Math.PI * 1.25, duration: 1.4 }, 0.85)
        camTl.to(
          backdrop.scale,
          { x: 1.22, y: 1.22, z: 1.22, duration: 1.4 },
          0.85,
        )
        camTl.to(fizzState, { density: 1, rise: 1.85, duration: 1.2 }, 0.9)
        camTl.to(
          camera.position,
          { x: 0.2, y: 1.15, z: 5.6, duration: 1.1 },
          2.1,
        )
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
        if (!useGlb) {
          // CSS opacity-0 + canDom seed — never gsap.from (that flashes a painted frame).
          gsap.to('[data-fizz-can]', {
            opacity: 1,
            duration: 1,
            ease: 'power3.out',
            delay: 0.15,
          })
          gsap.to(canDom, {
            scale: 1,
            liftY: 0,
            duration: 1,
            ease: 'power3.out',
            delay: 0.15,
          })
        }
      }

      return () => {
        cancelled = true
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        gsap.ticker.remove(tick)
        bubbleGeo.dispose()
        bubbleMat.dispose()
        disposeObject(backdrop)
        if (envMap) envMap.dispose()
        if (customModel) disposeObject(customModel)
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, canImage, useGlb],
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

        {/* Photoreal cutout — only when there is no GLB (never as a load bridge) */}
        {showPngCan && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center perspective-[1200px]">
            <img
              ref={canImgRef}
              data-fizz-can
              src={heroCanSrc}
              alt=""
              draggable={false}
              className="h-[min(78svh,720px)] w-auto max-w-[min(58vw,340px)] origin-center opacity-0 select-none object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.65)] will-change-transform md:max-w-[380px]"
            />
          </div>
        )}

        <div className="pointer-events-none relative z-[2] flex h-full flex-col justify-between">
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
