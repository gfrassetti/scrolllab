import test from 'node:test'
import assert from 'node:assert/strict'

import { fitCameraDistance } from '../motion.js'

const MONOLITH = { fov: 42, radius: 3.57, base: 9.2, fill: 0.9 }

/** Qué fracción del ancho de pantalla ocupa el diámetro proyectado de una esfera a distancia `z`. */
function widthShare({ fov, aspect, radius }, z) {
  const halfH = Math.atan(Math.tan((fov * Math.PI) / 360) * aspect)
  return Math.tan(Math.asin(radius / z)) / Math.tan(halfH)
}

test('en pantallas anchas deja la cámara donde estaba: PC no cambia', () => {
  for (const [w, h] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1080],
  ]) {
    assert.equal(fitCameraDistance({ ...MONOLITH, aspect: w / h }), MONOLITH.base, `${w}×${h}`)
  }
})

test('en vertical aleja la cámara hasta que el objeto ocupa `fill` del ancho', () => {
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [768, 1024],
    [834, 1194],
  ]) {
    const aspect = w / h
    const z = fitCameraDistance({ ...MONOLITH, aspect })
    assert.ok(z > MONOLITH.base, `${w}×${h} se aleja`)
    const share = widthShare({ ...MONOLITH, aspect }, z)
    assert.ok(Math.abs(share - MONOLITH.fill) < 0.02, `${w}×${h}: ocupa ${(share * 100).toFixed(1)} % del ancho`)
  }
})

test('es continua: sin saltos entre un ancho y el siguiente', () => {
  let prev = fitCameraDistance({ ...MONOLITH, aspect: 0.3 })
  for (let aspect = 0.31; aspect <= 2.5; aspect += 0.01) {
    const z = fitCameraDistance({ ...MONOLITH, aspect })
    assert.ok(z <= prev + 1e-9, 'más ancha la pantalla, nunca más lejos la cámara')
    assert.ok((prev - z) / prev < 0.04, `salto de ${(prev - z).toFixed(2)} en aspect ${aspect.toFixed(2)}`)
    prev = z
  }
})

test('datos inválidos devuelven la distancia base', () => {
  for (const aspect of [0, -1, NaN, undefined]) {
    assert.equal(fitCameraDistance({ ...MONOLITH, aspect }), MONOLITH.base)
  }
  assert.equal(fitCameraDistance({ ...MONOLITH, aspect: 0.5, radius: 0 }), MONOLITH.base)
})

test('un objeto más chico se acerca más que uno grande (mismo ancho de pantalla)', () => {
  const big = fitCameraDistance({ ...MONOLITH, aspect: 0.46, radius: 4 })
  const small = fitCameraDistance({ ...MONOLITH, aspect: 0.46, radius: 2 })
  assert.ok(small < big)
})
