// Vídeo de apresentação do ArcanShot: motion design em <canvas> + áudio Web Audio (audio.js).
// Uma única timeline dirige imagem e som: cenas, narração e "cues" de efeitos sonoros.
import { BAR, buildMix, encodeWav } from './audio.js'

export const W = 1920
export const H = 1080
const FONT = '"Segoe UI Variable Display","Segoe UI",Inter,system-ui,sans-serif'
const C = {
  bg0: '#08061a',
  bg1: '#150d33',
  purple: '#7c3aed',
  purpleHi: '#8b5cf6',
  blue: '#2563eb',
  red: '#ef4444',
  yellow: 'rgba(250, 204, 21, 0.45)',
  ink: '#0f172a',
  muted: '#64748b',
  ui: 'rgba(24, 24, 27, 0.95)',
  uiBorder: '#3f3f46',
  uiText: '#e4e4e7'
}
const PRESETS = {
  ocean: ['#2e3192', '#1bffff'],
  sunset: ['#ff7a18', '#af002d'],
  forest: ['#11998e', '#38ef7d'],
  violet: ['#654ea3', '#eaafc8']
}

// ── easing/utilidades ──────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeOutCubic = (t) => 1 - (1 - t) ** 3
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
const prog = (t, a, b, ease = easeInOutCubic) => ease(clamp((t - a) / (b - a)))
const fadeIO = (t, a, b, f = 0.3) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b))

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── timeline ───────────────────────────────────────────────────
// min: duração mínima; narr: atraso da narração dentro da cena; ws: parte do "workspace" contínuo
const SCENES = [
  { id: 'intro', min: 7.2, narr: 1.6 },
  { id: 'select', min: 7.2, narr: 0.4, ws: true },
  { id: 'annotate', min: 6.0, narr: 0.3, ws: true },
  { id: 'privacy', min: 6.0, narr: 0.3, ws: true },
  { id: 'beautify', min: 7.2, narr: 0.3, ws: true },
  { id: 'multi', min: 7.2, narr: 0.4 },
  { id: 'share', min: 7.2, narr: 0.4 },
  { id: 'outro', min: 8.4, narr: 1.0 }
]

// Momentos-chave de cada cena (segundos desde o início da cena) — usados pela imagem E pelo som
const PH = {
  select: { key: 0.9, dim: 1.0, cursorIn: 1.2, dragA: 1.6, dragB: 3.6, shutter: 3.7, toolbar: 4.0 },
  annotate: { arrow: [0.25, 1.0], rect: [1.3, 2.1], text: [2.4, 3.4], hl: [3.6, 4.4] },
  privacy: { blur: [0.3, 1.5], steps: [2.2, 2.7, 3.2] },
  beautify: { click: 0.35, morph: [0.6, 1.7], panel: [1.5, 2.1], sliders: [2.2, 3.0], p1: 3.4, p2: 4.6 },
  multi: { drag: [0.8, 2.0], gallery: 3.4 },
  share: { copy: 0.6, saveKey: 2.6, fly: [3.0, 3.6], local: 4.6 },
  outro: { badges: [2.6, 2.9, 3.2] }
}

export function buildTimeline(narrDur, captions) {
  let t = 0
  const scenes = SCENES.map((s) => {
    const nd = narrDur[s.id] ?? 0
    const quant = s.id === 'intro' ? BAR : BAR / 2 // drop cai num compasso inteiro
    const dur = Math.ceil(Math.max(s.min, s.narr + nd + 0.9) / quant - 1e-6) * quant
    const scene = { ...s, start: t, dur, narrStart: s.narr, narrDur: nd, caption: captions[s.id] ?? '' }
    t += dur
    return scene
  })
  const byId = Object.fromEntries(scenes.map((s) => [s.id, s]))
  const at = (id, dt) => byId[id].start + dt
  const cues = [
    { t: at('select', PH.select.key), type: 'key' },
    { t: at('select', PH.select.shutter), type: 'shutter' },
    ...['arrow', 'rect', 'text', 'hl'].map((k, i) => ({
      t: at('annotate', PH.annotate[k][0] - 0.05),
      type: 'pop',
      pitch: [0, 2, 4, 7][i]
    })),
    { t: at('privacy', PH.privacy.blur[0]), type: 'swipe' },
    ...PH.privacy.steps.map((d, i) => ({ t: at('privacy', d), type: 'pop', pitch: [0, 4, 7][i] })),
    { t: at('beautify', PH.beautify.click), type: 'key' },
    { t: at('beautify', PH.beautify.morph[0] + 0.1), type: 'swipe' },
    { t: at('beautify', PH.beautify.p1), type: 'pop', pitch: 5 },
    { t: at('beautify', PH.beautify.p2), type: 'pop', pitch: 9 },
    { t: at('multi', PH.multi.drag[1]), type: 'shutter' },
    { t: at('multi', PH.multi.gallery), type: 'swipe' },
    { t: at('share', PH.share.copy), type: 'key' },
    { t: at('share', PH.share.copy + 0.35), type: 'chime' },
    { t: at('share', PH.share.saveKey), type: 'key' },
    { t: at('share', PH.share.fly[0]), type: 'swipe' },
    { t: at('share', PH.share.fly[1]), type: 'pop', pitch: 0 },
    { t: at('share', PH.share.local), type: 'chime' },
    ...PH.outro.badges.map((d, i) => ({ t: at('outro', d), type: 'pop', pitch: [0, 4, 7][i] }))
  ]
  return { scenes, byId, cues, total: t }
}

// ── primitivas de desenho ──────────────────────────────────────
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function text(ctx, str, x, y, { size = 24, weight = 400, color = '#fff', align = 'left', base = 'alphabetic' } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = base
  ctx.fillText(str, x, y)
}

function drawCursor(ctx, x, y, scale = 1.25) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 24)
  ctx.lineTo(6, 18.5)
  ctx.lineTo(10, 28)
  ctx.lineTo(14, 26.3)
  ctx.lineTo(10, 17)
  ctx.lineTo(17.5, 17)
  ctx.closePath()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 1.4
  ctx.strokeStyle = '#000'
  ctx.stroke()
  ctx.restore()
}

function keycap(ctx, label, cx, cy, pressed, alpha = 1, w = null) {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = `600 34px ${FONT}`
  const kw = w ?? Math.max(86, ctx.measureText(label).width + 48)
  const kh = 82
  const depth = 10 * (1 - pressed)
  const x = cx - kw / 2
  const y = cy - kh / 2 + (10 - depth)
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 12
  rr(ctx, x, y, kw, kh + depth, 16)
  ctx.fillStyle = '#a1a1aa'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  rr(ctx, x, y, kw, kh, 16)
  const g = ctx.createLinearGradient(0, y, 0, y + kh)
  g.addColorStop(0, '#fafafa')
  g.addColorStop(1, '#e4e4e7')
  ctx.fillStyle = g
  ctx.fill()
  text(ctx, label, cx, y + kh / 2 + 2, { size: 34, weight: 600, color: '#18181b', align: 'center', base: 'middle' })
  ctx.restore()
  return kw
}

function pressAmount(t, at) {
  return t < at - 0.08 ? 0 : t < at ? (t - (at - 0.08)) / 0.08 : 1 - prog(t, at + 0.05, at + 0.25)
}

