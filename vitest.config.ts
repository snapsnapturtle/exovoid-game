import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Tests get their own Vite config to avoid loading tanstackStart() and
// nitro(), whose environment setup makes Vitest's module runner try to
// evaluate React's CJS entry as ESM (`module is not defined`).
export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [react()],
})
