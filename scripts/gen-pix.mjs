// Gera o QR Code Pix estático (BR Code, padrão EMV MPM do Banco Central) para doações, sem valor fixo.
// Saídas: site/web/src/data/pix.json (chave + "copia e cola"), site/web/public/pix-qr.svg e pix-qr.png.
// Uso: node scripts/gen-pix.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import QRCode from 'qrcode'

export const PIX = {
  key: '9f412e4b-b639-431e-a97a-847dee4789aa', // chave aleatória (EVP): não expõe dados pessoais
  name: 'VINICIUS FARIAS', // até 25 caracteres, sem acento
  city: 'BRASIL' // até 15 caracteres; o app do banco mostra o titular consultando a chave
}

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63 do BR Code. */
export function crc16(str) {
  let crc = 0xffff
  for (const byte of Buffer.from(str, 'utf8')) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Payload "copia e cola" do Pix estático, sem valor (quem doa escolhe quanto). */
export function pixPayload({ key, name, city, txid = '***' }) {
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') +
    field('58', 'BR') +
    field('59', name.slice(0, 25)) +
    field('60', city.slice(0, 15)) +
    field('62', field('05', txid)) +
    '6304'
  return body + crc16(body)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const root = resolve(import.meta.dirname, '..')
  const payload = pixPayload(PIX)
  const json = join(root, 'site/web/src/data/pix.json')
  mkdirSync(dirname(json), { recursive: true })
  writeFileSync(json, JSON.stringify({ key: PIX.key, payload }, null, 2) + '\n')
  const svg = await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#0f0a24', light: '#ffffff' }
  })
  writeFileSync(join(root, 'site/web/public/pix-qr.svg'), svg)
  // PNG p/ compartilhar (redes, README de terceiros, impressão)
  await QRCode.toFile(join(root, 'site/web/public/pix-qr.png'), payload, { errorCorrectionLevel: 'M', margin: 2, width: 768 })
  console.log(payload)
}
