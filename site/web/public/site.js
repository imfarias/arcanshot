// Interações da página: modal do vídeo e versão sempre atual (API do GitHub).
const dialog = document.querySelector('[data-video-dialog]')
const video = dialog?.querySelector('video')
document.querySelector('[data-open-video]')?.addEventListener('click', () => {
  dialog.showModal()
  video.play().catch(() => {})
})
dialog?.addEventListener('close', () => video.pause())
document.querySelector('[data-close-video]')?.addEventListener('click', () => dialog.close())
dialog?.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close()
})

// Respeita "reduzir movimento": fica só o pôster do vídeo de fundo
const bg = document.querySelector('.hero-bg')
if (bg && window.matchMedia('(prefers-reduced-motion: reduce)').matches) bg.pause()

// O build já traz a versão; aqui só atualiza se saiu uma release depois do deploy
const meta = document.querySelector('[data-release-meta]')
if (meta) {
  fetch('https://api.github.com/repos/imfarias/arcanshot/releases/latest')
    .then((r) => (r.ok ? r.json() : null))
    .then((r) => {
      if (!r?.tag_name) return
      const v = r.tag_name.replace(/^v/, '')
      if (meta.textContent.includes(`Versão ${v} `)) return
      const exe = r.assets?.find((a) => a.name === 'ArcanShot-Setup.exe')
      const date = new Date(r.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      meta.textContent = `Versão ${v} · ${date}${exe ? ` · ${Math.round(exe.size / 1048576)} MB` : ''} · Windows 10 e 11 · Gratuito e de código aberto`
    })
    .catch(() => {})
}
