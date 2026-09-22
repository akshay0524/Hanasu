import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // NOTE: base is intentionally NOT set here for local development.
  // For GitHub Pages deployment, run: vite build --base=/Hanasu/
  server: {
    port: 5173,
    strictPort: true, // fail fast if port is occupied
  },
})
