// Releases do GitHub lidas em tempo de build. Sem rede/limite de API, o site sai com um
// fallback e o script do cliente (public/site.js) atualiza a versão e o link de download na hora.
export const REPO = 'imfarias/arcanshot'
export const DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/ArcanShot-Setup.exe`
export const RELEASES_URL = `https://github.com/${REPO}/releases`

export interface Release {
  tag: string
  name: string
  date: string
  url: string
  notes: string[]
  sizeMb: number | null
  /** A release tem o ArcanShot-Setup.exe de nome fixo (o que o link /latest/download usa). */
  hasStableExe: boolean
}

/**
 * Para onde o botão "Baixar" aponta. O link fixo /latest/download/ArcanShot-Setup.exe dá 404 se a
 * última release saiu sem esse arquivo (build pela metade, upload manual); aí vai para a página da
 * release, onde a pessoa vê o que existe. Sem dados do GitHub no build, mantém o link fixo (o
 * site.js confere de novo no navegador).
 */
export function resolveDownload(releases: Pick<Release, 'url' | 'hasStableExe'>[]): string {
  const latest = releases[0]
  if (!latest || latest.hasStableExe) return DOWNLOAD_URL
  return latest.url
}

interface GhRelease {
  tag_name: string
  name: string | null
  published_at: string
  html_url: string
  body: string | null
  draft: boolean
  prerelease: boolean
  assets: { name: string; size: number }[]
}

/** Linhas de changelog legíveis a partir do corpo gerado pelo GitHub. */
function notesFrom(body: string | null): string[] {
  return (body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => (l.startsWith('* ') || l.startsWith('- ')) && !l.includes('made their first contribution'))
    .map((l) =>
      l
        .slice(2)
        .replace(/ by @\S+ in https:\/\/\S+$/, '')
        .replace(/\*\*/g, '')
    )
    .slice(0, 6)
}

export async function getReleases(limit = 5): Promise<Release[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=${limit}`, { headers })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const list = (await res.json()) as GhRelease[]
    return list
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => {
        const exe = r.assets.find((a) => a.name === 'ArcanShot-Setup.exe') ?? r.assets.find((a) => a.name.endsWith('.exe'))
        return {
          tag: r.tag_name,
          name: r.name || r.tag_name,
          date: r.published_at,
          url: r.html_url,
          notes: notesFrom(r.body),
          sizeMb: exe ? Math.round(exe.size / 1048576) : null,
          hasStableExe: r.assets.some((a) => a.name === 'ArcanShot-Setup.exe')
        }
      })
  } catch (e) {
    console.warn(`[releases] usando fallback: ${(e as Error).message}`)
    return []
  }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
