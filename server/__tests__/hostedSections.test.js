import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { HOSTABLE_SECTIONS } from '../sections.js'
import { sanitizeHostedProps as serverHosted, sanitizeSectionProps } from '../sectionFields.js'
import {
  SECTION_FIELDS,
  sanitizeHostedProps as clientHosted,
  sanitizeProps,
} from '../../src/lib/sectionFields.js'

/**
 * LAB: lo que el cliente edita en el panel tiene que llegar igual al iframe.
 * Cada campo pasa por dos filtros — el del editor (src/lib) y el del servidor
 * (server/, que no confía en el primero) — y los dos tienen que coincidir:
 * un campo que el editor muestra y el servidor tira es una edición que el
 * cliente hace y nunca ve publicada.
 */

/** Un valor válido por tipo de campo (las imágenes con URL completa: LAB). */
const SAMPLE = {
  text: 'Texto de prueba',
  textarea: 'Línea uno\nLínea dos',
  color: '#123456',
  href: 'https://example.com/destino',
  image: 'https://cdn.example.com/foto.webp',
  url: 'https://cdn.example.com/archivo',
  price: '1500',
}

function sampleFor(field) {
  if (field.type === 'select') return field.options[0].value
  if (field.type === 'list') {
    const row = Object.fromEntries(field.item.map((sub) => [sub.key, SAMPLE[sub.type]]))
    return [row, row]
  }
  return SAMPLE[field.type]
}

function sampleProps(id) {
  return Object.fromEntries(SECTION_FIELDS[id].map((f) => [f.key, sampleFor(f)]))
}

describe('LAB — cada campo de cada sección hosteable llega publicado', () => {
  for (const id of HOSTABLE_SECTIONS) {
    it(`${id}: editor y servidor aceptan cada campo, igual`, () => {
      assert.ok(SECTION_FIELDS[id]?.length, `${id} no tiene campos editables`)
      const props = sampleProps(id)
      const client = clientHosted(id, props)
      const server = serverHosted(id, props)
      assert.deepEqual(client, props, 'el editor descartó algo')
      assert.deepEqual(server, props, 'el servidor descartó algo')
    })
  }
})

describe('LAB — lo peligroso o inválido no pasa (editor y servidor)', () => {
  const both = (id, props) => [clientHosted(id, props), serverHosted(id, props)]

  for (const id of HOSTABLE_SECTIONS) {
    const fields = SECTION_FIELDS[id]

    it(`${id}: links javascript: / data: caen, arriba y dentro de listas`, () => {
      const props = {}
      for (const f of fields) {
        if (f.type === 'href') props[f.key] = 'javascript:alert(1)'
        if (f.type === 'list' && f.item.some((s) => s.type === 'href')) {
          props[f.key] = [
            Object.fromEntries(
              f.item.map((s) => [s.key, s.type === 'href' ? 'javascript:alert(1)' : SAMPLE[s.type]]),
            ),
          ]
        }
      }
      for (const clean of both(id, props)) {
        for (const f of fields) {
          if (f.type === 'href') assert.equal(clean?.[f.key], undefined, f.key)
          if (f.type === 'list' && props[f.key]) {
            for (const s of f.item.filter((s) => s.type === 'href')) {
              assert.equal(clean?.[f.key]?.[0]?.[s.key], undefined, `${f.key}.${s.key}`)
            }
          }
        }
      }
    })

    it(`${id}: colores que no son color caen`, () => {
      const props = {}
      for (const f of fields) {
        if (f.type === 'color') props[f.key] = 'red; background:url(https://evil.test/x)'
      }
      for (const clean of both(id, props)) {
        for (const f of fields.filter((f) => f.type === 'color')) {
          assert.equal(clean?.[f.key], undefined, f.key)
        }
      }
    })

    it(`${id}: imágenes relativas no se guardan en LAB (el iframe vive en otro dominio)`, () => {
      const props = {}
      for (const f of fields) {
        if (f.type === 'image') props[f.key] = '/mi-foto.webp'
        if (f.type === 'list' && f.item.some((s) => s.type === 'image')) {
          props[f.key] = [
            Object.fromEntries(f.item.map((s) => [s.key, s.type === 'image' ? '/x.webp' : SAMPLE[s.type]])),
          ]
        }
      }
      for (const clean of both(id, props)) {
        for (const f of fields) {
          if (f.type === 'image') assert.equal(clean?.[f.key], undefined, f.key)
          if (f.type === 'list' && props[f.key]) {
            for (const s of f.item.filter((s) => s.type === 'image')) {
              assert.equal(clean?.[f.key]?.[0]?.[s.key], undefined, `${f.key}.${s.key}`)
            }
          }
        }
      }
    })

    it(`${id}: cada lista respeta su tope`, () => {
      for (const f of fields.filter((f) => f.type === 'list')) {
        const row = Object.fromEntries(f.item.map((s) => [s.key, SAMPLE[s.type]]))
        const props = { [f.key]: Array.from({ length: f.max + 5 }, () => row) }
        for (const clean of both(id, props)) assert.equal(clean[f.key].length, f.max, f.key)
      }
    })
  }
})