// ── fundo global ───────────────────────────────────────────────
const rand = mulberry32(1234)
const PARTICLES = [...Array(70)].map(() => ({
  x: rand() * W,
  y: rand() * H,
  r: 0.8 + rand() * 2.2,
  sp: 6 + rand() * 18,
  ph: rand() * Math.PI * 2
}))

function drawBackground(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, C.bg0)
  g.addColorStop(1, C.bg1)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const glow = (x, y, r, color) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, color)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, W, H)
  }
  glow(W * 0.3 + Math.sin(time * 0.21) * 220, H * 0.35 + Math.cos(time * 0.17) * 120, 760, 'rgba(124,58,237,0.32)')
  glow(W * 0.75 + Math.cos(time * 0.13) * 200, H * 0.7 + Math.sin(time * 0.19) * 140, 680, 'rgba(37,99,235,0.22)')
  // grade de pontos
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let x = 40; x < W; x += 48) for (let y = 40; y < H; y += 48) ctx.fillRect(x, y, 2, 2)
  for (const p of PARTICLES) {
    const y = (((p.y - time * p.sp) % H) + H) % H
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.3 + p.ph))
    ctx.beginPath()
    ctx.arc(p.x, y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = '#c4b5fd'
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── logo (mesmo desenho de scripts/gen-icon.mjs, em vetor) ─────
function drawLogo(ctx, cx, cy, size, { square = 1, ring = 1, dot = 1, corners = 1, cornerFly = 1 } = {}) {
  const s = size / 256
  ctx.save()
  ctx.translate(cx, cy)
  if (square > 0) {
    ctx.save()
    ctx.globalAlpha *= square
    const k = lerp(0.6, 1, easeOutBack(square))
    ctx.scale(k, k)
    ctx.shadowColor = 'rgba(124,58,237,0.6)'
    ctx.shadowBlur = 60 * s
    rr(ctx, -120 * s, -120 * s, 240 * s, 240 * s, 40 * s)
    const g = ctx.createLinearGradient(0, -120 * s, 0, 120 * s)
    g.addColorStop(0, '#6d28d9')
    g.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
  }
  if (ring > 0) {
    ctx.beginPath()
    ctx.arc(0, 0, 62 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring)
    ctx.lineWidth = 20 * s
    ctx.strokeStyle = '#fff'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  if (dot > 0) {
    ctx.beginPath()
    ctx.arc(0, 0, 24 * s * easeOutBack(dot), 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }
  if (corners > 0) {
    ctx.globalAlpha *= corners
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 8 * s
    ctx.lineCap = 'round'
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ]) {
      const fly = (1 - cornerFly) * 900
      const x = sx * (72 * s + fly)
      const y = sy * (72 * s + fly * 0.56)
      ctx.beginPath()
      ctx.moveTo(x, y - sy * 16 * s)
      ctx.lineTo(x, y)
      ctx.lineTo(x - sx * 16 * s, y)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function staggerTitle(ctx, str, cx, y, t, { size, weight = 700, color = '#fff', step = 0.035 }) {
  ctx.font = `${weight} ${size}px ${FONT}`
  const total = ctx.measureText(str).width
  let x = cx - total / 2
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    const cw = ctx.measureText(ch).width
    const p = prog(t, i * step, i * step + 0.45, easeOutCubic)
    ctx.save()
    ctx.globalAlpha *= p
    text(ctx, ch, x, y + (1 - p) * size * 0.5, { size, weight, color })
    ctx.restore()
    x += cw
  }
}

// ── cena: intro ────────────────────────────────────────────────
function drawIntro(ctx, t, s) {
  const out = prog(t, s.dur - 1.4, s.dur, easeInOutCubic)
  ctx.save()
  ctx.globalAlpha = 1 - out
  ctx.translate(W / 2, 0)
  ctx.scale(1 - out * 0.25, 1 - out * 0.25)
  ctx.translate(-W / 2, -out * 160)
  // feixe de luz
  const sweep = prog(t, 1.7, 2.6, easeInOutCubic)
  if (sweep > 0 && sweep < 1) {
    const lg = ctx.createRadialGradient(W / 2, 400, 0, W / 2, 400, 420 * sweep + 60)
    lg.addColorStop(0, `rgba(196,181,253,${0.4 * (1 - sweep)})`)
    lg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lg
    ctx.fillRect(0, 0, W, H)
  }
  drawLogo(ctx, W / 2, 400, 300, {
    cornerFly: prog(t, 0.2, 1.2, easeOutCubic),
    corners: prog(t, 0.2, 0.6),
    ring: prog(t, 1.0, 1.8),
    dot: prog(t, 1.6, 2.0, (x) => x),
    square: prog(t, 1.8, 2.5, (x) => x)
  })
  staggerTitle(ctx, 'ArcanShot', W / 2, 690, t - 2.3, { size: 120, weight: 700 })
  const tag = prog(t, 3.1, 3.7, easeOutCubic)
  ctx.globalAlpha *= tag
  text(ctx, 'Captura de tela com anotações para Windows', W / 2, 770 + (1 - tag) * 20, {
    size: 40,
    weight: 400,
    color: '#c4b5fd',
    align: 'center'
  })
  ctx.restore()
}

// ── "app" fictício que será capturado ─────────────────────────
const APP = { x: 240, y: 120, w: 1440, h: 840 }
const SEL = { x: 490, y: 180, w: 1180, h: 570 }
const BARS = [0.48, 0.55, 0.62, 0.78, 1.0, 0.7]
const MONTHS = ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set']
const STEP_BTNS = [
  { label: 'Filtrar', x: 1020, w: 110 },
  { label: 'Exportar', x: 1145, w: 120 },
  { label: 'Compartilhar', x: 1280, w: 140 }
]
let appCanvas = null
let headingW = 0

function buildAppCanvas() {
  const cv = document.createElement('canvas')
  cv.width = APP.w
  cv.height = APP.h
  const c = cv.getContext('2d')
  rr(c, 0, 0, APP.w, APP.h, 14)
  c.fillStyle = '#f8fafc'
  c.fill()
  c.save()
  c.clip()
  // barra de título
  c.fillStyle = '#e2e8f0'
  c.fillRect(0, 0, APP.w, 44)
  text(c, 'Painel — Vendas', 20, 28, { size: 17, weight: 600, color: '#334155' })
  ;['—', '☐', '✕'].forEach((g, i) => text(c, g, APP.w - 130 + i * 46, 29, { size: 17, color: '#475569', align: 'center' }))
  // sidebar
  c.fillStyle = '#eef2ff'
  c.fillRect(0, 44, 220, APP.h - 44)
  ;['Visão geral', 'Vendas', 'Clientes', 'Relatórios', 'Configurações'].forEach((m, i) => {
    if (i === 1) {
      rr(c, 12, 70 + i * 52, 196, 40, 10)
      c.fillStyle = '#ddd6fe'
      c.fill()
    }
    text(c, m, 32, 96 + i * 52, { size: 18, weight: i === 1 ? 600 : 400, color: i === 1 ? '#5b21b6' : '#475569' })
  })
  // cabeçalho
  text(c, 'Relatório de vendas — 3º trimestre', 260, 108, { size: 32, weight: 700, color: C.ink })
  headingW = c.measureText('Relatório de vendas — 3º trimestre').width
  STEP_BTNS.forEach((b, i) => {
    rr(c, b.x, 80, b.w, 40, 9)
    c.fillStyle = i === 2 ? '#7c3aed' : '#fff'
    c.fill()
    c.strokeStyle = i === 2 ? '#7c3aed' : '#cbd5e1'
    c.lineWidth = 1.5
    c.stroke()
    text(c, b.label, b.x + b.w / 2, 106, { size: 17, weight: 600, color: i === 2 ? '#fff' : '#334155', align: 'center' })
  })
  const card = (x, y, w, h) => {
    c.save()
    c.shadowColor = 'rgba(15,23,42,0.08)'
    c.shadowBlur = 16
    c.shadowOffsetY = 4
    rr(c, x, y, w, h, 14)
    c.fillStyle = '#fff'
    c.fill()
    c.restore()
  }
  // KPIs
  const kpis = [
    ['Receita', 'R$ 482 mil', '+12%', '#16a34a'],
    ['Pedidos', '3.914', '+8%', '#16a34a'],
    ['Ticket médio', 'R$ 123', '−2%', '#dc2626']
  ]
  kpis.forEach(([label, value, delta, col], i) => {
    const x = 260 + i * 320
    card(x, 140, 300, 110)
    text(c, label, x + 22, 176, { size: 17, color: C.muted })
    text(c, value, x + 22, 222, { size: 34, weight: 700, color: C.ink })
    text(c, delta, x + 278, 222, { size: 18, weight: 600, color: col, align: 'right' })
  })
  // gráfico
  card(260, 280, 620, 330)
  text(c, 'Receita mensal', 284, 316, { size: 19, weight: 600, color: C.ink })
  c.strokeStyle = '#e2e8f0'
  c.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    c.beginPath()
    c.moveTo(290, 570 - i * 70)
    c.lineTo(860, 570 - i * 70)
    c.stroke()
  }
  BARS.forEach((v, i) => {
    const x = 300 + i * 92
    const h = v * 220
    rr(c, x, 570 - h, 56, h, [8, 8, 0, 0])
    const g = c.createLinearGradient(0, 570 - h, 0, 570)
    g.addColorStop(0, i === 4 ? '#8b5cf6' : '#a5b4fc')
    g.addColorStop(1, i === 4 ? '#6d28d9' : '#818cf8')
    c.fillStyle = g
    c.fill()
    text(c, MONTHS[i], x + 28, 596, { size: 16, color: C.muted, align: 'center' })
  })
  // dados sensíveis
  card(910, 280, 500, 330)
  text(c, 'Dados do cliente', 934, 316, { size: 19, weight: 600, color: C.ink })
  ;[
    ['Nome', 'João da Silva'],
    ['E-mail', 'joao.silva@empresa.com.br'],
    ['Cartão', '4532 7781 0045 8890'],
    ['Telefone', '(11) 98765-4321']
  ].forEach(([k, v], i) => {
    const y = 370 + i * 60
    text(c, k, 934, y, { size: 16, color: C.muted })
    text(c, v, 1050, y, { size: 20, weight: 600, color: '#1e293b' })
    if (i < 3) {
      c.fillStyle = '#f1f5f9'
      c.fillRect(934, y + 24, 452, 1)
    }
  })
  // rodapé
  card(260, 640, 1150, 170)
  text(c, 'Próximos passos', 284, 676, { size: 19, weight: 600, color: C.ink })
  ;['Revisar metas do 4º trimestre', 'Atualizar previsão de estoque', 'Enviar relatório à diretoria'].forEach((s, i) =>
    text(c, `○  ${s}`, 290, 718 + i * 34, { size: 18, color: '#334155' })
  )
  c.restore()
  return cv
}

function drawDesktop(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#1e1b4b')
  g.addColorStop(0.6, '#312e81')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const rg = ctx.createRadialGradient(1500, 200, 0, 1500, 200, 900)
  rg.addColorStop(0, 'rgba(236,72,153,0.25)')
  rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)
  // barra de tarefas
  ctx.fillStyle = 'rgba(15,15,25,0.82)'
  ctx.fillRect(0, H - 52, W, 52)
  for (let i = 0; i < 6; i++) {
    rr(ctx, W / 2 - 150 + i * 52, H - 42, 32, 32, 7)
    ctx.fillStyle = i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.18)'
    ctx.fill()
  }
  text(ctx, '18:30', W - 30, H - 20, { size: 15, color: '#e4e4e7', align: 'right' })
  // janela
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 18
  rr(ctx, APP.x, APP.y, APP.w, APP.h, 14)
  ctx.fillStyle = '#f8fafc'
  ctx.fill()
  ctx.restore()
  ctx.drawImage(appCanvas, APP.x, APP.y)
}

