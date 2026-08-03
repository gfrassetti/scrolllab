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

import NavFizz from '../components/sections/fizz/NavFizz'
import HeroBubbles from '../components/sections/fizz/HeroBubbles'
import FlavorWorlds from '../components/sections/fizz/FlavorWorlds'
import BubbleBenefits from '../components/sections/fizz/BubbleBenefits'
import CanCarousel from '../components/sections/fizz/CanCarousel'
import PopManifesto from '../components/sections/fizz/PopManifesto'
import FooterSplash from '../components/sections/fizz/FooterSplash'

import NavVelocity from '../components/sections/velocity/NavVelocity'
import HeroStrike from '../components/sections/velocity/HeroStrike'
import TrackMerge from '../components/sections/velocity/TrackMerge'
import HelmetGrid from '../components/sections/velocity/HelmetGrid'
import ParallaxRise from '../components/sections/velocity/ParallaxRise'
import FooterVelocity from '../components/sections/velocity/FooterVelocity'

import NavAtelier from '../components/sections/atelier/NavAtelier'
import HeroMeaning from '../components/sections/atelier/HeroMeaning'
import AboutClarity from '../components/sections/atelier/AboutClarity'
import ServicesStone from '../components/sections/atelier/ServicesStone'
import VisionShutter from '../components/sections/atelier/VisionShutter'
import SelectedWork from '../components/sections/atelier/SelectedWork'
import KeyFacts from '../components/sections/atelier/KeyFacts'
import WordStripe from '../components/sections/atelier/WordStripe'
import StudioCards from '../components/sections/atelier/StudioCards'
import FooterAtelier from '../components/sections/atelier/FooterAtelier'

import NavUnity from '../components/sections/unity/NavUnity'
import HeroTwin from '../components/sections/unity/HeroTwin'
import MosaicSlider from '../components/sections/unity/MosaicSlider'
import UniversalLang from '../components/sections/unity/UniversalLang'
import LanguageBlock from '../components/sections/unity/LanguageBlock'
import LastPortrait from '../components/sections/unity/LastPortrait'
import StageLines from '../components/sections/unity/StageLines'
import FooterTrophy from '../components/sections/unity/FooterTrophy'
import ContactForm from '../components/sections/contact/ContactForm'
import ProductGrid from '../components/sections/commerce/ProductGrid'

