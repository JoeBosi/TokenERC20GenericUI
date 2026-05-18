import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  envDir: path.resolve(__dirname, '..'),
  define: {
    __PRIVATE_KEY__: JSON.stringify(process.env.PRIVATE_KEY),
    __ADDRES__: JSON.stringify(process.env.ADDRES),
  }
})
