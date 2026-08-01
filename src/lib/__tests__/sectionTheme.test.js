import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  AUTO_THEME,
  autoThemeFor,
  isThemeAdaptive,
  resolveSectionTheme,
} from '../sectionTheme.js'

/**
 * El preview del builder y el packer comparten este módulo: si resolvieran
 * distinto, el ZIP no se parecería a lo que el usuario aprobó en pantalla.
 */
describe('autoThemeFor', () => {
  it('toma el modelo de la sección de arriba', () => {
    assert.equal(autoThemeFor(['chapters', 'nocturne', 'contact'], 2), 'nocturne')
  })

  it('salta secciones sin paleta propia', () => {
    assert.equal(
      autoThemeFor(['fizz', 'commerce', 'contact'], 2),
      'fizz',
      'commerce no tiene paleta: debe seguir subiendo',
    )
  })

  it('mira hacia abajo si no hay nada arriba', () => {
    assert.equal(autoThemeFor(['contact', 'velocity'], 0), 'velocity')
  })

  it('se queda en auto si la composición no tiene ningún modelo', () => {
    assert.equal(autoThemeFor(['contact'], 0), AUTO_THEME)
    assert.equal(autoThemeFor(['contact', 'commerce'], 0), AUTO_THEME)
  })
})

describe('resolveSectionTheme', () => {
  const models = ['monolith', 'contact']

  it('no toca secciones que ya pertenecen a un modelo', () => {
    assert.equal(
      resolveSectionTheme('chapters/HeroKinetic', undefined, models, 0),
      undefined,
    )
  })

  it('resuelve el formulario sin tema elegido', () => {
    assert.equal(
      resolveSectionTheme('contact/ContactForm', undefined, models, 1),
      'monolith',
    )
  })

  it('trata auto explícito igual que sin elegir', () => {
    assert.equal(
      resolveSectionTheme('contact/ContactForm', { theme: 'auto' }, models, 1),
      'monolith',
    )
  })

  it('respeta una elección explícita del usuario', () => {
    assert.equal(
      resolveSectionTheme('contact/ContactForm', { theme: 'fizz' }, models, 1),
      'fizz',
    )
  })
})

describe('isThemeAdaptive', () => {
  it('reconoce las secciones neutras con select de color', () => {
    assert.ok(isThemeAdaptive('contact/ContactForm'))
    assert.ok(isThemeAdaptive('commerce/ProductGrid'))
    assert.ok(!isThemeAdaptive('chapters/HeroKinetic'))
  })
})

describe('commerce theme', () => {
  it('resuelve auto contra el vecino, como el contact form', () => {
    assert.equal(
      resolveSectionTheme(
        'commerce/ProductGrid',
        { theme: 'auto' },
        ['nocturne', 'commerce'],
        1,
      ),
      'nocturne',
    )
  })

  it('deja elegir un color explícito', () => {
    assert.equal(
      resolveSectionTheme(
        'commerce/ProductGrid',
        { theme: 'fizz' },
        ['nocturne', 'commerce'],
        1,
      ),
      'fizz',
    )
  })
})
