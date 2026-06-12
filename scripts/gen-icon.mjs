// Gera resources/icon.png (256x256, RGBA) sem dependências externas.
// Desenho: quadrado arredondado roxo com "lente" branca (anel + ponto), estilo app de captura.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 256
const px = new Uint8Array(SIZE * SIZE * 4)

function setPx(x, y, r, g, b, a) {
  const i = (y * SIZE + x) * 4
  px[i] = r
  px[i + 1] = g
  px[i + 2] = b
  px[i + 3] = a
}

const cx = SIZE / 2
const cy = SIZE / 2
const radius = 40 // canto arredondado
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // rounded rect com margem 8
    const m = 8
    const inX = x >= m && x < SIZE - m
    const inY = y >= m && y < SIZE - m
    if (!inX || !inY) continue
    const dx = Math.max(m + radius - x, x - (SIZE - m - radius), 0)
    const dy = Math.max(m + radius - y, y - (SIZE - m - radius), 0)
    if (dx * dx + dy * dy > radius * radius) continue
    // gradiente vertical roxo
    const t = y / SIZE
    const r = Math.round(109 + (139 - 109) * t)
    const g = Math.round(40 + (92 - 40) * t)
    const b = Math.round(217 + (246 - 217) * t)
    setPx(x, y, r, g, b, 255)
    // lente: anel branco
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (d > 52 && d < 72) setPx(x, y, 255, 255, 255, 255)
    if (d <= 24) setPx(x, y, 255, 255, 255, 255)
    // marcas de canto de seleção (4 cantos internos)
    const corners = [
      [56, 56],
      [SIZE - 56, 56],
      [56, SIZE - 56],
      [SIZE - 56, SIZE - 56]
    ]
    for (const [ccx, ccy] of corners) {
      const ax = Math.abs(x - ccx)
      const ay = Math.abs(y - ccy)
      if ((ax < 4 && ay < 20) || (ay < 4 && ax < 20)) setPx(x, y, 255, 255, 255, 230)
    }
  }
}

// monta PNG
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // filtro none
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
])

const here = dirname(fileURLToPath(import.meta.url))
const dest = resolve(join(here, '..', 'resources'))
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'icon.png'), png)
console.log(`icon.png gerado em ${join(dest, 'icon.png')} (${png.length} bytes)`)
