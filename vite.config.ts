import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages için relative path kullanımı önemlidir
  server: {
    host: true, // Bu ayar, sunucunun yerel ağ IP'si üzerinden erişilebilir olmasını sağlar
    port: 5173  // Varsayılan port
  }
})