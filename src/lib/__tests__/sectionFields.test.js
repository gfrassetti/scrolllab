import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  SECTION_FIELDS,
  getSectionFields,
  isEphemeralAssetUrl,
  sanitizeColor,
  sanitizeHref,
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
  const section = 'fizz/HeroBubbles'
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

describe('sanitizeColor', () => {
  it('acepta hex y rgb/rgba', () => {
    for (const v of ['#fff', '#0e0e11', '#0e0e11ff', 'rgb(14,14,17)', 'rgba(14, 14, 17, 0.9)']) {
      assert.equal(sanitizeColor(v), v.toLowerCase())
    }
  })
  it('descarta nombres, CSS arbitrario y basura', () => {
    for (const v of ['red', '#ggg', '#12345', 'url(x)', 'rgb(300,0,0,0,0)', '', 42, null]) {
      assert.equal(sanitizeColor(v), undefined)
    }
  })
})

describe('sanitizeHref', () => {
  it('acepta ancla, ruta, http(s), mailto, tel', () => {
    for (const v of ['#top', '#', '/about', 'https://x.com/a', 'http://x.com', 'mailto:a@b.com', 'tel:+541122334455']) {
      assert.equal(sanitizeHref(v), v)
    }
  })
  it('rechaza javascript:, vacío, esquemas raros y muy largos', () => {
    for (const v of ['javascript:alert(1)', '  javascript:x', 'data:text/html,x', '', '   ', 'ftp://x', 'x'.repeat(600)]) {
      assert.equal(sanitizeHref(v), undefined)
    }
  })
})

describe('sanitizeProps — color / href / list (chapters/FooterCTA)', () => {
  it('valida color por tipo de campo, no por nombre', () => {
    assert.deepEqual(
      sanitizeProps('chapters/FooterCTA', { bg: '#0e0e11', fg: 'red' }),
      { bg: '#0e0e11' },
    )
  })
  it('valida el href del CTA', () => {
    assert.deepEqual(
      sanitizeProps('chapters/FooterCTA', { ctaHref: 'https://estudio.com' }),
      { ctaHref: 'https://estudio.com' },
    )
    assert.equal(
      sanitizeProps('chapters/FooterCTA', { ctaHref: 'javascript:x' }),
      undefined,
    )
  })
  it('list: conserva items, limpia hrefs malos, respeta el max', () => {
    const clean = sanitizeProps('chapters/FooterCTA', {
      links: [
        { label: 'Inicio', href: '#top' },
        { label: 'Malo', href: 'javascript:x' },
        { label: '' },
        ...Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, href: '/x' })),
      ],
    })
    assert.equal(clean.links.length, 8) // max de la sección
    assert.deepEqual(clean.links[0], { label: 'Inicio', href: '#top' })
    assert.deepEqual(clean.links[1], { label: 'Malo' }) // href inválido cae
    assert.deepEqual(clean.links[2], {}) // slot vacío se conserva client-side
  })
  it('list vacía o no-array → prop descartada', () => {
    assert.equal(sanitizeProps('chapters/FooterCTA', { links: [] }), undefined)
    assert.equal(sanitizeProps('chapters/FooterCTA', { links: 'nope' }), undefined)
  })
})

describe('sanitizeProps — Fase C (BigNumbers / KeyFacts / TypeAccordion)', () => {
  it('BigNumbers: bg/fg color + stats list', () => {
    const clean = sanitizeProps('chapters/BigNumbers', {
      bg: '#101014',
      fg: 'chartreuse',
      stats: [
        { value: '128', suffix: '+', label: 'Proyectos' },
        { value: '99', suffix: '%', label: '' },
      ],
    })
    assert.equal(clean.bg, '#101014')
    assert.equal(clean.fg, undefined) // nombre CSS no permitido
    assert.deepEqual(clean.stats[0], { value: '128', suffix: '+', label: 'Proyectos' })
    assert.deepEqual(clean.stats[1], { value: '99', suffix: '%' })
  })
  it('KeyFacts: facts list respeta el max de 6', () => {
    const clean = sanitizeProps('atelier/KeyFacts', {
      facts: Array.from({ length: 10 }, (_, i) => ({ value: `${i}`, label: `L${i}` })),
    })
    assert.equal(clean.facts.length, 6)
  })
  it('TypeAccordion: items list con title/body, ignora props fuera de schema', () => {
    const clean = sanitizeProps('monolith/TypeAccordion', {
      items: [{ title: 'Uno', body: 'Texto', img: '/hack.png' }],
      hacker: 'x',
    })
    assert.deepEqual(clean.items[0], { title: 'Uno', body: 'Texto' })
    assert.equal(clean.hacker, undefined)
  })
})

