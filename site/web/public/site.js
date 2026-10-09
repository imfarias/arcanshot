// Interações do site. Tudo funciona sem este arquivo; ele só acrescenta:
// a seleção "arrastada" no topo, as medidas reais nas molduras, o antes/depois,
// o modal do vídeo, a versão sempre atual e o copiar do Pix.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

// ── medidas reais nas molduras de seleção ─────────────────────────
const sizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const label = entry.target.querySelector(':scope > .sel-size')
    if (!label) continue
    const { width, height } = entry.target.getBoundingClientRect()
    label.textContent = `${Math.round(width)} × ${Math.round(height)}`
  }
})
document.querySelectorAll('[data-measure]').forEach((el) => sizeObserver.observe(el))

// ── hero: a tela sob o véu e a área selecionada iluminada ─────────
const hero = document.querySelector('[data-hero]')
const heroSel = document.querySelector('[data-hero-sel]')
if (hero && heroSel) {
  // coordenadas de /shots/screen.webp (SCREEN e SCREEN_FOCUS em site/promo/promo.js)
  const IMG = { w: 2880, h: 1800 }
  // área de conteúdo do app (título, KPIs, gráfico, dados do cliente) que a seleção enquadra, 16:10
  const FOCUS_WIDE = { x: 1340, y: 476, w: 1200, h: 750 }
  // no celular, um recorte menor (título, 2 indicadores e o gráfico inteiro, 64:57) para o texto ficar legível;
  // as bordas caem entre os cards, então nada é cortado no meio
  const FOCUS_NARROW = { x: 1350, y: 480, w: 640, h: 570 }
  let progress = 1

  const layout = () => {
    const h = hero.getBoundingClientRect()
    const s = heroSel.getBoundingClientRect()
    // Layout empilhado (≤960px, o mesmo corte do CSS): a tela fictícia vira um "monitor" escurecido em
    // volta da seleção, sem a obrigação de cobrir o hero inteiro; no celular (≤640px), recorte menor.
    const narrow = h.width <= 960
    const FOCUS = h.width <= 640 ? FOCUS_NARROW : FOCUS_WIDE
    const cover = Math.max(h.width / IMG.w, h.height / IMG.h)
    const fit = Math.min(s.width / FOCUS.w, s.height / FOCUS.h)
    const scale = narrow ? fit : Math.max(cover, fit)
    const selX = s.left - h.left
    const selY = s.top - h.top
    const cx = selX + s.width / 2 - (FOCUS.x + FOCUS.w / 2) * scale
    const cy = selY + s.height / 2 - (FOCUS.y + FOCUS.h / 2) * scale
    const x = narrow ? cx : Math.min(0, Math.max(h.width - IMG.w * scale, cx))
    const y = narrow ? cy : Math.min(0, Math.max(h.height - IMG.h * scale, cy))
    hero.style.setProperty('--img-x', `${x}px`)
    hero.style.setProperty('--img-y', `${y}px`)
    hero.style.setProperty('--img-s', String(scale))
    const w = s.width * progress
    const hh = s.height * progress
    hero.style.setProperty(
      '--clip',
      `${selY}px ${h.width - selX - w}px ${h.height - selY - hh}px ${selX}px`
    )
    heroSel.style.setProperty('--p', String(progress))
  }

  new ResizeObserver(layout).observe(hero)
  hero.classList.add('is-mapped')

  // Entrada: a seleção é arrastada do canto, como no app (só se o topo estiver visível)
  const inView = hero.getBoundingClientRect().bottom > 0 && window.scrollY < 40
  if (!reduceMotion && inView) {
    hero.classList.add('is-pre')
    progress = 0
    layout()
    const start = performance.now() + 250
    const DURATION = 1100
    const tick = (now) => {
      const t = Math.max(0, (now - start) / DURATION)
      progress = easeOutExpo(Math.min(1, t))
      layout()
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(() => {
      hero.classList.remove('is-pre')
      requestAnimationFrame(tick)
    })
  } else {
    layout()
  }
}

// ── antes e depois ───────────────────────────────────────────────
const stepsRoot = document.querySelector('[data-steps]')
if (stepsRoot) {
  const tabs = [...stepsRoot.querySelectorAll('[role="tab"]')]
  const imgs = [...stepsRoot.querySelectorAll('[data-step-img]')]
  const panels = [...stepsRoot.querySelectorAll('[role="tabpanel"]')]
  let auto = true
  const select = (i, focus = false) => {
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j))
      t.tabIndex = i === j ? 0 : -1
    })
    imgs.forEach((img, j) => {
      img.classList.toggle('is-active', i === j)
      if (i === j) img.removeAttribute('aria-hidden')
      else img.setAttribute('aria-hidden', 'true')
    })
    panels.forEach((p, j) => (p.hidden = i !== j))
    if (focus) tabs[i].focus()
  }
  tabs.forEach((t, i) =>
    t.addEventListener('click', () => {
      auto = false
      select(i)
    })
  )
  stepsRoot.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
    const next = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    auto = false
    select((next + tabs.length) % tabs.length, true)
  })
  // Na primeira vez que aparece, mostra as três etapas em sequência e para
  if (!reduceMotion) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setTimeout(() => auto && select(1), 1200)
        setTimeout(() => auto && select(2), 3000)
      },
      { threshold: 0.6 }
    )
    io.observe(stepsRoot.querySelector('.steps-frame'))
  }
}

