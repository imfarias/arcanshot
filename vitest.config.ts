import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') }
  },
  test: {
    globals: true,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/main/**/*.test.ts',
      'tests/renderer/**/*.test.{ts,tsx}'
    ],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/shared/**', 'src/main/**', 'src/renderer/**'],
      exclude: ['src/main/index.ts', 'src/main/overlay.ts', 'src/main/capture.ts', 'src/main/ipc.ts']
    }
  }
})
