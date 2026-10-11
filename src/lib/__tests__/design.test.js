import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FONT_CHOICES,
  fontChoiceById,
  fontFromRecipe,
  fontLinkParam,
  normalizeFontId,
} from '../../domain/design.js'
import { compositionToRecipe, recipeToComposition } from '../composition.js'

describe('tipografía global (src/domain/design.js)', () => {
  it('la lista es corta y cada opción trae lo que el ZIP y el CSS necesitan', () => {
    assert.ok(FONT_CHOICES.length >= 6 && FONT_CHOICES.length <= 10)
    const ids = new Set()
    for (const f of FONT_CHOICES) {
      assert.ok(!ids.has(f.id), `id repetido: ${f.id}`)
      ids.add(f.id)
      assert.match(f.id, /^[a-z-]+$/)
      assert.ok(f.stack.startsWith(`'${f.label}'`), `${f.id}: el stack empieza por su familia`)
      assert.ok(f.google.startsWith(f.label.replace(/ /g, '+')), `${f.id}: parámetro de Google Fonts`)
      assert.ok(['sans', 'serif', 'mono'].includes(f.kind))
    }
  })

  it('solo pasa un id de la lista: nada de nombres libres ni inyección', () => {
    assert.equal(normalizeFontId('geist'), 'geist')
    for (const bad of ['Comic Sans', "x'; } body { display:none", '', null, undefined, 42, {}, ['geist']]) {
      assert.equal(normalizeFontId(bad), null, String(bad))
    }
    assert.equal(fontChoiceById('geist')?.label, 'Geist')
    assert.equal(fontChoiceById('nope'), null)
  })

  it('fontFromRecipe toma la primera entrada con una fuente válida', () => {
    assert.equal(fontFromRecipe([{ id: 'a/B' }, { id: 'a/C', font: 'archivo' }]), 'archivo')
    assert.equal(fontFromRecipe([{ id: 'a/B', font: 'basura' }, { id: 'a/C', font: 'geist' }]), 'geist')
    assert.equal(fontFromRecipe(['chapters/HeroKinetic']), null)
    assert.equal(fontFromRecipe(null), null)
  })

  it('fontLinkParam suma la familia solo si el <link> del ZIP no la trae', () => {
    const base = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Archivo:wdth,wght@62..125,400..800&display=swap'
    assert.equal(fontLinkParam('archivo', base), '')
    assert.equal(fontLinkParam('space-grotesk', base), '')
    assert.equal(fontLinkParam('geist', base), '&family=Geist:wght@100..900')
    assert.equal(fontLinkParam(null, base), '')
    assert.equal(fontLinkParam('nope', base), '')
  })
})

describe('la fuente viaja dentro de la receta', () => {
  const items = [
    { uid: 'a', sectionId: 'chapters/HeroKinetic' },
    { uid: 'b', sectionId: 'chapters/FooterCTA', props: { ctaWord: 'Hola' } },
  ]

  it('compositionToRecipe pone la fuente en cada entrada, con o sin props', () => {
    const recipe = compositionToRecipe(items, 'geist')
    assert.deepEqual(recipe, [
      { id: 'chapters/HeroKinetic', font: 'geist' },
      { id: 'chapters/FooterCTA', props: { ctaWord: 'Hola' }, font: 'geist' },
    ])
  })

  it('sin fuente (o con una que no existe) la receta es la de siempre', () => {
    const plain = [{ id: 'chapters/HeroKinetic' }, { id: 'chapters/FooterCTA', props: { ctaWord: 'Hola' } }]
    assert.deepEqual(compositionToRecipe(items), plain)
    assert.deepEqual(compositionToRecipe(items, null), plain)
    assert.deepEqual(compositionToRecipe(items, 'Comic Sans'), plain)
  })

  it('ida y vuelta: las secciones no cambian y la fuente se recupera', () => {
    const recipe = compositionToRecipe(items, 'fraunces')
    const back = recipeToComposition(recipe)
    assert.deepEqual(
      back.map((i) => i.sectionId),
      ['chapters/HeroKinetic', 'chapters/FooterCTA'],
    )
    assert.equal(back[1].props.ctaWord, 'Hola')
    assert.equal(fontFromRecipe(recipe), 'fraunces')
  })
})