/**
 * Fase G: «totalmente editables» = además del texto, los colores. Cada una
 * trae fondo y texto, y las que dibujan un acento propio también el acento.
 */
const PHASE_G = [
  'meridian/Footer',
  'meridian/Interior',
  'meridian/Amenities',
  'meridian/Panorama',
  'kin/Rooms',
  'kin/Footer',
  'monolith/SpecSheet',
  'unity/LastPortrait',
  'velocity/ParallaxRise',
  'chapters/ParallaxEditorial',
]
const WITH_ACCENT = ['kin/Rooms', 'kin/Footer', 'velocity/ParallaxRise']

describe('Fase G — las 10 secciones nuevas de LAB', () => {
  it('están todas en HOSTABLE_SECTIONS', () => {
    for (const id of PHASE_G) assert.ok(HOSTABLE_SECTIONS.includes(id), id)
  })

  for (const id of PHASE_G) {
    it(`${id}: color de fondo y de texto editables${WITH_ACCENT.includes(id) ? ', y el acento' : ''}`, () => {
      const keys = SECTION_FIELDS[id].map((f) => f.key)
      assert.ok(keys.includes('bg') && keys.includes('fg'), keys.join(','))
      if (WITH_ACCENT.includes(id)) assert.ok(keys.includes('accent'))
    })
  }

  it('meridian/Footer: redes con ícono por nombre y links legales editables', () => {
    const clean = sanitizeSectionProps('meridian/Footer', {
      socials: [
        { label: 'Instagram', href: 'https://instagram.com/x' },
        { label: 'Mala', href: 'javascript:alert(1)' },
      ],
      privacyHref: '/privacidad',
      termsHref: 'mailto:legal@x.com',
      monogram: 'CL',
    })
    assert.deepEqual(clean.socials, [{ label: 'Instagram', href: 'https://instagram.com/x' }, { label: 'Mala' }])
    assert.equal(clean.privacyHref, '/privacidad')
    assert.equal(clean.termsHref, 'mailto:legal@x.com')
  })

  it('meridian/Interior: puntos sobre la foto (slide, x, y, título, texto) y párrafo por slide', () => {
    const clean = sanitizeProps('meridian/Interior', {
      links: [{ label: 'Living', img: 'https://cdn.test/a.webp', text: 'Doble altura' }],
      spots: Array.from({ length: 30 }, (_, i) => ({ slide: '1', x: String(i), y: '50', title: `P${i}` })),
    })
    assert.equal(clean.links[0].text, 'Doble altura')
    assert.equal(clean.spots.length, 24)
    assert.deepEqual(clean.spots[3], { slide: '1', x: '3', y: '50', title: 'P3' })
  })

  it('kin/Footer: columnas de texto + columna de links; un link malo cae, la fila queda', () => {
    const clean = sanitizeSectionProps('kin/Footer', {
      columns: [{ title: 'Visit', text: 'Calle 1\nCiudad' }],
      linksTitle: 'Social',
      links: [{ label: 'IG', href: 'https://instagram.com' }, { label: 'X', href: 'javascript:void(0)' }],
    })
    assert.deepEqual(clean.columns, [{ title: 'Visit', text: 'Calle 1\nCiudad' }])
    assert.deepEqual(clean.links, [{ label: 'IG', href: 'https://instagram.com' }, { label: 'X' }])
  })

  it('kin/Rooms: cada fila con su link', () => {
    const clean = sanitizeSectionProps('kin/Rooms', {
      rooms: [{ no: '01', title: 'Show', dates: 'Mar', href: '#show' }],
    })
    assert.equal(clean.rooms[0].href, '#show')
  })

  it('chapters/ParallaxEditorial: hasta 4 fotos (las posiciones son las del diseño)', () => {
    const clean = sanitizeProps('chapters/ParallaxEditorial', {
      figures: Array.from({ length: 6 }, (_, i) => ({ img: `https://cdn.test/${i}.webp`, caption: `F${i}` })),
    })
    assert.equal(clean.figures.length, 4)
  })

  it('monolith/SpecSheet: filas dato/valor', () => {
    const clean = sanitizeSectionProps('monolith/SpecSheet', {
      specs: [{ label: 'Material', value: 'Hormigón' }],
      unitLabel: 'Lote',
    })
    assert.deepEqual(clean, { specs: [{ label: 'Material', value: 'Hormigón' }], unitLabel: 'Lote' })
  })
})
