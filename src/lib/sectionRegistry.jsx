import NavMinimal from '../components/sections/chapters/NavMinimal'
import HeroKinetic from '../components/sections/chapters/HeroKinetic'
import VelocityMarquee from '../components/sections/chapters/VelocityMarquee'
import ManifestoReveal from '../components/sections/chapters/ManifestoReveal'
import StickyImageStory from '../components/sections/chapters/StickyImageStory'
import HorizontalPanels from '../components/sections/chapters/HorizontalPanels'
import ParallaxEditorial from '../components/sections/chapters/ParallaxEditorial'
import StackingCards from '../components/sections/chapters/StackingCards'
import BigNumbers from '../components/sections/chapters/BigNumbers'
import QuoteBreak from '../components/sections/chapters/QuoteBreak'
import FooterCTA from '../components/sections/chapters/FooterCTA'

import NavNocturne from '../components/sections/nocturne/NavNocturne'
import HeroCinematic from '../components/sections/nocturne/HeroCinematic'
import ZoomPortal from '../components/sections/nocturne/ZoomPortal'
import DiagonalMarquee from '../components/sections/nocturne/DiagonalMarquee'
import SplitReveals from '../components/sections/nocturne/SplitReveals'
import WorkIndex from '../components/sections/nocturne/WorkIndex'
import StickyWordCycle from '../components/sections/nocturne/StickyWordCycle'
import OutroCTA from '../components/sections/nocturne/OutroCTA'

import NavBrutal from '../components/sections/monolith/NavBrutal'
import HeroThree from '../components/sections/monolith/HeroThree'
import SkewScroller from '../components/sections/monolith/SkewScroller'
import SpecSheet from '../components/sections/monolith/SpecSheet'
import ExhibitGrid from '../components/sections/monolith/ExhibitGrid'
import TypeAccordion from '../components/sections/monolith/TypeAccordion'
import FooterBrutal from '../components/sections/monolith/FooterBrutal'

/**
 * Central catalog of every section across all template models.
 * The builder (and later the market) reads from here. Each section
 * renders with zero props, so composing is just stacking components.
 *
 * `wrapperClass` gives every section instance its model's canvas
 * (background + text color) when mixed with sections of other models.
 */
export const models = [
  {
    id: 'chapters',
    name: 'CHAPTERS',
    accent: '#ff4b00',
    wrapperClass: 'bg-bone text-ink',
    sections: [
      { id: 'chapters/NavMinimal', name: 'Nav Minimal', kind: 'nav', component: NavMinimal, blurb: 'Fixed header that inverts over any background' },
      { id: 'chapters/HeroKinetic', name: 'Hero Kinetic', kind: 'hero', component: HeroKinetic, blurb: 'Oversized type rising out of masks' },
      { id: 'chapters/VelocityMarquee', name: 'Velocity Marquee', kind: 'section', component: VelocityMarquee, blurb: 'Ribbon that speeds up with scroll' },
      { id: 'chapters/ManifestoReveal', name: 'Manifesto Reveal', kind: 'section', component: ManifestoReveal, blurb: 'Giant paragraph inking in word by word' },
      { id: 'chapters/StickyImageStory', name: 'Sticky Image Story', kind: 'section', component: StickyImageStory, blurb: 'Pinned image, narrative flows beside it' },
      { id: 'chapters/HorizontalPanels', name: 'Horizontal Panels', kind: 'section', component: HorizontalPanels, blurb: 'Vertical scroll drives a horizontal pan' },
      { id: 'chapters/ParallaxEditorial', name: 'Parallax Editorial', kind: 'section', component: ParallaxEditorial, blurb: 'Scattered images drifting at different speeds' },
      { id: 'chapters/StackingCards', name: 'Stacking Cards', kind: 'section', component: StackingCards, blurb: 'Sticky cards piling onto each other' },
      { id: 'chapters/BigNumbers', name: 'Big Numbers', kind: 'section', component: BigNumbers, blurb: 'Huge stat counters that count up' },
      { id: 'chapters/QuoteBreak', name: 'Quote Break', kind: 'section', component: QuoteBreak, blurb: 'Inverted full-screen serif interlude' },
      { id: 'chapters/FooterCTA', name: 'Footer CTA', kind: 'footer', component: FooterCTA, blurb: 'Giant call-to-action word closing the page' },
    ],
  },
  {
    id: 'nocturne',
    name: 'NOCTURNE',
    accent: '#d9ff3f',
    wrapperClass: 'bg-noir text-salt',
    sections: [
      { id: 'nocturne/NavNocturne', name: 'Nav Nocturne', kind: 'nav', component: NavNocturne, blurb: 'Fixed dark header with reel marker' },
      { id: 'nocturne/HeroCinematic', name: 'Hero Cinematic', kind: 'hero', component: HeroCinematic, blurb: 'Full-bleed photo with slow zoom, credit type' },
      { id: 'nocturne/ZoomPortal', name: 'Zoom Portal', kind: 'section', component: ZoomPortal, blurb: 'Small window grows to swallow the viewport' },
      { id: 'nocturne/DiagonalMarquee', name: 'Diagonal Marquee', kind: 'section', component: DiagonalMarquee, blurb: 'Two tilted ribbons crossing directions' },
      { id: 'nocturne/SplitReveals', name: 'Split Reveals', kind: 'section', component: SplitReveals, blurb: 'Alternating rows with clip-path wipes' },
      { id: 'nocturne/WorkIndex', name: 'Work Index', kind: 'section', component: WorkIndex, blurb: 'Hover list with cursor-trailing preview' },
      { id: 'nocturne/StickyWordCycle', name: 'Sticky Word Cycle', kind: 'section', component: StickyWordCycle, blurb: 'Pinned words dissolving into each other' },
      { id: 'nocturne/OutroCTA', name: 'Outro CTA', kind: 'footer', component: OutroCTA, blurb: 'Closing credits with giant CTA word' },
    ],
  },
  {
    id: 'monolith',
    name: 'MONOLITH',
    accent: '#2b3cff',
    wrapperClass: 'bg-concrete text-carbon',
    sections: [
      { id: 'monolith/NavBrutal', name: 'Nav Brutal', kind: 'nav', component: NavBrutal, blurb: 'Solid blocky header with hard borders' },
      { id: 'monolith/HeroThree', name: 'Hero Three', kind: 'hero', component: HeroThree, blurb: 'Three.js wireframe monolith behind giant type' },
      { id: 'monolith/SkewScroller', name: 'Skew Scroller', kind: 'section', component: SkewScroller, blurb: 'Giant words shearing with scroll velocity' },
      { id: 'monolith/SpecSheet', name: 'Spec Sheet', kind: 'section', component: SpecSheet, blurb: 'Brutalist data table, rows invert on hover' },
      { id: 'monolith/ExhibitGrid', name: 'Exhibit Grid', kind: 'section', component: ExhibitGrid, blurb: 'Hard-bordered grid, grayscale until hovered' },
      { id: 'monolith/TypeAccordion', name: 'Type Accordion', kind: 'section', component: TypeAccordion, blurb: 'Condensed titles expanding into drawers' },
      { id: 'monolith/FooterBrutal', name: 'Footer Brutal', kind: 'footer', component: FooterBrutal, blurb: 'Klein-blue closing block with mono links' },
    ],
  },
]

const index = new Map()
models.forEach((model) => {
  model.sections.forEach((section) => {
    index.set(section.id, { ...section, model })
  })
})

/** Look up a section (with its model attached) by id like 'chapters/HeroKinetic'. */
export function getSection(id) {
  return index.get(id)
}
