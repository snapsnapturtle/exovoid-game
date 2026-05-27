import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { resolve } from 'node:path'

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './src'),
    },
  },
  // Nitro auto-detects the deployment target via env vars. On Vercel the
  // VERCEL=1 env var triggers the Vercel preset; locally it defaults to a
  // Node.js server output at .output/server/index.mjs.
  plugins: [tailwindcss(), tanstackStart(), nitro(), react()],
})
