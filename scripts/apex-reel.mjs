/**
 * APEX — build the hero film from five video clips.
 *
 *   node scripts/apex-reel.mjs                       # design/masters/cars/shot-1..5.mp4 → public/apex/
 *   node scripts/apex-reel.mjs --masters <dir> --out <dir> --crf 25
 *
 * What it does (ffmpeg only; set FFMPEG=/path/to/ffmpeg if it is not on PATH):
 *  1. chains the clips with a 0.5 s crossfade at every join, and appends the
 *     first clip once more so the LAST join crossfades back into the FIRST:
 *     the loop has no jump (the film starts half a second into clip 1, exactly
 *     where the extra copy is when the last crossfade ends);
 *  2. bakes a restrained grade (S-curve, a touch less saturation, cool shadows)
 *     so every shot sits in the same light. The overlay, grain and vignette
 *     live in CSS (Hero.jsx) and are the knobs a buyer is meant to turn;
 *  3. writes the desktop film (1080p, 16:9) and a phone film (720×1280, a
 *     portrait crop of each shot with its own focal point: a phone must not
 *     download pixels it will never show), the posters, and manifest.json with
 *     where every shot starts (the chapter indicator reads it).
 *
 * Output: hero.mp4, hero-m.mp4, poster.jpg, poster-m.jpg, manifest.json.
 * Replace the five clips in design/masters/cars/ with your own footage (any
 * length ≥ 4 s, 16:9) and run it again; edit SHOTS below for names and focus.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const masters = path.resolve(REPO, opt('masters', 'design/masters/cars'))
const out = path.resolve(REPO, opt('out', 'public/apex'))
const CRF = Number(opt('crf', '25'))

/** One entry per clip, in film order. `focus` = where the phone crop is centred (0 left … 1 right). */
const SHOTS = [
  { file: 'shot-1.mp4', label: 'Approach', focus: 0.5 },
  { file: 'shot-2.mp4', label: 'Silhouette', focus: 0.62 },
  { file: 'shot-3.mp4', label: 'Detail', focus: 0.46 },
  { file: 'shot-4.mp4', label: 'Cabin', focus: 0.4 },
  { file: 'shot-5.mp4', label: 'Departure', focus: 0.5 },
]
const FPS = 24
const FADE = 0.5 // seconds of crossfade at each join

const GRADE =
  // S-curve + a little less saturation, then cool the shadows and warm the highlights a hair.
  "curves=all='0/0 0.20/0.16 0.50/0.50 0.80/0.85 1/1',eq=saturation=0.92:contrast=1.03," +
  'colorbalance=rs=-0.02:gs=0:bs=0.05:rh=0.03:gh=0.0:bh=-0.02'

function run(argv, { quiet = true } = {}) {
  const r = spawnSync(FFMPEG, ['-hide_banner', ...(quiet ? ['-loglevel', 'error'] : []), ...argv], { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `ffmpeg exited ${r.status}`)
    process.exit(1)
  }
  return r
}

function probeDuration(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || '')
  if (!m) throw new Error(`cannot read duration of ${file}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

for (const s of SHOTS) {
  if (!fs.existsSync(path.join(masters, s.file))) {
    console.error(`missing ${path.join(masters, s.file)} — put your clips in ${path.relative(REPO, masters)}`)
    process.exit(1)
  }
}
fs.mkdirSync(out, { recursive: true })

// Every clip is cut to the same length so the crossfade offsets are exact.
const clipLen = Math.min(...SHOTS.map((s) => probeDuration(path.join(masters, s.file))))
const L = Math.floor(clipLen * FPS) / FPS
const step = L - FADE // time between the start of one clip and the next
const n = SHOTS.length

/** ffmpeg graph for one tier. `pre(i)` = per-input filters (crop/scale). */
function graph(pre) {
  const parts = []
  const inputs = [...SHOTS, SHOTS[0]] // the extra copy closes the loop
  inputs.forEach((_, i) => {
    parts.push(`[${i}:v]trim=duration=${L},setpts=PTS-STARTPTS,fps=${FPS},${pre(i % n)},format=yuv420p[v${i}]`)
  })
  let prev = 'v0'
  for (let i = 1; i < inputs.length; i += 1) {
    const next = i === inputs.length - 1 ? 'x' : `x${i}`
    parts.push(`[${prev}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${(step * i).toFixed(3)}[${next}]`)
    prev = next
  }
  // Loop window: from half a second into clip 1 to the end of the last crossfade.
  const start = FADE
  const end = step * (inputs.length - 1) + FADE
  parts.push(`[x]trim=start=${start}:end=${end.toFixed(3)},setpts=PTS-STARTPTS,${GRADE}[out]`)
  return parts.join(';')
}

const inputArgs = [...SHOTS, SHOTS[0]].flatMap((s) => ['-i', path.join(masters, s.file)])
const loopLen = step * n // = end - start
const encode = (name, filter, extra) => {
  const file = path.join(out, name)
  run([...inputArgs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-movflags', '+faststart', '-an', '-y', ...extra, file])
  return file
}

// Desktop: 1920×1080.
const desktop = encode(
  'hero.mp4',
  graph(() => 'scale=1920:1080:flags=lanczos'),
  ['-crf', String(CRF), '-maxrate', '3200k', '-bufsize', '6400k'],
)
// Phone: a 9:16 crop per shot around its focal point, 720×1280.
const phone = encode(
  'hero-m.mp4',
  graph((i) => `crop=floor(ih*9/16/2)*2:ih:(iw-floor(ih*9/16/2)*2)*${SHOTS[i].focus}:0,scale=720:1280:flags=lanczos`),
  ['-crf', String(CRF + 2), '-maxrate', '1500k', '-bufsize', '3000k'],
)

// Posters: the first picture of each film, so the page never shows a hole.
run(['-i', desktop, '-frames:v', '1', '-q:v', '3', '-y', path.join(out, 'poster.jpg')])
run(['-i', phone, '-frames:v', '1', '-q:v', '3', '-y', path.join(out, 'poster-m.jpg')])

// Where each shot is on the loop's clock: the middle of the crossfade is the cut.
const manifest = {
  duration: Number(loopLen.toFixed(3)),
  fps: FPS,
  shots: SHOTS.map((s, i) => {
    const t0 = i === 0 ? 0 : step * i + FADE / 2 - FADE
    const t1 = step * (i + 1) + FADE / 2 - FADE
    return { label: s.label, start: Number(Math.max(0, t0).toFixed(3)), end: Number(Math.min(loopLen, t1).toFixed(3)) }
  }),
}
fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1)
console.log(`apex film: ${manifest.duration}s loop · hero.mp4 ${mb(desktop)} MB · hero-m.mp4 ${mb(phone)} MB → ${path.relative(REPO, out)}`)
