import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'libs',
    lib: {
      entry: resolve(__dirname, 'src/icons.js'),
      formats: ['iife'],
      name: 'DashTabIcons',
      fileName: 'icons'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'icons.js',
        format: 'iife'
      }
    },
    minify: true,
    target: 'es2015',
    emptyOutDir: false // 不清空输出目录，保留vendor.js
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
