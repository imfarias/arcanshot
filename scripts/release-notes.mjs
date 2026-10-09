// Notas de release legíveis para quem usa o app, a partir dos commits (títulos de PR, squash)
// desde a última tag. Substitui o --generate-notes do GitHub ("feat: … by @x in …/pull/2").
//   feat → Novidades · fix/perf → Correções · resto (ci, docs, chore…) fica de fora
//   escopos site/ci/docs e commits marcados [skip release] não são mudanças do app
// Uso: node scripts/release-notes.mjs <versão> > release-notes.md
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO_URL = 'https://github.com/imfarias/arcanshot'
const NOT_APP_SCOPES = new Set(['site', 'ci', 'docs'])

/** Converte "feat(editor)!: nova lupa (#12)" em { type, scope, text }. */
export function parseCommit(message) {
  const [subject, ...rest] = message.split('\n')
  const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(subject.trim())
  if (!m) return null
  const text = m[4].replace(/\s*\(#\d+\)\s*$/, '').trim()
  return {
    type: m[1].toLowerCase(),
    scope: (m[2] ?? '').toLowerCase(),
    text: text.charAt(0).toUpperCase() + text.slice(1),
    skip: rest.join('\n').includes('[skip release]') || subject.includes('[skip release]')
  }
}

export function buildNotes(messages, { previousTag, version } = {}) {
  const sections = { Novidades: [], Correções: [] }
  for (const msg of messages) {
    const c = parseCommit(msg)
    if (!c || c.skip || NOT_APP_SCOPES.has(c.scope)) continue
    if (c.type === 'feat') sections.Novidades.push(c.text)
    else if (c.type === 'fix' || c.type === 'perf') sections['Correções'].push(c.text)
  }
  const parts = []
  for (const [title, items] of Object.entries(sections)) {
    if (items.length) parts.push(`## ${title}\n\n${[...new Set(items)].map((i) => `- ${i}`).join('\n')}`)
  }
  if (!parts.length) parts.push('Ajustes internos, sem mudanças visíveis no aplicativo.')
  if (previousTag && version) parts.push(`[Todas as mudanças técnicas](${REPO_URL}/compare/${previousTag}...v${version})`)
  return parts.join('\n\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const version = process.argv[2]
  let previousTag = ''
  try {
    previousTag = sh('git describe --tags --abbrev=0 --match "v[0-9]*"')
  } catch {
    // primeira release
  }
  const messages = sh(`git log ${previousTag ? `${previousTag}..HEAD` : 'HEAD'} --format=%B%x00`)
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean)
  process.stdout.write(buildNotes(messages, { previousTag, version }))
}
