import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@designcodeio/threeui/style.css': path.resolve(__dirname, 'src/shaders/threeui.css'),
      '@designcodeio/threeui': path.resolve(__dirname, 'src/shaders/landing-pages/LandingPages.tsx'),
    },
  },
  // NOTE: base is intentionally NOT set here for local development.
  // For GitHub Pages deployment, run: vite build --base=/Hanasu/
  server: {
    port: 5173,
    strictPort: true, // fail fast if port is occupied
  },
})

