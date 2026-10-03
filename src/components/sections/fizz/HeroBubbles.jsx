import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, createFrameBudget, prefersReducedMotion, trackPointer } from '../../../lib/motion'

import {
  FOAM,
  TITLE_FRAGMENT,
  TITLE_VERTEX,
  buildStandInBottle,
  buildStudioEnv,
  createBottle,
  createStageShadow,
  disposeObject,
  drawTitleLine,
  loadBottleModel,
  loadHdrEnv,
} from './bottleKit'

/** Curated flavor presets — one flat stage color, its type ink and the drink tint. */
export const FIZZ_FLAVORS = {
  cobalt: { bg: '#2c4bff', ink: '#fff3e2', liquid: '#9db8ff' },
  berry: { bg: '#ff3ea5', ink: '#241352', liquid: '#ffc9e8' },
  citrus: { bg: '#ffb02e', ink: '#241352', liquid: '#fff1cc' },
  tropical: { bg: '#ff6b35', ink: '#241352', liquid: '#ffdccb' },
  mint: { bg: '#3ddc97', ink: '#241352', liquid: '#dcfff0' },
}

const TURNS = 2

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (t) => t * t * (3 - 2 * t)
const BUBBLE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

// Soap film: clear in the middle, bright on the rim, a window highlight up-left
// and its bounce down-right, with a thin iridescent drift.
const BUBBLE_FRAGMENT = /* glsl */ `
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float facing = max(dot(n, v), 0.0);
    float rim = pow(1.0 - facing, 2.4);
    vec3 film = 0.5 + 0.5 * cos(6.2831 * (rim * 1.3 + vec3(0.0, 0.33, 0.67)));
    float key = smoothstep(0.93, 0.985, dot(n, normalize(vec3(-0.5, 0.62, 0.6)))) * 0.85;
    float bounce = smoothstep(0.95, 0.99, dot(n, normalize(vec3(0.46, -0.58, 0.67)))) * 0.45;
    vec3 color = mix(uTint, film, rim * 0.28) + key + bounce;
    float alpha = clamp(rim * 0.9 + key * 0.95 + bounce + 0.035, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/**
 * HeroBubbles — a glass bottle, the headline and the fizz in one Three.js
 * canvas. The headline is drawn inside the canvas so the glass refracts it;
 * scroll spins the bottle across the stage while it keeps floating on its own.
 *
 * `modelUrl` swaps in a GLB (meshes named glass / liquid / cap / label get the
 * glass, the flavor tint, the inner bubbles and the label). Without it, a
 * lathe-built bottle stands in. `canImage` replaces the drawn label.
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D bottle are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  statement = 'Placeholder statement — two or three short lines about the drink, set big.',
  cta = 'Placeholder CTA',
  ctaHref = '#',
  marquee = 'SOOO MUCH FIZZ',
  flavor = 'cobalt',
  canLabel = 'BRAND*',
  canImage = '',
  modelUrl = '',
  envUrl = '',
  dracoPath = '/fizz/draco/',
}) {
  const root = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const statementRef = useRef(null)
  const marqueeRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'cobalt'
  const flavorCfg = FIZZ_FLAVORS[resolvedFlavor]

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      const stage = stageRef.current
      let W = stage.clientWidth
      let H = stage.clientHeight
      let narrow = W < 768
      let disposed = false

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      // En un teléfono (DPR 3) 1.5 se ve igual de nítido y cuesta la mitad de GPU.
      // En escritorio se dibuja un poco por encima de la pantalla: las líneas finas
      // del vidrio y la serigrafía quedan nítidas.
      const dpr = Math.min(window.devicePixelRatio * (narrow ? 1 : 1.25), narrow ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      // Sin tone mapping: el fondo visto a través del vidrio tiene que ser el
      // mismo color que el fondo de al lado.
      renderer.toneMapping = THREE.NoToneMapping

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(flavorCfg.bg)
      const envMap = buildStudioEnv(renderer, flavorCfg.bg)
      scene.environment = envMap
      // Un HDRI de estudio real (si se pasa `envUrl`) reemplaza al estudio armado
      // a mano: reflejos de cajas de luz de verdad en el vidrio y el metal.
      let hdrEnv = null
      if (envUrl) {
        loadHdrEnv(renderer, envUrl)
          .then((env) => {
            if (disposed) return env.dispose()
            hdrEnv = env
            scene.environment = env
            scene.environmentRotation.set(0, Math.PI * 0.55, 0)
            renderOnce()
          })
          .catch(() => {})
      }
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(-3, 4, 6)
      scene.add(keyLight)

      // 1 unidad = 1 px CSS en el plano z = 0: se maqueta como en el DOM.
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000)
      scene.add(camera)

      /* ── Headline, dentro del canvas ───────────────────────────── */
      const titleGroup = new THREE.Group()
      camera.add(titleGroup)
      const family = getComputedStyle(titleRef.current).fontFamily
      const words = String(title).trim().toUpperCase().split(/\s+/).filter(Boolean)
      const lines =
        words.length > 1
          ? [
              {
                text: words.slice(0, -1).join(' '),
                weight: 300,
                tracking: 0.04,
                width: 0.44,
                widthNarrow: 0.6,
                max: 0.19,
              },
              {
                text: words.at(-1),
                weight: 800,
                tracking: -0.03,
                width: 0.86,
                widthNarrow: 0.9,
                max: 0.36,
              },
            ]
          : [
              {
                text: words[0] || '',
                weight: 800,
                tracking: -0.03,
                width: 0.86,
                widthNarrow: 0.9,
                max: 0.36,
              },
            ]
      const planeGeo = new THREE.PlaneGeometry(1, 1)
      const lineTextures = []
      let letters = []
      // The state outlives every re-layout (fonts arriving, resizes): t goes 0 → 1
      // as the letter flies in from its scattered start.
      const letterStates = []
      const letterState = (i) =>
        (letterStates[i] ||= {
          t: reduced ? 1 : 0,
          ox: (Math.random() - 0.5) * W * 0.6,
          oy: -(0.12 + Math.random() * 0.4) * H,
          rot: (Math.random() - 0.5) * 1.8,
          s0: 0.35 + Math.random() * 1.1,
        })

      const applyLetters = () => {
        letters.forEach(({ mesh, state, x, y, w, h }) => {
          const k = 1 - state.t
          const sc = lerp(state.s0, 1, state.t)
          mesh.position.set(x + k * state.ox, y + k * state.oy, 0)
          mesh.rotation.z = k * state.rot
          mesh.scale.set(w * sc, h * sc, 1)
          mesh.material.uniforms.uIn.value = clamp01(state.t * 2)
        })
      }

      // «SOOO MUCH FIZZ»: one huge line that crosses the screen between the
      // statement and the flavors. Same opaque shader as the headline, so the
      // glass refracts it as the bottle tumbles through.
      const marqueeMesh = new THREE.Mesh(
        planeGeo,
        new THREE.ShaderMaterial({
          uniforms: {
            map: { value: null },
            uInk: { value: new THREE.Color(flavorCfg.ink) },
            uPaper: { value: new THREE.Color(flavorCfg.bg) },
            uUv0: { value: 0 },
            uUv1: { value: 1 },
            uIn: { value: 1 },
            uFade: { value: 1 },
          },
          vertexShader: TITLE_VERTEX,
          fragmentShader: TITLE_FRAGMENT,
        }),
      )
      marqueeMesh.visible = false
      camera.add(marqueeMesh)
      let marqueeWidth = 0
      const layoutMarquee = () => {
        marqueeMesh.material.uniforms.map.value?.dispose()
        const drawn = drawTitleLine(String(marquee).toUpperCase(), {
          family,
          weight: 800,
          tracking: -0.02,
          targetWidth: 1e6,
          maxSize: H * (narrow ? 0.24 : 0.32),
          dpr,
        })
        marqueeMesh.material.uniforms.map.value = drawn.texture
        marqueeMesh.scale.set(drawn.width, drawn.height, 1)
        marqueeWidth = drawn.width
      }

      const clearTitle = () => {
        letters.forEach(({ mesh }) => {
          titleGroup.remove(mesh)
          mesh.material.dispose()
        })
        lineTextures.forEach((texture) => texture.dispose())
        letters = []
        lineTextures.length = 0
      }

      const layoutTitle = () => {
        clearTitle()
        const gap = H * 0.035
        const drawnLines = lines.map((line) =>
          drawTitleLine(line.text, {
            family,
            weight: line.weight,
            tracking: line.tracking,
            targetWidth: W * (narrow ? line.widthNarrow : line.width),
            maxSize: H * line.max,
            dpr,
          }),
        )
        const total = drawnLines.reduce((sum, d, i) => sum + d.height + (i ? gap : 0), 0)
        let top = total / 2 + H * 0.02
        let n = 0
        drawnLines.forEach((drawn) => {
          lineTextures.push(drawn.texture)
          const y = top - drawn.height / 2
          drawn.cuts.forEach((cut) => {
            const mesh = new THREE.Mesh(
              planeGeo,
              new THREE.ShaderMaterial({
                uniforms: {
                  map: { value: drawn.texture },
                  uInk: { value: new THREE.Color(flavorCfg.ink) },
                  uPaper: { value: new THREE.Color(flavorCfg.bg) },
                  uUv0: { value: cut.u0 },
                  uUv1: { value: cut.u1 },
                  uIn: { value: 0 },
                  uFade: { value: 1 },
                },
                vertexShader: TITLE_VERTEX,
                fragmentShader: TITLE_FRAGMENT,
              }),
            )
            titleGroup.add(mesh)
            letters.push({
              mesh,
              state: letterState(n),
              x: (cut.x0 + cut.x1) / 2 - drawn.width / 2,
              y,
              w: cut.x1 - cut.x0,
              h: drawn.height,
            })
            n += 1
          })
          top -= drawn.height + gap
        })
        applyLetters()
        layoutMarquee()
      }

      /* ── Sombra sobre el fondo ─────────────────────────────────── */
      const stageColor = new THREE.Color(flavorCfg.bg)
      const shadow = createStageShadow(stageColor, { W, H })
      scene.add(shadow.mesh)

      /* ── Botella ───────────────────────────────────────────────── */
      const rig = new THREE.Group()
      const spin = new THREE.Group()
      rig.add(spin)
      rig.visible = false
      scene.add(rig)

      const bottle = createBottle({ narrow, liquid: flavorCfg.liquid, stage: flavorCfg.bg })
      let model = null

      const paintLabel = () => {
        if (!model || canImage) return
        bottle.paintPrint({ family, brand: canLabel })
      }

      const mountModel = (object) => {
        model = object
        bottle.dress(model, {
          image: canImage,
          isDisposed: () => disposed,
          onImage: () => renderOnce(),
        })
        paintLabel()
        spin.add(model)
        rig.visible = true
        startBottle()
        renderOnce()
      }

      /* ── Burbujas del escenario ────────────────────────────────── */
      const bubbleCount = narrow ? 14 : 30
      // Extra, bigger bubbles that only show up during the «much fizz» burst.
      const burstCount = narrow ? 26 : 56
      const bubbleMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 32, 20),
        new THREE.ShaderMaterial({
          uniforms: { uTint: { value: new THREE.Color(FOAM) } },
          vertexShader: BUBBLE_VERTEX,
          fragmentShader: BUBBLE_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
        bubbleCount + burstCount,
      )
      bubbleMesh.frustumCulled = false
      scene.add(bubbleMesh)
      const bubbleDummy = new THREE.Object3D()
      const spawnBubble = (b, scatter) => {
        // Los costados cargan más burbujas: el centro queda para el titular.
        const lane = Math.random()
        const side =
          lane < 0.42
            ? Math.random() * 0.26
            : lane < 0.84
              ? 0.74 + Math.random() * 0.26
              : 0.26 + Math.random() * 0.48
        const big = Math.random() < 0.22
        b.r = (big ? 22 + Math.random() * 30 : 4 + Math.random() * 10) * (narrow ? 0.7 : 1)
        b.x = (side - 0.5) * W * 1.08
        b.z = -100 + Math.random() * 320
        b.speed = (0.1 + (b.r / 52) * 0.2) * (0.8 + Math.random() * 0.4)
        b.phase = Math.random() * Math.PI * 2
        b.sway = 6 + Math.random() * 16
        b.y = scatter
          ? (Math.random() - 0.5) * H * 1.1
          : -H * 0.5 - b.r * 2 - Math.random() * H * 0.25
        b.born = b.y
        return b
      }
      const bubbles = Array.from({ length: bubbleCount + burstCount }, (_, i) => {
        const b = spawnBubble({}, true)
        b.delay = Math.random() * 0.5
        if (i >= bubbleCount) {
          b.burst = true
          b.k = Math.random() * 0.6
        }
        return b
      })
      // The first thing on screen: the bubbles, popping in one by one.
      const intro = { bubbles: reduced ? 1 : 0 }
      const placeBubbles = (time, dt, boost, burst = 0) => {
        bubbles.forEach((b, i) => {
          b.y += b.speed * H * dt * boost * (b.burst ? 1.5 : 1)
          if (b.y > H * 0.5 + b.r * 3) {
            spawnBubble(b, false)
            if (b.burst) b.r *= 1.8
          }
          const grow =
            clamp01((b.y - b.born) / (H * 0.12) + (b.born > -H * 0.5 ? 1 : 0)) *
            smooth(clamp01((intro.bubbles - (b.delay || 0)) / 0.5)) *
            (b.burst ? smooth(clamp01(burst * 1.6 - b.k)) : 1)
          const wobble = Math.sin(time * 3.1 + b.phase) * 0.05
          bubbleDummy.position.set(b.x + Math.sin(time * 0.9 + b.phase) * b.sway, b.y, b.z)
          bubbleDummy.scale.set(b.r * grow * (1 + wobble), b.r * grow * (1 - wobble), b.r * grow)
          bubbleDummy.updateMatrix()
          bubbleMesh.setMatrixAt(i, bubbleDummy.matrix)
        })
        bubbleMesh.instanceMatrix.needsUpdate = true
      }

      /* ── Medidas ───────────────────────────────────────────────── */
      let cameraZ = 1
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        narrow = W < 768
        renderer.setSize(W, H, false)
        shadow.resize(W, H)
        cameraZ = H / (2 * Math.tan((Math.PI / 180) * 15))
        camera.aspect = W / Math.max(H, 1)
        camera.near = cameraZ / 10
        camera.far = cameraZ * 10
        camera.position.z = cameraZ
        camera.updateProjectionMatrix()
        titleGroup.position.z = -cameraZ
        marqueeMesh.position.z = -cameraZ
        layoutTitle()
      }

      // `top`: cuánto subió este escenario (≤ 0) al irse; la botella lo compensa.
      const state = { p: 0, m: 0, enter: reduced ? 0 : 1, top: 0 }
      // El mouse en PC, el dedo en el teléfono (un dedo que scrollea cancela
      // pointermove). En calma la botella queda quieta: no escucha nada.
      const pointer = reduced ? { x: 0, y: 0 } : trackPointer()
      // Lo que la botella usa de ese puntero, suavizado: un dedo aparece de golpe
      // (touchstart) y se va de golpe (touchend), y sin esto la botella daba un salto.
      const look = { x: 0, y: 0 }
      let lastTop = 0
      let boost = 1

      const pose = (time) => {
        const { p, enter } = state
        const s = smooth(p)
        const out = 1 - (1 - p) * (1 - p)
        const bob = reduced ? 0 : Math.sin(time * 1.05) * H * 0.016
        const sway = reduced ? 0 : Math.sin(time * 0.29) * 0.42
        const size = narrow ? Math.min(H * 0.5, W * 1.35) : Math.min(H * 0.86, W * 0.62)
        rig.position.x = W * (narrow ? lerp(0, 0.22, s) : lerp(-0.06, 0.29, s))
        rig.position.y =
          H * (narrow ? lerp(-0.04, -0.2, s) : lerp(-0.03, -0.05, s)) + bob - enter * H * 1.05
        rig.rotation.z = narrow ? lerp(0.3, -0.34, s) : lerp(0.4, -0.2, s)
        rig.rotation.x = Math.sin(Math.PI * p) * 0.3 + look.y * 0.06
        spin.rotation.y = -TURNS * Math.PI * 2 * out + sway + look.x * 0.25 - enter * 2.4
        rig.scale.setScalar(size * lerp(1, 1.12, s))

        // The «much fizz» stretch: the bottle tumbles across to the center while
        // the line slides by behind it.
        const { m } = state
        if (m > 0) {
          const ms = smooth(m)
          const arc = Math.sin(Math.PI * m)
          rig.position.x = lerp(rig.position.x, W * (narrow ? 0 : -0.04), ms)
          rig.position.y -= arc * H * 0.05
          rig.rotation.z -= Math.PI * 2 * ms
          spin.rotation.y += Math.PI * 2 * ms
          rig.scale.multiplyScalar(1 + arc * 0.14)
        }
        marqueeMesh.visible = m > 0.001 && m < 0.999
        marqueeMesh.position.x = lerp(W / 2 + marqueeWidth / 2, -(W / 2 + marqueeWidth / 2), m)
        // Cuando este escenario se va hacia arriba, la botella se queda clavada en
        // la pantalla: es la misma que sigue en los sabores.
        rig.position.y += state.top
        shadow.place({
          x: rig.position.x,
          y: rig.position.y,
          scale: rig.scale.x,
          rotZ: rig.rotation.z,
          strength: 0.55 * (1 - enter),
        })
      }

      const render = () => renderer.render(scene, camera)
      const renderOnce = () => {
        if (!reduced || disposed) return
        pose(0)
        render()
      }

      // Fuera de pantalla no se dibuja: en un teléfono la GPU seguía renderizando
      // el 3D mientras se leía el resto de la página.
      let onScreen = true
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(root.current)

      // Si el teléfono no llega a ~30 cuadros (vidrio con transmisión, DPR alto),
      // baja la resolución de a escalones. En un equipo rápido no cambia nada.
      const budget = createFrameBudget({
        dpr,
        apply: (value) => {
          renderer.setPixelRatio(value)
          layout()
        },
      })

      const tick = (time, deltaMs) => {
        if (!onScreen) return
        const dt = Math.min(deltaMs / 1000, 0.05)
        // El titular sube con la página, 1:1, como si fuera DOM.
        const rect = root.current.getBoundingClientRect()
        state.top = Math.min(stage.getBoundingClientRect().top, 0)
        titleGroup.position.y = Math.min(Math.max(-rect.top, 0), rect.height - H)
        // Al irse hacia arriba el titular se apaga, sin cortarse de golpe.
        const fade = 1 - smooth(clamp01((-rect.top - H * 0.05) / (H * 0.55)))
        letters.forEach(({ mesh }) => {
          mesh.material.uniforms.uFade.value = fade
        })
        applyLetters()
        // Scrollear agita el gas.
        const speed = Math.abs(rect.top - lastTop)
        lastTop = rect.top
        boost += (1 + Math.min(speed * 0.06, 2.5) - boost) * 0.12

        camera.position.x += (pointer.x * W * 0.04 - camera.position.x) * 0.03
        camera.position.y += (-pointer.y * H * 0.04 - camera.position.y) * 0.03
        const follow = 1 - Math.exp(-dt * 12)
        look.x += (pointer.x - look.x) * follow
        look.y += (pointer.y - look.y) * follow
        pose(time)
        placeBubbles(time, dt, boost, Math.sin(Math.PI * state.m))
        bottle.update(time)
        render()
        budget.tick(deltaMs)
      }

      let introDone = reduced
      function startBottle() {
        if (reduced || !introDone || !model) return
        gsap.to(state, { enter: 0, duration: 2, ease: 'power3.out' })
      }

      layout()
      placeBubbles(0, 0, 1)
      const ro = new ResizeObserver(() => {
        if (stage.clientWidth === W && stage.clientHeight === H) return
        layout()
        renderOnce()
      })
      ro.observe(stage)
      // La tipografía de la página llega después del primer dibujo.
      document.fonts?.ready.then(() => {
        if (disposed) return
        layoutTitle()
        paintLabel()
        renderOnce()
      })

      if (modelUrl) {
        loadBottleModel(modelUrl, dracoPath)
          .then((object) => {
            if (disposed) return disposeObject(object)
            mountModel(object)
          })
          .catch(() => {
            console.warn(`HeroBubbles: could not load model "${modelUrl}"`)
            if (!disposed) mountModel(buildStandInBottle())
          })
      } else {
        mountModel(buildStandInBottle())
      }

      if (reduced) {
        gsap.set('[data-fizz-fade]', { opacity: 1 })
        calmReveal('[data-fizz-statement], [data-fizz-cta]')
        renderOnce()
      } else {
        gsap.ticker.add(tick)

        gsap.to(state, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            endTrigger: statementRef.current,
            end: 'bottom bottom',
            scrub: 0.6,
          },
        })
        gsap.to(state, {
          m: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: marqueeRef.current,
            // Starts once the statement is halfway gone, so the line never runs over it.
            start: 'top 45%',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        })

        // Entrada en orden, sin prisa: burbujas → titular letra por letra → textos
        // chicos → botella.
        const LETTERS_AT = 1.5
        gsap.to(intro, { bubbles: 1, duration: 1.8, ease: 'none' })
        letters.forEach(({ state }, i) => {
          gsap.to(state, {
            t: 1,
            duration: 1.25,
            ease: 'power3.out',
            delay: LETTERS_AT + i * 0.06,
          })
        })
        const lettersDone = LETTERS_AT + letters.length * 0.06 + 1.25
        gsap.to('[data-fizz-fade]', {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.1,
          delay: lettersDone - 0.7,
        })
        gsap.to('[data-fizz-arrow]', {
          y: 6,
          opacity: 0.35,
          duration: 0.85,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
        gsap.delayedCall(lettersDone - 0.9, () => {
          introDone = true
          startBottle()
        })

        SplitText.create('[data-fizz-statement]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.09,
              scrollTrigger: {
                trigger: '[data-fizz-statement]',
                start: 'top 78%',
              },
            }),
        })
        gsap.from('[data-fizz-cta]', {
          opacity: 0,
          y: 16,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-fizz-cta]', start: 'top 88%' },
        })
      }

      return () => {
        disposed = true
        ro.disconnect()
        io.disconnect()
        pointer.dispose?.()
        gsap.ticker.remove(tick)
        clearTitle()
        marqueeMesh.material.uniforms.map.value?.dispose()
        marqueeMesh.material.dispose()
        planeGeo.dispose()
        shadow.dispose()
        bubbleMesh.geometry.dispose()
        bubbleMesh.material.dispose()
        bottle.dispose()
        if (model) disposeObject(model)
        envMap.dispose()
        hdrEnv?.dispose()
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, envUrl, dracoPath, canImage, canLabel, title, marquee],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={root}
      className="relative"
      style={{
        backgroundColor: flavorCfg.bg,
        color: flavorCfg.ink,
        '--fizz-bg': flavorCfg.bg,
        '--fizz-ink': flavorCfg.ink,
      }}
    >
      <div
        ref={stageRef}
        className="pointer-events-none sticky top-0 h-svh w-full overflow-hidden calm:absolute calm:inset-x-0"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      </div>

      <div className="relative -mt-[100svh] calm:mt-0">
        <div className="pointer-events-none h-[170svh] calm:h-svh">
          <div className="flex h-svh flex-col justify-between px-5 pt-28 pb-6 md:px-10">
            <p
              data-fizz-fade
              className="max-w-[30ch] text-xs font-semibold uppercase tracking-[0.22em] opacity-0 md:text-sm"
            >
              {tagline}
            </p>

            <h1 ref={titleRef} className="sr-only font-brico">
              {title}
            </h1>

            <div className="flex items-end justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] md:text-xs">
              <p data-fizz-fade className="hidden opacity-0 md:block">
                {meta}
              </p>
              <p data-fizz-fade className="ml-auto flex items-center gap-3 opacity-0 max-md:pb-2">
                {hint}
                <span aria-hidden="true" className="flex flex-col items-center gap-1">
                  <span className="h-8 w-px bg-current opacity-60 md:h-10" />
                  <span data-fizz-arrow className="block text-sm leading-none">
                    ↓
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div
          ref={statementRef}
          className="flex min-h-[90svh] items-start px-5 pt-8 pb-24 md:items-center md:px-10 md:pt-0"
        >
          <div className="md:w-[58%]">
            <p
              data-fizz-statement
              className="font-brico text-[clamp(2rem,5vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.02em] uppercase"
            >
              {statement}
            </p>
            <a
              data-fizz-cta
              href={ctaHref}
              className="tpl-hit relative mt-10 inline-flex items-center rounded-full border border-current px-7 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition-[background-color,color,transform] duration-300 ease-out hover:bg-[var(--fizz-ink)] hover:text-[var(--fizz-bg)] active:scale-[0.97] md:mt-14"
            >
              {cta}
            </a>
          </div>
        </div>

        {/* The «much fizz» stretch: the line itself is drawn in the canvas. */}
        <div ref={marqueeRef} aria-hidden="true" className="h-[220svh] calm:hidden" />
        <p className="sr-only">{marquee}</p>
      </div>
    </section>
  )
}
