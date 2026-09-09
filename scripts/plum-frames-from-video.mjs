/**
 * PLUM — slice video into chapter frame folders.
 *
 *   node scripts/plum-frames-from-video.mjs all <video-file>
 *     One continuous clip → every chapter. Each chapter gets its own
 *     contiguous time-slice of the video, proportional to its frame count,
 *     so the whole sequence plays as one unbroken move.
 *
 *   node scripts/plum-frames-from-video.mjs <chapter-id> <video-file> [--count N]
 *     One clip → one chapter (sampled evenly across the whole clip).
 *
 * Reads public/plum/story.json for chapter frame counts. Requires ffmpeg +
 * ffprobe on PATH. Prints the real counts so you can sync story.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const STORY = path.join(REPO, 'public', 'plum', 'story.json')

const [target, videoArg, ...rest] = process.argv.slice(2)
if (!target || !videoArg) {
  console.error(
    'usage:\n  plum-frames-from-video.mjs all <video>\n  plum-frames-from-video.mjs <chapter-id> <video> [--count N]',
  )
  process.exit(1)
}

const story = JSON.parse(fs.readFileSync(STORY, 'utf8'))
const { basePath, pad, ext } = story.frames
const seqRoot = path.join(REPO, 'public', basePath.replace(/^\//, ''))

const video = path.resolve(REPO, videoArg)
if (!fs.existsSync(video)) {
  console.error(`no such video: ${video}`)
  process.exit(1)
}

const dur = Number(
  execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    video,
  ])
    .toString()
    .trim(),
)
if (!Number.isFinite(dur) || dur <= 0) {
  console.error('could not read video duration')
  process.exit(1)
}

/** Extract `n` frames spanning [from, to] seconds of the video into dir. */
function slice(dir, n, from, to) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const segDur = Math.max(to - from, 0.04)
  const fps = n / segDur
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error',
      '-ss', from.toFixed(3),
      '-to', to.toFixed(3),
      '-i', video,
      '-vf', `fps=${fps.toFixed(4)},scale=1600:-2:flags=lanczos`,
      '-frames:v', String(n),
      '-c:v', 'libwebp', '-quality', '76', '-compression_level', '6',
      '-start_number', '1',
      path.join(dir, `%0${pad}d.${ext}`),
    ],
    { stdio: 'inherit' },
  )
  const written = fs.readdirSync(dir).filter((f) => f.endsWith(`.${ext}`)).length
  const mb =
    fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0) /
    1024 /
    1024
  return { written, mb }
}

if (target === 'all') {
  const chapters = story.chapters
  const total = chapters.reduce((n, c) => n + c.frames, 0)
  process.stdout.write(
    `Slicing ${path.basename(video)} (${dur.toFixed(1)}s) → ${total} frames across ${chapters.length} chapters\n`,
  )
  let acc = 0
  const notes = []
  for (const ch of chapters) {
    const from = (acc / total) * dur
    const to = ((acc + ch.frames) / total) * dur
    const { written, mb } = slice(path.join(seqRoot, ch.id), ch.frames, from, to)
    process.stdout.write(
      `  ${ch.id}: ${written}/${ch.frames} frames  [${from.toFixed(1)}–${to.toFixed(1)}s]  ${mb.toFixed(1)} MB\n`,
    )
    if (written !== ch.frames) notes.push(`"${ch.id}": ${written}`)
    acc += ch.frames
  }
  if (notes.length) {
    process.stdout.write(`\n⚠ update story.json frame counts: ${notes.join(', ')}\n`)
  }
} else {
  const chapter = story.chapters.find((c) => c.id === target)
  const cf = rest.indexOf('--count')
  const count = cf >= 0 ? Number(rest[cf + 1]) : chapter?.frames
  if (!count) {
    console.error(`chapter "${target}" not in story.json — add it or pass --count N`)
    process.exit(1)
  }
  const { written, mb } = slice(path.join(seqRoot, target), count, 0, dur)
  process.stdout.write(
    `${target}: ${written}/${count} frames → ${basePath}/${target}/ (${mb.toFixed(1)} MB)\n`,
  )
  if (chapter && written !== chapter.frames) {
    process.stdout.write(`⚠ story.json says ${chapter.frames} — set "frames": ${written}\n`)
  }
}