// ── anotações (coordenadas de tela) ────────────────────────────
const ANN = {
  text: { x: 548, y: 478, str: 'Pico em agosto!' },
  arrow: { x1: 790, y1: 468, x2: 920, y2: 480 },
  rect: { x: 490 + 2, y: 252, w: 316, h: 126 },
  blur: { x: 1170, y: 515, w: 460, h: 175 },
  hl: { x: 496, y: 213, h: 30 }
}

function drawArrow(ctx, x1, y1, x2, y2, p) {
  if (p <= 0) return
  const x = lerp(x1, x2, p)
  const y = lerp(y1, y2, p)
  ctx.save()
  ctx.strokeStyle = C.red
  ctx.fillStyle = C.red
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x, y)
  ctx.stroke()
  const a = Math.atan2(y2 - y1, x2 - x1)
  const hs = 30 * clamp((p - 0.3) / 0.7)
  if (hs > 0) {
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6)
    ctx.lineTo(x - Math.cos(a - 0.45) * hs, y - Math.sin(a - 0.45) * hs)
    ctx.lineTo(x - Math.cos(a + 0.45) * hs, y - Math.sin(a + 0.45) * hs)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function stepPos(i) {
  const b = STEP_BTNS[i]
  return { x: APP.x + b.x - 4, y: APP.y + 80 - 6 }
}

function drawStep(ctx, i, p) {
  if (p <= 0) return
  const { x, y } = stepPos(i)
  const k = easeOutBack(p)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(0, 0, 21, 0, Math.PI * 2)
  ctx.fillStyle = C.blue
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  text(ctx, String(i + 1), 0, 1, { size: 22, weight: 700, align: 'center', base: 'middle' })
  ctx.restore()
}

/** Desenha anotações sobre o app conforme o progresso de cada uma (st). */
function drawAnnotations(ctx, st) {
  // marcador (atrás do texto? não: marcador é translúcido, por cima)
  if (st.hl > 0) {
    ctx.fillStyle = C.yellow
    ctx.fillRect(ANN.hl.x, ANN.hl.y - ANN.hl.h + 8, (headingW + 8) * st.hl, ANN.hl.h + 6)
  }
  if (st.blur > 0) {
    const b = ANN.blur
    ctx.save()
    ctx.beginPath()
    ctx.rect(b.x, b.y, b.w * st.blur, b.h)
    ctx.clip()
    ctx.filter = 'blur(9px)'
    ctx.drawImage(appCanvas, b.x - APP.x - 20, b.y - APP.y - 20, b.w + 40, b.h + 40, b.x - 20, b.y - 20, b.w + 40, b.h + 40)
    ctx.filter = 'none'
    ctx.restore()
  }
  if (st.rect > 0) {
    const r = ANN.rect
    const per = 2 * (r.w + r.h)
    ctx.save()
    ctx.strokeStyle = C.red
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.setLineDash([per * st.rect, per])
    rr(ctx, r.x, r.y, r.w, r.h, 8)
    ctx.stroke()
    ctx.restore()
  }
  if (st.text > 0) {
    const n = Math.round(ANN.text.str.length * st.text)
    ctx.save()
    ctx.shadowColor = 'rgba(255,255,255,0.9)'
    ctx.shadowBlur = 6
    text(ctx, ANN.text.str.slice(0, n), ANN.text.x, ANN.text.y, { size: 32, weight: 700, color: C.red })
    ctx.restore()
  }
  drawArrow(ctx, ANN.arrow.x1, ANN.arrow.y1, ANN.arrow.x2, ANN.arrow.y2, st.arrow)
  st.steps.forEach((p, i) => drawStep(ctx, i, p))
}

