import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'libs',
    lib: {
      entry: resolve(__dirname, 'src/vendor.js'),
      formats: ['iife'],
      name: 'DashTabVendor',
      fileName: 'vendor'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'vendor.js',
        format: 'iife'
      }
    },
    minify: true,
    target: 'es2015'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
