/** Placeholder copy for CONSTELLATION — English only (template content). */

export const BRAND = 'SIGNAL'

export const GATE_LABELS = [
  { id: 'direction', label: 'DIRECTION', x: -0.32, y: -0.28, primary: true },
  { id: 'presentation', label: 'PRESENTATION', x: 0.02, y: -0.34, primary: true },
  { id: 'ai', label: 'AI', x: 0.36, y: -0.26, primary: true },
  { id: 'proposal', label: 'PROPOSAL', x: -0.38, y: -0.02, primary: true },
  { id: 'strategy', label: 'STRATEGY', x: -0.34, y: 0.28, primary: true },
  { id: 'planning', label: 'PLANNING', x: 0.34, y: 0.3, primary: true },
  { id: 'graphic', label: 'GRAPHIC DESIGN', x: 0.4, y: 0.02, primary: true },
  { id: 'relentless', label: 'RELENTLESS', x: -0.12, y: -0.4, primary: false },
  { id: 'precision', label: 'PRECISION', x: 0.18, y: -0.18, primary: false },
  { id: 'night', label: 'NIGHT OWL', x: -0.22, y: 0.12, primary: false },
  { id: 'obsessive', label: 'OBSESSIVE', x: 0.12, y: 0.36, primary: false },
  { id: 'ctrlz', label: 'CTRL+Z', x: 0.28, y: 0.16, primary: false },
]

export const STARS = [
  { id: 'about', label: 'ABOUT', x: -0.42, y: -0.08, z: 0, hub: true },
  { id: 'work', label: 'WORK', x: -0.28, y: -0.32, z: -0.1 },
  { id: 'skills', label: 'SKILLS', x: -0.18, y: 0.22, z: 0.05 },
  { id: 'clients', label: 'CLIENTS', x: 0.12, y: -0.28, z: -0.05 },
  { id: 'approach', label: 'APPROACH', x: 0.08, y: 0.08, z: 0.12 },
  { id: 'experience', label: 'EXPERIENCE', x: -0.52, y: 0.12, z: -0.15 },
  { id: 'background', label: 'BACKGROUND', x: 0.48, y: 0.02, z: -0.08 },
  { id: 'contact', label: 'CONTACT', x: 0.02, y: 0.02, z: 0, hub: true },
]

export const STAR_EDGES = [
  ['contact', 'about'],
  ['contact', 'approach'],
  ['contact', 'clients'],
  ['contact', 'background'],
  ['about', 'skills'],
  ['about', 'experience'],
  ['about', 'work'],
  ['approach', 'skills'],
  ['clients', 'background'],
  ['work', 'experience'],
]

export const ABOUT_PANELS = {
  about: {
    title: 'A DESIGNER IN THE FIELD',
    body: "I'm a graphic designer who turns complex business stories into structure — then back into feeling. From a single proposal page to a full campaign system, the format changes; the principle doesn't. In the end, everything is dots, lines, and planes.",
  },
  skills: {
    title: 'SKILLS',
    body: 'Brand systems, motion direction, editorial layout, and interactive storytelling. Tools change; composition stays.',
  },
  clients: {
    title: 'CLIENTS',
    body: 'Studios, product teams, and cultural institutions who need clarity without sanding off the edges.',
  },
  approach: {
    title: 'APPROACH',
    body: 'Sort by intent, set priorities, design the compromise that keeps the story transformed. Design is problem definition — and deadlines.',
  },
  experience: {
    title: 'EXPERIENCE',
    body: 'Years shipping campaigns, decks, and digital spaces where scroll is part of the narrative craft.',
  },
  background: {
    title: 'BACKGROUND',
    body: 'Trained in visual communication. Obsessed with grids, grain, and the quiet drama of a single light source.',
  },
  contact: {
    title: 'CONTACT',
    body: 'hello@signal.studio — available for selected collaborations.',
  },
  work: {
    title: 'WORK',
    body: 'Selected self-initiated and client projects live in Portfolio.',
  },
}

export const WORKS = [
  {
    id: 'hold',
    index: '01',
    title: 'HOLD',
    meta: 'SELF-INITIATED — CONCEPT & DIRECTION',
    blurb:
      'A handheld communication object without screens or buttons. Grip pressure and warmth answer with an amber light.',
    modelUrl: '/constellation/hold.glb',
  },
  {
    id: 'trace',
    index: '02',
    title: 'TRACE PEN',
    meta: 'CONCEPT — INTERACTION STUDY',
    blurb: 'A path of particles that remembers every stroke as a constellation of intent.',
    modelUrl: '',
  },
  {
    id: 'amber',
    index: '03',
    title: 'AMBER',
    meta: 'PRODUCT STORY — LIGHT OBJECT',
    blurb: 'Warmth as interface. A sealed sphere that glows only when held together.',
    modelUrl: '',
  },
]

export function starById(id) {
  return STARS.find((s) => s.id === id) || STARS[0]
}

export function aboutPanel(id) {
  return ABOUT_PANELS[id] || ABOUT_PANELS.about
}

export function workById(id) {
  return WORKS.find((w) => w.id === id) || WORKS[0]
}
