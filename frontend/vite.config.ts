import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { obfuscatorPlugin } from './plugins/obfuscator'

// Detect if building for Electron
const isElectronBuild = process.env.BUILD_TARGET === 'electron';

export default defineConfig({
  plugins: [react(), obfuscatorPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    // Allow all hosts so the v0 preview proxy can reach the dev server
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Use relative paths for Electron
    base: isElectronBuild ? './' : '/',
    // Ensure proper chunk naming for Electron
    rollupOptions: isElectronBuild ? {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    } : undefined,
  },
  // Define globals for Electron
  define: {
    'process.env.BUILD_TARGET': JSON.stringify(process.env.BUILD_TARGET || 'web'),
  },
})