describe('sanitizeProps — Fase D (segunda tanda)', () => {
  it('VelocityMarquee / DiagonalMarquee: bg/fg + textos', () => {
    const vm = sanitizeProps('chapters/VelocityMarquee', { text: 'Hola', bg: '#111' })
    assert.deepEqual(vm, { text: 'Hola', bg: '#111' })
    const dm = sanitizeProps('nocturne/DiagonalMarquee', { textA: 'A', textB: 'B', fg: '#eee' })
    assert.deepEqual(dm, { textA: 'A', textB: 'B', fg: '#eee' })
  })
  it('SplitReveals: beats list con kicker/title/body/img (image)', () => {
    const clean = sanitizeProps('nocturne/SplitReveals', {
      beats: [
        { kicker: 'K1', title: 'T1', body: 'B1', img: 'https://cdn.test/x.png' },
        { kicker: 'K2', title: 'T2', body: 'B2', img: 'javascript:alert(1)' },
      ],
    })
    // URL válida se conserva; esquema raro cae, el resto del item queda
    assert.deepEqual(clean.beats[0], {
      kicker: 'K1',
      title: 'T1',
      body: 'B1',
      img: 'https://cdn.test/x.png',
    })
    assert.deepEqual(clean.beats[1], { kicker: 'K2', title: 'T2', body: 'B2' })
  })
  it('WorkIndex: works list respeta el max de 8', () => {
    const clean = sanitizeProps('nocturne/WorkIndex', {
      works: Array.from({ length: 12 }, (_, i) => ({ index: `${i}`, title: `T${i}` })),
    })
    assert.equal(clean.works.length, 8)
  })
  it('SkewScroller: words list de un solo sub-campo', () => {
    const clean = sanitizeProps('monolith/SkewScroller', {
      words: [{ word: 'RAW' }, { word: '' }],
    })
    assert.deepEqual(clean.words[0], { word: 'RAW' })
    assert.deepEqual(clean.words[1], {})
  })
  it('ExhibitGrid: exhibits list code/caption', () => {
    const clean = sanitizeProps('monolith/ExhibitGrid', {
      exhibits: [{ code: 'EX-09', caption: 'Nueva pieza' }],
    })
    assert.deepEqual(clean.exhibits[0], { code: 'EX-09', caption: 'Nueva pieza' })
  })
  it('BubbleBenefits: benefits list con color por item', () => {
    const clean = sanitizeProps('fizz/BubbleBenefits', {
      benefits: [{ title: 'T', body: 'B', color: '#ff3ea5' }, { title: 'T2', body: 'B2', color: 'hotpink' }],
    })
    assert.equal(clean.benefits[0].color, '#ff3ea5')
    assert.equal(clean.benefits[1].color, undefined) // nombre CSS no permitido en color
  })
  it('AboutClarity: solo bg/fg + textos', () => {
    const clean = sanitizeProps('atelier/AboutClarity', { title: 'X', bg: '#0b0c10' })
    assert.deepEqual(clean, { title: 'X', bg: '#0b0c10' })
  })
})

describe('sanitizeProps — Fase E (grillas con imagen editable)', () => {
  it('CanCarousel: cans list con name/note/color/image', () => {
    const clean = sanitizeProps('fizz/CanCarousel', {
      bg: '#241352',
      cans: [
        { name: 'Uva', note: 'x', color: '#ff3ea5', image: '/latas/uva.png' },
        { name: 'Mala', note: 'y', color: 'blue', image: 'ftp://nope' },
      ],
    })
    assert.equal(clean.bg, '#241352')
    assert.deepEqual(clean.cans[0], {
      name: 'Uva',
      note: 'x',
      color: '#ff3ea5',
      image: '/latas/uva.png',
    })
    // color inválido y URL con esquema raro caen; el texto queda
    assert.deepEqual(clean.cans[1], { name: 'Mala', note: 'y' })
  })
  it('StudioCards: cards list title/label/img', () => {
    const clean = sanitizeProps('atelier/StudioCards', {
      cards: [{ title: 'C1', label: 'L1', img: 'https://cdn.test/c1.jpg' }],
      ctaHref: '/coleccion',
    })
    assert.equal(clean.ctaHref, '/coleccion')
    assert.deepEqual(clean.cards[0], {
      title: 'C1',
      label: 'L1',
      img: 'https://cdn.test/c1.jpg',
    })
  })
  it('HelmetGrid: items list name/year/img, respeta max 6', () => {
    const clean = sanitizeProps('velocity/HelmetGrid', {
      items: Array.from({ length: 9 }, (_, i) => ({ name: `N${i}`, year: `${i}` })),
    })
    assert.equal(clean.items.length, 6)
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
        if (field.type === 'list') {
          assert.ok(field.item?.length, `${id}.${field.key}: list sin sub-campos`)
          for (const sf of field.item) {
            assert.ok(sf.key && sf.label && sf.type, `${id}.${field.key}[]: sub-campo incompleto`)
            assert.ok(
              ['text', 'textarea', 'href', 'color', 'image'].includes(sf.type),
              `${id}.${field.key}[].${sf.key}: tipo '${sf.type}' no permitido en list`,
            )
          }
        }
      }
    }
  })
})
