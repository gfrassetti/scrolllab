import linhoCover from './assets/linho-cover.webp'
import linhoCoverS from './assets/linho-cover-900.webp'
import linhoHero from './assets/linho-hero.webp'
import linhoHeroS from './assets/linho-hero-s.webp'
import linhoLight from './assets/linho-light.webp'
import linhoLightS from './assets/linho-light-s.webp'
import linhoColour from './assets/linho-colour.webp'
import linhoColourS from './assets/linho-colour-s.webp'
import linhoCraft from './assets/linho-craft.webp'
import linhoCraftS from './assets/linho-craft-s.webp'
import linhoThumb from './assets/linho-thumb.webp'
import linhoThumbS from './assets/linho-thumb-s.webp'
import muralhaCover from './assets/muralha-cover.webp'
import muralhaCoverS from './assets/muralha-cover-900.webp'
import muralhaHero from './assets/muralha-hero.webp'
import muralhaHeroS from './assets/muralha-hero-s.webp'
import muralhaLight from './assets/muralha-light.webp'
import muralhaLightS from './assets/muralha-light-s.webp'
import muralhaColour from './assets/muralha-colour.webp'
import muralhaColourS from './assets/muralha-colour-s.webp'
import muralhaCraft from './assets/muralha-craft.webp'
import muralhaCraftS from './assets/muralha-craft-s.webp'
import muralhaThumb from './assets/muralha-thumb.webp'
import muralhaThumbS from './assets/muralha-thumb-s.webp'
import mareCover from './assets/mare-cover.webp'
import mareCoverS from './assets/mare-cover-900.webp'
import mareHero from './assets/mare-hero.webp'
import mareHeroS from './assets/mare-hero-s.webp'
import mareLight from './assets/mare-light.webp'
import mareLightS from './assets/mare-light-s.webp'
import mareColour from './assets/mare-colour.webp'
import mareColourS from './assets/mare-colour-s.webp'
import mareCraft from './assets/mare-craft.webp'
import mareCraftS from './assets/mare-craft-s.webp'
import mareThumb from './assets/mare-thumb.webp'
import mareThumbS from './assets/mare-thumb-s.webp'

/**
 * The studio's projects. Each project is a page (`/projects/<slug>`, ProjectPage.jsx).
 *
 *   photos   each photo: `src` (large), `small` (small screens), `w` × `h` (its proportion) and `alt`.
 *   cover    the card in Projects and the small closing photo; `hero`, the tall photo on the right of the
 *            opening; `thumb`, the one framed in the colour panel.
 *   light / colour / craft   the photos that scroll with parallax, each with its note beside it:
 *            light (wide), colour (tall, with its note), craft (wide).
 *   notes    the text beside those three photos: [label, sentence].
 */
const photo = (src, small, w, h, alt) => ({ src, small, w, h, alt })

