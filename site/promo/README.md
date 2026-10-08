# Vídeo de apresentação

Motion design em `<canvas>`, trilha e mixagem 100% **Web Audio API**, narração gerada
localmente com o [Piper](https://github.com/OHF-Voice/piper1-gpl) (TTS neural open source).
Uma única timeline (`promo.js`) dirige imagem, narração e efeitos sonoros, então tudo fica
sincronizado por construção.

| Arquivo | O quê |
|---|---|
| `promo.js` | Timeline, cenas e desenho dos quadros |
| `audio.js` | Música sintetizada (pad, arpejo, baixo, bateria), efeitos, ducking sob a voz, master |
| `narration/script.json` | Texto da narração (`speak`) e das legendas (`caption`) |
| `narration/*.wav` | Narração gerada — pode ser trocada por gravação própria (mesmo nome) |
| `index.html` | Player ao vivo (AudioContext) + API usada pelo render |
| `dist/` | Saídas renderizadas |

## Comandos

```bash
npm run promo:narrate   # gera narration/*.wav (requer uv)
npm run promo:render    # gera dist/*.mp4, *.webm e o pôster (requer ffmpeg)
```

`node scripts/promo/render.mjs --stills 3.5,12,40` exporta quadros soltos para revisão.

## Saídas (`dist/`)

- `arcanshot-promo.mp4` / `.webm` — vídeo completo, 1080p30, ~56 s, com narração, música e legendas (~-14 LUFS)
- `arcanshot-hero.mp4` / `.webm` — loop mudo e sem legendas para o fundo do hero do site;
  começa e termina só no fundo, então emenda sem corte
- `arcanshot-hero-poster.webp` — pôster do loop (use também em `prefers-reduced-motion`)

Uso no site:

```html
<video autoplay muted loop playsinline preload="metadata" poster="arcanshot-hero-poster.webp">
  <source src="arcanshot-hero.webm" type="video/webm" />
  <source src="arcanshot-hero.mp4" type="video/mp4" />
</video>
```

Para o player com som direto no site (sem arquivo de vídeo), basta servir esta pasta:
o `index.html` toca a mesma mixagem em tempo real com `AudioContext`.
