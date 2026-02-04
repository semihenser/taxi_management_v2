import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './', // GitHub Pages için relative path kullanımı önemlidir
    server: {
      host: true, // Bu ayar, sunucunun yerel ağ IP'si üzerinden erişilebilir olmasını sağlar
      port: 5173  // Varsayılan port
    },
    define: {
      // Gemini SDK'sının process.env.API_KEY kullanımını desteklemek için
      // VITE_GOOGLE_API_KEY değerini process.env.API_KEY olarak kodun içine gömer.
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY)
    }
  }
})