/**
 * Central catalog of every section across all template models.
 * Builder preview can pass text props; defaults live on each component.
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
      { id: 'chapters/NavMinimal', name: 'Nav Minimal', kind: 'nav', component: NavMinimal, blurb: 'Fixed header that inverts over any background · full-screen mobile menu' },
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
      { id: 'nocturne/NavNocturne', name: 'Nav Nocturne', kind: 'nav', component: NavNocturne, blurb: 'Fixed dark header with reel marker · numbered mobile menu' },
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
      { id: 'monolith/NavBrutal', name: 'Nav Brutal', kind: 'nav', component: NavBrutal, blurb: 'Solid blocky header with hard borders · slab mobile menu' },
      { id: 'monolith/HeroThree', name: 'Hero Three', kind: 'hero', component: HeroThree, blurb: 'Wireframe 3D monolith behind giant type' },
      { id: 'monolith/SkewScroller', name: 'Skew Scroller', kind: 'section', component: SkewScroller, blurb: 'Giant words shearing with scroll velocity' },
      { id: 'monolith/SpecSheet', name: 'Spec Sheet', kind: 'section', component: SpecSheet, blurb: 'Brutalist data table, rows invert on hover' },
      { id: 'monolith/ExhibitGrid', name: 'Exhibit Grid', kind: 'section', component: ExhibitGrid, blurb: 'Hard-bordered grid, grayscale until hovered' },
      { id: 'monolith/TypeAccordion', name: 'Type Accordion', kind: 'section', component: TypeAccordion, blurb: 'Condensed titles expanding into drawers' },
      { id: 'monolith/FooterBrutal', name: 'Footer Brutal', kind: 'footer', component: FooterBrutal, blurb: 'Klein-blue closing block with mono links' },
    ],
  },
  {
    id: 'fizz',
    name: 'FIZZ',
    accent: '#ff3ea5',
    wrapperClass: 'bg-grape text-foam',
    sections: [
      { id: 'fizz/NavFizz', name: 'Nav Fizz', kind: 'nav', component: NavFizz, blurb: 'Floating pill header with dropdown menus' },
      { id: 'fizz/HeroBubbles', name: 'Hero Bubbles', kind: 'hero', component: HeroBubbles, blurb: 'Photoreal can PNG over scroll bubbles; optional GLB override' },
      { id: 'fizz/FlavorWorlds', name: 'Flavor Worlds', kind: 'section', component: FlavorWorlds, blurb: 'Full-screen worlds repainting the page per flavor' },
      { id: 'fizz/BubbleBenefits', name: 'Bubble Benefits', kind: 'section', component: BubbleBenefits, blurb: 'Springy benefit cards with drifting bubbles' },
      { id: 'fizz/CanCarousel', name: 'Can Carousel', kind: 'section', component: CanCarousel, blurb: 'Snap shelf of photorealistic can PNGs; flavor glow on hover' },
      { id: 'fizz/PopManifesto', name: 'Pop Manifesto', kind: 'section', component: PopManifesto, blurb: 'Giant paragraph inking in with flavor colors' },
      { id: 'fizz/FooterSplash', name: 'Footer Splash', kind: 'footer', component: FooterSplash, blurb: 'Candy CTA word with bubbles rising behind' },
    ],
  },
  {
    id: 'velocity',
    name: 'VELOCITY',
    accent: '#d9ff3f',
    wrapperClass: 'bg-[#0a1a12] text-[#ece9e2]',
    sections: [
      { id: 'velocity/NavVelocity', name: 'Nav Velocity', kind: 'nav', component: NavVelocity, blurb: 'Fixed athlete header with lime CTA · full-screen mobile menu' },
      { id: 'velocity/HeroStrike', name: 'Hero Strike', kind: 'hero', component: HeroStrike, blurb: 'Full-bleed multi-layer parallax — titles peel, layers blur out' },
      { id: 'velocity/TrackMerge', name: 'Track Merge', kind: 'section', component: TrackMerge, blurb: 'Horizontal gallery / On-Off tracks merging' },
      { id: 'velocity/HelmetGrid', name: 'Helmet Grid', kind: 'section', component: HelmetGrid, blurb: 'Hall of fame product grid with focus' },
      { id: 'velocity/ParallaxRise', name: 'Parallax Rise', kind: 'section', component: ParallaxRise, blurb: 'Content band with rising parallax media' },
      { id: 'velocity/FooterVelocity', name: 'Footer Velocity', kind: 'footer', component: FooterVelocity, blurb: 'Closing line with lime accent' },
    ],
  },
  {
    id: 'atelier',
    name: 'ATELIER',
    accent: '#c8d0dc',
    wrapperClass: 'bg-[#0b0c10] text-white',
    sections: [
      { id: 'atelier/NavAtelier', name: 'Nav Atelier', kind: 'nav', component: NavAtelier, blurb: 'Floating MENU pill + CTA · full-screen overlay' },
      { id: 'atelier/HeroMeaning', name: 'Hero Meaning', kind: 'hero', component: HeroMeaning, blurb: 'Blur-in type with a scroll-scrubbed WebGL emblem' },
      { id: 'atelier/AboutClarity', name: 'About Clarity', kind: 'section', component: AboutClarity, blurb: 'Word-masked about statement over scroll fog' },
      { id: 'atelier/ServicesStone', name: 'Services Stone', kind: 'section', component: ServicesStone, blurb: 'Pinned services with a scrubbed 3D stone' },
      { id: 'atelier/VisionShutter', name: 'Vision Shutter', kind: 'section', component: VisionShutter, blurb: 'Shutter bands and oversized scrubbing words' },
      { id: 'atelier/SelectedWork', name: 'Selected Work', kind: 'section', component: SelectedWork, blurb: 'Horizontal work slider — cards rise in with fade' },
      { id: 'atelier/KeyFacts', name: 'Key Facts', kind: 'section', component: KeyFacts, blurb: 'Big numbers with fog atmosphere' },
      { id: 'atelier/WordStripe', name: 'Word Stripe', kind: 'section', component: WordStripe, blurb: 'Pinned shutter transition — same mechanic as Vision Shutter' },
      { id: 'atelier/StudioCards', name: 'Studio Cards', kind: 'section', component: StudioCards, blurb: 'Light 2×3 card grid that staggers in after the shutter wash' },
      { id: 'atelier/FooterAtelier', name: 'Footer Atelier', kind: 'footer', component: FooterAtelier, blurb: 'Dark studio closer with lined brand mark + collaboration CTA' },
    ],
  },
  {
    id: 'unity',
    name: 'UNITY',
    accent: '#f4c518',
    wrapperClass: 'bg-[#f3efe6] text-[#0a0a0a]',
    sections: [
      { id: 'unity/NavUnity', name: 'Nav Unity', kind: 'nav', component: NavUnity, blurb: 'Phrase left · logo center · 3 links right' },
      { id: 'unity/HeroTwin', name: 'Hero Twin', kind: 'hero', component: HeroTwin, blurb: 'Two headlines peeling apart on scroll parallax' },
      { id: 'unity/MosaicSlider', name: 'Mosaic Slider', kind: 'section', component: MosaicSlider, blurb: 'Scattered polaroids that unfold into a full-bleed slider' },
      { id: 'unity/UniversalLang', name: 'Universal Lang', kind: 'section', component: UniversalLang, blurb: 'Pinned giant number with barcode stats' },
      { id: 'unity/LanguageBlock', name: 'Language Block', kind: 'section', component: LanguageBlock, blurb: 'Oversized type interleaved with fixed-feel photo windows' },
      { id: 'unity/LastPortrait', name: 'Last Portrait', kind: 'section', component: LastPortrait, blurb: 'Dark portrait closer with stats row' },
      { id: 'unity/StageLines', name: 'Stage Lines', kind: 'section', component: StageLines, blurb: 'Two typographic stage beats over drifting media' },
      { id: 'unity/FooterTrophy', name: 'Footer Trophy', kind: 'footer', component: FooterTrophy, blurb: 'Sky closer with giant type and a rising transparent PNG' },
    ],
  },
  {
    id: 'contact',
    name: 'CONTACT',
    accent: '#7c5cff',
    // Empty on purpose: the section paints its own theme (or inherits with `auto`).
    wrapperClass: '',
    sections: [
      {
        id: 'contact/ContactForm',
        name: 'Contact Form',
        kind: 'section',
        component: ContactForm,
        blurb: "Validated contact form that picks up the adjacent section's palette",
      },
    ],
  },
  {
    id: 'commerce',
    name: 'COMMERCE',
    accent: '#00c08b',
    // Empty: ProductGrid (+ ShopThemeProvider) paint the palette from `theme`.
    wrapperClass: '',
    sections: [
      {
        id: 'commerce/ProductGrid',
        name: 'Product Grid',
        kind: 'section',
        component: ProductGrid,
        blurb:
          'Catalog on the page; product, cart and checkout as separate screens (demo payment)',
      },
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
