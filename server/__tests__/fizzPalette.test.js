import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { packCustomTemplate } from '../packaging.js'
import { readZip } from './helpers/zip.js'

/**
 * La paleta de FIZZ que sigue al hero (src/domain/fizzPalette.js) tiene que
 * llegar al ZIP igual que se ve en el preview: el App.jsx de la composición
 * lleva los colores que el comprador dejó vacíos, tomados del hero.
 */

let tmp
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-fizz-palette-'))
})
after(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

async function appOf(recipe, name) {
  const dest = path.join(tmp, `${name}.zip`)
  await packCustomTemplate({
    recipe,
    destPath: dest,
    licenseMeta: { orderId: 'fp', email: 'fp@test.com', purchaseCode: 'SL-FP', date: '2026-10-11' },
  })
  return readZip(fs.readFileSync(dest)).get('src/App.jsx').toString('utf8')
}

describe('paleta de FIZZ en el ZIP', () => {
  it('un sabor distinto en el hero llega a las secciones que lo siguen', async () => {
    const app = await appOf(
      [
        { id: 'fizz/NavFizz' },
        { id: 'fizz/HeroBubbles', props: { flavor: 'berry' } },
        { id: 'fizz/FlavorWorlds' },
        { id: 'fizz/BubbleBenefits' },
        { id: 'fizz/FooterSplash' },
      ],
      'berry',
    )
    assert.match(app, /startBg=\{"#ff3ea5"\}/)
    assert.match(app, /startInk=\{"#241352"\}/)
    assert.match(app, /menuInk=\{"#ff3ea5"\}/)
    // BubbleBenefits y FooterSplash: bg y fg del hero (una vez cada una).
    assert.equal((app.match(/ bg=\{"#ff3ea5"\}/g) || []).length, 2)
    assert.equal((app.match(/ fg=\{"#241352"\}/g) || []).length, 2)
  })

  it('lo que el comprador escribió en la sección no se pisa', async () => {
    const app = await appOf(
      [
        { id: 'fizz/HeroBubbles', props: { flavor: 'mint' } },
        { id: 'fizz/BubbleBenefits', props: { bg: '#000000' } },
      ],
      'own',
    )
    assert.match(app, / bg=\{"#000000"\}/)
    assert.doesNotMatch(app, / bg=\{"#3ddc97"\}/)
    assert.match(app, / fg=\{"#241352"\}/)
  })

  it('con el hero de la demo (cobalto) el ZIP queda como antes', async () => {
    const app = await appOf(
      [
        { id: 'fizz/HeroBubbles' },
        { id: 'fizz/FlavorWorlds' },
        { id: 'fizz/BubbleBenefits' },
      ],
      'demo',
    )
    assert.doesNotMatch(app, /startBg=|startInk=| bg=| fg=/)
  })
})
