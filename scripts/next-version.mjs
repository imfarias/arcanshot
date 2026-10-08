// Calcula a próxima versão SemVer a partir da última tag `vX.Y.Z` e das mensagens de
// commit desde ela (Conventional Commits). Usado pelo workflow de release.
//   BREAKING CHANGE / `tipo!:` → major · `feat:` → minor · qualquer outro → patch
// Se o package.json tiver versão maior que a calculada (bump manual), ela vence.
// Sem tags ainda: usa a versão do package.json como primeiro release.
import { execSync } from 'node:child_process'
import { readFileSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  if (!m) throw new Error(`versão inválida: ${v}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function compare(a, b) {
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

export function bumpType(messages) {
  let type = 'patch'
  for (const msg of messages) {
    const subject = msg.split('\n')[0]
    if (/^\w+(\([^)]*\))?!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(msg)) return 'major'
    if (/^feat(\([^)]*\))?:/.test(subject)) type = 'minor'
  }
  return type
}

export function bump(version, type) {
  const [major, minor, patch] = parse(version)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

export function nextVersion({ lastTag, messages, pkgVersion }) {
  if (!lastTag) return pkgVersion
  const computed = bump(lastTag, bumpType(messages))
  return compare(pkgVersion, computed) > 0 ? pkgVersion : computed
}

function main() {
  const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
  let lastTag = ''
  try {
    lastTag = sh('git describe --tags --abbrev=0 --match "v[0-9]*"')
  } catch {
    // sem tags: primeiro release
  }
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'
  const messages = sh(`git log ${range} --format=%B%x00`)
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean)
  const version = nextVersion({ lastTag, messages, pkgVersion })
  console.log(version)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
