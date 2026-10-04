// Renders assets/icon.svg into the PWA / iOS icon set in public/.
// Usage: node scripts/build-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const svg = await readFile(path.join(ROOT, 'assets/icon.svg'), 'utf8')
const out = (f) => path.join(ROOT, 'public', f)

// Scale the artwork (everything after the background rect) around the centre,
// keeping the background full-bleed.
function withScale(scale) {
  const bgEnd = svg.indexOf('/>', svg.indexOf('<rect width="1024"')) + 2
  return Buffer.from(
    svg.slice(0, bgEnd) +
      `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">` +
      svg.slice(bgEnd).replace('</svg>', '</g></svg>'),
  )
}

const render = (scale, size) => sharp(withScale(scale), { density: 300 }).resize(size, size)

await Promise.all([
  // iOS rounds the corners itself and needs an opaque, full-bleed image.
  render(1.12, 180).flatten({ background: '#07070b' }).png().toFile(out('apple-touch-icon.png')),
  render(1.12, 192).png().toFile(out('icon-192.png')),
  render(1.12, 512).png().toFile(out('icon-512.png')),
  // Maskable: keep the artwork inside the 80% safe zone.
  render(0.85, 512).png().toFile(out('icon-maskable-512.png')),
  writeFile(out('favicon.svg'), withScale(1.12)),
])
console.log('icons written to public/')