export const PROJECTS = [
  {
    slug: 'linho',
    n: '01',
    name: 'Linho',
    kind: 'Concept store',
    place: 'Sintra',
    year: '2025',
    area: '68',
    lede: 'A 68 m² concept store designed whole: from the window wall to the last piece of joinery.',
    services: ['Layout and build', 'Finishes and colour', 'Lighting', 'Joinery and furniture'],
    photos: {
      cover: photo(linhoCover, linhoCoverS, 3, 2, 'Linho: the shop seen from the centre, with the oak table and the travertine counter'),
      hero: photo(linhoHero, linhoHeroS, 3, 4, 'The curved travertine counter in front of the oak shelving'),
      thumb: photo(linhoThumb, linhoThumbS, 1, 1, 'Ceramics on an oak shelf'),
      light: photo(linhoLight, linhoLightS, 2688, 1520, 'The window wall at the back, with the mountain, and the oak table in the middle'),
      colour: photo(linhoColour, linhoColourS, 3, 4, 'The terracotta niche, with a stone bench and an olive tree'),
      craft: photo(linhoCraft, linhoCraftS, 2688, 1520, 'The linen rail beside the door, under the paper lamp'),
    },
    notes: {
      light: ['Light', 'The window wall sets the route: everything else is arranged so the afternoon light crosses the shop from end to end.'],
      colour: ['Colour', 'A single terracotta niche breaks the calm of the microcement and the stone. It is the place where you stop.'],
      craft: ['Craft', 'Oak joinery and made-to-measure finishes, in materials that get better with use.'],
    },
    quote: 'We designed the shop whole, piece by piece, so that whoever walks in feels at home.',
  },
  {
    slug: 'muralha',
    n: '02',
    name: 'Casa Muralha',
    kind: 'Private house',
    place: 'Alentejo',
    year: '2024',
    area: '240',
    lede: 'A 240 m² house built from the earth it stands on: thick walls, deep shade and one long view of the olive grove.',
    services: ['Architecture', 'Interiors', 'Landscape', 'Furniture'],
    photos: {
      cover: photo(muralhaCover, muralhaCoverS, 3, 2, 'Casa Muralha: the rammed-earth house at golden hour, with its olive tree and covered terrace'),
      hero: photo(muralhaHero, muralhaHeroS, 3, 4, 'The oak front door set deep in the rammed-earth wall'),
      thumb: photo(muralhaThumb, muralhaThumbS, 1, 1, 'A terracotta jug against the layers of the rammed-earth wall'),
      light: photo(muralhaLight, muralhaLightS, 2688, 1520, 'The living room opening onto the olive grove through a steel-framed glass wall'),
      colour: photo(muralhaColour, muralhaColourS, 3, 4, 'A lime-plaster corridor ending in an ochre arch'),
      craft: photo(muralhaCraft, muralhaCraftS, 2688, 1520, 'The oak and stone kitchen, with the olive tree in the window'),
    },
    notes: {
      light: ['Light', 'Every room is cut to catch one hour of the day: the morning in the kitchen, the late sun across the living room.'],
      colour: ['Colour', 'The house is almost colourless. One ochre arch at the end of the corridor is the only decision about colour.'],
      craft: ['Craft', 'Earth rammed in layers on site, oak cut by a carpenter from the village and tiles fired in the next valley.'],
    },
    quote: 'The house is built from the ground it stands on, and it should look as if it had always been there.',
  },
  {
    slug: 'mare',
    n: '03',
    name: 'Maré',
    kind: 'Restaurant',
    place: 'Lisbon',
    year: '2024',
    area: '110',
    lede: 'A 110 m² seafood restaurant under tall arched windows, built around one long bar tiled in blue.',
    services: ['Interior architecture', 'Lighting', 'Joinery', 'Tableware'],
    photos: {
      cover: photo(mareCover, mareCoverS, 3, 2, 'Maré: the dining room at dusk, with the blue tiled bar and the arched windows over the river'),
      hero: photo(mareHero, mareHeroS, 3, 4, 'The bar front clad in blue glazed tiles, with oak stools and a brass pendant'),
      thumb: photo(mareThumb, mareThumbS, 1, 1, 'A set table with linen, a ceramic plate and a glass in warm light'),
      light: photo(mareLight, mareLightS, 2688, 1520, 'The row of arched windows at dusk, with the tables and banquettes in front'),
      colour: photo(mareColour, mareColourS, 3, 4, 'A column clad in cobalt tiles with a brass sconce'),
      craft: photo(mareCraft, mareCraftS, 2688, 1520, 'The open kitchen pass in oak and brass, with copper pots on a rail'),
    },
    notes: {
      light: ['Light', 'The lamps are kept low and warm, so the room glows while the river outside turns blue.'],
      colour: ['Colour', 'One deep blue, repeated on the bar and on a single column, against lime plaster and terracotta.'],
      craft: ['Craft', 'The banquettes, the hand-glazed tiles and the brass pass were made by the same two workshops.'],
    },
    quote: 'We wanted the room to feel like the last hour of the day, every evening.',
  },
]

export const projectBySlug = (slug) => PROJECTS.find((p) => p.slug === slug)
