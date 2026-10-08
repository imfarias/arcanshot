// Recalcula sha512/size do instalador no latest.yml do electron-updater.
// Necessário quando o .exe é assinado DEPOIS do electron-builder (SignPath): a assinatura muda o
// arquivo e o app recusaria a atualização por hash divergente.
// Uso: node scripts/update-latest-yml.mjs <instalador.exe> <latest.yml>
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'

export function patchLatestYml(yml, sha512, size) {
  return yml.replace(/^(\s*)sha512: .*$/gm, `$1sha512: ${sha512}`).replace(/^(\s*)size: \d+$/gm, `$1size: ${size}`)
}

const [exe, yml] = process.argv.slice(2)
if (exe && yml) {
  const sha512 = createHash('sha512').update(readFileSync(exe)).digest('base64')
  writeFileSync(yml, patchLatestYml(readFileSync(yml, 'utf8'), sha512, statSync(exe).size))
  console.log(`latest.yml atualizado para ${exe}`)
}
