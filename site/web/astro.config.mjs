import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://arcanshot.vfconsultoria.dev',
  output: 'static',
  build: { inlineStylesheets: 'never' },
  // nada inline: a CSP do nginx não libera 'unsafe-inline' para scripts
  vite: { build: { assetsInlineLimit: 0 } }
})