// ── toolbar e lupa (overlay de captura) ────────────────────────
const TOOLS = ['⬚', '▭', '◯', '➜', '╱', '✎', '▮', '▒', '█', 'T', '①', '◉', '|', '↶', '↷', '|', '✦', '⧉', '⤓', '⋯', '✕']
const TOOL_IDX = { arrow: 3, rect: 1, text: 9, hl: 6, blur: 7, step: 10, beautify: 16 }
function toolbarLayout() {
  const bw = 44
  const gap = 4
  const widths = TOOLS.map((g) => (g === '|' ? 14 : bw))
  const total = widths.reduce((a, b) => a + b + gap, 0) - gap + 20
  const x0 = SEL.x + SEL.w / 2 - total / 2
  const y0 = SEL.y + SEL.h + 14
  let x = x0 + 10
  const btns = widths.map((w) => {
    const b = { x, w }
    x += w + gap
    return b
  })
  return { x0, y0, total, h: 64, btns }
}
const TB = toolbarLayout()
const toolCenter = (i) => ({ x: TB.btns[i].x + 22, y: TB.y0 + 32 })

function drawToolbar(ctx, alpha, active, pressed = -1) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(0, (1 - alpha) * 20)
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 4
  rr(ctx, TB.x0, TB.y0, TB.total, TB.h, 12)
  ctx.fillStyle = C.ui
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = C.uiBorder
  ctx.lineWidth = 1
  ctx.stroke()
  TOOLS.forEach((g, i) => {
    const b = TB.btns[i]
    if (g === '|') {
      ctx.fillStyle = C.uiBorder
      ctx.fillRect(b.x + 6, TB.y0 + 14, 1.5, TB.h - 28)
      return
    }
    if (i === active || i === pressed) {
      rr(ctx, b.x, TB.y0 + 10, b.w, 44, 8)
      ctx.fillStyle = i === pressed ? '#7c3aed' : C.blue
      ctx.fill()
    }
    text(ctx, g, b.x + b.w / 2, TB.y0 + 33, { size: 21, color: C.uiText, align: 'center', base: 'middle' })
  })
  ctx.restore()
}

function drawMagnifier(ctx, cx, cy, alpha) {
  if (alpha <= 0) return
  const r = 104
  const zoom = 4
  // muda de lado perto das bordas (e longe da área das legendas)
  const mx = cx + 130 + r > W - 20 ? cx - 130 : cx + 130
  const my = cy + 130 + r + 50 > H - 200 ? cy - 130 : cy + 130
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.save()
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  const sw = (2 * r) / zoom
  ctx.drawImage(appCanvas, cx - APP.x - sw / 2, cy - APP.y - sw / 2, sw, sw, mx - r, my - r, 2 * r, 2 * r)
  ctx.imageSmoothingEnabled = true
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 1
  for (let i = -r; i <= r; i += zoom) {
    ctx.beginPath()
    ctx.moveTo(mx + i, my - r)
    ctx.lineTo(mx + i, my + r)
    ctx.moveTo(mx - r, my + i)
    ctx.lineTo(mx + r, my + i)
    ctx.stroke()
  }
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(mx - r, my)
  ctx.lineTo(mx + r, my)
  ctx.moveTo(mx, my - r)
  ctx.lineTo(mx, my + r)
  ctx.stroke()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.lineWidth = 4
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  rr(ctx, mx - 62, my + r + 10, 124, 30, 8)
  ctx.fillStyle = 'rgba(17,17,17,0.85)'
  ctx.fill()
  text(ctx, `${Math.round(cx)}, ${Math.round(cy)}`, mx, my + r + 26, { size: 16, color: '#fff', align: 'center', base: 'middle' })
  ctx.restore()
}

function sizeLabel(ctx, x, y, w, h) {
  const str = `${Math.round(w)} × ${Math.round(h)}`
  ctx.font = `600 18px ${FONT}`
  const tw = ctx.measureText(str).width + 20
  const ly = y - 40 < 4 ? y + 8 : y - 40
  rr(ctx, x, ly, tw, 30, 7)
  ctx.fillStyle = 'rgba(17,17,17,0.85)'
  ctx.fill()
  text(ctx, str, x + 10, ly + 16, { size: 18, weight: 600, color: '#fff', base: 'middle' })
}

// ── cena contínua: seleção → anotação → privacidade → embelezar ─
function wsState(time, tl) {
  const s = tl.byId
  const tS = time - s.select.start
  const tA = time - s.annotate.start
  const tP = time - s.privacy.start
  const tB = time - s.beautify.start
  const A = PH.annotate
  const P = PH.privacy
  const st = {
    arrow: prog(tA, ...A.arrow),
    rect: prog(tA, ...A.rect),
    text: prog(tA, ...A.text, (x) => x),
    hl: prog(tA, ...A.hl),
    blur: prog(tP, ...P.blur),
    steps: P.steps.map((d) => prog(tP, d, d + 0.35, (x) => x))
  }
  // cursor: keyframes absolutos
  const S = PH.select
  const keys = [
    [S.cursorIn, 760, 520],
    [S.dragA, SEL.x, SEL.y],
    [S.dragB, SEL.x + SEL.w, SEL.y + SEL.h],
    [S.toolbar + 0.5, SEL.x + SEL.w - 60, SEL.y + SEL.h + 46]
  ].map(([t, x, y]) => [s.select.start + t, x, y])
  const toolHop = (scene, at, idx) => {
    const c = toolCenter(idx)
    return [s[scene].start + at, c.x, c.y + 6]
  }
  keys.push(
    toolHop('annotate', A.arrow[0] - 0.25, TOOL_IDX.arrow),
    [s.annotate.start + A.arrow[0], ANN.arrow.x1, ANN.arrow.y1],
    [s.annotate.start + A.arrow[1], ANN.arrow.x2, ANN.arrow.y2],
    [s.annotate.start + A.rect[0], ANN.rect.x, ANN.rect.y],
    [s.annotate.start + A.rect[1], ANN.rect.x + ANN.rect.w, ANN.rect.y + ANN.rect.h],
    [s.annotate.start + A.text[0], ANN.text.x, ANN.text.y - 12],
    [s.annotate.start + A.text[1], ANN.text.x + 250, ANN.text.y - 12],
    [s.annotate.start + A.hl[0], ANN.hl.x, ANN.hl.y - 6],
    [s.annotate.start + A.hl[1], ANN.hl.x + headingW, ANN.hl.y - 6],
    [s.privacy.start + P.blur[0], ANN.blur.x, ANN.blur.y],
    [s.privacy.start + P.blur[1], ANN.blur.x + ANN.blur.w, ANN.blur.y + ANN.blur.h],
    ...P.steps.map((d, i) => [s.privacy.start + d - 0.05, stepPos(i).x + 10, stepPos(i).y + 10]),
    toolHop('beautify', PH.beautify.click, TOOL_IDX.beautify)
  )
  let cx = keys[0][1]
  let cy = keys[0][2]
  for (let i = 0; i < keys.length; i++) {
    const [t, x, y] = keys[i]
    if (time >= t) {
      cx = x
      cy = y
      const nx = keys[i + 1]
      if (nx && time < nx[0]) {
        const p = easeInOutCubic((time - t) / (nx[0] - t))
        cx = lerp(x, nx[1], p)
        cy = lerp(y, nx[2], p)
      }
    }
  }
  st.cursor = { x: cx, y: cy, show: tS >= S.cursorIn && tB < PH.beautify.morph[0] }
  // ferramenta ativa
  st.tool = -1
  if (tA >= 0) st.tool = TOOL_IDX.arrow
  if (tA >= A.rect[0] - 0.15) st.tool = TOOL_IDX.rect
  if (tA >= A.text[0] - 0.15) st.tool = TOOL_IDX.text
  if (tA >= A.hl[0] - 0.15) st.tool = TOOL_IDX.hl
  if (tP >= 0) st.tool = TOOL_IDX.blur
  if (tP >= P.steps[0] - 0.3) st.tool = TOOL_IDX.step
  return { st, tS, tB }
}

