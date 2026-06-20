// Generates the PWA home-screen icons (no external image deps).
// A white baby footprint on a teal vertical gradient, full-bleed (maskable),
// rendered at high resolution and box-downsampled for clean anti-aliasing.
// Run: node scripts/gen-icons.cjs
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const cd = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cd), 0)
  return Buffer.concat([len, cd, crc])
}
function encodePng(size, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type RGB
  const stride = size * 3
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// --- artwork, in normalised [0,1] coordinates ---
const TOP = [45, 212, 191] // teal-400
const BOT = [13, 118, 110] // teal-700
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
const TOES = [
  [0.355, 0.435, 0.05],
  [0.45, 0.395, 0.046],
  [0.545, 0.38, 0.042],
  [0.635, 0.405, 0.036],
  [0.71, 0.45, 0.03],
]
function shade(x, y) {
  const onFoot =
    ellipse(x, y, 0.5, 0.63, 0.135, 0.185) || TOES.some(([cx, cy, r]) => ellipse(x, y, cx, cy, r, r))
  if (onFoot) return [255, 255, 255]
  return [0, 1, 2].map((i) => Math.round(TOP[i] + (BOT[i] - TOP[i]) * y))
}

// Render once at high res, then box-downsample to each target size.
const HI = 1536
const hi = Buffer.alloc(HI * HI * 3)
for (let py = 0; py < HI; py++) {
  for (let px = 0; px < HI; px++) {
    const [r, g, b] = shade((px + 0.5) / HI, (py + 0.5) / HI)
    const o = (py * HI + px) * 3
    hi[o] = r
    hi[o + 1] = g
    hi[o + 2] = b
  }
}
function downsample(size) {
  const f = HI / size
  const out = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * HI + (x * f + dx)) * 3
          r += hi[o]; g += hi[o + 1]; b += hi[o + 2]
        }
      }
      const n = f * f
      const o = (y * size + x) * 3
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n)
    }
  }
  return out
}

const dir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(dir, { recursive: true })
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), encodePng(size, downsample(size)))
}
console.log('Wrote icon-192.png and icon-512.png')
