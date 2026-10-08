import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  ALLOWED_SECTIONS,
  isAllowedSectionId,
} from '../sections.js'
import { SECTION_IDS } from '../../src/domain/sections.js'
import { RETIRED_SKUS, BUILDER_HIDDEN_SKUS } from '../../src/domain/catalog.js'
import { validateRecipe } from '../validation.js'

/**
 * Lista aprobada de secciones que acepta el servidor (recetas del builder y
 * componentes que se copian al ZIP). La allowlist se deriva de
 * src/domain/sections.js; este test la fija a mano para que habilitar una
 * sección nueva sea una decisión explícita y no un efecto de tocar la tabla.
 */
const APPROVED = [
  'chapters/NavMinimal',
  'chapters/HeroKinetic',
  'chapters/VelocityMarquee',
  'chapters/ManifestoReveal',
  'chapters/StickyImageStory',
  'chapters/HorizontalPanels',
  'chapters/ParallaxEditorial',
  'chapters/StackingCards',
  'chapters/BigNumbers',
  'chapters/QuoteBreak',
  'chapters/FooterCTA',
  'nocturne/NavNocturne',
  'nocturne/HeroCinematic',
  'nocturne/ZoomPortal',
  'nocturne/DiagonalMarquee',
  'nocturne/SplitReveals',
  'nocturne/WorkIndex',
  'nocturne/StickyWordCycle',
  'nocturne/OutroCTA',
  'monolith/NavBrutal',
  'monolith/HeroThree',
  'monolith/SkewScroller',
  'monolith/SpecSheet',
  'monolith/ExhibitGrid',
  'monolith/TypeAccordion',
  'monolith/FooterBrutal',
  'fizz/NavFizz',
  'fizz/HeroBubbles',
  'fizz/FlavorWorlds',
  'fizz/BubbleBenefits',
  'fizz/CanCarousel',
  'fizz/PopManifesto',
  'fizz/ContactSteps',
  'fizz/FooterSplash',
  'velocity/NavVelocity',
  'velocity/HeroStrike',
  'velocity/TrackMerge',
  'velocity/HelmetGrid',
  'velocity/ParallaxRise',
  'velocity/FooterVelocity',
  'atelier/NavAtelier',
  'atelier/HeroMeaning',
  'atelier/AboutClarity',
  'atelier/ServicesStone',
  'atelier/VisionShutter',
  'atelier/SelectedWork',
  'atelier/KeyFacts',
  'atelier/WordStripe',
  'atelier/StudioCards',
  'atelier/FooterAtelier',
  'unity/NavUnity',
  'unity/HeroTwin',
  'unity/MosaicSlider',
  'unity/UniversalLang',
  'unity/LanguageBlock',
  'unity/LastPortrait',
  'unity/StageLines',
  'unity/FooterTrophy',
  'ratio/NavRatio',
  'ratio/HeroTools',
  'ratio/FourPlates',
  'ratio/SplitStudy',
  'ratio/FitStack',
  'ratio/PlateStudy',
  'ratio/BreakRules',
  'ratio/FooterLedger',
  'atrium/NavAtrium',
  'atrium/HeroMassing',
  'atrium/ManifestoType',
  'atrium/ScopeSerif',
  'atrium/ClarityPair',
  'atrium/BlueprintDraw',
  'atrium/ProjectRail',
  'atrium/ProcessPin',
  'atrium/PeopleScatter',
  'atrium/OrbitRing',
  'atrium/StatField',
  'atrium/FooterAtrium',
  'meridian/Hero',
  'meridian/Concept',
  'meridian/GallerySlider',
  'meridian/Location',
  'meridian/Panorama',
  'meridian/Interior',
  'meridian/Amenities',
  'meridian/Masterplan',
  'meridian/Contact',
  'meridian/Footer',
  'kin/Hero',
  'kin/Intro',
  'kin/Rooms',
  'kin/Collection',
  'kin/Footer',
  'contact/ContactForm',
  'commerce/ProductGrid',
]

describe('allowlist de secciones del servidor', () => {
  it('es exactamente la lista aprobada, en orden', () => {
    assert.deepEqual([...ALLOWED_SECTIONS], APPROVED)
  })

  it('deja afuera solo los modelos retirados', () => {
    const left = SECTION_IDS.filter((id) => !ALLOWED_SECTIONS.includes(id))
    assert.ok(left.length > 0)
    for (const id of left) {
      assert.ok(RETIRED_SKUS.includes(id.split('/')[0]), `${id} quedó afuera sin estar retirado`)
    }
  })

  it('rechaza ids que no son de la tabla', () => {
    for (const id of ['plum/Nope', '../etc/passwd', 'chapters/HeroKinetic/../x', '__proto__', 'constructor', '', null, 42]) {
      assert.equal(isAllowedSectionId(id), false, String(id))
    }
  })

  it('una receta con secciones en obra (BUILDER_HIDDEN) se rechaza aunque pasen la allowlist', () => {
    const hidden = ALLOWED_SECTIONS.find((id) => BUILDER_HIDDEN_SKUS.includes(id.split('/')[0]))
    assert.ok(hidden, 'esperaba al menos una sección en obra en la allowlist (RATIO)')
    assert.throws(() => validateRecipe([hidden]), /Sección no permitida/)
  })
})
