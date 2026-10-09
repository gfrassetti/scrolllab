/**
 * FOLD — build the film reel from video clips.
 *
 *   node scripts/fold-reel.mjs                       # full reel → public/fold/film (768 + 1440, 3× frames)
 *   node scripts/fold-reel.mjs --demo                # light reel → public/fold/demo (768, original frames)
 *   node scripts/fold-reel.mjs loop <clip.mp4>       # seamless footer loop → public/fold/footer-loop.{mp4,jpg}
 *
 * Options: --masters <dir> (default design/masters/fold) · --out <dir> ·
 * --tiers 768,1440 · --interp 3 · --quality 62 · --config <takes.json>
 *
 * Each take (chapter of the film) is ONE continuous camera move made of
 * clips where each clip starts on the last frame of the one before. The
 * script:
 *  1. normalises every clip to 24 fps and cuts its still head and tail
 *     (video models hold the end image for a second or two — that hold is
 *     exactly the "it stops" a reader sees while scrolling);
 *  2. chains the clips with a 6-frame crossfade at each join;
 *  3. drops repeated frames (some clips move at 12 fps inside 24);
 *  4. motion-interpolates the clean take to `interp`× the frames (real
 *     in-between pictures, so the scroll feels fluid);
 *  5. writes f_0001.webp… per tier and a manifest.json with where each take
 *     starts and its pace: the visible motion of every frame, so the engine
 *     spends the same scroll on the same amount of change.
 *
 * Needs only ffmpeg (on PATH, or FFMPEG=/path/to/ffmpeg).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'

// The film: which clips (in masters) make each take, in order.
const DEFAULT_TAKES = [
  { id: 'build', clips: ['clip01.mp4', 'clipB.mp4', 'clipC.mp4'] },
  { id: 'town', clips: ['clipD.mp4', 'clipE.mp4', 'clipF.mp4', 'clipG.mp4', 'clipH.mp4'] },
  { id: 'dawn', clips: ['clipI.mp4'] },
]

const FPS = 24
const XF = 6 // frames of crossfade at each join
const DUP = 0.5 // mean abs grey diff (0–255) below which two frames are the same picture
const STILL = 0.7 // …below which a frame "doesn't move"
const QUALITY = { 768: 60, 1080: 62, 1440: 62 }
const PROBE_W = 160
const PROBE_H = 90

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}
const demo = argv.includes('--demo')
const masters = path.resolve(REPO, opt('masters', 'design/masters/fold'))

const run = (args, opts = {}) => execFileSync(FFMPEG, ['-v', 'error', ...args], { maxBuffer: 1 << 30, ...opts })
const ls = (dir) => fs.readdirSync(dir).sort().map((f) => path.join(dir, f))

// Grey 160×90 frames of a video or an image sequence, as one buffer per frame.
function greys(input, inputArgs = []) {
  const buf = run([...inputArgs, '-i', input, '-vf', `scale=${PROBE_W}:${PROBE_H},format=gray`, '-f', 'rawvideo', '-'])
  const size = PROBE_W * PROBE_H
  const out = []
  for (let o = 0; o + size <= buf.length; o += size) out.push(buf.subarray(o, o + size))
  return out
}
const diff = (a, b) => {
  let x = 0
  for (let j = 0; j < a.length; j++) x += Math.abs(a[j] - b[j])
  return x / a.length
}

// ---- footer loop ------------------------------------------------------------
if (argv[0] === 'loop') {
  const src = path.resolve(REPO, argv[1] || path.join(masters, 'loop.mp4'))
  const out = path.resolve(REPO, opt('out', 'public/fold'))
  const g = greys(src, []).map((b, i, all) => (i ? diff(b, all[i - 1]) : 0))
  let end = g.length - 1
  while (end > 48 && g[end] < DUP) end -= 1
  // Keep the moving part, and blend its last second into its first: the loop
  // point is then a frame like any other.
  const main = end - 24 + 1
  const graph =
    `[0]fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,split[a][b];` +
    `[a]trim=start_frame=24:end_frame=${end + 1},setpts=PTS-STARTPTS[main];` +
    `[b]trim=start_frame=0:end_frame=48,setpts=PTS-STARTPTS[head];` +
    `[main][head]xfade=transition=fade:duration=1:offset=${((main - 24) / FPS).toFixed(4)},trim=end_frame=${main},setpts=PTS-STARTPTS[out]`
  fs.mkdirSync(out, { recursive: true })
  run(['-i', src, '-filter_complex', graph, '-map', '[out]', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-y', path.join(out, 'footer-loop.mp4')])
  run(['-i', path.join(out, 'footer-loop.mp4'), '-frames:v', '1', '-q:v', '3', '-y', path.join(out, 'footer-loop.jpg')])
  console.log(`footer loop: ${main} frames → ${path.relative(REPO, out)}/footer-loop.{mp4,jpg}`)
  process.exit(0)
}

// ---- reel -------------------------------------------------------------------
const out = path.resolve(REPO, opt('out', demo ? 'public/fold/demo' : 'public/fold/film'))
const tiers = opt('tiers', demo ? '768' : '768,1440').split(',').map(Number).sort((a, b) => a - b)
const interp = Number(opt('interp', demo ? 1 : 3))
const quality = opt('quality', demo ? '52' : null)
const takes = opt('config') ? JSON.parse(fs.readFileSync(path.resolve(REPO, opt('config')), 'utf8')) : DEFAULT_TAKES
const top = tiers[tiers.length - 1]
const tmp = path.join(REPO, 'storage', 'fold-reel-tmp')
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })

const manifest = { fps: FPS * interp, interp, tiers: {}, scenes: [] }
let start = 0
for (const take of takes) {
  // 1. Still head/tail of each clip (rolling mean over 4 frames: some clips
  //    freeze in a stutter that a single-frame test misses).
  const parts = take.clips.map((c) => {
    const src = path.join(masters, c)
    const g = greys(src).map((b, i, all) => (i ? diff(b, all[i - 1]) : 0))
    const d = g.map((_, i) => {
      const w = g.slice(Math.max(1, i - 1), Math.min(g.length, i + 3))
      return w.length ? w.reduce((x, y) => x + y, 0) / w.length : 0
    })
    let a = 1
    while (a < d.length - 1 && d[a] < STILL) a += 1
    let b = d.length - 1
    while (b > a && d[b] < STILL) b -= 1
    console.log(`${take.id} ${c}: ${d.length} frames, keep ${Math.max(0, a - 1)}–${b}`)
    return { src, from: Math.max(0, a - 1), to: b }
  })

  // 2. Chain with crossfades → near-lossless JPEG frames at the top tier.
  const H = Math.round((top * 9) / 16 / 2) * 2
  const norm = parts.map((p, i) => `[${i}:v]fps=${FPS},trim=start_frame=${p.from}:end_frame=${p.to + 1},setpts=PTS-STARTPTS,scale=${top}:${H}:flags=lanczos,setsar=1,format=yuv420p,settb=AVTB[v${i}]`)
  let chain = ''
  let prev = 'v0'
  let len = parts[0].to - parts[0].from + 1
  for (let i = 1; i < parts.length; i++) {
    const o = i === parts.length - 1 ? 'take' : `x${i}`
    chain += `;[${prev}][v${i}]xfade=transition=fade:duration=${(XF / FPS).toFixed(4)}:offset=${((len - XF) / FPS).toFixed(4)}[${o}]`
    len += parts[i].to - parts[i].from + 1 - XF
    prev = o
  }
  const raw = path.join(tmp, take.id, 'raw')
  fs.mkdirSync(raw, { recursive: true })
  run([...parts.flatMap((p) => ['-i', p.src]), '-filter_complex', norm.join(';') + (parts.length > 1 ? chain : ';[v0]null[take]'), '-map', '[take]', '-r', String(FPS), '-q:v', '2', path.join(raw, '%05d.jpg')])

  // 3. Drop repeats.
  const rf = ls(raw)
  const g = greys(path.join(raw, '%05d.jpg'), ['-framerate', String(FPS)])
  const keep = [0]
  for (let i = 1; i < g.length; i++) {
    if (diff(g[i], g[keep[keep.length - 1]]) < DUP && i < g.length - 1) continue
    keep.push(i)
  }
  const clean = path.join(tmp, take.id, 'clean')
  fs.mkdirSync(clean, { recursive: true })
  keep.forEach((i, k) => fs.copyFileSync(rf[i], path.join(clean, `${String(k + 1).padStart(5, '0')}.jpg`)))

  // 4 + 5. Interpolate and cut every tier in one pass.
  const dirs = tiers.map((w) => path.join(tmp, take.id, String(w)))
  dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }))
  const head = interp > 1 ? `[0]minterpolate=fps=${FPS * interp}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,` : '[0]'
  const graph = `${head}split=${tiers.length}${tiers.map((_, i) => `[s${i}]`).join('')};` + tiers.map((w, i) => `[s${i}]scale=${w}:-2:flags=lanczos[t${i}]`).join(';')
  run([
    '-framerate', String(FPS), '-i', path.join(clean, '%05d.jpg'),
    '-filter_complex', graph,
    ...tiers.flatMap((w, i) => ['-map', `[t${i}]`, '-c:v', 'libwebp', '-quality', String(quality ?? QUALITY[w] ?? 62), '-compression_level', '4', path.join(dirs[i], '%05d.webp')]),
  ])
  const count = fs.readdirSync(dirs[0]).length

  // Pace from the final frames: visible motion with a floor, so quiet
  // stretches still advance (reading time) and fast swings get room.
  const pg = greys(path.join(dirs[0], '%05d.webp'), ['-framerate', String(FPS)]).slice(0, count)
  const d = pg.map((b, i) => (i ? diff(b, pg[i - 1]) : 0))
  const med = d.slice(1).sort((x, y) => x - y)[d.length >> 1] || 1
  let acc = 0
  const cum = d.map((v, i) => (acc += i ? 0.45 + Math.min(4, v / med) : 0))
  manifest.scenes.push({ id: take.id, start, count, pace: cum.map((v) => +(v / acc).toFixed(4)) })
  console.log(`${take.id} → ${g.length} frames, ${keep.length} after repeats, ${count} in the reel`)
  start += count
}

for (const w of tiers) {
  const dst = path.join(out, String(w))
  fs.rmSync(dst, { recursive: true, force: true })
  fs.mkdirSync(dst, { recursive: true })
  let k = 0
  for (const take of takes) {
    for (const f of ls(path.join(tmp, take.id, String(w)))) {
      k += 1
      fs.copyFileSync(f, path.join(dst, `f_${String(k).padStart(4, '0')}.webp`))
    }
  }
  manifest.tiers[w] = { count: k }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest) + '\n')
if (!demo) {
  // For the CDN (wrangler.fold.jsonc): the site fetches the manifest from
  // another origin; a frame never changes under the same name.
  const forever = 'Cache-Control: public, max-age=31536000, immutable'
  fs.writeFileSync(
    path.join(out, '_headers'),
    ['/*', '  Access-Control-Allow-Origin: *', '', '/manifest.json', '  Cache-Control: public, max-age=300', '', ...tiers.flatMap((w) => [`/${w}/*`, `  ${forever}`, ''])].join('\n'),
  )
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`reel → ${path.relative(REPO, out)}: ${JSON.stringify(manifest.tiers)} (interp ${interp})`)