// ── vídeo de apresentação ────────────────────────────────────────
const dialog = document.querySelector('[data-video-dialog]')
const video = dialog?.querySelector('[data-video]')
const videoError = dialog?.querySelector('[data-video-error]')
// Falha de rede ou de formato: troca o player por uma mensagem com saída (tentar de novo ou a versão
// interativa). Quando todas as <source> falham, o erro chega pela última delas, não pelo <video>.
const showVideoError = () => {
  video.hidden = true
  videoError.hidden = false
}
video?.addEventListener('error', showVideoError)
video?.querySelector('source:last-of-type')?.addEventListener('error', showVideoError)
dialog?.querySelector('[data-video-retry]')?.addEventListener('click', () => {
  videoError.hidden = true
  video.hidden = false
  video.load()
  video.play().catch(() => {})
})
document.querySelectorAll('[data-open-video]').forEach((btn) =>
  btn.addEventListener('click', () => {
    dialog.showModal()
    if (!video.hidden) video.play().catch(() => {})
  })
)
dialog?.addEventListener('close', () => video.pause())
document.querySelector('[data-close-video]')?.addEventListener('click', () => dialog.close())
dialog?.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close()
})

// ── versão e link de download sempre atuais (o build já traz; aqui só se saiu outra depois) ──
const metas = document.querySelectorAll('[data-release-meta]')
if (metas.length) {
  fetch('https://api.github.com/repos/imfarias/arcanshot/releases/latest')
    .then((r) => (r.ok ? r.json() : null))
    .then((r) => {
      if (!r?.tag_name) return
      const exe = r.assets?.find((a) => a.name === 'ArcanShot-Setup.exe')
      // Última release sem o instalador de nome fixo: o link /latest/download daria 404
      if (!exe && r.html_url) document.querySelectorAll('[data-download]').forEach((a) => (a.href = r.html_url))
      const v = r.tag_name.replace(/^v/, '')
      if (metas[0].textContent.includes(`Versão ${v} `)) return
      const date = new Date(r.published_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      })
      const text = `Versão ${v} · ${date}${exe ? ` · ${Math.round(exe.size / 1048576)} MB` : ''} · Windows 10 e 11 · Gratuito e de código aberto`
      metas.forEach((m) => (m.textContent = text))
    })
    .catch(() => {})
}

// ── Pix copia e cola ─────────────────────────────────────────────
const copyStatus = document.querySelector('[data-copy-status]')
let copyTimer = 0
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const input = document.querySelector(btn.getAttribute('data-copy'))
    try {
      await navigator.clipboard.writeText(input.value)
      if (copyStatus) copyStatus.textContent = 'Código Pix copiado. Cole no app do seu banco.'
    } catch {
      input.select()
      if (copyStatus) copyStatus.textContent = 'Selecione o código e copie com Ctrl+C.'
    }
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => copyStatus && (copyStatus.textContent = ''), 5000)
  })
})
