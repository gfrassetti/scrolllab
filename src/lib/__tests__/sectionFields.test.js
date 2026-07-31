import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  SECTION_FIELDS,
  getSectionFields,
  isEphemeralAssetUrl,
  sanitizeProps,
} from '../sectionFields.js'

/**
 * `sanitizeProps` es el filtro entre lo que el usuario tipea en el builder y
 * lo que termina renderizado y empaquetado. Todo lo que descarte acá es una
 * edición que el usuario hace y no ve, así que el contrato conviene explícito.
 */
describe('sanitizeProps — qué sobrevive', () => {
  it('conserva los campos declarados de la sección', () => {
    const clean = sanitizeProps('chapters/HeroKinetic', {
      lineOne: 'Hola',
      kicker: 'Mundo',
    })
    assert.deepEqual(clean, { lineOne: 'Hola', kicker: 'Mundo' })
  })

  it('descarta claves que la sección no declara', () => {
    const clean = sanitizeProps('chapters/HeroKinetic', {
      lineOne: 'Hola',
      onClick: 'alert(1)',
      className: 'hack',
    })
    assert.deepEqual(clean, { lineOne: 'Hola' })
  })

  it('descarta valores que no son string', () => {
    const clean = sanitizeProps('chapters/HeroKinetic', {
      lineOne: 'Hola',
      kicker: { toString: () => 'nope' },
      meta: 42,
      hint: null,
    })
    assert.deepEqual(clean, { lineOne: 'Hola' })
  })

  it('corta en 2000 caracteres', () => {
    const clean = sanitizeProps('chapters/HeroKinetic', {
      lineOne: 'x'.repeat(5000),
    })
    assert.equal(clean.lineOne.length, 2000)
  })

  it('devuelve undefined si la sección no existe', () => {
    assert.equal(sanitizeProps('inventada/NoExiste', { a: 'b' }), undefined)
  })

  it('devuelve undefined si no sobrevive nada', () => {
    assert.equal(sanitizeProps('chapters/HeroKinetic', { nada: 'x' }), undefined)
    assert.equal(sanitizeProps('chapters/HeroKinetic', null), undefined)
  })

  /**
   * Comportamiento actual: vaciar un campo no lo deja vacío, lo devuelve a su
   * valor por defecto. Queda fijado acá para que el día que se cambie sea una
   * decisión y no un accidente.
   */
  it('un string vacío borra la prop y vuelve el default del componente', () => {
    const clean = sanitizeProps('chapters/HeroKinetic', {
      lineOne: 'Hola',
      kicker: '',
    })
    assert.deepEqual(clean, { lineOne: 'Hola' })
  })
})

describe('sanitizeProps — campos con opciones', () => {
  it('acepta un valor del select', () => {
    const clean = sanitizeProps('contact/ContactForm', { theme: 'nocturne' })
    assert.deepEqual(clean, { theme: 'nocturne' })
  })

  it('descarta un valor que el select no ofrece', () => {
    assert.equal(sanitizeProps('contact/ContactForm', { theme: 'neon' }), undefined)
  })
})

describe('sanitizeProps — assets', () => {
  const section = 'fizz/CanCarousel'
  const field = SECTION_FIELDS[section].find((f) => f.type === 'image')

  it('acepta https:// y rutas del sitio', () => {
    assert.deepEqual(sanitizeProps(section, { [field.key]: 'https://cdn.test/a.png' }), {
      [field.key]: 'https://cdn.test/a.png',
    })
    assert.deepEqual(sanitizeProps(section, { [field.key]: '/lata.svg' }), {
      [field.key]: '/lata.svg',
    })
  })

  it('acepta blob: para poder previsualizar una subida local', () => {
    const clean = sanitizeProps(section, { [field.key]: 'blob:http://x/123' })
    assert.deepEqual(clean, { [field.key]: 'blob:http://x/123' })
  })

  it('descarta cualquier otra cosa', () => {
    assert.equal(sanitizeProps(section, { [field.key]: 'javascript:alert(1)' }), undefined)
    assert.equal(sanitizeProps(section, { [field.key]: 'no es una url' }), undefined)
  })
})

describe('isEphemeralAssetUrl', () => {
  it('reconoce lo que no puede viajar en el ZIP', () => {
    assert.ok(isEphemeralAssetUrl('blob:http://localhost/abc'))
    assert.ok(isEphemeralAssetUrl('data:image/png;base64,AAA'))
    assert.ok(!isEphemeralAssetUrl('https://cdn.test/a.png'))
    assert.ok(!isEphemeralAssetUrl('/local.png'))
  })
})

describe('getSectionFields', () => {
  it('devuelve lista vacía para una sección desconocida', () => {
    assert.deepEqual(getSectionFields('inventada/NoExiste'), [])
  })

  it('cada campo declara key, label y type', () => {
    for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
      for (const field of fields) {
        assert.ok(field.key, `${id}: campo sin key`)
        assert.ok(field.label, `${id}.${field.key}: campo sin label`)
        assert.ok(field.type, `${id}.${field.key}: campo sin type`)
        if (field.type === 'select') {
          assert.ok(field.options?.length, `${id}.${field.key}: select sin opciones`)
        }
      }
    }
  })
})
