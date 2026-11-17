import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { skinsPlugin } from './build/skins'

export default defineConfig({
  plugins: [react(), skinsPlugin()],
})
