// Generates PWA icons from an inline SVG (blue rounded square + calendar-check).
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')

// Lucide "calendar-check" paths on a 24x24 grid.
const glyph = `
  <path d="M8 2v4"/><path d="M16 2v4"/>
  <rect width="18" height="18" x="3" y="4" rx="2"/>
  <path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>`

// size = canvas px, glyphFrac = fraction of canvas the 24u glyph spans, rx = corner radius
function svg(size, { glyphFrac, rx }) {
  const g = size * glyphFrac
  const off = (size - g) / 2
  const scale = g / 24
  const sw = 2 // stroke width in glyph units
  const corner = rx == null ? 0 : rx
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${corner}" fill="#2563eb"/>
  <g transform="translate(${off},${off}) scale(${scale})" fill="none" stroke="#ffffff"
     stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>`
}

async function render(name, size, opts) {
  const buf = Buffer.from(svg(size, opts))
  await sharp(buf).png().toFile(join(outDir, name))
  console.log('wrote', name)
}

await mkdir(outDir, { recursive: true })

// Rounded icons for "any" purpose
await render('pwa-192x192.png', 192, { glyphFrac: 0.5, rx: 42 })
await render('pwa-512x512.png', 512, { glyphFrac: 0.5, rx: 112 })
// Full-bleed square for maskable (platform applies its own mask); smaller safe-zone glyph
await render('maskable-512x512.png', 512, { glyphFrac: 0.42, rx: 0 })
// iOS home screen (iOS rounds it automatically)
await render('apple-touch-icon.png', 180, { glyphFrac: 0.52, rx: 0 })
// Favicon-ish
await render('favicon-64.png', 64, { glyphFrac: 0.56, rx: 14 })

console.log('done')
