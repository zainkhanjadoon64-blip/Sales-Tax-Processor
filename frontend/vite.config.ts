import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Detect if building for Electron
const isElectronBuild = process.env.BUILD_TARGET === 'electron';

export default defineConfig({
  plugins: [react()],
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
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Use relative paths for Electron
    base: isElectronBuild ? './' : '/',
    // Ensure proper chunk naming for Electron
    rollupOptions: isElectronBuild ? {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    } : undefined,
  } as import('vite').BuildEnvironmentOptions,
  // Define globals for Electron
  define: {
    'process.env.BUILD_TARGET': JSON.stringify(process.env.BUILD_TARGET || 'web'),
  },
})
