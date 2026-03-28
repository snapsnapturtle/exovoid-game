import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [tailwindcss(), tanstackStart(), react()],
})