function drawCapture(ctx, st, dx, dy, k) {
  ctx.save()
  ctx.translate(dx, dy)
  ctx.scale(k, k)
  ctx.translate(-SEL.x, -SEL.y)
  ctx.beginPath()
  ctx.rect(SEL.x, SEL.y, SEL.w, SEL.h)
  ctx.clip()
  ctx.drawImage(appCanvas, APP.x, APP.y)
  drawAnnotations(ctx, st)
  ctx.restore()
}

function gradientFor(ctx, x, y, w, h, preset) {
  const [a, b] = PRESETS[preset]
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  return g
}

function beautifiedCard(ctx, st, cx, cy, k, pad, radius, shadow, presetMix) {
  const iw = SEL.w * k
  const ih = SEL.h * k
  const ow = iw + pad * 2
  const oh = ih + pad * 2
  const x = cx - ow / 2
  const y = cy - oh / 2
  for (const [preset, a] of presetMix) {
    if (a <= 0) continue
    ctx.save()
    ctx.globalAlpha *= a
    rr(ctx, x, y, ow, oh, 22)
    ctx.fillStyle = gradientFor(ctx, x, y, ow, oh, preset)
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  ctx.shadowColor = `rgba(0,0,0,${0.45 * shadow})`
  ctx.shadowBlur = 50 * shadow
  ctx.shadowOffsetY = 22 * shadow
  rr(ctx, x + pad, y + pad, iw, ih, radius)
  ctx.fillStyle = '#f8fafc'
  ctx.fill()
  ctx.restore()
  ctx.save()
  rr(ctx, x + pad, y + pad, iw, ih, radius)
  ctx.clip()
  drawCapture(ctx, st, x + pad, y + pad, k)
  ctx.restore()
  return { x, y, w: ow, h: oh }
}

function slider(ctx, x, y, label, value, max, unit) {
  text(ctx, label, x, y, { size: 18, color: C.uiText })
  text(ctx, `${Math.round(value)}${unit}`, x + 300, y, { size: 18, color: '#a1a1aa', align: 'right' })
  rr(ctx, x, y + 16, 300, 6, 3)
  ctx.fillStyle = '#3f3f46'
  ctx.fill()
  rr(ctx, x, y + 16, (300 * value) / max, 6, 3)
  ctx.fillStyle = C.blue
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + (300 * value) / max, y + 19, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
}

function drawWorkspace(ctx, time, tl) {
  const { st, tS, tB } = wsState(time, tl)
  const S = PH.select
  const B = PH.beautify
  const morph = prog(tB, ...B.morph)

  // tela do usuário (some durante o "embelezar")
  if (morph < 1) {
    ctx.save()
    ctx.globalAlpha *= 1 - morph
    drawDesktop(ctx)
    // tecla PrintScreen
    const keyA = fadeIO(tS, 0.2, 1.9, 0.3)
    if (keyA > 0) {
      ctx.fillStyle = `rgba(0,0,0,${0.35 * keyA})`
      ctx.fillRect(0, 0, W, H)
      keycap(ctx, 'PrtSc', W / 2, H / 2 - 20, pressAmount(tS, S.key), keyA * prog(tS, 0.2, 0.5, easeOutBack), 200)
    }
    // overlay de captura
    const dim = prog(tS, S.dim, S.dim + 0.3) * 0.55
    if (tS >= S.dim) {
      const dp = prog(tS, S.dragA, S.dragB)
      const sw = tS < S.dragA ? 0 : SEL.w * dp
      const sh = tS < S.dragA ? 0 : SEL.h * dp
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.rect(SEL.x, SEL.y, sw, sh)
      ctx.fillStyle = `rgba(0,0,0,${dim})`
      ctx.fill('evenodd')
      ctx.restore()
      ctx.save()
      ctx.beginPath()
      ctx.rect(SEL.x, SEL.y, SEL.w, SEL.h)
      ctx.clip()
      drawAnnotations(ctx, st)
      ctx.restore()
      if (sw > 2) {
        ctx.save()
        ctx.setLineDash([8, 6])
        ctx.lineWidth = 2
        ctx.strokeStyle = '#fff'
        ctx.strokeRect(SEL.x, SEL.y, sw, sh)
        ctx.setLineDash([])
        const hs = 10
        for (const [hx, hy] of [
          [0, 0],
          [0.5, 0],
          [1, 0],
          [0, 0.5],
          [1, 0.5],
          [0, 1],
          [0.5, 1],
          [1, 1]
        ]) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(SEL.x + sw * hx - hs / 2, SEL.y + sh * hy - hs / 2, hs, hs)
          ctx.strokeStyle = C.blue
          ctx.lineWidth = 1.5
          ctx.strokeRect(SEL.x + sw * hx - hs / 2, SEL.y + sh * hy - hs / 2, hs, hs)
        }
        ctx.restore()
        sizeLabel(ctx, SEL.x, SEL.y, sw, sh)
      }
      // flash do "shutter"
      const fl = fadeIO(tS, S.shutter - 0.02, S.shutter + 0.3, 0.12)
      if (fl > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 * fl})`
        ctx.fillRect(SEL.x, SEL.y, SEL.w, SEL.h)
      }
      const pressed = tB >= B.click - 0.1 ? TOOL_IDX.beautify : -1
      drawToolbar(ctx, prog(tS, S.toolbar, S.toolbar + 0.45, easeOutCubic) * (1 - prog(tB, B.morph[0], B.morph[0] + 0.3)), st.tool, pressed)
      drawMagnifier(ctx, st.cursor.x, st.cursor.y, fadeIO(tS, S.cursorIn + 0.1, S.dragB + 0.3, 0.25))
    }
    if (st.cursor.show) drawCursor(ctx, st.cursor.x, st.cursor.y)
    ctx.restore()
  }

  // embelezar: a captura vira um "card" pronto para compartilhar
  if (tB >= B.morph[0]) {
    const target = { cx: 760, cy: 520, k: 0.8, pad: 56, radius: 18 }
    const k = lerp(1, target.k, morph)
    const curCx = lerp(SEL.x + SEL.w / 2, target.cx, morph)
    const curCy = lerp(SEL.y + SEL.h / 2, target.cy, morph)
    const sl = prog(tB, ...B.sliders)
    const pad = lerp(0, 40, morph) + 16 * sl
    const radius = lerp(0, 10, morph) + 8 * sl
    const shadow = morph
    const p1 = prog(tB, B.p1, B.p1 + 0.35)
    const p2 = prog(tB, B.p2, B.p2 + 0.35)
    const mix = [
      ['ocean', morph],
      ['sunset', p1 * (1 - p2)],
      ['violet', p2]
    ]
    beautifiedCard(ctx, st, curCx, curCy, k, pad, radius, shadow, mix)
    // painel lateral
    const pa = prog(tB, ...B.panel, easeOutCubic)
    if (pa > 0) {
      ctx.save()
      ctx.globalAlpha *= pa
      ctx.translate((1 - pa) * 60, 0)
      const px = 1400
      const py = 250
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 30
      rr(ctx, px, py, 380, 540, 16)
      ctx.fillStyle = 'rgba(24,24,27,0.97)'
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = C.uiBorder
      ctx.stroke()
      text(ctx, '✦  Embelezar', px + 30, py + 52, { size: 24, weight: 700, color: '#fff' })
      text(ctx, 'Fundo', px + 30, py + 106, { size: 18, color: '#a1a1aa' })
      const sel = p2 > 0.5 ? 'violet' : p1 > 0.5 ? 'sunset' : 'ocean'
      Object.keys(PRESETS).forEach((id, i) => {
        const sx = px + 30 + i * 80
        const sy = py + 124
        rr(ctx, sx, sy, 62, 62, 12)
        ctx.fillStyle = gradientFor(ctx, sx, sy, 62, 62, id)
        ctx.fill()
        if (id === sel) {
          rr(ctx, sx - 5, sy - 5, 72, 72, 15)
          ctx.lineWidth = 3
          ctx.strokeStyle = '#fff'
          ctx.stroke()
        }
      })
      slider(ctx, px + 30, py + 260, 'Margem', lerp(40, 56, sl), 120, 'px')
      slider(ctx, px + 30, py + 340, 'Cantos', lerp(10, 18, sl), 40, 'px')
      slider(ctx, px + 30, py + 420, 'Sombra', lerp(40, 80, sl), 100, '%')
      rr(ctx, px + 30, py + 470, 320, 46, 10)
      ctx.fillStyle = C.blue
      ctx.fill()
      text(ctx, 'Aplicar', px + 190, py + 494, { size: 19, weight: 600, align: 'center', base: 'middle' })
      ctx.restore()
    }
  }
}

// ── cena: vários monitores + galeria ───────────────────────────
function monitor(ctx, x, y, w, h, label) {
  rr(ctx, x - 14, y - 14, w + 28, h + 28, 18)
  ctx.fillStyle = '#0b0b10'
  ctx.fill()
  ctx.strokeStyle = '#3f3f46'
  ctx.lineWidth = 2
  ctx.stroke()
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#1e1b4b')
  g.addColorStop(1, '#312e81')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  // janelinhas
  ctx.fillStyle = '#f8fafc'
  rr(ctx, x + w * 0.1, y + h * 0.12, w * 0.55, h * 0.6, 6)
  ctx.fill()
  ctx.fillStyle = '#c7d2fe'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + w * 0.14, y + h * (0.24 + i * 0.1), w * (0.4 - i * 0.06), 8)
  ctx.fillStyle = 'rgba(248,250,252,0.85)'
  rr(ctx, x + w * 0.6, y + h * 0.4, w * 0.32, h * 0.42, 6)
  ctx.fill()
  ctx.fillStyle = '#18181b'
  ctx.fillRect(x + w / 2 - 60, y + h + 14, 120, 40)
  rr(ctx, x + w / 2 - 130, y + h + 50, 260, 14, 7)
  ctx.fill()
  text(ctx, label, x + w / 2, y + h + 104, { size: 22, weight: 600, color: '#a1a1aa', align: 'center' })
}

const THUMBS = [...Array(8)].map((_, i) => {
  const r = mulberry32(100 + i)
  return { preset: Object.keys(PRESETS)[i % 4], bars: [...Array(5)].map(() => 0.3 + r() * 0.7), dark: i % 3 === 1 }
})

function drawMulti(ctx, t) {
  const M = PH.multi
  const out = prog(t, M.gallery - 0.2, M.gallery + 0.3)
  if (out < 1) {
    ctx.save()
    ctx.globalAlpha *= 1 - out
    ctx.translate(W / 2, H / 2)
    ctx.scale(1 - out * 0.15, 1 - out * 0.15)
    ctx.translate(-W / 2, -H / 2)
    const enter = prog(t, 0, 0.6, easeOutCubic)
    ctx.translate(0, (1 - enter) * 60)
    monitor(ctx, 200, 230, 700, 400, 'Monitor 1')
    monitor(ctx, 1020, 230, 700, 400, 'Monitor 2')
    const dp = prog(t, ...M.drag)
    const a = { x: 560, y: 330 }
    const b = { x: 1360, y: 560 }
    if (t > M.drag[0] - 0.4) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.rect(200, 230, 700, 400)
      ctx.rect(1020, 230, 700, 400)
      ctx.rect(a.x, a.y, (b.x - a.x) * dp, (b.y - a.y) * dp)
      ctx.fill('evenodd')
      if (dp > 0) {
        ctx.setLineDash([8, 6])
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2.5
        ctx.strokeRect(a.x, a.y, (b.x - a.x) * dp, (b.y - a.y) * dp)
        ctx.setLineDash([])
      }
      drawCursor(ctx, lerp(a.x, b.x, dp), lerp(a.y, b.y, dp))
    }
    const chip = prog(t, M.drag[1], M.drag[1] + 0.4, easeOutBack)
    if (chip > 0) {
      ctx.save()
      ctx.globalAlpha *= clamp(chip)
      rr(ctx, W / 2 - 200, 130, 400, 56, 28)
      ctx.fillStyle = 'rgba(124,58,237,0.9)'
      ctx.fill()
      text(ctx, 'Captura entre monitores ✓', W / 2, 160, { size: 22, weight: 600, align: 'center', base: 'middle' })
      ctx.restore()
    }
    ctx.restore()
  }
  // galeria
  const gin = prog(t, M.gallery, M.gallery + 0.5, easeOutCubic)
  if (gin > 0) {
    const gx = 330
    const gy = 150
    const gw = 1260
    const gh = 660
    ctx.save()
    ctx.globalAlpha *= gin
    ctx.translate(0, (1 - gin) * 40)
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 50
    rr(ctx, gx, gy, gw, gh, 18)
    ctx.fillStyle = '#18181b'
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = C.uiBorder
    ctx.stroke()
    text(ctx, 'Galeria', gx + 36, gy + 58, { size: 30, weight: 700 })
    text(ctx, '24 capturas · hoje', gx + 160, gy + 58, { size: 20, color: '#a1a1aa' })
    THUMBS.forEach((th, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const tw = 270
      const thh = 250
      const x = gx + 36 + col * (tw + 24)
      const y = gy + 100 + row * (thh + 30)
      const p = prog(t, M.gallery + 0.25 + i * 0.08, M.gallery + 0.7 + i * 0.08, easeOutBack)
      if (p <= 0) return
      const hover = i === 5 ? prog(t, M.gallery + 2.1, M.gallery + 2.4) : 0
      ctx.save()
      ctx.globalAlpha *= clamp(p)
      ctx.translate(x + tw / 2, y + thh / 2 - hover * 8)
      ctx.scale(0.9 + 0.1 * p + hover * 0.03, 0.9 + 0.1 * p + hover * 0.03)
      ctx.translate(-tw / 2, -thh / 2)
      rr(ctx, 0, 0, tw, thh, 12)
      ctx.fillStyle = '#27272a'
      ctx.fill()
      if (hover > 0) {
        ctx.lineWidth = 3
        ctx.strokeStyle = `rgba(37,99,235,${hover})`
        ctx.stroke()
      }
      rr(ctx, 12, 12, tw - 24, 170, 8)
      ctx.fillStyle = gradientFor(ctx, 12, 12, tw - 24, 170, th.preset)
      ctx.fill()
      rr(ctx, 34, 32, tw - 68, 130, 6)
      ctx.fillStyle = th.dark ? '#1f2937' : '#f8fafc'
      ctx.fill()
      th.bars.forEach((v, j) => {
        ctx.fillStyle = th.dark ? '#818cf8' : '#a5b4fc'
        ctx.fillRect(52 + j * 34, 150 - v * 90, 20, v * 90)
      })
      text(ctx, `Captura_18-${String(12 + i * 3).padStart(2, '0')}.png`, 14, 214, { size: 16, color: '#d4d4d8' })
      text(ctx, `${(0.4 + i * 0.13).toFixed(1)} MB`, 14, 238, { size: 14, color: '#71717a' })
      ctx.restore()
    })
    ctx.restore()
  }
}

// ── cena: copiar / salvar / local ──────────────────────────────
const FINAL_ST = { arrow: 1, rect: 1, text: 1, hl: 1, blur: 1, steps: [1, 1, 1] }

function folderIcon(ctx, x, y, s, bounce) {
  ctx.save()
  ctx.translate(x, y)
  const k = 1 + 0.08 * Math.sin(bounce * Math.PI)
  ctx.scale(k * s, k * s)
  ctx.fillStyle = '#f59e0b'
  rr(ctx, -110, -80, 90, 40, 12)
  ctx.fill()
  rr(ctx, -110, -60, 220, 150, 16)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  rr(ctx, -110, -30, 220, 120, 16)
  ctx.fill()
  ctx.restore()
}

function drawShare(ctx, t) {
  const P = PH.share
  const enter = prog(t, 0, 0.6, easeOutCubic)
  const localP = prog(t, P.local - 0.2, P.local + 0.4)
  ctx.save()
  ctx.globalAlpha *= 1 - localP * 0.92
  ctx.translate(0, (1 - enter) * 40)
  const card = beautifiedCard(ctx, FINAL_ST, 700, 560, 0.55, 40, 16, 1, [['violet', 1]])
  // teclas
  const kc = fadeIO(t, P.copy - 0.4, P.copy + 1.2, 0.25)
  if (kc > 0) {
    keycap(ctx, 'Ctrl', 600, 190, pressAmount(t, P.copy), kc, 140)
    keycap(ctx, 'C', 760, 190, pressAmount(t, P.copy), kc, 100)
  }
  const ks = fadeIO(t, P.saveKey - 0.4, P.saveKey + 1.0, 0.25)
  if (ks > 0) {
    keycap(ctx, 'Ctrl', 600, 190, pressAmount(t, P.saveKey), ks, 140)
    keycap(ctx, 'S', 760, 190, pressAmount(t, P.saveKey), ks, 100)
  }
  // toast
  const toast = fadeIO(t, P.copy + 0.3, P.saveKey - 0.1, 0.3)
  if (toast > 0) {
    ctx.save()
    ctx.globalAlpha *= toast
    ctx.translate(0, (1 - toast) * 30)
    rr(ctx, 1170, 820, 560, 76, 14)
    ctx.fillStyle = 'rgba(22,163,74,0.95)'
    ctx.fill()
    text(ctx, '✓  Copiado para a área de transferência', 1450, 860, { size: 23, weight: 600, align: 'center', base: 'middle' })
    ctx.restore()
  }
  // pasta + arquivo voando
  const fa = prog(t, P.saveKey - 0.2, P.saveKey + 0.3, easeOutCubic)
  if (fa > 0) {
    ctx.save()
    ctx.globalAlpha *= fa
    folderIcon(ctx, 1450, 540, 1.3, prog(t, P.fly[1], P.fly[1] + 0.35, (x) => x))
    text(ctx, 'Imagens › ArcanShot', 1450, 720, { size: 24, weight: 600, color: '#e4e4e7', align: 'center' })
    ctx.restore()
  }
  const fly = prog(t, ...P.fly)
  if (fly > 0 && fly < 1) {
    const x = lerp(card.x + card.w / 2, 1450, fly)
    const y = lerp(card.y + card.h / 2, 540, fly) - Math.sin(fly * Math.PI) * 160
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1 - fly * 0.6, 1 - fly * 0.6)
    rr(ctx, -150, -95, 300, 190, 14)
    ctx.fillStyle = gradientFor(ctx, -150, -95, 300, 190, 'violet')
    ctx.fill()
    ctx.restore()
  }
  const fn = prog(t, P.fly[1], P.fly[1] + 0.4, easeOutCubic)
  if (fn > 0) {
    ctx.save()
    ctx.globalAlpha *= fn
    rr(ctx, 1190, 770, 520, 56, 12)
    ctx.fillStyle = 'rgba(24,24,27,0.95)'
    ctx.fill()
    text(ctx, 'Captura_2026-10-08_18-30-12.png', 1450, 799, { size: 20, color: '#e4e4e7', align: 'center', base: 'middle' })
    ctx.restore()
  }
  ctx.restore()
  // selo "100% local"
  if (localP > 0) {
    const k = easeOutBack(clamp(localP))
    ctx.save()
    ctx.globalAlpha *= clamp(localP)
    ctx.translate(W / 2, 470)
    ctx.scale(k, k)
    ctx.shadowColor = 'rgba(124,58,237,0.7)'
    ctx.shadowBlur = 60
    ctx.beginPath()
    ctx.moveTo(0, -150)
    ctx.lineTo(120, -105)
    ctx.lineTo(120, 10)
    ctx.quadraticCurveTo(110, 110, 0, 160)
    ctx.quadraticCurveTo(-110, 110, -120, 10)
    ctx.lineTo(-120, -105)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, -150, 0, 160)
    g.addColorStop(0, '#8b5cf6')
    g.addColorStop(1, '#5b21b6')
    ctx.fillStyle = g
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-48, 2)
    ctx.lineTo(-12, 40)
    ctx.lineTo(54, -36)
    ctx.stroke()
    ctx.restore()
    const tx = prog(t, P.local + 0.2, P.local + 0.7, easeOutCubic)
    ctx.save()
    ctx.globalAlpha *= tx
    text(ctx, '100% local', W / 2, 720 + (1 - tx) * 20, { size: 56, weight: 700, align: 'center' })
    text(ctx, 'Sem conta, sem nuvem, sem rastreamento', W / 2, 776 + (1 - tx) * 20, {
      size: 28,
      color: '#c4b5fd',
      align: 'center'
    })
    ctx.restore()
  }
}

// ── cena: encerramento ─────────────────────────────────────────
function drawOutro(ctx, t) {
  // onda de luz no impacto
  const wave = prog(t, 0, 1.2, easeOutCubic)
  if (wave < 1) {
    ctx.beginPath()
    ctx.arc(W / 2, 300, 120 + wave * 900, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = `rgba(196,181,253,${0.6 * (1 - wave)})`
    ctx.stroke()
  }
  drawLogo(ctx, W / 2, 300, 230, {
    square: prog(t, 0, 0.5, (x) => x),
    ring: prog(t, 0.2, 0.8),
    dot: prog(t, 0.6, 0.9, (x) => x),
    corners: prog(t, 0.5, 0.9),
    cornerFly: 1
  })
  staggerTitle(ctx, 'ArcanShot', W / 2, 560, t - 0.7, { size: 110 })
  const tag = prog(t, 1.6, 2.2, easeOutCubic)
  ctx.save()
  ctx.globalAlpha *= tag
  text(ctx, 'Capture. Anote. Compartilhe.', W / 2, 630 + (1 - tag) * 16, { size: 38, color: '#c4b5fd', align: 'center' })
  ctx.restore()
  const badges = ['Gratuito', 'Código aberto', 'Windows 10 e 11']
  ctx.font = `600 24px ${FONT}`
  const widths = badges.map((b) => ctx.measureText(b).width + 48)
  const totalW = widths.reduce((a, b) => a + b + 18, -18)
  let bx = W / 2 - totalW / 2
  badges.forEach((b, i) => {
    const p = prog(t, PH.outro.badges[i], PH.outro.badges[i] + 0.4, easeOutBack)
    if (p > 0) {
      ctx.save()
      ctx.globalAlpha *= clamp(p)
      ctx.translate(bx + widths[i] / 2, 710)
      ctx.scale(p, p)
      rr(ctx, -widths[i] / 2, -26, widths[i], 52, 26)
      ctx.fillStyle = 'rgba(124,58,237,0.22)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(167,139,250,0.7)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      text(ctx, b, 0, 1, { size: 24, weight: 600, color: '#ede9fe', align: 'center', base: 'middle' })
      ctx.restore()
    }
    bx += widths[i] + 18
  })
  const cta = prog(t, 3.7, 4.3, easeOutCubic)
  if (cta > 0) {
    ctx.save()
    ctx.globalAlpha *= cta
    ctx.translate(0, (1 - cta) * 20)
    ctx.shadowColor = 'rgba(37,99,235,0.6)'
    ctx.shadowBlur = 30
    rr(ctx, W / 2 - 230, 778, 460, 72, 36)
    ctx.fillStyle = C.blue
    ctx.fill()
    ctx.shadowColor = 'transparent'
    text(ctx, '⤓  Baixar para Windows', W / 2, 815, { size: 28, weight: 700, align: 'center', base: 'middle' })
    text(ctx, 'github.com/imfarias/arcanshot', W / 2, 896, { size: 26, color: '#a1a1aa', align: 'center' })
    ctx.restore()
  }
}

// ── legendas ───────────────────────────────────────────────────
function wrap(ctx, str, maxW) {
  const words = str.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function drawCaption(ctx, time, tl) {
  for (const s of tl.scenes) {
    if (!s.caption) continue
    const a = s.start + s.narrStart - 0.15
    const b = s.start + s.narrStart + Math.max(s.narrDur, 2.5) + 0.35
    const alpha = fadeIO(time, a, b, 0.2)
    if (alpha <= 0) continue
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `600 34px ${FONT}`
    const lines = wrap(ctx, s.caption, 1400)
    const lw = Math.max(...lines.map((l) => ctx.measureText(l).width))
    const lh = 46
    const bh = lines.length * lh + 26
    const by = H - 46 - bh
    rr(ctx, W / 2 - lw / 2 - 28, by, lw + 56, bh, 16)
    ctx.fillStyle = 'rgba(8,6,20,0.78)'
    ctx.fill()
    lines.forEach((l, i) => text(ctx, l, W / 2, by + 13 + lh * i + lh / 2, { size: 34, weight: 600, align: 'center', base: 'middle' }))
    ctx.restore()
  }
}

// ── frame ──────────────────────────────────────────────────────
export function drawFrame(ctx, time, tl, { captions = true } = {}) {
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  drawBackground(ctx, time)
  const s = tl.scenes.find((x) => time >= x.start && time < x.start + x.dur) ?? tl.scenes[tl.scenes.length - 1]
  const t = time - s.start
  if (s.ws) {
    const wsStart = tl.byId.select.start
    const wsEnd = tl.byId.beautify.start + tl.byId.beautify.dur
    ctx.save()
    ctx.globalAlpha = fadeIO(time, wsStart, wsEnd, 0.45)
    drawWorkspace(ctx, time, tl)
    ctx.restore()
  } else {
    ctx.save()
    ctx.globalAlpha = s.id === 'intro' ? 1 : fadeIO(t, 0, s.dur, 0.4)
    if (s.id === 'intro') drawIntro(ctx, t, s)
    if (s.id === 'multi') drawMulti(ctx, t)
    if (s.id === 'share') drawShare(ctx, t)
    if (s.id === 'outro') drawOutro(ctx, t)
    ctx.restore()
  }
  if (captions) drawCaption(ctx, time, tl)
  // fade de entrada/saída do vídeo
  const black = Math.max(1 - prog(time, 0, 0.8), prog(time, tl.total - 1.6, tl.total))
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`
    ctx.fillRect(0, 0, W, H)
  }
  // vinheta
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

// ── carregamento ───────────────────────────────────────────────
export async function load(base = '.') {
  const script = await (await fetch(`${base}/narration/script.json`)).json()
  const captions = Object.fromEntries(script.lines.map((l) => [l.id, l.caption]))
  const decoder = new OfflineAudioContext(1, 1, 48000)
  const narration = {}
  await Promise.all(
    script.lines.map(async (l) => {
      try {
        const res = await fetch(`${base}/narration/${l.id}.wav`)
        if (!res.ok) throw new Error(res.statusText)
        narration[l.id] = await decoder.decodeAudioData(await res.arrayBuffer())
      } catch {
        // sem áudio gerado: a cena usa só a legenda (duração estimada pelo texto)
      }
    })
  )
  const durs = Object.fromEntries(
    script.lines.map((l) => [l.id, narration[l.id]?.duration ?? l.caption.length * 0.065])
  )
  appCanvas = buildAppCanvas()
  return { tl: buildTimeline(durs, captions), narration }
}

export async function renderAudio(tl, narration, sampleRate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(tl.total * sampleRate), sampleRate)
  buildMix(ctx, tl, narration, 0)
  return encodeWav(await ctx.startRendering())
}

export { buildMix }
