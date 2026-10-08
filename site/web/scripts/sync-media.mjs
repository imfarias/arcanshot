// Copia para public/ o que vem de fora do projeto Astro:
//  - vídeos renderizados de site/promo/dist  → public/media/
//  - player interativo (Web Audio) site/promo → public/apresentacao/
//  - ícone do app (resources/icon.png)        → public/favicon.png
// Funciona tanto no repositório quanto no build Docker (que recebe as pastas lado a lado).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const web = resolve(import.meta.dirname, '..')
const promo = resolve(web, '../promo')
const icon = [resolve(web, '../../resources/icon.png'), resolve(web, '../icon.png')].find(existsSync)
const pub = join(web, 'public')

for (const dir of ['media', 'apresentacao']) rmSync(join(pub, dir), { recursive: true, force: true })
mkdirSync(join(pub, 'media'), { recursive: true })

const media = readdirSync(join(promo, 'dist')).filter((f) => /\.(mp4|webm|webp)$/.test(f))
if (!media.length) throw new Error('site/promo/dist sem vídeos — rode `npm run promo:render` na raiz')
for (const f of media) cpSync(join(promo, 'dist', f), join(pub, 'media', f))

const player = join(pub, 'apresentacao')
for (const f of ['index.html', 'player.js', 'promo.js', 'audio.js']) cpSync(join(promo, f), join(player, f))
cpSync(join(promo, 'narration'), join(player, 'narration'), {
  recursive: true,
  filter: (src) => !src.endsWith('.md')
})

if (icon) cpSync(icon, join(pub, 'favicon.png'))
console.log(`sync: ${media.length} mídias, player interativo${icon ? ', ícone' : ''}`)
