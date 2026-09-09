# PLUM — editing the scroll film

The whole page is one long image sequence on a fixed canvas. Scrolling plays
it frame by frame — a cinematic **product story** (the demo follows a pear from
grove to table; swap it for a phone off the line, a bean roasting, a part being
machined). Text, short mp4 clips, SVG marks, colour washes and the edge grid
ride on top, all positioned by scroll percent.

**Everything is `story.json` in this folder.** It's fetched at runtime — edit,
save, refresh. You never touch component code.

---

## `story.json`

```jsonc
{
  "title": "PLUM",
  "theme":  { "bg": "#0b0b0d", "ink": "#f3f1ec", "accent": "#6f5bff" },
  "frames": { "basePath": "/plum/seq", "pad": 4, "ext": "webp" },
  "scroll": { "pxPerFrame": 32, "ease": 0.14 },
  "loader": { "window": 44, "decodeWidth": 1280, "keyframeStride": 6, "keyframeWidth": 512 },
  "ui":     { "progress": true, "grid": true },

  "chapters": [ ... ],
  "beats":    [ ... ],
  "clips":    [ ... ],
  "overlays": [ ... ]
}
```

### `chapters` — the frame sequence

Each chapter is a **folder of numbered frames** that play back-to-back:

```
seq/grove/0001.webp  ...  seq/grove/0080.webp
seq/harvest/0001.webp ...
```

```jsonc
{ "id": "grove", "frames": 80,
  "label": "01 — The grove",   // shown in the corner HUD (optional)
  "tint": "#0f2f5c",           // colour wash over this act (optional)
  "tintAlpha": 0.5 }           // 0–1, default 0.5
```

- Scroll `0 → 1` runs every chapter in array order. **Reorder the array to
  reorder the story.**
- **Replace an act:** drop your own numbered frames in its folder, set `frames`
  to the new count. Nothing else changes.
- Keep frames the same aspect ratio (the canvas cover-fits). ~1600px wide is
  plenty; smaller is lighter.

### `beats` — text over the film

```jsonc
{ "at": 0.34,                  // scroll position 0 → 1
  "kicker": "02 — The pick",
  "title": "One hand. One <em>motion</em>.",
  "body":  "Longer paragraph under the title (optional).",
  "align": "right",            // left | center | right
  "y":     "top",              // top | center | bottom
  "font":  "serif",            // serif | sans | mono | script
  "size":  "lg",               // md | lg | xl
  "hold":  false,              // true = lingers longer before fading
  "cta":   { "label": "Apply", "href": "#" } }
```

- `\n` in `title` / `body` is a line break. Wrap one word in `<em>…</em>` for the
  script face.
- Mix `align` / `y` / `font` so the page never feels like one slot repeating.

### `clips` — short mp4s that fire at a scroll range

```jsonc
{ "src": "/plum/clips/reveal.mp4", "at": [0.0, 0.12],
  "mode": "once",               // once (play & hold) | loop
  "fit":  "cover",              // cover | contain
  "align": "right" }            // for fit:contain
```

Not downloaded until the scroll nears its range; released when you pass it.
Muted + `playsinline`. Fades over the first/last ~16% of the range.

### `overlays` — the little marks over the film

The sparkles, crosses and corner brackets. **You don't write SVG** — you pick a
mark by name from the built-in library and set where it sits, its size, colour
and (optionally) when it appears:

```jsonc
{ "mark": "sparkle",        // a name from the library (see below)
  "x": "12%", "y": "24%",   // %/px, or left|center|right / top|center|bottom
  "w": "24px",
  "color": "#6f5bff",       // defaults to theme.accent
  "opacity": 0.75,
  "motion": "drift",        // optional: drift | drift-y | bob (slow float)
  "at": [0.0, 0.55] }       // optional scroll range (omit = always on)
```

Library names: `plus`, `cross`, `sparkle`, `ring`, `dot`, `diamond`, `target`,
`corner`, `brackets`, `arrow`, `chevron`, `tick`, `slash`, `cloud` (a halftone
dot cloud — give it a big `w` like `220px` and a `motion` to float it over the
film, pear.no style).

Two escape hatches for non-library marks:

```jsonc
{ "src": "/plum/marks/logo.svg", ... }   // your own uploaded SVG/PNG file
{ "svg": "<svg viewBox='0 0 24 24'>…", ... }  // raw inline SVG (devs only)
```

> In the builder this is a form: choose a mark from a dropdown (or upload one),
> then drag its position and set size / colour / scroll range. No JSON, no SVG.

### `nav` and `footer`

The fixed header and the closing footer are JSON too:

```jsonc
"nav": {
  "brand": "PLUM",
  "links": [ { "label": "The story", "href": "#top" } ],
  "cta":   { "label": "Build a page", "href": "/builder" }
},

"footer": {
  "bg", "ink", "accent",
  "clip": "/plum/clips/footer.mp4",   // a looping mp4 backdrop (pear.no style)
  "wordmark": "PLUM",
  "tagline": "…",
  "cta": { "label", "href" },
  "columns": [ { "title", "links": [ { "label", "href" } ] } ],
  "legal":   [ "© 2026 …", "…" ]
}
```

`footer.clip` plays muted + looped behind the wordmark under a dark scrim. Omit
it for a plain solid footer.

### `ui`

| key | effect |
|--|--|
| `ui.progress` | the `NN%` readout in the corner |
| `ui.grid` | the thin left-edge rule + tick marks + progress fill |
| `ui.transitions` | the halftone dot "curtain" that sweeps over each scene change between chapters (default on; set `false` to disable) |

### Tuning knobs

| key | effect |
|--|--|
| `scroll.pxPerFrame` | scroll distance per frame — higher = slower, longer page |
| `scroll.ease` | catch-up smoothing `0.02`–`0.9` (lower = more glide) |
| `theme.*` | page background, text, accent |
| `loader.window` | full-res frames kept decoded around the playhead |
| `loader.decodeWidth` | px width full-res frames decode at (memory vs sharpness) |
| `loader.keyframeStride` / `keyframeWidth` | the always-loaded thumbnail layer that covers fast flicks |

---

## Making frames

**From video clips** (how the demo was built — one clip per chapter):

```
npm run plum:slice -- grove   media/plum-grove.mp4
npm run plum:slice -- harvest media/plum-harvest.mp4
npm run plum:slice -- journey media/plum-journey.mp4
npm run plum:slice -- table   media/plum-table.mp4
```

Or one continuous clip across every chapter:

```
npm run plum:slice -- all media/whole-film.mp4
```

Needs `ffmpeg` on PATH. Samples each chapter's `frames` count and prints the
real number if it differs from `story.json`.

**Abstract placeholder** (three.js, no assets needed):

```
npm run gen:plum
```
