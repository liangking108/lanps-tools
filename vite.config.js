import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    // 单页应用，部署到 Vercel / Netlify 根路径时保持默认 '/'
    // 若要部署到子路径（如 xxx.com/tools/），改成 '/tools/'
    assetsDir: 'assets'
  }
})
