import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import {
  compositionToRecipe,
  createCompositionItem,
  updateCompositionItemProps,
  addSectionToComposition,
  removeCompositionItem,
  moveCompositionItem,
  reorderCompositionItem,
  dedupeUniqueKinds,
  kindIsBlocked,
  hasDuplicateChrome,
  readCompositionCount,
  saveComposition,
  clearComposition,
  COMPOSITION_EVENT,
  STORAGE_KEY,
} from '../composition.js'

/**
 * El panel de edición llama a `updateCompositionItemProps` y el checkout a
 * `compositionToRecipe`. Si alguno de los dos tritura las props, el usuario
 * edita, ve el cambio… y al comprar recibe el texto por defecto.
 */
describe('updateCompositionItemProps', () => {
  const base = [
    { uid: 'a', sectionId: 'chapters/HeroKinetic' },
    { uid: 'b', sectionId: 'atelier/HeroMeaning', props: { line1: 'viejo' } },
  ]

  it('aplica las props a la sección correcta', () => {
    const next = updateCompositionItemProps(base, 'b', {
      line1: 'nuevo',
      line2: 'también',
    })
    assert.deepEqual(next[1].props, { line1: 'nuevo', line2: 'también' })
    assert.equal(next[0].props, undefined)
  })

  it('no toca las demás secciones', () => {
    const next = updateCompositionItemProps(base, 'b', { line1: 'x' })
    assert.equal(next[0], base[0])
  })

  it('descarta props que la sección no declara', () => {
    const next = updateCompositionItemProps(base, 'b', {
      line1: 'ok',
      onClick: 'alert(1)',
    })
    assert.deepEqual(next[1].props, { line1: 'ok' })
  })

  it('borra las props si se vacían todas', () => {
    const next = updateCompositionItemProps(base, 'b', { line1: '' })
    assert.equal(next[1].props, undefined)
  })
})

describe('compositionToRecipe', () => {
  it('convierte la composición en la receta que paga el checkout', () => {
    const recipe = compositionToRecipe([
      { uid: 'a', sectionId: 'chapters/HeroKinetic', props: { lineOne: 'Hola' } },
      { uid: 'b', sectionId: 'atelier/HeroMeaning' },
    ])
    assert.deepEqual(recipe, [
      { id: 'chapters/HeroKinetic', props: { lineOne: 'Hola' } },
      { id: 'atelier/HeroMeaning' },
    ])
  })

  it('no deja pasar blob: ni data: — no sobreviven al ZIP', () => {
    const recipe = compositionToRecipe([
      {
        uid: 'a',
        sectionId: 'fizz/CanCarousel',
        props: {
          can1Image: 'blob:http://localhost/abc',
          title: 'ok',
        },
      },
    ])
    assert.deepEqual(recipe, [{ id: 'fizz/CanCarousel', props: { title: 'ok' } }])
  })
})

describe('addSectionToComposition — chrome único', () => {
  it('deja agregar un hero', () => {
    const { items, blocked } = addSectionToComposition([], 'atelier/HeroMeaning')
    assert.equal(blocked, false)
    assert.equal(items.length, 1)
    assert.equal(items[0].sectionId, 'atelier/HeroMeaning')
    assert.ok(items[0].uid)
  })

  it('bloquea una segunda nav', () => {
    const first = addSectionToComposition([], 'chapters/NavMinimal')
    const second = addSectionToComposition(first.items, 'nocturne/NavNocturne')
    assert.equal(second.blocked, true)
    assert.equal(second.kind, 'nav')
    assert.equal(second.items, first.items)
  })

  it('bloquea un segundo footer', () => {
    const first = addSectionToComposition([], 'atelier/FooterAtelier')
    const second = addSectionToComposition(first.items, 'chapters/FooterCTA')
    assert.equal(second.blocked, true)
    assert.equal(second.kind, 'footer')
  })

  it('permite varios heroes y secciones', () => {
    let { items } = addSectionToComposition([], 'atelier/HeroMeaning')
    ;({ items } = addSectionToComposition(items, 'chapters/HeroKinetic'))
    ;({ items } = addSectionToComposition(items, 'nocturne/SplitReveals'))
    assert.equal(items.length, 3)
  })
})

