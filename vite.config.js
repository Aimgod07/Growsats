import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {existsSync} from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  define: {'import.meta.env.VITE_ANDROID_PUSH_CONFIGURED': JSON.stringify(existsSync(new URL('./android/app/google-services.json', import.meta.url)))},
  plugins: [react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  
})
