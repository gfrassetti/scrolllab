import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  createWebGLStage,
  createCoverPlane,
  fitCoverPlane,
  attachPointerOrbit,
} from '../../../lib/webgl'
import heroFace from './assets/hero-face.jpg'

/**
 * HeroCanvas — el retrato del hero vive acá, no en un `<img>`.
 *
 * Receta KPR (docs/scrolllab-webgl.md): plano texturizado + órbita esférica de
 * cámara con damp λ≈3. El puntero mueve la CÁMARA; nunca un `rotate` CSS sobre
 * la foto — eso es lo que delata un hero falso.
 *
 * Todo el lifecycle sale de `src/lib/webgl/`: no reimplementar acá la
 * matemática de cover ni el damp (era la falla de la iteración anterior).
 */
export default function HeroCanvas({
  img = heroFace,
  /** 0–1. <0.5 muestra más de la parte superior de la foto (encuadre de cara). */
  focalY = 0.38,
  focalX = 0.5,
  /** El puntero se mapea dentro de este elemento; si no, el viewport entero. */
  boundsEl = null,
  maxDeg = 10,
}) {
  const mount = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    const mountEl = mount.current
    const canvasEl = canvas.current
    if (!mountEl || !canvasEl) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const stage = createWebGLStage({
      canvas: canvasEl,
      mount: mountEl,
      fov: 28,
      cameraZ: 2,
      clearColor: 0x0a0810,
    })

    let mesh = null
    let texture = null
    let lastAspect = 0

    const refit = () => {
      if (!mesh || !texture) return
      fitCoverPlane({
        mesh,
        camera: stage.camera,
        distance: stage.camera.position.length(),
        texture,
        focalX,
        focalY,
      })
      lastAspect = stage.camera.aspect
    }

    const orbit = reduced
      ? null
      : attachPointerOrbit({
          camera: stage.camera,
          distance: 2,
          maxDeg,
          lambda: 3,
          boundsEl: boundsEl ?? mountEl,
        })

    const loader = new THREE.TextureLoader()
    loader.load(img, (tex) => {
      texture = tex
      mesh = createCoverPlane(tex)
      stage.scene.add(mesh)
      refit()
      // Reduced motion: un frame estático, sin rAF ni órbita.
      if (reduced) stage.renderer.render(stage.scene, stage.camera)
    })

    if (!reduced) {
      stage.start((dt) => {
        // El stage ya ajustó el viewport; refit solo si el aspect REALMENTE cambió.
        // Llamar cover() en cada frame/onUpdate era el origen del titileo al rebobinar.
        if (stage.camera.aspect !== lastAspect) refit()
        orbit?.update(dt)
      })
    }

    return () => {
      orbit?.dispose()
      stage.dispose()
      if (mesh) {
        stage.scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      texture?.dispose()
    }
  }, [img, focalX, focalY, boundsEl, maxDeg])

  return (
    <div data-hero-gl ref={mount} className="absolute inset-0">
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  )
}
