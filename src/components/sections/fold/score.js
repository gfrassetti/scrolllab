/**
 * FOLD — the score.
 *
 * ⚠ THE DEMO FILM IS A SAMPLE: replace it. Your clips → `node
 * scripts/fold-reel.mjs --masters ./my-clips` → then rewrite this file:
 * `scenes` (one per take, ids from the reel's manifest), `texts`,
 * `chapters`, `grid`, `tone` and `transitions`, all against your film.
 * Step by step: README → "The film".
 *
 * Everything the film does is written here, as data, against one number:
 * `p`, how far the reader has scrolled through the film section (0 → 1).
 * The engine (Film.jsx) only reads this file and the reel's manifest.
 *
 * The reel is one long frame sequence made of a few takes laid end to end —
 * /public/fold/film/<tier>/f_0001.webp… — and its manifest says where each
 * take starts, how many frames it has and how much the picture moves on each
 * one (the pace). Here you only say *when* each take plays; the engine spends
 * the scroll by movement, so the film never stops while you scroll.
 *
 * Positions on screen are fractions (0–1). Between two keys the engine eases.
 */

export const SCORE = {
  // Where the reel lives; the engine takes the first one that answers.
  //   VITE_FOLD_FILM_URL — the full reel on a CDN (production);
  //   /fold/film         — the full reel built locally (scripts/fold-reel.mjs);
  //   /fold/demo         — the light reel that ships with the template.
  film: {
    bases: [import.meta.env.VITE_FOLD_FILM_URL, '/fold/film', '/fold/demo'],
    pad: 4,
  },

  // Phones only: the text of the loader that holds the page, with a percentage,
  // until the first stretch of the film is in, and again before each new take
  // when its frames are not in yet (it only shows if the wait lasts a moment).
  loader: { label: 'Loading the film' },

  // Height of the film section, in screens of scroll. A swipe on a phone
  // travels much further than a wheel tick, so phones get a shorter scroll.
  screens: 46,
  screensPhone: 22,

  // On a tall (phone) screen the wide frame is cropped: keep this point of
  // the frame (0 = left edge, 1 = right edge) in view. A take can set its own.
  portraitFocus: 0.62,

  // Takes, in order. Each take is one continuous camera move (several clips
  // chained on the same frame, blended at the joins). A new take only starts
  // under a transition, where a new story begins; during the transition both
  // keep playing (`to` of the leaving take overlaps `from` of the next one).
  //   build — the sphere is finished, opens like a flower, the valley.
  //   town  — night street → lanterns → the moon becomes a workshop lamp →
  //           a sheet folds itself into a lantern → it flies out at dawn.
  //   dawn  — sunrise, paper birds, up into the paper clouds.
  scenes: [
    { id: 'build', from: 0, to: 0.29, focus: 0.64 },
    { id: 'town', from: 0.29, to: 0.885, focus: 0.55 },
    { id: 'dawn', from: 0.84, to: 1, focus: 0.5 },
  ],

  // A slow push of the camera over the frame, never held still.
  // s = scale, x/y = focus point.
  zoom: [
    { at: 0, s: 1, x: 0.5, y: 0.5 },
    { at: 0.285, s: 1.06, x: 0.5, y: 0.45 },
    { at: 0.295, s: 1.01, x: 0.5, y: 0.5 },
    { at: 0.84, s: 1.06, x: 0.5, y: 0.46 },
    { at: 0.885, s: 1.01, x: 0.5, y: 0.5 },
    { at: 1, s: 1.05, x: 0.5, y: 0.45 },
  ],

  // The grid: two vertical and two horizontal hairlines with a ✦ at each
  // crossing. r = [left, top, right, bottom] of the rectangle they frame.
  grid: [
    { at: 0, r: [0.08, 0.14, 0.92, 0.86] },
    { at: 0.05, r: [0.44, 0.12, 0.96, 0.84] },
    { at: 0.11, r: [0.5, 0.06, 0.98, 0.7] },
    { at: 0.18, r: [0.36, 0.18, 0.86, 0.9] },
    { at: 0.24, r: [0.22, 0.24, 0.78, 0.76] },
    { at: 0.28, r: [0.08, 0.12, 0.92, 0.88] },
    { at: 0.34, r: [0.08, 0.2, 0.6, 0.88] },
    { at: 0.46, r: [0.3, 0.08, 0.94, 0.62] },
    { at: 0.58, r: [0.4, 0.06, 0.92, 0.5] },
    { at: 0.66, r: [0.08, 0.2, 0.56, 0.86] },
    { at: 0.76, r: [0.34, 0.14, 0.8, 0.86] },
    { at: 0.84, r: [0.5, 0.1, 0.94, 0.7] },
    { at: 0.9, r: [0.08, 0.12, 0.62, 0.88] },
    { at: 1, r: [0.16, 0.2, 0.84, 0.8] },
  ],

  // Colour of the overlay (grid, rail, text): dark ink over the day scenes,
  // light over the colour field, the night and the workshop.
  tone: [
    [0, 'dark'],
    [0.276, 'light'],
    [0.866, 'dark'],
  ],

  // Chapters: the rail on the left and the menu. `at` is where each starts.
  chapters: [
    { at: 0, title: 'The Workshop' },
    { at: 0.29, title: 'The Town' },
    { at: 0.62, title: 'The Process' },
    { at: 0.86, title: 'Questions' },
  ],

  // Text cards: visible between `from` and `to`.
  texts: [
    {
      from: 0.008,
      to: 0.055,
      place: 'left',
      kicker: '01 — The workshop',
      title: 'Every lantern starts as one sheet.',
      body: 'Mulberry paper, cut and scored by hand in our Porto workshop. No glue, no wire: only folds.',
    },
    {
      from: 0.085,
      to: 0.14,
      place: 'left',
      kicker: '02 — By hand',
      title: 'Four hundred folds, one evening.',
      body: 'Each piece is folded by one pair of hands from the first crease to the last, then signed on the inside seam.',
    },
    {
      from: 0.165,
      to: 0.215,
      place: 'left',
      kicker: '03 — The bloom',
      title: 'Then, one evening, it opens.',
      body: '',
    },
    {
      from: 0.232,
      to: 0.262,
      place: 'right',
      kicker: '04 — Commissions',
      title: 'A whole valley, on one table.',
      body: 'Our largest commission: a paper landscape for a hotel lobby, 2.4 metres across, folded from 312 sheets.',
    },
    {
      from: 0.282,
      to: 0.3,
      place: 'center',
      tone: 'light',
      kicker: 'Chapter 02',
      title: 'The Town',
      body: '',
    },
    {
      from: 0.335,
      to: 0.39,
      place: 'right',
      tone: 'light',
      kicker: '05 — Night market',
      title: 'Lights on, everyone home.',
      body: 'Every October we hang six hundred lanterns over the old town. Half the street helps fold them.',
    },
    {
      from: 0.43,
      to: 0.5,
      place: 'left',
      tone: 'light',
      kicker: '06 — The lamp',
      title: 'A moon, a lamp, a sheet of paper.',
      body: '',
    },
    {
      from: 0.55,
      to: 0.6,
      place: 'left',
      tone: 'light',
      kicker: '07 — The table',
      title: 'Every light starts on a table.',
      body: '',
    },
    {
      from: 0.66,
      to: 0.8,
      place: 'left',
      tone: 'light',
      kicker: 'The Process',
      title: 'Three steps — fold, light, release.',
      list: ['01 — Fold: two hours, paper included.', '02 — Light: a warm LED, never a flame.', '03 — Release: hang it at home, or with ours.'],
    },
    {
      from: 0.895,
      to: 1.01,
      place: 'left',
      kicker: 'Questions',
      title: 'Asked before.',
      list: ['Do I need origami? — None at all.', 'How long does one last? — Years.', 'Groups? — Up to twelve, on Saturdays.'],
    },
  ],

  // Scene changes.
  //   dots  — the frame dissolves into a field of colour cell by cell, rising
  //           from the bottom with a scatter of light at the edge (from →
  //           full), holds (full → out), then lifts the same way and the next
  //           story is already moving underneath (out → to).
  //   paper — the leaving take tears into flakes of paper that blow upward
  //           from the bottom; the next take plays underneath the whole time.
  transitions: [
    { from: 0.262, full: 0.282, out: 0.292, to: 0.316, type: 'dots', color: '#45433d' },
    { from: 0.84, to: 0.885, type: 'paper', leaving: 'town' },
  ],
}
