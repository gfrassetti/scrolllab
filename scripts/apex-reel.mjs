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
 *  2. (before 1) restores frames a generator dropped when it conformed the clip
 *     to 24 fps (a jerk every 4th frame, detected per clip) and motion-interpolates every clip to 60 fps (minterpolate, one
 *     process per clip, cached in <masters>/60fps/): generated clips are 24 fps
 *     and on a 60 Hz screen a slow camera move at 24 fps judders (3:2 pulldown);
 *     pass --fps 24 to skip it;
 *  3. bakes a restrained grade (S-curve, a touch less saturation, cool shadows)
 *     so every shot sits in the same light. The overlay, grain and vignette
 *     live in CSS (Hero.jsx) and are the knobs a buyer is meant to turn;
 *  4. writes the desktop film (1080p, 16:9) and a phone film (720×1280, a
 *     portrait crop of each shot with its own focal point: a phone must not
 *     download pixels it will never show), the posters, and manifest.json with
 *     where every shot starts (the chapter indicator reads it).
 *
 * Output: hero.mp4, hero-m.mp4, poster.jpg, poster-m.jpg, manifest.json.
 * Replace the five clips in design/masters/cars/ with your own footage (any
 * length ≥ 4 s, 16:9) and run it again; edit SHOTS below for names and focus.
 */
import { spawn, spawnSync } from 'node:child_process'
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
  { file: 'shot-1.mp4', label: 'Chapter 1', focus: 0.5 },
  { file: 'shot-2.mp4', label: 'Chapter 2', focus: 0.62 },
  { file: 'shot-3.mp4', label: 'Chapter 3', focus: 0.46 },
  { file: 'shot-4.mp4', label: 'Chapter 4', focus: 0.4 },
  { file: 'shot-5.mp4', label: 'Chapter 5', focus: 0.5 },
]
const FPS = Number(opt('fps', '60'))
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

/**
 * Generators often deliver clips conformed from another rate by DROPPING a
 * frame every few (30 → 24 drops one in five): the picture then jerks every
 * fourth frame, and interpolating on a uniform clock smears that jerk into a
 * 6 Hz stutter. The frame-to-frame difference (YDIF) shows it as one gap twice
 * the others at a fixed phase. Returns { period, phase, srcFps } when a clip
 * has it, so the dropped frame's slot can be restored before interpolating.
 */
function detectDroppedFrames(file) {
  const r = spawnSync(
    FFMPEG,
    ['-hide_banner', '-i', file, '-vf', 'scale=640:-1,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=-', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  const fpsMatch = /(\d+(?:\.\d+)?) fps/.exec(r.stderr || '')
  const srcFps = fpsMatch ? Number(fpsMatch[1]) : 24
  const diffs = [...(r.stdout || '').matchAll(/YDIF=([\d.]+)/g)].map((m) => Number(m[1])).slice(2) // skip the opening frames
  if (diffs.length < 24) return null
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)
  let best = null
  for (const period of [3, 4, 5, 6]) {
    for (let phase = 0; phase < period; phase += 1) {
      const hit = diffs.filter((_, k) => (k + 2) % period === phase)
      const rest = diffs.filter((_, k) => (k + 2) % period !== phase)
      const ratio = mean(hit) / Math.max(mean(rest), 1e-6)
      if (!best || ratio > best.ratio) best = { ratio, period, phase, srcFps }
    }
  }
  return best && best.ratio >= 1.35 ? best : null
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

// Smooth first: interpolate each clip to FPS on its own (cleaner motion
// estimation than on the crossfaded film), one ffmpeg per clip in parallel.
// The intermediates are near-lossless and cached; delete the folder to redo.
const smoothDir = path.join(masters, `${FPS}fps`)
fs.mkdirSync(smoothDir, { recursive: true })
const todo = SHOTS.filter((s) => !fs.existsSync(path.join(smoothDir, s.file)))
if (todo.length) {
  console.log(`interpolating ${todo.length} clip(s) to ${FPS} fps (a few minutes)…`)
  await Promise.all(
    todo.map(
      (s) =>
        new Promise((resolve, reject) => {
          const tmp = path.join(smoothDir, `.${s.file}`)
          // Put every frame back at its true time first (a gap of two where one was dropped).
          const drop = detectDroppedFrames(path.join(masters, s.file))
          let retime = ''
          if (drop) {
            const trueFps = (drop.srcFps * (drop.period + 1)) / drop.period
            retime = `setpts='(N+floor((N+${drop.period - drop.phase})/${drop.period}))/(${trueFps}*TB)',`
            console.log(`  ${s.file}: one frame in ${drop.period + 1} was dropped (${drop.srcFps} → restoring ${trueFps} fps timing)`)
          }
          const argv = [
            '-hide_banner', '-loglevel', 'error', '-i', path.join(masters, s.file),
            '-vf', `${retime}minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:vsbmc=1:mb_size=16:search_param=32`,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-an', '-f', 'mp4', '-y', tmp,
          ]
          const child = spawn(FFMPEG, argv, { stdio: ['ignore', 'ignore', 'inherit'] })
          child.on('error', reject)
          child.on('close', (code) => {
            if (code !== 0) return reject(new Error(`interpolating ${s.file} failed (${code})`))
            fs.renameSync(tmp, path.join(smoothDir, s.file))
            resolve()
          })
        }),
    ),
  )
}
const clipPath = (s) => path.join(smoothDir, s.file)

// Every clip is cut to the same length so the crossfade offsets are exact.
const clipLen = Math.min(...SHOTS.map((s) => probeDuration(clipPath(s))))
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

const inputArgs = [...SHOTS, SHOTS[0]].flatMap((s) => ['-i', clipPath(s)])
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
  ['-crf', String(CRF), '-maxrate', '4200k', '-bufsize', '8400k'],
)
// Phone: a 9:16 crop per shot around its focal point, 720×1280.
const phone = encode(
  'hero-m.mp4',
  graph((i) => `crop=floor(ih*9/16/2)*2:ih:(iw-floor(ih*9/16/2)*2)*${SHOTS[i].focus}:0,scale=720:1280:flags=lanczos`),
  ['-crf', String(CRF + 2), '-maxrate', '2000k', '-bufsize', '4000k'],
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
