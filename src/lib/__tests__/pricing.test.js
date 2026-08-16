import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD,
  COMMERCE_PACK_SURCHARGE_USD,
  MAX_CUSTOM_SECTIONS,
  TEMPLATE_PRICES_USD,
  arsFromUsd,
  customExtraSections,
  estimateCustomPriceUsd,
  formatPriceFromUsd,
  formatUsd,
  formatArs,
  nextSectionArs,
  nextSectionUsd,
} from '../pricing.js'

const RATE = 1560

describe('estimateCustomPriceUsd', () => {
  it('cobra la base hasta las secciones incluidas', () => {
    assert.equal(estimateCustomPriceUsd(0, false), CUSTOM_BASE_PRICE_USD)
    assert.equal(estimateCustomPriceUsd(1, false), CUSTOM_BASE_PRICE_USD)
    assert.equal(
      estimateCustomPriceUsd(CUSTOM_BASE_SECTIONS, false),
      CUSTOM_BASE_PRICE_USD,
    )
  })

  it('suma el adicional recién a partir de la sección 9', () => {
    assert.equal(customExtraSections(CUSTOM_BASE_SECTIONS), 0)
    assert.equal(customExtraSections(CUSTOM_BASE_SECTIONS + 1), 1)
    assert.equal(
      estimateCustomPriceUsd(9, false),
      CUSTOM_BASE_PRICE_USD + CUSTOM_EXTRA_SECTION_USD,
    )
    assert.equal(
      estimateCustomPriceUsd(MAX_CUSTOM_SECTIONS, false),
      CUSTOM_BASE_PRICE_USD +
        (MAX_CUSTOM_SECTIONS - CUSTOM_BASE_SECTIONS) * CUSTOM_EXTRA_SECTION_USD,
    )
  })

  it('el recargo de commerce es aditivo en cualquier tramo', () => {
    for (const count of [0, 1, 8, 9, MAX_CUSTOM_SECTIONS]) {
      assert.equal(
        estimateCustomPriceUsd(count, true) -
          estimateCustomPriceUsd(count, false),
        COMMERCE_PACK_SURCHARGE_USD,
      )
    }
  })

  /** El anclaje del esquema: una composición del tamaño de un template. */
  it('una composición de 10 secciones suma dos extras sobre la base', () => {
    assert.equal(
      estimateCustomPriceUsd(10, false),
      CUSTOM_BASE_PRICE_USD + 2 * CUSTOM_EXTRA_SECTION_USD,
    )
  })

  it('la base queda arriba del template más caro', () => {
    assert.ok(CUSTOM_BASE_PRICE_USD > Math.max(...Object.values(TEMPLATE_PRICES_USD)))
  })

  it('nunca baja al agregar secciones', () => {
    let prev = 0
    for (let n = 0; n <= MAX_CUSTOM_SECTIONS; n += 1) {
      const price = estimateCustomPriceUsd(n, false)
      assert.ok(price >= prev)
      prev = price
    }
  })
})

describe('nextSectionArs', () => {
  it('no cobra nada mientras haya lugar en la base', () => {
    assert.equal(nextSectionArs(3, false, RATE), 0)
  })

  it('coincide con la diferencia real de totales en pesos', () => {
    for (const count of [8, 9, 10, 20, 29]) {
      assert.equal(
        nextSectionArs(count, false, RATE),
        arsFromUsd(estimateCustomPriceUsd(count + 1, false), RATE) -
          arsFromUsd(estimateCustomPriceUsd(count, false), RATE),
      )
    }
  })
})

describe('formatPriceFromUsd', () => {
  it('en EN muestra USD', () => {
    assert.equal(formatPriceFromUsd(159, 'en', RATE), formatUsd(159))
    assert.match(formatPriceFromUsd(159, 'en', RATE), /\$159/)
  })

  it('en ES muestra ARS convertidos', () => {
    assert.equal(
      formatPriceFromUsd(159, 'es', RATE),
      formatArs(arsFromUsd(159, RATE)),
    )
  })

  it('nextSectionUsd es el salto de lista', () => {
    assert.equal(nextSectionUsd(8, false), CUSTOM_EXTRA_SECTION_USD)
    assert.equal(nextSectionUsd(3, false), 0)
  })
})
