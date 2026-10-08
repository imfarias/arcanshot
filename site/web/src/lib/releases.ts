// Releases do GitHub lidas em tempo de build. Sem rede/limite de API, o site sai com um
// fallback e o script do cliente (public/release.js) atualiza a versão na hora.
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
          sizeMb: exe ? Math.round(exe.size / 1048576) : null
        }
      })
  } catch (e) {
    console.warn(`[releases] usando fallback: ${(e as Error).message}`)
    return []
  }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