describe('dedupeUniqueKinds', () => {
  it('conserva la primera nav y el primer footer', () => {
    const cleaned = dedupeUniqueKinds([
      createCompositionItem('chapters/NavMinimal'),
      createCompositionItem('nocturne/NavNocturne'),
      createCompositionItem('atelier/HeroMeaning'),
      createCompositionItem('chapters/FooterCTA'),
      createCompositionItem('atelier/FooterAtelier'),
    ])
    assert.deepEqual(
      cleaned.map((i) => i.sectionId),
      ['chapters/NavMinimal', 'atelier/HeroMeaning', 'chapters/FooterCTA'],
    )
  })
})

describe('kindIsBlocked / hasDuplicateChrome', () => {
  it('marca un kind único ya tomado', () => {
    const items = [createCompositionItem('chapters/NavMinimal')]
    assert.ok(kindIsBlocked('nocturne/NavNocturne', items))
    assert.ok(!kindIsBlocked('atelier/HeroMeaning', items))
  })

  it('detecta chrome duplicado', () => {
    assert.ok(
      hasDuplicateChrome([
        createCompositionItem('chapters/NavMinimal'),
        createCompositionItem('nocturne/NavNocturne'),
      ]),
    )
  })
})

describe('mover y reordenar', () => {
  const items = [
    { uid: 'a', sectionId: 'chapters/HeroKinetic' },
    { uid: 'b', sectionId: 'atelier/HeroMeaning' },
    { uid: 'c', sectionId: 'nocturne/SplitReveals' },
  ]

  it('mueve un ítem arriba y abajo', () => {
    assert.deepEqual(
      moveCompositionItem(items, 'b', -1).map((i) => i.uid),
      ['b', 'a', 'c'],
    )
    assert.deepEqual(
      moveCompositionItem(items, 'b', 1).map((i) => i.uid),
      ['a', 'c', 'b'],
    )
  })

  it('no se sale de los bordes', () => {
    assert.equal(moveCompositionItem(items, 'a', -1), items)
    assert.equal(moveCompositionItem(items, 'c', 1), items)
  })

  it('reordena por índice de drop', () => {
    assert.deepEqual(
      reorderCompositionItem(items, 'c', 0).map((i) => i.uid),
      ['c', 'a', 'b'],
    )
  })

  it('borra por uid', () => {
    assert.deepEqual(
      removeCompositionItem(items, 'b').map((i) => i.uid),
      ['a', 'c'],
    )
  })
})

/**
 * El contador del nav vive fuera de React: sale de localStorage y se refresca
 * con un evento. Si cualquiera de las dos puntas falla, el header miente.
 */
describe('readCompositionCount', () => {
  const store = new Map()
  const events = []

  before(() => {
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    }
    globalThis.window = new EventTarget()
    globalThis.window.addEventListener(COMPOSITION_EVENT, () =>
      events.push(readCompositionCount()),
    )
  })

  after(() => {
    delete globalThis.localStorage
    delete globalThis.window
  })

  beforeEach(() => {
    store.clear()
    events.length = 0
  })

  it('devuelve 0 sin composición guardada', () => {
    assert.equal(readCompositionCount(), 0)
  })

  it('cuenta lo que el builder guardó', () => {
    saveComposition([
      createCompositionItem('chapters/NavMinimal'),
      createCompositionItem('atelier/HeroMeaning'),
    ])
    assert.equal(readCompositionCount(), 2)
  })

  it('no cuenta secciones desconocidas ni chrome duplicado', () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify([
        { uid: 'a', sectionId: 'chapters/NavMinimal' },
        { uid: 'b', sectionId: 'nocturne/NavNocturne' },
        { uid: 'c', sectionId: 'inventada/NoExiste' },
        { uid: 'd', sectionId: 'atelier/HeroMeaning' },
      ]),
    )
    assert.equal(readCompositionCount(), 2)
  })

  it('sobrevive a un storage corrupto', () => {
    store.set(STORAGE_KEY, '{no json')
    assert.equal(readCompositionCount(), 0)
  })

  it('avisa del cambio al guardar y al vaciar', () => {
    saveComposition([createCompositionItem('atelier/HeroMeaning')])
    clearComposition()
    assert.deepEqual(events, [1, 0])
  })
})
