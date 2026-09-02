<template>
  <div>
    <!-- one fixed WebGL canvas: the hero plane transforms into the card -->
    <canvas ref="canvas" class="stage" aria-hidden="true" />
    <span ref="dockLabel" class="mono dock-label"><i />Animus character</span>

    <div class="rail" aria-hidden="true">
      <span class="cross">✛</span>
      <span class="dots mono">.....</span>
    </div>

    <section ref="act" class="act">
      <div class="pin">
        <p ref="intro" class="intro mono">
          VANTA is a brand that focuses on collective narrative and empowering
          storytellers. A living story, an uncharted world — waiting to be explored,
          to be reimagined.
        </p>

        <h1 ref="type" class="type">
          <span class="line"><b class="num">01<span>K</span></b><span class="w">Keep.</span></span>
          <span class="line"><b class="num">02<span>P</span></b><span class="w">Protect.</span></span>
          <span class="line"><b class="num">03<span>R</span></b><span class="w">Reimagine.</span></span>
        </h1>

        <div ref="scrollInd" class="scroll-ind mono">Scroll <span>⌄</span></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import Lenis from 'lenis'
import { createHeroStage } from '~/webgl/heroStage'

const canvas = ref<HTMLCanvasElement>()
const dockLabel = ref<HTMLElement>()
const act = ref<HTMLElement>()
const type = ref<HTMLElement>()
const intro = ref<HTMLElement>()
const scrollInd = ref<HTMLElement>()

let stage: ReturnType<typeof createHeroStage> | null = null
let lenis: Lenis | null = null
let onScroll: (() => void) | null = null
let rafLoop = 0

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const band = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))

function applyDock(p: number) {
  const dockE = band(p, 0.5, 0.9)
  const flip = band(p, 0.88, 1)
  stage?.setDock(dockE)

  // pin the label to the top-left of where the WebGL card lands
  const rect = stage?.cardScreenRect()
  const d = dockLabel.value!
  if (rect) {
    d.style.left = `calc(${(rect.x * 100).toFixed(2)}vw + 1rem)`
    d.style.top = `calc(${(rect.y * 100).toFixed(2)}vh + 1rem)`
  }
  d.style.opacity = String(band(p, 0.7, 0.9) * (1 - flip * 0.35))

  const t = type.value!
  t.style.setProperty('--dim', String(dockE))
  t.style.opacity = String(1 - dockE * 0.75 - flip * 0.25)

  intro.value!.style.opacity = String(1 - band(p, 0.26, 0.46))
  scrollInd.value!.style.opacity = String(1 - band(p, 0.04, 0.16))
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stage = createHeroStage(canvas.value!, '/art/hero-kai.png')

  const words = type.value!.querySelectorAll('.w')
  if (reduced) gsap.set(words, { y: 0 })
  else
    gsap.to(words, {
      y: 0,
      duration: 0.95,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.2,
    })

  onScroll = () => {
    const el = act.value!
    const r = el.getBoundingClientRect()
    const total = el.offsetHeight - window.innerHeight
    applyDock(total > 0 ? clamp01(-r.top / total) : 0)
  }

  const pParam = parseFloat(new URLSearchParams(location.search).get('p') || '')
  const pinned = Number.isFinite(pParam)

  if (reduced || pinned) {
    window.addEventListener('scroll', onScroll, { passive: true })
  } else {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on('scroll', onScroll)
    const loop = (t: number) => {
      lenis?.raf(t)
      rafLoop = requestAnimationFrame(loop)
    }
    rafLoop = requestAnimationFrame(loop)
  }

  if (pinned) {
    const pv = clamp01(pParam)
    const hold = () => applyDock(pv)
    hold()
    window.addEventListener('resize', hold)
  } else {
    onScroll()
  }
  ;(window as unknown as { __p: (v: number) => void }).__p = applyDock
})

onBeforeUnmount(() => {
  stage?.dispose()
  lenis?.destroy()
  cancelAnimationFrame(rafLoop)
  if (onScroll) window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.dock-label {
  position: fixed;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
  will-change: opacity, left, top;
}
.dock-label i {
  width: 6px;
  height: 6px;
  background: var(--cyan);
  display: inline-block;
}

.rail {
  position: fixed;
  inset-block: 0;
  left: 0;
  width: 52px;
  z-index: 5;
  pointer-events: none;
  color: rgba(238, 241, 246, 0.7);
}
.rail .cross {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 17px;
}
.rail .dots {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  letter-spacing: 0.3em;
  opacity: 0.4;
}

.act {
  position: relative;
  height: 420vh;
}
.pin {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  z-index: 2;
  pointer-events: none;
}

.intro {
  position: absolute;
  top: 13vh;
  left: 5.5vw;
  max-width: 21rem;
  color: rgba(238, 241, 246, 0.8);
}

.type {
  position: absolute;
  left: 5.5vw;
  bottom: 5vh;
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 10.5vw, 9rem);
  line-height: 0.92;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--ink) calc((1 - var(--dim, 0)) * 100%), var(--grey));
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.3);
}
.type .line {
  display: block;
  position: relative;
  overflow: hidden;
  padding-left: 1.7em;
}
.type .num {
  position: absolute;
  left: 0.1em;
  bottom: 0.34em;
  font-family: var(--font-mono);
  font-size: 0.145em;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: rgba(238, 241, 246, 0.5);
}
.type .num span {
  opacity: 0.6;
}
.type .w {
  display: block;
  transform: translateY(115%);
}

.scroll-ind {
  position: absolute;
  right: 5.5vw;
  bottom: 6vh;
  display: flex;
  align-items: center;
  gap: 0.6em;
  color: rgba(238, 241, 246, 0.5);
}
@media (prefers-reduced-motion: reduce) {
  .type .w {
    transform: none;
  }
}
</style>
