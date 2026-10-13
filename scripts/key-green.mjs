/**
 * Chroma key: turns the flat #00FF00 of a generated image into transparency.
 *
 * Image generators can't output alpha, so layered art (a city, a room with an
 * empty window, foreground plants) is generated on pure green and keyed here.
 * The matte is soft (antialiased edges) and the green that bleeds onto the
 * edges is removed (despill), so the layer sits on any background.
 *
 *   node scripts/key-green.mjs <in.png> <out.png> [--tight]
 *
 * --tight keys harder: for subjects with their own greens (leaves) the default
 * already protects dark / yellowish greens; --tight also eats lighter fringes.
 */
import sharp from 'sharp'

const [input, output, ...flags] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/key-green.mjs <in.png> <out.png> [--tight]')
  process.exit(1)
}
const tight = flags.includes('--tight')

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const px = info.width * info.height
for (let i = 0; i < px; i += 1) {
  const o = i * 4
  const r = data[o]
  const g = data[o + 1]
  const b = data[o + 2]
  // how much greener than the other channels, scaled by brightness:
  // the key green is bright and pure; leaves are darker and mixed
  const spill = g - Math.max(r, b)
  const key = spill * (g / 255)
  const lo = tight ? 40 : 60
  const hi = tight ? 120 : 150
  const a = key <= lo ? 1 : key >= hi ? 0 : 1 - (key - lo) / (hi - lo)
  data[o + 3] = Math.round(a * 255)
  // despill: pull green down to the brighter of red / blue where it leaks
  if (spill > 0 && a < 1) data[o + 1] = Math.max(r, b) + Math.round(spill * 0.15)
}
await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output)
console.log(`${output}: ${info.width}x${info.height}`)
