const ILLEGAL_CHARS = /[\\/:*?"<>|]/g
const MAX_PATTERN_LENGTH = 120

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

/** Expande os tokens %Y %m %d %H %M %S e sanitiza caracteres ilegais do Windows. */
export function formatFilename(pattern: string, date: Date): string {
  const expanded = pattern
    .replace(/%Y/g, String(date.getFullYear()))
    .replace(/%m/g, pad(date.getMonth() + 1))
    .replace(/%d/g, pad(date.getDate()))
    .replace(/%H/g, pad(date.getHours()))
    .replace(/%M/g, pad(date.getMinutes()))
    .replace(/%S/g, pad(date.getSeconds()))
  return expanded.replace(ILLEGAL_CHARS, '-').trim()
}

/** Retorna mensagem de erro (pt-BR) ou null se o padrão é válido. */
export function validatePattern(pattern: string): string | null {
  if (!pattern || pattern.trim().length === 0) {
    return 'O padrão de nome não pode ser vazio'
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return `O padrão deve ter no máximo ${MAX_PATTERN_LENGTH} caracteres`
  }
  if (ILLEGAL_CHARS.test(pattern)) {
    ILLEGAL_CHARS.lastIndex = 0
    return 'O padrão não pode conter os caracteres \\ / : * ? " < > |'
  }
  const sample = formatFilename(pattern, new Date())
  if (sample.length === 0) {
    return 'O padrão precisa gerar um nome com ao menos um caractere'
  }
  return null
}
