import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { skinsPlugin } from './build/skins.ts'

export default defineConfig({
  // relative paths: the built game works from any folder, e.g. GitHub Pages at /functional-marble-machine/
  base: './',
  plugins: [react(), skinsPlugin()],
})
